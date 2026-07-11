# 🔐 Password Manager — RAJAT

Modular, PIN-protected password manager built with **Python (Flask)** + vanilla JS.  
Runs on **port 7730** via Docker or directly.

---

## Features
- 🔐 4-digit PIN lock (SHA-256 hashed, server-side)
- 🔑 PIN change requires **old PIN** verification
- 📂 Category-wise password storage
- ➕ Single + Bulk entry add
- ✏️ Edit / Delete entries
- 📋 Click any cell to copy
- ⬇ **Export to Excel** — professional, category-wise, styled sheets
- 📱 Mobile responsive
- 🐳 Docker + docker-compose ready

---

## Quick Start

### Local (Python)
```bash
pip install -r requirements.txt
python app.py
```
Open: http://localhost:7730  
Default PIN: **1234**

### Docker
```bash
docker-compose up -d
```
Open: http://localhost:7730

---

## Project Structure
```
Passwords/
├── app.py                  # Flask backend + Excel export
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .gitignore
├── .dockerignore
├── data/                   # passwords.json & pin.json (gitignored)
│   └── .gitkeep
├── static/
│   ├── css/style.css       # All styles + mobile responsive
│   └── js/
│       ├── pin.js          # PIN screen, verify, change
│       ├── categories.js   # Category CRUD + tabs
│       ├── entries.js      # Entry CRUD + bulk add
│       ├── export.js       # Excel export trigger
│       └── app.js          # Bootstrap, global helpers, data layer
└── templates/
    └── index.html          # HTML shell
```

---

## Data Storage
- All data stored in `data/passwords.json` (JSON file on server)
- PIN hash stored in `data/pin.json`
- Both files are **gitignored** — never commit real passwords

## Excel Export
- One sheet per category with styled headers
- Password columns highlighted in purple monospace
- Auto-filter enabled on each sheet
- Summary sheet with entry counts
- Filename: `passwords_export_YYYYMMDD_HHMMSS.xlsx`
