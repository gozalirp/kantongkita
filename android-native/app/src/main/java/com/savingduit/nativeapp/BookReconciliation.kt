package com.savingduit.nativeapp

import org.json.JSONArray
import org.json.JSONObject

/** Three-way merge of wire snapshots. No input is mutated; unknown fields are retained.
 * A missing field/entity differs from JSON null. Arrays outside book collections are atomic.
 * Never send a result with conflicts; the caller must retain all three original snapshots.
 */
object BookReconciliation {
    data class Result(val merged: String?, val conflicts: List<String>)
    private val missing = Any()
    private val collections = setOf("wallets", "categories", "transactions", "budgets", "goals", "subscriptions")

    fun merge(base: String, local: String, remote: String): Result {
        val conflicts = mutableListOf<String>()
        val b = parse(base); val l = parse(local); val r = parse(remote)
        val merged = mergeValue(b, l, r, "", conflicts) as JSONObject
        if (conflicts.isEmpty()) {
            // Independent edits can still break references (wallet deletion vs new expense).
            try { BookJson.decode(merged.toString()) }
            catch (_: IllegalArgumentException) { conflicts.add("/validation") }
            catch (_: org.json.JSONException) { conflicts.add("/validation") }
        }
        return Result(if (conflicts.isEmpty()) merged.toString() else null, conflicts.toList())
    }
    private fun parse(text: String): JSONObject {
        require(text.toByteArray(Charsets.UTF_8).size <= 20_000_000) { "Buku terlalu besar" }
        val root = JSONObject(text)
        collections.forEach { name ->
            val array = root.getJSONArray(name)
            index(array) // Reject duplicate/missing IDs even on the unchanged fast path.
        }
        return root
    }
    private fun index(array: JSONArray): Map<String, JSONObject> {
        require(array.length() <= 20000) { "Koleksi terlalu besar" }
        val result = linkedMapOf<String, JSONObject>()
        for (i in 0 until array.length()) {
            val item = array.getJSONObject(i)
            val id = item.getString("id")
            require(id.matches(Regex("[A-Za-z0-9_-]{1,40}"))) { "ID tidak valid" }
            require(result.put(id, item) == null) { "ID duplikat: $id" }
        }
        return result
    }
    private fun keys(obj: JSONObject): List<String> = obj.keys().asSequence().toList()
    private fun value(obj: JSONObject, key: String): Any = if (obj.has(key)) obj.get(key) else missing
    private fun equal(a: Any, b: Any): Boolean = when {
        a === missing || b === missing -> a === b
        a is JSONObject && b is JSONObject -> keys(a).toSet() == keys(b).toSet() && keys(a).all { equal(a.get(it), b.get(it)) }
        a is JSONArray && b is JSONArray -> a.length() == b.length() && (0 until a.length()).all { equal(a.get(it), b.get(it)) }
        a is Number && b is Number -> a.toString().toBigDecimal().compareTo(b.toString().toBigDecimal()) == 0
        else -> a == b
    }
    private fun escape(key: String) = key.replace("~", "~0").replace("/", "~1")
    private fun mergeValue(base: Any, local: Any, remote: Any, path: String, conflicts: MutableList<String>): Any {
        if (equal(local, remote)) return local
        if (equal(local, base)) return remote
        if (equal(remote, base)) return local
        // Entity deletion vs modification, or two distinct new entities sharing an ID,
        // is never guessed away. Field recursion applies only to an existing base.
        if (base is JSONObject && local is JSONObject && remote is JSONObject) {
            val result = JSONObject()
            (keys(base) + keys(local) + keys(remote)).distinct().forEach { key ->
                val childPath = "$path/${escape(key)}"
                val b = value(base, key); val l = value(local, key); val r = value(remote, key)
                val merged = if (path.isEmpty() && key in collections && b is JSONArray && l is JSONArray && r is JSONArray) {
                    mergeCollection(b, l, r, childPath, conflicts)
                } else mergeValue(b, l, r, childPath, conflicts)
                if (merged !== missing) result.put(key, merged)
            }
            return result
        }
        conflicts.add(path.ifEmpty { "/" })
        return local // Internal placeholder only: no merged snapshot is exposed on conflict.
    }
    private fun mergeCollection(base: JSONArray, local: JSONArray, remote: JSONArray, path: String, conflicts: MutableList<String>): JSONArray {
        val b = index(base); val l = index(local); val r = index(remote)
        val result = JSONArray()
        (b.keys + l.keys + r.keys).distinct().forEach { id ->
            val merged = mergeValue(b[id] ?: missing, l[id] ?: missing, r[id] ?: missing, "$path/${escape(id)}", conflicts)
            if (merged !== missing) result.put(merged)
        }
        return result
    }
}
