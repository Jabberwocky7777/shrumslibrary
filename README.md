# ShrumsLibrary

A self-hosted ebook request manager. Search via Prowlarr, download via SABnzbd, validate epubs, and deliver to Kindle by email.

Built for TrueNAS SCALE. No Calibre required.

---

## Features

- **Search** — queries Prowlarr across all your indexers, scores every result, highlights the best pick
- **Auto-grab** — optionally sends the top-scored release to SABnzbd automatically
- **Validation** — checks epub structure, detects DRM, flags encoding issues and oversized files
- **Retry pipeline** — if a release fails validation, automatically tries the next-best release
- **Encoding sanitiser** — fixes Windows-1252 curly-quote corruption in epub HTML without Calibre
- **Kindle delivery** — attaches validated epubs and emails them via SMTP with automatic retry
- **Multiple Kindle addresses** — manage several devices, choose per-send or set a default
- **Clean library** — imported files are renamed to a consistent `Author/Title/Author - Title.epub` structure
- **Auth** — local network access needs no login; login is enforced when accessed through a reverse proxy

---

## Quick start (TrueNAS SCALE)

### 1. Pull the pre-built image

The easiest path. No build step needed.

```yaml
# docker-compose.yml
version: "3.9"
services:
  shrumslibrary:
    image: ghcr.io/jabberwocky7777/shrumslibrary:latest
    container_name: shrumslibrary
    restart: unless-stopped
    ports:
      - "3737:3737"
    environment:
      - NODE_ENV=production
    volumes:
      - shrumslibrary_data:/data
      - shrumslibrary_library:/library
      - sabnzbd_complete:/downloads:ro

volumes:
  shrumslibrary_data:
  shrumslibrary_library:
  sabnzbd_complete:
    external: true
```

```bash
docker compose up -d
```

### 2. Build from source

```bash
git clone https://github.com/Jabberwocky7777/shrumslibrary.git
cd shrumslibrary
docker compose up -d --build
```

---

## Volumes

| Volume | Mount | Access | Purpose |
|---|---|---|---|
| `sabnzbd_complete` | `/downloads` | read-only | SABnzbd completed ebooks folder — must be an existing external volume |
| `shrumslibrary_library` | `/library` | read-write | Clean epub library (auto-created) |
| `shrumslibrary_data` | `/data` | read-write | SQLite database (auto-created) |

> **SABnzbd setup**: create a category named `ebooks` in SABnzbd pointing to the folder exposed as the `sabnzbd_complete` volume. ShrumsLibrary looks for downloaded epubs there.

---

## First-run setup

1. Open `http://<your-truenas-ip>:3737` — no login needed from your local network
2. **Settings → Prowlarr** — enter your Prowlarr URL and API key, click Test
3. **Settings → SABnzbd** — enter your SABnzbd URL and API key, click Test
4. **Settings → Kindle** — configure SMTP and add your Kindle email address(es)
5. **Settings → Security** — change the default password (`admin` / `shrumslibrary`) before exposing publicly

---

## Reverse proxy (Nginx Proxy Manager)

See [NGINX_SETUP.md](NGINX_SETUP.md) for full step-by-step instructions.

Once behind NPM, login is enforced for all external access. Direct LAN access (`192.168.x.x:3737`) always bypasses login.

---

## Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Build frontend
npm run build:client

# Start server
npm start

# Frontend dev server with HMR (proxies /api to localhost:3737)
cd client && npm run dev
```

The server reads `DB_PATH` from the environment; defaults to `/data/shrums.db`. For local dev:

```bash
DB_PATH=./dev.db npm start
```

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | React + Vite |
| Database | SQLite via better-sqlite3 |
| Epub handling | adm-zip (no Calibre) |
| Email | nodemailer |
| Auth | express-session + bcryptjs |
| Container | Docker (node:20-alpine) |
