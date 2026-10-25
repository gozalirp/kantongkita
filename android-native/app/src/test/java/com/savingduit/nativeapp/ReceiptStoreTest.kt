package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class ReceiptStoreTest {
    @Test fun storesPrivateValidatedFileAndRejectsTraversal() {
        val directory = Files.createTempDirectory("receipts-test").toFile()
        try {
            val store = ReceiptStore(directory)
            val bytes = "%PDF-1.7\nSynthetic receipt\n%%EOF".toByteArray()
            val id = store.import(bytes.inputStream())
            assertArrayEquals(bytes, store.file(id).readBytes())
            try { store.file("../../secret.pdf"); fail("Path traversal accepted") } catch (_: IllegalArgumentException) {}
            store.remove(id); assertFalse(store.file(id).exists())
        } finally { directory.deleteRecursively() }
    }
    @Test fun rejectsSpoofedTypeAndOversizeBeforeWriting() {
        val directory = Files.createTempDirectory("receipts-test").toFile()
        try {
            val store = ReceiptStore(directory)
            for (bytes in listOf("<html>not an image</html>".toByteArray(), ByteArray(ReceiptStore.MAX_BYTES + 1))) {
                try { store.import(bytes.inputStream()); fail("Unsafe file accepted") } catch (_: IllegalArgumentException) {}
            }
            assertEquals(0, directory.listFiles()!!.size)
        } finally { directory.deleteRecursively() }
    }
}
