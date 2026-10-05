# Ask CJHQ backend review

This release is for the existing staff-only Ask panel, not public launch.
AI and App Check provider requests stay off. Logins, rules, data and public
pages are unchanged. The static artifact differs only in admin.html.

Built: corrected U.S. passport routing and RAMQ renewal; safe exact-link and
phone validation; clear/new conversation generation guards; bounded input and
history; accessible processing/status, safe retry, null/error recovery,
clipboard fallback, safe text/links, RTL, mobile wrapping, source toggle.

Questions stay in page memory. Each question must name its topic: follow-up
pronouns are not resolved. No claim of live eruv/zmanim/calendar updates.
Knowledge Sources is a planning registry, not a live-service connection.

Before public launch: owner chooses placement and reviews child-travel/legal
copy; fluent reviewers check French/Hebrew/Yiddish; existing resource policy
records need current source review. AI requires a separate approved cost review.

Verification: Node tests, 455-question differential, module/route drift, Pages
artifact checks, Chromium UI tests (including mobile 320/390px and automated
WCAG panel scan). Authenticated staff panel must be verified after deployment.
