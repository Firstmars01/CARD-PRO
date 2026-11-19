/*
 * Navigateur.cs
 * Ouvre une adresse dans le navigateur par défaut. Seules les adresses de
 * l'appli locale et de GitHub sont acceptées.
 */
using System;
using System.Diagnostics;
using System.Windows.Forms;

namespace CardPro.Lanceur
{
    /// <summary>Ouverture du navigateur.</summary>
    internal static class Navigateur
    {
        /// <summary>Ouvre une adresse autorisée.</summary>
        /// <param name="adresse">http://localhost:… ou https://github.com/…</param>
        public static void Ouvrir(string adresse)
        {
            bool autorisee = adresse.StartsWith("http://localhost:", StringComparison.Ordinal)
                || adresse.StartsWith("https://github.com/", StringComparison.Ordinal);
            if (!autorisee) return;
            try
            {
                Process.Start(new ProcessStartInfo(adresse) { UseShellExecute = true });
            }
            catch (Exception)
            {
                MessageBox.Show("Ouvre cette adresse dans ton navigateur : " + adresse, "Card Pro RH", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
    }
}
