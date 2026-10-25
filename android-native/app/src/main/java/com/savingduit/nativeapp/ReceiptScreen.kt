package com.savingduit.nativeapp

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

@Composable fun ReceiptScreen(store: BookStore, snapshot: BookStore.Snapshot, onChanged: (BookStore.Snapshot) -> Unit) {
    val context = LocalContext.current
    val files = remember { ReceiptStore(File(context.filesDir, "receipts")) }
    val scope = rememberCoroutineScope()
    var selected by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var removing by remember { mutableStateOf<Transaction?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null) {
        val txId = selected; val original = snapshot
        busy = true
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    val tx = original.draft.local.transactions.firstOrNull { it.id == txId } ?: error("Transaksi tidak tersedia")
                    val id = requireNotNull(context.contentResolver.openInputStream(uri)).use { files.import(it) }
                    try { store.edit("device-local", "personal", original.generation, original.draft.local.saveTransaction(tx.copy(receiptId = id))) }
                    catch (e: Exception) { files.remove(id); throw e }
                }
                onChanged(result); message = "Struk disimpan privat di perangkat ini"
            } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { message = e.message ?: "Struk gagal disimpan" } finally { busy = false }
        }
    } }
    Column {
        Text("Struk pribadi", style = MaterialTheme.typography.titleLarge)
        Text("JPEG/PNG/PDF maksimal 10 MB. File hanya di perangkat, tidak ikut cloud atau backup JSON. Membuka struk memberi akses sementara kepada aplikasi penampil yang dipilih.")
        if (snapshot.draft.local.transactions.isEmpty()) Text("Tambahkan transaksi terlebih dahulu.")
        snapshot.draft.local.transactions.sortedByDescending { it.date }.forEach { tx ->
            Text("${tx.date} · ${tx.note} · Rp ${Rupiah.format(tx.amount)}")
            TextButton(enabled = !busy, onClick = { selected = tx.id; picker.launch(arrayOf("image/jpeg", "image/png", "application/pdf")) }) { Text(if (tx.receiptId.isEmpty()) "Lampirkan struk" else "Ganti struk") }
            if (tx.receiptId.isNotEmpty()) {
                TextButton(enabled = !busy, onClick = {
                    try {
                        val file = files.file(tx.receiptId); check(file.isFile) { "Struk tidak tersedia di perangkat ini" }
                        val uri = FileProvider.getUriForFile(context, context.packageName + ".receipts", file)
                        val type = when(file.extension) { "pdf" -> "application/pdf"; "png" -> "image/png"; else -> "image/jpeg" }
                        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_VIEW).setDataAndType(uri, type).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION), "Buka struk"))
                    } catch (e: Exception) { message = e.message ?: "Tidak ada aplikasi penampil" }
                }) { Text("Lihat struk") }
                TextButton(enabled = !busy, onClick = { removing = tx }) { Text("Lepas struk") }
            }
        }
        if (busy) CircularProgressIndicator()
        Text(message)
    }
    removing?.let { tx -> AlertDialog(onDismissRequest = { removing = null }, title = { Text("Lepas struk transaksi?") }, text = { Text("Catatan transaksi tetap ada. Salinan file privat dipertahankan untuk backup/undo; tidak lagi ditampilkan pada transaksi ini.") }, confirmButton = { TextButton(onClick = {
        runCatching { store.edit("device-local", "personal", snapshot.generation, snapshot.draft.local.saveTransaction(tx.copy(receiptId = ""))) }.onSuccess { onChanged(it); removing = null; message = "Lampiran dilepas" }.onFailure { message = it.message ?: "Gagal melepas lampiran" }
    }) { Text("Lepas lampiran") } }, dismissButton = { TextButton(onClick = { removing = null }) { Text("Batal") } }) }
}
