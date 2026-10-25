package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class DeviceProfileTest {
    private fun profile(): DeviceProfile {
        val context = RuntimeEnvironment.getApplication()
        context.getSharedPreferences("device-profile", 0).edit().clear().commit()
        return DeviceProfile(context)
    }
    @Test fun pinHashChangeRemovalAndPersistence() {
        val p = profile()
        p.save("QA", "🐼"); p.setPin("", "726419")
        val reopened = DeviceProfile(RuntimeEnvironment.getApplication())
        assertEquals("QA", reopened.name); assertEquals("🐼", reopened.avatar); assertTrue(reopened.hasPin)
        assertTrue(reopened.verify("726419")); assertFalse(reopened.verify("123456"))
        val prefs = RuntimeEnvironment.getApplication().getSharedPreferences("device-profile", 0)
        assertFalse(prefs.all.values.contains("726419"))
        reopened.setPin("726419", "947162")
        assertFalse(reopened.verify("726419")); assertTrue(reopened.verify("947162"))
        reopened.removePin("947162"); assertFalse(reopened.hasPin)
    }
    @Test fun failedAttemptsPersistCooldownAndNeverAllowWrongPinRemoval() {
        val p = profile(); p.setPin("", "726419")
        repeat(5) { assertFalse(p.verify("000000", 1000)) }
        val reopened = DeviceProfile(RuntimeEnvironment.getApplication())
        try { reopened.verify("726419", 1001); fail("Cooldown bypass") } catch (_: IllegalStateException) {}
        assertTrue(reopened.verify("726419", 31_001))
        try { reopened.removePin("000000"); fail("Removed with wrong pin") } catch (_: IllegalStateException) {}
        assertTrue(reopened.hasPin)
    }
}
