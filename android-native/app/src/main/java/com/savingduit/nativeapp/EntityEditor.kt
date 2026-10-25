package com.savingduit.nativeapp

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import java.util.UUID

/** Real local CRUD; commit callback persists the entire validated book atomically. */
@Composable fun EntityEditor(kind: String, id: String?, book: Book, onDismiss: () -> Unit, onSave: (Book) -> Unit) {
    val wallet = book.wallets.firstOrNull { it.id == id }
    val category = book.categories.firstOrNull { it.id == id }
    val budget = book.budgets.firstOrNull { it.id == id }
    val goal = book.goals.firstOrNull { it.id == id }
    val sub = book.subscriptions.firstOrNull { it.id == id }
    var name by rememberSaveable(kind, id) { mutableStateOf(when (kind) { "Dompet" -> wallet?.name; "Kategori" -> category?.name; "Target" -> goal?.name; "Langganan" -> sub?.name; else -> "" } ?: "") }
    var amount by rememberSaveable(kind, id) { mutableStateOf(when (kind) { "Dompet" -> wallet?.initial; "Anggaran" -> budget?.limit; "Target" -> goal?.target; "Langganan" -> sub?.amount; else -> null }?.let(Rupiah::format) ?: "") }
    var type by rememberSaveable(kind, id) { mutableStateOf(if (kind == "Dompet") wallet?.type ?: "cash" else category?.type ?: "out") }
    var walletId by rememberSaveable(kind, id) { mutableStateOf(if (kind == "Target") goal?.walletId ?: "" else sub?.walletId ?: book.wallets.firstOrNull()?.id ?: "") }
    var categoryId by rememberSaveable(kind, id) { mutableStateOf(budget?.categoryId ?: sub?.categoryId ?: "") }
    var period by rememberSaveable(kind, id) { mutableStateOf(budget?.period ?: sub?.cycle ?: "month") }
    var day by rememberSaveable(kind, id) { mutableStateOf(sub?.day?.toString() ?: "1") }
    var due by rememberSaveable(kind, id) { mutableStateOf(goal?.due ?: "") }
    var note by rememberSaveable(kind, id) { mutableStateOf(goal?.note ?: sub?.note ?: budget?.note ?: "") }
    var error by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text((if (id == null) "Tambah " else "Ubah ") + kind.lowercase()) }, text = {
        LazyColumn(modifier = Modifier.imePadding()) {
            if (kind != "Anggaran") item { OutlinedTextField(name, { if (it.length <= 200) name = it }, label = { Text("Nama") }) }
            if (kind != "Kategori") item { OutlinedTextField(amount, { input ->
                val negative = input.startsWith("-") && kind == "Dompet"
                val digits = input.removePrefix("-").replace(".", "")
                if (digits.isEmpty()) amount = if (negative) "-" else ""
                else if (digits.all { it.isDigit() } && digits.length <= 12) amount = (if (negative) "-" else "") + (digits.toLongOrNull()?.let(Rupiah::format) ?: "")
            }, label = { Text(when (kind) { "Dompet" -> "Saldo awal (boleh minus/0)"; "Anggaran" -> "Batas anggaran"; "Target" -> "Nominal target"; else -> "Nominal tagihan" }) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true) }
            if (kind == "Dompet") item { SelectField("Jenis", type, listOf("cash" to "Tunai", "bank" to "Bank", "ewallet" to "E-Wallet", "other" to "Lainnya")) { type = it } }
            if (kind == "Kategori") item { SelectField("Jenis", type, listOf("in" to "Pemasukan", "out" to "Pengeluaran")) { type = it } }
            if (kind in listOf("Target", "Langganan")) item { SelectField("Dompet", walletId, (if (kind == "Target") listOf("" to "Tanpa dompet") else emptyList()) + book.wallets.filter { !it.archived || it.id == walletId }.map { it.id to it.name }) { walletId = it } }
            if (kind in listOf("Anggaran", "Langganan")) item { SelectField("Kategori pengeluaran", categoryId, (if (kind == "Langganan") listOf("" to "Tanpa kategori") else emptyList()) + book.categories.filter { it.type == "out" && (!it.archived || it.id == categoryId) }.map { it.id to it.name }) { categoryId = it } }
            if (kind in listOf("Anggaran", "Langganan")) item { SelectField("Periode", period, listOf("month" to "Bulanan", "year" to "Tahunan") + if (kind == "Langganan") listOf("week" to "Mingguan") else emptyList()) { period = it } }
            if (kind == "Langganan") item { OutlinedTextField(day, { if (it.length <= 2) day = it }, label = { Text(if (period == "week") "Hari (1 Senin–7 Minggu)" else "Tanggal (1–31)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)) }
            if (kind == "Target") item { Row { Checkbox(due.isNotEmpty(), { due = if (it) java.time.LocalDate.now().toString() else "" }); Text("Pakai batas tanggal") }; if (due.isNotEmpty()) NativeDateField(due) { due = it } }
            if (kind in listOf("Anggaran", "Target", "Langganan")) item { OutlinedTextField(note, { if (it.length <= 500) note = it }, label = { Text("Catatan") }) }
            if (error.isNotEmpty()) item { Text(error, color = MaterialTheme.colorScheme.error) }
        }
    }, confirmButton = { TextButton(onClick = {
        runCatching {
            val key = id ?: UUID.randomUUID().toString()
            val value = if (kind == "Dompet") amount.replace(".", "").toLongOrNull()?.takeIf { it in -MAX_RUPIAH..MAX_RUPIAH } else Rupiah.parse(amount)
            require(kind == "Kategori" || value != null) { "Nominal tidak valid" }
            when (kind) {
                "Dompet" -> book.copy(wallets = book.wallets.filterNot { it.id == key } + (wallet ?: Wallet(key, name)).copy(name = name.trim(), initial = value!!, type = type))
                "Kategori" -> book.copy(categories = book.categories.filterNot { it.id == key } + (category ?: Category(key, name, type)).copy(name = name.trim(), type = type))
                "Anggaran" -> book.copy(budgets = book.budgets.filterNot { it.id == key } + Budget(key, categoryId, value!!, period, note.trim()))
                "Target" -> book.copy(goals = book.goals.filterNot { it.id == key } + (goal ?: Goal(key, name, value!!)).copy(name = name.trim(), target = value!!, walletId = walletId, due = due, note = note.trim()))
                "Langganan" -> book.copy(subscriptions = book.subscriptions.filterNot { it.id == key } + (sub ?: Subscription(key, name, value!!, walletId)).copy(name = name.trim(), amount = value!!, walletId = walletId, categoryId = categoryId, cycle = period, day = day.toIntOrNull() ?: 0, ym = sub?.ym?.ifBlank { java.time.YearMonth.now().toString() } ?: java.time.YearMonth.now().toString(), note = note.trim()))
                else -> error("Fitur tidak dikenal")
            }.validate()
        }.onSuccess(onSave).onFailure { error = it.message ?: "Data belum bisa disimpan" }
    }) { Text("Simpan") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } })
}

@Composable fun SelectField(label: String, selected: String, values: List<Pair<String, String>>, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box { OutlinedButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth()) { Text(label + ": " + (values.firstOrNull { it.first == selected }?.second ?: "Pilih")) }
        DropdownMenu(open, { open = false }) { values.forEach { (id, name) -> DropdownMenuItem(text = { Text(name) }, onClick = { onSelect(id); open = false }) } }
    }
}
