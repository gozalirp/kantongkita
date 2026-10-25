package com.savingduit.nativeapp

import org.json.JSONObject
import java.io.IOException
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/** No global cookie handler: a client belongs to exactly one login session. */
class AccountApi(private val session: SessionToken, private val transport: Transport = HttpsTransport()) {
    interface SessionToken {
        fun read(): String?
        fun write(token: String?)
    }
    data class Reply(val status: Int, val body: String, val cookies: List<String> = emptyList())
    fun interface Transport {
        fun exchange(path: String, body: String?, cookie: String?): Reply
    }
    class ApiError(val status: Int, message: String) : IOException(message)
    companion object {
        const val ORIGIN = "https://moneyplanner.darmintompel.my.id"
        private val tokenPattern = Regex("[a-f0-9]{64}")
        private val paths = setOf("login", "activate", "join", "recover", "me", "logout", "invite", "link", "data", "save", "personal/data", "personal/save", "email/config", "email/status", "email/resend", "email/request-reset", "email/reset", "email/verify")
    }
    /** Cache access is bound to this exact encrypted session, never merely the last username. */
    @Synchronized fun sessionKey(): String? = session.read()?.takeIf { tokenPattern.matches(it) }?.let { token ->
        java.security.MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it.toInt() and 255) }
    }
    @Synchronized fun request(path: String, body: JSONObject? = null): JSONObject {
        require(path in paths) { "Endpoint tidak diizinkan" }
        val payload = body?.toString()
        require(payload == null || payload.length <= 500000) { "Permintaan terlalu besar" }
        val token = session.read()?.also { require(tokenPattern.matches(it)) { "Sesi lokal tidak valid" } }
        val reply = transport.exchange(path, payload, token?.let { "__Host-sd_session=$it" })
        if (reply.status == 401) session.write(null)
        val json = try { JSONObject(reply.body) } catch (_: Exception) { throw ApiError(reply.status, "Respons server tidak valid") }
        if (reply.status !in 200..299 || !json.optBoolean("ok")) {
            val message = json.optString("error", "Layanan gagal").take(300)
            throw ApiError(reply.status, message)
        }
        // Never accept cookies from error responses or a different endpoint.
        if (path == "login") {
            val tokenValue = reply.cookies.mapNotNull { line ->
                Regex("^__Host-sd_session=([a-f0-9]{64})(?:;|$)").find(line)?.groupValues?.get(1)
            }.singleOrNull() ?: throw ApiError(reply.status, "Server tidak memberikan sesi yang valid")
            session.write(tokenValue)
        }
        if (path == "logout" || path == "recover" || path == "email/reset") session.write(null)
        return json
    }
    fun login(username: String, password: String): JSONObject = request("login", JSONObject().put("username", username.trim()).put("password", password))
    fun me(): JSONObject = request("me")
    fun recover(username: String, code: String, password: String): JSONObject = request("recover", JSONObject().put("username", username.trim()).put("code", code.trim()).put("password", password))
    fun logout(): JSONObject = request("logout", JSONObject())

    class HttpsTransport : Transport {
        override fun exchange(path: String, body: String?, cookie: String?): Reply {
            require(path in paths)
            val connection = URL("$ORIGIN/api/family/$path").openConnection() as HttpsURLConnection
            try {
                connection.instanceFollowRedirects = false
                connection.connectTimeout = 15000
                connection.readTimeout = 20000
                connection.useCaches = false
                connection.requestMethod = if (body == null) "GET" else "POST"
                connection.setRequestProperty("Accept", "application/json")
                connection.setRequestProperty("Origin", ORIGIN)
                if (cookie != null) connection.setRequestProperty("Cookie", cookie)
                if (body != null) {
                    val bytes = body.toByteArray(Charsets.UTF_8)
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    connection.setFixedLengthStreamingMode(bytes.size)
                    connection.outputStream.use { it.write(bytes) }
                }
                val status = connection.responseCode
                if (status in 300..399) throw ApiError(status, "Redirect server ditolak untuk melindungi sesi")
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val bytes = stream?.use { input ->
                    val output = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (true) {
                        val count = input.read(buffer)
                        if (count == -1) break
                        if (output.size() + count > 20_000_000) throw IOException("Respons terlalu besar")
                        output.write(buffer, 0, count)
                    }
                    output.toByteArray()
                } ?: ByteArray(0)
                val cookies = connection.headerFields.entries.filter { it.key?.equals("Set-Cookie", true) == true }.flatMap { it.value }
                return Reply(status, bytes.toString(Charsets.UTF_8), cookies)
            } finally { connection.disconnect() }
        }
    }
}
