---
name: prototype
description: >
  Generate several DISTINCT self-contained HTML implementation variants of a UI feature,
  component, or dashboard — then preview them, self-select the best, and justify the choice
  in writing for the human to ratify. Trigger on "prototype this", "show me a few options for",
  "mock up some versions of", "design variants", "A/B these layouts", "give me 3 takes on".
  Produces single-file HTML artifacts (inline styles, hardcoded data, Recharts for dashboards)
  following Pierre's artifact conventions. Do NOT use when the implementation is already decided
  (just build it), for an editable diagram file (use drawio-creator), or for a single explainer
  page (use explain-visually). Adapted from Anthropic's internal "/prototype" + adversarial-verify
  patterns; the names in the source talk were paraphrase — the workflow is the real part.
---

# prototype

Turn an under-specified UI ask into a **decision**: generate N genuinely different
implementations, look at them, pick the strongest, and say _why_ — so the human reviews
a justified recommendation, not a blank page.

The discipline that makes this worth more than "just build one": the variants must be
**distinct design directions**, not cosmetic tweaks, and the selection must survive one
**adversarial pass** (argue against the winner before committing to it).

## When to use

| Use it when…                                                | Don't — instead…                                  |
| ----------------------------------------------------------- | ------------------------------------------------- |
| The shape of the UI is open ("how should this look/work?")  | The design is settled → just build it             |
| You want to compare layouts/interaction models side by side | You need an editable diagram → `drawio-creator`   |
| Dashboard, form, component, or small flow                   | One narrative explainer page → `explain-visually` |
| Pierre will choose, but wants a reasoned default            | A backend/data task with no UI surface            |

## Inputs (ask only if missing)

- **What** — the feature/component/dashboard and its job.
- **N** — number of variants (default **3**; 2 for a quick fork, 4 max).
- **Constraints** — brand, ZAR currency, data to show, must-haves, target surface.
  Default to Pierre's conventions: **self-contained single file, inline styles, no external
  deps, Recharts (inline data) for dashboards, ZAR/R for currency.**

## Workflow

### 1. Frame the variants (inline — do this first, don't skip)

Name N **deliberately divergent** directions before generating anything. Good axes of
divergence:

- **Density:** minimal/at-a-glance ↔ information-dense/power-user
- **Interaction:** guided/wizard ↔ direct-manipulation/dashboard
- **Hierarchy:** single-focus ↔ multi-panel
- **Tone:** conservative/banking ↔ expressive

State each variant as a one-line thesis ("Option A — minimal at-a-glance card; Option B —
dense analyst table; Option C — guided drill-down"). If two variants would look ~identical,
collapse them and pick a sharper third. **Divergence is the whole value.**

### 2. Generate variants in parallel (Sonnet subagents — explicit model)

UI drafting is Sonnet work (global model routing: vision/UI = Sonnet, not Opus). Spawn one
subagent **per variant**, concurrently, each with `model: "sonnet"`:

> `Agent({ subagent_type: "general-purpose", model: "sonnet", prompt: <variant thesis + shared constraints + conventions> })`

Each returns ONE self-contained `.html` file. Hard rules for every variant:

- Single file, no external network deps (no CDNs except where the convention already allows,
  e.g. Recharts via the project's standard inline include for React dashboards).
- Inline styles/JS; hardcoded representative data; ZAR/R for money.
- Same dataset across all variants so the comparison is apples-to-apples.

Write them to `./prototypes/<slug>-option-{A,B,C}.html` in the active workspace.

### 3. Visual capture for side-by-side (optional, recommended)

If `claude-in-chrome` is available, open each file in a tab and screenshot it (or a short
`gif_creator` clip for interactive ones). This is **our** self-verification step — note:
Claude-in-Chrome drives a **visible** browser via the extension (it is NOT headless; the
source talk's "headless Chrome" was wrong). Attach the screenshots so the human compares
pixels, not prose. Skip gracefully if Chrome isn't connected — never block on it.

### 4. Self-select + adversarial justify (inline judgment)

Score each variant against **explicit** criteria — tailor to the ask, but default to:

| Criterion               | Asks                                     |
| ----------------------- | ---------------------------------------- |
| Fit-to-job              | does it serve the actual task?           |
| Clarity                 | can the user parse it in 3 seconds?      |
| Density-appropriateness | right amount of info for this surface?   |
| Brand/convention fit    | banking-conservative where it should be? |
| Implementability        | cheap to turn into the real thing?       |

Pick a **winner**, rank the rest. Then run **one adversarial pass**: argue the strongest case
_against_ your pick ("the dense table wins on power but fails the 3-second test for the
mobile glance case"). If the rebuttal lands, switch. This mirrors the generator→evaluator
loop from Anthropic's harness-design work and kills plausible-but-wrong picks.

### 5. Present the decision (terse)

Output, in this order:

1. One-line recommendation + the single most important reason.
2. Comparison table (variant → thesis → top score → fatal flaw).
3. File paths (and screenshots if captured) so the human can open each.
4. The adversarial caveat in one line ("I'd switch to B if this is mobile-first").

Then **stop and let the human ratify.** This skill produces a justified default, not a
final commitment.

## Output layout

```
prototypes/
  <slug>-option-A.html   ← self-contained, openable directly
  <slug>-option-B.html
  <slug>-option-C.html
  <slug>-comparison.md   ← the recommendation + table (optional, for the record)
```

## Anti-patterns

- **Cosmetic variants** (same layout, different colours) — collapse them; divergence or nothing.
- **Picking without the adversarial pass** — the rebuttal is what makes the pick trustworthy.
- **External dependencies** — breaks the self-contained-artifact convention; everything inline.
- **Generating on Opus** — variant drafting is Sonnet; reserve Opus for the framing/judgment only.
- **Auto-committing the winner** — present and stop; the human chooses.

## Why this exists

The source ("internal Anthropic /prototype") was a Gemini-extracted paraphrase — the _names_
(claude-worktree, "Auto Mode", "headless Chrome", "adversarial designer") were largely
invented by the extractor, but the **underlying workflow is real and documented**
(multi-option generation + adversarial generator/evaluator loops, per Anthropic's
"harness design for long-running apps"). This skill ports the workflow, not the vocabulary,
onto Pierre's self-contained-HTML-artifact conventions.
