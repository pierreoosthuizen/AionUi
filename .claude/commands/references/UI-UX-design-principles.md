# UI/UX Design Principles — Reference

Foundational design principles for Android, iOS (Swift), and web development.
Source: _Every UI/UX Concept Explained in Under 10 Minutes_

Maintain this file as the single source of truth. Update it whenever design
conventions evolve — the skill command reads it fresh on every invocation.

---

## Visual Hierarchy

Establish a clear reading order so users know where to look first.

- Use size, weight, and position to signal importance
- Larger, bolder items at the top are perceived as most important
- Right-align price and numeric data to draw the eye naturally
- Use images to aid scanning and add visual interest

---

## Signifiers and Interaction States

Every interactive element must have all applicable states styled — an unstyled
state is a design bug, not a missing feature.

| State            | Description                                    |
| ---------------- | ---------------------------------------------- |
| Default          | Normal resting appearance                      |
| Hover            | Visual response on cursor over (web / desktop) |
| Active / Pressed | Visible feedback during press or tap           |
| Disabled         | Grayed out, non-interactive, not focusable     |

- Use containers to group related items
- Use grayed-out text for inactive states
- Highlight active navigation items
- Always provide system feedback: loading spinners, success messages, error toasts

---

## Spacing — The 4-Point Grid

All padding, margins, gaps, and component sizing must use multiples of 4.

Common values: 4, 8, 12, 16, 24, 32, 48, 64 (px / dp / pt)

- Consistent across screen densities — critical for Android dp and iOS pt
- Related elements (e.g. label + subtext) sit closer together than unrelated ones
- Let elements breathe — negative space is not wasted space

---

## Typography

- One font family only — sans-serif preferred
- Maximum six size variants to maintain hierarchy
- Large display / header text:
  - Letter spacing: -2% to -3%
  - Line height: 110% to 120%

---

## Color — Semantic Use

| Colour | Role                        |
| ------ | --------------------------- |
| Blue   | Trust / informational       |
| Red    | Danger / destructive action |
| Yellow | Warning                     |
| Green  | Success / confirmation      |

**Dark mode depth:** elevated surfaces (cards, sheets, modals) are _lighter_
than the background — opposite of light mode which uses shadows.

---

## Shadows

Shadows must be subtle. If the shadow registers before the content, it is too strong.

- High blur radius, low opacity
- Applies to card elevation, bottom sheets, modals, and dropdowns

---

## Components and Micro-interactions

### Icons

Match icon size to the line height of adjacent text.
Example: 24px line height → 24px icon.

### Buttons

| Type                    | Use                                  |
| ----------------------- | ------------------------------------ |
| Filled / solid          | Primary CTA only — one per view      |
| Ghost (border, no fill) | Secondary actions                    |
| Text only               | Tertiary / destructive confirmations |

### Micro-interactions

Every user action needs visible confirmation — silence feels broken.
Examples: copied chip slides up, toast animates in, checkbox animates on select.

---

## Quick Reference Checklist

- [ ] Clear visual hierarchy — primary action is immediately obvious
- [ ] All interactive elements have all applicable states styled
- [ ] All spacing uses multiples of 4
- [ ] Single font family, max 6 size variants
- [ ] Display text has tightened letter spacing and compressed line height
- [ ] Semantic colours used consistently
- [ ] Dark mode uses lighter surfaces for elevation (not shadows)
- [ ] Shadows are subtle — high blur, low opacity
- [ ] Icon size matches adjacent text line height
- [ ] One filled button per view for primary CTA; ghost for secondary
- [ ] Every user action has visible feedback
