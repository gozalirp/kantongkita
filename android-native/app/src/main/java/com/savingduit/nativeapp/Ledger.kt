package com.savingduit.nativeapp

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.content.ContentValues
import java.time.LocalDate
import java.util.UUID

data class Entry(val id: String, val note: String, val amount: Long, val income: Boolean, val date: String)

object LedgerRules {
    fun amount(text: String): Long? = if (text.matches(Regex("[0-9]{1,12}"))) text.toLongOrNull()?.takeIf { it > 0 } else null
    fun valid(note: String, amount: Long, date: String): Boolean =
        note.isNotBlank() && note.length <= 200 && amount in 1..999999999999L &&
            runCatching { LocalDate.parse(date).toString() == date }.getOrDefault(false)
}

class Ledger(context: Context) : SQLiteOpenHelper(context, "native-preview.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE entries(id TEXT PRIMARY KEY,note TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),income INTEGER NOT NULL CHECK(income IN(0,1)),date TEXT NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        error("Migrasi database belum tersedia; data tidak dihapus")
    }
    fun entries(): List<Entry> = readableDatabase.rawQuery("SELECT id,note,amount,income,date FROM entries ORDER BY date DESC,rowid DESC", null).use { c ->
        buildList { while (c.moveToNext()) add(Entry(c.getString(0), c.getString(1), c.getLong(2), c.getInt(3) == 1, c.getString(4))) }
    }
    fun add(note: String, amount: Long, income: Boolean, date: String) {
        require(LedgerRules.valid(note.trim(), amount, date))
        val values = ContentValues().apply {
            put("id", UUID.randomUUID().toString()); put("note", note.trim()); put("amount", amount)
            put("income", if (income) 1 else 0); put("date", date)
        }
        check(writableDatabase.insertOrThrow("entries", null, values) != -1L)
    }
    fun remove(id: String) { check(writableDatabase.delete("entries", "id=?", arrayOf(id)) == 1) }
}
