// build.gradle.kts (app)
// Appli Android « DrawCard » : le portefeuille web (copié dans les assets à
// la publication) affiché dans une WebView, avec le partage NFC en plus.
// La clé de signature vient de variables d'environnement (secrets GitHub),
// jamais du code.

plugins {
    id("com.android.application")
}

android {
    namespace = "fr.drawcard.portefeuille"
    compileSdk = 35

    defaultConfig {
        applicationId = "fr.drawcard.portefeuille"
        minSdk = 26
        targetSdk = 35
        versionCode = (System.getenv("DRAWCARD_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("DRAWCARD_VERSION_NOM") ?: "dev"
    }

    signingConfigs {
        create("publication") {
            val fichier = System.getenv("DRAWCARD_KEYSTORE")
            if (fichier != null) {
                storeFile = file(fichier)
                storePassword = System.getenv("DRAWCARD_KEYSTORE_MOT_DE_PASSE")
                keyAlias = System.getenv("DRAWCARD_CLE_ALIAS")
                keyPassword = System.getenv("DRAWCARD_CLE_MOT_DE_PASSE")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("publication")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Sert les fichiers du portefeuille en HTTPS local (caméra, modules JS).
    implementation("androidx.webkit:webkit:1.12.1")
    // Partage de fichiers vers les autres applis (FileProvider).
    implementation("androidx.core:core:1.13.1")
}
