package com.savingduit.nativeapp

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable fun SettingsScreen(store: BookStore, snapshot: BookStore.Snapshot, onChanged: (BookStore.Snapshot) -> Unit) {
    val context = LocalContext.current
    var confirmation by remember { mutableStateOf(false) }
    var typed by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Column {
        Text("Penyimpanan dan pengaturan", style = MaterialTheme.typography.titleLarge)
        Text("Skema buku perangkat: 2 · cloud: 1. Sumber: device-local / personal.")
        Text("Database perangkat: ${context.getDatabasePath("scoped-books.db").length()} byte (belum termasuk WAL). Data lokal bukan bukti telah tersimpan ke cloud.")
        Text("${snapshot.draft.local.wallets.size} dompet · ${snapshot.draft.local.transactions.size} transaksi")
        Text("Google Drive dinonaktifkan. Tidak ada koneksi atau sinkronisasi Drive.")
        Button(enabled = false, onClick = {}) { Text("Google Drive — nonaktif") }
        Text("Reset hanya buku perangkat. Akun, buku pribadi cloud, dan keluarga tidak dihapus. Salinan sebelum reset tersedia melalui Backup → Batalkan restore terakhir sampai edit berikutnya.")
        OutlinedButton(enabled = !busy, onClick = { typed = ""; confirmation = true }) { Text("Reset buku perangkat") }
        Text(message)
    }
    if (confirmation) AlertDialog(onDismissRequest = { confirmation = false }, title = { Text("Hapus isi buku perangkat?") }, text = { Column {
        Text("Catatan perangkat ini tidak otomatis tersinkron. Ekspor backup sebelum lanjut. Ketik RESET PERANGKAT untuk mengosongkan buku ini saja.")
        OutlinedTextField(typed, { typed = it }, label = { Text("Konfirmasi reset") })
    } }, confirmButton = { TextButton(enabled = !busy && typed == "RESET PERANGKAT", onClick = {
        busy = true
        scope.launch {
            try { val result = withContext(Dispatchers.IO) { store.restoreLocal(snapshot.generation, BookJson.encode(Book())) }; onChanged(result); confirmation = false; message = "Buku perangkat dikosongkan; salinan sebelum reset tersedia untuk undo" }
            catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { message = e.message ?: "Reset gagal; muat ulang buku" } finally { busy = false }
        }
    }) { Text("Reset buku perangkat saja") } }, dismissButton = { TextButton(onClick = { confirmation = false }) { Text("Batal") } })
}
