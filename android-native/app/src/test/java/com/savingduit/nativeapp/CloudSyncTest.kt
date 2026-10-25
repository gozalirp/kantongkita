package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.json.JSONObject

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CloudSyncTest {
    private val base = Book(wallets = listOf(Wallet("w", "Base")))
    private fun api(transport: AccountApi.Transport) = AccountApi(object : AccountApi.SessionToken { override fun read() = "a".repeat(64); override fun write(token: String?) {} }, transport)
    private fun store(): CloudBookStore { val c = RuntimeEnvironment.getApplication(); c.deleteDatabase("cloud-books.db"); return CloudBookStore(c) }
    private fun reply(body: JSONObject) = AccountApi.Reply(200, body.put("ok", true).toString())
    private fun me(id: String = "a") = reply(JSONObject().put("user", JSONObject().put("id", id).put("family_id", "f")))
    @Test fun successfulPushPullPreservesServerMetadata() {
        store().use { s ->
            val state = s.open("a", "personal", 0, BookJson.encode(base))
            val edited = s.edit(state, base.copy(wallets = listOf(Wallet("w", "Edited"))))
            var revision = 0L; var server = JSONObject(state.base); var writes = 0
            val client = api { path, body, _ -> when(path) {
                "me" -> me()
                "personal/data" -> reply(JSONObject().put("revision", revision).put("data", server))
                "personal/save" -> { val sent = JSONObject(body!!); assertEquals(revision, sent.getLong("revision")); server = sent.getJSONObject("book"); server.getJSONArray("wallets").getJSONObject(0).put("future", "server"); revision++; writes++; reply(JSONObject().put("revision", revision)) }
                else -> error(path)
            } }
            val done = CloudSync(client, s).sync(edited)
            assertFalse(done.pending); assertFalse(done.conflicted); assertEquals(1, writes)
            assertEquals("server", JSONObject(done.local).getJSONArray("wallets").getJSONObject(0).getString("future"))
        }
    }
    @Test fun conflictPreservesDraftAndPreventsPush() {
        store().use { s ->
            val state = s.open("a", "personal", 0, BookJson.encode(base))
            val edited = s.edit(state, base.copy(wallets = listOf(Wallet("w", "Local"))))
            val client = api { path, _, _ -> when(path) { "me" -> me(); "personal/data" -> reply(JSONObject().put("revision", 1).put("data", JSONObject(BookJson.encode(base.copy(wallets = listOf(Wallet("w", "Remote"))))))); else -> error("Unexpected write") } }
            val conflict = CloudSync(client, s).sync(edited)
            assertTrue(conflict.conflicted); assertEquals(edited.local, conflict.local); assertEquals(0L, conflict.revision)
        }
    }
    @Test fun offlineFailureKeepsDurableOutbox() {
        store().use { s ->
            val state = s.open("a", "personal", 0, BookJson.encode(base))
            val edited = s.edit(state, base.copy(wallets = listOf(Wallet("w", "Offline draft"))))
            val client = api { path, _, _ -> if (path == "me") me() else throw java.io.IOException("offline") }
            try { CloudSync(client, s).sync(edited); fail("Offline reported success") } catch (_: java.io.IOException) {}
            assertEquals(edited, s.load("a", "personal")); assertTrue(s.load("a", "personal")!!.pending)
        }
    }
    @Test fun race409SavesRemoteWithoutAdvancingBase() {
        store().use { s ->
            val state = s.open("a", "personal", 0, BookJson.encode(base))
            val edited = s.edit(state, base.copy(wallets = listOf(Wallet("w", "Local"))))
            var pulls = 0
            val client = api { path, _, _ -> when(path) {
                "me" -> me()
                "personal/data" -> { pulls++; reply(JSONObject().put("revision", if (pulls == 1) 0 else 1).put("data", JSONObject(BookJson.encode(if (pulls == 1) base else base.copy(wallets = listOf(Wallet("w", "Concurrent"))))))) }
                "personal/save" -> AccountApi.Reply(409, "{\"ok\":false,\"error\":\"conflict\"}")
                else -> error(path)
            } }
            val result = CloudSync(client, s).sync(edited)
            assertTrue(result.conflicted); assertEquals(edited.local, result.local); assertEquals(0L, result.revision)
        }
    }
    @Test fun changedIdentityPreventsDataAccess() {
        store().use { s ->
            val state = s.open("a", "family:f", 0, BookJson.encode(base))
            val client = api { path, _, _ -> check(path == "me"); me("other") }
            try { CloudSync(client, s).sync(state); fail("Wrong identity accepted") } catch (_: IllegalStateException) {}
        }
    }
}
