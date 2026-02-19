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

Then open `http://127.0.0.1:4173`.

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
