---
description: Apply Pierre's UI/UX design principles when designing or reviewing a UI. Use alongside the /frontend-design skill — frontend-design sets the creative direction, this skill enforces the design system constraints. Invoke when asked to design a UI, build a screen, review a design, or check a component for design consistency.
allowed-tools: Read, Write, Edit, Glob, Bash
---

Apply Pierre's UI/UX design principles to the task described in $ARGUMENTS.

## Reference

Read ~/.claude/commands/references/UI-UX-design-principles.md before starting.
This is the single source of truth — always read it fresh so any updates
Pierre has made are picked up automatically.

## Relationship with /frontend-design

These two skills have distinct roles and work best together:

| Skill                       | Role                                                                           |
| --------------------------- | ------------------------------------------------------------------------------ |
| `/frontend-design`          | Creative direction — aesthetic, typography choices, motion, visual identity    |
| `/use-ui-design-principles` | Design system constraints — spacing, states, colour semantics, component rules |

**When used together:** run `/frontend-design` first to establish the aesthetic
direction and generate the initial implementation, then apply this skill to audit
and enforce the design system rules. Alternatively, apply this skill upfront to
set constraints before generating any code.

**When used alone:** apply the full checklist below to the described UI task,
incorporating both the creative implementation and the constraint enforcement
in one pass.

## Platform Detection

Identify the target platform from context and apply the correct units and
patterns:

| Platform                | Spacing unit | Notes                                         |
| ----------------------- | ------------ | --------------------------------------------- |
| Android (XML / Compose) | dp           | Material Design elevation for dark mode cards |
| iOS (UIKit / SwiftUI)   | pt           | Use system semantic colours where possible    |
| Web                     | px / rem     | rem preferred for accessibility scaling       |
| React Native            | dp (logical) | StyleSheet values map to dp/pt automatically  |

## Process

### 1. Understand the task

Read $ARGUMENTS and identify:

- What is being designed or reviewed (screen, component, flow)
- Target platform(s)
- Whether a `/frontend-design` aesthetic direction already exists

### 2. Apply design principles

Work through each principle from the reference doc in order:

**Visual Hierarchy**

- Is the primary action immediately obvious without scanning?
- Are size, weight, and position used intentionally to create reading order?
- Is numeric/price data right-aligned?

**Interaction States**

- Does every interactive element have all applicable states implemented?
- Are loading states, success states, and error states accounted for?
- Does every action have visible feedback — no silent interactions?

**Spacing**

- Is all padding, margin, and sizing on the 4-point grid?
- Are related elements grouped more tightly than unrelated ones?
- Is there sufficient breathing room — no cluttered sections?

**Typography**

- Is a single font family used throughout?
- Are there six or fewer size variants?
- Does large display/header text have tightened tracking and compressed line height?

**Colour**

- Are semantic colours used consistently (blue=info, red=danger, yellow=warning, green=success)?
- Is dark mode depth created with lighter elevated surfaces, not shadows?

**Shadows**

- Are shadows subtle — high blur, low opacity?
- Does content read before the shadow registers?

**Components**

- Are icons sized to match the line height of adjacent text?
- Is there exactly one filled/solid button per view for the primary CTA?
- Are secondary actions using ghost buttons?
- Do micro-interactions confirm every user action?

### 3. Report findings

Before making any changes to existing code:

- List each principle with status: Compliant / Needs attention
- For each violation, name the element, state the issue, and suggest the fix
- Ask Pierre to confirm which items to address

### 4. Implement or generate

Apply confirmed fixes, or generate new UI code that satisfies all principles.
When generating new code:

- Output platform-appropriate code (XML, Compose, SwiftUI, HTML/CSS/JS, React)
- Use the 4-point grid values for all spacing
- Include all interaction states for every interactive element
- Add comments where a design decision may not be obvious from the code alone

### 5. Self-audit

Before presenting output, run through the Quick Reference Checklist from the
reference doc. Call out any items that were intentionally skipped and why.

## Rules

- Never leave an interaction state unstyled — raise it if it is missing
- Never use off-grid spacing values without flagging it to Pierre
- Do not override semantic colour conventions without an explicit reason
- When in doubt about a platform-specific pattern, ask Pierre before assuming
