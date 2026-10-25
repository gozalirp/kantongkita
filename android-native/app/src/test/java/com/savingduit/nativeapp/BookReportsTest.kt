package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate

class BookReportsTest {
    private val book = Book(wallets = listOf(Wallet("a", "A"), Wallet("b", "B")), categories = listOf(Category("c", "C", "out")), transactions = listOf(
        Transaction("1", "out", 1000, "2026-10-01", "a", categoryId = "c", note = "Makan"),
        Transaction("2", "out", 2000, "2026-09-30", "a", categoryId = "c"),
        Transaction("3", "move", 3000, "2026-10-02", "a", walletTo = "b")
    ))
    @Test fun inclusiveDatesDestinationWalletAndGroupedSearch() {
        assertEquals(listOf("1", "3"), BookReports.filter(book, "2026-10-01", "2026-10-02").transactions.map { it.id })
        assertEquals("3", BookReports.filter(book, "2026-10-01", "2026-10-02", wallet = "b").transactions.single().id)
        assertEquals("1", BookReports.filter(book, "2026-10-01", "2026-10-02", query = "1.000").transactions.single().id)
        assertEquals(1000L, BookReports.filter(book, "2026-10-01", "2026-10-02").total("out"))
    }
    @Test fun monthlyAndYearlyBudgetUsage() {
        val b = Budget("budget", "c", 5000, "month")
        assertEquals(1000L, BookReports.budgetUsed(book, b, LocalDate.parse("2026-10-25")))
        assertEquals(3000L, BookReports.budgetUsed(book, b.copy(period = "year"), LocalDate.parse("2026-10-25")))
    }
    @Test fun zeroFilledTrendsAndPeriodsExcludeTransfersAcrossLeapDay() {
        val today = LocalDate.parse("2024-03-01")
        val leap = book.copy(transactions = listOf(Transaction("x", "out", 2000, "2024-02-29", "a"), Transaction("y", "in", 5000, "2024-03-01", "a"), Transaction("z", "move", 9000, "2024-03-01", "a", walletTo = "b")))
        val daily = BookReports.trend(leap, today)
        assertEquals(30, daily.size); assertEquals("2024-02-29", daily[28].label); assertEquals(2000L, daily[28].expense); assertEquals(5000L, daily.last().income); assertEquals(0L, daily.last().expense)
        val monthly = BookReports.trend(leap, today, 6)
        assertEquals(6, monthly.size); assertEquals(0L, monthly.first().expense); assertEquals(2000L, monthly[4].expense)
        val annual = BookReports.periods(leap, "year").single()
        assertEquals(3000L, annual.net)
    }
    @Test(expected = IllegalArgumentException::class) fun rejectsReversedRange() { BookReports.filter(book, "2026-10-02", "2026-10-01") }
}
