/*
 * Programme.cs
 * Point d'entrée de CardPro-RH.exe :
 *  1. une seule instance (une seconde ouverture rouvre simplement la page) ;
 *  2. démarrage du serveur Card Pro en arrière-plan ;
 *  3. ouverture de la page dans le navigateur ;
 *  4. icône près de l'horloge jusqu'à « Quitter ».
 */
using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace CardPro.Lanceur
{
    /// <summary>Programme principal.</summary>
    internal static class Programme
    {
        /// <summary>Démarre Card Pro.</summary>
        [STAThread]
        private static void Main()
        {
            bool premiereInstance;
            using (Mutex unique = new Mutex(true, "Local\\CardProRH", out premiereInstance))
            {
                if (!premiereInstance)
                {
                    OuvrirInstanceExistante();
                    return;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                Directory.CreateDirectory(Parametres.DossierDonnees);
                Directory.CreateDirectory(Parametres.DossierProgrammes);

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
                        icone.Bulle("Card Pro est lancé", "Clique sur l'icône pour ouvrir l'appli, clic droit pour quitter.", ToolTipIcon.Info);
                        icone.VerifierMiseAJour(false);
                        Application.Run();
                    }
                    SupprimerSansErreur(Parametres.FichierPort);
                }
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
