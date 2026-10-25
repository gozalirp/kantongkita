package com.savingduit.nativeapp

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/** Separate scoped store; legacy preview remains readable and is never dropped. */
class BookStore(private val context: Context) : SQLiteOpenHelper(context, "scoped-books.db", null, 2) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""CREATE TABLE books(
            account_id TEXT NOT NULL, book_id TEXT NOT NULL,
            base_revision INTEGER NOT NULL DEFAULT 0 CHECK(base_revision>=0),
            base_json TEXT NOT NULL, local_json TEXT NOT NULL,
            remote_revision INTEGER, remote_json TEXT,
            generation INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(account_id,book_id),
            CHECK((remote_revision IS NULL) = (remote_json IS NULL)))""")
        db.execSQL("CREATE TABLE migrations(name TEXT PRIMARY KEY)")
        createRestoreHistory(db)
    }
    private fun createRestoreHistory(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE restore_history(id INTEGER PRIMARY KEY CHECK(id=1), before_json TEXT NOT NULL, restored_generation INTEGER NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        check(oldVersion == 1 && newVersion == 2) { "Migrasi belum tersedia; database tidak dihapus" }
        createRestoreHistory(db)
    }
    data class Snapshot(val draft: SyncDraft, val generation: Long)
    private fun scope(account: String, book: String) {
        require(account.isNotBlank() && account.length <= 128 && book.isNotBlank() && book.length <= 128)
        require(book != "combined") { "Buku gabungan hanya tampilan, bukan tujuan penyimpanan" }
    }
    private fun read(db: SQLiteDatabase, account: String, book: String): Snapshot? {
        scope(account, book)
        return db.rawQuery("SELECT base_revision,base_json,local_json,remote_revision,remote_json,generation FROM books WHERE account_id=? AND book_id=?", arrayOf(account, book)).use { c ->
            if (!c.moveToFirst()) null else Snapshot(SyncDraft(c.getLong(0), BookJson.decode(c.getString(1)), BookJson.decode(c.getString(2)), if (c.isNull(4)) null else BookJson.decode(c.getString(4)), if (c.isNull(3)) null else c.getLong(3)), c.getLong(5))
        }
    }
    fun load(account: String, book: String): Snapshot? = read(readableDatabase, account, book)
    private fun values(draft: SyncDraft) = ContentValues().apply {
        require(draft.baseRevision >= 0)
        put("base_revision", draft.baseRevision); put("base_json", BookJson.encode(draft.base)); put("local_json", BookJson.encode(draft.local))
        if (draft.remote == null) putNull("remote_json") else put("remote_json", BookJson.encode(draft.remote))
        if (draft.remoteRevision == null) putNull("remote_revision") else put("remote_revision", draft.remoteRevision)
    }
    fun create(account: String, book: String, initial: Book): Snapshot {
        scope(account, book)
        val db = writableDatabase
        val v = values(SyncDraft(0, initial)).apply { put("account_id", account); put("book_id", book); put("generation", 0) }
        db.insertWithOnConflict("books", null, v, SQLiteDatabase.CONFLICT_IGNORE)
        return requireNotNull(read(db, account, book))
    }
    fun rawLocal(account: String, book: String): String {
        scope(account, book)
        return readableDatabase.rawQuery("SELECT local_json FROM books WHERE account_id=? AND book_id=?", arrayOf(account, book)).use { c -> check(c.moveToFirst()); c.getString(0) }
    }
    /** Restore is explicit, CAS guarded, and only allowed for the device book. */
    fun restoreLocal(expectedGeneration: Long, raw: String): Snapshot {
        BookJson.decode(raw)
        val db = writableDatabase
        db.beginTransaction()
        try {
            val current = requireNotNull(read(db, "device-local", "personal"))
            check(current.generation == expectedGeneration) { "Buku berubah; tinjau ulang backup sebelum memulihkan" }
            val next = Math.addExact(expectedGeneration, 1)
            val history = ContentValues().apply { put("id", 1); put("before_json", rawLocal("device-local", "personal")); put("restored_generation", next) }
            check(db.insertWithOnConflict("restore_history", null, history, SQLiteDatabase.CONFLICT_REPLACE) != -1L)
            val values = ContentValues().apply { put("local_json", raw); put("generation", next) }
            check(db.update("books", values, "account_id=? AND book_id=? AND generation=?", arrayOf("device-local", "personal", expectedGeneration.toString())) == 1)
            val result = requireNotNull(read(db, "device-local", "personal"))
            db.setTransactionSuccessful()
            return result
        } finally { db.endTransaction() }
    }
    fun canUndoRestore(): Boolean = readableDatabase.rawQuery("SELECT 1 FROM restore_history h JOIN books b ON b.account_id='device-local' AND b.book_id='personal' AND b.generation=h.restored_generation", null).use { it.moveToFirst() }
    /** Undo never discards edits made after restore; history and restore commit atomically. */
    fun undoRestore(): Snapshot {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val (raw, generation) = db.rawQuery("SELECT before_json,restored_generation FROM restore_history WHERE id=1", null).use { c -> check(c.moveToFirst()) { "Tidak ada restore untuk dibatalkan" }; c.getString(0) to c.getLong(1) }
            BookJson.decode(raw)
            val values = ContentValues().apply { put("local_json", raw); put("generation", Math.addExact(generation, 1)) }
            check(db.update("books", values, "account_id=? AND book_id=? AND generation=?", arrayOf("device-local", "personal", generation.toString())) == 1) { "Buku sudah diedit setelah restore; undo ditolak agar perubahan tidak hilang" }
            db.delete("restore_history", "id=1", null)
            val result = requireNotNull(read(db, "device-local", "personal"))
            db.setTransactionSuccessful()
            return result
        } finally { db.endTransaction() }
    }
    /** Local editing must not strip unknown web fields from the stored snapshot. */
    fun edit(account: String, book: String, expectedGeneration: Long, next: Book): Snapshot {
        scope(account, book)
        next.validate()
        val db = writableDatabase
        db.beginTransaction()
        try {
            val current = requireNotNull(read(db, account, book))
            check(current.generation == expectedGeneration) { "Buku berubah. Muat ulang sebelum menyimpan." }
            val original = db.rawQuery("SELECT local_json FROM books WHERE account_id=? AND book_id=?", arrayOf(account, book)).use { c -> check(c.moveToFirst()); c.getString(0) }
            val json = BookJson.patch(original, current.draft.local, next)
            val generation = Math.addExact(expectedGeneration, 1)
            val v = ContentValues().apply { put("local_json", json); put("generation", generation) }
            check(db.update("books", v, "account_id=? AND book_id=? AND generation=?", arrayOf(account, book, expectedGeneration.toString())) == 1)
            val result = Snapshot(current.draft.edit(next), generation)
            db.setTransactionSuccessful()
            return result
        } finally { db.endTransaction() }
    }
    /** A stale screen or in-flight callback cannot overwrite newer persisted edits. */
    fun save(account: String, book: String, expectedGeneration: Long, draft: SyncDraft): Snapshot {
        scope(account, book)
        val next = Math.addExact(expectedGeneration, 1)
        val v = values(draft).apply { put("generation", next) }
        check(writableDatabase.update("books", v, "account_id=? AND book_id=? AND generation=?", arrayOf(account, book, expectedGeneration.toString())) == 1) { "Buku berubah. Muat ulang sebelum menyimpan." }
        return Snapshot(draft, next)
    }
    /** Explicit import into device-local scope only; never auto-attach old data to a cloud account. */
    fun importLegacy(): Snapshot {
        val db = writableDatabase
        // Once migrated, startup must no longer depend on a retired database being readable.
        val alreadyImported = db.rawQuery("SELECT 1 FROM migrations WHERE name='legacy-preview-v1'", null).use { it.moveToFirst() }
        if (alreadyImported) return requireNotNull(read(db, "device-local", "personal"))
        // SQLiteOpenHelper implements AutoCloseable only on newer Android releases.
        val ledger = Ledger(context)
        val legacy = try { ledger.entries() } finally { ledger.close() }
        val initial = Book(
            wallets = listOf(Wallet("legacy_cash", "Tunai"), Wallet("bank", "Rekening Bank", type = "bank"), Wallet("ewallet", "E-Wallet", type = "ewallet")),
            categories = listOf(Category("salary", "Gaji", "in"), Category("income_other", "Pemasukan lain", "in"), Category("food", "Makan & Minum", "out"), Category("transport", "Transport", "out"), Category("bills", "Tagihan", "out"), Category("expense_other", "Pengeluaran lain", "out")),
            transactions = legacy.map { Transaction(it.id, if (it.income) "in" else "out", it.amount, it.date, "legacy_cash", note = it.note) }
        ).validate()
        db.beginTransaction()
        try {
            val imported = db.rawQuery("SELECT 1 FROM migrations WHERE name='legacy-preview-v1'", null).use { it.moveToFirst() }
            if (!imported) {
                check(read(db, "device-local", "personal") == null) { "Buku lokal sudah ada; impor perlu ditinjau agar tidak tertimpa" }
                create("device-local", "personal", initial)
                db.execSQL("INSERT INTO migrations(name) VALUES('legacy-preview-v1')")
            }
            val result = requireNotNull(read(db, "device-local", "personal"))
            db.setTransactionSuccessful()
            return result
        } finally { db.endTransaction() }
    }
}
