package com.savingduit.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import java.time.LocalDate
import java.util.UUID

class MainActivity : ComponentActivity() {
    private lateinit var store: BookStore
    private lateinit var cloud: CloudBookStore
    private lateinit var profile: DeviceProfile
    private var locked by mutableStateOf(true)
    override fun onStop() { if (::profile.isInitialized && profile.hasPin) locked = true; super.onStop() }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = BookStore(this)
        cloud = CloudBookStore(this)
        profile = DeviceProfile(this)
        locked = profile.hasPin
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
        val api = AccountApi(SecureSession(this))
        setContent { NativeTheme {
            NativeApp(store, api, cloud, profile) { locked = true }
            if (locked) androidx.compose.ui.window.Dialog(onDismissRequest = {}, properties = androidx.compose.ui.window.DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false, usePlatformDefaultWidth = false, securePolicy = androidx.compose.ui.window.SecureFlagPolicy.SecureOn)) {
                Surface(Modifier.fillMaxSize()) { UnlockScreen(profile) { locked = false } }
            }
        } }
    }
    override fun onDestroy() { store.close(); cloud.close(); super.onDestroy() }
}
private fun rupiah(value: Long) = "Rp " + Rupiah.format(value)

@Composable private fun Panel(color: Color = Color.White, content: @Composable ColumnScope.() -> Unit) {
    Card(shape = RoundedCornerShape(5.dp), border = BorderStroke(2.dp, Ink), colors = CardDefaults.cardColors(containerColor = color), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable private fun NativeApp(store: BookStore, api: AccountApi, cloud: CloudBookStore, profile: DeviceProfile, lock: () -> Unit) {
    var snapshot by remember { mutableStateOf<BookStore.Snapshot?>(null) }
    var error by remember { mutableStateOf("") }
    var page by rememberSaveable { mutableStateOf("Beranda") }
    var editorId by rememberSaveable { mutableStateOf<String?>(null) }
    var adding by rememberSaveable { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Transaction?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    var reportStart by rememberSaveable { mutableStateOf(LocalDate.now().withDayOfMonth(1).toString()) }
    var reportEnd by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var reportType by rememberSaveable { mutableStateOf("") }
    var reportWallet by rememberSaveable { mutableStateOf("") }
    var reportCategory by rememberSaveable { mutableStateOf("") }
    var trendMonths by rememberSaveable { mutableStateOf("0") }
    var periodUnit by rememberSaveable { mutableStateOf("month") }
    var historyStart by rememberSaveable { mutableStateOf("1900-01-01") }
    var historyEnd by rememberSaveable { mutableStateOf("9999-12-31") }
    var historyType by rememberSaveable { mutableStateOf("") }
    var historyWallet by rememberSaveable { mutableStateOf("") }
    var historyCategory by rememberSaveable { mutableStateOf("") }
    var historyFilters by rememberSaveable { mutableStateOf(false) }
    var entityKind by rememberSaveable { mutableStateOf<String?>(null) }
    var entityId by rememberSaveable { mutableStateOf<String?>(null) }
    var removeEntity by remember { mutableStateOf<Pair<String, String>?>(null) }
    var goalAdjustment by rememberSaveable { mutableStateOf<String?>(null) }
    var goalAmount by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(Unit) { runCatching { store.importLegacy() }.onSuccess { snapshot = it }.onFailure { error = it.message ?: "Buku belum bisa dibuka" } }
    val book = snapshot?.draft?.local
    val editor = book?.transactions?.firstOrNull { it.id == editorId }
    fun save(next: Book) {
        val current = snapshot ?: return
        runCatching { store.edit("device-local", "personal", current.generation, next) }
            .onSuccess { snapshot = it; error = "" }
            .onFailure { error = it.message ?: "Gagal menyimpan; draft belum ditutup" }
    }
    BackHandler(page != "Beranda") { page = "Beranda" }
    Scaffold(modifier = Modifier.safeDrawingPadding(), bottomBar = {
        NavigationBar {
            listOf("Beranda", "Transaksi", "+", "Rekap", "Menu").forEach { item ->
                NavigationBarItem(selected = item == page, onClick = { if (item == "+") adding = true else page = item }, icon = { Text(if (item == "+") "+" else item.take(1), fontWeight = FontWeight.Bold) }, label = { if (item != "+") Text(item, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) })
            }
        }
    }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item { Text("KantongKita", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold); Text("Native Android · buku lokal") }
            item { Panel(Color(0xFFFFE881)) { Text("Pengembangan — belum terhubung cloud", fontWeight = FontWeight.Bold); Text("Data keuangan tersimpan di perangkat. Akun tersedia terpisah di Menu; sync buku dan parity penuh belum selesai. Ini belum APK final.") } }
            if (error.isNotEmpty()) item { Panel { Text(error, color = MaterialTheme.colorScheme.error); TextButton(onClick = { runCatching { store.load("device-local", "personal") }.onSuccess { snapshot = it; error = "" } }) { Text("Muat ulang buku") } } }
            if (book != null) {
                if (page == "Beranda") {
                    item { Panel(Orange) { Text("Saldo semua dompet"); Text(rupiah(book.totalBalance()), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold) } }
                    item { Panel(Color(0xFFBCEFD9)) { Text("Pemasukan " + rupiah(book.total("in"))); Text("Pengeluaran " + rupiah(book.total("out"))) } }
                    item { Text("Dompet", style = MaterialTheme.typography.titleLarge) }
                    items(book.wallets, key = { "wallet-" + it.id }) { w -> Panel { Text(w.name, fontWeight = FontWeight.Bold); Text(rupiah(book.walletBalance(w.id))) } }
                    item { Text("Transaksi terbaru", style = MaterialTheme.typography.titleLarge) }
                }
                if (page == "Transaksi") {
                    item { OutlinedTextField(query, { query = it }, label = { Text("Cari catatan atau nominal") }, modifier = Modifier.fillMaxWidth()); TextButton(onClick = { historyFilters = !historyFilters }) { Text("Filter riwayat") } }
                    if (historyFilters) {
                        item { Text("Dari"); NativeDateField(historyStart) { historyStart = it }; Text("Sampai"); NativeDateField(historyEnd) { historyEnd = it } }
                        item { SelectField("Jenis", historyType, listOf("" to "Semua", "in" to "Pemasukan", "out" to "Pengeluaran", "move" to "Transfer")) { historyType = it } }
                        item { SelectField("Dompet", historyWallet, listOf("" to "Semua") + book.wallets.map { it.id to it.name }) { historyWallet = it } }
                        item { SelectField("Kategori", historyCategory, listOf("" to "Semua") + book.categories.map { it.id to it.name }) { historyCategory = it } }
                        item { TextButton(onClick = { historyStart = "1900-01-01"; historyEnd = "9999-12-31"; historyType = ""; historyWallet = ""; historyCategory = ""; query = "" }) { Text("Reset filter") } }
                    }
                }
                if (page in listOf("Beranda", "Transaksi")) {
                    val selection = runCatching { if (page == "Beranda") book else BookReports.filter(book, historyStart, historyEnd, historyType, historyWallet, historyCategory, query) }
                    if (selection.isFailure) item { Text(selection.exceptionOrNull()?.message ?: "Filter tidak valid") }
                    val rows = selection.getOrNull()?.transactions.orEmpty().sortedByDescending { it.date }.let { if (page == "Beranda") it.take(5) else it }
                    if (rows.isEmpty()) item { Panel { Text("Belum ada transaksi."); Button(onClick = { adding = true }) { Text("Tambah transaksi") } } }
                    items(rows, key = { it.id }) { tx -> Panel {
                        Text(tx.note.ifBlank { if (tx.type == "move") "Transfer" else "Transaksi" }, fontWeight = FontWeight.Bold)
                        Text(tx.date + " · " + book.wallets.first { it.id == tx.walletId }.name)
                        Text(rupiah(tx.amount), style = MaterialTheme.typography.titleLarge)
                        Row { TextButton(onClick = { editorId = tx.id }) { Text("Ubah") }; TextButton(onClick = { deleting = tx }) { Text("Hapus") } }
                    } }
                }
                if (page == "Rekap") {
                    val filtered = runCatching { BookReports.filter(book, reportStart, reportEnd, reportType, reportWallet, reportCategory) }
                    item { Text("Dari"); NativeDateField(reportStart) { reportStart = it }; Text("Sampai"); NativeDateField(reportEnd) { reportEnd = it } }
                    item { SelectField("Jenis", reportType, listOf("" to "Semua", "in" to "Pemasukan", "out" to "Pengeluaran", "move" to "Transfer")) { reportType = it } }
                    item { SelectField("Dompet", reportWallet, listOf("" to "Semua") + book.wallets.map { it.id to it.name }) { reportWallet = it } }
                    item { SelectField("Kategori", reportCategory, listOf("" to "Semua") + book.categories.map { it.id to it.name }) { reportCategory = it } }
                    if (filtered.isFailure) item { Text(filtered.exceptionOrNull()?.message ?: "Periode tidak valid", color = MaterialTheme.colorScheme.error) }
                    filtered.getOrNull()?.let { report ->
                        item { Panel { Text("Rekap periode terpilih", style = MaterialTheme.typography.titleLarge); Text("Masuk: " + rupiah(report.total("in"))); Text("Keluar: " + rupiah(report.total("out"))); Text("Selisih: " + rupiah(Math.subtractExact(report.total("in"), report.total("out")))); Text("Transfer tidak dihitung sebagai pemasukan/pengeluaran.") } }
                        item { ExpenseDonut(report) }
                        item { SelectField("Kelompok rekap", periodUnit, listOf("day" to "Harian", "month" to "Bulanan", "year" to "Tahunan")) { periodUnit = it } }
                        items(BookReports.periods(report, periodUnit)) { row -> Panel { Text(row.label); Text("Masuk ${rupiah(row.income)} · Keluar ${rupiah(row.expense)}"); Text("Selisih ${rupiah(row.net)}") } }
                        item { SelectField("Tren", trendMonths, listOf("0" to "30 hari", "6" to "6 bulan", "12" to "12 bulan")) { trendMonths = it } }
                        item { TrendChart(BookReports.trend(report, LocalDate.parse(reportEnd), trendMonths.toInt())) }
                    }
                }
                if (page == "Akun") item { AccountScreen(api) }
                if (page == "Cloud") item { CloudBooksScreen(api, cloud, store) }
                if (page == "Pengaturan") item { snapshot?.let { SettingsScreen(store, it) { reset -> snapshot = reset } } }
                if (page == "Profil") item { ProfileScreen(profile, lock) }
                if (page == "Struk") item { snapshot?.let { ReceiptScreen(store, it) { changed -> snapshot = changed } } }
                if (page == "File") item { snapshot?.let { FileScreen(store, it) { restored -> snapshot = restored } } }
                if (page == "Menu") {
                    item { Button(onClick = { page = "Cloud" }) { Text("Buku cloud dan sinkronisasi") } }
                    item { Button(onClick = { page = "Pengaturan" }) { Text("Pengaturan dan reset") } }
                    item { Button(onClick = { page = "Profil" }) { Text("Profil dan PIN") } }
                    item { Button(onClick = { page = "Struk" }) { Text("Struk pribadi") } }
                    item { Button(onClick = { page = "File" }) { Text("Backup dan ekspor") } }
                    item { Button(onClick = { page = "Akun" }) { Text("Akun dan keluarga") } }
                    listOf("Dompet", "Kategori", "Anggaran", "Target", "Langganan").forEach { section ->
                        item { Button(onClick = { page = section }) { Text(section) } }
                    }
                }
                if (page in listOf("Dompet", "Kategori", "Anggaran", "Target", "Langganan")) {
                    item { Row { TextButton(onClick = { page = "Menu" }) { Text("‹ Menu") }; Button(onClick = { entityKind = page; entityId = null }) { Text("Tambah " + page.lowercase()) } } }
                    val entities: List<Pair<String, String>> = when (page) {
                        "Dompet" -> book.wallets.map { it.id to (it.name + (if (it.archived) " · arsip" else "") + "\n" + rupiah(book.walletBalance(it.id))) }
                        "Kategori" -> book.categories.map { it.id to (it.name + " · " + it.type + if (it.archived) " · arsip" else "") }
                        "Anggaran" -> book.budgets.map { b -> b.id to ((book.categories.firstOrNull { it.id == b.categoryId }?.name ?: "Kategori") + "\nBatas " + rupiah(b.limit) + " / " + b.period + "\nTerpakai " + rupiah(BookReports.budgetUsed(book, b, LocalDate.now())) + "\nSisa / lebih " + rupiah(Math.subtractExact(b.limit, BookReports.budgetUsed(book, b, LocalDate.now())))) }
                        "Target" -> book.goals.map { it.id to (it.name + "\n" + rupiah(it.saved) + " / " + rupiah(it.target)) }
                        else -> book.subscriptions.map { it.id to (it.name + "\n" + rupiah(it.amount) + " / " + it.cycle + if (it.active) " · aktif" else " · nonaktif") }
                    }
                    if (entities.isEmpty()) item { Text("Belum ada " + page.lowercase() + ".") }
                    items(entities, key = { page + it.first }) { (id, label) -> Panel {
                        Text(label, fontWeight = FontWeight.Bold)
                        Row { TextButton(onClick = { entityKind = page; entityId = id }) { Text("Ubah") }; TextButton(onClick = { removeEntity = page to id }) { Text("Hapus") } }
                        if (page == "Dompet" || page == "Kategori") TextButton(onClick = {
                            if (page == "Dompet") save(book.copy(wallets = book.wallets.map { if (it.id == id) it.copy(archived = !it.archived) else it }))
                            else save(book.copy(categories = book.categories.map { if (it.id == id) it.copy(archived = !it.archived) else it }))
                        }) { Text("Arsipkan / aktifkan") }
                        if (page == "Target") TextButton(onClick = { goalAdjustment = id; goalAmount = "" }) { Text("Setor / tarik tabungan") }
                        if (page == "Langganan") {
                            val sub = book.subscriptions.first { it.id == id }
                            val month = java.time.YearMonth.now().toString()
                            TextButton(onClick = {
                                runCatching { if (book.subscriptionPaid(id, month)) book.unpaySubscription(id, month) else book.paySubscription(id, LocalDate.now(), UUID.randomUUID().toString()) }.onSuccess { save(it) }.onFailure { error = it.message ?: "Pembayaran gagal" }
                            }) { Text(if (book.subscriptionPaid(id, month)) "Batalkan pembayaran bulan ini" else "Bayar bulan ini") }
                            TextButton(onClick = { save(book.copy(subscriptions = book.subscriptions.map { if (it.id == id) it.copy(active = !it.active) else it })) }) { Text(if (sub.active) "Nonaktifkan" else "Aktifkan") }
                        }
                    } }
                }
            }
        }
    }
    entityKind?.let { kind -> if (book != null) EntityEditor(kind, entityId, book, { entityKind = null }) { next -> val before = snapshot; save(next); if (snapshot != before) entityKind = null } }
    removeEntity?.let { (kind, id) -> AlertDialog(onDismissRequest = { removeEntity = null }, title = { Text("Hapus " + kind.lowercase() + "?") }, text = { Text("Data yang masih dipakai tidak dapat dihapus. Arsipkan dompet/kategori bila ingin menyembunyikannya.") }, confirmButton = { TextButton(onClick = {
        if (book != null) runCatching { when (kind) {
            "Dompet" -> book.deleteWallet(id)
            "Kategori" -> book.deleteCategory(id)
            "Anggaran" -> book.copy(budgets = book.budgets.filterNot { it.id == id })
            "Target" -> book.copy(goals = book.goals.filterNot { it.id == id })
            else -> book.copy(subscriptions = book.subscriptions.filterNot { it.id == id })
        } }.onSuccess { save(it) }.onFailure { error = it.message ?: "Tidak bisa dihapus" }
        removeEntity = null
    }) { Text("Hapus") } }, dismissButton = { TextButton(onClick = { removeEntity = null }) { Text("Batal") } }) }
    goalAdjustment?.let { id -> AlertDialog(onDismissRequest = { goalAdjustment = null }, title = { Text("Setor / tarik tabungan") }, text = { OutlinedTextField(goalAmount, { goalAmount = it }, label = { Text("Nominal, contoh 10.000") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)) }, confirmButton = {
        Row { listOf(1L to "Setor", -1L to "Tarik").forEach { (sign, label) -> TextButton(onClick = {
            val value = Rupiah.parse(goalAmount)
            if (value == null) error = "Nominal tabungan tidak valid"
            else if (book != null) runCatching { book.adjustGoal(id, sign * value) }.onSuccess { save(it); goalAdjustment = null }.onFailure { error = it.message ?: "Gagal mengubah tabungan" }
        }) { Text(label) } } }
    }, dismissButton = { TextButton(onClick = { goalAdjustment = null }) { Text("Batal") } }) }
    if ((adding || editor != null) && book != null) TransactionDialog(book, editor, onDismiss = { adding = false; editorId = null }) { tx ->
        val before = snapshot
        runCatching { book.saveTransaction(tx) }.onSuccess { save(it); if (snapshot != before) { adding = false; editorId = null } }.onFailure { error = it.message ?: "Transaksi tidak valid" }
    }
    deleting?.let { tx -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text("Hapus transaksi?") }, text = { Text(tx.note + " · " + rupiah(tx.amount)) }, confirmButton = { TextButton(onClick = { book?.let { save(it.deleteTransaction(tx.id)) }; deleting = null }) { Text("Hapus") } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text("Batal") } }) }
}

@Composable fun TransactionDialog(book: Book, existing: Transaction?, onDismiss: () -> Unit, onSave: (Transaction) -> Unit) {
    var note by rememberSaveable(existing?.id) { mutableStateOf(existing?.note ?: "") }
    var amount by rememberSaveable(existing?.id) { mutableStateOf(existing?.amount?.let(Rupiah::format) ?: "") }
    var date by rememberSaveable(existing?.id) { mutableStateOf(existing?.date ?: LocalDate.now().toString()) }
    var type by rememberSaveable(existing?.id) { mutableStateOf(existing?.type ?: "out") }
    var wallet by rememberSaveable(existing?.id) { mutableStateOf(existing?.walletId ?: book.wallets.firstOrNull()?.id ?: "") }
    var destination by rememberSaveable(existing?.id) { mutableStateOf(existing?.walletTo ?: "") }
    var category by rememberSaveable(existing?.id) { mutableStateOf(existing?.categoryId ?: "") }
    var message by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(if (existing == null) "Tambah transaksi" else "Ubah transaksi") }, text = {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.imePadding()) {
            item { Row { listOf("out" to "Keluar", "in" to "Masuk", "move" to "Transfer").forEach { (value, label) -> FilterChip(type == value, { type = value; category = "" }, label = { Text(label) }) } } }
            item { OutlinedTextField(note, { if (it.length <= 500) note = it }, label = { Text("Catatan") }) }
            item { OutlinedTextField(amount, { input -> if (input.isEmpty()) amount = "" else if (input.all { it.isDigit() || it == '.' }) { val digits = input.replace(".", ""); if (digits.length <= 12) amount = digits.toLongOrNull()?.let(Rupiah::format) ?: "" } }, label = { Text("Nominal rupiah") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true) }
            item { NativeDateField(date) { date = it } }
            item { Choice("Dompet", wallet, book.wallets.filter { !it.archived || it.id == wallet }.map { it.id to it.name }) { wallet = it } }
            if (type == "move") item { Choice("Dompet tujuan", destination, book.wallets.filter { it.id != wallet && (!it.archived || it.id == destination) }.map { it.id to it.name }) { destination = it } }
            else item { Choice("Kategori", category, listOf("" to "Tanpa kategori") + book.categories.filter { it.type == type && (!it.archived || it.id == category) }.map { it.id to it.name }) { category = it } }
            if (message.isNotEmpty()) item { Text(message, color = MaterialTheme.colorScheme.error) }
        }
    }, confirmButton = { TextButton(onClick = {
        val value = Rupiah.parse(amount)
        if (value == null) message = "Isi nominal rupiah utuh antara 1 dan 999.999.999.999."
        else runCatching { Transaction(existing?.id ?: UUID.randomUUID().toString(), type, value, date, wallet, if (type == "move") destination else "", if (type == "move") "" else category, note.trim(), existing?.receiptId ?: "").also { book.saveTransaction(it) } }.onSuccess(onSave).onFailure { message = it.message ?: "Transaksi tidak valid" }
    }) { Text("Simpan") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } })
}
@Composable private fun Choice(label: String, selected: String, values: List<Pair<String, String>>, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box { OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(label + ": " + (values.firstOrNull { it.first == selected }?.second ?: "Pilih")) }
        DropdownMenu(expanded, { expanded = false }) { values.forEach { (id, name) -> DropdownMenuItem(text = { Text(name) }, onClick = { onSelect(id); expanded = false }) } }
    }
}
