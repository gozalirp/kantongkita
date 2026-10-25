package com.savingduit.nativeapp

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

@Composable fun CloudBooksScreen(api: AccountApi, store: CloudBookStore, deviceStore: BookStore) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val identities = remember { CloudIdentity(context) }
    val deviceSource = remember {
        val prefs = context.getSharedPreferences("device-profile", android.content.Context.MODE_PRIVATE)
        prefs.getString("share-source", null) ?: java.util.UUID.randomUUID().toString().also { check(prefs.edit().putString("share-source", it).commit()) }
    }
    var identity by remember { mutableStateOf(identities.cached(api.sessionKey())) }
    var current by remember { mutableStateOf<CloudBookStore.State?>(null) }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    var editor by remember { mutableStateOf<Transaction?>(null) }
    var deleting by remember { mutableStateOf<Transaction?>(null) }
    var resolving by remember { mutableStateOf<String?>(null) }
    var entityKind by remember { mutableStateOf<String?>(null) }
    var entityId by remember { mutableStateOf<String?>(null) }
    var section by remember { mutableStateOf("Transaksi") }
    var page by remember { mutableStateOf(0) }
    var combined by remember { mutableStateOf<Book?>(null) }
    var sharing by remember { mutableStateOf(false) }
    var shareRaw by remember { mutableStateOf("") }
    var shareWallets by remember { mutableStateOf(setOf<String>()) }
    var sharePreview by remember { mutableStateOf<String?>(null) }
    fun <T> run(action: () -> T, after: (T) -> Unit) {
        if (busy) return
        busy = true
        scope.launch {
            try { val result = withContext(Dispatchers.IO) { action() }; after(result) }
            catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (e: Exception) { if (e is AccountApi.ApiError && e.status == 401) { current = null; identity = null }; message = e.message ?: "Cloud belum tersedia" }
            finally { busy = false }
        }
    }
    fun guard(state: CloudBookStore.State) {
        val verified = identities.cached(api.sessionKey()) ?: error("Periksa sesi kembali sebelum mengedit cache")
        check(verified.id == state.account && (state.book == "personal" || state.book == "family:" + verified.family)) { "Akun/keluarga berubah" }
    }
    fun edit(state: CloudBookStore.State, next: Book, done: () -> Unit = {}) = run({ guard(state); store.edit(state, next) }) {
        current = it; message = "Draft tersimpan di perangkat; sinkronkan untuk mengirim"; done()
    }
    fun open(book: String, offline: Boolean = false) = run({
        val user = if (offline) identities.cached(api.sessionKey()) ?: error("Cache sesi tidak tersedia atau kedaluwarsa") else identities.verify(api)
        check(book == "personal" || book == "family:" + user.family) { "Keanggotaan keluarga berubah" }
        val cached = store.load(user.id, book)
        val state = if (cached != null) cached else {
            check(!offline) { "Buku ini belum pernah diunduh" }
            val reply = api.request(if (book == "personal") "personal/data" else "data")
            val raw = reply.optJSONObject("data") ?: JSONObject(BookJson.encode(Book()))
            for (key in listOf("wallets", "categories", "transactions", "budgets", "goals", "subscriptions")) if (!raw.has(key)) raw.put(key, org.json.JSONArray())
            store.open(user.id, book, reply.getLong("revision"), raw.toString())
        }
        user to state
    }) { (user, state) -> identity = user; current = state; combined = null; page = 0; message = if (offline) "Cache offline; hak akses server diperiksa ulang saat sinkronisasi" else "Buku cloud dibuka; buku perangkat tidak diunggah" }
    Column {
        Text("Buku cloud", style = MaterialTheme.typography.titleLarge)
        Text("Cache terpisah per akun/buku. Mode offline tersedia 24 jam sejak pemeriksaan sesi; logout/akun baru memutus akses cache sesi lama.")
        Button(enabled = !busy, onClick = { open("personal") }) { Text("Buka buku pribadi cloud") }
        Button(enabled = !busy, onClick = { run({ identities.verify(api) }) { identity = it; message = "Identitas keluarga diperiksa" } }) { Text("Periksa keluarga") }
        identity?.let { user ->
            Button(enabled = !busy, onClick = { open("family:${user.family}") }) { Text("Buka buku keluarga cloud") }
            TextButton(enabled = !busy, onClick = { open("personal", true) }) { Text("Cache pribadi offline") }
            TextButton(enabled = !busy, onClick = { open("family:${user.family}", true) }) { Text("Cache keluarga offline") }
            TextButton(enabled = !busy, onClick = { run({
                check(identities.cached(api.sessionKey()) == user) { "Periksa sesi kembali" }
                val personal = store.load(user.id, "personal") ?: error("Unduh buku pribadi terlebih dahulu")
                val family = store.load(user.id, "family:${user.family}") ?: error("Unduh buku keluarga terlebih dahulu")
                BookSharing.combined(personal.local, family.local)
            }) { combined = it; current = null; message = "Gabungan cache, hanya baca; tidak dapat diekspor/disimpan" } }) { Text("Lihat gabungan cache (hanya baca)") }
        }
        combined?.let { book ->
            Text("Gabungan pribadi + keluarga · hanya baca")
            Text("Saldo Rp ${Rupiah.format(book.totalBalance())} · Masuk ${Rupiah.format(book.total("in"))} · Keluar ${Rupiah.format(book.total("out"))}")
            ExpenseDonut(book)
            book.wallets.forEach { Text("${it.name}: ${Rupiah.format(book.walletBalance(it.id))}") }
        }
        current?.let { state ->
            val book = BookJson.decode(state.local)
            Text("${state.book} · revisi ${state.revision} · ${book.transactions.size} transaksi")
            Text("Saldo Rp ${Rupiah.format(book.totalBalance())}; ${if (state.conflicted) "KONFLIK" else if (state.pending) "Perubahan menunggu" else "Tersimpan"}")
            Button(enabled = !busy, onClick = { run({ CloudSync(api, store).sync(state) }) { current = it; message = if (it.conflicted) "Konflik tersimpan; pilih penyelesaian" else if (it.pending) "Masih ada perubahan menunggu" else "Sinkronisasi dikonfirmasi" } }) { Text("Sinkronkan / coba ulang") }
            if (state.book.startsWith("family:") && !state.conflicted) TextButton(enabled = !busy, onClick = { run({ guard(state); deviceStore.rawLocal("device-local", "personal") }) { shareRaw = it; shareWallets = emptySet(); sharePreview = null; sharing = true } }) { Text("Pilih catatan perangkat untuk dibagikan") }
            SelectField("Bagian buku", section, listOf("Transaksi", "Dompet", "Kategori", "Anggaran", "Target", "Langganan").map { it to it }) { section = it; page = 0 }
            if (section == "Transaksi") {
                Button(enabled = !busy && !state.conflicted && book.wallets.isNotEmpty(), onClick = { adding = true }) { Text("Tambah transaksi cloud") }
                book.transactions.sortedByDescending { it.date }.drop(page * 50).take(50).forEach { tx ->
                    Text("${tx.date} · ${tx.note} · Rp ${Rupiah.format(tx.amount)}")
                    TextButton(enabled = !busy && !state.conflicted, onClick = { editor = tx }) { Text("Ubah transaksi cloud") }
                    TextButton(enabled = !busy && !state.conflicted, onClick = { deleting = tx }) { Text("Hapus transaksi cloud") }
                }
                TextButton(enabled = !busy && page > 0, onClick = { page-- }) { Text("Halaman sebelumnya") }
                TextButton(enabled = !busy && (page + 1) * 50 < book.transactions.size, onClick = { page++ }) { Text("Halaman berikutnya") }
            } else {
                Button(enabled = !busy && !state.conflicted, onClick = { entityId = null; entityKind = section }) { Text("Tambah ${section.lowercase()} cloud") }
                val rows = when(section) {
                    "Dompet" -> book.wallets.map { it.id to it.name }
                    "Kategori" -> book.categories.map { it.id to it.name }
                    "Anggaran" -> book.budgets.map { it.id to (it.note.ifEmpty { it.categoryId } + " · " + Rupiah.format(it.limit)) }
                    "Target" -> book.goals.map { it.id to it.name }
                    else -> book.subscriptions.map { it.id to it.name }
                }
                rows.forEach { (id, label) -> Text(label); TextButton(enabled = !busy && !state.conflicted, onClick = { entityId = id; entityKind = section }) { Text("Ubah $section cloud") } }
            }
            if (state.conflicted) {
                Text("Draft lokal dan server disimpan terpisah; tidak ada overwrite otomatis.")
                TextButton(enabled = !busy, onClick = { resolving = "server" }) { Text("Pilih versi server") }
                TextButton(enabled = !busy, onClick = { resolving = "local" }) { Text("Pilih draft lokal") }
                Button(enabled = !busy, onClick = { run({
                    guard(state)
                    val result = BookReconciliation.merge(state.base, state.local, requireNotNull(state.remote))
                    check(result.merged != null) { "Konflik perlu pilihan eksplisit: ${result.conflicts.joinToString()}" }
                    store.resolve(state, result.merged)
                }) { current = it; message = "Hasil gabungan siap ditinjau, belum dikirim" } }) { Text("Gabungkan perubahan independen") }
            }
        }
        if (busy) CircularProgressIndicator()
        Text(message)
        Text("Buku cloud terpisah dari buku perangkat. Pembagian catatan hanya dilakukan setelah pilihan dan konfirmasi.")
    }
    current?.let { state ->
        val book = BookJson.decode(state.local)
        if (sharing) AlertDialog(onDismissRequest = { sharing = false }, title = { Text("Bagikan catatan perangkat?") }, text = {
            androidx.compose.foundation.lazy.LazyColumn {
                item { Text("Pilih dompet. Hanya dompet, kategori terkait, dan transaksi terpilih disalin. Transfer perlu kedua dompet. Struk/target/anggaran/langganan tidak ikut. Asli tetap ada. Hasil menjadi draft keluarga sebelum dikirim.") }
                BookJson.decode(shareRaw).wallets.forEach { wallet -> item { FilterChip(selected = wallet.id in shareWallets, onClick = { shareWallets = if (wallet.id in shareWallets) shareWallets - wallet.id else shareWallets + wallet.id; sharePreview = null }, label = { Text(wallet.name) }) } }
                sharePreview?.let { raw -> item { Text("Setelah salin: ${BookJson.decode(raw).transactions.size} transaksi keluarga (sebelumnya ${book.transactions.size}). Salin ulang tidak menimpa hasil sebelumnya.") } }
            }
        }, confirmButton = { TextButton(enabled = !busy && shareWallets.isNotEmpty(), onClick = {
            val preview = sharePreview
            if (preview == null) run({ guard(state); BookSharing.selected(deviceSource, shareRaw, state.local, shareWallets) }) { sharePreview = it }
            else run({ guard(state); store.replaceDraft(state, preview) }) { current = it; sharing = false; sharePreview = null; message = "Salinan masuk draft keluarga, belum dikirim" }
        }) { Text(if (sharePreview == null) "Tinjau hasil" else "Konfirmasi salin ke draft") } }, dismissButton = { TextButton(onClick = { sharing = false }) { Text("Batal") } })
        entityKind?.let { kind -> EntityEditor(kind, entityId, book, { entityKind = null }) { next -> edit(state, next) { entityKind = null } } }
        if (adding || editor != null) TransactionDialog(book, editor, { adding = false; editor = null }) { tx -> edit(state, book.saveTransaction(tx)) { adding = false; editor = null } }
        deleting?.let { tx -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text("Hapus transaksi cloud?") }, text = { Text(tx.note) }, confirmButton = { TextButton(enabled = !busy, onClick = { edit(state, book.deleteTransaction(tx.id)) { deleting = null } }) { Text("Hapus") } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text("Batal") } }) }
        resolving?.let { choice -> AlertDialog(onDismissRequest = { resolving = null }, title = { Text("Konfirmasi penyelesaian konflik") }, text = { Text(if (choice == "server") "Draft lokal diganti versi server. Perubahan lokal yang berbeda dilepas." else "Seluruh draft lokal dipilih, termasuk penghapusan. Perubahan server yang berbeda tidak dipertahankan. Belum dikirim sampai sinkronisasi berikutnya.") }, confirmButton = { TextButton(enabled = !busy, onClick = { run({ guard(state); store.resolve(state, if (choice == "server") requireNotNull(state.remote) else state.local) }) { current = it; resolving = null; message = "Konflik diselesaikan eksplisit" } }) { Text("Konfirmasi pilihan") } }, dismissButton = { TextButton(onClick = { resolving = null }) { Text("Batal") } }) }
    }
}
