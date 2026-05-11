# Mise en ligne MO-DJIB Consulting

Ce site n'est pas un simple site statique: il contient un serveur Node.js, une base SQLite, un admin, des documents proteges et des uploads. Il faut donc un hebergement qui garde les fichiers apres redemarrage.

## Option recommandee: VPS Ubuntu + PM2 + Nginx

1. Prendre un VPS Ubuntu 22.04/24.04 avec acces SSH.
2. Faire pointer le domaine vers l'IP du VPS:
   - `A` pour `votre-domaine.com` vers l'IP du serveur.
   - `CNAME` pour `www` vers `votre-domaine.com`.
3. Installer Node.js 22 ou plus recent.
4. Copier le dossier du site sur le serveur, par exemple:

```bash
/var/www/mo-djibconsulting
```

5. Creer le fichier `.env` depuis `.env.production.example` et changer au minimum:

```bash
ADMIN_PASSWORD=UN_MOT_DE_PASSE_FORT
PUBLIC_URL=https://votre-domaine.com
```

6. Lancer:

```bash
npm install --omit=dev
npm run reset-admin
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

7. Configurer Nginx en reverse proxy:

```nginx
server {
    server_name votre-domaine.com www.votre-domaine.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

8. Activer HTTPS avec Certbot:

```bash
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

## Fichiers importants a sauvegarder

Sauvegarder regulierement:

```text
data/
images/admin-uploads/
.env
```

La base est ici par defaut:

```text
data/mo-djibconsulting.sqlite
```

Les documents proteges sont ici:

```text
data/documents/
```

Les images/videos uploades pour le site sont ici:

```text
images/admin-uploads/
```

## A eviter

Ne pas deployer ce projet sur un hebergement uniquement statique, car l'admin, la base, les documents proteges et les uploads ne fonctionneront pas.

Si vous utilisez une plateforme cloud type Render/Railway, il faut activer un disque/volume persistant et verifier que `data/` et `images/admin-uploads/` ne disparaissent pas a chaque redeploiement.

