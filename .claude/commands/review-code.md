---
description: Review highlighted code, specified method(s)/class(es), or the current file
allowed-tools: Read, Write, Edit
---

Determine the review scope:

- If `$ARGUMENTS` is provided: review only the highlighted code or the specified method(s) and class(es).
- If nothing is highlighted or specified (`$ARGUMENTS` is empty): read and review the current file in full.

**Scope discipline (strict):** When the scope is a line range, named method, or named class, ALL findings under **Issues found** must reference lines _inside that scope only_. Do not report issues on:

- Surrounding methods or sibling code visible while reading the file
- Class-level concerns (stale javadoc, imports, annotations) outside the cited lines
- "While I'm here" refactor opportunities in adjacent code
- Wider architectural smells unless they manifest _inside_ the cited range

If a defect inside scope is _caused by_ something outside scope, mention the external reference once for context inside the relevant numbered finding — do not raise a separate issue for the external code. Out-of-scope noise drowns the signal Pierre is looking for.

Only when scope is the **full file** are class-level and cross-method findings in bounds.

For the identified scope, improve its documentation. Optimise for
**information density (recoverability), not length** — the test for every line
is: _could a reader, human or agent, recover this from the code itself?_ If
yes, omit it; if no, it earns its place.

1. Document what the code **can't** reveal (invest here — verbose is fine when
   it is substantive):
   - **Why** — the rationale behind a non-obvious choice
   - **Invariants / constraints** not visible in the signature (units, value
     ranges, assigned-vs-generated keys, semantic nullability)
   - **Cross-references** — related types, specs, or files (link, don't inline)
   - **Lifecycle / ordering / transaction / threading** semantics
   - For an opaque public API: the params, return, and exceptions a caller
     cannot infer from the body

2. Don't restate the signature (types, parameter names, "gets X / sets Y").
   Trivial members — plain getters/setters, no-arg constructors, simple
   delegators — need no doc at all.

3. Scale the doc to the member: invest at the **class / public-API boundary**
   (structure it — `Invariants:` / `Lifecycle:` / `See also:` — so an agent can
   parse and act on it); stay **silent** on trivial members. Add inline
   comments only for non-obvious logic, tricky algorithms, or handled edge cases.

4. Weigh the two costs of empty verbosity on every line:
   - **Context budget** — docs that restate the code burn an agent's context
     window for zero recoverable information.
   - **Drift** — docs describing _behaviour_ rot when the code changes and then
     conflict with it; docs describing _intent_ rot far less. Prefer intent.

5. Use proper documentation syntax for the language; keep lines readable (~80
   characters).

6. SOLID principles check:
   After documenting, run /apply-SOLID-principles on the same file.
   If violations are found, report them alongside the documentation summary
   but do not apply fixes — present them as a separate follow-up action for
   Pierre to confirm.

7. Pattern check:
   After SOLID principles check, and only once per class unless specifically invoked,
   run /consider-design-pattern on the same method, class or file. Run
   /consider-analysis-pattern on the same as well as /consider-algorithm. All
   "consider" patterns are suggestions only, never implement without explicit
   approval. Don't run the pattern check if intial recommendations not accepted.

After making changes, show a summary in this exact structure:

**Verdict:** `<one word: catastrophe | bad | mediocre | ok>`
(Reflects the code quality _before_ your review — ok means genuinely solid code, not a courtesy.)

**Reviewed:** `<scope: highlighted code / named method or class / full file>`

**Documented:** `<brief prose — what docstrings/comments were added or improved>`

**Issues found:**
If any SOLID violations, design pattern misuse, or code quality concerns were identified,
list them as numbered items in this format:

1. `file:line` — <concise description of the issue>
2. `file:line` — <concise description of the issue>
   ...

If no issues were found, write: ✅ No violations — all principles satisfied.

**Next steps (suggest only, do not invoke):**

- If scope contains try/catch or error handling → suggest running `silent-failure-hunter` agent
- If this is pre-PR work → suggest running `pr-test-analyzer` for test coverage gaps
- If types/data models changed → suggest `type-design-analyzer`
