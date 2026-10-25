package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CloudBookStoreTest {
    private val base = Book(wallets = listOf(Wallet("w", "Wallet")))
    private fun store(): CloudBookStore {
        val context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("cloud-books.db")
        return CloudBookStore(context)
    }
    @Test fun ackRetainsInFlightEditAndScopesAreIsolated() {
        store().use { s ->
            val state = s.open("a", "personal", 5, BookJson.encode(base))
            s.open("b", "personal", 5, BookJson.encode(base))
            val sent = s.edit(state, base.copy(wallets = listOf(Wallet("w", "First"))))
            val later = s.edit(sent, base.copy(wallets = listOf(Wallet("w", "Later"))))
            val ack = s.acknowledge(sent, 6)
            assertTrue(ack.pending); assertEquals(later.local, ack.local); assertEquals(sent.local, ack.base)
            assertFalse(s.load("b", "personal")!!.pending)
            try { s.acknowledge(sent, 6); fail("Duplicate stale ACK accepted") } catch (_: IllegalStateException) {}
        }
    }
    @Test fun ackPreservesServerAttributionAndNewerLocalEdits() {
        store().use { s ->
            val initial = base.copy(transactions = listOf(Transaction("t", "out", 1000, "2026-10-25", "w")))
            val state = s.open("a", "personal", 0, BookJson.encode(base))
            val sent = s.edit(state, initial)
            s.edit(sent, initial.copy(transactions = listOf(initial.transactions.single().copy(note = "Later"))))
            val server = org.json.JSONObject(sent.local).apply { getJSONArray("transactions").getJSONObject(0).put("by", "account-a") }.toString()
            val ack = s.acknowledge(sent, 1, server)
            assertTrue(ack.pending)
            val tx = org.json.JSONObject(ack.local).getJSONArray("transactions").getJSONObject(0)
            assertEquals("account-a", tx.getString("by")); assertEquals("Later", tx.getString("note"))
        }
    }
    @Test fun remoteConflictAndDraftSurviveReopenAndResolveExplicitly() {
        val s = store()
        val state = s.open("a", "family:f", 0, BookJson.encode(base))
        val local = s.edit(state, base.copy(wallets = listOf(Wallet("w", "Local"))))
        val remote = BookJson.encode(base.copy(wallets = listOf(Wallet("w", "Remote"))))
        s.receive(local, 1, remote); s.close()
        CloudBookStore(RuntimeEnvironment.getApplication()).use { reopened ->
            val conflict = reopened.load("a", "family:f")!!
            assertTrue(conflict.conflicted); assertTrue(conflict.pending); assertEquals(0L, conflict.revision)
            val resolved = reopened.resolve(conflict, conflict.local)
            assertFalse(resolved.conflicted); assertTrue(resolved.pending); assertEquals(1L, resolved.revision)
        }
    }
    @Test(expected = IllegalArgumentException::class) fun rejectsEqualRevisionDifferentContents() {
        store().use { s -> val state = s.open("a", "personal", 4, BookJson.encode(base)); s.receive(state, 4, BookJson.encode(base.copy(wallets = listOf(Wallet("w", "Different"))))) }
    }
}
