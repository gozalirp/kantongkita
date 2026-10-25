# KantongKita native Android — development preview

Kotlin 2.1.20 + Jetpack Compose Material3, SDK 36, minimum API 26. No WebView, TWA, HTML rendering or website wrapper in this module. Separate application ID `com.savingduit.app.nativepreview`; this does not replace production TWA or import browser storage.

## Current implementation

- Local SQLite books, ledger, transactions, wallets/categories, planning editors, filtered reports, donut and trends.
- Native account/recovery/email client, protected session storage and separate account/book cloud cache with persistent drafts, manual sync and explicit conflicts.
- SAF JSON/CSV/XLSX files, previewed local restore and single-step undo; private local receipts.
- Local profile/PIN, background lock, FLAG_SECURE, settings and confirmed device-only reset.
- Personal/family cloud editor, read-only combined cache and explicit selective device-to-family copy.

**Not full web parity or a release APK.** See [current acceptance status](../docs/native-parity-complete.md) and the [original P01–P22 matrix](../docs/native-web-parity-plan.md). Staging-authenticated web↔native E2E, automatic retry/backoff, unified cloud navigation, full source-aware file parity and physical-device acceptance remain open. Local unit tests and emulator navigation do not establish those gates.

## Verified

66 local unit tests in 15 suites; `:app:testDebugUnitTest :app:assembleDebug :app:lintDebug` pass. Android 9 emulator development install uses `adb install -r`, preserving financial data. PIN QA was removed after checks. Never clear/uninstall to fix test failures with existing records.

## Build

Set JAVA_HOME to JDK 17 and ANDROID_HOME to an SDK with platform 36/build-tools 36.0.0. With Gradle 8.13:

```sh
gradle -p android-native :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

GitHub Actions `build-native.yml` builds only a debug preview artifact. The separate legacy TWA workflow is not the native application. Cloudflare deploy publishes Worker and web assets, not the Android application.

No production D1 migration/reset is part of this work. Draft account-profiles API remains disabled until separate approval for migration 0006. Do not store the only copy of important records in a development build; export a backup first.
