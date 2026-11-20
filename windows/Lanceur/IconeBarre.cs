/*
 * IconeBarre.cs
 * Icône DrawCard près de l'horloge, avec son menu :
 * afficher la fenêtre, dossier des données, mise à jour, quitter.
 * Toutes les 6 heures, elle cherche une nouvelle version, la télécharge en
 * arrière-plan et propose de redémarrer ; sinon elle s'installe au prochain lancement.
 */
using System;
using System.Diagnostics;
using System.Drawing;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace DrawCard.Lanceur
{
    /// <summary>Icône de la zone de notification.</summary>
    internal sealed class IconeBarre : IDisposable
    {
        private readonly ServeurLocal serveur;
        private readonly Action ouvrirAppli;
        private readonly NotifyIcon icone;
        private readonly ToolStripMenuItem elementMiseAJour;
        private readonly SynchronizationContext contexte;
        private readonly System.Windows.Forms.Timer minuterie = new System.Windows.Forms.Timer { Interval = 6 * 60 * 60 * 1000 };
        private bool rechercheEnCours;
        private bool quitte;

        /// <summary>Crée l'icône et son menu.</summary>
        /// <param name="serveur">Serveur DrawCard en cours.</param>
        /// <param name="ouvrirAppli">Affiche l'appli (fenêtre DrawCard, ou navigateur en secours).</param>
        public IconeBarre(ServeurLocal serveur, Action ouvrirAppli)
        {
            this.serveur = serveur;
            this.ouvrirAppli = ouvrirAppli;
            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem ouvrir = new ToolStripMenuItem("Ouvrir DrawCard", null, (s, e) => OuvrirAppli());
            ouvrir.Font = new Font(ouvrir.Font, FontStyle.Bold);
            elementMiseAJour = new ToolStripMenuItem("", null, (s, e) => RedemarrerPourMettreAJour()) { Available = false };
            menu.Items.Add(ouvrir);
            menu.Items.Add(new ToolStripMenuItem("Dossier des données", null, (s, e) => OuvrirDossierDonnees()));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(elementMiseAJour);
            menu.Items.Add(new ToolStripMenuItem("Rechercher une mise à jour", null, (s, e) => VerifierMiseAJour(true)));
            menu.Items.Add(new ToolStripMenuItem("Version " + Parametres.TexteVersion) { Enabled = false });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(new ToolStripMenuItem("Quitter DrawCard", null, (s, e) => Quitter()));

            // Le menu (un contrôle Windows) installe le contexte d'exécution de l'interface.
            contexte = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
            icone = new NotifyIcon
            {
                Icon = ChargerIcone(),
                Text = "DrawCard Configurateur",
                ContextMenuStrip = menu,
                Visible = true,
            };
            icone.MouseClick += (s, e) =>
            {
                if (e.Button == MouseButtons.Left) OuvrirAppli();
            };
            serveur.ArretInattendu += (s, e) => contexte.Post(_ => SignalerArret(), null);
            minuterie.Tick += (s, e) => VerifierMiseAJour(false);
        }

        /// <summary>Lance les vérifications périodiques (et signale une version déjà prête).</summary>
        public void DemarrerVerificationsMiseAJour()
        {
            Version prete = MiseAJour.VersionPrete();
            if (prete != null) SignalerVersionPrete(prete);
            minuterie.Start();
        }

        /// <summary>Affiche une bulle d'information près de l'horloge.</summary>
        /// <param name="titre">Titre.</param>
        /// <param name="texte">Message.</param>
        /// <param name="type">Type d'icône.</param>
        public void Bulle(string titre, string texte, ToolTipIcon type)
        {
            icone.ShowBalloonTip(5000, titre, texte, type);
        }

        /// <summary>Cherche une mise à jour, la télécharge et la signale.</summary>
        /// <param name="manuelle">true si demandée par la personne (elle reçoit toujours une réponse).</param>
        public async void VerifierMiseAJour(bool manuelle)
        {
            if (rechercheEnCours) return;
            rechercheEnCours = true;
            string message = null;
            Version prete = MiseAJour.VersionPrete();
            try
            {
                if (prete == null)
                {
                    InfoVersion info = await MiseAJour.ChercherAsync(TimeSpan.FromSeconds(10));
                    if (info == null) message = "DrawCard est à jour.";
                    else if (await MiseAJour.TelechargerAsync(info, null)) prete = info.Version;
                    else message = "La mise à jour téléchargée est invalide : elle a été ignorée.";
                }
            }
            catch (Exception)
            {
                message = "Impossible de vérifier : pas de connexion à GitHub.";
            }
            finally
            {
                rechercheEnCours = false;
            }
            contexte.Post(_ =>
            {
                if (prete != null) SignalerVersionPrete(prete);
                else if (manuelle) Bulle("DrawCard", message, ToolTipIcon.Info);
            }, null);
        }

        /// <summary>Retire l'icône.</summary>
        public void Dispose()
        {
            minuterie.Dispose();
            icone.Visible = false;
            icone.Dispose();
        }

        /// <summary>Affiche l'appli.</summary>
        private void OuvrirAppli()
        {
            ouvrirAppli();
        }

        /// <summary>Ouvre le dossier des données dans l'Explorateur.</summary>
        private static void OuvrirDossierDonnees()
        {
            Process.Start(new ProcessStartInfo("explorer.exe", "\"" + Parametres.DossierDonnees + "\"") { UseShellExecute = true });
        }

        /// <summary>Arrête le serveur et ferme DrawCard (menu, ou fermeture de la fenêtre).</summary>
        public void Quitter()
        {
            // Appelé une seule fois (fermer la fenêtre déclenche aussi Quitter).
            if (quitte) return;
            quitte = true;
            serveur.Arreter();
            icone.Visible = false;
            Application.Exit();
        }

        /// <summary>Annonce une version téléchargée, prête à installer.</summary>
        /// <param name="version">Version prête.</param>
        private void SignalerVersionPrete(Version version)
        {
            elementMiseAJour.Text = "Redémarrer et installer la version " + version;
            elementMiseAJour.Available = true;
            Bulle("Mise à jour prête", "DrawCard " + version + " s'installera au prochain lancement. Clic droit sur l'icône pour l'installer maintenant.", ToolTipIcon.Info);
        }

        /// <summary>Arrête DrawCard, installe la nouvelle version et la relance.</summary>
        private void RedemarrerPourMettreAJour()
        {
            serveur.Arreter();
            if (MiseAJour.Installer())
            {
                icone.Visible = false;
                Application.Exit();
                return;
            }
            MessageBox.Show(
                "La mise à jour n'a pas pu être installée (dossier de l'exe protégé ?). DrawCard va se fermer : relance-le.",
                "DrawCard Configurateur", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            icone.Visible = false;
            Application.Exit();
        }

        /// <summary>Le serveur s'est arrêté seul : on prévient et on ferme.</summary>
        private void SignalerArret()
        {
            icone.Visible = false;
            MessageBox.Show(
                "DrawCard s'est arrêté de façon inattendue.\nRelance-le. Détails dans : " + Parametres.FichierJournal,
                "DrawCard Configurateur", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Application.Exit();
        }

        /// <summary>Icône intégrée à l'exe.</summary>
        /// <returns>Icône DrawCard.</returns>
        public static Icon ChargerIcone()
        {
            using (System.IO.Stream flux = Assembly.GetExecutingAssembly().GetManifestResourceStream("icone.ico"))
            {
                return flux == null ? SystemIcons.Application : new Icon(flux, SystemInformation.SmallIconSize);
            }
        }
    }
}
