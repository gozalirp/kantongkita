package com.savingduit.nativeapp

import android.content.Context

/** Offline access only within a previously verified, unchanged local session; expires within 24h. */
class CloudIdentity(context: Context) {
    private val prefs = context.getSharedPreferences("cloud-identity", Context.MODE_PRIVATE)
    data class Identity(val id: String, val family: String, val role: String)
    fun remember(key: String, identity: Identity, now: Long = System.currentTimeMillis()) {
        check(prefs.edit().putString("key", key).putString("id", identity.id).putString("family", identity.family).putString("role", identity.role).putLong("checked", now).commit())
    }
    fun cached(key: String?, now: Long = System.currentTimeMillis()): Identity? {
        val checked = prefs.getLong("checked", 0)
        if (key == null || prefs.getString("key", null) != key || now < checked || now - checked > 86_400_000) return null
        val id = prefs.getString("id", null) ?: return null
        return Identity(id, prefs.getString("family", "")!!, prefs.getString("role", "")!!)
    }
    fun verify(api: AccountApi): Identity {
        val key = requireNotNull(api.sessionKey()) { "Silakan login" }
        val user = api.me().getJSONObject("user")
        check(api.sessionKey() == key) { "Sesi berubah selama pemeriksaan" }
        val identity = Identity(user.getString("id"), user.getString("family_id"), user.getString("role"))
        remember(key, identity)
        return identity
    }
}
