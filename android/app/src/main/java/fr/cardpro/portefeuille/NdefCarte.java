/*
 * NdefCarte.java
 * Contenu NFC actuellement partagé : un message NDEF avec deux enregistrements,
 *  1. la fiche contact (text/vcard), lue par Android ;
 *  2. un lien qui ouvre la fiche (https://…/contact/#…), lu par iPhone.
 * Le contenu est vide tant que la personne n'a pas activé le partage.
 * Partagé entre l'écran (qui le définit) et le service NFC (qui le lit).
 */
package fr.cardpro.portefeuille;

import android.nfc.NdefMessage;
import android.nfc.NdefRecord;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

final class NdefCarte {

    /** Taille maximale de la fiche contact acceptée (caractères). */
    static final int VCARD_MAX = 8000;
    /** Taille maximale du lien accepté (caractères). */
    static final int LIEN_MAX = 6000;

    /** Fichier NDEF : longueur du message (2 octets) puis le message. Null = partage coupé. */
    private static byte[] fichierNdef = null;

    private NdefCarte() {
    }

    /**
     * Définit le contact à partager.
     *
     * @param vcard fiche contact (vCard)
     * @param lien  lien https vers la page contact, ou chaîne vide
     * @return true si le contenu est valide et prêt
     */
    static synchronized boolean definir(String vcard, String lien) {
        if (vcard == null || vcard.isEmpty() || vcard.length() > VCARD_MAX) return false;
        List<NdefRecord> enregistrements = new ArrayList<>();
        enregistrements.add(NdefRecord.createMime("text/vcard", vcard.getBytes(StandardCharsets.UTF_8)));
        if (lien != null && !lien.isEmpty()) {
            if (lien.length() > LIEN_MAX || !lien.startsWith("https://")) return false;
            enregistrements.add(NdefRecord.createUri(lien));
        }
        byte[] message = new NdefMessage(enregistrements.toArray(new NdefRecord[0])).toByteArray();
        if (message.length > 0xFFFD) return false;
        byte[] fichier = new byte[message.length + 2];
        fichier[0] = (byte) (message.length >> 8);
        fichier[1] = (byte) message.length;
        System.arraycopy(message, 0, fichier, 2, message.length);
        fichierNdef = fichier;
        return true;
    }

    /** Coupe le partage. */
    static synchronized void vider() {
        fichierNdef = null;
    }

    /**
     * @return true si un contact est en cours de partage
     */
    static synchronized boolean estActif() {
        return fichierNdef != null;
    }

    /**
     * @return copie du fichier NDEF, ou null si le partage est coupé
     */
    static synchronized byte[] lire() {
        return fichierNdef == null ? null : fichierNdef.clone();
    }
}
