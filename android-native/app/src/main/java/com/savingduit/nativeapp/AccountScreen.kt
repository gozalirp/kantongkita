package com.savingduit.nativeapp

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** Account actions deliberately do not import the device-local financial book. */
@Composable fun AccountScreen(api: AccountApi) {
    val scope = rememberCoroutineScope()
    var mode by remember { mutableStateOf("Masuk") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var emailLink by remember { mutableStateOf("") }
    var emailPassword by remember { mutableStateOf("") }
    var emailPanel by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var oneTime by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var account by remember { mutableStateOf<JSONObject?>(null) }
    fun perform(block: () -> JSONObject, after: (JSONObject) -> Unit) {
        if (busy) return
        busy = true; message = ""
        scope.launch {
            try { val result = withContext(Dispatchers.IO) { block() }; after(result) }
            catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (e is AccountApi.ApiError && e.status == 401) account = null
                message = e.message ?: "Layanan belum bisa dihubungi"
            } finally { password = ""; busy = false }
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Akun cloud", style = MaterialTheme.typography.titleLarge)
        Text("Buku perangkat tetap terpisah. Masuk tidak mengirim catatan lokal ke cloud.")
        if (account == null) {
            Row { listOf("Masuk", "Daftar", "Pulihkan").forEach { label -> TextButton(enabled = !busy, onClick = { mode = label; password = ""; code = ""; message = "" }) { Text(label) } } }
            OutlinedTextField(username, { username = it }, enabled = !busy, label = { Text("Username") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            if (mode == "Daftar") OutlinedTextField(email, { email = it }, enabled = !busy, label = { Text("Email pemulihan") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), singleLine = true, modifier = Modifier.fillMaxWidth())
            if (mode == "Pulihkan") OutlinedTextField(code, { code = it }, enabled = !busy, label = { Text("Kode pemulihan") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(password, { password = it }, enabled = !busy, label = { Text(if (mode == "Pulihkan") "Password baru" else "Password") }, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), singleLine = true, modifier = Modifier.fillMaxWidth())
            Button(enabled = !busy && username.isNotBlank() && password.isNotBlank(), onClick = {
                val user = username; val pass = password; val recovery = code; val mail = email
                when (mode) {
                    "Masuk" -> perform({ api.login(user, pass); api.me() }) { account = it; message = "Sesi akun aktif. Buku lokal tidak diunggah." }
                    "Daftar" -> perform({ api.request("activate", JSONObject().put("username", user.trim()).put("password", pass).put("email", mail.trim())) }) { oneTime = it.getString("recovery"); message = "Akun dibuat. Simpan kode, lalu masuk." }
                    else -> perform({ api.recover(user, recovery, pass) }) { oneTime = it.getString("recovery"); code = ""; message = "Password diganti. Simpan kode baru, lalu masuk." }
                }
            }) { Text(if (busy) "Memproses…" else mode) }
        } else {
            Text("Masuk sebagai " + account!!.getJSONObject("user").getString("username"))
            Text("Role: " + account!!.getJSONObject("user").getString("role"))
            val members = account!!.getJSONArray("members")
            for (i in 0 until members.length()) Text("Anggota: " + members.getJSONObject(i).getString("username"))
            Button(enabled = !busy, onClick = { perform({ api.request("invite", JSONObject()) }) { oneTime = it.getString("code"); message = "Kode undangan berlaku24 jam. Jangan bagikan selain ke pasangan." } }) { Text("Buat undangan keluarga") }
            OutlinedTextField(code, { code = it }, enabled = !busy, label = { Text("Kode undangan pasangan") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Button(enabled = !busy && code.isNotBlank(), onClick = {
                val invite = code.trim()
                perform({ api.request("link", JSONObject().put("code", invite)); api.me() }) { account = it; code = ""; message = "Keanggotaan diperbarui. Buku perangkat tetap terpisah." }
            }) { Text("Gabung keluarga pasangan") }
            TextButton(enabled = !busy, onClick = { perform({ api.request("email/status") }) { message = "Email: ${it.optString("email").ifEmpty { "belum diatur" }} · ${if (it.optBoolean("verified")) "terverifikasi" else "belum diverifikasi"} · layanan ${if (it.optBoolean("enabled")) "aktif" else "nonaktif"}" } }) { Text("Status email") }
            TextButton(enabled = !busy, onClick = { perform({ api.request("email/resend", JSONObject()) }) { message = "Email verifikasi dikirim ulang" } }) { Text("Kirim ulang email verifikasi") }
            Button(enabled = !busy, onClick = { perform({ api.logout() }) { account = null; code = ""; oneTime = ""; message = "Keluar. Catatan lokal tidak dihapus." } }) { Text("Keluar akun") }
        }
        TextButton(enabled = !busy, onClick = { perform({ api.me() }) { account = it; message = "Sesi diperiksa." } }) { Text("Periksa sesi tersimpan") }
        if (oneTime.isNotEmpty()) {
            Text("Kode rahasia — simpan sekarang:")
            androidx.compose.foundation.text.selection.SelectionContainer { Text(oneTime) }
            TextButton(onClick = { oneTime = "" }) { Text("Sudah disimpan, sembunyikan") }
        }
        if (message.isNotEmpty()) Text(message)
        TextButton(onClick = { emailPanel = !emailPanel }) { Text("Pemulihan dan verifikasi email") }
        if (emailPanel) {
            Text("Tempel tautan resmi dari email. Tautan/token tidak disimpan ke perangkat. Layanan dapat dinonaktifkan server; kode pemulihan tetap tersedia.")
            OutlinedTextField(email, { email = it }, enabled = !busy, label = { Text("Email pemulihan") }, singleLine = true)
            TextButton(enabled = !busy && email.isNotBlank(), onClick = { val mail = email.trim(); perform({ api.request("email/request-reset", JSONObject().put("email", mail)) }) { message = it.optString("message", "Jika email valid, tautan akan dikirim") } }) { Text("Minta tautan reset password") }
            OutlinedTextField(emailLink, { emailLink = it }, enabled = !busy, label = { Text("Tautan dari email") }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
            OutlinedTextField(emailPassword, { emailPassword = it }, enabled = !busy, label = { Text("Password baru untuk reset") }, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), singleLine = true)
            Button(enabled = !busy && emailLink.isNotBlank(), onClick = {
                val link = emailLink; val pass = emailPassword
                perform({
                    val parsed = EmailRecovery.parse(link)
                    val payload = JSONObject().put("token", parsed.token)
                    if (parsed.purpose == "reset") { require(pass.length in 12..128) { "Password harus 12–128 karakter" }; payload.put("password", pass) }
                    api.request("email/" + parsed.purpose, payload)
                }) { emailLink = ""; emailPassword = ""; account = null; message = "Tautan diproses. Masuk ulang bila password direset." }
            }) { Text("Proses tautan email") }
        }
        Text("Buku cloud tersedia terpisah melalui Menu → Buku cloud dan sinkronisasi.")
    }
}
