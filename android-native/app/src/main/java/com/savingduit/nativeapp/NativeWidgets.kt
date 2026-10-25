package com.savingduit.nativeapp

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Alignment
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable fun NativeDateField(value: String, onSelect: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    var month by remember(value) { mutableStateOf(YearMonth.from(LocalDate.parse(value))) }
    OutlinedButton(onClick = { open = true }, modifier = Modifier.heightIn(min = 48.dp)) { Text(LocalDate.parse(value).format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.forLanguageTag("id-ID")))) }
    if (open) AlertDialog(onDismissRequest = { open = false }, title = { Text("Pilih tanggal") }, text = {
        LazyColumn {
            item { Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { month = month.minusMonths(1) }, modifier = Modifier.semantics { contentDescription = "Bulan sebelumnya" }) { Text("‹") }
                Text(month.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.forLanguageTag("id-ID"))), modifier = Modifier.weight(1f))
                TextButton(onClick = { month = month.plusMonths(1) }, modifier = Modifier.semantics { contentDescription = "Bulan berikutnya" }) { Text("›") }
            } }
            item { Row { listOf("S", "S", "R", "K", "J", "S", "M").forEach { Text(it, Modifier.weight(1f)) } } }
            val start = month.atDay(1).minusDays((month.atDay(1).dayOfWeek.value - 1).toLong())
            items(6) { week -> Row {
                repeat(7) { day ->
                    val date = start.plusDays((week * 7 + day).toLong())
                    TextButton(onClick = { onSelect(date.toString()); open = false }, contentPadding = PaddingValues(0.dp), modifier = Modifier.weight(1f).heightIn(min = 48.dp).background(if (date.toString() == value) Orange else Color.Transparent, RoundedCornerShape(5.dp)).semantics { contentDescription = date.format(DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.forLanguageTag("id-ID"))) }) { Text(date.dayOfMonth.toString(), color = if (YearMonth.from(date) == month) Ink else Color.Gray) }
                }
            } }
        }
    }, confirmButton = { TextButton(onClick = { onSelect(LocalDate.now().toString()); open = false }) { Text("Hari ini") } }, dismissButton = { TextButton(onClick = { open = false }) { Text("Tutup") } })
}

private val PieColors = listOf(0xFFF5790B, 0xFFA78BFA, 0xFF5DD4BD, 0xFFF7CE54, 0xFF70B7F5, 0xFFF58DA8, 0xFFC1D96C, 0xFFD7B6F5).map { Color(it) }
@Composable fun ExpenseDonut(book: Book) {
    val groups = book.transactions.filter { it.type == "out" }.groupBy { it.categoryId }.map { (id, rows) -> (book.categories.firstOrNull { it.id == id }?.name ?: "Tanpa kategori") to rows.fold(0L) { sum, t -> Math.addExact(sum, t.amount) } }.sortedByDescending { it.second }
    val slices = if (groups.size > 8) groups.take(7) + ("Lainnya" to groups.drop(7).fold(0L) { sum, g -> Math.addExact(sum, g.second) }) else groups
    val total = book.total("out")
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        Text("Pengeluaran per kategori", style = MaterialTheme.typography.titleLarge)
        if (total == 0L) Text("Belum ada pengeluaran.") else {
            Box(Modifier.fillMaxWidth().height(240.dp), contentAlignment = Alignment.Center) {
                Canvas(Modifier.size(220.dp).semantics { contentDescription = "Diagram donat pengeluaran total Rp ${Rupiah.format(total)}. Rincian tersedia di bawah." }) {
                    val stroke = 32.dp.toPx(); val diameter = size.minDimension - stroke
                    var start = -90f
                    slices.forEachIndexed { i, g ->
                        val sweep = (g.second.toDouble() / total * 360).toFloat()
                        drawArc(PieColors[i], start, sweep, false, Offset(stroke / 2, stroke / 2), Size(diameter, diameter), style = Stroke(stroke))
                        start += sweep
                    }
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("Total"); Text("Rp " + Rupiah.format(total), style = MaterialTheme.typography.titleMedium) }
            }
            slices.forEachIndexed { i, g -> Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(14.dp).background(PieColors[i])); Spacer(Modifier.width(8.dp))
                Text(g.first + " · Rp " + Rupiah.format(g.second) + " · " + String.format(Locale.forLanguageTag("id-ID"), "%.1f%%", g.second.toDouble() / total * 100))
            } }
        }
    }
}
