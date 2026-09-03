# Ask CJHQ — regression suites

Node only, no dependencies, no network, no Gemini call. Nothing here is loaded
by the website: no page references these files, and neither generator scans
directories, so adding or removing a suite cannot change what is served.

## Running

    cd tests
    node run-all.mjs          # everything, with a summary
    node t-answer-quality.mjs # Part I  — general answer quality
    node t-content-loss.mjs   # Part J  — Gemini compression
    node t-p0-fixes.mjs       # coverage inflection + breadth stopwords
    node t-jurisdiction.mjs   # U.S. / Canadian jurisdiction guard
    node t-regression.mjs     # everything that must not move, vs deployed main
    node t-differential.mjs   # 431-question before/after differential
    node syntax-check.mjs     # parses every inline <script> in every HTML file

## The baseline

`t-regression.mjs` and `t-differential.mjs` compare against a clean copy of the
DEPLOYED `main` branch. That copy is deliberately NOT committed — it would
duplicate the entire site. Fetch it beside the repo:

    mkdir -p ../../dep_live && cd ../../dep_live
    B=https://raw.githubusercontent.com/CJHQinfo/CJHQ/main
    for f in index.html ask-core.mjs ask-data.mjs robots.txt sitemap.xml CNAME \
             404.html .nojekyll about.html contact.html resources.html admin.html \
             privacy.html terms.html accessibility.html stay-informed.html \
             child-travel-consent.html tools/sync-ask-core.mjs \
             tools/generate-routes.mjs tools/admin-panel.html fr/index.html; do
      mkdir -p "$(dirname "$f")"; curl -sS -o "$f" "$B/$f"
    done

Or point somewhere else:  `CJHQ_BASELINE=/path/to/main/ node run-all.mjs`

## What each file is

- `corpus.mjs` — the question corpus and, per entry, what the SYSTEM should do
  (handler, retrieval breadth, answer-vs-clarify). Deliberately no expected
  prose: this tests the answering system, not canned answers.
- `harness.mjs` — a ~25-line assert/report helper.
- `t-answer-quality.mjs` — structural properties that must hold for any correct
  wording: intent, breadth, context sufficiency, completeness, grounding, next
  step, link selection, no hallucination.
- `t-content-loss.mjs` — four drafts against one verified multi-unit answer,
  plus the two-call ceiling and the deterministic fallback.
- `t-p0-fixes.mjs` — inflection-aware coverage matching, and the matcher's
  stopword list applied to the breadth classifier. Both halves are paired
  equivalence tests against reference implementations of the pre-fix behaviour.
- `t-jurisdiction.mjs` — U.S. questions must not receive Canadian sibling
  context; Canadian questions and the English pronoun "us" must be untouched.
- `t-regression.mjs` — compares against the baseline for everything that must
  not move: directory wording, halachic answers, FindMTL URLs, language
  detection, RAMQ/NEXUS behaviour, sessions, templates, Gemini configuration,
  browser isolation, robots/sitemap/CNAME.
- `t-differential.mjs` — 431 questions through both trees; asserts no structural
  change and that every changed answer is an addition, never a rewrite.

## After changing index.html

    node ../tools/sync-ask-core.mjs --check
    node ../tools/generate-routes.mjs --check

Both must pass. Never hand-edit `ask-core.mjs`, `ask-data.mjs` or the route
files — they are generated from `index.html`.
