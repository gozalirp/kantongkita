package com.savingduit.app;

import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Keep browser-provider launch failures visible instead of silently closing. */
public class MainActivity extends LauncherActivity {
    private static final String HOME = "https://moneyplanner.darmintompel.my.id/";

    @Override
    protected void launchTwa() {
        try {
            super.launchTwa();
        } catch (RuntimeException error) {
            Log.e("KantongKita", "Browser launch failed", error);
            if (isFinishing() || isDestroyed()) return;
            new AlertDialog.Builder(this)
                .setTitle("KantongKita belum bisa dibuka")
                .setMessage("Browser pendukung gagal dijalankan. Pastikan Chrome aktif dan terbaru. " +
                    "Kode: " + error.getClass().getSimpleName())
                .setPositiveButton("Buka di browser", (dialog, which) -> openBrowser())
                .setNegativeButton("Tutup", (dialog, which) -> finish())
                .setOnCancelListener(dialog -> finish())
                .show();
        }
    }

    private void openBrowser() {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(HOME));
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        // An explicit provider avoids resolving our own verified domain activity again.
        intent.setPackage("com.android.chrome");
        try {
            startActivity(intent);
            finish();
        } catch (ActivityNotFoundException error) {
            new AlertDialog.Builder(this)
                .setTitle("Chrome tidak tersedia")
                .setMessage("Aktifkan atau perbarui Google Chrome, lalu buka KantongKita kembali. Data tidak dihapus.")
                .setPositiveButton("Tutup", (dialog, which) -> finish())
                .show();
        }
    }
}
