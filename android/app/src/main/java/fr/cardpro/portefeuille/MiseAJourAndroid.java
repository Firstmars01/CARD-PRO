/*
 * MiseAJourAndroid.java
 * Mise à jour automatique de l'appli Android (installée hors Play Store) :
 *  1. à l'ouverture (au plus toutes les 6 heures, si le téléphone est en
 *     ligne), lecture de telechargement/version.json sur le site du projet ;
 *  2. si la version est plus récente : téléchargement de l'APK en
 *     arrière-plan, vérification de son empreinte SHA-256, de son nom de
 *     paquet et de son numéro de version ;
 *  3. ouverture de l'installateur d'Android : la personne touche « Mettre à
 *     jour » (confirmation obligatoire hors Play Store). Les cartes sont conservées.
 */
package fr.cardpro.portefeuille;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

final class MiseAJourAndroid {

    private static final long INTERVALLE = 6L * 60 * 60 * 1000;
    private static final int TAILLE_MAX_JSON = 4 * 1024;
    private static final long TAILLE_MAX_APK = 150L * 1024 * 1024;
    private static final String PREFERENCES = "mise_a_jour";
    private static final String CLE_DERNIERE = "derniere_verification";

    private static final AtomicBoolean enCours = new AtomicBoolean(false);
    private static boolean installationEnAttente = false;

    private MiseAJourAndroid() {
    }

    /**
     * Vérifie s'il existe une mise à jour (appelé à chaque retour dans l'appli).
     *
     * @param activite écran principal
     */
    static void verifier(Activity activite) {
        String site = BuildConfig.ADRESSE_SITE;
        if (!site.startsWith("https://") || !site.endsWith("/")) return;

        // Autorisation d'installer accordée entre-temps : on reprend l'installation.
        File apk = fichierApk(activite);
        if (installationEnAttente) {
            installationEnAttente = false;
            if (apk.isFile() && peutInstaller(activite)) {
                installer(activite, apk);
                return;
            }
        }

        SharedPreferences preferences = activite.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        long maintenant = System.currentTimeMillis();
        if (maintenant - preferences.getLong(CLE_DERNIERE, 0) < INTERVALLE || !enLigne(activite)) return;
        if (!enCours.compareAndSet(false, true)) return;
        preferences.edit().putLong(CLE_DERNIERE, maintenant).apply();

        Context contexte = activite.getApplicationContext();
        new Thread(() -> {
            try {
                if (telechargerSiNouvelle(contexte, site, apk)) {
                    activite.runOnUiThread(() -> {
                        if (!activite.isFinishing()) installer(activite, apk);
                    });
                }
            } catch (Exception erreur) {
                // Hors ligne, site indisponible, fichier invalide : on réessaiera plus tard.
                apk.delete();
            } finally {
                enCours.set(false);
            }
        }, "MiseAJourCardPro").start();
    }

    /**
     * Télécharge l'APK si une version plus récente est publiée.
     *
     * @param contexte contexte de l'appli
     * @param site     adresse du site (https://…/)
     * @param apk      fichier de destination
     * @return true si un APK vérifié est prêt à installer
     * @throws Exception en cas d'erreur réseau ou de fichier invalide
     */
    private static boolean telechargerSiNouvelle(Context contexte, String site, File apk) throws Exception {
        JSONObject version = new JSONObject(new String(lire(site + "telechargement/version.json", TAILLE_MAX_JSON), StandardCharsets.UTF_8));
        long code = version.getLong("versionCode");
        String empreinte = version.getString("sha256").toLowerCase();
        if (code <= versionInstallee(contexte) || !empreinte.matches("[0-9a-f]{64}")) return false;

        File dossier = apk.getParentFile();
        if (dossier != null && !dossier.isDirectory() && !dossier.mkdirs()) return false;
        File partiel = new File(apk.getPath() + ".part");
        telecharger(site + "telechargement/CardPro.apk", partiel);
        if (!empreinte.equals(sha256(partiel)) || !apkValide(contexte, partiel, code)) {
            partiel.delete();
            throw new IOException("APK de mise à jour invalide.");
        }
        return partiel.renameTo(apk);
    }

    /**
     * Ouvre l'installateur d'Android (ou demande d'abord l'autorisation d'installer).
     *
     * @param activite écran principal
     * @param apk      APK vérifié
     */
    private static void installer(Activity activite, File apk) {
        if (!peutInstaller(activite)) {
            installationEnAttente = true;
            Toast.makeText(activite, "Mise à jour de Card Pro prête : autorise l'installation, puis reviens dans l'appli.", Toast.LENGTH_LONG).show();
            lancer(activite, new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activite.getPackageName())));
            return;
        }
        Uri adresse = FileProvider.getUriForFile(activite, activite.getPackageName() + ".fichiers", apk);
        Intent installation = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(adresse, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Toast.makeText(activite, "Nouvelle version de Card Pro : touche « Mettre à jour ».", Toast.LENGTH_LONG).show();
        lancer(activite, installation);
    }

    /**
     * @param activite écran principal
     * @return true si Card Pro a le droit d'installer sa mise à jour
     */
    private static boolean peutInstaller(Activity activite) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || activite.getPackageManager().canRequestPackageInstalls();
    }

    /**
     * Vérifie que l'APK téléchargé est bien Card Pro, en version plus récente.
     *
     * @param contexte contexte de l'appli
     * @param fichier  APK téléchargé
     * @param code     numéro de version attendu
     * @return true si le paquet et la version correspondent
     */
    @SuppressWarnings("deprecation")
    private static boolean apkValide(Context contexte, File fichier, long code) {
        PackageInfo infos = contexte.getPackageManager().getPackageArchiveInfo(fichier.getPath(), 0);
        if (infos == null || !contexte.getPackageName().equals(infos.packageName)) return false;
        long contenu = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? infos.getLongVersionCode() : infos.versionCode;
        return contenu == code;
    }

    /**
     * @param contexte contexte de l'appli
     * @return numéro de version installé
     */
    @SuppressWarnings("deprecation")
    private static long versionInstallee(Context contexte) throws PackageManager.NameNotFoundException {
        PackageInfo infos = contexte.getPackageManager().getPackageInfo(contexte.getPackageName(), 0);
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? infos.getLongVersionCode() : infos.versionCode;
    }

    /**
     * @param contexte contexte de l'appli
     * @return true si le téléphone a accès à Internet
     */
    private static boolean enLigne(Context contexte) {
        ConnectivityManager connexions = (ConnectivityManager) contexte.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connexions == null) return false;
        Network reseau = connexions.getActiveNetwork();
        NetworkCapabilities capacites = reseau == null ? null : connexions.getNetworkCapabilities(reseau);
        return capacites != null && capacites.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    /**
     * @param contexte contexte de l'appli
     * @return emplacement de l'APK téléchargé (dossier partageable « maj »)
     */
    private static File fichierApk(Context contexte) {
        return new File(new File(contexte.getCacheDir(), "maj"), "CardPro.apk");
    }

    /**
     * Ouvre une connexion HTTPS (redirections vers HTTP refusées).
     *
     * @param adresse adresse https://
     * @return connexion ouverte
     * @throws IOException en cas d'erreur
     */
    private static HttpURLConnection connecter(String adresse) throws IOException {
        if (!adresse.startsWith("https://")) throw new IOException("Adresse non sécurisée.");
        HttpURLConnection connexion = (HttpURLConnection) new URL(adresse).openConnection();
        connexion.setConnectTimeout(10000);
        connexion.setReadTimeout(30000);
        connexion.setUseCaches(false);
        if (connexion.getResponseCode() != HttpURLConnection.HTTP_OK) {
            connexion.disconnect();
            throw new IOException("Réponse inattendue du site.");
        }
        return connexion;
    }

    /**
     * Lit une petite ressource en mémoire.
     *
     * @param adresse adresse https://
     * @param max     taille maximale
     * @return contenu
     * @throws IOException en cas d'erreur ou de dépassement
     */
    private static byte[] lire(String adresse, int max) throws IOException {
        HttpURLConnection connexion = connecter(adresse);
        try (InputStream entree = connexion.getInputStream()) {
            ByteArrayOutputStream contenu = new ByteArrayOutputStream();
            byte[] tampon = new byte[1024];
            int lus;
            while ((lus = entree.read(tampon)) != -1) {
                if (contenu.size() + lus > max) throw new IOException("Réponse trop volumineuse.");
                contenu.write(tampon, 0, lus);
            }
            return contenu.toByteArray();
        } finally {
            connexion.disconnect();
        }
    }

    /**
     * Télécharge un fichier.
     *
     * @param adresse adresse https://
     * @param cible   fichier de destination
     * @throws IOException en cas d'erreur ou de dépassement
     */
    private static void telecharger(String adresse, File cible) throws IOException {
        HttpURLConnection connexion = connecter(adresse);
        try (InputStream entree = connexion.getInputStream(); OutputStream sortie = new FileOutputStream(cible)) {
            byte[] tampon = new byte[64 * 1024];
            long total = 0;
            int lus;
            while ((lus = entree.read(tampon)) != -1) {
                total += lus;
                if (total > TAILLE_MAX_APK) throw new IOException("Fichier trop volumineux.");
                sortie.write(tampon, 0, lus);
            }
        } finally {
            connexion.disconnect();
        }
    }

    /**
     * @param fichier fichier à vérifier
     * @return empreinte SHA-256 en hexadécimal
     * @throws Exception en cas d'erreur de lecture
     */
    private static String sha256(File fichier) throws Exception {
        MessageDigest calcul = MessageDigest.getInstance("SHA-256");
        try (InputStream entree = new FileInputStream(fichier)) {
            byte[] tampon = new byte[64 * 1024];
            int lus;
            while ((lus = entree.read(tampon)) != -1) calcul.update(tampon, 0, lus);
        }
        StringBuilder texte = new StringBuilder();
        for (byte octet : calcul.digest()) texte.append(String.format("%02x", octet));
        return texte.toString();
    }

    /**
     * Lance un écran du système sans planter s'il est absent.
     *
     * @param activite écran principal
     * @param intent   écran à ouvrir
     */
    private static void lancer(Activity activite, Intent intent) {
        try {
            activite.startActivity(intent);
        } catch (ActivityNotFoundException erreur) {
            // Écran indisponible sur ce téléphone.
        }
    }
}
