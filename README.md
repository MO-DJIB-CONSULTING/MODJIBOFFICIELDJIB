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

Depuis l'admin, l'onglet `Images` permet d'uploader des visuels, de les appliquer au logo, au hero, a la section contact ou de copier leur chemin. L'onglet `Galerie` permet de publier une image, une video locale ou un lien YouTube avec titre, description, ordre et statut.

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

```powershell
$env:ADMIN_PASSWORD="VotreMotDePasseFort"
npm run reset-admin
npm start
```

La base se cree dans `data/mo-djibconsulting.sqlite`. Les documents uploades sont stockes dans `data/documents` et ne sont pas servis publiquement sans code.

Le projet ne depend d'aucun CDN pour fonctionner localement: les pages, scripts, styles, base SQLite et documents sont dans ce dossier.
