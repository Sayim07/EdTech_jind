# Frontend Design & UI Standards (Impeccable Anti-Slop Directive)

All frontend and UI generation in this project must strictly comply with **Impeccable** standards to eliminate generic "AI slop" and deliver distinctive, production-grade craft.

## Impeccable Design Commands
The `impeccable` skill is installed. Use the following workflows when working on UI:
- `/impeccable shape [feature]`: Plan UI/UX before coding.
- `/impeccable critique [target]`: Heuristic review covering hierarchy, clarity, and UX patterns.
- `/impeccable audit [target]`: Technical quality checks (contrast, accessibility, responsive behavior).
- `/impeccable polish [target]`: Final quality pass for visual hierarchy, spacing rhythm, and micro-details.
- `/impeccable bolder` / `/impeccable quieter`: Dial visual weight up or down.
- `/impeccable typeset` / `/impeccable layout` / `/impeccable colorize`: Deep typography, spacing, or color tuning.
- `/impeccable harden`: Production edge cases (empty states, errors, overflow, localization).

## Anti-Pattern Bans (Refuse Category Defaults)
1. **No Lazy Card Grids**: Never default to uniform grids of icon + title + description cards. Cards are lazy containers; nested cards are banned.
2. **No Eyebrow/Kicker Labels**: Never place tiny pill tags or uppercase kickers directly above main section headings. Headings must carry their own weight.
3. **No Gradient Text**: Never use gradient text for headings or emphasis. Use typography weight, size, and scale.
4. **No Gratuitous Glassmorphism**: Avoid arbitrary backdrop blurs, glow effects, or decorative glass styles that lack purpose.
5. **No Cliché Decorative Accents**: Avoid colored thick left borders (`border-left > 1px`) on cards/callouts, fake neobrutalist block shadows (`4px 4px 0`), and arbitrary section numbers (`01`, `02`, `03`).
6. **No Pseudo-Icons / Emojis**: Never use emoji or unicode characters in place of an icon system. Use crisp, consistent SVGs (e.g., Lucide, Heroicons) with unified stroke width.
7. **No Monospace as "Tech Costume"**: Reserve monospace solely for actual code, numeric tabular data, and terminal output.

## Craft Floor Requirements
- **Contrast**: Body text and inputs must meet ≥4.5:1; large text must meet ≥3:1 against their backgrounds.
- **Typography**: Set body measure to 65–75 characters per line (`max-w-prose` / `max-w-[65ch]`), tracking floor `-0.04em` on large display headings, and clear hierarchical steps.
- **Comprehensive States**: Every interactive element must define hover, focus-visible (with accessible custom ring), active, disabled, loading, and error states.
- **Themed Browser Surfaces**: Theme text selection (`::selection`), scrollbars, carets, and focus rings to match the design palette.
- **Intentional Motion**: Use purposeful, smooth ease-out animations on user interactions rather than cluttered entrance effects on every element.

## Visual Feedback & In-Browser Editing (Agentation)
The `agentation` skill and MCP server are configured for this project.
- **Localhost Only**: The Agentation popup toolbar must only run in local development (`localhost` / `127.0.0.1`) and is strictly banned from production builds.
- **Interactive Fix Loop**: When the user requests an annotation review or watch loop, call `agentation_get_all_pending` or `agentation_watch_annotations`, acknowledge each annotation (`agentation_acknowledge`), apply the requested code edits, and mark resolved (`agentation_resolve`).

