package com.savingduit.nativeapp

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONObject

/** Raw cloud snapshots are separate from legacy local books; local draft itself is the durable outbox. */
class CloudBookStore(context: Context) : SQLiteOpenHelper(context, "cloud-books.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""CREATE TABLE cloud_books(account TEXT NOT NULL, book TEXT NOT NULL, revision INTEGER NOT NULL,
            base TEXT NOT NULL, local TEXT NOT NULL, remote TEXT, remote_revision INTEGER, generation INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(account,book))""")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) { error("Migrasi cloud belum tersedia") }
    companion object {
        private fun equal(a: Any?, b: Any?): Boolean = when {
            a is JSONObject && b is JSONObject -> a.keys().asSequence().toSet() == b.keys().asSequence().toSet() && a.keys().asSequence().all { equal(a.get(it), b.get(it)) }
            a is org.json.JSONArray && b is org.json.JSONArray -> a.length() == b.length() && (0 until a.length()).all { equal(a.get(it), b.get(it)) }
            else -> a == b
        }
    }
    data class State(val account: String, val book: String, val revision: Long, val base: String, val local: String, val remote: String?, val remoteRevision: Long?, val generation: Long) {
        val pending get() = !equal(JSONObject(base), JSONObject(local))
        val conflicted get() = remote != null
    }
    private fun scope(account: String, book: String) {
        require(account.isNotBlank() && account != "device-local" && account.length <= 128)
        require(book == "personal" || book.startsWith("family:") && book.length in 8..128)
    }
    fun load(account: String, book: String): State? {
        scope(account, book)
        return readableDatabase.rawQuery("SELECT revision,base,local,remote,remote_revision,generation FROM cloud_books WHERE account=? AND book=?", arrayOf(account, book)).use { c ->
            if (!c.moveToFirst()) null else State(account, book, c.getLong(0), c.getString(1), c.getString(2), if (c.isNull(3)) null else c.getString(3), if (c.isNull(4)) null else c.getLong(4), c.getLong(5))
        }
    }
    fun open(account: String, book: String, revision: Long, raw: String): State {
        scope(account, book); require(revision >= 0); BookJson.decode(raw)
        val values = ContentValues().apply { put("account", account); put("book", book); put("revision", revision); put("base", raw); put("local", raw) }
        writableDatabase.insertWithOnConflict("cloud_books", null, values, SQLiteDatabase.CONFLICT_IGNORE)
        return requireNotNull(load(account, book))
    }
    private fun update(old: State, values: ContentValues): State {
        values.put("generation", Math.addExact(old.generation, 1))
        check(writableDatabase.update("cloud_books", values, "account=? AND book=? AND generation=?", arrayOf(old.account, old.book, old.generation.toString())) == 1) { "Draft cloud berubah; muat ulang" }
        return requireNotNull(load(old.account, old.book))
    }
    fun edit(old: State, book: Book): State = update(old, ContentValues().apply { put("local", BookJson.patch(old.local, BookJson.decode(old.local), book)) })
    fun replaceDraft(old: State, raw: String): State {
        check(!old.conflicted) { "Selesaikan konflik terlebih dahulu" }; BookJson.decode(raw)
        return update(old, ContentValues().apply { put("local", raw) })
    }
    fun receive(old: State, revision: Long, raw: String): State {
        BookJson.decode(raw)
        require(revision >= (old.remoteRevision ?: old.revision)) { "Respons revisi lama ditolak" }
        val same = revision == (old.remoteRevision ?: old.revision)
        require(!same || equal(JSONObject(raw), JSONObject(old.remote ?: old.base))) { "Isi berbeda pada revisi sama" }
        if (same) return old
        return update(old, ContentValues().apply {
            if (!old.pending && !old.conflicted) { put("base", raw); put("local", raw); put("revision", revision) }
            else { put("remote", raw); put("remote_revision", revision) }
        })
    }
    /** Sent snapshot is immutable: edits made during the request remain in the local outbox. */
    fun acknowledge(sent: State, revision: Long, authoritative: String = sent.local): State {
        require(revision == Math.addExact(sent.revision, 1))
        require(BookJson.decode(authoritative) == BookJson.decode(sent.local)) { "ACK server tidak cocok dengan snapshot terkirim" }
        val current = requireNotNull(load(sent.account, sent.book))
        check(current.revision == sent.revision && current.base == sent.base && !current.conflicted) { "ACK bukan untuk base aktif" }
        return update(current, ContentValues().apply {
            put("base", authoritative)
            put("local", BookJson.patch(authoritative, BookJson.decode(sent.local), BookJson.decode(current.local)))
            put("revision", revision)
        })
    }
    fun resolve(old: State, raw: String): State {
        check(old.remote != null && old.remoteRevision != null)
        BookJson.decode(raw)
        return update(old, ContentValues().apply { put("base", old.remote); put("revision", old.remoteRevision); put("local", raw); putNull("remote"); putNull("remote_revision") })
    }
}
