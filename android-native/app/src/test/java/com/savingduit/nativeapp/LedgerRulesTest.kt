package com.savingduit.nativeapp
import org.junit.Assert.*
import org.junit.Test
class LedgerRulesTest {
    @Test fun amountValidation() {
        assertEquals(1000L, LedgerRules.amount("1000"))
        for (bad in listOf("0", "-1", "1.5", "1,000", "1000000000000", "", " 1")) assertNull(LedgerRules.amount(bad))
    }
    @Test fun dateAndNoteValidation() {
        assertTrue(LedgerRules.valid("Makan", 25000, "2026-10-23"))
        assertFalse(LedgerRules.valid(" ", 1, "2026-10-23"))
        assertFalse(LedgerRules.valid("x", 1, "2026-02-30"))
        assertFalse(LedgerRules.valid("x", 0, "2026-10-23"))
        assertFalse(LedgerRules.valid("x".repeat(201), 1, "2026-10-23"))
    }
}
