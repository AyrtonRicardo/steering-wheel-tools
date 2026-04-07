# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with hot reload
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run deploy    # Build and deploy to GitHub Pages
```

No test runner or linter is configured.

## Architecture

Vue 3 SPA with hash-based routing (`#/path`), built with Vite, deployed to GitHub Pages at `/steering-wheel-tools/`.

**Routing** (`src/router/index.js`): Five routes — home, `/encoder-calculator`, `/torque-calculator`, `/button-matrix`, `/vesc-setup`.

**Layout** (`src/App.vue`): Static shell with `AppHeader` (sticky nav) → `<RouterView>` → `AppFooter`.

**Views** (`src/views/`): Each calculator is a self-contained view. All logic lives in `<script setup>` using `reactive()` for inputs and `computed()` for results — no state management library.

**Shared components** (`src/components/`):
- `StatusBadge.vue` — props: `type` (ok|warn|bad), `text`
- `CalcBreakdown.vue` — props: `steps` (array of `{formula, substitution, result}`)

**Styling** (`src/assets/style.css`): Global dark theme via CSS variables. Blue primary accent (`#60a5fa`), violet secondary (`#a78bfa`), blue-tinted dark backgrounds. Component-specific styles use `<style scoped>`. All color values must use CSS variables — never hardcode hex or rgba color values directly.

Reference data (encoder models, motor specs) is hardcoded as constants inside each view file rather than in separate data files.

## Design rules

**Show your work:** Any feature or change that involves a calculation must surface that calculation to the user in the UI. Use `CalcBreakdown.vue` for step-by-step breakdowns, inline result cards for live computed values, or annotated formula strings (e.g. `"= L(H) × 2π × BW"`). The user should never have to trust a black-box number — they should be able to see what formula produced it and verify it themselves.

**Guidance disclaimer:** Every section or widget that displays calculated values must include a visible note that the results are for guidance only and should be verified against the specific hardware and setup. Use the existing `info-box` style or a short line of muted text near the results.
