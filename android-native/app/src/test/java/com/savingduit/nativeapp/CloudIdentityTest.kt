package com.savingduit.nativeapp

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class CloudIdentityTest {
    @Test fun offlineCacheRequiresSameSessionAndBoundedAge() {
        val context = RuntimeEnvironment.getApplication()
        context.getSharedPreferences("cloud-identity", 0).edit().clear().commit()
        val store = CloudIdentity(context)
        val identity = CloudIdentity.Identity("a", "f", "owner")
        store.remember("session-a", identity, 1000)
        assertEquals(identity, store.cached("session-a", 2000))
        assertNull(store.cached(null, 2000)); assertNull(store.cached("session-b", 2000))
        assertNull(store.cached("session-a", 999)); assertNull(store.cached("session-a", 86_401_001))
    }
}
