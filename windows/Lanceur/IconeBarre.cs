/*
 * IconeBarre.cs
 * Icône Card Pro près de l'horloge, avec son menu :
 * ouvrir l'appli, dossier des données, mise à jour, quitter.
 */
using System;
using System.Diagnostics;
using System.Drawing;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace CardPro.Lanceur
{
    /// <summary>Icône de la zone de notification.</summary>
    internal sealed class IconeBarre : IDisposable
    {
        private readonly ServeurLocal serveur;
        private readonly NotifyIcon icone;
        private readonly ToolStripMenuItem elementMiseAJour;
        private readonly SynchronizationContext contexte;

        /// <summary>Crée l'icône et son menu.</summary>
        /// <param name="serveur">Serveur Card Pro en cours.</param>
        public IconeBarre(ServeurLocal serveur)
        {
            this.serveur = serveur;
            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem ouvrir = new ToolStripMenuItem("Ouvrir Card Pro", null, (s, e) => OuvrirAppli());
            ouvrir.Font = new Font(ouvrir.Font, FontStyle.Bold);
            elementMiseAJour = new ToolStripMenuItem("", null, (s, e) => Navigateur.Ouvrir(Parametres.PageVersions)) { Available = false };
            menu.Items.Add(ouvrir);
            menu.Items.Add(new ToolStripMenuItem("Dossier des données", null, (s, e) => OuvrirDossierDonnees()));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(elementMiseAJour);
            menu.Items.Add(new ToolStripMenuItem("Rechercher une mise à jour", null, (s, e) => VerifierMiseAJour(true)));
            menu.Items.Add(new ToolStripMenuItem("Version " + Parametres.TexteVersion) { Enabled = false });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(new ToolStripMenuItem("Quitter Card Pro", null, (s, e) => Quitter()));

            // Le menu (un contrôle Windows) installe le contexte d'exécution de l'interface.
            contexte = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
            icone = new NotifyIcon
            {
                Icon = ChargerIcone(),
                Text = "Card Pro RH",
                ContextMenuStrip = menu,
                Visible = true,
            };
            icone.MouseClick += (s, e) =>
            {
                if (e.Button == MouseButtons.Left) OuvrirAppli();
            };
            serveur.ArretInattendu += (s, e) => contexte.Post(_ => SignalerArret(), null);
        }

        /// <summary>Affiche une bulle d'information près de l'horloge.</summary>
        /// <param name="titre">Titre.</param>
        /// <param name="texte">Message.</param>
        /// <param name="type">Type d'icône.</param>
        public void Bulle(string titre, string texte, ToolTipIcon type)
        {
            icone.ShowBalloonTip(5000, titre, texte, type);
        }

        /// <summary>Cherche une mise à jour et la signale.</summary>
        /// <param name="manuelle">true si demandée par la personne (elle reçoit toujours une réponse).</param>
        public async void VerifierMiseAJour(bool manuelle)
        {
            Version nouvelle = null;
            bool erreur = false;
            try
            {
                nouvelle = await MiseAJour.ChercherAsync();
            }
            catch (Exception)
            {
                erreur = true; // Pas d'Internet, GitHub indisponible…
            }
            contexte.Post(_ =>
            {
                if (nouvelle != null)
                {
                    elementMiseAJour.Text = "Télécharger la version " + nouvelle;
                    elementMiseAJour.Available = true;
                    Bulle("Mise à jour disponible", "Card Pro " + nouvelle + " est disponible. Clic droit sur l'icône → Télécharger.", ToolTipIcon.Info);
                }
                else if (manuelle)
                {
                    Bulle("Card Pro", erreur ? "Impossible de vérifier : pas de connexion à GitHub." : "Card Pro est à jour.", ToolTipIcon.Info);
                }
            }, null);
        }

        /// <summary>Retire l'icône.</summary>
        public void Dispose()
        {
            icone.Visible = false;
            icone.Dispose();
        }

        /// <summary>Ouvre l'appli dans le navigateur.</summary>
        private void OuvrirAppli()
        {
            Navigateur.Ouvrir(serveur.Adresse);
        }

        /// <summary>Ouvre le dossier des données dans l'Explorateur.</summary>
        private static void OuvrirDossierDonnees()
        {
            Process.Start(new ProcessStartInfo("explorer.exe", "\"" + Parametres.DossierDonnees + "\"") { UseShellExecute = true });
        }

        /// <summary>Arrête le serveur et ferme le lanceur.</summary>
        private void Quitter()
        {
            serveur.Arreter();
            icone.Visible = false;
            Application.Exit();
        }

        /// <summary>Le serveur s'est arrêté seul : on prévient et on ferme.</summary>
        private void SignalerArret()
        {
            icone.Visible = false;
            MessageBox.Show(
                "Card Pro s'est arrêté de façon inattendue.\nRelance-le. Détails dans : " + Parametres.FichierJournal,
                "Card Pro RH", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Application.Exit();
        }

        /// <summary>Icône intégrée à l'exe.</summary>
        /// <returns>Icône Card Pro.</returns>
        private static Icon ChargerIcone()
        {
            using (System.IO.Stream flux = Assembly.GetExecutingAssembly().GetManifestResourceStream("icone.ico"))
            {
                return flux == null ? SystemIcons.Application : new Icon(flux, SystemInformation.SmallIconSize);
            }
        }
    }
}
