/*
 * ServeurLocal.cs
 * Démarre et arrête le serveur Card Pro (Node.js), invisible :
 *  - extrait l'appli intégrée à l'exe (une seule fois par version) ;
 *  - choisit un port libre sur ce PC (127.0.0.1 uniquement) ;
 *  - lance node.exe, écrit ses messages dans le journal ;
 *  - l'arrête proprement en fermant son entrée standard.
 */
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;

namespace CardPro.Lanceur
{
    /// <summary>Serveur Card Pro lancé en arrière-plan.</summary>
    internal sealed class ServeurLocal : IDisposable
    {
        private const int PremierPort = 48080;
        private const int NombrePorts = 20;
        private const long TailleMaxJournal = 1024 * 1024;

        private readonly object verrouJournal = new object();
        private Process processus;
        private bool arretDemande;

        /// <summary>Déclenché si le serveur s'arrête tout seul (erreur).</summary>
        public event EventHandler ArretInattendu;

        /// <summary>Port d'écoute choisi.</summary>
        public int Port { get; private set; }

        /// <summary>Adresse de l'appli dans le navigateur.</summary>
        public string Adresse
        {
            get { return "http://localhost:" + Port + "/"; }
        }

        /// <summary>
        /// Extrait l'appli intégrée si cette version ne l'est pas encore, et supprime les anciennes versions.
        /// </summary>
        public void PreparerFichiers()
        {
            string cible = Parametres.DossierVersion;
            if (!File.Exists(Path.Combine(cible, ".complet")))
            {
                string temporaire = cible + ".tmp";
                if (Directory.Exists(temporaire)) Directory.Delete(temporaire, true);
                using (Stream flux = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.zip"))
                {
                    if (flux == null) throw new InvalidOperationException("Paquet de l'appli absent de l'exe.");
                    using (ZipArchive archive = new ZipArchive(flux, ZipArchiveMode.Read))
                    {
                        // ExtractToDirectory refuse les chemins qui sortiraient du dossier cible.
                        archive.ExtractToDirectory(temporaire);
                    }
                }
                File.WriteAllText(Path.Combine(temporaire, ".complet"), Parametres.TexteVersion);
                if (Directory.Exists(cible)) Directory.Delete(cible, true);
                Directory.Move(temporaire, cible);
            }
            SupprimerAnciennesVersions(cible);
        }

        /// <summary>Lance le serveur Node.js sur un port libre.</summary>
        public void Demarrer()
        {
            Port = ChoisirPort();
            PreparerJournal();
            ProcessStartInfo infos = new ProcessStartInfo
            {
                FileName = Path.Combine(Parametres.DossierVersion, "node.exe"),
                Arguments = "--disable-warning=ExperimentalWarning serveur/Serveur.js",
                WorkingDirectory = Parametres.DossierVersion,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
            };
            infos.EnvironmentVariables["PORT"] = Port.ToString();
            infos.EnvironmentVariables["HOTE"] = "127.0.0.1";
            infos.EnvironmentVariables["CHEMIN_BASE"] = Parametres.FichierBase;
            infos.EnvironmentVariables["LIEN_PORTEFEUILLE"] = Parametres.LienPortefeuille;
            infos.EnvironmentVariables["CARDPRO_LANCEUR"] = "1";
            infos.EnvironmentVariables["NODE_ENV"] = "production";

            processus = new Process { StartInfo = infos, EnableRaisingEvents = true };
            processus.OutputDataReceived += (s, e) => EcrireJournal(e.Data);
            processus.ErrorDataReceived += (s, e) => EcrireJournal(e.Data);
            processus.Exited += (s, e) =>
            {
                if (!arretDemande && ArretInattendu != null) ArretInattendu(this, EventArgs.Empty);
            };
            processus.Start();
            processus.BeginOutputReadLine();
            processus.BeginErrorReadLine();
        }

        /// <summary>Attend que le serveur réponde.</summary>
        /// <param name="delai">Temps d'attente maximal.</param>
        /// <returns>true si le serveur est prêt.</returns>
        public bool AttendrePret(TimeSpan delai)
        {
            DateTime limite = DateTime.UtcNow + delai;
            using (HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) })
            {
                while (DateTime.UtcNow < limite)
                {
                    if (processus.HasExited) return false;
                    try
                    {
                        HttpResponseMessage reponse = client.GetAsync("http://127.0.0.1:" + Port + "/api/sante").Result;
                        if (reponse.IsSuccessStatusCode) return true;
                    }
                    catch (AggregateException)
                    {
                        // Pas encore prêt : on réessaie.
                    }
                    Thread.Sleep(250);
                }
            }
            return false;
        }

        /// <summary>Arrête le serveur proprement (il termine les écritures en cours).</summary>
        public void Arreter()
        {
            if (processus == null || processus.HasExited) return;
            arretDemande = true;
            try
            {
                processus.StandardInput.Close();
                if (!processus.WaitForExit(5000)) processus.Kill();
            }
            catch (InvalidOperationException)
            {
                // Déjà arrêté.
            }
        }

        /// <summary>Arrête le serveur et libère les ressources.</summary>
        public void Dispose()
        {
            Arreter();
            if (processus != null) processus.Dispose();
        }

        /// <summary>Cherche un port libre sur 127.0.0.1.</summary>
        /// <returns>Port disponible.</returns>
        private static int ChoisirPort()
        {
            for (int port = PremierPort; port < PremierPort + NombrePorts; port++)
            {
                try
                {
                    TcpListener essai = new TcpListener(IPAddress.Loopback, port);
                    essai.Start();
                    essai.Stop();
                    return port;
                }
                catch (SocketException)
                {
                    // Port occupé : on essaie le suivant.
                }
            }
            throw new InvalidOperationException("Aucun port libre entre " + PremierPort + " et " + (PremierPort + NombrePorts - 1) + ".");
        }

        /// <summary>Supprime les dossiers des anciennes versions de l'appli.</summary>
        /// <param name="actuel">Dossier de la version actuelle.</param>
        private static void SupprimerAnciennesVersions(string actuel)
        {
            foreach (string dossier in Directory.GetDirectories(Parametres.DossierProgrammes))
            {
                if (string.Equals(dossier, actuel, StringComparison.OrdinalIgnoreCase)) continue;
                try
                {
                    Directory.Delete(dossier, true);
                }
                catch (IOException)
                {
                    // Utilisé par une autre instance : on réessaiera au prochain lancement.
                }
                catch (UnauthorizedAccessException)
                {
                    // Idem.
                }
            }
        }

        /// <summary>Vide le journal s'il est devenu trop gros.</summary>
        private static void PreparerJournal()
        {
            FileInfo journal = new FileInfo(Parametres.FichierJournal);
            if (journal.Exists && journal.Length > TailleMaxJournal) journal.Delete();
        }

        /// <summary>Ajoute une ligne au journal.</summary>
        /// <param name="ligne">Message du serveur.</param>
        private void EcrireJournal(string ligne)
        {
            if (ligne == null) return;
            lock (verrouJournal)
            {
                try
                {
                    File.AppendAllText(Parametres.FichierJournal, DateTime.Now.ToString("s") + " " + ligne + Environment.NewLine, Encoding.UTF8);
                }
                catch (IOException)
                {
                    // Journal indisponible : sans conséquence.
                }
            }
        }
    }
}
