package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test

class EmailRecoveryTest {
    @Test fun officialFragmentOnlyNoRedirectOrQueryTokens() {
        val token = "a".repeat(64)
        assertEquals(EmailRecovery.Link("verify", token), EmailRecovery.parse("https://moneyplanner.darmintompel.my.id/akun-email#verify=$token"))
        for (link in listOf("https://evil.test/akun-email#verify=$token", "http://moneyplanner.darmintompel.my.id/akun-email#verify=$token", "https://moneyplanner.darmintompel.my.id/akun-email?verify=$token", "https://user@moneyplanner.darmintompel.my.id/akun-email#verify=$token", "https://moneyplanner.darmintompel.my.id/akun-email#verify=$token&redirect=x")) {
            try { EmailRecovery.parse(link); fail("Accepted unsafe email link") } catch (_: IllegalArgumentException) {}
        }
    }
}
