# Design System Document

## 1. Overview & Creative North Star: "The Radiant Ancestor"

This design system is built upon the philosophy of **Radiant Ancestralism**. It bridges the gap between deep-rooted cultural heritage and a high-energy, forward-looking digital future. Moving away from the heavy, dark themes of traditional "cultural" apps, this system embraces an airy, light-filled environment where history feels fresh and energetic.

The "Creative North Star" is to treat the UI not as a flat screen, but as a **curated editorial gallery**. We break the "template" look by utilizing intentional asymmetry, overlapping frosted surfaces, and a typography scale that demands attention. The experience should feel like high-end print media—premium, breathable, and deeply intentional.

---

## 2. Colors: High-Contrast Vitality

The palette is anchored by the vitality of orange and the sophisticated neutrality of "off-white" tones.

### Named Color Tokens (Material Design Convention)
*   **Primary:** `#A73A00` (Deep Branding)
*   **Primary Container:** `#F1692E` (The Signature Orange - Action/High Energy)
*   **On-Primary Container:** `#521800` (High Contrast Text on Orange)
*   **Surface:** `#F9F9F9` (The Main Base)
*   **Surface Container Low:** `#F3F3F3` (Soft Sectioning)
*   **Surface Container High:** `#E8E8E8` (Active Nested Layers)
*   **Tertiary:** `#006686` (Oceanic Accent)

### The "No-Line" Rule
To achieve a premium editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through:
1.  **Background Color Shifts:** A `surface-container-low` section sitting against a `surface` background.
2.  **Tonal Transitions:** Using the hierarchy of surface tiers to suggest where one thought ends and another begins.

### The "Glass & Gradient" Rule
To add "soul" to the interface:
*   **Glassmorphism:** Use semi-transparent white overlays (`rgba(255, 255, 255, 0.7)`) with a `backdrop-blur` (10px–20px) for floating headers and navigation elements.
*   **Signature Gradients:** Hero areas and main CTAs should utilize a subtle linear gradient from `primary` to `primary-container` at a 135-degree angle. This provides a three-dimensional richness that flat hex codes cannot mimic.

---

## 3. Typography: The Energetic Editorial

We utilize **Epilogue** exclusively. Its modern, slightly wide proportions provide a "Māori-modern" aesthetic that feels both tribal and technological.

*   **Display (lg/md):** Used for "Statement Content." Bold weight. These should often be italicized to convey the "Energy" attribute of the brand.
*   **Headline (lg/md):** High-impact section titles. Use tight letter-spacing (-0.02em) to create a dense, authoritative look.
*   **Title (lg/md):** Component headers and card titles. Bold, energetic, and clear.
*   **Body (lg/md):** Designed for readability. Use `body-lg` for introductory paragraphs and `body-md` for general content.
*   **Label (md/sm):** For metadata (e.g., "YEAR 2025"). Always uppercase with increased letter-spacing (+0.05em) to differentiate from body text.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are replaced with a "Physicality of Light" approach.

### The Layering Principle
Depth is achieved by "stacking" surface tiers. Place a `surface-container-lowest` (#FFFFFF) card on a `surface-container-low` (#F3F3F3) section. This creates a soft, natural lift without visual clutter.

### Ambient Shadows
For "floating" interactive elements (like the search bar or modal cards), use **Ambient Shadows**:
*   **Blur:** 24px to 40px.
*   **Opacity:** 4%–8%.
*   **Color:** Use a tinted version of `on-surface` (a deep warm grey) rather than pure black. This mimics natural light passing through frosted glass.

### The "Ghost Border"
If a container requires a border for accessibility, use a **Ghost Border**: the `outline-variant` token at 15% opacity. Never use 100% opaque, high-contrast strokes.

---

## 5. Components: Bespoke Primitives

### Buttons
*   **Primary:** Background: `primary-container` (#F1692E); Text: `on-primary-container`. Shape: `ROUND_FULL`.
*   **Secondary (Glass):** Background: Translucent white with backdrop blur; Text: `primary`. 
*   **Interaction:** On hover, primary buttons should scale slightly (1.02x) rather than just changing color.

### Cards & Lists
*   **Rule:** Forbid divider lines. Use vertical white space (`spacing-6`) or subtle background shifts.
*   **Card Style:** `ROUND_LG` (2rem) corners. For active states, use a "Double Border" effect: a subtle 1px inner glow and an outer ghost border.

### Input Fields
*   **Styling:** Fields should be `surface-container-lowest` with a `ROUND_MD` corner.
*   **Labels:** Floating labels using `label-md` in `primary` color to maintain the energetic tone.

### New Component: The "Heritage Badge"
A high-contrast label used for S-Tier items. Background: `primary` (#A73A00); Text: white; Weight: Bold; Case: Uppercase. Used to denote rarity and importance within the "Ancestral Modernism" context.

---

## 6. Do’s and Don’ts

### Do:
*   **DO** use whitespace as a functional element. Allow "Display" type to breathe.
*   **DO** use overlapping elements. A card slightly overlapping a hero gradient creates a custom, high-end feel.
*   **DO** apply `ROUND_FULL` to all action-oriented components (buttons, chips) to contrast against `ROUND_LG` content cards.

### Don’t:
*   **DON’T** use pure black (#000000) for text. Use `on-surface` (#1A1C1C) to keep the light-filled, airy aesthetic.
*   **DON’T** use standard grid-row borders. If you need to separate content, use a tonal shift from the `surface` scale.
*   **DON’T** use sharp corners. Everything in this system should feel organic and approachable, reflecting the "Ancestral" roots.