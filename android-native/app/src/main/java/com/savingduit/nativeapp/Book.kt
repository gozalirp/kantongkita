package com.savingduit.nativeapp

import java.time.LocalDate
import java.time.YearMonth

const val MAX_RUPIAH = 999999999999L

data class Wallet(val id: String, val name: String, val type: String = "cash", val icon: String = "wallet", val color: String = "#F5790B", val initial: Long = 0, val archived: Boolean = false)
data class Category(val id: String, val name: String, val type: String, val icon: String = "tag", val archived: Boolean = false)
data class Transaction(val id: String, val type: String, val amount: Long, val date: String, val walletId: String, val walletTo: String = "", val categoryId: String = "", val note: String = "", val receiptId: String = "")
data class Budget(val id: String, val categoryId: String, val limit: Long, val period: String = "month", val note: String = "")
data class Goal(val id: String, val name: String, val target: Long, val saved: Long = 0, val walletId: String = "", val due: String = "", val note: String = "", val icon: String = "target", val done: Boolean = false)
data class Subscription(val id: String, val name: String, val amount: Long, val walletId: String, val categoryId: String = "", val cycle: String = "month", val day: Int = 1, val ym: String = "", val note: String = "", val active: Boolean = true, val icon: String = "calendar", val lastPaid: String = "")
data class Book(val wallets: List<Wallet> = emptyList(), val categories: List<Category> = emptyList(), val transactions: List<Transaction> = emptyList(), val budgets: List<Budget> = emptyList(), val goals: List<Goal> = emptyList(), val subscriptions: List<Subscription> = emptyList()) {
    fun validate(): Book {
        fun ids(values: List<String>, max: Int) {
            require(values.size <= max && values.distinct().size == values.size) { "ID duplikat atau terlalu banyak data" }
            require(values.all { it.matches(Regex("[A-Za-z0-9_-]{1,40}")) }) { "ID tidak valid" }
        }
        ids(wallets.map { it.id }, 100); ids(categories.map { it.id }, 300)
        ids(transactions.map { it.id }, 20000); ids(budgets.map { it.id }, 300)
        ids(goals.map { it.id }, 100); ids(subscriptions.map { it.id }, 200)
        fun money(value: Long, zero: Boolean = false) = require(value in (if (zero) 0L else 1L)..MAX_RUPIAH) { "Nominal di luar batas" }
        fun date(value: String) = require(runCatching { LocalDate.parse(value).toString() == value }.getOrDefault(false)) { "Tanggal tidak valid" }
        fun month(value: String) = require(runCatching { YearMonth.parse(value).toString() == value }.getOrDefault(false)) { "Bulan tidak valid" }
        fun name(value: String) = require(value.isNotBlank() && value.length <= 200) { "Nama wajib diisi, maksimal 200 karakter" }
        fun wallet(id: String) = require(wallets.any { it.id == id }) { "Dompet tidak ditemukan" }
        fun category(id: String, type: String) = require(id.isEmpty() || categories.any { it.id == id && it.type == type }) { "Kategori tidak sesuai" }
        wallets.forEach { name(it.name); require(it.initial in -MAX_RUPIAH..MAX_RUPIAH); require(it.type in listOf("cash", "bank", "ewallet", "other")) }
        categories.forEach { name(it.name); require(it.type in listOf("in", "out")) }
        transactions.forEach {
            money(it.amount); date(it.date); wallet(it.walletId); require(it.note.length <= 500)
            require(it.type in listOf("in", "out", "move"))
            if (it.type == "move") { wallet(it.walletTo); require(it.walletId != it.walletTo) } else category(it.categoryId, it.type)
        }
        budgets.forEach { money(it.limit); require(it.period in listOf("month", "year")); require(categories.any { c -> c.id == it.categoryId && c.type == "out" }) }
        require(budgets.map { it.categoryId }.distinct().size == budgets.size) { "Kategori sudah punya anggaran" }
        goals.forEach { name(it.name); money(it.target); money(it.saved, true); if (it.walletId.isNotEmpty()) wallet(it.walletId); if (it.due.isNotEmpty()) date(it.due) }
        subscriptions.forEach {
            name(it.name); money(it.amount); wallet(it.walletId); category(it.categoryId, "out")
            require(it.cycle in listOf("month", "year", "week")); require(it.day in 1..(if (it.cycle == "week") 7 else 31))
            if (it.ym.isNotEmpty()) month(it.ym)
        }
        return this
    }

    fun walletBalance(id: String): Long {
        val initial = wallets.single { it.id == id }.initial
        return transactions.fold(initial) { sum, t ->
            val delta = when {
                t.type == "in" && t.walletId == id -> t.amount
                t.type == "out" && t.walletId == id -> -t.amount
                t.type == "move" && t.walletId == id -> -t.amount
                t.type == "move" && t.walletTo == id -> t.amount
                else -> 0L
            }
            Math.addExact(sum, delta)
        }
    }
    fun totalBalance(): Long = wallets.fold(0L) { total, w -> Math.addExact(total, walletBalance(w.id)) }
    fun total(type: String, month: String? = null): Long {
        require(type in listOf("in", "out"))
        return transactions.filter { it.type == type && (month == null || it.date.startsWith("$month-")) }.fold(0L) { sum, t -> Math.addExact(sum, t.amount) }
    }
    fun saveTransaction(tx: Transaction): Book = copy(transactions = transactions.filterNot { it.id == tx.id } + tx).validate()
    fun deleteTransaction(id: String): Book = copy(transactions = transactions.filterNot { it.id == id })
    fun deleteWallet(id: String): Book {
        require(transactions.none { it.walletId == id || it.walletTo == id } && goals.none { it.walletId == id } && subscriptions.none { it.walletId == id }) { "Dompet masih dipakai. Arsipkan saja." }
        return copy(wallets = wallets.filterNot { it.id == id }).validate()
    }
    fun deleteCategory(id: String): Book {
        require(transactions.none { it.categoryId == id } && budgets.none { it.categoryId == id } && subscriptions.none { it.categoryId == id }) { "Kategori masih dipakai. Arsipkan saja." }
        return copy(categories = categories.filterNot { it.id == id }).validate()
    }
    fun adjustGoal(id: String, delta: Long): Book {
        val goal = goals.single { it.id == id }
        val saved = Math.addExact(goal.saved, delta)
        require(saved in 0..MAX_RUPIAH) { "Penarikan melebihi tabungan atau nominal terlalu besar" }
        // Goal progress is independent of wallet balance, matching the web contract.
        return copy(goals = goals.map { if (it.id == id) it.copy(saved = saved, done = saved >= it.target) else it }).validate()
    }
    fun subscriptionPaid(id: String, month: String): Boolean = transactions.any { it.note.contains("/sub:$id/ $month") }
    fun paySubscription(id: String, date: LocalDate, transactionId: String): Book {
        val sub = subscriptions.single { it.id == id }
        val month = YearMonth.from(date).toString()
        require(sub.active && !subscriptionPaid(id, month)) { "Langganan nonaktif atau sudah dibayar" }
        require(transactions.none { it.id == transactionId }) { "ID pembayaran sudah dipakai transaksi lain" }
        return saveTransaction(Transaction(transactionId, "out", sub.amount, date.toString(), sub.walletId, categoryId = sub.categoryId, note = "${sub.name} /sub:$id/ $month"))
    }
    fun unpaySubscription(id: String, month: String): Book = copy(transactions = transactions.filterNot { it.note.contains("/sub:$id/ $month") })
}

object Rupiah {
    fun parse(text: String): Long? {
        if (!text.matches(Regex("(?:[0-9]+|[0-9]{1,3}(?:\\.[0-9]{3})+)"))) return null
        return text.replace(".", "").toLongOrNull()?.takeIf { it in 1..MAX_RUPIAH }
    }
    fun format(amount: Long): String = amount.toString().replace(Regex("\\B(?=(\\d{3})+(?!\\d))"), ".")
}

// The revision belongs to the immutable base, never merely the latest GET.
// A conflict retains both drafts; only an explicit resolution may change the base.
data class SyncDraft(val baseRevision: Long = 0, val base: Book, val local: Book = base, val remote: Book? = null, val remoteRevision: Long? = null) {
    init {
        require(baseRevision >= 0)
        require((remote == null) == (remoteRevision == null)) { "Snapshot remote dan revisinya wajib berpasangan" }
        require(remoteRevision == null || remoteRevision >= baseRevision) { "Revisi remote lebih lama dari basis" }
    }
    val pending: Boolean get() = local != base
    val conflicted: Boolean get() = remoteRevision != null
    fun edit(book: Book): SyncDraft = copy(local = book.validate())
    fun receive(book: Book, revision: Long): SyncDraft {
        require(revision >= (remoteRevision ?: baseRevision)) { "Respons remote sudah kedaluwarsa" }
        book.validate()
        if (revision == baseRevision) require(book == base) { "Isi berubah pada revisi yang sama" }
        if (revision == remoteRevision) require(book == remote) { "Isi remote berubah pada revisi yang sama" }
        return if (!pending && !conflicted) SyncDraft(revision, book) else copy(remote = book, remoteRevision = revision)
    }
    fun acknowledge(sent: Book, revision: Long): SyncDraft {
        require(!conflicted && revision == Math.addExact(baseRevision, 1)) { "Acknowledgment tidak sesuai basis kiriman" }
        return copy(baseRevision = revision, base = sent.validate())
    }
    fun resolve(merged: Book): SyncDraft {
        val revision = requireNotNull(remoteRevision)
        return SyncDraft(revision, requireNotNull(remote), merged.validate())
    }
}
