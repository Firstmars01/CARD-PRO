/*
 * MiseAJour.cs
 * Mise à jour automatique de CardPro-Configurateur.exe depuis les « Releases » GitHub :
 *  1. lecture du numéro de la dernière version (rien n'est envoyé) ;
 *  2. téléchargement du nouvel exe à côté de l'actuel (« .nouveau ») ;
 *  3. vérification : empreinte SHA-256 publiée avec la version, en-tête
 *     d'exécutable Windows et numéro de version du fichier ;
 *  4. remplacement : l'exe en cours est renommé (« .ancien »), le nouveau
 *     prend sa place, puis il est relancé. Les données ne bougent pas.
 */
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace CardPro.Lanceur
{
    /// <summary>Version disponible sur GitHub.</summary>
    internal sealed class InfoVersion
    {
        /// <summary>Numéro de version.</summary>
        public Version Version;

        /// <summary>Adresse de téléchargement de l'exe.</summary>
        public string AdresseExe;

        /// <summary>Adresse du fichier d'empreinte SHA-256.</summary>
        public string AdresseEmpreinte;
    }

    /// <summary>Recherche, téléchargement et installation des mises à jour.</summary>
    internal static class MiseAJour
    {
        private const string NomExe = "CardPro-Configurateur.exe";
        private const long TailleMax = 300L * 1024 * 1024;

        /// <summary>Argument passé au nouvel exe après une mise à jour.</summary>
        public const string ArgumentApresMaj = "--apres-maj";

        private static string CheminExe
        {
            get { return Application.ExecutablePath; }
        }

        private static string CheminNouveau
        {
            get { return CheminExe + ".nouveau"; }
        }

        private static string CheminAncien
        {
            get { return CheminExe + ".ancien"; }
        }

        /// <summary>Version de l'exe actuel.</summary>
        private static Version VersionActuelle
        {
            get { return new Version(Parametres.TexteVersion); }
        }

        /// <summary>Cherche une version plus récente sur GitHub.</summary>
        /// <param name="delai">Temps d'attente maximal.</param>
        /// <returns>Version disponible, ou null s'il n'y en a pas.</returns>
        public static async Task<InfoVersion> ChercherAsync(TimeSpan delai)
        {
            if (Parametres.DepotGithub.Length == 0) return null;
            string texte;
            using (HttpClient client = CreerClient(delai))
            {
                texte = await client
                    .GetStringAsync("https://api.github.com/repos/" + Parametres.DepotGithub + "/releases/latest")
                    .ConfigureAwait(false);
            }
            Dictionary<string, object> version = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(texte);
            Match numero = Regex.Match(Convert.ToString(version["tag_name"]), "^v?(\\d+\\.\\d+\\.\\d+)$");
            if (!numero.Success) return null;
            InfoVersion info = new InfoVersion { Version = new Version(numero.Groups[1].Value) };
            if (info.Version <= VersionActuelle) return null;

            // Seuls les fichiers de cette version, sur GitHub, sont acceptés.
            string prefixe = "https://github.com/" + Parametres.DepotGithub + "/releases/download/";
            foreach (object element in (IEnumerable)version["assets"])
            {
                Dictionary<string, object> fichier = element as Dictionary<string, object>;
                if (fichier == null) continue;
                string nom = Convert.ToString(fichier["name"]);
                string adresse = Convert.ToString(fichier["browser_download_url"]);
                if (!adresse.StartsWith(prefixe, StringComparison.Ordinal)) continue;
                if (nom == NomExe) info.AdresseExe = adresse;
                if (nom == NomExe + ".sha256") info.AdresseEmpreinte = adresse;
            }
            return info.AdresseExe != null && info.AdresseEmpreinte != null ? info : null;
        }

        /// <summary>Télécharge et vérifie le nouvel exe (prêt à installer).</summary>
        /// <param name="info">Version à télécharger.</param>
        /// <param name="progression">Reçoit l'avancement du téléchargement (peut être null).</param>
        /// <returns>true si le fichier est prêt et vérifié.</returns>
        public static async Task<bool> TelechargerAsync(InfoVersion info, IProgress<Avancement> progression)
        {
            string partiel = CheminNouveau + ".part";
            using (HttpClient client = CreerClient(TimeSpan.FromMinutes(5)))
            {
                string empreinte = (await client.GetStringAsync(info.AdresseEmpreinte).ConfigureAwait(false)).Trim();
                empreinte = empreinte.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0].ToLowerInvariant();
                if (!Regex.IsMatch(empreinte, "^[0-9a-f]{64}$")) return false;

                using (HttpResponseMessage reponse = await client.GetAsync(info.AdresseExe, HttpCompletionOption.ResponseHeadersRead).ConfigureAwait(false))
                {
                    reponse.EnsureSuccessStatusCode();
                    long taille = reponse.Content.Headers.ContentLength ?? 0;
                    using (Stream entree = await reponse.Content.ReadAsStreamAsync().ConfigureAwait(false))
                    using (FileStream sortie = File.Create(partiel))
                    {
                        byte[] tampon = new byte[81920];
                        long total = 0;
                        int lus;
                        while ((lus = await entree.ReadAsync(tampon, 0, tampon.Length).ConfigureAwait(false)) > 0)
                        {
                            total += lus;
                            if (total > TailleMax) throw new InvalidDataException("Fichier trop volumineux.");
                            await sortie.WriteAsync(tampon, 0, lus).ConfigureAwait(false);
                            if (progression != null) progression.Report(new Avancement { Recus = total, Total = taille });
                        }
                    }
                }
                if (!FichierValide(partiel, empreinte, info.Version))
                {
                    File.Delete(partiel);
                    return false;
                }
            }
            if (File.Exists(CheminNouveau)) File.Delete(CheminNouveau);
            File.Move(partiel, CheminNouveau);
            return true;
        }

        /// <summary>Version déjà téléchargée et prête à installer.</summary>
        /// <returns>Version prête, ou null.</returns>
        public static Version VersionPrete()
        {
            if (!File.Exists(CheminNouveau)) return null;
            Version version = VersionFichier(CheminNouveau);
            if (version != null && version > VersionActuelle) return version;
            SupprimerSansErreur(CheminNouveau);
            return null;
        }

        /// <summary>
        /// Remplace l'exe par la version prête et la lance. L'appelant doit ensuite se fermer.
        /// </summary>
        /// <returns>true si la nouvelle version a été lancée.</returns>
        public static bool Installer()
        {
            try
            {
                SupprimerSansErreur(CheminAncien);
                File.Move(CheminExe, CheminAncien); // Windows autorise le renommage d'un exe en cours.
                File.Move(CheminNouveau, CheminExe);
                Process.Start(new ProcessStartInfo(CheminExe, ArgumentApresMaj) { UseShellExecute = false });
                return true;
            }
            catch (Exception)
            {
                // Échec (dossier en lecture seule…) : on remet l'exe d'origine en place.
                if (!File.Exists(CheminExe) && File.Exists(CheminAncien)) File.Move(CheminAncien, CheminExe);
                return false;
            }
        }

        /// <summary>Supprime l'exe de la version précédente (après une mise à jour).</summary>
        public static void Nettoyer()
        {
            for (int essai = 0; essai < 10 && File.Exists(CheminAncien); essai++)
            {
                if (!SupprimerSansErreur(CheminAncien)) Thread.Sleep(500);
            }
        }

        /// <summary>Vérifie le fichier téléchargé.</summary>
        /// <param name="chemin">Fichier téléchargé.</param>
        /// <param name="empreinte">Empreinte SHA-256 attendue (hexadécimal).</param>
        /// <param name="version">Version attendue.</param>
        /// <returns>true si l'empreinte, l'en-tête et la version sont corrects.</returns>
        private static bool FichierValide(string chemin, string empreinte, Version version)
        {
            using (FileStream flux = File.OpenRead(chemin))
            {
                if (flux.ReadByte() != 'M' || flux.ReadByte() != 'Z') return false;
                flux.Position = 0;
                using (SHA256 calcul = SHA256.Create())
                {
                    string obtenue = BitConverter.ToString(calcul.ComputeHash(flux)).Replace("-", "").ToLowerInvariant();
                    if (obtenue != empreinte) return false;
                }
            }
            Version contenue = VersionFichier(chemin);
            return contenue != null && contenue >= version;
        }

        /// <summary>Numéro de version inscrit dans un exe.</summary>
        /// <param name="chemin">Exe.</param>
        /// <returns>Version, ou null si illisible.</returns>
        private static Version VersionFichier(string chemin)
        {
            try
            {
                FileVersionInfo infos = FileVersionInfo.GetVersionInfo(chemin);
                return new Version(infos.FileMajorPart, infos.FileMinorPart, infos.FileBuildPart);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>Client HTTP identifié auprès de GitHub.</summary>
        /// <param name="delai">Temps d'attente maximal.</param>
        /// <returns>Client.</returns>
        private static HttpClient CreerClient(TimeSpan delai)
        {
            HttpClient client = new HttpClient { Timeout = delai };
            client.DefaultRequestHeaders.UserAgent.ParseAdd("CardPro-Configurateur/" + Parametres.TexteVersion);
            client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
            return client;
        }

        /// <summary>Supprime un fichier sans erreur.</summary>
        /// <param name="chemin">Fichier.</param>
        /// <returns>true si le fichier n'existe plus.</returns>
        private static bool SupprimerSansErreur(string chemin)
        {
            try
            {
                if (File.Exists(chemin)) File.Delete(chemin);
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
