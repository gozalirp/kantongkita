package com.savingduit.nativeapp

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class BookReconciliationTest {
    private fun base() = JSONObject(BookJson.encode(Book(wallets = listOf(Wallet("w", "Tunai"))))).apply {
        put("receipts", JSONObject().put("r", JSONObject().put("data", "demo-only")))
        put("settings", JSONObject().put("currency", "Rp"))
    }
    private fun clone(j: JSONObject) = JSONObject(j.toString())
    private fun tx(j: JSONObject, id: String, amount: Long = 1000): JSONObject {
        j.getJSONArray("transactions").put(JSONObject().put("id", id).put("type", "in").put("amount", amount).put("walletId", "w").put("date", "2026-10-25").put("by", "demo-user"))
        return j
    }
    @Test fun independentAddsMergeAndPreserveUnknownMetadata() {
        val b = base(); val l = tx(clone(b), "local"); val r = tx(clone(b), "remote")
        val original = l.toString()
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        assertTrue(result.conflicts.isEmpty())
        val merged = JSONObject(result.merged!!)
        assertEquals(2, merged.getJSONArray("transactions").length())
        assertEquals("demo-user", merged.getJSONArray("transactions").getJSONObject(0).getString("by"))
        assertEquals("demo-only", merged.getJSONObject("receipts").getJSONObject("r").getString("data"))
        assertEquals(original, l.toString())
    }
    @Test fun independentFieldsInSameEntityMerge() {
        val b = base(); val l = clone(b); val r = clone(b)
        l.getJSONArray("wallets").getJSONObject(0).put("name", "Nama baru")
        r.getJSONArray("wallets").getJSONObject(0).put("color", "#112233")
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        val wallet = JSONObject(result.merged!!).getJSONArray("wallets").getJSONObject(0)
        assertEquals("Nama baru", wallet.getString("name")); assertEquals("#112233", wallet.getString("color"))
    }
    @Test fun editEditConflictHasNoUsableMergedPayload() {
        val b = base(); val l = clone(b); val r = clone(b)
        l.getJSONArray("wallets").getJSONObject(0).put("name", "Lokal")
        r.getJSONArray("wallets").getJSONObject(0).put("name", "Remote")
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        assertNull(result.merged); assertEquals(listOf("/wallets/w/name"), result.conflicts)
    }
    @Test fun deleteVersusEditIsExplicitConflict() {
        val b = tx(base(), "t"); val l = clone(b); val r = clone(b)
        l.getJSONArray("transactions").remove(0)
        r.getJSONArray("transactions").getJSONObject(0).put("amount", 2000)
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        assertNull(result.merged); assertEquals(listOf("/transactions/t"), result.conflicts)
    }
    @Test fun deletionAndIndependentAdditionBothSurvive() {
        val b = tx(base(), "old"); val l = clone(b); l.getJSONArray("transactions").remove(0)
        val r = tx(clone(b), "new")
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        val rows = JSONObject(result.merged!!).getJSONArray("transactions")
        assertEquals(1, rows.length()); assertEquals("new", rows.getJSONObject(0).getString("id"))
    }
    @Test fun concurrentNewIdCollisionIsNotAutoMerged() {
        val b = base(); val l = tx(clone(b), "same", 1000); val r = tx(clone(b), "same", 2000)
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        assertNull(result.merged); assertEquals(listOf("/transactions/same"), result.conflicts)
    }
    @Test fun missingDiffersFromNullAndArraysAreAtomic() {
        val b = base().put("custom", JSONObject().put("field", "original")).put("tags", org.json.JSONArray(listOf("a")))
        val l = clone(b); l.getJSONObject("custom").remove("field"); l.put("tags", org.json.JSONArray(listOf("b")))
        val r = clone(b); r.getJSONObject("custom").put("field", JSONObject.NULL); r.put("tags", org.json.JSONArray(listOf("c")))
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        assertNull(result.merged); assertTrue(result.conflicts.contains("/custom/field")); assertTrue(result.conflicts.contains("/tags"))
    }
    @Test fun deletionVersusNewReferenceCannotProduceSendableBook() {
        val b = base()
        val l = clone(b); l.getJSONArray("wallets").remove(0)
        val r = tx(clone(b), "new")
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        assertNull(result.merged)
        assertTrue(result.conflicts.contains("/validation"))
    }
    @Test fun mergedCategoryChangesCannotInvalidateRemoteTransaction() {
        val b = base()
        b.getJSONArray("categories").put(JSONObject().put("id", "c").put("name", "Makan").put("type", "out"))
        val l = clone(b); l.getJSONArray("categories").getJSONObject(0).put("type", "in")
        val r = tx(clone(b), "new"); r.getJSONArray("transactions").getJSONObject(0).put("type", "out").put("categoryId", "c")
        val result = BookReconciliation.merge(b.toString(), l.toString(), r.toString())
        assertNull(result.merged)
        assertTrue(result.conflicts.contains("/validation"))
    }
    @Test fun duplicateIdsRejectedEvenWhenSnapshotsEqual() {
        val b = tx(tx(base(), "t"), "t").toString()
        try { BookReconciliation.merge(b, b, b); fail("Accepted duplicate ids") } catch (_: IllegalArgumentException) {}
    }
}
