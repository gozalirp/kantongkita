package com.savingduit.nativeapp

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

@Composable fun TrendChart(rows: List<BookReports.Period>) {
    Text("Tren pemasukan dan pengeluaran", style = MaterialTheme.typography.titleMedium)
    Text("Hijau: pemasukan · Oranye: pengeluaran. Angka lengkap ada di tabel di bawah.")
    Canvas(Modifier.fillMaxWidth().height(160.dp).semantics { contentDescription = "Grafik garis pemasukan dan pengeluaran ${rows.size} periode; tersedia tabel angka" }) {
        val max = rows.maxOfOrNull { maxOf(it.income, it.expense) }?.coerceAtLeast(1) ?: 1L
        val margin = 8.dp.toPx()
        fun point(index: Int, amount: Long) = Offset(margin + (size.width - margin * 2) * index / maxOf(1, rows.lastIndex), size.height - margin - (size.height - margin * 2) * (amount.toDouble() / max).toFloat())
        drawLine(Color.DarkGray, Offset(margin, size.height - margin), Offset(size.width - margin, size.height - margin))
        listOf(true to Color(0xFF137A5A), false to Color(0xFFBB5000)).forEach { (income, color) ->
            val path = Path()
            rows.forEachIndexed { index, row -> val p = point(index, if (income) row.income else row.expense); if (index == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y) }
            drawPath(path, color, style = Stroke(2.dp.toPx()))
        }
    }
    rows.forEach { Text("${it.label} · Masuk ${Rupiah.format(it.income)} · Keluar ${Rupiah.format(it.expense)} · Selisih ${Rupiah.format(it.net)}") }
}
