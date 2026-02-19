# Portfolio Site (Vanilla HTML/CSS/JS)

This project is a static website built with:

- HTML (`index.html`)
- CSS (`styles.css`)
- JavaScript (`main.js`)
- Tailwind CSS via CDN (for responsive utility classes)

## Run

No React or build tooling is required.

Open `index.html` directly in a browser, or serve the folder with any static server.

Example:

```bash
cd portfolio-react
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Certification Badge Quality Rule

Badge images live in `assets/certs/` and use `1x/2x/3x` files.
Never upscale badges at runtime.

- Standard badge display: `72px` (`@2x` = `144px`, `@3x` = `216px`)
- Graduate badge display: `64px` (`@2x` = `128px`, `@3x` = `192px`)
