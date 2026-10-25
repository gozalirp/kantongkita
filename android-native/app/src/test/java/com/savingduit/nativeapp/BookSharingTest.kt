package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import org.json.JSONObject

class BookSharingTest {
    private val source = Book(wallets = listOf(Wallet("a", "A"), Wallet("b", "B")), categories = listOf(Category("c", "C", "out")), transactions = listOf(Transaction("t", "out", 1000, "2026-10-25", "a", categoryId = "c", receiptId = "secret"), Transaction("m", "move", 2000, "2026-10-25", "a", walletTo = "b")))
    @Test fun selectedWalletCopyIsPrivateAndIdempotent() {
        val raw = JSONObject(BookJson.encode(source)).put("profile", "secret").apply { getJSONArray("transactions").getJSONObject(0).put("by", "private-account") }.toString()
        val target = BookJson.encode(Book())
        val copied = BookSharing.selected("device-a", raw, target, setOf("a"))
        val result = BookJson.decode(copied)
        assertEquals(1, result.wallets.size); assertEquals(1, result.transactions.size); assertEquals("", result.transactions.single().receiptId)
        assertFalse(copied.contains("private-account")); assertFalse(copied.contains("secret"))
        assertEquals(result, BookJson.decode(BookSharing.selected("device-a", raw, copied, setOf("a"))))
        assertEquals(2, BookJson.decode(BookSharing.selected("device-a", raw, target, setOf("a", "b"))).transactions.size)
    }
    @Test fun combinedSameIdsStaySeparateAndTransfersRemainNeutral() {
        val raw = BookJson.encode(source)
        val combined = BookSharing.combined(raw, raw)
        assertEquals(4, combined.wallets.map { it.id }.toSet().size)
        assertEquals(2000L, combined.total("out")); assertEquals(0L, combined.total("in"))
        assertTrue(combined.wallets.any { it.name.endsWith("Pribadi") }); assertTrue(combined.wallets.any { it.name.endsWith("Keluarga") })
    }
}
