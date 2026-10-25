package com.savingduit.nativeapp

import org.json.JSONObject

object BookFiles {
    fun backup(raw: String): String {
        BookJson.decode(raw)
        return JSONObject(raw).apply {
            put("backup", JSONObject().put("format", "kantongkita").put("version", 1).put("sumber", "pribadi").put("waktu", java.time.Instant.now().toString()))
            if (!has("receipts")) put("receipts", JSONObject())
        }.toString(2)
    }
    fun restore(text: String): String {
        require(text.toByteArray(Charsets.UTF_8).size <= 20_000_000) { "File terlalu besar" }
        val json = JSONObject(text)
        val raw = if (json.has("format")) {
            require(json.getString("format") == "kantongkita-native" && json.getInt("version") == 1) { "Format backup tidak didukung" }
            json.getJSONObject("book").toString()
        } else json.toString()
        val root = JSONObject(raw)
        root.optJSONObject("backup")?.let { info ->
            require(info.getString("format") in listOf("kantongkita", "savingduit") && info.getInt("version") == 1) { "Format backup tidak didukung" }
            require(info.getString("sumber") == "pribadi") { "Backup bukan buku pribadi; tidak boleh masuk buku perangkat" }
        }
        for (key in listOf("wallets", "categories", "transactions", "budgets", "goals", "subscriptions")) {
            val rows = root.getJSONArray(key)
            for (i in 0 until rows.length()) require(!rows.getJSONObject(i).has("_sumber") && !rows.getJSONObject(i).has("_id")) { "Snapshot gabungan bukan backup yang dapat dipulihkan" }
        }
        BookJson.decode(raw)
        return raw
    }
    private val headers = listOf("Tanggal", "Jenis", "Rupiah", "Dompet", "Tujuan", "Kategori", "Catatan")
    private fun rows(book: Book) = book.transactions.map { t -> listOf(t.date, t.type, t.amount.toString(), book.wallets.first { it.id == t.walletId }.name, book.wallets.firstOrNull { it.id == t.walletTo }?.name ?: "", book.categories.firstOrNull { it.id == t.categoryId }?.name ?: "", t.note) }
    /** All user strings are inline text, never formulas; rupiah alone uses numeric cells. */
    fun xlsx(book: Book): ByteArray {
        book.validate()
        fun xml(value: String): String = buildString {
            value.codePoints().forEach { cp ->
                when (cp) {
                    38 -> append("&amp;"); 60 -> append("&lt;"); 62 -> append("&gt;"); 34 -> append("&quot;")
                    else -> if (cp == 9 || cp == 10 || cp == 13 || cp in 0x20..0xD7FF || cp in 0xE000..0xFFFD || cp in 0x10000..0x10FFFF) appendCodePoint(cp)
                }
            }
        }
        val output = java.io.ByteArrayOutputStream()
        java.util.zip.ZipOutputStream(output).use { zip ->
            fun entry(path: String, body: String) { zip.putNextEntry(java.util.zip.ZipEntry(path)); zip.write(body.toByteArray(Charsets.UTF_8)); zip.closeEntry() }
            entry("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>""")
            entry("_rels/.rels", """<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>""")
            entry("xl/workbook.xml", """<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Transaksi" sheetId="1" r:id="rId1"/></sheets></workbook>""")
            entry("xl/_rels/workbook.xml.rels", """<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>""")
            val sheet = buildString {
                append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>")
                (listOf(headers) + rows(book)).forEachIndexed { index, row ->
                    append("<row r=\"").append(index + 1).append("\">")
                    row.forEachIndexed { column, value ->
                        val ref = "${('A'.code + column).toChar()}${index + 1}"
                        if (index > 0 && column == 2) append("<c r=\"$ref\" t=\"n\"><v>$value</v></c>")
                        else append("<c r=\"$ref\" t=\"inlineStr\"><is><t xml:space=\"preserve\">${xml(value)}</t></is></c>")
                    }
                    append("</row>")
                }
                append("</sheetData></worksheet>")
            }
            entry("xl/worksheets/sheet1.xml", sheet)
        }
        return output.toByteArray()
    }
    fun csv(book: Book): String {
        fun cell(value: String): String {
            // Spreadsheet formulas must never execute from user-provided notes or names.
            val safe = if (value.trimStart().firstOrNull() in listOf('=', '+', '-', '@', '\t', '\r')) "'$value" else value
            return "\"" + safe.replace("\"", "\"\"") + "\""
        }
        return "\uFEFF" + (listOf(headers) + rows(book)).joinToString("\r\n") { row -> row.joinToString(",", transform = ::cell) }
    }
}
