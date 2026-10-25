package com.savingduit.nativeapp

import android.content.Context
import android.util.Base64
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/** Local screen lock, not database encryption or cloud authentication. */
class DeviceProfile(context: Context) {
    private val prefs = context.getSharedPreferences("device-profile", Context.MODE_PRIVATE)
    companion object {
        val avatars = listOf("🙂", "😎", "🌻", "🐱", "🐼", "🚀", "💰")
        fun derive(pin: String, salt: ByteArray): ByteArray {
            require(pin.matches(Regex("[0-9]{6}"))) { "PIN harus 6 digit" }
            val spec = PBEKeySpec(pin.toCharArray(), salt, 120_000, 256)
            return try { SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded } finally { spec.clearPassword() }
        }
    }
    val name get() = prefs.getString("name", "Pemilik perangkat")!!
    val avatar get() = prefs.getString("avatar", avatars.first())!!.takeIf { it in avatars } ?: avatars.first()
    val hasPin get() = prefs.contains("pin")
    val retryAt get() = prefs.getLong("retryAt", 0)
    fun save(name: String, avatar: String) {
        require(name.trim().length in 1..60 && avatar in avatars) { "Nama 1–60 karakter dan avatar yang tersedia" }
        check(prefs.edit().putString("name", name.trim()).putString("avatar", avatar).commit()) { "Profil gagal disimpan" }
    }
    @Synchronized fun verify(pin: String, now: Long = System.currentTimeMillis()): Boolean {
        check(now >= retryAt) { "Terlalu banyak percobaan. Coba lagi dalam ${((retryAt - now) / 1000) + 1} detik" }
        check(hasPin) { "PIN belum diatur" }
        val salt = Base64.decode(prefs.getString("salt", ""), Base64.NO_WRAP)
        val expected = Base64.decode(prefs.getString("pin", ""), Base64.NO_WRAP)
        val valid = pin.matches(Regex("[0-9]{6}")) && MessageDigest.isEqual(expected, derive(pin, salt))
        val attempts = if (valid) 0 else prefs.getInt("failures", 0) + 1
        check(prefs.edit().putInt("failures", attempts).putLong("retryAt", if (attempts >= 5) Math.addExact(now, 30_000L * minOf(attempts - 4, 10)) else 0).commit())
        return valid
    }
    @Synchronized fun setPin(old: String, pin: String) {
        if (hasPin) check(verify(old)) { "PIN lama tidak cocok" }
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val hash = derive(pin, salt)
        check(prefs.edit().putString("salt", Base64.encodeToString(salt, Base64.NO_WRAP)).putString("pin", Base64.encodeToString(hash, Base64.NO_WRAP)).putInt("failures", 0).putLong("retryAt", 0).commit())
    }
    @Synchronized fun removePin(pin: String) {
        check(verify(pin)) { "PIN tidak cocok" }
        check(prefs.edit().remove("pin").remove("salt").remove("failures").remove("retryAt").commit())
    }
}
