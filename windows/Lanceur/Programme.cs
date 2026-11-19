/*
 * Programme.cs
 * Point d'entrée de CardPro-RH.exe :
 *  1. une seule instance (une seconde ouverture rouvre simplement la page) ;
 *  2. mise à jour automatique au démarrage si une nouvelle version existe ;
 *  3. démarrage du serveur Card Pro en arrière-plan ;
 *  4. ouverture de la page dans le navigateur ;
 *  5. icône près de l'horloge jusqu'à « Quitter ».
 */
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace CardPro.Lanceur
{
    /// <summary>Programme principal.</summary>
    internal static class Programme
    {
        /// <summary>Démarre Card Pro.</summary>
        /// <param name="arguments">« --apres-maj » quand l'exe vient d'être mis à jour.</param>
        [STAThread]
        private static void Main(string[] arguments)
        {
            bool apresMaj = arguments.Contains(MiseAJour.ArgumentApresMaj);
            using (Mutex unique = new Mutex(false, "Local\\CardProRH"))
            {
                // Après une mise à jour, on attend que l'ancienne version se soit fermée.
                if (!Obtenir(unique, apresMaj ? 20000 : 0))
                {
                    OuvrirInstanceExistante();
                    return;
                }
                try
                {
                    Executer(apresMaj);
                }
                finally
                {
                    unique.ReleaseMutex();
                }
            }
        }

        /// <summary>Lance l'appli (instance unique déjà obtenue).</summary>
        /// <param name="apresMaj">true si l'exe vient d'être mis à jour.</param>
        private static void Executer(bool apresMaj)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
            Directory.CreateDirectory(Parametres.DossierDonnees);
            Directory.CreateDirectory(Parametres.DossierProgrammes);

            if (apresMaj) MiseAJour.Nettoyer();
            else if (MettreAJourAuDemarrage()) return; // La nouvelle version a pris le relais.

            using (ServeurLocal serveur = new ServeurLocal())
            {
                try
                {
                    serveur.PreparerFichiers();
                    serveur.Demarrer();
                    if (!serveur.AttendrePret(TimeSpan.FromSeconds(30)))
                    {
                        throw new InvalidOperationException("le serveur ne répond pas.");
                    }
                }
                catch (Exception erreur)
                {
                    MessageBox.Show(
                        "Card Pro n'a pas pu démarrer : " + erreur.Message + "\n\nDétails dans : " + Parametres.FichierJournal,
                        "Card Pro RH", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                File.WriteAllText(Parametres.FichierPort, serveur.Port.ToString());
                using (IconeBarre icone = new IconeBarre(serveur))
                {
                    Navigateur.Ouvrir(serveur.Adresse);
                    if (apresMaj) icone.Bulle("Card Pro est à jour", "Version " + Parametres.TexteVersion + " installée. Tes données sont conservées.", ToolTipIcon.Info);
                    else icone.Bulle("Card Pro est lancé", "Clique sur l'icône pour ouvrir l'appli, clic droit pour quitter.", ToolTipIcon.Info);
                    icone.DemarrerVerificationsMiseAJour();
                    Application.Run();
                }
                SupprimerSansErreur(Parametres.FichierPort);
            }
        }

        /// <summary>
        /// Installe une mise à jour avant de démarrer : celle déjà téléchargée, sinon
        /// la dernière version en ligne (si Internet répond vite).
        /// </summary>
        /// <returns>true si la nouvelle version a été lancée (cet exe doit se fermer).</returns>
        private static bool MettreAJourAuDemarrage()
        {
            if (MiseAJour.VersionPrete() != null) return MiseAJour.Installer();
            InfoVersion info;
            try
            {
                info = MiseAJour.ChercherAsync(TimeSpan.FromSeconds(4)).Result;
            }
            catch (Exception)
            {
                return false; // Hors ligne : on démarre la version actuelle.
            }
            if (info == null) return false;

            using (NotifyIcon attente = new NotifyIcon { Icon = IconeBarre.ChargerIcone(), Text = "Card Pro : mise à jour…", Visible = true })
            {
                attente.ShowBalloonTip(5000, "Mise à jour de Card Pro", "Installation de la version " + info.Version + "…", ToolTipIcon.Info);
                try
                {
                    return MiseAJour.TelechargerAsync(info).Result && MiseAJour.Installer();
                }
                catch (Exception)
                {
                    return false; // Téléchargement interrompu : on réessaiera plus tard.
                }
                finally
                {
                    attente.Visible = false;
                }
            }
        }

        /// <summary>Prend l'instance unique.</summary>
        /// <param name="unique">Verrou partagé entre les exe.</param>
        /// <param name="attente">Attente maximale en millisecondes.</param>
        /// <returns>true si le verrou est obtenu.</returns>
        private static bool Obtenir(Mutex unique, int attente)
        {
            try
            {
                return unique.WaitOne(attente);
            }
            catch (AbandonedMutexException)
            {
                return true; // L'instance précédente s'est fermée sans le libérer.
            }
        }

        /// <summary>Card Pro tourne déjà : on rouvre simplement sa page.</summary>
        private static void OuvrirInstanceExistante()
        {
            int port;
            string texte = File.Exists(Parametres.FichierPort) ? File.ReadAllText(Parametres.FichierPort).Trim() : "";
            if (int.TryParse(texte, out port) && port > 0 && port < 65536)
            {
                Navigateur.Ouvrir("http://localhost:" + port + "/");
            }
            else
            {
                MessageBox.Show("Card Pro est déjà lancé (icône près de l'horloge).", "Card Pro RH", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        /// <summary>Supprime un fichier sans erreur s'il est absent ou verrouillé.</summary>
        /// <param name="chemin">Fichier à supprimer.</param>
        private static void SupprimerSansErreur(string chemin)
        {
            try
            {
                File.Delete(chemin);
            }
            catch (IOException)
            {
                // Sans conséquence.
            }
        }
    }
}
