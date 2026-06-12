# ShrumsLibrary — Nginx Proxy Manager Setup

This guide explains how to expose ShrumsLibrary securely through Nginx Proxy Manager (NPM) with SSL. Once configured, external access requires login while local network access (192.168.x.x, etc.) remains login-free.

---

## Prerequisites

- ShrumsLibrary running on TrueNAS SCALE at port `3737`
- Nginx Proxy Manager installed and accessible
- A domain name pointing to your public IP (e.g. `books.yourdomain.com`)
- Ports 80 and 443 forwarded to your NPM instance

---

## Step 1 — Add a Proxy Host in NPM

1. Open Nginx Proxy Manager and go to **Hosts → Proxy Hosts → Add Proxy Host**
2. Fill in the **Details** tab:
   - **Domain Names**: `books.yourdomain.com`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: your TrueNAS IP (e.g. `192.168.1.100`) or the container hostname if NPM is on the same Docker network
   - **Forward Port**: `3737`
   - **Cache Assets**: off
   - **Block Common Exploits**: on
   - **Websockets Support**: **on** (required)

---

## Step 2 — Add Custom Nginx Config to Pass Forwarded IP

This is the critical step that activates ShrumsLibrary's public authentication mode.

1. Click the **Advanced** tab in the Proxy Host editor
2. Paste the following into the **Custom Nginx Configuration** box:

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Host $host;
```

> **Why this matters**: ShrumsLibrary detects whether a request comes through a reverse proxy by checking for the `X-Forwarded-For` header. When this header is present, authentication is enforced. Without it (direct LAN access), the app is accessible without login.

---

## Step 3 — Enable SSL

1. Click the **SSL** tab
2. Select **Request a new SSL Certificate**
3. Check **Force SSL** and **HTTP/2 Support**
4. Enter your email for Let's Encrypt notifications
5. Agree to the Let's Encrypt Terms of Service
6. Click **Save**

NPM will automatically obtain and renew your SSL certificate.

---

## Step 4 — Verify It Works

- Visit `https://books.yourdomain.com` — you should see the ShrumsLibrary login page
- Log in with your credentials (default: `admin` / `shrumslibrary` — **change this immediately**)
- Visit `http://192.168.1.100:3737` from your local network — you should be taken directly to the app without a login prompt

---

## How the Auth Logic Works

| Access Path | Header Present | Result |
|---|---|---|
| `http://192.168.1.x:3737` (direct LAN) | No `X-Forwarded-For` | **No login required** |
| `https://books.yourdomain.com` (via NPM) | `X-Forwarded-For` present | **Login required** |

ShrumsLibrary does not care about the domain name — it only looks at whether the request arrived through a proxy (header present) and whether the connecting IP is private.

---

## Security Checklist

Before going public, verify all of these:

- [ ] **Changed default password** — go to Settings → Security and change from `shrumslibrary`
- [ ] **SSL enabled** — HTTPS enforced via NPM
- [ ] **Kindle approved sender** — the `smtp_from` address in Settings → Kindle must be added to your Kindle's approved document senders list at amazon.com/myk
- [ ] **SABnzbd `ebooks` category** — create a category in SABnzbd named `ebooks` pointing to the folder that is mapped as the `sabnzbd_complete` volume
- [ ] **`sabnzbd_complete` volume** — the Docker named volume `sabnzbd_complete` must point to SABnzbd's completed ebooks folder on TrueNAS
- [ ] **`/library` volume** — map `shrumslibrary_library` to a TrueNAS dataset you want to use as your clean epub library

---

## TrueNAS SCALE Volume Mapping

In TrueNAS SCALE, when deploying via custom app (Docker Compose), the volumes map like this:

| Volume name in compose | What it should point to |
|---|---|
| `shrumslibrary_data` | A TrueNAS dataset for the SQLite database (e.g. `tank/shrumslibrary/data`) |
| `shrumslibrary_library` | A TrueNAS dataset for your epub library (e.g. `tank/ebooks/library`) |
| `sabnzbd_complete` | SABnzbd's completed downloads folder for the `ebooks` category (external volume — must already exist) |

The `sabnzbd_complete` volume is marked `external: true` in docker-compose.yml, meaning it must be created by your SABnzbd deployment — ShrumsLibrary will not create it.
