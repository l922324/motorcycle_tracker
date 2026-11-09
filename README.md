# Bike Tracker

**Offline-first** motorcycle maintenance app for your phone or browser. Track multiple bikes, fuel fill-ups, service history, and part replacement intervals — with reminders for parts and road tax. No login, no server. All data stays on your device (`localStorage`).

**Live demo:** [https://l922324.github.io/motorcycle_tracker/](https://l922324.github.io/motorcycle_tracker/)

**Version:** 1.4.0

---

## Features

### Bike (Home)
- Manage **multiple bikes**; switch the active bike from the picker
- Store name, model, engine (cc), manufactured / purchase dates, chassis & engine numbers, mileage
- Singapore-friendly fields: **vehicle no.**, **OBU**, **road tax expiry**, **COE expiry**
- **Insurance** (company, policy number, period)
- **Document uploads** (PDF / images) stored with the bike; tap to view
- Add a bike manually or **import from a backup-style JSON** file
- **Backup / restore** — export or import a `.json` file to move data between devices

### Fuel
- Log fill-ups: date, litres, mileage, grade, station, price per litre, original / paid price
- Edit or delete past entries
- Analytics: avg. fuel efficiency, avg. usage, avg. monthly cost, total spent

### Servicing
- **Parts tab:** progress bars and OK / Soon / Due badges by km and/or months  
  - Add custom parts, edit name & cycle, edit last change, or mark as changed (reset)  
  - Reminder toast when a part is due soon (≥ 85% progress)
- **History tab:** service records (date, workshop, price, mileage, notes)

All screens are scoped to the **active bike**.

---

## Deploy on GitHub Pages

This repo is set up for [GitHub Pages](https://pages.github.com/).

1. Push the app files to the `main` branch (repo root should contain `index.html`).
2. On GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` / folder: `/ (root)` → Save
3. After a minute or two, open:  
   `https://YOUR_USERNAME.github.io/motorcycle_tracker/`

To update the live site later, push changes to `main`; Pages redeploys automatically.

### Add to Home Screen (iPhone)

1. Open the GitHub Pages URL in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Name it (e.g. “Bike Tracker”) and tap **Add**.

The app uses `icons/app-icon.png` as the Home Screen icon. If the icon does not update after a change, remove the old shortcut and add it again (iOS caches icons).

### Other hosts

- **Netlify Drop:** drag the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
- **Local (same Wi‑Fi):** from this folder run `python -m http.server 8080`, then open `http://YOUR_LAN_IP:8080` on your phone.

---

## Privacy & data

- Data is stored only in the browser (`localStorage`). There is no backend.
- Clearing site data for this origin deletes your records.
- Use **Backup / restore** regularly if you care about keeping history across devices or browser resets.
- After the first load (HTTPS or localhost), the service worker can keep the app usable offline.

---

## Folder structure

```
motorcycle_tracker/
  index.html       # App shell (Bike, Fuel, Servicing)
  styles.css       # Mobile-first UI
  app.js           # Logic + localStorage
  manifest.json    # PWA manifest
  sw.js            # Service worker (offline cache)
  app-meta.json    # Version / release metadata
  icons/
    app-icon.png   # Home Screen / PWA icon
  README.md
```

---

## Tips

- Keep **current mileage** up to date so part progress and reminders stay accurate.
- After replacing a part, open it and tap **Mark as changed (reset)**.
- Export a backup before switching phones or clearing browser data.
