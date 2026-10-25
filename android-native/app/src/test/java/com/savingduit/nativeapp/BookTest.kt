package com.savingduit.nativeapp

import java.time.LocalDate
import org.junit.Assert.*
import org.junit.Test

class BookTest {
    private fun book() = Book(
        wallets = listOf(Wallet("cash", "Tunai", initial = 100000), Wallet("bank", "Bank", type = "bank")),
        categories = listOf(Category("food", "Makan", "out"), Category("salary", "Gaji", "in")),
        goals = listOf(Goal("goal", "Dana darurat", 500000, walletId = "cash")),
        subscriptions = listOf(Subscription("sub", "Internet", 25000, "cash", "food"))
    ).validate()
    private fun fails(block: () -> Unit) { try { block(); fail("Expected validation error") } catch (_: IllegalArgumentException) {} }

    @Test fun transfersNeverBecomeIncomeOrExpense() {
        val b = book().saveTransaction(Transaction("move", "move", 30000, "2026-10-25", "cash", "bank"))
        assertEquals(70000L, b.walletBalance("cash")); assertEquals(30000L, b.walletBalance("bank"))
        assertEquals(100000L, b.totalBalance()); assertEquals(0L, b.total("in")); assertEquals(0L, b.total("out"))
        fails { b.saveTransaction(Transaction("bad", "move", 1, "2026-10-25", "cash", "cash")) }
    }
    @Test fun transactionEditDeleteAndMonthTotals() {
        val t = Transaction("tx", "out", 500, "2026-10-25", "cash", categoryId = "food")
        val b = book().saveTransaction(t).saveTransaction(t.copy(amount = 1000))
        assertEquals(1, b.transactions.size); assertEquals(99000L, b.totalBalance())
        assertEquals(1000L, b.total("out", "2026-10")); assertEquals(0L, b.total("out", "2026-09"))
        assertEquals(book(), b.deleteTransaction("tx"))
    }
    @Test fun rejectsBrokenReferencesDatesAmountsAndDuplicateIds() {
        val t = Transaction("tx", "out", 500, "2026-10-25", "cash", categoryId = "food")
        for (bad in listOf(t.copy(amount = 0), t.copy(amount = Long.MAX_VALUE), t.copy(date = "2026-02-30"), t.copy(walletId = "missing"), t.copy(categoryId = "salary"))) fails { book().saveTransaction(bad) }
        fails { book().copy(transactions = listOf(t, t)).validate() }
        fails { book().saveTransaction(t).deleteWallet("cash") }
        fails { book().saveTransaction(t).deleteCategory("food") }
    }
    @Test fun goalsDoNotDebitWalletAndOverwithdrawFails() {
        val b = book().adjustGoal("goal", 25000)
        assertEquals(25000L, b.goals.single().saved); assertEquals(100000L, b.totalBalance())
        fails { b.adjustGoal("goal", -25001) }
    }
    @Test fun subscriptionPaymentCreatesExpenseAndUndoRemovesIt() {
        val date = LocalDate.of(2026, 10, 25)
        val paid = book().paySubscription("sub", date, "payment")
        assertTrue(paid.subscriptionPaid("sub", "2026-10")); assertEquals(75000L, paid.totalBalance())
        fails { paid.paySubscription("sub", date, "duplicate") }
        assertEquals(book(), paid.unpaySubscription("sub", "2026-10"))
    }
    @Test fun subscriptionPaymentCannotOverwriteAnExistingTransaction() {
        val existing = Transaction("existing", "in", 1000, "2026-10-25", "cash")
        val b = book().saveTransaction(existing)
        fails { b.paySubscription("sub", LocalDate.of(2026, 10, 25), "existing") }
        assertEquals(existing, b.transactions.single())
    }
    @Test fun remoteSnapshotsCannotMoveBackwardsOrChangeAtSameRevision() {
        val b = book()
        val local = b.adjustGoal("goal", 1000)
        val newerRemote = b.adjustGoal("goal", 2000)
        val state = SyncDraft(1, b).edit(local).receive(newerRemote, 3)
        fails { state.receive(b, 2) }
        fails { state.receive(b, 3) }
        fails { SyncDraft(1, b).receive(newerRemote, 1) }
    }
    @Test fun revertingDraftAfterConflictDoesNotSilentlyForgetRemote() {
        val b = book()
        val state = SyncDraft(1, b).edit(b.adjustGoal("goal", 1000)).receive(b.adjustGoal("goal", 2000), 2).edit(b)
        assertTrue(state.conflicted)
        fails { state.acknowledge(b, 3) }
    }
    @Test fun syncStateRejectsIncompleteRemotePairAndNegativeRevision() {
        val b = book()
        fails { SyncDraft(-1, b) }
        fails { SyncDraft(0, b, remote = b) }
        fails { SyncDraft(0, b, remoteRevision = 1) }
        fails { SyncDraft(3, b, remote = b, remoteRevision = 2) }
    }
    @Test fun acknowledgementCannotSkipServerRevisions() {
        val b = book()
        fails { SyncDraft(1, b).edit(b.adjustGoal("goal", 1000)).acknowledge(b, 5) }
    }
    @Test fun formattedWholeRupiahOnly() {
        assertEquals(1000000L, Rupiah.parse("1.000.000")); assertEquals("1.000.000", Rupiah.format(1000000))
        assertEquals("-1.000", Rupiah.format(-1000))
        for (bad in listOf("1.00", "1,000", "-1", "1.5", "0", "1000000000000", "999999999999999999999", "", " 1")) assertNull(bad, Rupiah.parse(bad))
    }
    @Test fun remoteReadCannotAdvanceStaleDraftBase() {
        val base = book()
        val local = base.saveTransaction(Transaction("local", "in", 1000, "2026-10-25", "cash", categoryId = "salary"))
        val remote = base.saveTransaction(Transaction("remote", "out", 500, "2026-10-25", "cash", categoryId = "food"))
        val conflict = SyncDraft(1, base).edit(local).receive(remote, 2)
        assertEquals(1L, conflict.baseRevision); assertEquals(local, conflict.local); assertEquals(remote, conflict.remote)
        assertTrue(conflict.conflicted); fails { conflict.acknowledge(local, 3) }
        val merged = local.copy(transactions = local.transactions + remote.transactions)
        val resolved = conflict.resolve(merged)
        assertEquals(2L, resolved.baseRevision); assertFalse(resolved.conflicted); assertTrue(resolved.pending)
        assertFalse(resolved.acknowledge(merged, 3).pending)
    }
    @Test fun acknowledgementPreservesEditsMadeWhileRequestWasInFlight() {
        val base = book()
        val sent = base.adjustGoal("goal", 1000)
        val newer = sent.adjustGoal("goal", 2000)
        val ack = SyncDraft(1, base).edit(newer).acknowledge(sent, 2)
        assertEquals(newer, ack.local); assertTrue(ack.pending)
        assertEquals(2L, ack.baseRevision)
    }
}
