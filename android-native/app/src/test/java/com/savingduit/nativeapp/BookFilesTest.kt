package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import org.json.JSONObject

class BookFilesTest {
    private val book = Book(wallets = listOf(Wallet("w", "Tunai")), transactions = listOf(Transaction("t", "out", 1000, "2026-10-25", "w", note = "=HYPERLINK(\"bad\")\nnext")))
    @Test fun backupRoundTripPreservesUnknownFields() {
        val raw = JSONObject(BookJson.encode(book)).put("future", JSONObject("{\"x\":1}")).toString()
        val restored = JSONObject(BookFiles.restore(BookFiles.backup(raw)))
        assertEquals(1, restored.getJSONObject("future").getInt("x"))
        assertEquals(book, BookJson.decode(restored.toString()))
    }
    @Test fun csvEscapesQuotesAndBlocksFormulaExecution() {
        val csv = BookFiles.csv(book)
        assertTrue(csv.startsWith("\uFEFF")); assertTrue(csv.contains("\"'=HYPERLINK(\"\"bad\"\")\nnext\"")); assertTrue(csv.contains("\"1000\""))
    }
    @Test fun xlsxHasValidXmlNumericAmountsAndNoFormulaCells() {
        val entries = mutableMapOf<String, String>()
        java.util.zip.ZipInputStream(BookFiles.xlsx(book).inputStream()).use { zip ->
            while (true) { val entry = zip.nextEntry ?: break; entries[entry.name] = zip.readBytes().toString(Charsets.UTF_8) }
        }
        assertEquals(5, entries.size)
        val factory = javax.xml.parsers.DocumentBuilderFactory.newInstance()
        entries.values.forEach { factory.newDocumentBuilder().parse(it.byteInputStream()) }
        val sheet = factory.newDocumentBuilder().parse(entries.getValue("xl/worksheets/sheet1.xml").byteInputStream())
        assertEquals(0, sheet.getElementsByTagName("f").length)
        val cells = sheet.getElementsByTagName("c")
        val amount = (0 until cells.length).map { cells.item(it) as org.w3c.dom.Element }.single { it.getAttribute("r") == "C2" }
        assertEquals("n", amount.getAttribute("t")); assertEquals("1000", amount.textContent)
        assertTrue(sheet.documentElement.textContent.contains("=HYPERLINK(\"bad\")"))
    }
    @Test fun acceptsLegacyPersonalButRejectsFamilyAndCombined() {
        val raw = JSONObject(BookFiles.backup(BookJson.encode(book)))
        raw.getJSONObject("backup").put("format", "savingduit")
        assertEquals(book, BookJson.decode(BookFiles.restore(raw.toString())))
        raw.getJSONObject("backup").put("sumber", "keluarga")
        try { BookFiles.restore(raw.toString()); fail("Family accepted into device book") } catch (_: IllegalArgumentException) {}
        raw.getJSONObject("backup").put("sumber", "pribadi")
        raw.getJSONArray("transactions").getJSONObject(0).put("_sumber", "pribadi")
        try { BookFiles.restore(raw.toString()); fail("Combined accepted") } catch (_: IllegalArgumentException) {}
    }
    @Test(expected = IllegalArgumentException::class) fun rejectsFutureBackupVersion() {
        BookFiles.restore(JSONObject(BookFiles.backup(BookJson.encode(book))).apply { getJSONObject("backup").put("version", 2) }.toString())
    }
}
