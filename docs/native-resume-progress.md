# Resume implementation + ADB QA — 26 Oktober2026

Full task32 IN_PROGRESS, NOT complete P01–P22 or final release.

## Implemented and checked
- NativeApp dialog identity (adding/edit transaction ID/entity kind+ID/goal adjustment) now rememberSaveable; restores open form through Activity recreation instead of losing parent dialog while child fields are saveable.
- LDPlayer real Activity destruction test using always_finish_activities + Home/relaunch: screenshot `.tools/emulator-full/restored-draft.png` shows QA-RESTORE retained. XML assertion failed idle, so evidence is manual screenshot review, not green automated recreation suite. Developer setting restored. Force-stop is not promised to restore unsaved form.
- `BookJson.patch(original,before,after)` applies only edited modeled fields, preserves unknown root/row metadata, null vs absent unchanged fields, and removes explicitly deleted entities. `BookStore.edit` uses transaction+generation CAS and patches local_json only, leaving immutable base/remote JSON intact. MainActivity edits use this safe path. Unit tests cover web profile/receipts/by/future and stale screen rejection. Generic legacy `save` still model-based; NOT safe cloud transport persistence and not claimed integrated sync.
- `BookReports`: inclusive date/type/wallet (source or destination)/category/query filtering, exact whole-rupiah monthly/yearly expense budget usage. Rekap now date/type/wallet/category controls + filtered donut/totals; budget cards display current usage. Tests cover boundary dates, destination wallet, grouped query, transfer exclusion, reversed ranges and monthly/yearly totals.
- Native40 tests + assemble+lint PASS `.tools/resume-build.log` (incremental). Full npm test PASS `.tools/resume-web-tests.log`.
- Latest APK install-r via ADB SUCCESS, no uninstall/data clear. LDPlayer9 was stopped, launched index0. SDK adb sometimes returns blank while LDPlayer own adb works; final install via LDPlayer adb SUCCESS.
- UI transaction regression10 assertions PASS after metadata-safe editing change `.tools/emulator-full/results.json`. New Rekap controls verified on emulator. Final financial snapshot matches baseline exactly `.tools/emulator-full/reports-final.db`. No synthetic transactions left.

## Still incomplete
Account lifecycle/email/Keystore authenticated E2E, personal/family/combined selector, raw cloud snapshot transport, durable outbox/retry/request-bound ACK/conflict UI, receipts, export/restore, PIN/profile/security settings, report trends and full parity. No staging account provisioned. No production write/deploy/push, no final APK publication. TalkBack/full deterministic process death/remaining edgecases not checked. User's ALL scope not fulfilled yet; task32 remains in_progress.
