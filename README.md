# Bike Tracker – Motorcycle maintenance app

A simple **offline-first** web app to track your motorcycle: bike details, fuel (patrol) history, servicing history, and parts with progress bars and reminders. No login, no server. Data is stored only on your device (browser local storage).

---

## Home Screen icon on iPhone

Safari uses your **Apple touch icon** for the shortcut on the Home Screen.

1. Choose a **square** image you like (PNG is best). For a sharp icon on modern iPhones, use at least **512×512** pixels (180×180 is the classic minimum; larger is fine).
2. Save it as **`motorcycle-tracker/icons/app-icon.png`** (create an `icons` folder next to `index.html` if needed).
3. Deploy or copy the updated site to your host so `icons/app-icon.png` is available at the same URL as your app (e.g. `https://yoursite.netlify.app/icons/app-icon.png`).
4. On the iPhone, **remove the old Home Screen shortcut** if you already added one (icons are cached).
5. Open the app URL in **Safari**, tap **Share** → **Add to Home Screen**. The new icon should appear.

If the icon does not update, try a private tab, or wait a short while—iOS sometimes caches the old icon.

---

## Use on your phone without running anything from your laptop

Host the app **once** on a free static host. After that, open the link on your phone anytime—no need to run a server on your computer.

### Option 1: Netlify Drop (easiest, no account needed to try)

1. On a computer, go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop the **entire `motorcycle-tracker` folder** (the one containing `index.html`, `styles.css`, `app.js`, etc.) onto the page.
3. Netlify will give you a URL like `https://random-name-123.netlify.app`. Open this URL on your phone in Safari (or any browser).
4. Optional: **Add to Home Screen** (Safari → Share → Add to Home Screen) so it works like an app and works offline after the first load.

To keep the same URL and update the app later, create a free Netlify account and claim the site.

### Option 2: GitHub Pages

1. Create a new repository on [github.com](https://github.com) (e.g. `bike-tracker`).
2. Upload the **contents** of the `motorcycle-tracker` folder (all files, not the folder itself) into the repo. You can do this by dragging files into the GitHub web interface, or by using Git.
3. In the repo: **Settings → Pages → Source**: choose “Deploy from a branch”. Branch: `main`, folder: `/ (root)`. Save.
4. After a minute, your app will be at `https://YOUR_USERNAME.github.io/bike-tracker/`. Open this URL on your phone.

### Option 3: Run a local server (same Wi‑Fi as phone)

1. **On your computer** (where this folder lives), open a terminal in the project folder and start a simple server.

   **Using Python (if installed):**
   - Python 3:  
     `python -m http.server 8080`
   - Python 2:  
     `python -m SimpleHTTPServer 8080`

   **Using Node (if you have Node/npx):**
   - `npx serve -p 8080`

2. Find your computer’s **local IP** on the same Wi‑Fi:
   - Windows: `ipconfig` → look for “IPv4 Address” (e.g. `192.168.1.100`).
   - Mac: System Settings → Wi‑Fi → your network → IP (e.g. `192.168.1.100`).

3. **On your iPhone:**
   - Connect to the **same Wi‑Fi** as the computer.
   - Open **Safari** and go to:  
     `http://YOUR_IP:8080`  
     e.g. `http://192.168.1.100:8080`
   - You should see the Bike Tracker app. No install needed.

4. **Optional – Add to Home Screen (like an app):**
   - In Safari, tap the **Share** button (square with arrow).
   - Tap **“Add to Home Screen”**.
   - Name it (e.g. “Bike Tracker”) and tap **Add**.
   - After that you can open it from the home screen. It will still need to load from the same URL when you’re on the same Wi‑Fi (or use Option 1/2 for a permanent URL).

---

## What the app does

- **Bike (Home):** Store bike info: name, model, engine (cc), manufactured/purchase date, chassis number, engine number, current mileage. Tap the card to add or edit. Your CF Moto SC150 defaults are pre-filled.
- **Fuel:** Add fill-ups: date, litres, station, price per litre, total paid. List is sorted by date (newest first).
- **Servicing:**  
  - **Parts tab:** List of parts (engine oil, oil filter, air filter, spark plug, brake pads, brake fluid, chain, tyres, coolant, battery) with recommended intervals (km and/or months). Each part has a progress bar and badge (OK / Soon / Due). Tap a part to see last changed date/mileage and next target; tap **“Mark as changed (reset)”** after you change it.  
  - **History tab:** Add service records (date, location, price, mileage, notes).  
  - A **reminder toast** appears when any part is “due soon” (progress ≥ 85%).

All data is stored only in your browser (localStorage). No account, no internet required after the app is loaded. Clearing site data will delete your records, so avoid clearing data for this origin if you want to keep them.

---

## Folder structure

```
motorcycle-tracker/
  index.html    # Single-page app (Bike, Fuel, Servicing)
  styles.css    # Mobile-first styles
  app.js        # Logic and localStorage
  manifest.json # PWA manifest (optional)
  sw.js         # Service worker for offline (optional)
  README.md     # This file
```

---

## Tips

- Update **current mileage** on the Bike screen regularly so part progress and reminders stay accurate.
- After changing a part, open it and tap **“Mark as changed (reset)”** so the progress bar and next-due date reset correctly.
