---
name: Air Canvas
description: A precise, approachable studio for local hand-guided drawing.
colors:
  primary: "#3158d5"
  primary-deep: "#2344b3"
  primary-soft: "#eaf0ff"
  sunset-ink: "#e56b49"
  turquoise-ink: "#258474"
  wheat-ink: "#bd8f31"
  iris-ink: "#9363b4"
  page: "#eef2f8"
  paper: "#fff"
  text: "#26334d"
  muted: "#56647e"
  line: "#dbe2ed"
  success: "#207965"
  destructive: "#a63335"
  focus: "#6383e6"
typography:
  headline:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "32px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "12px"
    fontWeight: 600
rounded:
  panel: "12px"
  control: "8px"
  inset: "6px"
  tag: "4px"
spacing:
  tight: "6px"
  small: "8px"
  control: "12px"
  compact: "16px"
  panel: "18px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  button-soft:
    backgroundColor: "{colors.primary-soft}"
    textColor: "#3353ac"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-text:
    textColor: "{colors.muted}"
    padding: "3px 0"
  state-tag:
    backgroundColor: "{colors.page}"
    textColor: "{colors.muted}"
    rounded: "{rounded.tag}"
    padding: "3px 7px"
  control-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "18px"
  tool-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    rounded: "5px"
    padding: "7px"
  dwell-palette:
    backgroundColor: "#f8fafd"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
---

# Design System: Air Canvas

<!-- Extracted 2026-11-12 from styles.css (including its final overrides), index.html, src/app.js, and src/drawing.js. Reviewed against .impeccable/review/mobile.png. Qualitative names and rules below are implementation decisions under delegated design authority, not recorded user approvals. -->

## Overview

**Creative North Star: "The Quiet Drawing Studio"**

The Quiet Drawing Studio is calm, precise, and approachable. Pale blue surrounds white working surfaces, deep navy makes compact Chinese controls readable, and cobalt gives actions a clear visual center. The system keeps the artwork brighter and more spatially generous than its surrounding instruments.

Controls feel restrained and responsive: thin dividing lines, gently curved rectangular panels, small outline SVG icons, and factual state text. Color belongs to the user's ink and to meaningful interaction states; decorative depth stays minimal.

**Key Characteristics:**
- White work surfaces on a cool pale-blue shell.
- Compact CJK interface type with explicit action and status labels.
- Cobalt actions, warm drawing ink, and quiet outlined containers.
- Flat panels with visible keyboard focus and accessible alternate input.

## Colors

A cool studio palette supports a warmer, freely chosen ink palette. The frontmatter is the normative source for color values.

### Primary
- **Studio Cobalt** (`primary`): primary camera and export actions, active tools, ranges, cursor, and dwell progress.
- **Deep Cobalt** (`primary-deep`): the primary action's hover state.
- **Cobalt Wash** (`primary-soft`): secondary filled actions.

### Secondary
- **Sunset Ink** (`sunset-ink`): default drawing color, active drawing status, and the pinching cursor.
- **Turquoise Ink**, **Wheat Ink**, and **Iris Ink**: selectable artwork colors, not competing interface action colors. The ink palette also offers Studio Cobalt and the deep text color.

### Neutral
- **Studio Air** (`page`): the page shell, inactive tool group, and neutral state tag.
- **Drawing Paper** (`paper`): drawing surface, toolbar, status strip, and control panels.
- **Midnight Ink** (`text`): headings, control text, and the darkest drawing ink.
- **Slate Caption** (`muted`): secondary instructions, readouts, and quiet actions.
- **Fine Rule** (`line`): panel outlines, dividers, and structural separation.

Success green identifies a ready/live state; destructive red identifies the clear confirmation and recording-related warnings. The focus color is reserved for keyboard outlines.

**The Action and Ink Rule.** Use cobalt for primary interface actions; preserve the selected artwork color independently of interface state.

## Typography

**Interface Font:** Segoe UI, Microsoft YaHei, PingFang SC, sans-serif.

**Character:** The implemented stack is a practical operating-interface choice with local CJK coverage. Hierarchy comes from size, weight, spacing, and contrast rather than a second display face.

### Hierarchy
- **Headline:** the desktop page heading; scales to 36px on wide screens, 28px at the compact desktop breakpoint, and 24px on phones.
- **Title:** the empty-canvas invitation; its responsive sizes are 21px at compact desktop, 26px in the single-column tablet arrangement, and 18px on phones.
- **Body:** explanatory copy is 13px on desktop; the canvas invitation uses 1.9 line height. The guide uses 1.9, while the studio note uses 1.75. Phone guide and note copy use 12px.
- **Label:** 12px controls, field labels, navigation, readouts, and panel headings; weights generally range from 400 for secondary text to 600/650 for action and panel hierarchy. Use tabular numerals for inference timing.
- **Section title:** the guide heading is 18px normally, 16px at compact desktop/tablet widths, and 17px on phones.

**The Readable Instrument Rule.** Reuse the 12px functional label scale; do not inherit the smaller brand strapline or isolated 11px mobile exceptions as a control-text standard.

## Layout

The desktop shell is centered at a maximum width of 1440px. Header and main use 48px horizontal padding; the main begins 31px below the header. The working area is a flexible canvas column plus a 280px control rail, separated by 24px. The guide is a four-column row beneath the studio, divided by fine horizontal rules.

At widths up to 1100px, horizontal shell padding becomes 28px, the rail is 248px, the gap is 18px, and panel padding becomes 16px. At widths up to 820px, the studio becomes a single column. The control rail becomes two columns below the canvas: tracking occupies the left column, and brush/settings occupy the right. The guide becomes two columns. The camera monitor changes from 4:3 to 16:9.

At widths up to 540px, main padding is 16px horizontally and header padding is 20px. The two-column control rail remains, its panel padding becomes 14px 12px, camera preview returns to 4:3, and readouts wrap. The guide becomes a single column, status and footer wrap, and nonessential shortcut hints and autosave text are hidden. The drawing surface stays 16:10 at every breakpoint to match the 1600 × 1000 artwork.

Use the extracted spacing vocabulary for repeated relationships: tight icon gaps, small control gaps, compact content padding, panel padding, and section spacing. Fine one-pixel borders establish grouping.

**The Paper Proportion Rule.** Preserve the 16:10 drawing surface when reflowing the surrounding studio.

## Elevation & Depth

Panels are flat white surfaces defined by borders and tonal contrast, not lifted cards. The camera monitor is an inset blue-gray region. Only transient toast feedback uses a diffuse shadow.

### Shadow Vocabulary
- **Transient notification:** `0 6px 24px #13284b26`; reserved for the fixed toast above the page.

**The Flat Instrument Rule.** Keep persistent panels flat; use the notification shadow for temporary feedback.

Motion is brief and functional: filled buttons transition background and shadow over 0.18s with ease; the dwell progress bar updates width over 0.05s linearly. Swatches scale slightly on hover. Respect the implemented reduced-motion media query, which disables transitions and animations and removes smooth scrolling.

## Shapes

Panels use the panel radius; buttons, palette trays, and camera monitor use the control radius. Smaller inset previews and icon buttons use the inset radius, while tags use the compact tag radius. The joined toolbar, paper, and status strip form one continuous sheet: only the external top and bottom corners curve.

Swatches, source-status dots, and the hand cursor are circular. The active swatch has an offset outline in its own ink color. Icons are inline, round-ended outline SVGs, typically 16–20px, with larger hand illustrations inside the camera placeholder. Preserve these functional silhouettes instead of substituting text glyphs.

## Components

### Buttons
Restrained, compact actions with clear hierarchy.
- **Primary:** the primary component token defines its normal shape, padding, and minimum height; hover uses Deep Cobalt.
- **Secondary:** Cobalt Wash with darker blue text; hover background is `#dce6ff`.
- **Destructive:** red fill with white text, used in the compact clear confirmation.
- **Text:** transparent and muted, becoming cobalt on hover or pressed state.
- **Icon-only:** transparent 32px square buttons, 30px on phones, with a pale page hover fill; disabled controls have 0.35 opacity and a not-allowed cursor.
- **Focus:** a 3px focus outline with 4px offset; input controls use a 3px offset. Do not remove the native button semantics or accessible names.

### Chips
Factual source badges rather than decorative categories.
- Neutral tags use the neutral component token; live tags use green text on `#e3f3eb`.
- Pair color with explicit source/state wording; camera, sample, and imported-media modes remain distinguishable.

### Cards / Containers
White, bordered instruments.
- Persistent control containers use Fine Rule borders and the panel radius, without shadows.
- The desktop rail sections use 18px padding, with responsive reductions recorded in Layout.
- The drawing container joins its toolbar, stage, and status strip; internal separators should not become stacked-card gaps.

### Inputs / Fields
Native controls with a cobalt accent.
- Range fields use the browser's native range control at 18px height, paired with an explicit label and numeric or qualitative output.
- Checkboxes are native 14px squares with the same accent.
- Give keyboard focus the explicit outline. Preserve native input behavior and accessible labels rather than replacing controls with decorative tracks.

### Navigation
Quiet, inline utility navigation.
- Header navigation uses 12px type with a 28px desktop gap; the guide link becomes cobalt on hover.
- The privacy note combines a small success dot with text; it is hidden at the phone breakpoint while the guide link remains.
- Keep real anchors for in-page destinations and real buttons for actions.

### Tool Switch
An inset segmented tool group.
- The group uses the page tone, 3px padding, a 7px radius, and a 3px internal gap.
- Each option is a transparent 35px-minimum-height button; the active option becomes white with a fine blue-gray border, blue text, and a 5px radius.
- On phones, options become 31px high and shortcut hints disappear. Maintain `aria-pressed` on both tool buttons.

### Dwell Palette
The studio's signature hand-selection instrument.
- A compact, pale tray at the paper's upper-left contains four circular inks and a textual purpose label.
- The normal tray is 16px from the top and 20px from the left; phones use 12px on both axes.
- Selection uses an ink-colored outline; a cobalt line grows across the tray's bottom while the hand dwells. Actual selection occurs after the implemented 0.7-second dwell.
- The cursor is a 27px outlined circle with a center dot. Cobalt means tracking; warm ink means pinching. Keep click and keyboard activation available for swatches.

## Do's and Don'ts

### Do:
- **Do** keep primary actions cobalt and user-selected drawing ink independent.
- **Do** preserve the drawing paper's 16:10 proportion across responsive layouts.
- **Do** use fine borders and tonal insets to group persistent instruments.
- **Do** retain native controls, explicit state text, pressed states, and visible keyboard focus.
- **Do** honor reduced motion and keep alternate pointer input available.

### Don't:
- **Don't** elevate persistent panels with the toast's shadow.
- **Don't** turn the mobile brand strapline or isolated 11px exceptions into a functional-label token.
- **Don't** rely on color alone to communicate input source or tracking state.
- **Don't** replace the existing outline SVG icon language with typographic glyph icons.
