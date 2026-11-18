---
version: alpha
name: Coursera-design-analysis
description: "An online course catalog built on a published token set: one deep blue (#0056d2) on white and pale blue tints, Source Sans Pro throughout, an 8px corner scale and 36 high buttons."
status: Draft
appVersion: "measured in a browser, 2026-10-06"
platformsCovered: [Web]
reviewer: ""
verifiedAt: ""

colors:
  primary: "#0056d2"
  on-primary: "#ffffff"
  primary-hover: "#0060eb"
  primary-deep: "#0b408b"
  navy: "#002457"
  ink: "#0d0f12"
  ink-muted: "#48546e"
  canvas: "#ffffff"
  canvas-subtle: "#f2f5fa"
  tint: "#e3eeff"
  tint-soft: "#f0f6ff"
  tint-faint: "#f4faff"
  border: "#dae1ed"
  positive: "#1e6a16"
  warm: "#ffeac9"

typography:
  display:
    fontFamily: "'Source Sans Pro', Arial, sans-serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 56px
    letterSpacing: -0.48px
  heading:
    fontFamily: "'Source Sans Pro', Arial, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.28px
  subheading:
    fontFamily: "'Source Sans Pro', Arial, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: -0.06px
  body:
    fontFamily: "'Source Sans Pro', Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  label:
    fontFamily: "'Source Sans Pro', Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  meta:
    fontFamily: "'Source Sans Pro', Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
  button:
    fontFamily: "'Source Sans Pro', Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0.14px

rounded:
  xs: 2px
  sm: 4px
  md: 8px
  lg: 16px
  xl: 24px
  xxl: 32px
  pill: 50px

spacing:
  xs: 2px
  sm: 4px
  base: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 8px 16px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 8px 16px
  filter-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    height: 36px
    padding: 8px 16px
  search-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  card-meta:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.xs}"
    height: 18px
    padding: 0
---

## Overview

Coursera is an online course catalog. The design runs on a published token set that the page exposes directly: one deep blue on white and a family of pale blue tints, a single type family at every size, and an 8px corner on nearly every control. [Observed]

What defines the look:

1. **One deep blue, with a ramp behind it.** `#0056d2` fills the primary button and marks every link. It is step 800 of a published 15 step blue ramp that runs from `#001129` to `#f0f6ff`. [Measured]
2. **Pale blue tints instead of gray.** Section bands use `#f2f5fa`, `#e3eeff`, `#f0f6ff` and `#f4faff`, so the page separates by hue rather than by borders. [Measured]
3. **One family does everything.** Source Sans Pro sets the 48px hero and the 12px card meta alike, with weight and tracking carrying the hierarchy. [Measured]
4. **Negative tracking above, positive below.** Headings tighten from -0.48px down to -0.06px, and buttons open up to +0.14px. [Measured]
5. **A published scale.** Spacing runs 2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 80, 112 and radii run 2, 4, 8, 16, 24, 32 and a 50px pill, all named in the page. [Measured]

Source for this file: the Coursera home page and the course catalog page measured in a browser at 1440 and 390 wide, read on 2026-10-06. The 220 `--cds-` custom properties published on the page were read as a cross-check and supply the role names and the exact ramp steps below. No app captures were used. See Known Gaps.

## Core

### Colors

Coursera publishes its token names in the page, so these are its own role names. [Measured]

| Role | Token | Value | Where |
|------|-------|-------|-------|
| Primary | `--cds-color-blue-800` | `#0056d2` | Primary button, links |
| Primary hover | `--cds-color-blue-750` | `#0060eb` | Pressed and hover states |
| Deep blue | `--cds-color-blue-850` | `#0b408b` | Dark blue text |
| Navy | `--cds-color-blue-950` | `#002457` | Dark promotional bands |
| Tint | `--cds-color-blue-50` | `#e3eeff` | Feature bands |
| Tint soft | `--cds-color-blue-25` | `#f0f6ff` | Notice panels |
| Text | | `#0d0f12` | Titles and body |
| Secondary text | | `#48546e` | Card meta, skill lists |
| Page | | `#ffffff` | Cards and the main surface |
| Panel | | `#f2f5fa` | Section bands |
| Positive | `--cds-color-green-800` | `#1e6a16` | Success states |
| Warm | | `#ffeac9` | Promotional highlight |

The blue ramp has 15 steps from `#001129` at 975 to `#f0f6ff` at 25, and a matching green ramp runs alongside it. Opacity ramps are published separately as darken and lighten layers over `rgba(15, 17, 20, n)` and white. [Measured]

### Typography

Source Sans Pro sets the entire page, loaded at 400 and 700 and used at 400, 600 and 700. The hero is 48 on 56 at 600 with -0.48px tracking, dropping to 32 on 40 at 390. Section headings are 28 on 32 at 600 with -0.28px, card headings 20 on 24 at 600 with -0.06px, body 16 on 24 at 400, card labels 14 on 20, and the skill lists 12 on 18. Buttons invert the tracking to +0.14px at 14 on 20 at 600. [Measured]

The family is openly licensed, so it needs no stand-in. Coursera also publishes a second family token, Boutros Coursera, for Arabic. [Measured]

### Shape and spacing

Radii are published as 2, 4, 8, 16, 24, 32 and a 50px maximum. In use, 8 dominates on buttons, fields and cards, 16 and 20 appear on filter chips, 50 on round tags, and 24 on the compact header search. Spacing is published as 2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 80 and 112. Buttons and chips are 36 high, the search field 48, and header links 40 to 44. [Measured]

### Iconography and motion

Icons are inline shapes sized to the 14 and 16px text. A blue focus ring is drawn with a spread shadow in the primary blue rather than an outline. Motion was not measured. [Measured for the focus ring, Observed for the icons, Inferred for motion]

### Themes

Light on every page measured. The published token set includes a full darken ramp, but no dark surface was reachable on the public pages. [Observed]

## Platform: iOS

The Coursera iOS app was not captured. The notes below follow from the web design and platform conventions.

### Back and up navigation

Expected on iOS: Chevron plus previous title, swipe from the left edge.

Chevron plus previous title with the edge swipe, as the platform expects. Not confirmed on a device. [Inferred]

### Primary navigation

Expected on iOS: Bottom tab bar, about five items.

A bottom tab bar for the main areas of a learning service. [Inferred]

### Main action

Expected on iOS: Nav bar or bottom bar button.

A blue enroll button, carried over from the web. [Inferred]

### Sheets, dialogs and messages

Expected on iOS: Action sheets, alerts, modals.

Filters are expected as a sheet, since the 390 web view collapses them into a Filter and Sort button. [Inferred]

### Controls

Expected on iOS: Cupertino switches, pickers, segmented controls.

Not measured. [Inferred]

### Text sizing

Expected on iOS: Dynamic Type.

Not measured. [Inferred]

### Touch and pointer targets

Expected on iOS: 44pt minimum.

Not measured. The web buttons are 36 high, below the 44pt minimum, so the app is expected to use taller targets. [Inferred]

### Insets and system bars

Expected on iOS: Safe areas, status bar.

Not measured. [Inferred]

### Icons

Expected on iOS: SF Symbols or custom.

Not measured. [Inferred]

### Account and sign-in rules

Expected on iOS: Equivalent login option when third-party sign-in exists (Guideline 4.8) and in-app account deletion. Note the date checked.

Not verified. Sign-in rules and account deletion were not checked. [Inferred] Checked: 2026-10-06 against the public web only.

### Platform conformance

Expected on iOS: For each important component: what iOS expects, what this app does, and why it deviates.

The app is expected to share the blue, the pale tints and the single type family with the web. [Inferred]

## Platform: Android

The Coursera Android app was not captured. The notes below follow from the web design and platform conventions.

### Back and up navigation

Expected on Android: System back and gesture, up arrow in the top bar.

Chevron plus previous title with the edge swipe, as the platform expects. Not confirmed on a device. [Inferred]

### Primary navigation

Expected on Android: Navigation bar, rail on tablets.

A bottom navigation bar for the main areas of a learning service. [Inferred]

### Main action

Expected on Android: Floating action button.

A blue enroll button. No floating action button was seen on the web, and none is assumed. [Inferred]

### Sheets, dialogs and messages

Expected on Android: Bottom sheets, dialogs, snackbars.

Filters are expected as a bottom sheet, since the 390 web view collapses them into a Filter and Sort button. [Inferred]

### Controls

Expected on Android: Material switches, pickers, chips.

Not measured. [Inferred]

### Text sizing

Expected on Android: Font scale.

Not measured. [Inferred]

### Touch and pointer targets

Expected on Android: 48dp minimum.

Not measured. The web buttons are 36 high, below the 48dp minimum, so the app is expected to use taller targets. [Inferred]

### Insets and system bars

Expected on Android: Edge to edge, system bars.

Not measured. [Inferred]

### Icons

Expected on Android: Material Symbols or custom.

Not measured. [Inferred]

### Account and sign-in rules

Expected on Android: Account deletion and data safety requirements. Note the date checked.

Not verified. Account deletion and data safety entries were not checked. [Inferred] Checked: 2026-10-06 against the public web only.

### Platform conformance

Expected on Android: For each important component: what Android expects, what this app does, and why it deviates.

The app is expected to share the blue, the pale tints and the single type family with the web. [Inferred]

## Platform: Web

The Coursera home page and the course catalog page, measured at 1440 and 390 wide.

### Back and up navigation

Expected on Web: Browser back, breadcrumbs.

Browser back. The catalog keeps its filter state in the left column rather than in a trail. [Observed]

### Primary navigation

Expected on Web: Top nav or sidebar.

A navy top strip carrying the audience links (For Individuals, For Businesses and the rest) at 16 on 40, with the main white bar below holding the mark, an Explore button, a 48 high search field and the account links. [Measured]

### Main action

Expected on Web: Page-level button.

The primary button: `#0056d2` fill, white text at 14 on 20 at 600 with +0.14px tracking, 8px corner, 36 high. A round 36px variant carries the search submit. [Measured]

### Sheets, dialogs and messages

Expected on Web: Modals, toasts.

Not measured on the public pages. At 390 the filters collapse behind a Filter and Sort button. [Observed]

### Controls

Expected on Web: Native or custom.

Filter chips 36 high with a 20px corner, a 48 high search field, checkbox filter rows in the left column, and white secondary buttons with blue text. [Measured]

### Text sizing

Expected on Web: Browser zoom.

Sizes are fixed pixel values. The hero drops from 48 to 32 and section headings from 28 to 20 between 1440 and 390. [Measured]

### Touch and pointer targets

Expected on Web: Pointer and keyboard.

Buttons and chips are 36 high, the search field 48, and header links 40 to 44. Focus is shown with a blue spread shadow. [Measured]

### Insets and system bars

Expected on Web: Viewport, scrollbars.

Not measured. [Inferred]

### Icons

Expected on Web: Any.

Inline shapes sized to the 14 and 16px text. [Observed]

### Account and sign-in rules

Expected on Web: Not applicable unless the product has accounts.

Log In and Join for Free sit in the header. The catalog and course listings read without an account. [Observed]

### Platform conformance

Expected on Web: For each important component: what the web norm is, what this app does, and why it deviates.

The responsive page keeps the type family, the blue and the 8px corner, collapses the left filter column into a button and re-flows the card grid at 390. [Measured]

## Cross-platform consistency

Consistent across the measured widths: the primary blue, the pale blue tints, the single type family and the 8px corner. [Measured]

Intentionally different: at 390 the left filter column becomes a single Filter and Sort button and the hero type halves. The apps were not measured. [Measured for web, Inferred for the apps]

## Do's and Don'ts

### Do

- Take colors from the published ramp steps rather than mixing new blues.
- Separate sections with pale blue tints instead of borders.
- Set every level in the one family and let weight and tracking carry the hierarchy.
- Tighten tracking on headings and open it on buttons.
- Keep buttons and chips at 36 high with an 8px corner.

### Don't

- Don't introduce a second accent color. The ramp already covers the range.
- Don't use gray panels where a blue tint is expected.
- Don't draw a hard outline for focus. The design uses a blue spread shadow.
- Don't set card meta above 12 on 18.

## Known Gaps

- The signed-in learning experience, the lesson player and the grading screens were not measured, since they sit behind enrollment.
- The published token set includes a darken ramp, but no dark surface was reachable, so no dark values are given.
- The iOS and Android apps were not captured. Their sections are inferred from the web design and platform conventions.
- Motion, transitions and the icon set were not measured.
- Account deletion and store policy rules were not verified.
- No font stand-in was needed. Source Sans Pro is openly licensed, and the specimen draws it as Source Sans 3, the current release of the same family.
