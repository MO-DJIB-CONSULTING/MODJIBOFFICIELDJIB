# MO-DJIB Consulting

Site modernise avec:

- page publique responsive;
- espace admin;
- blog dynamique;
- mediatheque locale pour uploader et reutiliser les images;
- page galerie publique separee avec images, videos locales et liens YouTube;
- base SQLite locale;
- documents proteges par code;
- recherche publique par nom de societe ou numero de certificat;
- pricing qui renvoie vers WhatsApp ou email.
- protections serveur: headers de securite, anti-bruteforce login/documents, journal d'activite admin;
- export JSON de la base depuis l'admin.

Depuis l'admin, l'onglet `Images` permet d'uploader des visuels, de les appliquer au logo, au hero, a la section contact ou de copier leur chemin. L'onglet `Galerie` permet de publier une image, une video locale ou un lien YouTube avec titre, description, ordre et statut.

L'onglet `Societes` permet aussi d'importer une liste en texte/CSV avec le format:

```text
Nom;Numero certificat;Statut;Secteur;Delivre le;Expire le;Notes
```

L'onglet `Securite` permet de modifier le mot de passe admin, exporter les donnees en JSON et consulter les dernieres actions.

## Lancer le site

```powershell
npm start
```

Puis ouvrir:

- site public: http://localhost:3000
- galerie: http://localhost:3000/galerie
- admin: http://localhost:3000/admin

## Identifiants admin initiaux

- Email: `admin@modjibconsulting.com`
- Mot de passe: `ChangeMoi2026!`

Les identifiants sont dans le fichier local `.env`.

Pour changer le mot de passe:

Utiliser l'onglet `Securite` dans l'espace admin. En production, gardez `SYNC_ADMIN_PASSWORD=false` apres la premiere installation pour eviter qu'un redemarrage remplace le mot de passe choisi dans l'admin.

La base se cree dans `data/mo-djibconsulting.sqlite`. Les documents uploades sont stockes dans `data/documents` et ne sont pas servis publiquement sans code.

Le projet ne depend d'aucun CDN pour fonctionner localement: les pages, scripts, styles, base SQLite et documents sont dans ce dossier.

## Deploiement AwardSpace / FTP

Le projet garde le serveur Node.js pour le local/VPS, mais inclut aussi une couche PHP compatible hebergement FTP:

```powershell
npm run build-awardspace
```

Cette commande cree `ftp-deploy/` avec les fichiers publics, `api/index.php`, `.htaccess`, une base JSON exportee et les documents proteges dans `private-data/`. Envoyer le contenu de `ftp-deploy/` dans le dossier web AwardSpace.
