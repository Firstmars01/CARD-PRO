/*
 * FenetreAppli.cs
 * Fenêtre de bureau de Card Pro : l'appli s'affiche dans une vraie fenêtre
 * (WebView2), sans barre d'adresse ni onglets.
 *  - seule l'appli locale (http://localhost:<port>/) s'affiche dans la
 *    fenêtre ; les liens https s'ouvrent dans le navigateur par défaut ;
 *  - chaque téléchargement demande où enregistrer le fichier ;
 *  - outils de développement désactivés.
 * Fermer la fenêtre quitte Card Pro (géré par Programme).
 */
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace CardPro.Lanceur
{
    /// <summary>Fenêtre principale de Card Pro.</summary>
    internal sealed class FenetreAppli : Form
    {
        private readonly string adresse;
        private readonly WebView2 vue;

        /// <summary>Crée la fenêtre (l'appli est chargée par OuvrirAsync).</summary>
        /// <param name="adresse">Adresse de l'appli locale (http://localhost:port/).</param>
        public FenetreAppli(string adresse)
        {
            this.adresse = adresse;
            Text = "Card Pro Configurateur";
            Icon = IconeBarre.ChargerIcone();
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(1400, 900);
            MinimumSize = new Size(1000, 650);
            WindowState = FormWindowState.Maximized;
            vue = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(242, 243, 246) };
            Controls.Add(vue);
        }

        /// <summary>
        /// Prépare le moteur WebView2 et affiche l'appli.
        /// </summary>
        /// <returns>Tâche terminée quand l'appli est chargée.</returns>
        /// <exception cref="WebView2RuntimeNotFoundException">Moteur WebView2 absent de ce PC.</exception>
        public async Task OuvrirAsync()
        {
            if (!ChargementWebView2.ExtraireLoader()) throw new InvalidOperationException("WebView2Loader.dll absente de l'exe.");
            CoreWebView2Environment.SetLoaderDllFolderPath(ChargementWebView2.DossierLoader);
            Directory.CreateDirectory(ChargementWebView2.DossierDonneesFenetre);
            CoreWebView2Environment environnement = await CoreWebView2Environment.CreateAsync(null, ChargementWebView2.DossierDonneesFenetre, null);
            await vue.EnsureCoreWebView2Async(environnement);

            CoreWebView2 moteur = vue.CoreWebView2;
            moteur.Settings.AreDevToolsEnabled = false;
            moteur.Settings.IsStatusBarEnabled = false;
            moteur.Settings.AreDefaultScriptDialogsEnabled = true;
            moteur.NavigationStarting += SurNavigation;
            moteur.NewWindowRequested += SurNouvelleFenetre;
            moteur.DownloadStarting += SurTelechargement;
            moteur.Navigate(adresse);
        }

        /// <summary>Remet la fenêtre au premier plan (seconde ouverture de Card Pro, icône).</summary>
        public void Afficher()
        {
            if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Maximized;
            Show();
            Activate();
        }

        /// <summary>true si l'adresse appartient à l'appli locale.</summary>
        /// <param name="uri">Adresse demandée.</param>
        /// <returns>true pour une page de Card Pro.</returns>
        private bool EstAppli(string uri)
        {
            return uri != null && uri.StartsWith(adresse, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Seule l'appli s'affiche dans la fenêtre ; les liens https partent dans le navigateur.</summary>
        private void SurNavigation(object source, CoreWebView2NavigationStartingEventArgs e)
        {
            if (EstAppli(e.Uri)) return;
            e.Cancel = true;
            Navigateur.OuvrirLienExterne(e.Uri);
        }

        /// <summary>Un lien qui veut ouvrir une nouvelle fenêtre s'ouvre dans le navigateur.</summary>
        private void SurNouvelleFenetre(object source, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            if (EstAppli(e.Uri)) Navigateur.Ouvrir(e.Uri);
            else Navigateur.OuvrirLienExterne(e.Uri);
        }

        /// <summary>Demande où enregistrer chaque fichier téléchargé.</summary>
        private void SurTelechargement(object source, CoreWebView2DownloadStartingEventArgs e)
        {
            CoreWebView2Deferral report = e.GetDeferral();
            string propose = e.ResultFilePath;
            // La fenêtre de choix s'ouvre après l'événement (recommandé par WebView2).
            BeginInvoke((Action)(() =>
            {
                try
                {
                    string nom = Path.GetFileName(propose);
                    string extension = Path.GetExtension(nom).TrimStart('.');
                    using (SaveFileDialog choix = new SaveFileDialog
                    {
                        Title = "Enregistrer le fichier",
                        FileName = nom,
                        InitialDirectory = Path.GetDirectoryName(propose),
                        Filter = extension.Length > 0
                            ? "Fichier " + extension.ToUpperInvariant() + " (*." + extension + ")|*." + extension + "|Tous les fichiers (*.*)|*.*"
                            : "Tous les fichiers (*.*)|*.*",
                        OverwritePrompt = true,
                    })
                    {
                        if (choix.ShowDialog(this) == DialogResult.OK)
                        {
                            e.ResultFilePath = choix.FileName;
                            e.Handled = true; // Pas de panneau de téléchargement d'Edge.
                        }
                        else
                        {
                            e.Cancel = true;
                        }
                    }
                }
                finally
                {
                    report.Complete();
                }
            }));
        }
    }
}
