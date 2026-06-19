# Landing Page Final Layout Repair

## Goal

Repair the existing Tarkana landing page without changing its concept, copy, palette, or fonts. The final page must preserve “Kinetic neo-brutalism for a fast reasoning arena” while removing collisions, inconsistent spacing, fragile responsive behavior, and ambiguous challenge states.

## Scope

This change is limited to the public web landing page and its landing-specific components, styles, motion, tests, and screenshots. Backend, authentication behavior, product features, and Android code remain untouched.

## Structural Layout

- Use one shared content container capped at 1200px.
- Use responsive horizontal gutters derived from an 8px spacing scale: 48px on wide screens, 32px on medium screens, and 16px on small screens.
- Keep full-width section wrappers for background treatment while all content aligns to the shared container.
- Remove hero viewport-height forcing and layout clipping. Let content determine height.
- Keep the two-column hero only while both columns remain readable; stack the preview below the copy on tablet and smaller viewports.
- Use section rhythm tokens rather than unrelated per-section padding values.

## Spacing System

The landing page will use the following scale:

- `--space-1`: 8px
- `--space-2`: 16px
- `--space-3`: 24px
- `--space-4`: 32px
- `--space-5`: 40px
- `--space-6`: 48px
- `--space-8`: 64px
- `--space-10`: 80px
- `--space-12`: 96px

Desktop section gaps target 80–96px. Mobile section gaps target 56–72px. Internal component spacing uses the smaller tokens. No negative margins or screenshot-specific fixed heights will be introduced.

## Navigation

- Align logo, links, login action, and primary action on the same vertical center.
- Give every interactive target at least 44×44px.
- Preserve all required navigation items.
- On compact screens, use a menu button and a document-flow menu panel.
- Manage `aria-expanded`, Escape-to-close, link-selection close, and focus return to the menu button.
- Scope and clean up any navigation GSAP timeline.

## Hero

- Preserve badge, two-line heading, body, two calls to action, microcopy, and challenge preview.
- Balance columns through grid fractions and a tokenized gap, not manual offsets.
- Keep both calls to action equal in height and visibly button-like.
- Remove `overflow-hidden`, excessive `z-index`, and viewport-height forcing from the main hero layout.
- Keep copy line lengths readable and supporting text at accessible sizes.

## Challenge Preview

Use an explicit state model:

- `prestart`: timer shows 18 seconds but does not run; question, options, progress, and stats remain readable.
- `running`: start card leaves the flow, answers become active, and the timer counts down.
- `correct`: timer stops and a labeled positive result panel appears.
- `incorrect`: timer stops and a labeled incorrect result panel appears.
- `timeout`: timer stops at zero and a labeled timeout result panel appears.
- `reset`: all transient state is cleared, timer stops, progress resets, and the component returns to `prestart`.

The start treatment is a compact card in normal document flow, not an absolute overlay. It explains timer behavior and contains the “Mulai demo” button without covering answer borders. Options use a restrained disabled treatment without blur. Result and reset controls occupy a dedicated feedback region below gameplay content.

Timer cleanup covers answer selection, timeout, reset, and component unmount. Reduced motion affects only animation, not timer behavior. Starting the demo moves focus to the first answer; resetting returns focus to the start control when practical. Timer, progress, and results expose accessible labels and live status.

## Cara Kerja

Desktop uses two distinct rows inside each step:

1. A horizontal node rail containing the connector and numbered nodes.
2. A text row below the rail containing title and description.

The connector runs only through node centers and never enters the text row. Nodes mask the connector through their own opaque fill, not text backgrounds.

Mobile uses a two-column journey: a narrow left rail with numbered nodes and a right text column. The connector is limited to the rail and stops at the final node. Each step remains in document flow with consistent spacing.

## Categories, CTA, and Footer

- Category cards use equal-height grid items, consistent icon boxes, aligned titles, and normalized padding. They remain informational and do not simulate links.
- Closing CTA height follows its content. Padding, text width, and hierarchy are tightened so the panel feels filled rather than oversized.
- Footer uses a compact primary row and a separated copyright row. Links remain touch-friendly and disclaimer text remains readable.

## Grid, Borders, and Shadows

- Grid intensity is strongest in the hero, softer through Cara Kerja, and faint behind categories.
- Closing CTA content remains opaque; footer has no grid.
- Remove body-wide animated background parallax.
- Use three shadow levels: small controls/cards, major interactive panels, and the focal closing CTA.
- Keep border thickness and shadow direction consistent. Shadows remain visible without clipping or causing horizontal overflow.

## GSAP

- Keep restrained entrance motion and purposeful challenge feedback.
- Scope selectors with `gsap.context` or component-local elements.
- Use `gsap.matchMedia` for reduced-motion handling.
- Kill local timelines and ScrollTriggers during teardown; never kill unrelated global triggers.
- Clear animation transforms after entrances settle so final layout comes from CSS.
- Remove perpetual background parallax and category hover listeners whose anonymous callbacks cannot be removed correctly.
- Content must be visible when JavaScript fails and immediately visible under reduced motion.

## Accessibility

- Preserve one `h1` and ordered section headings.
- Use anchors for navigation and buttons for actions.
- Maintain visible focus states and 44×44px targets.
- Support keyboard start, answer selection, reset, mobile menu operation, and Escape closing.
- Give timer and progress semantic accessible values.
- Announce result states with `aria-live`; include text/icons so color is never the sole signal.

## Verification

Playwright will verify 320×568, 375×667, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 1280×720, 1366×768, 1440×900, and 1920×1080.

At every viewport, checks cover horizontal overflow, container alignment, hero wrapping, challenge pre-start placement, answers, stats, connector/text separation, category sizing, CTA ratio, footer, and shadows. Dedicated checks cover running, correct, incorrect, timeout, reset, keyboard flow, mobile menu, and reduced motion.

Required repository checks are:

- `npm.cmd run check`
- `npm.cmd run lint`
- `npm.cmd run test:unit -- --run`
- `npm.cmd run test:e2e`
- `npm.cmd run build`

Before and after screenshots are stored under `.codex-artifacts/final-layout-repair/`.

