/*
 * PontJavascript.java
 * Fonctions Android appelées par le portefeuille (objet JavaScript
 * « DrawCardAndroid ») : NFC, partage de fichiers, fichiers reçus.
 * Chaque paramètre venant de la page est vérifié avant usage. La WebView ne
 * peut afficher que les pages de l'appli (voir MainActivity).
 */
package fr.drawcard.portefeuille;

import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.nfc.NfcAdapter;
import android.nfc.cardemulation.CardEmulation;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

final class PontJavascript {

    private static final List<String> TYPES_CONTACT = Arrays.asList("text/x-vcard", "text/vcard");
    private static final String TYPE_SAUVEGARDE = "application/json";
    private static final int CONTENU_MAX_CONTACT = 64 * 1024;
    // Sauvegarde du portefeuille (cartes avec leurs images).
    private static final int CONTENU_MAX_SAUVEGARDE = 40 * 1024 * 1024;

    private final MainActivity activite;
    private final FichiersRecus fichiersRecus;

    /**
     * @param activite      écran principal
     * @param fichiersRecus fichiers reçus en attente
     */
    PontJavascript(MainActivity activite, FichiersRecus fichiersRecus) {
        this.activite = activite;
        this.fichiersRecus = fichiersRecus;
    }

    /**
     * @return « absent », « desactive » ou « pret »
     */
    @JavascriptInterface
    public String etatNfc() {
        NfcAdapter nfc = NfcAdapter.getDefaultAdapter(activite);
        boolean emulation = activite.getPackageManager().hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION);
        if (nfc == null || !emulation) return "absent";
        return nfc.isEnabled() ? "pret" : "desactive";
    }

    /**
     * Active le partage NFC du contact.
     *
     * @param vcard fiche contact
     * @param lien  lien https de la fiche (iPhone), ou vide
     * @return true si le partage est actif
     */
    @JavascriptInterface
    public boolean activerNfc(String vcard, String lien) {
        if (!"pret".equals(etatNfc()) || !NdefCarte.definir(vcard, lien)) return false;
        activite.runOnUiThread(() -> {
            choisirServicePrefere(true);
            activite.bloquerLectureNfc(true);
        });
        return true;
    }

    /** Coupe le partage NFC. */
    @JavascriptInterface
    public void desactiverNfc() {
        NdefCarte.vider();
        activite.runOnUiThread(() -> {
            choisirServicePrefere(false);
            activite.bloquerLectureNfc(false);
        });
    }

    /**
     * @return true si un contact est en cours de partage NFC
     */
    @JavascriptInterface
    public boolean nfcActif() {
        return NdefCarte.estActif();
    }

    /** Ouvre les réglages NFC du téléphone. */
    @JavascriptInterface
    public void ouvrirReglagesNfc() {
        activite.runOnUiThread(() -> {
            try {
                activite.startActivity(new Intent(Settings.ACTION_NFC_SETTINGS));
            } catch (ActivityNotFoundException erreur) {
                activite.startActivity(new Intent(Settings.ACTION_WIRELESS_SETTINGS));
            }
        });
    }

    /**
     * Ouvre le menu de partage avec un fichier texte (ex. fiche contact).
     *
     * @param nom     nom du fichier
     * @param type    type MIME (liste blanche)
     * @param contenu contenu texte
     */
    @JavascriptInterface
    public void partagerFichier(String nom, String type, String contenu) {
        Uri adresse = ecrireFichier(nom, type, contenu);
        if (adresse == null) return;
        Intent envoi = new Intent(Intent.ACTION_SEND)
            .setType(type)
            .putExtra(Intent.EXTRA_STREAM, adresse)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        String titre = TYPE_SAUVEGARDE.equals(type) ? "Enregistrer la sauvegarde" : "Envoyer le contact";
        activite.runOnUiThread(() -> lancer(Intent.createChooser(envoi, titre)));
    }

    /**
     * Ouvre un fichier texte avec l'appli adaptée (Contacts pour un .vcf).
     *
     * @param nom     nom du fichier
     * @param type    type MIME (liste blanche)
     * @param contenu contenu texte
     */
    @JavascriptInterface
    public void ouvrirFichier(String nom, String type, String contenu) {
        Uri adresse = ecrireFichier(nom, type, contenu);
        if (adresse == null) return;
        Intent ouverture = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(adresse, type)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        activite.runOnUiThread(() -> lancer(ouverture));
    }

    /**
     * @return fichiers reçus en attente (JSON), la liste est ensuite vidée
     */
    @JavascriptInterface
    public String fichiersEnAttente() {
        return fichiersRecus.extraireJson();
    }

    /**
     * Rend ce service prioritaire pour le NFC tant que l'écran est affiché.
     *
     * @param prefere true pour l'activer, false pour l'annuler
     */
    private void choisirServicePrefere(boolean prefere) {
        NfcAdapter nfc = NfcAdapter.getDefaultAdapter(activite);
        if (nfc == null) return;
        try {
            CardEmulation emulation = CardEmulation.getInstance(nfc);
            if (prefere) emulation.setPreferredService(activite, new ComponentName(activite, ServiceNfc.class));
            else emulation.unsetPreferredService(activite);
        } catch (RuntimeException erreur) {
            // Sans préférence, le service répond quand même (AID dédié).
        }
    }

    /**
     * Écrit un fichier texte dans le dossier partagé et renvoie son adresse.
     *
     * @param nom     nom demandé
     * @param type    type MIME
     * @param contenu contenu texte
     * @return adresse content://, ou null si les paramètres sont refusés
     */
    private Uri ecrireFichier(String nom, String type, String contenu) {
        // Seuls deux types sont acceptés : fiche contact (.vcf) et sauvegarde (.json).
        boolean contact = TYPES_CONTACT.contains(type);
        boolean sauvegarde = TYPE_SAUVEGARDE.equals(type);
        if ((!contact && !sauvegarde) || contenu == null) return null;
        if (contenu.length() > (contact ? CONTENU_MAX_CONTACT : CONTENU_MAX_SAUVEGARDE)) return null;
        String extension = contact ? ".vcf" : ".json";
        String nomSur = nom == null ? "" : nom.replaceAll("[^A-Za-z0-9._-]", "_");
        if (nomSur.length() > 80) nomSur = nomSur.substring(0, 80);
        if (!nomSur.endsWith(extension)) nomSur = (contact ? "contact" : "sauvegarde-drawcard") + extension;
        File dossier = new File(activite.getCacheDir(), "partage");
        if (!dossier.isDirectory() && !dossier.mkdirs()) return null;
        File fichier = new File(dossier, nomSur);
        try (FileOutputStream sortie = new FileOutputStream(fichier)) {
            sortie.write(contenu.getBytes(StandardCharsets.UTF_8));
        } catch (IOException erreur) {
            return null;
        }
        return FileProvider.getUriForFile(activite, activite.getPackageName() + ".fichiers", fichier);
    }

    /**
     * Lance une autre appli sans planter si aucune ne convient.
     *
     * @param intent intention à lancer
     */
    private void lancer(Intent intent) {
        try {
            activite.startActivity(intent);
        } catch (ActivityNotFoundException erreur) {
            // Aucune appli ne sait ouvrir ce fichier.
        }
    }
}
