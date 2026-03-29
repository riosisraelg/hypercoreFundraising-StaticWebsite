# Design System Document: Industrial Tech-Editorial

## 1. Overview & Creative North Star

### Creative North Star: "The Monolithic Curator"
This design system is built for an elite engineering collective. It rejects the "app-template" aesthetic in favor of **Industrial Tech-Editorial**. We are blending the rigorous academic precision of institutional engineering with the high-octane energy of a tech summit.

To achieve this, the system follows a "Monolithic" philosophy: UI elements should feel like solid, machined blocks of information rather than thin digital layers. We move beyond the grid by using **intentional asymmetry**—large, high-contrast typography juxtaposed with ultra-refined technical data. The goal is a digital experience that feels as authoritative as a blueprint and as dynamic as a live launch.

---

## 2. Colors & Surface Logic

Our palette is anchored by the deep, authoritative **Primary #00534C** and electrified by the high-visibility **Secondary #DCFF52**.

### The "No-Line" Rule
To maintain a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** We do not use lines to separate ideas. Instead, boundaries must be defined through:
- **Background Shifts:** Using `surface-container-low` against a `surface` background.
- **Structural Tension:** Using vertical whitespace (e.g., `spacing.16` or `spacing.24`) to create "silent" divisions.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials. Depth is created through tonal layering:
- **Level 0 (Base):** `surface` (#f8f9ff) – The canvas.
- **Level 1 (Sectioning):** `surface-container-low` (#eff4ff) – Large content blocks.
- **Level 2 (Interaction):** `surface-container-highest` (#d5e3fc) – Cards or elevated modules.
- **Level 3 (Top-tier):** `surface-container-lowest` (#ffffff) – Used for high-contrast elements nested inside darker containers.

### The "Glass & Gradient" Rule
For floating navigational elements or hero overlays, use **Glassmorphism**. Apply `surface` at 70% opacity with a `backdrop-blur(20px)`. To add "soul" to the industrial aesthetic, use subtle linear gradients for CTAs, transitioning from `primary` (#003a35) to `primary_container` (#00534c) at a 135-degree angle.

---

## 3. Typography

The typographic system is a high-contrast dialogue between tech-forward geometry and editorial readability.

*   **Headings (Space Grotesk):** This is our "Industrial" voice. It is used for `display` and `headline` levels. Its quirky, technical terminals feel engineered. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero moments to create an authoritative, "monolithic" impact.
*   **Body (Plus Jakarta Sans):** This is our "Precision" voice. Used for `title`, `body`, and `label` levels. It provides a clean, modern humanism that balances the coldness of the tech headings.

**Editorial Tip:** Use `label-md` in all-caps with 0.1em letter-spacing for technical metadata to mimic engineering documentation.

---

## 4. Elevation & Depth

We eschew traditional "drop shadows" which can feel dated and muddy. We achieve lift through **Tonal Layering** and **Ambient Light**.

### The Layering Principle
Place a `surface-container-lowest` (#ffffff) card on top of a `surface-container` (#e6eeff) background. This creates a crisp, natural lift without a single pixel of shadow.

### Ambient Shadows
When an element must "float" (e.g., a modal or floating action button), use an **extra-diffused shadow**:
- **Shadow:** `0px 24px 48px rgba(13, 28, 46, 0.06)`
- The shadow color is a tinted version of `on_surface` (#0d1c2e), ensuring it feels like natural light passing through a high-end lens.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in a high-glare environment), use the **Ghost Border**:
- **Token:** `outline-variant` (#bfc9c6) at **15% opacity**.
- **Rule:** Never use 100% opaque borders.

---

## 5. Components

### Buttons
- **Primary:** Background: `primary_container` (#00534c). Text: `on_primary` (#ffffff). Shape: `rounded-md` (0.375rem).
- **Accent:** Background: `secondary` (#546500) or the `secondary_fixed` (#cef145) for high-energy "MeetUp" style actions.
- **Style:** No borders. Use a subtle inner-glow (1px inset white at 10% opacity) on the top edge for a "machined" feel.

### Cards & Lists
- **Rule:** **No divider lines.**
- Separate list items using a `surface-variant` background on hover, or simply use `spacing.4` of vertical whitespace.
- Cards must use `rounded-lg` (0.5rem) and be defined by a background shift (e.g., `surface-container-high` on `surface`).

### Input Fields
- **Base:** `surface-container-low` with a 2px bottom-only "Ghost Border" using `outline`.
- **Focus:** Transition the bottom border to `secondary` (#546500) and slightly increase the `surface` brightness.

### Engineering Metadata Chips
- Small, rectangular chips using `rounded-sm` (0.125rem).
- Background: `primary_fixed_dim` (#91d3c9) with `on_primary_fixed` text. This provides a "Blueprint Blue" feel.

---

## 6. Do's and Don'ts

### Do
- **Do** embrace extreme scale. Pair a `display-lg` headline with a `body-sm` caption for an editorial look.
- **Do** use `secondary_fixed` (#cef145) sparingly as a "laser pointer" to guide the user's eye to the most critical CTA.
- **Do** use "monolithic" alignment—flush-left everything to create a strong vertical axis reminiscent of a technical manual.

### Don't
- **Don't** use generic grey shadows. Always tint shadows with the `on_surface` color.
- **Don't** use `rounded-full` (pills) for primary buttons; it breaks the "Industrial" feel. Stick to `rounded-md` or `rounded-lg`.
- **Don't** use dividers or separators. If the layout feels cluttered, increase the `spacing` tokens between elements rather than adding a line.