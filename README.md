# 🔐 Password Manager — by NregaBot.com

A **PIN-protected password manager** built with **Python (Flask)** + vanilla JS.  
Store, organize, and export all your credentials securely — part of the **NregaBot.com** ecosystem.

---

## Features

- 🔐 **4-digit PIN lock** — SHA-256 hashed, server-side verification
- 🔑 **PIN change** — Requires old PIN verification
- 📂 **Category-wise storage** — Organize by NREGA, Bank, Email, etc.
- 👁️ **Password visibility toggle** — One-click reveal with 30s auto-hide
- ➕ **Single + Bulk entry** — Add individual entries or batch import
- ✏️ **Edit / Delete entries** — Full CRUD support
- 📋 **Click-to-copy** — Tap any cell to instantly copy its value
- 🔄 **Drag-to-reorder columns** — Customize column layout per category
- 🔒 **Password column marking** — Mark any column as password (auto-masked)
- 🌙 **Dark mode** — System-aware with manual toggle
- 📱 **PWA enabled** — Installable on mobile devices
- ⬇️ **Excel Export** — Professional styled sheets with NregaBot.com branding
- 🐳 **Docker support** — Easy deployment with docker-compose

---

## Quick Start

### Local (Python)
```bash
pip install -r requirements.txt
python app.py
```
Open: **http://localhost:7730**  
Default admin PIN: **1234**

### Docker
```bash
docker-compose up -d
```
Open: **http://localhost:7730**

---

## Branding

This app is a part of **NregaBot.com** — a suite of tools for rural governance and productivity.

- Logo: `/static/logo.png`
- Brand name: **Password Manager** by **NregaBot.com**
- All exports include NregaBot.com branding

---

## Project Structure

```
Password Manager/
├── app.py                  # Flask backend + Excel export
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── sw.js                   # Service Worker (PWA)
├── .gitignore
├── .dockerignore
├── data/                   # users.json (gitignored)
│   └── .gitkeep
├── static/
│   ├── logo.png            # App logo
│   ├── manifest.json       # PWA manifest
│   ├── css/
│   │   └── style.css       # Complete design system
│   └── js/
│       ├── auth.js         # Login / Registration
│       ├── pin.js          # PIN verification
│       ├── profile.js      # User profile
│       ├── admin.js        # Admin panel
│       ├── categories.js   # Category CRUD
│       ├── entries.js      # Entry CRUD + Bulk
│       ├── export.js       # Excel export trigger
│       └── app.js          # Core bootstrap, theme, data layer
└── templates/
    └── index.html          # HTML shell
```

---

## Data Storage

- All data stored in `data/users.json` (JSON file on server)
- PINs hashed with SHA-256 + salt
- File is **gitignored** — never commit real passwords

## Excel Export Features

- One sheet per category with styled headers
- Password columns highlighted in purple monospace
- Auto-filter enabled on each sheet
- Summary sheet with entry counts
- **NregaBot.com branding** on every sheet
- Filename: `passwords_export_YYYYMMDD_HHMMSS.xlsx`

## PWA

- Installable on mobile devices via browser's "Add to Home Screen"
- Service worker caches static assets for offline access
- Themed with indigo accent color

---

## Default Admin Account

| Field  | Value             |
|--------|-------------------|
| Name   | Rajat             |
| Email  | rajat@admin.com   |
| PIN    | 1234              |
| Role   | Admin             |

---
