# TresCerditos — Audit, Redesign & Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the accumulated bugs, remove the "generated-by-AI" visual tells, cut page weight by ~90%, and give the site a coherent design system so it reads as professional craft work.

**Architecture:** Astro 6 static site, zero client framework. All styling flows from a single Tailwind 4 `@theme` token layer in `src/styles/global.css`. Motion moves from hand-rolled scroll listeners to GSAP + ScrollTrigger with a `prefers-reduced-motion` guard. All raster media goes through `astro:assets` so Astro emits responsive AVIF/WebP.

**Tech Stack:** Astro 6.1.2, Tailwind CSS 4.2.1, TypeScript 6, GSAP 3 (to be added), `@astrojs/sitemap` (to be added), `sharp` (Astro built-in image service).

---

## Global Constraints

- **Package manager: pnpm only.** `package-lock.json` must be deleted. The repo currently has both lockfiles, which is why `node_modules/.pnpm` holds `astro@6.0.6` twice *and* `astro@6.1.2` — that version skew is the cause of the recorded build failure (`build_error.txt`: `The requested module '@astrojs/internal-helpers/path' does not provide an export named 'collapseDuplicateLeadingSlashes'`).
- **No test suite exists and none is being added.** This is a static marketing page; unit tests would be theater. Every task's verification is a real command: `pnpm astro check`, `pnpm build`, or a stated manual browser check. Do not fake a green test run.
- **Language of artifacts:** all code, comments, identifiers and commit messages in English. All user-facing copy stays in Spanish (the site's audience is Cali, Colombia).
- **Conventional commits.** No AI attribution / no `Co-Authored-By` lines.
- **Commit after every task.** Each task below leaves the site in a working, buildable state.
- **Never introduce a `!important`.** Removing them is a goal of this plan; adding one is a regression.
- **Brand color is a token, never a literal.** After Task 4, a raw `#dc2626`, `#fb2c36`, `rgba(239,68,68,…)` or `red-500/600/700` anywhere in `src/` is a defect.
- **Asymmetry is a desktop affordance, never a mobile one.** Every asymmetric span, negative margin and vertical offset introduced in Phase 7 must be scoped to a `md:` or `lg:` breakpoint. On narrow viewports every section collapses to a single readable column. An asymmetric layout that produces horizontal scroll at 375px is a defect, not a design.

## Skills to invoke, per phase

| Phase | Skill | When |
|---|---|---|
| 2 (Design system) | `tailwind-4-docs` | Before writing the `@theme` block — Tailwind 4 token syntax differs sharply from v3 `tailwind.config.js`. |
| 5 (Motion) | `gsap-core` | Before installing/using GSAP. |
| 7 (Visual redesign) | `frontend-design:frontend-design` | Before touching any component's visual layer, and again before the layout-asymmetry tasks (20–23). |
| 8 (Audit) | `web-design-guidelines` | Run against every file in `src/` as the final gate. |

> **Note:** `/ui-ux-pro-max` is **not installed** in this environment — it does not appear in the available-skills list. Do not attempt to invoke it. `frontend-design:frontend-design` + `web-design-guidelines` cover the same ground here.

---

## Current-State Audit (findings this plan resolves)

Recorded so the implementer knows *why* each task exists.

### Blocking / correctness

| # | Location | Problem |
|---|---|---|
| B1 | repo root | `package-lock.json` **and** `pnpm-lock.yaml` both committed → three Astro copies in `node_modules` → build crash. |
| B2 | `src/components/Navbar.astro:19,28` | Desktop links are `hidden lg:flex`; the hamburger is `md:hidden`. Between **768px and 1023px there is no navigation at all** — not a link, not a button. |
| B3 | `src/components/Gallery.astro:142-155` | `#main-stage` `<img>` is only rendered when `allMedia[0].type === "img"`. If media ordering ever puts a video first, `mainImg` is `null` and **every image slide silently fails**. |
| B4 | `src/components/Gallery.astro:326` | `bgBlur` reads `document.getElementById("bg-blur")` — that element does not exist in the markup. Dead branch executed on every slide change. |
| B5 | `src/components/Gallery.astro:213` vs `:428,443` | Progress bar CSS says `duration-[4000ms]`, JS says `6000ms`. The bar finishes 2s before the slide advances. |
| B6 | `src/components/Location.astro:3-6` | `exteriorPhotos` is declared with **Unsplash stock URLs** and never used. Placeholder debris. |
| B7 | `src/components/Location.astro:15` | `italic italic` duplicated, and `dark:text-black` puts black text on a dark background. |
| B8 | `src/layouts/Layout.astro:9` | `<meta name="viewport" content="width=device-width">` is missing `initial-scale=1`. |
| B9 | `src/layouts/Layout.astro:2` | Leftover comment `// Analytics removed temporarily to debug build`. |
| B10 | repo root, tracked in git | `temp_images/` (22 MB, a byte-duplicate of `src/assets/images/`), `build_error.txt`, `build_log.txt`, `build_out.txt`, `debug_glob.mjs`, `test_paths.mjs`. |
| B11 | `src/components/Gallery.astro:13-21` | Build-time `fs.readdirSync(path.resolve("./public/images"))` depends on the process CWD. Works with `astro build` from root; breaks under any other invocation, and the `catch` swallows it into a silently empty gallery. |

### Performance

| # | Problem | Impact |
|---|---|---|
| P1 | **`import { Image } from "astro:assets"` is imported in `Hero.astro`, `Products.astro`, `Navbar.astro` — and never used.** Every one uses a raw `<img src={x.src}>`, which hands the browser the **original, unoptimized file**. | This is the single biggest problem on the site. |
| P2 | `src/assets/images/` is **27 MB**; 15 of the files are 1–1.8 MB PNGs. `imagen-01.png` (1.15 MB PNG) is the LCP hero image. | LCP on 4G ≈ several seconds. |
| P3 | Gallery renders **33 thumbnails + 7 videos** in one section. The 7 videos in `public/images/` total **21 MB** and each `<video>` thumb carries `preload="metadata"`. | 40 network requests before the section is even scrolled to. |
| P4 | Three separate unthrottled `window.addEventListener("scroll", …)` handlers: `Layout.astro:136`, `Navbar.astro:121`, `ContactFab.astro:102`. Two call `getBoundingClientRect()` inside, and `Layout`'s loops over every `.reveal` node. | Forced synchronous layout on every scroll frame → visible jank on mid-range Android. |
| P5 | No `@astrojs/sitemap`; `public/sitemap.xml` is hand-maintained and will drift. | SEO rot. |
| P6 | `Gallery.astro` ships ~210 lines of inline JS to every visitor with no code-splitting or deferral. | Blocks interactivity. |

### "Looks AI-generated" tells

| # | Location | Tell |
|---|---|---|
| A1 | `src/pages/index.astro:15-68` | A global `<style>` block that force-centers **every** `h1–h6, p, span, b, strong` with `text-align: center !important; display: block !important; width: 100% !important`, then adds a second block of exceptions to un-break the buttons it just broke, then a third to un-break the hero. This is the most recognizable "an AI patched a symptom" signature in the codebase. It also fights `Hero.astro`'s deliberately left-aligned layout. |
| A2 | everywhere | Every single heading is `font-black uppercase italic`. Every single card is `rounded-[2.5rem]` or `rounded-[3rem]`. Uniform extremity reads as a template, not a decision. |
| A3 | 40+ occurrences | `dark:` variants throughout — but nothing ever adds a `.dark` class, there is no theme toggle, and `Layout.astro:92` hardcodes `background-color: #ffffff`. Dead code pretending to be a feature. |
| A4 | across files | Six different reds: `red-500`, `red-600`, `red-700`, `#dc2626`, `#fb2c36`, `rgba(239,68,68,0.4)`. No token layer — `global.css` is literally one line. |
| A5 | `Mission.astro:12` | `md:rotate-2 hover:rotate-0` — the stock "playful tilted card". |
| A6 | Spanish comments in code | `// 1. CENTRADO EXCLUSIVO DE TEXTOS`, `// 2. BLOQUEAR SCROLL`, numbered narration comments. Mixed-language codebase. |
| A7 | `index.astro`, `Products.astro:49`, `Location.astro:20`, `Footer.astro` | **Total layout symmetry.** Two identical `max-w-7xl mx-auto space-y-32` wrappers, six equal cards in `lg:grid-cols-3`, a 50/50 `lg:grid-cols-2`, three equal footer columns, and the same gap between every section. Nothing is emphasized because everything has the same weight — the default output of "make a landing page". `Mission.astro`'s 7/5 split is the one section that escapes it, and is the model the rest should follow. |
| A8 | `Footer.astro:12-15` | Three nested layers of centering — `flex flex-col items-center` → `w-full flex justify-center` → `w-fit mx-auto` — plus per-item `text-left` to undo them. Same defect class as A1: corrections stacked on a wrong default instead of fixing the default. |

### Accessibility

| # | Problem |
|---|---|
| X1 | No skip-to-content link. |
| X2 | `#menu-btn` never sets `aria-expanded` / `aria-controls`; `#mobile-menu` has no `aria-hidden` management. |
| X3 | Gallery has zero keyboard support — no arrow keys, no focus ring on thumbs (`outline-none` at `Gallery.astro:230` with no `focus-visible` replacement). |
| X4 | `.reveal { opacity: 0 }` — if JS fails or is slow, **the entire page below the hero is invisible**. |
| X5 | An autoplaying 6-second carousel with no `prefers-reduced-motion` respect. |
| X6 | `outline-none` used in `ContactFab.astro:6,18` and `Gallery.astro:230` with nothing put back. |
| X7 | Body copy at `text-zinc-500` on white is ~4.0:1 — below AA for small text. |

---

## File Structure

**Created:**
- `src/styles/global.css` — rewritten: `@theme` token layer + base element styles (currently one `@import` line)
- `src/lib/media.ts` — typed gallery media manifest, replacing the `fs.readdirSync` call
- `src/scripts/motion.ts` — single GSAP entry point, replaces three scroll listeners
- `public/images/posters/video-*.webp` — video poster frames

**Modified:** every file in `src/components/`, `src/layouts/Layout.astro`, `src/pages/index.astro`, `astro.config.mjs`, `package.json`, `.gitignore`

**Deleted:** `temp_images/`, `build_error.txt`, `build_log.txt`, `build_out.txt`, `debug_glob.mjs`, `test_paths.mjs`, `package-lock.json`, `public/sitemap.xml`

---

# PHASE 1 — Unblock the build & clean the repo

### Task 1: Remove tracked build debris

**Files:**
- Delete: `temp_images/` (22 MB), `build_error.txt`, `build_log.txt`, `build_out.txt`, `debug_glob.mjs`, `test_paths.mjs`
- Modify: `.gitignore`

`temp_images/` is a byte-for-byte duplicate of `src/assets/images/`. Confirm before deleting — do not skip this check.

- [ ] **Step 1: Confirm `temp_images/` is a true duplicate**
  ```bash
  diff -rq temp_images src/assets/images
  ```
  Expected: only "Only in src/assets/images" lines (src has more files). If any file differs in *content*, stop and report — do not delete.

- [ ] **Step 2: Remove from git and disk**
  ```bash
  git rm -r --cached temp_images
  rm -rf temp_images
  git rm --cached build_error.txt build_log.txt build_out.txt test_paths.mjs 2>/dev/null
  rm -f build_error.txt build_log.txt build_out.txt debug_glob.mjs test_paths.mjs
  ```

- [ ] **Step 3: Append to `.gitignore`**
  ```gitignore
  # scratch / debug artifacts
  build_*.txt
  temp_images/
  debug_*.mjs
  test_*.mjs
  ```

- [ ] **Step 4: Verify nothing needed was removed**
  ```bash
  git status --short
  ```
  Expected: only deletions of the files listed above, plus the `.gitignore` modification.

- [ ] **Step 5: Commit**
  ```bash
  git add -A
  git commit -m "chore: remove tracked build debris and duplicate image directory"
  ```

---

### Task 2: Settle on pnpm and repair the dependency tree

**Files:**
- Delete: `package-lock.json`
- Modify: `package.json`

The mixed lockfiles produced three Astro installs. This is the recorded build failure.

- [ ] **Step 1: Reproduce the failure first**
  ```bash
  pnpm build
  ```
  Record the actual output. If it now succeeds, note that in the commit body and continue anyway — the duplicate installs are still a latent hazard.

- [ ] **Step 2: Remove the npm lockfile and reinstall clean**
  ```bash
  rm -f package-lock.json
  rm -rf node_modules
  pnpm install
  ```

- [ ] **Step 3: Verify exactly one Astro version resolves**
  ```bash
  pnpm ls astro --depth 0
  ls node_modules/.pnpm | grep '^astro@'
  ```
  Expected: a single `astro@6.1.2` entry. If more than one remains, run `pnpm dedupe` and re-check.

- [ ] **Step 4: Add verification scripts to `package.json`**
  ```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "astro": "astro"
  }
  ```
  Also move `@astrojs/check` and `typescript` from `dependencies` to `devDependencies` — they are build-time only:
  ```bash
  pnpm remove @astrojs/check typescript
  pnpm add -D @astrojs/check typescript
  ```

- [ ] **Step 5: Verify build and typecheck**
  ```bash
  pnpm check && pnpm build
  ```
  Expected: both exit 0. `astro check` will report errors from the `as any` casts in `Products.astro:55` and `Gallery.astro:28,45-46,146,232,257` — record the count; Task 12 removes them.

- [ ] **Step 6: Commit**
  ```bash
  git add -A
  git commit -m "fix: standardize on pnpm and resolve duplicate astro installs"
  ```

---

# PHASE 2 — Design system foundation

> **Invoke `tailwind-4-docs` before this phase.** Tailwind 4 configures theme in CSS via `@theme`, not in a JS config file. Confirm the exact directive syntax against the docs rather than assuming v3 habits.

### Task 3: Decide and remove the phantom dark mode

**Files:**
- Modify: all files in `src/components/`, `src/layouts/Layout.astro`

**Decision (already made — do not re-litigate):** *remove* the `dark:` variants. There is no toggle, no `.dark` class is ever applied, no `prefers-color-scheme` handling, and `Layout.astro` hardcodes a white background. This is ~40 dead utility classes. A dark mode that was never wired up is worse than no dark mode: it is a maintenance tax on a lie. If dark mode is genuinely wanted later, it should be built deliberately on top of the Task 4 token layer, which is exactly what makes it cheap to add.

- [ ] **Step 1: Enumerate every occurrence**
  ```bash
  rg -n 'dark:' src/
  ```

- [ ] **Step 2: Remove each `dark:*` utility**
  Delete the `dark:` class only — keep its light-mode sibling. Also remove the two `:global(.dark)` CSS rules at `Gallery.astro:286-289` and `Gallery.astro:301-303`.

  Example, `Navbar.astro:5`:
  ```diff
  - <nav id="main-nav" class="fixed top-0 w-full z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-transform duration-300">
  + <nav id="main-nav" class="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-200 transition-transform duration-300">
  ```

- [ ] **Step 3: Verify none remain**
  ```bash
  rg -n 'dark:|\.dark' src/
  ```
  Expected: no matches.

- [ ] **Step 4: Verify build**
  ```bash
  pnpm build
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add -A
  git commit -m "refactor: remove unused dark mode variants"
  ```

---

### Task 4: Build the token layer in `global.css`

**Files:**
- Modify: `src/styles/global.css` (currently one line: `@import "tailwindcss";`)

**Produces:** the tokens `--color-brand-*`, `--color-ink-*`, `--color-surface-*`, `--radius-*`, `--font-display`, `--font-body`, `--ease-brand`. Every later task consumes these by name.

- [ ] **Step 1: Write the token layer**
  ```css
  @import "tailwindcss";

  @theme {
    /* Brand — one red, three roles. Replaces the six ad-hoc reds. */
    --color-brand-500: oklch(0.637 0.237 25.331);
    --color-brand-600: oklch(0.577 0.245 27.325);
    --color-brand-700: oklch(0.505 0.213 27.518);

    /* Ink — text. Warmer than zinc; reads as food, not SaaS. */
    --color-ink-900: oklch(0.216 0.006 56.043);
    --color-ink-700: oklch(0.374 0.010 67.558);
    --color-ink-500: oklch(0.553 0.013 58.071);
    --color-ink-300: oklch(0.869 0.005 56.366);

    /* Surface */
    --color-surface-0: oklch(1 0 0);
    --color-surface-50: oklch(0.985 0.001 106.423);
    --color-surface-950: oklch(0.147 0.004 49.25);

    /* Radius — a scale, not one 3rem value used everywhere. */
    --radius-card: 1.25rem;
    --radius-panel: 2rem;
    --radius-pill: 9999px;

    /* Type */
    --font-display: "Bricolage Grotesque Variable", system-ui, sans-serif;
    --font-body: "Inter Variable", system-ui, sans-serif;

    --ease-brand: cubic-bezier(0.22, 1, 0.36, 1);
  }

  @layer base {
    html {
      scroll-behavior: smooth;
      -webkit-text-size-adjust: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
    }

    body {
      font-family: var(--font-body);
      color: var(--color-ink-700);
      background-color: var(--color-surface-0);
      text-wrap: pretty;
    }

    h1, h2, h3, h4 {
      font-family: var(--font-display);
      color: var(--color-ink-900);
      text-wrap: balance;
    }

    :focus-visible {
      outline: 3px solid var(--color-brand-600);
      outline-offset: 3px;
      border-radius: 4px;
    }
  }

  @layer utilities {
    .scrollbar-brand::-webkit-scrollbar { height: 6px; width: 8px; }
    .scrollbar-brand::-webkit-scrollbar-track { background: transparent; }
    .scrollbar-brand::-webkit-scrollbar-thumb {
      background-color: var(--color-brand-600);
      border-radius: var(--radius-pill);
    }
  }
  ```

- [ ] **Step 2: Install the two fonts as self-hosted packages**
  ```bash
  pnpm add -D @fontsource-variable/bricolage-grotesque @fontsource-variable/inter
  ```
  Import both at the top of `src/styles/global.css`, above `@import "tailwindcss";`. Self-hosting avoids a render-blocking third-party connection to Google Fonts.

- [ ] **Step 3: Verify tokens compile into utilities**
  ```bash
  pnpm build
  rg -c 'brand-600' dist/_astro/*.css
  ```
  Expected: the class is emitted. If Tailwind reports an unknown `@theme` directive, re-check the `tailwind-4-docs` skill — the syntax is version-sensitive.

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "feat: add tailwind 4 theme token layer and self-hosted fonts"
  ```

---

### Task 5: Delete the `!important` override block

**Files:**
- Modify: `src/pages/index.astro` (remove lines 15-68 entirely)

This is finding A1 — the single loudest "generated" tell in the codebase. Its four rules exist only to fix each other's damage.

- [ ] **Step 1: Delete the entire `<style is:global>` block**
  `src/pages/index.astro` should reduce to imports, the `<Layout>` wrapper, and the component tree. Nothing else.

- [ ] **Step 2: Run the site and record what visibly breaks**
  ```bash
  pnpm dev
  ```
  Open `http://localhost:4321`. Expect: several headings that were force-centered now sit left. **This is the correct outcome** — those elements were never designed to be centered; they were being overridden. Write down each one.

- [ ] **Step 3: Restore intentional centering with real utilities, per component**
  For each item from Step 2, add `text-center` (or `text-center md:text-left`) to that specific element in its own component file. Section headings that should be centered get `text-center` on the heading. `Hero.astro` gets nothing — it is left-aligned by design and the global rule was actively fighting it.

- [ ] **Step 4: Verify no `!important` survives**
  ```bash
  rg -n '!important' src/
  ```
  Expected: no matches.

- [ ] **Step 5: Verify at 375px, 768px, 1024px, 1440px**
  Manual browser check at each width. No text overflow, no element pushed off-screen. The `#inicio h1` font-size override at old line 49 was compensating for a hero heading that was too large on mobile — confirm the responsive `text-4xl sm:text-6xl md:text-8xl` scale in `Hero.astro:28` actually fits at 375px, and adjust that scale directly if not.

- [ ] **Step 6: Commit**
  ```bash
  git add -A
  git commit -m "refactor: replace global !important overrides with per-component alignment"
  ```

---

# PHASE 3 — Correctness

### Task 6: Fix the 768–1023px navigation dead zone

**Files:**
- Modify: `src/components/Navbar.astro:19,28`

Finding B2. Desktop links are `hidden lg:flex`, the burger is `md:hidden`. At tablet widths the user has no way to navigate.

- [ ] **Step 1: Align the two breakpoints**
  ```diff
  - <div class="hidden lg:flex items-center gap-10 …">
  + <div class="hidden md:flex items-center gap-4 lg:gap-10 …">
  ```
  The reduced `gap-4` at `md` prevents the six links from overflowing at 768px; `lg:gap-10` restores the original spacing on wide screens.

- [ ] **Step 2: Verify at exactly 768px, 900px, 1023px, 1024px**
  Manual browser check. At every width either the burger or the full link row is visible — never neither, never both.

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/Navbar.astro
  git commit -m "fix: restore navigation between md and lg breakpoints"
  ```

---

### Task 7: Fix the Gallery correctness bugs

**Files:**
- Modify: `src/components/Gallery.astro`

Findings B3, B4, B5.

- [ ] **Step 1: Always render `#main-stage` (B3)**
  Remove the `allMedia[0].type === "img"` condition around the `<img>` at lines 142-155. Render it unconditionally, starting hidden when the first item is a video:
  ```astro
  <img
    id="main-stage"
    src={allMedia[0]?.type === "img" ? allMedia[0].src.src : ""}
    alt=""
    draggable="false"
    class:list={[
      "relative w-full h-full object-contain transition-opacity duration-500 z-10 select-none",
      allMedia[0]?.type === "video" && "hidden",
    ]}
    loading="eager"
    decoding="sync"
    fetchpriority="high"
  />
  ```
  Note `alt=""` — the stage image is decorative *duplication* of the thumbnail the user just activated; the accessible name is announced by Task 15's live region instead. A per-slide `alt` that changes under the user is noise.

- [ ] **Step 2: Remove the dead `bgBlur` code (B4)**
  Delete the `const bgBlur = …` declaration at line 326 and both `if (bgBlur)` branches at lines 385 and 392-395.

- [ ] **Step 3: Unify the slide duration (B5)**
  Introduce one constant and use it in all three places:
  ```ts
  const SLIDE_DURATION_MS = 6000;
  ```
  Use it for `setInterval` (line 443), for the progress-bar transition string (line 428), and delete the stale `duration-[4000ms]` from the element's class at line 213 — the JS sets the transition inline anyway.

- [ ] **Step 4: Verify**
  ```bash
  pnpm dev
  ```
  Watch one full cycle: the progress bar must reach 100% exactly as the slide changes. Click a video thumbnail, then an image thumbnail — the image must appear.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/Gallery.astro
  git commit -m "fix: gallery stage rendering, dead blur reference, and slide timing mismatch"
  ```

---

### Task 8: Fix Location, Layout and viewport defects

**Files:**
- Modify: `src/components/Location.astro`, `src/layouts/Layout.astro`

Findings B6, B7, B8, B9.

- [ ] **Step 1: Delete the unused Unsplash placeholders (B6)**
  Remove `exteriorPhotos` (`Location.astro:2-6`) entirely. It is never referenced. Stock-photo URLs sitting in a local business's source is exactly the tell we are removing.

- [ ] **Step 2: Fix the heading (B7)**
  ```diff
  - <h2 class="text-4xl md:text-6xl font-black uppercase italic italic text-zinc-900 dark:text-black">
  + <h2 class="text-4xl md:text-6xl font-black uppercase italic text-ink-900">
  ```

- [ ] **Step 3: Fix the viewport meta (B8)**
  ```diff
  - <meta name="viewport" content="width=device-width" />
  + <meta name="viewport" content="width=device-width, initial-scale=1" />
  ```

- [ ] **Step 4: Remove the stale comment (B9)**
  Delete the frontmatter comment `// Analytics removed temporarily to debug build` at `Layout.astro:2`. If analytics is actually wanted, that is a separate task — do not add it here.

- [ ] **Step 5: Verify**
  ```bash
  pnpm check && pnpm build
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add -A
  git commit -m "fix: remove placeholder photos, duplicate class, and stale viewport meta"
  ```

---

# PHASE 4 — Performance

### Task 9: Route every image through `astro:assets` — the big one

**Files:**
- Modify: `src/components/Hero.astro`, `src/components/Products.astro`, `src/components/Navbar.astro`

Finding P1. All three files import `Image` from `astro:assets` and then never use it, serving the original 1–1.8 MB PNGs instead. Fixing this alone should cut transferred bytes by roughly 90%.

- [ ] **Step 1: Hero — use `<Picture>` for the LCP image**
  ```astro
  ---
  import { Picture } from "astro:assets";
  import heroImage from "../assets/images/imagen-01.png";
  ---
  <Picture
    src={heroImage}
    formats={["avif", "webp"]}
    widths={[640, 960, 1280, 1920]}
    sizes="100vw"
    alt="Lechona tolimense recién horneada de Lechonería Los Tres Cerditos en Cali"
    class="absolute inset-0 w-full h-full object-cover scale-105"
    loading="eager"
    fetchpriority="high"
    decoding="sync"
  />
  ```
  Note the `alt` is now descriptive. The old `"Lechoneria Los Tres Cerditos Cali"` was the business name, not a description of the picture.

- [ ] **Step 2: Products — use `<Image>` and drop the `as any` cast**
  Type the array properly so the cast at line 55 becomes unnecessary:
  ```astro
  ---
  import { Image } from "astro:assets";
  import type { ImageMetadata } from "astro";

  interface Producto {
    nombre: string;
    desc: string;
    imagen: ImageMetadata;
  }

  const productos: Producto[] = [ /* …unchanged… */ ];
  ---
  <Image
    src={p.imagen}
    widths={[400, 600, 800]}
    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
    formats={["avif", "webp"]}
    alt={`${p.nombre} — Lechonería Los Tres Cerditos, Cali`}
    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
    loading="lazy"
  />
  ```

- [ ] **Step 3: Navbar — use `<Image>` for the logo**
  ```astro
  <Image src={logo} alt="Lechonería Los Tres Cerditos" width={96} height={96} loading="eager" class="h-full w-auto object-contain group-hover:scale-105 transition-transform" />
  ```

- [ ] **Step 4: Verify optimized assets are emitted**
  ```bash
  pnpm build
  ls -la dist/_astro/*.avif dist/_astro/*.webp | head -20
  du -sh dist
  ```
  Expected: AVIF/WebP derivatives present; `dist/` total drops sharply from its current 15 MB. Record the before/after numbers.

- [ ] **Step 5: Verify no raw `.src` image usage remains**
  ```bash
  rg -n 'src=\{.*\.src\}' src/components/
  ```
  Expected: only `Gallery.astro` matches (handled in Task 10).

- [ ] **Step 6: Commit**
  ```bash
  git add -A
  git commit -m "perf: serve responsive avif/webp via astro:assets instead of raw source images"
  ```

---

### Task 10: Rebuild the Gallery media pipeline

**Files:**
- Create: `src/lib/media.ts`
- Modify: `src/components/Gallery.astro`

Findings B11, P3. Replaces the CWD-dependent `fs.readdirSync` and stops the browser from fetching 40 media files up front.

**Interfaces:**
- Produces: `export type GalleryItem = { kind: "image"; src: ImageMetadata; alt: string } | { kind: "video"; src: string; poster: string; alt: string }` and `export const galleryMedia: GalleryItem[]`.

- [ ] **Step 1: Create `src/lib/media.ts`**
  ```ts
  import type { ImageMetadata } from "astro";

  export type GalleryItem =
    | { kind: "image"; src: ImageMetadata; alt: string }
    | { kind: "video"; src: string; poster: string; alt: string };

  const imageModules = import.meta.glob<{ default: ImageMetadata }>(
    "../assets/images/*.{jpeg,jpg,png,webp}",
    { eager: true },
  );

  /** Videos live in public/ because they are streamed, not processed by astro:assets. */
  const VIDEO_FILES = [
    "video-36.mp4",
    "video-37.mp4",
    "video-38.mp4",
    "video-39.mp4",
    "video-47.mp4",
    "video-48.mp4",
    "video-49.mp4",
  ] as const;

  const orderOf = (name: string): number => {
    const match = name.match(/-(\d+)\./);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  };

  const images: GalleryItem[] = Object.entries(imageModules)
    .filter(([filePath]) => !filePath.includes("logo"))
    .map(([filePath, module]) => ({
      kind: "image" as const,
      src: module.default,
      alt: "Lechona, pernil y platos tradicionales de Lechonería Los Tres Cerditos",
      _order: orderOf(filePath),
    }))
    .map(({ _order, ...item }) => item);

  const videos: GalleryItem[] = VIDEO_FILES.map((file) => ({
    kind: "video" as const,
    src: `/images/${file}`,
    poster: `/images/posters/${file.replace(".mp4", ".webp")}`,
    alt: "Video de la preparación de nuestra lechona",
  }));

  export const galleryMedia: GalleryItem[] = [...images, ...videos].sort(
    (a, b) =>
      orderOf(a.kind === "image" ? a.src.src : a.src) -
      orderOf(b.kind === "image" ? b.src.src : b.src),
  );
  ```

  An explicit `VIDEO_FILES` list is deliberately chosen over filesystem scanning: it is CWD-independent, type-checked, and makes adding a video a visible one-line diff rather than a silent build-environment behavior.

- [ ] **Step 2: Generate video posters**
  ```bash
  mkdir -p public/images/posters
  for f in public/images/video-*.mp4; do
    ffmpeg -i "$f" -vf "thumbnail,scale=640:-1" -frames:v 1 \
      "public/images/posters/$(basename "${f%.mp4}").webp"
  done
  ```
  If `ffmpeg` is not installed, report that and stop this step — do not ship `<video>` elements without posters, and do not silently skip. The remaining steps can proceed; wire the `poster` attribute and note the missing files in the commit body.

- [ ] **Step 3: Consume the manifest in `Gallery.astro`**
  Delete the entire `fs`/`path` frontmatter block (lines 1-48) and replace with:
  ```astro
  ---
  import { Image } from "astro:assets";
  import { galleryMedia } from "../lib/media";
  ---
  ```
  Update every `allMedia` reference to `galleryMedia`, and every `media.type === "img"` to `media.kind === "image"`.

- [ ] **Step 4: Make thumbnails cheap**
  Use `<Image>` with a real thumbnail width instead of the full-size raw `<img>`:
  ```astro
  <Image src={media.src} width={288} height={192} format="webp" alt="" loading="lazy" decoding="async" class="w-full h-full object-cover pointer-events-none" />
  ```
  For video thumbs, replace the `<video preload="metadata">` element with a static `<img src={media.poster}>`. **Seven `<video>` elements with `preload="metadata"` is the single worst request-count offender in the gallery** — a poster image is 20 KB against several hundred.

- [ ] **Step 5: Verify request count**
  ```bash
  pnpm build && pnpm preview
  ```
  In DevTools → Network, hard-reload and measure requests + transferred bytes *before scrolling to the gallery*. Compare against the pre-task baseline. Expected: no `.mp4` requested until a video slide is activated.

- [ ] **Step 6: Commit**
  ```bash
  git add -A
  git commit -m "perf: replace filesystem gallery scan with typed manifest and poster-based video thumbs"
  ```

---

### Task 11: Compress the source media

**Files:**
- Modify: `src/assets/images/*.png` (15 files, 1–1.8 MB each), `public/images/*.mp4` (7 files, 21 MB total)

Astro re-encodes at build time, but a 1.8 MB PNG still costs build time and repo weight, and PNG is the wrong container for photographs.

- [ ] **Step 1: Confirm the PNGs are photographs, not graphics**
  Open two or three. If any is a logo or flat-color graphic, leave it as PNG.

- [ ] **Step 2: Convert photographic PNGs to high-quality JPEG**
  ```bash
  for f in src/assets/images/imagen-0*.png src/assets/images/imagen-1*.png; do
    [ "$(basename "$f")" = "logo.png" ] && continue
    magick "$f" -quality 88 -strip "${f%.png}.jpg" && rm "$f"
  done
  ```
  Then update the import paths in `Hero.astro`, `Products.astro`. `src/lib/media.ts` picks the new files up via its glob automatically.

- [ ] **Step 3: Re-encode the videos**
  ```bash
  for f in public/images/video-*.mp4; do
    ffmpeg -i "$f" -vcodec libx264 -crf 28 -preset slow -vf "scale='min(1280,iw)':-2" \
      -movflags +faststart -an "${f%.mp4}-opt.mp4" && mv "${f%.mp4}-opt.mp4" "$f"
  done
  ```
  `-an` strips audio — the gallery plays them `muted` and looping, so the audio track is pure waste. `+faststart` moves the index to the front so playback can begin before the full file arrives.

- [ ] **Step 4: Verify sizes and that nothing visibly degraded**
  ```bash
  du -sh src/assets/images public/images
  pnpm build && pnpm preview
  ```
  Expected: `src/assets/images` well under 27 MB, `public/images` well under 21 MB. Visually inspect the hero and three gallery slides for compression artifacts.

- [ ] **Step 5: Commit**
  ```bash
  git add -A
  git commit -m "perf: compress source images and re-encode gallery videos"
  ```

---

### Task 12: Clear the TypeScript escape hatches

**Files:**
- Modify: `src/components/Gallery.astro`, `src/components/Products.astro`

The `as any` casts recorded in Task 2 Step 5 exist because the media types were untyped. Tasks 9 and 10 fixed the root cause.

- [ ] **Step 1: Find them**
  ```bash
  rg -n 'as any' src/
  ```

- [ ] **Step 2: Remove each one**
  With `GalleryItem` discriminated on `kind`, narrowing replaces every cast. If any cast still seems necessary, the type is wrong — fix the type, not the call site.

- [ ] **Step 3: Verify**
  ```bash
  pnpm check
  ```
  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "refactor: remove any-casts now that media types are modeled"
  ```

---

### Task 13: Automate the sitemap

**Files:**
- Modify: `astro.config.mjs`
- Delete: `public/sitemap.xml`

- [ ] **Step 1: Install and configure**
  ```bash
  pnpm add @astrojs/sitemap
  ```
  ```js
  import { defineConfig } from "astro/config";
  import tailwindcss from "@tailwindcss/vite";
  import sitemap from "@astrojs/sitemap";

  export default defineConfig({
    site: "https://lechonatrescerditos.com",
    integrations: [sitemap()],
    vite: { plugins: [tailwindcss()] },
  });
  ```

- [ ] **Step 2: Remove the hand-written file and point robots.txt at the generated one**
  ```bash
  rm public/sitemap.xml
  ```
  Ensure `public/robots.txt` contains:
  ```
  Sitemap: https://lechonatrescerditos.com/sitemap-index.xml
  ```

- [ ] **Step 3: Verify**
  ```bash
  pnpm build
  ls dist/sitemap*
  ```
  Expected: `dist/sitemap-index.xml` and `dist/sitemap-0.xml`.

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "feat: generate sitemap via @astrojs/sitemap"
  ```

---

# PHASE 5 — Motion

> **Invoke `gsap-core` before this phase.**

### Task 14: Replace three scroll listeners with one GSAP timeline

**Files:**
- Create: `src/scripts/motion.ts`
- Modify: `src/layouts/Layout.astro` (delete the inline reveal script at lines 124-138 and the `.reveal` CSS at 111-121), `src/components/Navbar.astro` (lines 117-135), `src/components/ContactFab.astro` (lines 101-117)

Finding P4 and X4. Three unthrottled handlers, two calling `getBoundingClientRect()` per frame, become one ScrollTrigger-driven module.

- [ ] **Step 1: Install**
  ```bash
  pnpm add gsap
  ```

- [ ] **Step 2: Write `src/scripts/motion.ts`**
  ```ts
  import gsap from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";

  gsap.registerPlugin(ScrollTrigger);

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /** Reveals are progressive enhancement: content is visible by default and
   *  only animated in when motion is welcome and JS has loaded. */
  function initReveals() {
    if (prefersReducedMotion) return;

    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });
  }

  function initNavbarAutoHide() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: ({ direction, scroll }) => {
        const hide =
          window.innerWidth < 768 && direction === 1 && scroll() > 100;
        nav.classList.toggle("nav-hidden", hide);
      },
    });
  }

  function initFabVisibility() {
    const fab = document.getElementById("contact-fab-container");
    const footer = document.querySelector("footer");
    if (!fab || !footer) return;

    ScrollTrigger.create({
      trigger: footer,
      start: "top bottom-=50",
      onEnter: () => fab.classList.add("is-hidden"),
      onLeaveBack: () => fab.classList.remove("is-hidden"),
    });
  }

  initReveals();
  initNavbarAutoHide();
  initFabVisibility();
  ```

- [ ] **Step 3: Load it once from `Layout.astro`**
  ```astro
  <script>
    import "../scripts/motion";
  </script>
  ```
  Astro bundles and defers this automatically.

- [ ] **Step 4: Flip `.reveal` to `data-reveal` (X4)**
  Replace `class="… reveal"` with `data-reveal` on the four sections that use it (`Products.astro:45`, `Mission.astro:5`, `Gallery.astro:53`, `Location.astro:12`). Delete the `.reveal { opacity: 0 }` CSS entirely.

  **This is the important part:** content must now be visible with JS disabled. `gsap.from()` animates *toward* the element's natural state, so the resting state in the HTML is the visible one. The old `opacity: 0` default meant a JS failure hid the entire page below the hero.

- [ ] **Step 5: Delete the three old listeners**
  Remove the inline scripts from `Layout.astro`, `Navbar.astro` (keep the menu-toggle script — only remove the scroll handler at lines 117-135) and `ContactFab.astro` (only the scroll handler at lines 101-117). Add the `.is-hidden` class the FAB now relies on:
  ```css
  #contact-fab-container.is-hidden {
    opacity: 0;
    transform: translateY(20px);
    pointer-events: none;
  }
  ```

- [ ] **Step 6: Verify**
  ```bash
  rg -n "addEventListener\(['\"]scroll" src/
  ```
  Expected: no matches.

  Then, in DevTools:
  - Performance panel, 6× CPU throttle, scroll the full page — no long tasks over 50 ms.
  - Rendering panel → "Emulate prefers-reduced-motion: reduce" → reload. All content visible, nothing animates.
  - Disable JavaScript entirely → reload. **All content must still be visible.**

- [ ] **Step 7: Commit**
  ```bash
  git add -A
  git commit -m "perf: consolidate scroll listeners into gsap scrolltrigger with reduced-motion support"
  ```

---

# PHASE 6 — Accessibility

### Task 15: Make the gallery keyboard- and screen-reader-usable

**Files:**
- Modify: `src/components/Gallery.astro`

Findings X3, X5, X6.

- [ ] **Step 1: Give thumbnails accessible names and visible focus**
  Remove `outline-none` from line 230. Add to each thumbnail button:
  ```astro
  aria-label={`Ver elemento ${index + 1} de ${galleryMedia.length}`}
  aria-current={index === 0 ? "true" : "false"}
  ```
  Keep `aria-current` in sync inside `updateGallery()` alongside the existing `is-active` class toggle.

- [ ] **Step 2: Add arrow-key navigation scoped to the gallery**
  ```ts
  galleryBox?.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      updateGallery((currentIndex - 1 + total) % total, true);
    } else if (event.key === "ArrowRight") {
      updateGallery((currentIndex + 1) % total, true);
    } else {
      return;
    }
    event.preventDefault();
  });
  ```
  Add `tabindex="0"`, `role="region"` and `aria-label="Galería de fotos y videos"` to `#gallery-observer-target` so it is reachable and announced.

- [ ] **Step 3: Announce slide changes**
  Add a visually-hidden live region and update it in `updateGallery()`:
  ```astro
  <p id="gallery-status" class="sr-only" aria-live="polite" aria-atomic="true"></p>
  ```

- [ ] **Step 4: Honor reduced motion (X5)**
  At the top of the gallery script:
  ```ts
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let isPaused = prefersReducedMotion;
  ```
  When `prefersReducedMotion` is true the carousel must start paused, and the pause button's initial label must read `Reanudar`. An autoplaying carousel is a genuine barrier for users with vestibular disorders — this is not optional polish.

- [ ] **Step 5: Verify**
  - Tab to the gallery, press ←/→ — slides change, focus ring visible.
  - Rendering panel → reduced motion → reload — carousel is paused, button reads "Reanudar".
  - Read the gallery with a screen reader (NVDA on Windows) — slide changes are announced once, not repeatedly.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/Gallery.astro
  git commit -m "a11y: add keyboard navigation, live region, and reduced-motion default to gallery"
  ```

---

### Task 16: Skip link, menu ARIA state, and contrast

**Files:**
- Modify: `src/layouts/Layout.astro`, `src/components/Navbar.astro`, `src/components/ContactFab.astro`, `src/pages/index.astro`

Findings X1, X2, X6, X7.

- [ ] **Step 1: Add a skip link (X1)**
  First child of `<body>` in `Layout.astro`:
  ```astro
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-brand-600 focus:text-white focus:px-5 focus:py-3 focus:rounded-pill"
  >
    Saltar al contenido
  </a>
  ```
  Add `id="main-content"` to the `<main>` element in `src/pages/index.astro:71`.

- [ ] **Step 2: Wire the hamburger's ARIA state (X2)**
  ```astro
  <button id="menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobile-menu">
  ```
  Inside `toggleMenu()`:
  ```ts
  btn?.setAttribute("aria-expanded", String(isOpen));
  btn?.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  ```

- [ ] **Step 3: Trap nothing, but return focus**
  When the mobile menu closes, move focus back to `#menu-btn`. Losing focus to `<body>` strands keyboard users at the top of the document.

- [ ] **Step 4: Remove the remaining `outline-none` (X6)**
  ```bash
  rg -n 'outline-none' src/
  ```
  Delete each occurrence. The `:focus-visible` rule from Task 4 now provides a consistent ring everywhere.

- [ ] **Step 5: Raise body-copy contrast (X7)**
  Replace `text-zinc-500` on white backgrounds with `text-ink-700`. Verify each with DevTools' contrast checker — small text needs ≥ 4.5:1.

- [ ] **Step 6: Verify**
  Tab from a fresh page load: skip link appears first, then nav, then hero CTA — a sensible order with a visible ring at every stop.

- [ ] **Step 7: Commit**
  ```bash
  git add -A
  git commit -m "a11y: add skip link, menu aria state, focus return, and AA contrast"
  ```

---

# PHASE 7 — Visual redesign

> **Invoke `frontend-design:frontend-design` before this phase.**

This phase has two halves. Tasks 17–19 fix the *surface* — type scale, radii, color — using the tokens built in Task 4. Tasks 20–23 fix the *structure*: the page is currently symmetric everywhere, and symmetry is why it reads as generated (finding A7). Do them in order; restructuring layout before the type scale exists means guessing at the sizes.

**The principle behind Tasks 20–23:** asymmetry is not decoration, it is hierarchy made visible. Every departure from an even grid must say *this matters more than that*. A layout broken at random is worse than a symmetric one — it looks broken instead of deliberate. Before writing any span, name what the imbalance is asserting.

### Task 17: Establish a real typographic hierarchy

**Files:**
- Modify: `src/components/Hero.astro`, `Products.astro`, `Mission.astro`, `Gallery.astro`, `Location.astro`, `Footer.astro`

Finding A2. Right now *every* heading on the page is `font-black uppercase italic`. When everything shouts, nothing is emphasized — and uniform extremity is the most reliable signal of generated markup.

- [ ] **Step 1: Assign one level per role**
  - **H1 (hero only):** `font-display font-black uppercase italic` — keep the full treatment. It earns it once.
  - **H2 (section headings):** `font-display font-bold uppercase tracking-tight` — drop the italic. Italic on every section is a tic, not a voice.
  - **H3 (card titles):** `font-display font-semibold` — normal case. Product names are read, not shouted.
  - **Body:** `font-body text-base leading-relaxed text-ink-700`.

- [ ] **Step 2: Apply, one file at a time**
  Work through the six files. After each, look at the page — the point is that the eye now has somewhere to land first.

- [ ] **Step 3: Verify**
  Squint at the full page at 1440px. You should be able to identify the reading order without reading a word. If three things compete for first place, the hierarchy is not done.

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "design: establish typographic hierarchy across sections"
  ```

---

### Task 18: Apply the radius scale and retire the uniform pill look

**Files:**
- Modify: all component files

Finding A2 again, on the shape axis. `rounded-[2.5rem]` and `rounded-[3rem]` appear on cards, panels, map frames and the footer alike.

- [ ] **Step 1: Map every arbitrary radius to a token**
  ```bash
  rg -n 'rounded-\[' src/
  ```
  - Product cards, thumbnails, small surfaces → `rounded-card` (1.25rem)
  - Mission/Vision panels, the map frame, the schedule panel → `rounded-panel` (2rem)
  - Buttons, badges, chips → `rounded-pill`

- [ ] **Step 2: Remove the tilt gimmick (A5)**
  Delete `md:rotate-2 hover:rotate-0` from `Mission.astro:12`. A tilted card is a stock flourish; the Mission/Vision asymmetry (7/5 grid split) already carries the visual interest.

- [ ] **Step 3: Verify no arbitrary radii remain**
  ```bash
  rg -n 'rounded-\[' src/
  ```
  Expected: no matches.

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "design: apply radius scale and remove decorative card tilt"
  ```

---

### Task 19: Consolidate to brand tokens

**Files:**
- Modify: all component files

Finding A4 — six different reds.

- [ ] **Step 1: Find every literal**
  ```bash
  rg -n 'red-500|red-600|red-700|#dc2626|#fb2c36|239,\s*68,\s*68|green-400|green-500|green-600|blue-500|blue-700' src/
  ```

- [ ] **Step 2: Replace**
  - All reds → `brand-500` / `brand-600` / `brand-700` per the token roles.
  - `zinc-*` → `ink-*` / `surface-*`.
  - **Exception:** keep WhatsApp green and phone blue in `ContactFab.astro:10,22` and `Footer.astro:57`. Those are third-party brand-recognition colors — users identify the WhatsApp button by its green. Recoloring them to brand red would cost more in recognition than it gains in consistency. Document this exception in a code comment.

- [ ] **Step 3: Verify**
  ```bash
  rg -n '#dc2626|#fb2c36|239,\s*68,\s*68' src/
  ```
  Expected: no matches.

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "design: consolidate color usage onto brand tokens"
  ```

---

### Task 20: Give each section ownership of its own container and rhythm

**Files:**
- Modify: `src/pages/index.astro`, `src/components/Products.astro`, `Mission.astro`, `Gallery.astro`, `Location.astro`

This is the structural prerequisite for every asymmetry task that follows. Right now `index.astro` wraps *some* sections in `max-w-7xl mx-auto space-y-32` and lets Gallery escape it — which is exactly why `Gallery.astro:53` needs an `overflow-hidden` patch to break back out. Uniform `space-y-32` between every section also gives the page a metronome rhythm: every gap identical, nothing grouped, nothing separated.

- [ ] **Step 1: Flatten `index.astro` to a plain section list**
  ```astro
  ---
  import Layout from "../layouts/Layout.astro";
  import Navbar from "../components/Navbar.astro";
  import Hero from "../components/Hero.astro";
  import Products from "../components/Products.astro";
  import Mission from "../components/Mission.astro";
  import Gallery from "../components/Gallery.astro";
  import Location from "../components/Location.astro";
  import Footer from "../components/Footer.astro";
  import ContactFab from "../components/ContactFab.astro";
  import "../styles/global.css";
  ---

  <Layout title="Lechonería Los Tres Cerditos">
    <Navbar />
    <main id="main-content" class="w-full">
      <Hero />
      <Products />
      <Mission />
      <Gallery />
      <Location />
    </main>
    <Footer />
    <ContactFab />
  </Layout>
  ```
  No wrapper divs, no `space-y-*`, no `max-w-*`. The page file describes order and nothing else.

- [ ] **Step 2: Move the container into each section**
  Each contained section gets its own inner wrapper:
  ```astro
  <section id="productos" data-reveal class="py-24 md:py-32">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <!-- content -->
    </div>
  </section>
  ```
  Apply to `Products.astro` and `Location.astro`. `Gallery.astro` and `Mission.astro` become full-bleed (Step 3) and keep only an inner container for their *text*, not their media.

- [ ] **Step 3: Alternate contained and full-bleed**
  A page that alternates between held-in and edge-to-edge reads as designed; a page where every section sits in the same 1280px box reads as a template.

  - `Products` — contained
  - `Mission` — **full-bleed dark band**, edge to edge, no side gutters on the background
  - `Gallery` — full-bleed (already is; it can now drop the `overflow-hidden` workaround)
  - `Location` — contained

  For Mission, wrap the existing grid:
  ```astro
  <section id="nosotros" data-reveal class="bg-surface-950 py-24 md:py-36">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <!-- existing 7/5 grid, with the dark panel's own bg removed -->
    </div>
  </section>
  ```
  The inner Mission panel currently carries `bg-zinc-900` at `Mission.astro:7`. Remove it — the band now supplies the dark. Two nested dark surfaces at slightly different values look like a mistake.

- [ ] **Step 4: Vary the vertical rhythm deliberately**
  Do not give every section the same padding. Group what belongs together, separate what does not:
  - Hero → Products: tight (`pt-20`). The menu is what the hero's CTA points at; a big gap breaks the promise.
  - Products → Mission: wide (`py-32`). Change of subject, from product to identity.
  - Mission → Gallery: tight (`pt-16`). Both are "who we are" — they belong in one breath.
  - Gallery → Location: wide (`py-32`). Change of subject again, from story to logistics.

- [ ] **Step 5: Verify**
  ```bash
  pnpm build && pnpm preview
  ```
  - No horizontal scrollbar at 375px. Full-bleed sections are the usual cause of one — check specifically.
  - `Gallery.astro`'s `overflow-hidden` can now be removed without the layout breaking. Remove it and confirm.
  - Scroll the page: the gaps should feel grouped, not metronomic.

- [ ] **Step 6: Commit**
  ```bash
  git add -A
  git commit -m "design: move layout containers into sections and vary vertical rhythm"
  ```

---

### Task 21: Rebuild Products as an editorial bento grid

**Files:**
- Modify: `src/components/Products.astro`

Six identical cards in a `lg:grid-cols-3` grid says "these six things are equally important". They are not — Lechona Tradicional is the flagship and everything else is an accompaniment. A layout that reflects that is both more attractive and more honest.

- [ ] **Step 1: Make the layout data-driven, not hardcoded**
  Add a `feature` flag rather than scattering span classes through the markup:
  ```astro
  ---
  import { Image } from "astro:assets";
  import type { ImageMetadata } from "astro";

  interface Producto {
    nombre: string;
    desc: string;
    imagen: ImageMetadata;
    /** The flagship product occupies the large cell in the bento grid. */
    feature?: boolean;
  }

  const productos: Producto[] = [
    { nombre: "Lechona Tradicional", desc: "…", imagen: img05, feature: true },
    { nombre: "Cojín de Lechona",    desc: "…", imagen: img03 },
    { nombre: "Pernil de Cerdo",     desc: "…", imagen: img02 },
    { nombre: "Papa Rellena",        desc: "…", imagen: img40 },
    { nombre: "Empanada",            desc: "…", imagen: img24 },
    { nombre: "Tamal con Lechona",   desc: "…", imagen: img26 },
  ];
  ---
  ```
  Keep the existing `desc` strings verbatim — they are good copy, do not rewrite them.

- [ ] **Step 2: Build the grid**
  A 6-column grid. The feature spans 4 columns and 2 rows; the rest span 2. Row 1: feature(4) + one(2). Row 2: feature continues + one(2). Row 3: three cards at 2 each.
  ```astro
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 md:gap-6">
    {
      productos.map((p) => (
        <article
          class:list={[
            "group relative flex overflow-hidden rounded-card bg-surface-50 ring-1 ring-ink-300/60 transition-shadow hover:shadow-xl",
            p.feature
              ? "sm:col-span-2 md:col-span-4 md:row-span-2 min-h-[22rem] md:min-h-[32rem] items-end"
              : "md:col-span-2 flex-col",
          ]}
        >
          {/* … */}
        </article>
      ))
    }
  </div>
  ```

- [ ] **Step 3: Give the feature card a different internal treatment, not just a bigger box**
  Scaling one card up is not asymmetry, it is zoom. The feature cell gets a full-bleed image with the text laid over a gradient; the small cells keep image-above-text.
  ```astro
  {p.feature ? (
    <>
      <Image
        src={p.imagen}
        widths={[640, 960, 1280]}
        sizes="(min-width: 768px) 66vw, 100vw"
        formats={["avif", "webp"]}
        alt={`${p.nombre} — Lechonería Los Tres Cerditos, Cali`}
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div class="relative z-10 p-8 md:p-10">
        <p class="mb-3 inline-block rounded-pill bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
          El clásico de la casa
        </p>
        <h3 class="font-display text-3xl md:text-4xl font-semibold text-white">{p.nombre}</h3>
        <p class="mt-3 max-w-md leading-relaxed text-white/85">{p.desc}</p>
      </div>
    </>
  ) : (
    <>
      <div class="aspect-[4/3] overflow-hidden bg-ink-300/30">
        <Image
          src={p.imagen}
          widths={[400, 600]}
          sizes="(min-width: 768px) 33vw, 50vw"
          formats={["avif", "webp"]}
          alt={`${p.nombre} — Lechonería Los Tres Cerditos, Cali`}
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div class="flex flex-1 flex-col p-6">
        <h3 class="font-display text-xl font-semibold text-ink-900">{p.nombre}</h3>
        <p class="mt-2 flex-1 text-sm leading-relaxed text-ink-700">{p.desc}</p>
      </div>
    </>
  )}
  ```
  **Contrast check required:** white text over a photo gradient is the classic silent AA failure. Verify the `from-black/85` stop is dark enough under *this specific image* with DevTools' contrast tool. If it fails, deepen the gradient — do not lighten the text.

- [ ] **Step 4: Offset the section heading**
  Currently centered. Anchor it left and let it sit against the grid's asymmetry:
  ```astro
  <div class="mb-12 max-w-2xl">
    <h2 class="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight">
      Nuestros <span class="text-brand-600">Manjares</span>
    </h2>
  </div>
  ```

- [ ] **Step 5: Verify the mobile collapse explicitly**
  This is where bento grids fail. At 375px every card is `grid-cols-1` — full width, stacked, feature first. At 640px (`sm`) it is two columns with the feature spanning both. Check all three of 375 / 640 / 768 px and confirm no cell is orphaned or squashed to an unreadable height.

  Also run a CLS check: the feature card's `min-h` must be set at every breakpoint, or the image loading late will shift everything below it.
  ```bash
  pnpm build && pnpm preview
  ```
  Lighthouse mobile → CLS must stay under 0.1.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/Products.astro
  git commit -m "design: rebuild products section as editorial bento grid with featured product"
  ```

---

### Task 22: Break the Location section's 50/50 split with an overlap

**Files:**
- Modify: `src/components/Location.astro`

Two equal columns side by side is the most inert layout there is. Overlapping one panel over the other is the single cheapest, strongest asymmetry device available — it creates depth without adding a decoration.

- [ ] **Step 1: Change 50/50 to 7/5**
  ```diff
  - <div class="grid lg:grid-cols-2 gap-8 items-stretch">
  + <div class="grid lg:grid-cols-12 lg:gap-0 gap-8 items-start">
  ```
  Map wrapper: `lg:col-span-7`. Schedule wrapper: `lg:col-span-5`.

- [ ] **Step 2: Pull the schedule panel over the map**
  ```astro
  <div class="relative z-10 lg:col-span-5 lg:-ml-20 lg:mt-28">
    <div class="rounded-panel bg-brand-600 p-8 text-white shadow-2xl md:p-12">
      <!-- existing schedule content -->
    </div>
  </div>
  ```
  `-ml-20` is the overlap; `mt-28` is the vertical offset that keeps it from reading as a mistake. Both are `lg:`-only — at smaller widths the panels stack normally with the `gap-8` from Step 1.

- [ ] **Step 3: Let the map be taller than the panel**
  ```astro
  <div class="lg:col-span-7 h-[420px] lg:h-[620px] overflow-hidden rounded-panel …">
  ```
  Equal heights re-introduce the symmetry you just removed. The map extending past the panel on both ends is the point.

- [ ] **Step 4: Fix the stacking context**
  The overlap only works if the panel is genuinely above the map. The map wrapper has `relative` and the iframe carries `z-10` at `Location.astro:34` — the panel needs a higher z-index on its own positioned parent. Verify by hovering the map: the "Abrir en Google Maps" overlay must not appear on top of the schedule panel.

- [ ] **Step 5: Verify**
  - 375 / 768 / 1024 / 1440 px. Below `lg` the panels must stack cleanly with no negative margin leaking.
  - No horizontal overflow at any width — negative margins are the most common cause.
  - The address card at `Location.astro:37` is `absolute bottom-6` inside the map; confirm the overlapping panel does not cover it at 1024px.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/Location.astro
  git commit -m "design: replace symmetric location split with overlapping asymmetric layout"
  ```

---

### Task 23: Unbalance the footer columns

**Files:**
- Modify: `src/components/Footer.astro`

Three equal `md:grid-cols-3` columns holding a paragraph, a four-item contact list and a two-item schedule. The content is not equally sized, so the columns should not be either.

- [ ] **Step 1: Move to a 12-column grid weighted by content**
  ```diff
  - <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
  + <div class="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-12">
  ```
  - Brand + description block: `md:col-span-5`
  - Contact list: `md:col-span-4`
  - Schedule: `md:col-span-3`

- [ ] **Step 2: Left-align everything and delete the centering machinery**
  The footer is currently full of centering scaffolding fighting itself — `flex flex-col items-center` wrapping a `w-full flex justify-center` wrapping a `w-fit mx-auto` (`Footer.astro:12-15`), plus `text-left` on individual `<span>`s to undo it. Three layers to place one list.

  Remove all of it. Left-align the columns:
  ```astro
  <div class="md:col-span-4">
    <h4 class="mb-6 font-display text-xl font-semibold">Contacto</h4>
    <ul class="space-y-4 text-ink-300">
      <!-- items, no per-item text-left needed -->
    </ul>
  </div>
  ```
  This is the same class of defect as the `!important` block from Task 5 — layers of correction stacked on a wrong default.

- [ ] **Step 3: Verify**
  At 375px all three stack full-width and left-aligned. At `md` the 5/4/3 split holds with no wrapping in the contact list — the Instagram handle `@lechonerialostrescerditos_cali` is the longest string; confirm it does not overflow its 4-column cell. If it does, reduce its font size rather than widening the column.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/Footer.astro
  git commit -m "design: weight footer columns by content and remove centering scaffolding"
  ```

---

### Task 24: Translate the Spanish code comments

**Files:**
- Modify: `src/components/Navbar.astro`, `Gallery.astro`, `Location.astro`, `src/pages/index.astro`

Finding A6. Numbered narration comments in mixed Spanish/English (`// 1. CLASE PARA BLOQUEAR SCROLL`, `// 4. LIMPIADOR PARA PANTALLA COMPLETA (RESIZE)`) date the code and read as machine-generated scaffolding.

- [ ] **Step 1: Delete comments that restate the code**
  `// 2. BLOQUEAR SCROLL` above `body.classList.add('overflow-hidden')` adds nothing. Remove it.

- [ ] **Step 2: Translate and keep the ones carrying real intent**
  ```diff
  - // Reemplazo de scrollIntoView para evitar que el navegador mueva TODA la web
  + // Manual scroll instead of scrollIntoView: the latter scrolls the whole
  + // document, not just the thumbnail strip.
  ```
  That one explains a non-obvious decision — exactly what a comment is for.

- [ ] **Step 3: Verify**
  User-facing Spanish copy in markup must be untouched. Only comments change.
  ```bash
  git diff --stat
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "docs: translate code comments to english and drop redundant narration"
  ```

---

# PHASE 8 — Final verification

### Task 25: Guidelines audit

> **Invoke `web-design-guidelines`** against every file in `src/`.

- [ ] **Step 1: Run the audit**
  Point the skill at `src/**/*.astro` and `src/**/*.ts`.

- [ ] **Step 2: Triage**
  Fix everything it flags as an error. For each warning, either fix it or record in the plan file why it is being accepted. Do not silently ignore findings.

- [ ] **Step 3: Commit**
  ```bash
  git add -A
  git commit -m "fix: address web interface guidelines findings"
  ```

---

### Task 26: Measure, then report honestly

- [ ] **Step 1: Build and serve**
  ```bash
  pnpm check && pnpm build && pnpm preview
  ```

- [ ] **Step 2: Lighthouse, mobile preset, throttled**
  Record Performance, Accessibility, Best Practices, SEO, plus LCP / CLS / INP.

  Targets: Performance ≥ 90, Accessibility ≥ 95, SEO 100, LCP < 2.5 s.

- [ ] **Step 3: Manual pass**
  - Widths 375 / 768 / 1024 / 1440 — no overflow, nav present at every width.
  - JS disabled — all content visible.
  - `prefers-reduced-motion: reduce` — nothing animates, carousel paused.
  - Keyboard-only, top to bottom — every interactive element reachable with a visible focus ring.
  - **Asymmetry regression check (Tasks 20–23):** the Products bento collapses cleanly at 375 / 640 / 768; the Location overlap produces no horizontal scroll at any width and does not cover the address card at 1024; the full-bleed Mission and Gallery bands reach both edges with no gutter leak.

- [ ] **Step 4: Write the report**
  Record in the commit body: `dist/` size before and after, request count before and after, and the Lighthouse numbers.

  **If a target was missed, say so with the number.** A plan that reports success it did not achieve is worse than one that reports the gap. If Performance lands at 78, write 78 and note what is still costing it.

- [ ] **Step 5: Commit**
  ```bash
  git add -A
  git commit -m "chore: record post-optimization performance baseline"
  ```

---

## Deferred — deliberately not in this plan

These came up during the audit and were judged out of scope. Recorded so they are not silently lost.

- **Analytics.** `Layout.astro` shows it was removed to debug a build. Re-adding it is a product decision with a privacy dimension, not a cleanup task.
- **Dark mode, properly built.** Task 3 removes the dead variants. Building a real one on top of the Task 4 tokens is a separate, cheap piece of work if it is actually wanted.
- **A CMS or content collections for products.** Six products hardcoded in `Products.astro` is fine at this size. Revisit past ~15.
- **Real photos of the storefront.** Task 8 deletes the Unsplash placeholders rather than replacing them. Getting actual photos of the local is on the business, not the codebase.
