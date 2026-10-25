package com.savingduit.nativeapp

import org.json.JSONObject
import org.json.JSONArray

object BookSharing {
    private val keys = listOf("wallets", "categories", "transactions", "budgets", "goals", "subscriptions")
    private fun id(source: String, original: String): String = "import-" + java.security.MessageDigest.getInstance("SHA-256").digest("$source\u0000$original".toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it.toInt() and 255) }.take(32)
    /** Presentation only. Source IDs never collide even when both books use the same IDs. */
    fun combined(personal: String, family: String): Book {
        val result = JSONObject()
        keys.forEach { result.put(it, JSONArray()) }
        listOf("Pribadi" to personal, "Keluarga" to family).forEach { (source, raw) ->
            BookJson.decode(raw)
            val original = JSONObject(raw)
            keys.forEach { key ->
                val rows = original.getJSONArray(key)
                for (i in 0 until rows.length()) {
                    val row = JSONObject(rows.getJSONObject(i).toString())
                    row.put("id", id(source, row.getString("id")))
                    for (ref in listOf("walletId", "walletTo", "categoryId")) if (row.optString(ref).isNotEmpty()) row.put(ref, id(source, row.getString(ref)))
                    if (row.has("name")) row.put("name", row.getString("name").take(186) + " · " + source)
                    if (key == "transactions") { row.put("receiptId", ""); row.put("note", row.optString("note").take(486) + " · " + source) }
                    result.getJSONArray(key).put(row)
                }
            }
        }
        return BookJson.decode(result.toString())
    }
    /** Explicit wallet selection, related rows only; receipts/plans/settings never cross the boundary. */
    fun selected(sourceScope: String, sourceRaw: String, targetRaw: String, wallets: Set<String>): String {
        require(sourceScope.isNotBlank() && wallets.isNotEmpty()) { "Pilih minimal satu dompet" }
        val source = BookJson.decode(sourceRaw)
        BookJson.decode(targetRaw)
        require(wallets.all { selected -> source.wallets.any { it.id == selected } })
        val selectedTx = source.transactions.filter { it.walletId in wallets && (it.type != "move" || it.walletTo in wallets) }
        val categories = selectedTx.map { it.categoryId }.filter { it.isNotEmpty() }.toSet()
        val original = JSONObject(sourceRaw); val target = JSONObject(targetRaw)
        val modeledRoot = JSONObject(BookJson.encode(source))
        val selection = mapOf("wallets" to wallets, "categories" to categories, "transactions" to selectedTx.map { it.id }.toSet())
        selection.forEach { (key, selected) ->
            val destination = target.getJSONArray(key)
            val existing = (0 until destination.length()).map { destination.getJSONObject(it).getString("id") }.toSet()
            val rows = original.getJSONArray(key)
            val modeled = modeledRoot.getJSONArray(key)
            val publicRows = (0 until modeled.length()).associate { modeled.getJSONObject(it).getString("id") to modeled.getJSONObject(it) }
            for (i in 0 until rows.length()) {
                val sourceRow = rows.getJSONObject(i)
                if (sourceRow.getString("id") !in selected) continue
                val newId = id(sourceScope, sourceRow.getString("id"))
                if (newId in existing) continue // Repeat imports never overwrite already shared edits.
                // Only modeled public financial fields cross; metadata/receipt/attribution do not.
                val row = publicRows.getValue(sourceRow.getString("id"))
                row.put("id", newId)
                for (ref in listOf("walletId", "walletTo", "categoryId")) if (row.optString(ref).isNotEmpty()) row.put(ref, id(sourceScope, row.getString(ref)))
                if (key == "transactions") row.put("receiptId", "")
                destination.put(row)
            }
        }
        return target.toString().also { BookJson.decode(it) }
    }
}
