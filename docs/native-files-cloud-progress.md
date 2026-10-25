# Files + cloud implementation checkpoint — 26 Oktober2026

Task32 IN_PROGRESS. User demanded full scope now; NOT fulfilled yet. No final APK/release claim.

## Added real native functionality
- SAF CreateDocument JSON and CSV export; OpenDocument bounded20MB input, structural/reference validation, restore preview+explicit replace confirmation. CAS protects against stale confirmation, invalid restore leaves local snapshot unchanged. Raw JSON preserves unknown metadata; CSV formula injection escaping + CSV quote/newline handling. JSON backup is plaintext financial data, warning shown.
- BookStore.rawLocal and validated local-only restore path (device-local/personal); no cloud auto-import.
- CloudBookStore separate DB raw immutable base/local/remote revision+generation; local snapshot is persistent outbox. CAS editing preserves unknown metadata. ACK bound to sent base/revision and confirmed server data; newer in-flight local model edits retained alongside server attribution. Equal-revision different payload rejected, stale remote rejected, conflicts durable, explicit resolution.
- CloudSync identity/family check, pull-before-push, no write while conflict, revision POST and confirmation GET (family save has no revision response).409 fetches remote without overwriting local or advancing base. Offline exceptions leave outbox untouched.
- Menu cloud screen: personal/family selector, cached snapshots after online identity check, sync/retry manually, cloud transaction create/edit/delete (first100 shown), merge independent changes, explicit whole-version local/server confirmation. Still NOT unified native navigation or full entity cloud editor or combined view. Not automatic backoff/background retry; offline cache opening currently requires identity request. Empty cloud book has no wallet initializer yet.

## QA evidence
-53 native unit tests, build, lint PASS `.tools/cloud-build.log`. Tests cover backup roundtrip metadata, CSV formula escaping, unsupported backup versions, invalid/stale restore, cloud isolation, in-flight ACK, server metadata preservation, durable conflict/reopen, equal-revision mismatch, pull/push contract (fake server), changed account prevention, offline outbox preservation,409race.
- Latest app installed-r via LDPlayer adb SUCCESS. No data clear/uninstall. Menu cloud screen unauth live request responds Silakan login, finance snapshot exact baseline `.tools/emulator-full/latest-cloud-final.db` (before final CloudSync refactor; refactor unit-tested, latest installed).
- Real SAF JSON export saved Downloads/KantongKita-backup.json, imported to preview showing3wallets/0transactions, CANCEL left exact baseline; CSV export saved Downloads/KantongKita-transaksi.csv. Backup contains local financial data, not published. Confirmed replace tested unit-level, NOT performed against user's emulator book.

## Mandatory remaining gates
Authenticated real Keystore/session/account recovery/email/permissions E2E absent (no safe staging account/environment), full native cloud entity editing, combined view, offline cache identity policy, automatic retry/backoff, ambiguous ACK reconciliation, receipts, XLSX/export parity, safe restore undo/backups, profile/PIN/security settings, complete reports/trends/period engines, TalkBack and all device lifecycle edges. Account secrets remain memory only. Cloud UI currently mutates Compose states from IO worker (needs lifecycle-safe refactor). No production financial writes/accounts, no deploy/push, no final publication, no completion beep.
