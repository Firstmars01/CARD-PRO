// settings.gradle.kts
// Projet Android de Card Pro : l'appli « Card Pro » (portefeuille + NFC).

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "CardPro"
include(":app")
