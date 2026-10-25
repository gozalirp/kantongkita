package com.savingduit.nativeapp

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class AccountApiTest {
    private class MemorySession(var token: String? = null) : AccountApi.SessionToken {
        override fun read() = token
        override fun write(token: String?) { this.token = token }
    }
    private val secret = "a".repeat(64)
    @Test fun loginCookieIsScopedAndMeUsesIt() {
        val session = MemorySession()
        var count = 0
        val api = AccountApi(session) { path, body, cookie ->
            if (count++ == 0) {
                assertEquals("login", path); assertNull(cookie)
                assertEquals("user", JSONObject(body!!).getString("username"))
                AccountApi.Reply(200, "{\"ok\":true}", listOf("__Host-sd_session=$secret; Path=/; Secure; HttpOnly"))
            } else {
                assertEquals("me", path); assertNull(body); assertEquals("__Host-sd_session=$secret", cookie)
                AccountApi.Reply(200, "{\"ok\":true}")
            }
        }
        api.login(" user ", "password"); api.me()
        assertEquals(secret, session.token)
    }
    @Test fun unauthorizedClearsSessionButNetworkFailureDoesNot() {
        val session = MemorySession(secret)
        try { AccountApi(session) { _, _, _ -> throw java.io.IOException("offline") }.me(); fail() } catch (_: java.io.IOException) {}
        assertEquals(secret, session.token)
        try { AccountApi(session) { _, _, _ -> AccountApi.Reply(401, "{\"ok\":false,\"error\":\"Silakan login\"}") }.me(); fail() } catch (e: AccountApi.ApiError) { assertEquals(401, e.status) }
        assertNull(session.token)
    }
    @Test fun unknownPathsNeverReachTransport() {
        val api = AccountApi(MemorySession()) { _, _, _ -> throw AssertionError("Must not send") }
        for (path in listOf("https://evil.test", "../login", "personal/save?other", "")) {
            try { api.request(path); fail() } catch (_: IllegalArgumentException) {}
        }
    }
    @Test fun loginRequiresExactlyOneValidCookieAndErrorsCannotSetCookie() {
        for (reply in listOf(AccountApi.Reply(200, "{\"ok\":true}"), AccountApi.Reply(200, "{\"ok\":true}", listOf("__Host-sd_session=bad")), AccountApi.Reply(403, "{\"ok\":false}", listOf("__Host-sd_session=$secret")))) {
            val session = MemorySession()
            try { AccountApi(session) { _, _, _ -> reply }.login("user", "password"); fail() } catch (_: AccountApi.ApiError) {}
            assertNull(session.token)
        }
    }
    @Test fun recoveryClearsOldSessionAndReturnsOneTimeCode() {
        val session = MemorySession(secret)
        val api = AccountApi(session) { path, body, _ ->
            assertEquals("recover", path); assertEquals("old", JSONObject(body!!).getString("code"))
            AccountApi.Reply(200, "{\"ok\":true,\"recovery\":\"new\"}")
        }
        assertEquals("new", api.recover("user", " old ", "password").getString("recovery")); assertNull(session.token)
    }
}
