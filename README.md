# Swim Assistant — Workout Editor

Reine Client-Side Web-App zum Gestalten von Swim-Assistant Workouts.
Generiert den Definition-String den man in Garmin Connect einfügt.

## Lokal testen

Einfach `index.html` im Browser öffnen. Keine Dependencies, kein Build-Schritt.

## Deployment auf GitHub Pages

### 1. Neues Repo anlegen

Auf github.com:
- **Repository name:** `swim-assistant-editor` (oder beliebig)
- **Public**
- **Add README:** ja

### 2. Dateien hochladen

Entweder per Web-UI ("Add files → Upload") oder per git:

```bash
cd /Users/lucasfucke/swim-assistant-editor
git init
git remote add origin https://github.com/<DEIN-USER>/swim-assistant-editor.git
git branch -M main
git add index.html app.js style.css README.md
git commit -m "Initial editor"
git push -u origin main
```

### 3. GitHub Pages aktivieren

Im Repo:
- **Settings → Pages**
- **Source:** Deploy from a branch
- **Branch:** `main`, Folder: `/ (root)`
- **Save**

Nach 1-2 Minuten erreichbar unter:
`https://<DEIN-USER>.github.io/swim-assistant-editor/`

### 4. URL im Garmin Connect Store verlinken

Im Dashboard → deine App → **Details bearbeiten** → **Beschreibung**:

```
Workout-Editor:
https://<DEIN-USER>.github.io/swim-assistant-editor/
```

Zusätzlich im `DefPrompt`-Text der Settings der Watch-App (`resources/strings.xml`).

## Technisches

- Pure Vanilla JS, keine Frameworks
- Kein Backend, keine Tracking
- Alle Daten bleiben im Browser des Nutzers
