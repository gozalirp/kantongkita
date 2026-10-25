package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test

class BookJsonTest {
    @Test fun allCollectionsRoundTripWithoutSecrets() {
        val b = Book(
            wallets = listOf(Wallet("w", "Tunai", initial = -1000)),
            categories = listOf(Category("c", "Makan", "out")),
            transactions = listOf(Transaction("t", "out", 1000, "2026-10-25", "w", categoryId = "c", note = "Uji", receiptId = "r")),
            budgets = listOf(Budget("b", "c", 10000, "month")),
            goals = listOf(Goal("g", "Target", 50000, 2000, "w", "2026-12-31")),
            subscriptions = listOf(Subscription("s", "Internet", 10000, "w", "c"))
        )
        assertEquals(b, BookJson.decode(BookJson.encode(b)))
        assertFalse(BookJson.encode(b).contains("password"))
    }
    @Test fun patchPreservesUnknownMetadataAndAbsentDefaults() {
        val b = Book(wallets = listOf(Wallet("w", "Tunai")), transactions = listOf(Transaction("t", "out", 1000, "2026-10-25", "w")))
        val raw = org.json.JSONObject(BookJson.encode(b)).apply {
            put("settings", org.json.JSONObject("{\"theme\":\"dark\"}"))
            put("receipts", org.json.JSONArray("[{\"id\":\"receipt\"}]"))
            getJSONArray("transactions").getJSONObject(0).apply { put("by", "account-a"); put("future", org.json.JSONObject.NULL); remove("receiptId") }
        }
        val changed = b.copy(transactions = listOf(b.transactions.single().copy(note = "Edited")))
        val patched = org.json.JSONObject(BookJson.patch(raw.toString(), b, changed))
        assertEquals("dark", patched.getJSONObject("settings").getString("theme"))
        assertEquals(1, patched.getJSONArray("receipts").length())
        val tx = patched.getJSONArray("transactions").getJSONObject(0)
        assertEquals("account-a", tx.getString("by")); assertTrue(tx.has("future")); assertFalse(tx.has("receiptId"))
        assertEquals("Edited", tx.getString("note"))
        val deleted = org.json.JSONObject(BookJson.patch(patched.toString(), changed, changed.copy(transactions = emptyList())))
        assertEquals(0, deleted.getJSONArray("transactions").length())
    }
    @Test fun rejectsFractionalAndStringAmountsRatherThanTruncating() {
        val b = Book(wallets = listOf(Wallet("w", "Tunai", initial = 1000)))
        for (bad in listOf("1.5", "\"1000\"", "1e30", "null")) {
            try { BookJson.decode(BookJson.encode(b).replace("\"initial\":1000", "\"initial\":$bad")); fail("Accepted $bad") }
            catch (_: IllegalArgumentException) {}
        }
    }
}
