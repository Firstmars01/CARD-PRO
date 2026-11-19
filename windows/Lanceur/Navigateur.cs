/*
 * Navigateur.cs
 * Ouvre une adresse dans le navigateur par défaut. Seule l'appli locale
 * (http://localhost:…) est acceptée.
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
        /// <param name="adresse">http://localhost:…</param>
        public static void Ouvrir(string adresse)
        {
            if (!adresse.StartsWith("http://localhost:", StringComparison.Ordinal)) return;
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
