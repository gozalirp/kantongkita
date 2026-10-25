# Android KantongKita — Trusted Web Activity

## Status

Proyek Android berada di `android-twa/`, memakai Android Browser Helper 2.7.4 (Google), bukan Capacitor. Workflow `.github/workflows/build-apk.yml` membangun APK debug pada push main/master. Build release APK + AAB dijalankan manual dengan input `release=true` setelah signing secrets siap. Build lokal signed APK + AAB serta debug APK berhasil pada 23 Oktober 2026, memakai JDK17/Gradle8.13/SDK36. Minimum Android 7.0 (API24), sesuai Android Browser Helper 2.7.4. Signature APK diverifikasi dengan apksigner (v2, RSA3072); certificate cocok dengan assetlinks lokal. Android lint berhasil tanpa error (3 warning: dataExtractionRules dan dua warning ikon). npm test lolos. Belum diuji pada Android asli; build CI baru bisa diverifikasi setelah perubahan di-push. Tidak ada rilis Play Store otomatis.

APK uji lokal: `%USERPROFILE%\Downloads\KantongKita-Android\KantongKita-1.0.0-uji.apk` (3.747.271 byte), SHA256 `8dbe6e869d970291ac58624c3a89d146959b34dafef19097ddec05f2c7d1de58`. AAB tersedia dalam folder yang sama. Ini bukan bukti sinkronisasi penuh: profil akun belum terintegrasi UI, domain association belum deploy. Tidak ada perangkat terhubung pada adb; virtualisasi firmware tidak tersedia saat pemeriksaan, jadi instalasi/launch Android belum teruji.

TWA membuka `https://moneyplanner.darmintompel.my.id/`, sehingga API tetap same-origin, cookie HttpOnly tetap di browser, dan tidak perlu melonggarkan CORS. Tidak ada file data keuangan yang dibundel ke APK. Website produksi tetap v55; perubahan proyek Android ini belum deploy/push.

## Identitas dan tanda tangan

- Release applicationId tetap `com.savingduit.app` demi kompatibilitas identitas lama.
- Debug memakai `com.savingduit.app.debug` agar tidak menimpa aplikasi lama.
- APK lama hanya dapat di-update bila signing certificate sama. Jika kunci lama tidak tersedia, jangan menyuruh pengguna uninstall sebelum mengekspor data lokalnya dengan aman.
- Kunci release dibuat lokal setelah operator memastikan belum pernah mendistribusikan APK, dan tidak disimpan di Git. Jangan menggunakan debug key sebagai release key.
- Simpan keystore dan password dalam backup privat terpisah. Hilangnya kunci dapat menghalangi update aplikasi.

GitHub Actions secrets yang dibutuhkan:

| Secret | Isi |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Keystore rilis dalam base64 (bukan enkripsi) |
| `ANDROID_KEYSTORE_PASSWORD` | Password keystore |
| `ANDROID_KEY_ALIAS` | Alias kunci |
| `ANDROID_KEY_PASSWORD` | Password kunci |

Release gagal dengan jelas bila secrets kosong; tidak menghasilkan release unsigned yang disamarkan sebagai siap pakai. Keystore sementara di runner dihapus lewat trap. Jangan mencetak secrets ke log.

## Verifikasi domain (wajib untuk tampilan TWA tanpa address bar)

1. Ambil SHA-256 **certificate publik** dari signing key yang benar lewat `keytool -list -v -keystore <file-privat> -alias <alias>` (password interaktif, jangan ditaruh di command history).
2. Untuk Play App Signing gunakan fingerprint **app signing certificate** dari Play Console; upload-key fingerprint saja tidak cukup. Bila perlu sideload juga, masukkan kedua certificate yang memang dipercaya.
3. Dari root repo jalankan `node scripts/android-assetlinks.cjs` dengan environment `ANDROID_CERT_SHA256_JSON` berupa JSON array fingerprint nyata, format 32 byte hex dipisah titik dua.
4. Review hasil `public/.well-known/assetlinks.json`, lalu deploy website dengan persetujuan operator. File harus HTTP 200 JSON, tanpa redirect atau login. Generator menolak input kosong/tidak sah; tidak menerbitkan fingerprint palsu.
5. Cocokkan fingerprint APK release dengan file domain, kemudian tes di Android. Debug tidak dipercaya oleh domain produksi; address bar pada debug adalah perilaku yang diharapkan.

Hanya domain produksi yang dipercaya. Tidak ada wildcard origin, izin kamera/lokasi/storage, atau bypass validasi domain. Browser yang tidak mendukung TWA dapat membuka Custom Tab. Tanpa browser kompatibel, perilaku perlu diuji dan pengguna mungkin diminta memasang browser.

## Build lokal

Butuh JDK17, Gradle8.13 dan Android SDK platform36/build-tools36.0.0. Dari `android-twa/`:

```sh
gradle :app:assembleDebug
# Setelah keempat ANDROID signing environment tersedia:
gradle :app:assembleRelease :app:bundleRelease
```

`ANDROID_VERSION_CODE` harus bertambah untuk setiap update release (workflow menggunakan run number); sesuaikan bila aplikasi lama sudah mempunyai versionCode lebih tinggi. `ANDROID_VERSION_NAME` opsional. Artifact CI bernama `KantongKita-TWA-debug` atau `KantongKita-TWA-release`. APK untuk sideload/uji; AAB untuk Play Console. Perubahan web biasanya tidak butuh build Android ulang, perubahan native/signing/targetSDK tetap butuh build baru.

## Sinkronisasi: bukan migrasi otomatis

TWA memakai penyimpanan origin dari browser penyedia TWA, bukan WebView Capacitor lama. Jangan mengasumsikan localStorage/sesi berpindah dari APK lama, browser lain, atau perangkat lain. Browser yang sama dapat berbagi sesi/data origin; tetap uji pada perangkat nyata. Tidak ada akses ke penyimpanan privat browser/aplikasi lain.

Catatan pribadi yang sudah sukses tersimpan ke akun server dan buku keluarga dimuat melalui API login yang ada. Data belum tersimpan ke server harus diekspor/diamankan terlebih dahulu. Jangan menggabungkan buku pribadi dan keluarga untuk migrasi.

**Avatar saat ini masih profil lokal**, termasuk saat tampil pada kartu Akun login. Sinkron avatar akun membutuhkan perubahan backend dan pengaturan akun terpisah; belum termasuk dalam proyek TWA ini. Tidak ada migrasi D1 dijalankan.

## Checklist sebelum distribusi

- Build debug/release berhasil; periksa signing, package ID, versionCode, launcher/icon.
- Verifikasi Digital Asset Links pada domain produksi dengan certificate distribusi sebenarnya.
- Login/logout, verifikasi email/reset password (termasuk fragment token), navigasi Back, link eksternal.
- Buku pribadi dua perangkat dan keluarga dua akun; stale revision tidak menimpa catatan.
- Offline/online, muat ulang, keyboard/modal transaksi dan safe-area Android.
- Export/download Excel/JSON, restore terisolasi, update dari versi sebelumnya tanpa kehilangan data.
- Kebijakan privasi, Data safety dan mekanisme penghapusan akun/data sebelum pengajuan Play Store; review Google tidak dijamin.

Sumber: [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper), [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started).


## Kunci lokal yang sudah disiapkan

Keystore PKCS12 rilis dibuat pada perangkat operator, di `%LOCALAPPDATA%\KantongKita-private-signing\kantongkita-release.p12`, alias `kantongkita`. Folder dibatasi ACL ke pengguna Windows saat ini dan SYSTEM. Password acak disimpan dalam folder privat yang sama; ini bukan backup terpisah. Operator perlu membuat backup terenkripsi di tempat aman. Jangan memasukkan folder ini ke ZIP source/Drive atau repository.

File `public/.well-known/assetlinks.json` sudah memakai SHA-256 certificate nyata dari keystore tersebut. File ini publik dan bukan secret; belum aktif sampai website di-deploy. GitHub signing secrets belum dipasang. Jika Play App Signing diaktifkan, tambahkan certificate yang diberikan Play Console sebelum menguji distribusi Play.
