package com.savingduit.nativeapp

import java.io.File
import java.io.InputStream
import java.util.UUID

/** Local-only receipts: never put file bytes or paths in a cloud payload. */
class ReceiptStore(private val directory: File) {
    companion object { const val MAX_BYTES = 10_000_000
        fun extension(bytes: ByteArray): String {
            require(bytes.isNotEmpty() && bytes.size <= MAX_BYTES) { "Struk maksimal 10 MB" }
            return when {
                bytes.take(5).toByteArray().contentEquals("%PDF-".toByteArray()) -> "pdf"
                bytes.size >= 8 && bytes.copyOfRange(0, 8).contentEquals(byteArrayOf(-119,80,78,71,13,10,26,10)) -> "png"
                bytes.size >= 3 && bytes[0] == (-1).toByte() && bytes[1] == (-40).toByte() && bytes[2] == (-1).toByte() -> "jpg"
                else -> throw IllegalArgumentException("Pilih gambar JPEG/PNG atau PDF yang valid")
            }
        }
    }
    fun file(id: String): File {
        require(Regex("[a-f0-9-]{36}\\.(pdf|png|jpg)").matches(id)) { "ID struk tidak valid atau berasal dari perangkat lain" }
        return File(directory, id)
    }
    fun import(input: InputStream): String {
        val output = java.io.ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        while (true) { val n = input.read(buffer); if (n < 0) break; require(output.size() + n <= MAX_BYTES) { "Struk maksimal 10 MB" }; output.write(buffer, 0, n) }
        val bytes = output.toByteArray()
        val id = "${UUID.randomUUID()}.${extension(bytes)}"
        check(directory.isDirectory || directory.mkdirs()) { "Folder struk tidak tersedia" }
        val target = file(id)
        try { java.io.FileOutputStream(target).use { it.write(bytes); it.fd.sync() } } catch (e: Exception) { target.delete(); throw e }
        return id
    }
    fun remove(id: String) { val file = file(id); check(!file.exists() || file.delete()) { "File struk belum bisa dihapus" } }
}
