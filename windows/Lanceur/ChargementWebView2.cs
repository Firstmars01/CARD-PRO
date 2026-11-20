/*
 * ChargementWebView2.cs
 * WebView2 (moteur d'Edge, présent sur Windows 10 et 11) affiche l'appli
 * dans une vraie fenêtre. Ses bibliothèques sont intégrées à l'exe pour
 * qu'il reste un seul fichier :
 *  - les deux DLL .NET sont chargées depuis l'exe à la demande ;
 *  - WebView2Loader.dll (native) est extraite dans %LOCALAPPDATA%\DrawCard\webview2.
 * Prepare() doit être appelé avant toute utilisation d'un type WebView2.
 */
using System;
using System.IO;
using System.Reflection;

namespace DrawCard.Lanceur
{
    /// <summary>Chargement des bibliothèques WebView2 intégrées.</summary>
    internal static class ChargementWebView2
    {
        private static readonly string[] Bibliotheques = { "Microsoft.Web.WebView2.Core", "Microsoft.Web.WebView2.WinForms" };
        private static bool prepare;

        /// <summary>Dossier qui contient WebView2Loader.dll (une fois extraite).</summary>
        public static string DossierLoader
        {
            get { return Path.Combine(Path.GetDirectoryName(Parametres.DossierProgrammes), "webview2"); }
        }

        /// <summary>Dossier des données de la fenêtre (cache, réglages du moteur).</summary>
        public static string DossierDonneesFenetre
        {
            get { return Path.Combine(Path.GetDirectoryName(Parametres.DossierProgrammes), "fenetre"); }
        }

        /// <summary>Installe le chargement des DLL intégrées (une seule fois).</summary>
        public static void Preparer()
        {
            if (prepare) return;
            prepare = true;
            AppDomain.CurrentDomain.AssemblyResolve += (s, e) =>
            {
                string nom = new AssemblyName(e.Name).Name;
                if (Array.IndexOf(Bibliotheques, nom) < 0) return null;
                byte[] octets = LireRessource(nom + ".dll");
                return octets == null ? null : Assembly.Load(octets);
            };
        }

        /// <summary>Extrait WebView2Loader.dll adaptée au processeur (si besoin).</summary>
        /// <returns>true si le fichier est prêt.</returns>
        public static bool ExtraireLoader()
        {
            // Processeur vu par ce processus (« AMD64 », « ARM64 » ou « x86 »).
            string processeur = (Environment.GetEnvironmentVariable("PROCESSOR_ARCHITECTURE") ?? "").ToUpperInvariant();
            string architecture = processeur == "ARM64" ? "arm64" : Environment.Is64BitProcess ? "x64" : "x86";
            byte[] octets = LireRessource("WebView2Loader-" + architecture + ".dll");
            if (octets == null) return false;
            Directory.CreateDirectory(DossierLoader);
            string chemin = Path.Combine(DossierLoader, "WebView2Loader.dll");
            if (!File.Exists(chemin) || new FileInfo(chemin).Length != octets.Length) File.WriteAllBytes(chemin, octets);
            return true;
        }

        /// <summary>Lit une ressource intégrée à l'exe.</summary>
        /// <param name="nom">Nom logique de la ressource.</param>
        /// <returns>Octets, ou null si absente.</returns>
        private static byte[] LireRessource(string nom)
        {
            using (Stream flux = Assembly.GetExecutingAssembly().GetManifestResourceStream(nom))
            {
                if (flux == null) return null;
                using (MemoryStream copie = new MemoryStream())
                {
                    flux.CopyTo(copie);
                    return copie.ToArray();
                }
            }
        }
    }
}
