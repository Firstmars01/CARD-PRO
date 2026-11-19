/*
 * MiseAJour.cs
 * Vérifie sur GitHub (page Releases) si une version plus récente de
 * CardPro-RH.exe existe. Aucune donnée n'est envoyée : simple lecture du
 * numéro de la dernière version publique.
 */
using System;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace CardPro.Lanceur
{
    /// <summary>Recherche de mise à jour.</summary>
    internal static class MiseAJour
    {
        /// <summary>Cherche une version plus récente que celle de l'exe.</summary>
        /// <returns>Nouvelle version, ou null s'il n'y en a pas (ou si GitHub est injoignable).</returns>
        public static async Task<Version> ChercherAsync()
        {
            if (Parametres.DepotGithub.Length == 0) return null;
            using (HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(8) })
            {
                client.DefaultRequestHeaders.UserAgent.ParseAdd("CardPro-RH/" + Parametres.TexteVersion);
                client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
                string texte = await client
                    .GetStringAsync("https://api.github.com/repos/" + Parametres.DepotGithub + "/releases/latest")
                    .ConfigureAwait(false);
                Match resultat = Regex.Match(texte, "\"tag_name\"\\s*:\\s*\"v?(\\d+\\.\\d+\\.\\d+)\"");
                if (!resultat.Success) return null;
                Version derniere = new Version(resultat.Groups[1].Value);
                return derniere > new Version(Parametres.TexteVersion) ? derniere : null;
            }
        }
    }
}
