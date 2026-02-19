# Portfolio Site (Vanilla HTML/CSS/JS)

This project is a static website built with:

- HTML (`index.html`)
- CSS (`styles.css`)
- JavaScript (`main.js`)
- Tailwind CSS via CDN (for responsive utility classes)

## Run

No React or build tooling is required.

Use npm dev server:

```bash
cd AWS-Serverless-Portfolio-main/portfolio-aws
npm install
npm run dev
```

Then open the URL it prints (default: `http://127.0.0.1:4173`). If `4173` is already in use, the dev server will automatically try the next port.
If another `npm run dev` is already running for this folder, starting a new one will shut down the old one first (set `DEV_SERVER_REPLACE=0` to disable).

The dev server includes live reload: edits to `index.html`, `styles.css`, `main.js`, or assets will refresh the page automatically.
Set `LIVE_RELOAD=0` to disable.

Or serve the folder with any static server. Example:

```bash
cd AWS-Serverless-Portfolio-main/portfolio-aws
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Certification Badge Quality Rule

Badge images live in `assets/certs/` and use `1x/2x/3x` files.
Never upscale badges at runtime.

- Standard badge display: `72px` (`@2x` = `144px`, `@3x` = `216px`)
- Graduate badge display: `64px` (`@2x` = `128px`, `@3x` = `192px`)
