/*
 * MainActivity.java
 * Écran principal de l'appli Card Pro : affiche le portefeuille (fichiers
 * web inclus dans l'appli) dans une WebView, servis en HTTPS local
 * (https://appassets.androidplatform.net) pour que la caméra et les modules
 * JavaScript fonctionnent.
 * Sécurité : la WebView n'affiche que les pages de l'appli et ne charge rien
 * depuis Internet ; tout autre lien (site, téléphone, e-mail) s'ouvre dans
 * l'appli adaptée du téléphone.
 */
package fr.cardpro.portefeuille;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.List;

public class MainActivity extends Activity {

    private static final String HOTE = "appassets.androidplatform.net";
    private static final String PAGE = "https://" + HOTE + "/assets/www/portefeuille/index.html";
    private static final List<String> SCHEMAS_EXTERNES = Arrays.asList("http", "https", "tel", "mailto");
    private static final int CODE_CAMERA = 1;
    private static final int CODE_FICHIER = 2;

    private WebView vue;
    private WebViewAssetLoader chargeur;
    private FichiersRecus fichiersRecus;
    private PermissionRequest demandeCamera;
    private ValueCallback<Uri[]> rappelFichier;

    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        boolean debogage = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debogage);

        chargeur = new WebViewAssetLoader.Builder()
            .setDomain(HOTE)
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        fichiersRecus = new FichiersRecus(getContentResolver());

        vue = new WebView(this);
        WebSettings reglages = vue.getSettings();
        reglages.setJavaScriptEnabled(true);
        reglages.setDomStorageEnabled(true);
        reglages.setAllowFileAccess(false);
        reglages.setAllowContentAccess(false);
        reglages.setSupportMultipleWindows(false);
        reglages.setMediaPlaybackRequiresUserGesture(false);
        reglages.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        vue.setWebViewClient(new ClientPages());
        vue.setWebChromeClient(new ClientNavigateur());
        vue.addJavascriptInterface(new PontJavascript(this, fichiersRecus), "CardProAndroid");
        setContentView(vue);

        fichiersRecus.lireIntent(getIntent());
        vue.loadUrl(PAGE);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Fichier reçu alors que l'appli est ouverte : on prévient le portefeuille.
        if (fichiersRecus.lireIntent(intent)) {
            vue.evaluateJavascript("window.dispatchEvent(new Event('cardpro-fichiers'))", null);
        }
    }

    @Override
    protected void onStop() {
        // L'appli passe en arrière-plan : le partage NFC s'arrête.
        NdefCarte.vider();
        super.onStop();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (vue.canGoBack()) vue.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        vue.destroy();
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] resultats) {
        super.onRequestPermissionsResult(code, permissions, resultats);
        if (code != CODE_CAMERA || demandeCamera == null) return;
        if (resultats.length > 0 && resultats[0] == PackageManager.PERMISSION_GRANTED) {
            demandeCamera.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            demandeCamera.deny();
        }
        demandeCamera = null;
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int code, int resultat, Intent donnees) {
        super.onActivityResult(code, resultat, donnees);
        if (code != CODE_FICHIER || rappelFichier == null) return;
        Uri[] choisis = null;
        if (resultat == RESULT_OK && donnees != null) {
            if (donnees.getClipData() != null) {
                int nombre = donnees.getClipData().getItemCount();
                choisis = new Uri[nombre];
                for (int i = 0; i < nombre; i++) choisis[i] = donnees.getClipData().getItemAt(i).getUri();
            } else if (donnees.getData() != null) {
                choisis = new Uri[] {donnees.getData()};
            }
        }
        rappelFichier.onReceiveValue(choisis);
        rappelFichier = null;
    }

    /**
     * Indique si une adresse appartient à l'appli.
     *
     * @param adresse adresse demandée
     * @return true pour https://appassets.androidplatform.net/…
     */
    private static boolean estPageAppli(Uri adresse) {
        return "https".equals(adresse.getScheme()) && HOTE.equals(adresse.getHost());
    }

    /**
     * Pages de l'appli servies depuis les assets ; liens externes ouverts ailleurs.
     */
    private final class ClientPages extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView vueWeb, WebResourceRequest requete) {
            // Les pages n'accèdent jamais à Internet : seuls les fichiers de l'appli sont servis.
            if (estPageAppli(requete.getUrl())) return chargeur.shouldInterceptRequest(requete.getUrl());
            return new WebResourceResponse("text/plain", "utf-8", 403, "Interdit", null, new ByteArrayInputStream(new byte[0]));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView vueWeb, WebResourceRequest requete) {
            Uri adresse = requete.getUrl();
            if (estPageAppli(adresse)) return false;
            if (SCHEMAS_EXTERNES.contains(adresse.getScheme())) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, adresse));
                } catch (ActivityNotFoundException erreur) {
                    // Aucune appli pour ce lien.
                }
            }
            return true;
        }
    }

    /**
     * Caméra (scanner) et choix de fichiers (import), réservés aux pages de l'appli.
     */
    private final class ClientNavigateur extends WebChromeClient {
        @Override
        public void onPermissionRequest(PermissionRequest demande) {
            runOnUiThread(() -> {
                boolean camera = Arrays.asList(demande.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                if (!camera || !estPageAppli(demande.getOrigin())) {
                    demande.deny();
                } else if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    demande.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                } else {
                    demandeCamera = demande;
                    requestPermissions(new String[] {Manifest.permission.CAMERA}, CODE_CAMERA);
                }
            });
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean onShowFileChooser(WebView vueWeb, ValueCallback<Uri[]> rappel, FileChooserParams parametres) {
            if (rappelFichier != null) rappelFichier.onReceiveValue(null);
            rappelFichier = rappel;
            Intent choix = new Intent(Intent.ACTION_GET_CONTENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("*/*")
                .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, parametres.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
            try {
                startActivityForResult(Intent.createChooser(choix, "Choisir une carte"), CODE_FICHIER);
            } catch (ActivityNotFoundException erreur) {
                rappelFichier = null;
                return false;
            }
            return true;
        }
    }
}
