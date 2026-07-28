---
name: Azlan Dairy Aesthetic
colors:
  surface: '#f9faf5'
  surface-dim: '#d9dad6'
  surface-bright: '#f9faf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4ef'
  surface-container: '#edeee9'
  surface-container-high: '#e8e9e4'
  surface-container-highest: '#e2e3de'
  on-surface: '#1a1c19'
  on-surface-variant: '#414941'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f0f1ec'
  outline: '#727971'
  outline-variant: '#c1c9bf'
  surface-tint: '#3d6846'
  primary: '#00230c'
  on-primary: '#ffffff'
  primary-container: '#0e3a1d'
  on-primary-container: '#78a57f'
  inverse-primary: '#a3d2a9'
  secondary: '#754c98'
  on-secondary: '#ffffff'
  secondary-container: '#daacff'
  on-secondary-container: '#623a85'
  tertiary: '#001e3d'
  on-tertiary: '#ffffff'
  tertiary-container: '#003361'
  on-tertiary-container: '#4d9dfb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#beeec4'
  primary-fixed-dim: '#a3d2a9'
  on-primary-fixed: '#00210b'
  on-primary-fixed-variant: '#254f30'
  secondary-fixed: '#f1daff'
  secondary-fixed-dim: '#dfb7ff'
  on-secondary-fixed: '#2d004f'
  on-secondary-fixed-variant: '#5c347e'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a5c8ff'
  on-tertiary-fixed: '#001c3a'
  on-tertiary-fixed-variant: '#004785'
  background: '#f9faf5'
  on-background: '#1a1c19'
  surface-variant: '#e2e3de'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The design system is centered on a "Farm-to-Table Premium" narrative. It balances the rustic, wholesome nature of dairy production with the sophisticated, modern service of a high-end restaurant. The brand personality is **fresh, vibrant, and trustworthy**, aiming to evoke a sense of purity and culinary excellence.

The visual style follows a **Modern Corporate** approach with a **Tactile** twist. It uses expansive whitespace (off-white and soft mint) to represent cleanliness and freshness, while employing rich, saturated accents to denote quality and flavor. Subtle depth is added through soft shadows, suggesting physical layers of fresh ingredients and prepared dishes.

## Colors

The palette is derived directly from the heritage of the logo, optimized for digital interfaces.

- **Primary (Deep Green):** Used for main navigational elements, primary buttons, and headings to ground the design in nature and growth.
- **Secondary (Royal Purple):** Used for secondary actions, special highlights, and luxury accents.
- **Vivid Blue & Sunny Yellow:** Used sparingly for functional status (blue) and appetite-stimulating accents or promotional badges (yellow).
- **Background (Soft Mint):** An off-white base with a slight green tint (#F4F9F6) is used for the main canvas to reduce eye strain and reinforce the "dairy-fresh" theme.

## Typography

This design system uses **Plus Jakarta Sans** for all levels. Its modern, slightly rounded geometric forms mirror the friendly and approachable nature of a family-run dairy while maintaining the precision of a high-end restaurant.

Headlines should use tighter letter spacing and heavier weights to feel "meaty" and impactful. Body text uses a generous line height (1.5x - 1.6x) to ensure legibility, especially when describing menu items and ingredients. Mobile headings scale down to ensure no word breaking on smaller viewports.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model built on an 8px baseline. 

- **Desktop:** 12-column grid with 24px gutters and 48px side margins. 
- **Tablet:** 8-column grid with 24px gutters and 24px side margins.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.

Content is spaced with a "Breathing Room" approach—ample top and bottom margins (80px+) are used between sections to allow high-quality food photography to take center stage without feeling cluttered.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** combined with **Ambient Shadows**. 

1.  **Level 0 (Background):** Soft Mint (#F4F9F6) base.
2.  **Level 1 (Cards/Surfaces):** Pure White (#FFFFFF) surfaces with a very soft, diffused shadow (15% opacity of the Deep Green color, 20px blur, 4px Y-offset).
3.  **Level 2 (Interactive/Floating):** Higher elevation for buttons and active states, using a more pronounced shadow to invite interaction.

Avoid harsh black shadows; all depth should feel "organic" by tinting shadows with the primary Green.

## Shapes

The design system adopts a **Rounded** shape language. This avoids the clinical feel of sharp corners and aligns with the fluid, natural shapes of dairy products (like milk splashes or cheese wheels).

- **Standard Buttons & Inputs:** 0.5rem (8px) radius.
- **Feature Cards & Modals:** 1rem (16px) radius.
- **Promotional Chips/Badges:** Pill-shaped (fully rounded) to contrast against structural elements.

## Components

### Buttons
- **Primary:** Deep Green background, White text. High-contrast, 0.5rem radius.
- **Secondary:** Royal Purple background, White text. Used for "Book a Table" or secondary CTA.
- **Ghost:** Deep Green outline, 2px border, used for less urgent actions.

### Cards
Cards are the primary container for menu items. They feature a pure white surface, rounded corners (16px), and high-resolution imagery that bleeds to the top. Price tags are anchored to the top right in a Sunny Yellow pill-shaped badge for visibility.

### Inputs
Text fields should have a Soft Mint background with a subtle Deep Green 1px border. On focus, the border thickens to 2px and the shadow intensity increases.

### Lists & Menus
Menu lists use generous vertical padding. Item names are set in Headline-MD (Deep Green), with descriptions in Body-MD (Grey/Green mix) to create a clear typographic hierarchy.

### Accents
Utilize the Vivid Blue for functional elements like "Fresh Today" indicators or "Organic Verified" badges to ensure they pop against the warmer green/purple tones.