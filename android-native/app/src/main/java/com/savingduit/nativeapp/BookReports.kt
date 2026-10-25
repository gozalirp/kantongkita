package com.savingduit.nativeapp

import java.time.LocalDate
import java.time.YearMonth

object BookReports {
    fun filter(book: Book, start: String, end: String, type: String = "", wallet: String = "", category: String = "", query: String = ""): Book {
        val first = LocalDate.parse(start)
        val last = LocalDate.parse(end)
        require(!last.isBefore(first)) { "Tanggal akhir harus setelah tanggal awal" }
        require(type in listOf("", "in", "out", "move"))
        return book.copy(transactions = book.transactions.filter { t ->
            val date = LocalDate.parse(t.date)
            !date.isBefore(first) && !date.isAfter(last) && (type.isEmpty() || t.type == type) &&
                (wallet.isEmpty() || t.walletId == wallet || t.walletTo == wallet) &&
                (category.isEmpty() || t.categoryId == category) &&
                (query.isBlank() || t.note.contains(query, true) || t.amount.toString().contains(query) || Rupiah.format(t.amount).contains(query))
        })
    }
    data class Period(val label: String, val income: Long, val expense: Long) { val net get() = Math.subtractExact(income, expense) }
    fun trend(book: Book, today: LocalDate, months: Int = 0): List<Period> {
        require(months in listOf(0, 6, 12))
        val dates = if (months == 0) (29 downTo 0).map { today.minusDays(it.toLong()) } else (months - 1 downTo 0).map { today.withDayOfMonth(1).minusMonths(it.toLong()) }
        val groups = book.transactions.filter { it.type != "move" }.groupBy { if (months == 0) it.date else it.date.take(7) }
        return dates.map { day ->
            val key = if (months == 0) day.toString() else YearMonth.from(day).toString()
            val rows = groups[key].orEmpty()
            Period(key, rows.filter { it.type == "in" }.fold(0L) { n, tx -> Math.addExact(n, tx.amount) }, rows.filter { it.type == "out" }.fold(0L) { n, tx -> Math.addExact(n, tx.amount) })
        }
    }
    fun periods(book: Book, unit: String): List<Period> {
        require(unit in listOf("day", "month", "year"))
        return book.transactions.filter { it.type != "move" }.groupBy { when(unit) { "month" -> it.date.take(7); "year" -> it.date.take(4); else -> it.date } }.toSortedMap().map { (key, rows) ->
            Period(key, rows.filter { it.type == "in" }.fold(0L) { n, tx -> Math.addExact(n, tx.amount) }, rows.filter { it.type == "out" }.fold(0L) { n, tx -> Math.addExact(n, tx.amount) })
        }
    }
    fun budgetUsed(book: Book, budget: Budget, date: LocalDate): Long = book.transactions.filter {
        val day = LocalDate.parse(it.date)
        it.type == "out" && it.categoryId == budget.categoryId &&
            if (budget.period == "year") day.year == date.year else YearMonth.from(day) == YearMonth.from(date)
    }.fold(0L) { sum, t -> Math.addExact(sum, t.amount) }
}
