package com.savingduit.nativeapp

import org.json.JSONObject
import org.json.JSONArray

/** A failed request leaves the durable local draft unchanged; retry always pulls before pushing. */
class CloudSync(private val api: AccountApi, private val store: CloudBookStore) {
    private fun checkIdentity(state: CloudBookStore.State) {
        val user = api.me().getJSONObject("user")
        check(user.getString("id") == state.account && (state.book == "personal" || state.book == "family:" + user.getString("family_id"))) { "Akun/keluarga berubah; buka ulang buku" }
    }
    private fun raw(reply: JSONObject): String {
        val data = reply.optJSONObject("data") ?: JSONObject(BookJson.encode(Book()))
        for (key in listOf("wallets", "categories", "transactions", "budgets", "goals", "subscriptions")) if (!data.has(key)) data.put(key, JSONArray())
        return data.toString().also { BookJson.decode(it) }
    }
    fun sync(state: CloudBookStore.State): CloudBookStore.State {
        checkIdentity(state)
        val path = if (state.book == "personal") "personal/" else ""
        val reply = api.request(path + "data")
        val active = store.receive(requireNotNull(store.load(state.account, state.book)), reply.getLong("revision"), raw(reply))
        if (active.conflicted || !active.pending) return active
        try {
            api.request(path + "save", JSONObject().put("revision", active.revision).put("book", JSONObject(active.local)))
        } catch (error: AccountApi.ApiError) {
            if (error.status == 409) {
                val remote = api.request(path + "data")
                return store.receive(requireNotNull(store.load(state.account, state.book)), remote.getLong("revision"), raw(remote))
            }
            throw error
        }
        val confirmed = api.request(path + "data")
        if (confirmed.getLong("revision") != active.revision + 1) {
            return store.receive(requireNotNull(store.load(state.account, state.book)), confirmed.getLong("revision"), raw(confirmed))
        }
        return store.acknowledge(active, confirmed.getLong("revision"), raw(confirmed))
    }
}
