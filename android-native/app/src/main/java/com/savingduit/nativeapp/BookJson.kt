package com.savingduit.nativeapp

import org.json.JSONArray
import org.json.JSONObject

/** Explicit allowlist matches /api/family/{personal/,}save without local secrets. */
object BookJson {
    private fun array(values: List<JSONObject>) = JSONArray(values)
    fun encode(book: Book): String {
        book.validate()
        return JSONObject().apply {
            put("wallets", array(book.wallets.map { w -> JSONObject().apply { put("id", w.id); put("name", w.name); put("type", w.type); put("icon", w.icon); put("color", w.color); put("initial", w.initial); put("archived", w.archived) } }))
            put("categories", array(book.categories.map { c -> JSONObject().apply { put("id", c.id); put("name", c.name); put("type", c.type); put("icon", c.icon); put("archived", c.archived) } }))
            put("transactions", array(book.transactions.map { t -> JSONObject().apply { put("id", t.id); put("type", t.type); put("amount", t.amount); put("date", t.date); put("walletId", t.walletId); put("walletTo", t.walletTo); put("categoryId", t.categoryId); put("note", t.note); put("receiptId", t.receiptId) } }))
            put("budgets", array(book.budgets.map { b -> JSONObject().apply { put("id", b.id); put("categoryId", b.categoryId); put("limit", b.limit); put("period", b.period); put("note", b.note) } }))
            put("goals", array(book.goals.map { g -> JSONObject().apply { put("id", g.id); put("name", g.name); put("target", g.target); put("saved", g.saved); put("walletId", g.walletId); put("due", g.due); put("note", g.note); put("icon", g.icon); put("done", g.done) } }))
            put("subscriptions", array(book.subscriptions.map { s -> JSONObject().apply { put("id", s.id); put("name", s.name); put("amount", s.amount); put("walletId", s.walletId); put("categoryId", s.categoryId); put("cycle", s.cycle); put("day", s.day); put("ym", s.ym); put("note", s.note); put("active", s.active); put("icon", s.icon); put("lastPaid", s.lastPaid) } }))
        }.toString()
    }
    /** Apply only native-edited fields; preserve web metadata and absent/default fields. */
    fun patch(original: String, before: Book, after: Book): String {
        val raw = JSONObject(original)
        val old = JSONObject(encode(before))
        val next = JSONObject(encode(after))
        for (collection in listOf("wallets", "categories", "transactions", "budgets", "goals", "subscriptions")) {
            val originals = raw.getJSONArray(collection).let { a -> (0 until a.length()).associate { i -> a.getJSONObject(i).let { it.getString("id") to it } } }
            val previous = old.getJSONArray(collection).let { a -> (0 until a.length()).associate { i -> a.getJSONObject(i).let { it.getString("id") to it } } }
            val output = JSONArray()
            val rows = next.getJSONArray(collection)
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                val id = row.getString("id")
                val prior = previous[id]
                val result = originals[id]?.let { JSONObject(it.toString()) } ?: JSONObject(row.toString())
                for (key in row.keys()) {
                    if (prior == null || prior.get(key) != row.get(key)) result.put(key, row.get(key))
                }
                output.put(result)
            }
            raw.put(collection, output)
        }
        return raw.toString().also { decode(it) }
    }
    private fun JSONObject.money(key: String, fallback: Long? = null): Long {
        if (!has(key) && fallback != null) return fallback
        val value = get(key)
        require(value is Number && value.toString().toLongOrNull() != null) { "Nominal $key bukan integer rupiah" }
        return value.toString().toLong()
    }
    private fun JSONObject.items(key: String, max: Int): List<JSONObject> {
        val array = getJSONArray(key)
        require(array.length() <= max) { "Terlalu banyak $key" }
        return (0 until array.length()).map { array.getJSONObject(it) }
    }
    fun decode(text: String): Book {
        require(text.toByteArray(Charsets.UTF_8).size <= 20_000_000) { "Buku terlalu besar" }
        val j = JSONObject(text)
        return Book(
            wallets = j.items("wallets", 100).map { Wallet(it.getString("id"), it.getString("name"), it.optString("type", "cash"), it.optString("icon", "wallet"), it.optString("color", "#F5790B"), it.money("initial", 0), it.optBoolean("archived")) },
            categories = j.items("categories", 300).map { Category(it.getString("id"), it.getString("name"), it.getString("type"), it.optString("icon", "tag"), it.optBoolean("archived")) },
            transactions = j.items("transactions", 20000).map { Transaction(it.getString("id"), it.getString("type"), it.money("amount"), it.getString("date"), it.getString("walletId"), it.optString("walletTo"), it.optString("categoryId"), it.optString("note"), it.optString("receiptId")) },
            budgets = j.items("budgets", 300).map { Budget(it.getString("id"), it.getString("categoryId"), it.money("limit"), it.optString("period", "month"), it.optString("note")) },
            goals = j.items("goals", 100).map { Goal(it.getString("id"), it.getString("name"), it.money("target"), it.money("saved", 0), it.optString("walletId"), it.optString("due"), it.optString("note"), it.optString("icon", "target"), it.optBoolean("done")) },
            subscriptions = j.items("subscriptions", 200).map { Subscription(it.getString("id"), it.getString("name"), it.money("amount"), it.getString("walletId"), it.optString("categoryId"), it.optString("cycle", "month"), it.optInt("day", 1), it.optString("ym"), it.optString("note"), it.optBoolean("active", true), it.optString("icon", "calendar"), it.optString("lastPaid")) }
        ).validate()
    }
}
