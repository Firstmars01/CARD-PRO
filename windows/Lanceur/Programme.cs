/*
 * Programme.cs
 * Point d'entrée de DrawCard-Configurateur.exe :
 *  1. une seule instance (une seconde ouverture remet la fenêtre au premier plan) ;
 *  2. mise à jour automatique au démarrage si une nouvelle version existe,
 *     avec une fenêtre qui montre l'avancement ;
 *  3. démarrage du serveur DrawCard en arrière-plan ;
 *  4. affichage de l'appli dans la fenêtre DrawCard (WebView2) ; si le moteur
 *     WebView2 manque, ouverture dans le navigateur par défaut ;
 *  5. fermer la fenêtre (ou « Quitter » près de l'horloge) arrête DrawCard.
 */
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace DrawCard.Lanceur
{
    /// <summary>Programme principal.</summary>
    internal static class Programme
    {
        /// <summary>Démarre DrawCard.</summary>
        /// <param name="arguments">« --apres-maj » quand l'exe vient d'être mis à jour.</param>
        [STAThread]
        private static void Main(string[] arguments)
        {
            // Avant tout usage d'un type WebView2 (bibliothèques intégrées à l'exe).
            ChargementWebView2.Preparer();
            bool apresMaj = arguments.Contains(MiseAJour.ArgumentApresMaj);
            using (Mutex unique = new Mutex(false, "Local\\DrawCardConfigurateur"))
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
                    resultat = FenetreProgression.Executer(progression => Demarrer(progression, serveur, apresMaj));
                }
                catch (Exception erreur)
                {
                    MessageBox.Show(
                        "DrawCard n'a pas pu démarrer : " + erreur.Message + "\n\nDétails dans : " + Parametres.FichierJournal,
                        "DrawCard Configurateur", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                if (resultat == Demarrage.Relance) return; // La nouvelle version a pris le relais.

                File.WriteAllText(Parametres.FichierPort, serveur.Port.ToString());
                using (FenetreAppli fenetre = new FenetreAppli(serveur.Adresse))
                using (EventWaitHandle signalAffichage = new EventWaitHandle(false, EventResetMode.AutoReset, NomSignalAffichage))
                {
                    bool avecFenetre = true;
                    Action afficher = () =>
                    {
                        if (avecFenetre) fenetre.Afficher();
                        else Navigateur.Ouvrir(serveur.Adresse);
                    };
                    using (IconeBarre icone = new IconeBarre(serveur, afficher))
                    {
                        // Fermer la fenêtre arrête DrawCard.
                        fenetre.FormClosed += (s, e) => icone.Quitter();
                        fenetre.Shown += async (s, e) =>
                        {
                            try
                            {
                                await fenetre.OuvrirAsync();
                            }
                            catch (Exception erreur)
                            {
                                // Moteur WebView2 absent ou en panne : l'appli s'ouvre dans le navigateur.
                                avecFenetre = false;
                                fenetre.Hide();
                                Navigateur.Ouvrir(serveur.Adresse);
                                icone.Bulle("DrawCard s'ouvre dans le navigateur",
                                    "La fenêtre DrawCard a besoin de Microsoft Edge WebView2 (" + erreur.GetType().Name + "). Clic droit sur l'icône pour quitter.",
                                    ToolTipIcon.Warning);
                            }
                        };
                        EcouterSecondeOuverture(signalAffichage, fenetre, afficher);
                        if (apresMaj) icone.Bulle("DrawCard est à jour", "Version " + Parametres.TexteVersion + " installée. Tes données sont conservées.", ToolTipIcon.Info);
                        icone.DemarrerVerificationsMiseAJour();
                        fenetre.Show();
                        Application.Run();
                    }
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

            fenetre.Etape("Préparation de DrawCard…");
            await Task.Run(() => serveur.PreparerFichiers());
            fenetre.Etape("Lancement de DrawCard…");
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

        // Signal envoyé par une seconde ouverture de l'exe : « remets la fenêtre au premier plan ».
        private const string NomSignalAffichage = "Local\\DrawCardConfigurateurAfficher";

        /// <summary>
        /// Attend en arrière-plan qu'une seconde ouverture de DrawCard demande la fenêtre.
        /// </summary>
        /// <param name="signal">Signal partagé entre les instances.</param>
        /// <param name="fenetre">Fenêtre (fournit le fil de l'interface).</param>
        /// <param name="afficher">Affiche l'appli.</param>
        private static void EcouterSecondeOuverture(EventWaitHandle signal, Form fenetre, Action afficher)
        {
            Thread ecoute = new Thread(() =>
            {
                try
                {
                    while (true)
                    {
                        signal.WaitOne();
                        if (fenetre.IsDisposed) return;
                        fenetre.BeginInvoke(afficher);
                    }
                }
                catch (ObjectDisposedException)
                {
                    // DrawCard se ferme : le signal ou la fenêtre n'existent plus.
                }
                catch (InvalidOperationException)
                {
                    // Idem (fenêtre détruite).
                }
            }) { IsBackground = true };
            ecoute.Start();
        }

        /// <summary>DrawCard tourne déjà : on remet sa fenêtre au premier plan.</summary>
        private static void OuvrirInstanceExistante()
        {
            EventWaitHandle signal;
            if (EventWaitHandle.TryOpenExisting(NomSignalAffichage, out signal))
            {
                using (signal) signal.Set();
                return;
            }
            int port;
            string texte = File.Exists(Parametres.FichierPort) ? File.ReadAllText(Parametres.FichierPort).Trim() : "";
            if (int.TryParse(texte, out port) && port > 0 && port < 65536)
            {
                Navigateur.Ouvrir("http://localhost:" + port + "/");
            }
            else
            {
                MessageBox.Show("DrawCard est déjà lancé (icône près de l'horloge).", "DrawCard Configurateur", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
