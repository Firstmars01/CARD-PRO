/*
 * Programme.cs
 * Point d'entrée de CardPro-Configurateur.exe :
 *  1. une seule instance (une seconde ouverture rouvre simplement la page) ;
 *  2. mise à jour automatique au démarrage si une nouvelle version existe,
 *     avec une fenêtre qui montre l'avancement ;
 *  3. démarrage du serveur Card Pro en arrière-plan ;
 *  4. ouverture de la page dans le navigateur ;
 *  5. icône près de l'horloge jusqu'à « Quitter ».
 */
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
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
            using (Mutex unique = new Mutex(false, "Local\\CardProConfigurateur"))
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

        /// <summary>Résultat du démarrage.</summary>
        private enum Demarrage
        {
            /// <summary>Le serveur est prêt.</summary>
            Pret,

            /// <summary>Une nouvelle version a été installée et lancée : cet exe se ferme.</summary>
            Relance,
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

            using (ServeurLocal serveur = new ServeurLocal())
            {
                Demarrage resultat;
                try
                {
                    // Fenêtre visible pendant tout le démarrage (mise à jour comprise).
                    resultat = FenetreProgression.Executer(fenetre => Demarrer(fenetre, serveur, apresMaj));
                }
                catch (Exception erreur)
                {
                    MessageBox.Show(
                        "Card Pro n'a pas pu démarrer : " + erreur.Message + "\n\nDétails dans : " + Parametres.FichierJournal,
                        "Card Pro Configurateur", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                if (resultat == Demarrage.Relance) return; // La nouvelle version a pris le relais.

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
        /// Étapes du démarrage, affichées dans la fenêtre : mise à jour éventuelle,
        /// préparation des fichiers, lancement du serveur.
        /// </summary>
        /// <param name="fenetre">Fenêtre de progression.</param>
        /// <param name="serveur">Serveur à démarrer.</param>
        /// <param name="apresMaj">true si l'exe vient d'être mis à jour.</param>
        /// <returns>Pret, ou Relance si une nouvelle version a été lancée.</returns>
        private static async Task<Demarrage> Demarrer(FenetreProgression fenetre, ServeurLocal serveur, bool apresMaj)
        {
            if (apresMaj)
            {
                fenetre.Etape("Fin de la mise à jour…");
                await Task.Run(() => MiseAJour.Nettoyer());
            }
            else if (await MettreAJour(fenetre))
            {
                return Demarrage.Relance;
            }

            fenetre.Etape("Préparation de Card Pro…");
            await Task.Run(() => serveur.PreparerFichiers());
            fenetre.Etape("Lancement de Card Pro…");
            await Task.Run(() =>
            {
                serveur.Demarrer();
                if (!serveur.AttendrePret(TimeSpan.FromSeconds(30))) throw new InvalidOperationException("le serveur ne répond pas.");
            });
            fenetre.Etape("Ouverture de la page…");
            return Demarrage.Pret;
        }

        /// <summary>
        /// Installe une mise à jour avant de démarrer : celle déjà téléchargée, sinon
        /// la dernière version en ligne (si Internet répond vite).
        /// </summary>
        /// <param name="fenetre">Fenêtre de progression.</param>
        /// <returns>true si la nouvelle version a été lancée (cet exe doit se fermer).</returns>
        private static async Task<bool> MettreAJour(FenetreProgression fenetre)
        {
            Version prete = MiseAJour.VersionPrete();
            if (prete != null)
            {
                fenetre.Etape("Installation de la version " + prete + "…");
                return MiseAJour.Installer();
            }

            fenetre.Etape("Recherche de mise à jour…");
            InfoVersion info;
            try
            {
                info = await MiseAJour.ChercherAsync(TimeSpan.FromSeconds(4));
            }
            catch (Exception)
            {
                return false; // Hors ligne : on démarre la version actuelle.
            }
            if (info == null) return false;

            fenetre.Etape("Nouvelle version " + info.Version + " trouvée…");
            try
            {
                bool telechargee = await MiseAJour.TelechargerAsync(info, new Progress<Avancement>(fenetre.Telechargement));
                if (!telechargee)
                {
                    fenetre.Etape("Mise à jour invalide, ignorée. Démarrage de la version actuelle…");
                    await Task.Delay(2000);
                    return false;
                }
                fenetre.Etape("Installation de la version " + info.Version + "…");
                await Task.Delay(500);
                return MiseAJour.Installer();
            }
            catch (Exception)
            {
                fenetre.Etape("Téléchargement interrompu. Démarrage de la version actuelle…");
                await Task.Delay(2000);
                return false; // On réessaiera plus tard.
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
                MessageBox.Show("Card Pro est déjà lancé (icône près de l'horloge).", "Card Pro Configurateur", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
