/*
 * FichiersRecus.java
 * Fichiers reçus d'autres applis (« Ouvrir avec » / « Partager → DrawCard »),
 * en attente d'import par le portefeuille. Leur contenu sera entièrement
 * revalidé par le portefeuille : ici, seules la taille et le nombre sont limités.
 */
package fr.drawcard.portefeuille;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

final class FichiersRecus {

    private static final int TAILLE_MAX = 20 * 1024 * 1024;
    private static final int NOMBRE_MAX = 10;

    private final ContentResolver resolveur;
    private final List<JSONObject> enAttente = new ArrayList<>();

    /**
     * @param resolveur accès au contenu des autres applis
     */
    FichiersRecus(ContentResolver resolveur) {
        this.resolveur = resolveur;
    }

    /**
     * Lit les fichiers d'un Intent reçu.
     *
     * @param intent intent d'ouverture ou de partage
     * @return true si au moins un fichier a été ajouté
     */
    @SuppressWarnings("deprecation")
    synchronized boolean lireIntent(Intent intent) {
        if (intent == null) return false;
        List<Uri> adresses = new ArrayList<>();
        if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            adresses.add(intent.getData());
        } else if (Intent.ACTION_SEND.equals(intent.getAction())) {
            Uri flux = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (flux != null) adresses.add(flux);
        }
        boolean ajoute = false;
        for (Uri adresse : adresses) {
            if (enAttente.size() >= NOMBRE_MAX || !"content".equals(adresse.getScheme())) continue;
            JSONObject fichier = lireFichier(adresse);
            if (fichier != null) {
                enAttente.add(fichier);
                ajoute = true;
            }
        }
        return ajoute;
    }

    /**
     * Renvoie les fichiers en attente (JSON) et vide la liste.
     *
     * @return tableau JSON [{nom, type, base64}]
     */
    synchronized String extraireJson() {
        JSONArray tableau = new JSONArray();
        for (JSONObject fichier : enAttente) tableau.put(fichier);
        enAttente.clear();
        return tableau.toString();
    }

    /**
     * Lit un fichier partagé.
     *
     * @param adresse adresse content://
     * @return objet {nom, type, base64}, ou null si illisible ou trop gros
     */
    private JSONObject lireFichier(Uri adresse) {
        try (InputStream entree = resolveur.openInputStream(adresse)) {
            if (entree == null) return null;
            ByteArrayOutputStream contenu = new ByteArrayOutputStream();
            byte[] tampon = new byte[64 * 1024];
            int lus;
            while ((lus = entree.read(tampon)) != -1) {
                if (contenu.size() + lus > TAILLE_MAX) return null;
                contenu.write(tampon, 0, lus);
            }
            JSONObject fichier = new JSONObject();
            fichier.put("nom", nomFichier(adresse));
            String type = resolveur.getType(adresse);
            fichier.put("type", type == null ? "" : type);
            fichier.put("base64", Base64.encodeToString(contenu.toByteArray(), Base64.NO_WRAP));
            return fichier;
        } catch (IOException | SecurityException | JSONException erreur) {
            return null;
        }
    }

    /**
     * Nom affiché du fichier.
     *
     * @param adresse adresse content://
     * @return nom, ou « fichier »
     */
    private String nomFichier(Uri adresse) {
        try (Cursor curseur = resolveur.query(adresse, new String[] {OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (curseur != null && curseur.moveToFirst()) {
                String nom = curseur.getString(0);
                if (nom != null) return nom.length() > 100 ? nom.substring(0, 100) : nom;
            }
        } catch (RuntimeException erreur) {
            // Nom indisponible : on garde le nom par défaut.
        }
        return "fichier";
    }
}
