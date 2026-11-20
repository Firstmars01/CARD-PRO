/*
 * FenetreProgression.cs
 * Petite fenêtre affichée au démarrage de Card Pro : elle montre l'étape en
 * cours (recherche de mise à jour, téléchargement avec pourcentage,
 * installation, lancement) puis se ferme toute seule.
 */
using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace CardPro.Lanceur
{
    /// <summary>Fenêtre de progression du démarrage.</summary>
    internal sealed class FenetreProgression : Form
    {
        private readonly Label etiquetteEtape;
        private readonly ProgressBar barre;

        /// <summary>Crée la fenêtre.</summary>
        private FenetreProgression()
        {
            Text = "Card Pro";
            Icon = IconeBarre.ChargerIcone();
            FormBorderStyle = FormBorderStyle.FixedDialog;
            ControlBox = false;
            ShowInTaskbar = true;
            TopMost = true;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(420, 120);
            Font = new Font("Segoe UI", 10f);

            Label titre = new Label
            {
                Text = "Card Pro",
                Font = new Font("Segoe UI", 13f, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(20, 14),
            };
            etiquetteEtape = new Label
            {
                Text = "Démarrage…",
                AutoSize = false,
                Size = new Size(380, 24),
                Location = new Point(20, 48),
            };
            barre = new ProgressBar
            {
                Style = ProgressBarStyle.Marquee,
                MarqueeAnimationSpeed = 30,
                Size = new Size(380, 18),
                Location = new Point(20, 80),
            };
            Controls.Add(titre);
            Controls.Add(etiquetteEtape);
            Controls.Add(barre);
        }

        /// <summary>Affiche une étape sans pourcentage (barre animée).</summary>
        /// <param name="texte">Étape en cours.</param>
        public void Etape(string texte)
        {
            etiquetteEtape.Text = texte;
            barre.Style = ProgressBarStyle.Marquee;
        }

        /// <summary>Affiche l'avancement du téléchargement.</summary>
        /// <param name="avancement">Octets reçus et taille totale (0 si inconnue).</param>
        public void Telechargement(Avancement avancement)
        {
            if (avancement.Total <= 0)
            {
                Etape("Téléchargement de la mise à jour… " + EnMo(avancement.Recus));
                return;
            }
            int pourcentage = (int)Math.Min(100, avancement.Recus * 100 / avancement.Total);
            barre.Style = ProgressBarStyle.Continuous;
            barre.Value = pourcentage;
            etiquetteEtape.Text = "Téléchargement de la mise à jour : " + pourcentage + " % ("
                + EnMo(avancement.Recus) + " / " + EnMo(avancement.Total) + ")";
        }

        /// <summary>
        /// Affiche la fenêtre pendant un travail, puis la ferme.
        /// </summary>
        /// <typeparam name="T">Type du résultat.</typeparam>
        /// <param name="travail">Travail à effectuer (reçoit la fenêtre pour afficher les étapes).</param>
        /// <returns>Résultat du travail.</returns>
        /// <exception cref="Exception">Erreur levée par le travail.</exception>
        public static T Executer<T>(Func<FenetreProgression, Task<T>> travail)
        {
            T resultat = default(T);
            Exception erreur = null;
            using (FenetreProgression fenetre = new FenetreProgression())
            {
                fenetre.Shown += async (s, e) =>
                {
                    try
                    {
                        resultat = await travail(fenetre);
                    }
                    catch (Exception exception)
                    {
                        erreur = exception;
                    }
                    fenetre.Close();
                };
                Application.Run(fenetre);
            }
            if (erreur != null) throw erreur;
            return resultat;
        }

        /// <summary>Taille lisible en mégaoctets.</summary>
        /// <param name="octets">Nombre d'octets.</param>
        /// <returns>Texte « 12,3 Mo ».</returns>
        private static string EnMo(long octets)
        {
            return (octets / 1048576.0).ToString("0.0") + " Mo";
        }
    }

    /// <summary>Avancement d'un téléchargement.</summary>
    internal struct Avancement
    {
        /// <summary>Octets reçus.</summary>
        public long Recus;

        /// <summary>Taille totale (0 si inconnue).</summary>
        public long Total;
    }
}
