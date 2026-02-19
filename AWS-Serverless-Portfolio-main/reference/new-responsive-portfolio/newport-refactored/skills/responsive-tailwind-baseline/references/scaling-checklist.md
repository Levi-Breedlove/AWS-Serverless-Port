# Scaling Checklist

Use this reference while implementing or reviewing baseline-first responsive changes.

## Scope

- Apply this checklist only to `newport-refactored/` files.

## Baseline Math

- Treat baseline width as `1920`.
- Treat baseline height as `1200`.
- Derive width factor as `100vw / 1920`.
- Derive height factor as `100vh / 1200`.
- Use bounded scaling: `clamp(min, fluid, max)`.

## Tailwind Recipes

Use these class patterns as templates and adjust values per component.

```txt
Wrapper cap:      mx-auto w-full max-w-[2400px]
Fluid padding:    px-[clamp(1rem,1.2vw,2rem)]
Fluid gap:        gap-[clamp(0.75rem,0.8vw,1.5rem)]
Fluid heading:    text-[clamp(2rem,1.5rem+1vw,3.25rem)]
Fluid body text:  text-[clamp(1rem,0.92rem+0.22vw,1.25rem)]
Media width cap:  w-[min(92vw,2200px)]
Hero height cap:  min-h-[min(100vh,1200px)] max-h-[1400px]
Non-stack fit:    grid-cols-[repeat(3,minmax(0,1fr))] min-w-0 + clamp() on gap/padding/type
```

## Breakpoint Guidance

- Keep standard breakpoints intact.
- Add large breakpoints only when necessary for fine tuning.
- Example for Tailwind config extension:

```js
// Tailwind v3-style example
theme: {
  extend: {
    screens: {
      hd: "1920px",
      qhd: "2560px",
      uw: "3440px",
    },
  },
}
```

## Viewport and Root Guardrails

- Ensure viewport tag uses `width=device-width`, `initial-scale=1`, and `viewport-fit=cover`.
- Guard the app root with `overflow-x-clip` or `overflow-x-hidden`.
- Avoid global fixed height wrappers that clip long content.

## QA Pass Before Finalizing

- Check baseline at `1920x1200`.
- Check upscale behavior at `2560x1440`.
- Check ultra-wide behavior at `3440x1440`.
- Confirm structural parity with baseline.
- If baseline-lock is requested, confirm targeted sections keep their baseline column count on tablet/mobile without horizontal overflow.
- Confirm no horizontal overflow.
- Confirm caps prevent oversized text/cards.
