---
name: responsive-tailwind-baseline
description: Tailwind-first workflow for preserving a 1920x1200 baseline layout while making pages responsive in newport-refactored only. Use when implementing or refactoring responsiveness there so the same composition scales up cleanly on larger screens, with viewport fixes and width/height caps.
---

# Responsive Tailwind Baseline

## Overview

Treat `1920x1200` as the design source of truth. Preserve the same page structure and scale values up on larger screens with Tailwind utilities, `clamp()`, and sensible caps.

## Scope

- Apply this skill only to files under `newport-refactored/`.
- Do not modify files outside `newport-refactored/` when following this skill.
- Prefer editing `newport-refactored/index.html`, `newport-refactored/css/*`, and related assets/scripts in that folder.

## Workflow

1. Define baseline behavior.
- Use `1920x1200` as the default desktop visual target.
- Preserve section order, grid structure, and content hierarchy on larger screens.
- Scale dimensions and spacing without redesigning the layout unless explicitly asked.

2. Verify viewport foundations.
- Ensure the page has `meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"`.
- Prevent accidental horizontal overflow at the app root with `overflow-x-clip` (or `overflow-x-hidden` if needed).
- Keep vertical flow natural; avoid forcing global fixed heights.

3. Apply width and height caps.
- Center primary wrappers with `mx-auto w-full`.
- Apply width caps to stop runaway expansion (for example `max-w-[2400px]`).
- Apply height caps only on visually bounded sections (for example hero/media areas with `max-h-[1400px]`).
- Prefer `min-h-[...]` + `max-h-[...]` over hard `h-[...]` for responsive blocks.

4. Scale proportionally with Tailwind.
- Use `clamp()` in Tailwind arbitrary values for fluid typography and spacing.
- Use fluid media and container sizing with explicit caps.
- Keep upper bounds conservative so ultra-wide screens do not overinflate UI density.
- When a baseline-locked composition is required on mobile/tablet, prefer shrink-to-fit (font, gap, padding, radius, icon sizing) before changing column structure.
- Only stack sections when explicitly requested or when non-stacked content cannot remain readable without overflow.

5. Add large-screen breakpoints only when needed.
- Keep existing small and medium breakpoints unchanged.
- Add baseline-plus breakpoints such as `hd` (`1920px`) and `qhd` (`2560px`) only for precision tuning.
- Use large breakpoints to adjust scale and caps, not structural layout.

6. Validate against target viewports.
- Validate at `1920x1200`, `2560x1440`, and `3440x1440`.
- Confirm structure parity above baseline.
- Confirm no horizontal scrollbars and no clipped core content.
- Confirm readable typography and stable whitespace rhythm.

## Quick Snippets

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

<main class="mx-auto w-full max-w-[2400px] overflow-x-clip px-[clamp(1rem,1.2vw,2rem)]">
  <!-- content -->
</main>
```

```html
<section class="min-h-[min(100vh,1200px)] max-h-[1400px]">
  <h1 class="text-[clamp(2rem,1.5rem+1vw,3.25rem)]">Title</h1>
</section>
```

## Rules

- Prefer Tailwind utilities before writing one-off CSS.
- Prefer `max-w-*`, `max-h-*`, and `clamp()` over fixed-size-only scaling.
- Avoid page-level `transform: scale(...)` except for explicit kiosk/mockup requirements.
- For baseline-lock requests, keep targeted section column structure consistent below baseline and scale internal UI elements down with `clamp()`.
- Read `references/scaling-checklist.md` when implementing or reviewing responsive changes.
