package com.savingduit.nativeapp

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Only the server session token is persisted, never a password or recovery code. */
class SecureSession(context: Context) : AccountApi.SessionToken {
    private val prefs = context.getSharedPreferences("native-session", Context.MODE_PRIVATE)
    private val alias = "kantongkita-session-v1"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    @Synchronized override fun read(): String? {
        val blob = prefs.getString("token", null) ?: return null
        return try {
            val bytes = Base64.decode(blob, Base64.NO_WRAP)
            require(bytes.size >= 28)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            cipher.doFinal(bytes.copyOfRange(12, bytes.size)).toString(Charsets.UTF_8)
        } catch (_: Exception) {
            check(prefs.edit().remove("token").commit()) { "Gagal menghapus sesi rusak" }
            null
        }
    }
    @Synchronized override fun write(token: String?) {
        if (token == null) {
            check(prefs.edit().remove("token").commit()) { "Gagal menghapus sesi" }
            return
        }
        require(token.matches(Regex("[a-f0-9]{64}")))
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val bytes = cipher.iv + cipher.doFinal(token.toByteArray(Charsets.UTF_8))
        check(prefs.edit().putString("token", Base64.encodeToString(bytes, Base64.NO_WRAP)).commit()) { "Gagal menyimpan sesi" }
    }
}
