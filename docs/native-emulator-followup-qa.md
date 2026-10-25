# Followup QA — 25 Oktober2026

Task33 IN_PROGRESS; user requested ALL tests, not fulfilled by these passes alone. No release/completion notification.

## New emulator Android9 passes
- Category create QA-CAT, archive label verified, unarchive, delete.
- Budget50000 assigned QA-BUDGET-CAT. Attempt deleting referenced category leaves it present; budget then category removed.
- Goal100000 created; deposit10000 shows10000/100000; withdrawal10000 shows0/100000; removed.
- Subscription7000 created; pay button changes to undo; undo returns pay button. Disable label verified, enable, delete. This proves sequential toggle, NOT a race/double-tap test.
- Transfer25000 Tunai→Rekening Bank created. Read-only raw committed JSON verified type=move, integer amount25000, different source/destination. Rekap income0/expense0 excludes transfer. Transfer removed.
- Indonesian date picker opens from existing transfer editor; XML saved. No assertion of every date/month/leap-year action.
- Expense edit15000→18000 displays Rp18.000, saved via UI; row removed after failed search automation.
- Separate cleanup comparisons after entity/budget/transfer/final tests show account/book parsed local_json EXACTLY equals original pre-QA snapshot. Final verified `.tools/emulator-full/verified-final.db`. No user records changed; no DB write/restore performed by harness.
- Crash buffer query returned no matching app fatal lines during this followup (not proof of all runtime paths).

## Inconclusive / still open
- UIAutomator frequently `could not get idle state` or `null root node`; do not label these app bugs or passes. Search exclusion assertion and draft rotation/process-recreation attempts inconclusive. Search query cleared, app restarted. Font1.0, accelerometer1, user_rotation0 restored.
- Entity edits beyond expense, budget year semantics/usage, goal invalid amounts, payment racing, archive selector semantics, valid date changes and boundary cases not comprehensively device-tested.
- Lifecycle source inspection shows unsaved parent dialog state uses remember (adding/editor/entityKind), while form fields use rememberSaveable. Potential draft loss on Activity/process recreation remains OPEN; inconclusive emulator rotation (LDPlayer physical display did not reliably rotate). Requires deterministic recreation test and fix, not a claim of pass.
- TalkBack not tested. Authentication success/Keystore/account session/family permissions and native bidirectional sync require safe staging fixture + missing implementations.
- Receipts/export/restore/PIN/full reports unavailable. Full P01–P22 release gate FAIL.

Artifacts: `.tools/emulator-full/{resume,resume2,transfer,budget,edit-search}-results.json`, calendar-open.xml, read-only before/after snapshots. These ignored QA artifacts may contain local data; not publishable.
