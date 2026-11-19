# Dockerfile
# Image de Card Pro : serveur Node.js sans dépendance npm (SQLite est
# intégré à Node). Exécuté sans les droits root.

FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    CHEMIN_BASE=/donnees/cardpro.sqlite

WORKDIR /app

# Uniquement les fichiers nécessaires (voir .dockerignore).
COPY --chown=node:node package.json index.html manifest.webmanifest sw.js ./
COPY --chown=node:node assets ./assets
COPY --chown=node:node src ./src
COPY --chown=node:node portefeuille ./portefeuille
COPY --chown=node:node serveur ./serveur

# Dossier de la base de données (monté en volume).
RUN mkdir -p /donnees && chown node:node /donnees

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O /dev/null http://127.0.0.1:3000/api/sante || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "serveur/Serveur.js"]
