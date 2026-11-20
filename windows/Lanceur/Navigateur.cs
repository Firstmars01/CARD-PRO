/*
 * Navigateur.cs
 * Ouvre la page de Card Pro dans le navigateur par défaut, qu'il soit déjà
 * ouvert ou non. Le navigateur par défaut est lu dans les réglages de
 * Windows et lancé directement avec l'adresse ; en secours, on passe par
 * Windows (ouverture du lien, puis l'Explorateur).
 * Seule l'appli locale (http://localhost:…) peut être ouverte.
 */
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace CardPro.Lanceur
{
    /// <summary>Ouverture du navigateur.</summary>
    internal static class Navigateur
    {
        /// <summary>Ouvre une adresse de l'appli locale.</summary>
        /// <param name="adresse">http://localhost:…</param>
        public static void Ouvrir(string adresse)
        {
            if (!adresse.StartsWith("http://localhost:", StringComparison.Ordinal)) return;
            if (LancerNavigateurParDefaut(adresse)) return;
            if (Essayer(new ProcessStartInfo(adresse) { UseShellExecute = true })) return;
            if (Essayer(new ProcessStartInfo("explorer.exe", "\"" + adresse + "\"") { UseShellExecute = false })) return;
            MessageBox.Show("Ouvre cette adresse dans ton navigateur : " + adresse, "Card Pro Configurateur", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        /// <summary>Lance directement le navigateur choisi dans Windows.</summary>
        /// <param name="adresse">Adresse à ouvrir.</param>
        /// <returns>true si le navigateur a été lancé.</returns>
        private static bool LancerNavigateurParDefaut(string adresse)
        {
            string commande = CommandeNavigateur();
            if (string.IsNullOrEmpty(commande)) return false;

            // Ex. : "C:\...\msedge.exe" --single-argument %1
            string executable;
            string arguments;
            if (commande.StartsWith("\"", StringComparison.Ordinal))
            {
                int fin = commande.IndexOf('"', 1);
                if (fin < 0) return false;
                executable = commande.Substring(1, fin - 1);
                arguments = commande.Substring(fin + 1).Trim();
            }
            else
            {
                int espace = commande.IndexOf(' ');
                executable = espace < 0 ? commande : commande.Substring(0, espace);
                arguments = espace < 0 ? "" : commande.Substring(espace + 1).Trim();
            }
            if (!executable.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) || !File.Exists(executable)) return false;

            arguments = arguments.Contains("%1") ? arguments.Replace("%1", adresse) : (arguments + " " + adresse).Trim();
            return Essayer(new ProcessStartInfo(executable, arguments) { UseShellExecute = false });
        }

        /// <summary>Commande d'ouverture du navigateur par défaut (registre Windows).</summary>
        /// <returns>Commande, ou null si introuvable.</returns>
        private static string CommandeNavigateur()
        {
            try
            {
                string programme;
                using (RegistryKey choix = Registry.CurrentUser.OpenSubKey(
                    "Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice"))
                {
                    programme = choix == null ? null : choix.GetValue("ProgId") as string;
                }
                if (string.IsNullOrEmpty(programme)) return null;
                using (RegistryKey commande = Registry.ClassesRoot.OpenSubKey(programme + "\\shell\\open\\command"))
                {
                    return commande == null ? null : commande.GetValue(null) as string;
                }
            }
            catch (Exception)
            {
                return null; // Registre inaccessible : on passera par Windows.
            }
        }

        /// <summary>Lance un programme sans erreur.</summary>
        /// <param name="infos">Programme à lancer.</param>
        /// <returns>true si le lancement a réussi.</returns>
        private static bool Essayer(ProcessStartInfo infos)
        {
            try
            {
                using (Process.Start(infos))
                {
                    return true;
                }
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
