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

@Composable private fun PinField(label: String, value: String, changed: (String) -> Unit) {
    OutlinedTextField(value, { if (it.length <= 6 && it.all { c -> c in '0'..'9' }) changed(it) }, label = { Text(label) }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword))
}
@Composable fun UnlockScreen(profile: DeviceProfile, unlocked: () -> Unit) {
    var pin by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Column(Modifier.safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("KantongKita terkunci", style = MaterialTheme.typography.headlineMedium)
        Text("Masukkan PIN perangkat. PIN bukan password akun cloud.")
        PinField("PIN 6 digit", pin) { pin = it }
        Button(enabled = !busy && pin.length == 6, onClick = {
            val entered = pin; pin = ""; busy = true
            scope.launch { try { if (withContext(Dispatchers.Default) { profile.verify(entered) }) unlocked() else message = "PIN tidak cocok" } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { message = e.message ?: "Tidak bisa membuka" } finally { busy = false } }
        }) { Text("Buka kunci") }
        Text(message)
        Text("Lupa PIN? Tidak ada reset tanpa PIN di build ini. Jangan hapus data aplikasi karena catatan lokal ikut hilang.")
    }
}
@Composable fun ProfileScreen(profile: DeviceProfile, lock: () -> Unit) {
    var name by remember { mutableStateOf(profile.name) }
    var avatar by remember { mutableStateOf(profile.avatar) }
    var old by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var hasPin by remember { mutableStateOf(profile.hasPin) }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    fun work(action: () -> Unit) {
        if (busy) return
        busy = true
        scope.launch { try { withContext(Dispatchers.Default) { action() }; hasPin = profile.hasPin; message = "Pengaturan tersimpan" } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { message = e.message ?: "Pengaturan gagal" } finally { old = ""; pin = ""; confirmation = ""; busy = false } }
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Profil perangkat", style = MaterialTheme.typography.titleLarge)
        Text("Profil ini bukan identitas akun cloud. PIN hanya mengunci layar; bukan enkripsi database. Simpan PIN dengan aman: lupa PIN belum memiliki pemulihan lokal.")
        OutlinedTextField(name, { if (it.length <= 60) name = it }, label = { Text("Nama tampilan") })
        SelectField("Avatar", avatar, DeviceProfile.avatars.map { it to it }) { avatar = it }
        Button(enabled = !busy, onClick = { val n = name; val a = avatar; work { profile.save(n, a) } }) { Text("Simpan profil") }
        if (hasPin) PinField("PIN lama", old) { old = it }
        PinField("PIN baru 6 digit", pin) { pin = it }
        PinField("Ulangi PIN baru", confirmation) { confirmation = it }
        Button(enabled = !busy && pin.length == 6 && pin == confirmation, onClick = { val previous = old; val next = pin; work { profile.setPin(previous, next) } }) { Text(if (hasPin) "Ganti PIN" else "Aktifkan PIN") }
        if (hasPin) {
            Button(enabled = !busy, onClick = lock) { Text("Kunci sekarang") }
            OutlinedButton(enabled = !busy && old.length == 6, onClick = { val previous = old; work { profile.removePin(previous) } }) { Text("Hapus PIN menggunakan PIN lama") }
        }
        Text(message)
        if (busy) CircularProgressIndicator()
    }
}
