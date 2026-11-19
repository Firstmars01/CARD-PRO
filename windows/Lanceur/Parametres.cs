/*
 * Parametres.cs
 * Chemins et informations du lanceur : version, dépôt GitHub, dossiers des
 * données (%APPDATA%\CardPro) et de l'appli (%LOCALAPPDATA%\CardPro\app).
 */
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;

namespace CardPro.Lanceur
{
    /// <summary>Chemins et informations de l'appli.</summary>
    internal static class Parametres
    {
        /// <summary>Version de l'exe (fixée à la compilation).</summary>
        public static readonly Version VersionAppli = Assembly.GetExecutingAssembly().GetName().Version;

        /// <summary>Dépôt GitHub « compte/depot », vide en compilation locale.</summary>
        public static readonly string DepotGithub = LireDepot();

        /// <summary>Dossier des données (base, journal) : conservé entre les versions.</summary>
        public static readonly string DossierDonnees = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "CardPro");

        /// <summary>Dossier où l'appli est extraite (un sous-dossier par version).</summary>
        public static readonly string DossierProgrammes = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CardPro", "app");

        /// <summary>Version au format « 4.1.0 ».</summary>
        public static string TexteVersion
        {
            get { return VersionAppli.Major + "." + VersionAppli.Minor + "." + VersionAppli.Build; }
        }

        /// <summary>Dossier de l'appli pour cette version.</summary>
        public static string DossierVersion
        {
            get { return Path.Combine(DossierProgrammes, TexteVersion); }
        }

        /// <summary>Base de données SQLite.</summary>
        public static string FichierBase
        {
            get { return Path.Combine(DossierDonnees, "cardpro.sqlite"); }
        }

        /// <summary>Journal du serveur (en cas de problème).</summary>
        public static string FichierJournal
        {
            get { return Path.Combine(DossierDonnees, "journal.txt"); }
        }

        /// <summary>Port utilisé par l'appli en cours (pour une seconde ouverture).</summary>
        public static string FichierPort
        {
            get { return Path.Combine(DossierDonnees, "port.txt"); }
        }

        /// <summary>Adresse de l'appli mobile sur GitHub Pages, ou vide.</summary>
        public static string LienPortefeuille
        {
            get
            {
                if (DepotGithub.Length == 0) return "";
                string[] parties = DepotGithub.Split('/');
                return "https://" + parties[0].ToLowerInvariant() + ".github.io/" + parties[1] + "/portefeuille/";
            }
        }

        /// <summary>Page GitHub des versions (téléchargement des mises à jour).</summary>
        public static string PageVersions
        {
            get { return "https://github.com/" + DepotGithub + "/releases/latest"; }
        }

        /// <summary>
        /// Lit le dépôt GitHub inscrit dans l'exe à la compilation, et vérifie son format.
        /// </summary>
        /// <returns>« compte/depot », ou chaîne vide.</returns>
        private static string LireDepot()
        {
            AssemblyMetadataAttribute attribut = Assembly.GetExecutingAssembly()
                .GetCustomAttributes(typeof(AssemblyMetadataAttribute), false)
                .Cast<AssemblyMetadataAttribute>()
                .FirstOrDefault(a => a.Key == "DepotGithub");
            string valeur = attribut == null ? "" : (attribut.Value ?? "");
            return Regex.IsMatch(valeur, "^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$") ? valeur : "";
        }
    }
}
