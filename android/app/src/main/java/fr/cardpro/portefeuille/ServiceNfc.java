/*
 * ServiceNfc.java
 * Le téléphone se fait passer pour une puce NFC (norme NFC Forum Type 4,
 * émulation de carte « HCE ») : un autre téléphone approché lit le message
 * NDEF de NdefCarte comme sur une vraie puce, sans appli de son côté.
 * Puce en lecture seule : toute écriture est refusée.
 */
package fr.cardpro.portefeuille;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;

import java.util.Arrays;

public class ServiceNfc extends HostApduService {

    // Commande « SELECT » de l'application NDEF Tag (AID D2760000850101).
    private static final byte[] SELECTION_APPLICATION = {
        0x00, (byte) 0xA4, 0x04, 0x00, 0x07, (byte) 0xD2, 0x76, 0x00, 0x00, (byte) 0x85, 0x01, 0x01,
    };
    private static final byte[] FICHIER_CC = {(byte) 0xE1, 0x03};
    private static final byte[] FICHIER_NDEF = {(byte) 0xE1, 0x04};

    // Réponses (codes d'état ISO 7816).
    private static final byte[] OK = {(byte) 0x90, 0x00};
    private static final byte[] INTROUVABLE = {0x6A, (byte) 0x82};
    private static final byte[] INTERDIT = {0x69, (byte) 0x82};
    private static final byte[] HORS_LIMITES = {0x6B, 0x00};
    private static final byte[] INCONNUE = {0x6D, 0x00};

    /** Nombre maximal d'octets renvoyés par lecture (MLe). */
    private static final int LECTURE_MAX = 0xF0;

    private boolean applicationSelectionnee = false;
    private byte[] fichierSelectionne = null;
    private byte[] ndef = null;

    @Override
    public byte[] processCommandApdu(byte[] commande, Bundle extras) {
        if (commande == null || commande.length < 4) return INCONNUE;

        // 1. Sélection de l'application NDEF : on fige le contenu pour toute la lecture.
        if (commence(commande, SELECTION_APPLICATION)) {
            ndef = NdefCarte.lire();
            if (ndef == null) return INTROUVABLE; // Partage coupé : on ne répond rien d'utile.
            applicationSelectionnee = true;
            fichierSelectionne = null;
            return OK;
        }
        if (!applicationSelectionnee || ndef == null) return INTROUVABLE;

        // 2. Sélection d'un fichier : CC (capacités) ou NDEF (contenu).
        if (commande[0] == 0x00 && commande[1] == (byte) 0xA4 && commande[2] == 0x00 && commande.length >= 7 && commande[4] == 0x02) {
            byte[] identifiant = Arrays.copyOfRange(commande, 5, 7);
            if (Arrays.equals(identifiant, FICHIER_CC)) {
                fichierSelectionne = conteneurCapacites(ndef.length);
            } else if (Arrays.equals(identifiant, FICHIER_NDEF)) {
                fichierSelectionne = ndef;
            } else {
                return INTROUVABLE;
            }
            return OK;
        }

        // 3. Lecture d'une partie du fichier sélectionné.
        if (commande[0] == 0x00 && commande[1] == (byte) 0xB0) {
            if (fichierSelectionne == null) return INTROUVABLE;
            int position = ((commande[2] & 0xFF) << 8) | (commande[3] & 0xFF);
            int demande = commande.length > 4 ? commande[4] & 0xFF : 0;
            if (demande == 0) demande = 256;
            if (position > fichierSelectionne.length) return HORS_LIMITES;
            int longueur = Math.min(Math.min(demande, LECTURE_MAX), fichierSelectionne.length - position);
            byte[] reponse = new byte[longueur + 2];
            System.arraycopy(fichierSelectionne, position, reponse, 0, longueur);
            reponse[longueur] = (byte) 0x90;
            reponse[longueur + 1] = 0x00;
            return reponse;
        }

        // 4. Écriture : refusée (puce en lecture seule).
        if (commande[0] == 0x00 && commande[1] == (byte) 0xD6) return INTERDIT;
        return INCONNUE;
    }

    @Override
    public void onDeactivated(int raison) {
        applicationSelectionnee = false;
        fichierSelectionne = null;
        ndef = null;
    }

    /**
     * Conteneur de capacités (fichier CC) de la puce Type 4.
     *
     * @param tailleNdef taille du fichier NDEF (longueur incluse)
     * @return fichier CC de 15 octets
     */
    private static byte[] conteneurCapacites(int tailleNdef) {
        int tailleMax = Math.max(tailleNdef, 0x0100);
        return new byte[] {
            0x00, 0x0F,                                   // Taille du fichier CC
            0x20,                                         // Version 2.0
            0x00, (byte) LECTURE_MAX,                     // Lecture maximale par commande
            0x00, (byte) 0xFF,                            // Écriture maximale (inutilisée)
            0x04, 0x06,                                   // Bloc « fichier NDEF »
            FICHIER_NDEF[0], FICHIER_NDEF[1],             // Identifiant du fichier
            (byte) (tailleMax >> 8), (byte) tailleMax,    // Taille maximale
            0x00,                                         // Lecture libre
            (byte) 0xFF,                                  // Écriture interdite
        };
    }

    /**
     * Indique si une commande commence par un préfixe donné.
     *
     * @param commande commande reçue
     * @param prefixe  préfixe attendu
     * @return true si la commande commence par le préfixe
     */
    private static boolean commence(byte[] commande, byte[] prefixe) {
        if (commande.length < prefixe.length) return false;
        for (int i = 0; i < prefixe.length; i++) {
            if (commande[i] != prefixe[i]) return false;
        }
        return true;
    }
}
