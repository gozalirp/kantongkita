package com.savingduit.nativeapp

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable fun FileScreen(store: BookStore, snapshot: BookStore.Snapshot, onRestored: (BookStore.Snapshot) -> Unit) {
    val resolver = LocalContext.current.contentResolver
    val scope = rememberCoroutineScope()
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf<String?>(null) }
    var generation by remember { mutableStateOf(0L) }
    var undoConfirm by remember { mutableStateOf(false) }
    var canUndo by remember(snapshot.generation) { mutableStateOf(store.canUndoRestore()) }
    fun work(action: suspend () -> String) {
        if (busy) return
        busy = true
        scope.launch { try { message = action() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { message = e.message ?: "Operasi file gagal" } finally { busy = false } }
    }
    val json = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri -> if (uri != null) work {
        withContext(Dispatchers.IO) { val raw = BookFiles.backup(store.rawLocal("device-local", "personal")); requireNotNull(resolver.openOutputStream(uri, "wt")).use { it.write(raw.toByteArray(Charsets.UTF_8)) } }; "Backup JSON tersimpan"
    } }
    val csv = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri -> if (uri != null) work {
        withContext(Dispatchers.IO) { val raw = BookFiles.csv(BookJson.decode(store.rawLocal("device-local", "personal"))); requireNotNull(resolver.openOutputStream(uri, "wt")).use { it.write(raw.toByteArray(Charsets.UTF_8)) } }; "CSV tersimpan"
    } }
    val xlsx = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) { uri -> if (uri != null) work {
        withContext(Dispatchers.IO) { val bytes = BookFiles.xlsx(BookJson.decode(store.rawLocal("device-local", "personal"))); requireNotNull(resolver.openOutputStream(uri, "wt")).use { it.write(bytes) } }; "XLSX tersimpan"
    } }
    val restore = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null) work {
        val raw = withContext(Dispatchers.IO) { requireNotNull(resolver.openInputStream(uri)).use { input ->
            val output = java.io.ByteArrayOutputStream(); val buffer = ByteArray(8192)
            while (true) { val count = input.read(buffer); if (count < 0) break; require(output.size() + count <= 20_000_000) { "File terlalu besar" }; output.write(buffer, 0, count) }
            BookFiles.restore(output.toByteArray().toString(Charsets.UTF_8))
        } }
        generation = snapshot.generation; pending = raw; "Backup valid; belum ada data diganti"
    } }
    Column {
        Text("Backup dan ekspor", style = MaterialTheme.typography.titleLarge)
        Text("Buku perangkat saja. Backup berisi data keuangan tanpa enkripsi; simpan di lokasi aman. Restore mengganti isi buku setelah konfirmasi, bukan mengirim ke cloud.")
        Button(enabled = !busy, onClick = { json.launch("KantongKita-backup.json") }) { Text("Ekspor JSON") }
        Button(enabled = !busy, onClick = { csv.launch("KantongKita-transaksi.csv") }) { Text("Ekspor CSV") }
        Button(enabled = !busy, onClick = { xlsx.launch("KantongKita-transaksi.xlsx") }) { Text("Ekspor XLSX") }
        if (canUndo) OutlinedButton(enabled = !busy, onClick = { undoConfirm = true }) { Text("Batalkan restore terakhir") }
        OutlinedButton(enabled = !busy, onClick = { restore.launch(arrayOf("application/json", "text/plain")) }) { Text("Tinjau backup untuk restore") }
        if (busy) CircularProgressIndicator()
        Text(message)
    }
    if (undoConfirm) AlertDialog(onDismissRequest = { undoConfirm = false }, title = { Text("Batalkan restore terakhir?") }, text = { Text("Mengembalikan isi buku sebelum restore. Dibatalkan bila ada edit baru agar tidak kehilangan perubahan.") }, confirmButton = { TextButton(enabled = !busy, onClick = { work {
        val result = withContext(Dispatchers.IO) { store.undoRestore() }; onRestored(result); canUndo = false; undoConfirm = false; "Isi buku sebelum restore dipulihkan"
    } }) { Text("Pulihkan sebelum restore") } }, dismissButton = { TextButton(onClick = { undoConfirm = false }) { Text("Batal") } })
    pending?.let { raw ->
        val book = BookJson.decode(raw)
        AlertDialog(onDismissRequest = { pending = null }, title = { Text("Ganti buku perangkat?") }, text = { Text("Backup: ${book.wallets.size} dompet, ${book.transactions.size} transaksi, ${book.goals.size} target. Seluruh isi buku lokal saat ini akan diganti. Salinan sebelum restore disimpan otomatis untuk satu langkah undo, selama buku belum diedit lagi. Ekspor backup untuk arsip jangka panjang.") }, confirmButton = { TextButton(enabled = !busy, onClick = { work {
            val result = withContext(Dispatchers.IO) { store.restoreLocal(generation, raw) }; onRestored(result); canUndo = true; pending = null; "Restore berhasil; undo tersedia sebelum edit berikutnya"
        } }) { Text("Ganti isi buku") } }, dismissButton = { TextButton(onClick = { pending = null }) { Text("Batal") } })
    }
}
