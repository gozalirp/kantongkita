package com.savingduit.nativeapp

import android.content.Context
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BookStoreTest {
    @Test fun migrationPreservesLegacyAndOnlyImportsOnce() {
        val context: Context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("native-preview.db"); context.deleteDatabase("scoped-books.db")
        Ledger(context).use { it.add("Lama", 1000, true, "2026-10-25") }
        BookStore(context).use { store ->
            val first = store.importLegacy()
            assertEquals(1000L, first.draft.local.totalBalance())
            assertEquals(1, first.draft.local.transactions.size)
            assertEquals(first, store.importLegacy())
        }
        Ledger(context).use { assertEquals("Lama", it.entries().single().note) }
    }
    @Test fun migratedStartupDoesNotReadRetiredDatabaseAgain() {
        val context: Context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("native-preview.db"); context.deleteDatabase("scoped-books.db")
        BookStore(context).use { it.importLegacy() }
        // Retired database corruption must not lock users out of the healthy scoped book.
        context.getDatabasePath("native-preview.db").writeText("deliberately invalid sqlite")
        BookStore(context).use { assertNotNull(it.importLegacy()) }
        context.deleteDatabase("native-preview.db")
    }
    @Test fun restoreUndoSurvivesReopenAndCannotDiscardNewEdits() {
        val context: Context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("scoped-books.db")
        val before = Book(wallets = listOf(Wallet("w", "Original")))
        BookStore(context).use { store ->
            val initial = store.create("device-local", "personal", before)
            store.restoreLocal(initial.generation, BookJson.encode(Book()))
            assertTrue(store.canUndoRestore())
        }
        BookStore(context).use { store ->
            val undone = store.undoRestore()
            assertEquals(before, undone.draft.local); assertFalse(store.canUndoRestore())
            val restored = store.restoreLocal(undone.generation, BookJson.encode(Book()))
            store.edit("device-local", "personal", restored.generation, before)
            assertFalse(store.canUndoRestore())
            try { store.undoRestore(); fail("Undo discarded edit") } catch (_: IllegalStateException) {}
            assertEquals(before, store.load("device-local", "personal")!!.draft.local)
        }
    }
    @Test fun v1MigrationPreservesRawBookAndAddsUndoTable() {
        val context: Context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("scoped-books.db")
        val raw = BookJson.encode(Book(wallets = listOf(Wallet("w", "Original"))))
        BookStore(context).use { it.create("device-local", "personal", BookJson.decode(raw)) }
        android.database.sqlite.SQLiteDatabase.openDatabase(context.getDatabasePath("scoped-books.db").path, null, 0).use { db -> db.execSQL("DROP TABLE restore_history"); db.version = 1 }
        BookStore(context).use { store -> assertEquals(raw, store.rawLocal("device-local", "personal")); assertFalse(store.canUndoRestore()); store.restoreLocal(0, raw); assertTrue(store.canUndoRestore()) }
    }
    @Test fun restoreValidatesBeforeReplacingAndRejectsStaleConfirmation() {
        val context: Context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("scoped-books.db")
        BookStore(context).use { store ->
            val first = store.create("device-local", "personal", Book(wallets = listOf(Wallet("w", "Original"))))
            val raw = BookJson.encode(Book(wallets = listOf(Wallet("new", "Restored"))))
            try { store.restoreLocal(first.generation, "{}"); fail("Invalid restore accepted") } catch (_: Exception) {}
            assertEquals("Original", store.load("device-local", "personal")!!.draft.local.wallets.single().name)
            store.restoreLocal(first.generation, raw)
            try { store.restoreLocal(first.generation, raw); fail("Stale restore accepted") } catch (_: IllegalStateException) {}
            assertEquals(raw, store.rawLocal("device-local", "personal"))
        }
    }
    @Test fun editKeepsRawMetadataAndRejectsStaleScreens() {
        val context: Context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("scoped-books.db")
        val book = Book(wallets = listOf(Wallet("w", "Tunai")))
        BookStore(context).use { store ->
            val original = store.create("qa", "personal", book)
            val raw = org.json.JSONObject(BookJson.encode(book)).apply { put("profile", org.json.JSONObject("{\"name\":\"Preserve\"}")); getJSONArray("wallets").getJSONObject(0).put("future", true) }.toString()
            store.writableDatabase.execSQL("UPDATE books SET local_json=? WHERE account_id='qa'", arrayOf(raw))
            val changed = book.copy(wallets = listOf(book.wallets.single().copy(name = "Edited")))
            store.edit("qa", "personal", original.generation, changed)
            val stored = store.readableDatabase.rawQuery("SELECT local_json FROM books WHERE account_id='qa'", null).use { c -> c.moveToFirst(); org.json.JSONObject(c.getString(0)) }
            assertEquals("Preserve", stored.getJSONObject("profile").getString("name"))
            assertTrue(stored.getJSONArray("wallets").getJSONObject(0).getBoolean("future"))
            try { store.edit("qa", "personal", original.generation, book); fail("Stale edit accepted") } catch (_: IllegalStateException) {}
            assertEquals("Edited", store.load("qa", "personal")!!.draft.local.wallets.single().name)
        }
    }
    @Test fun accountIsolationCompareAndSwapAndConflictSurviveReopen() {
        val context: Context = RuntimeEnvironment.getApplication()
        context.deleteDatabase("scoped-books.db")
        val base = Book(wallets = listOf(Wallet("w", "Tunai")))
        BookStore(context).use { store ->
            val a = store.create("account-a", "personal", base)
            store.create("account-b", "personal", base)
            val local = base.saveTransaction(Transaction("t", "in", 1000, "2026-10-25", "w"))
            val conflict = a.draft.edit(local).receive(base, 1)
            store.save("account-a", "personal", a.generation, conflict)
            try { store.save("account-a", "personal", a.generation, a.draft); fail("Stale generation accepted") } catch (_: IllegalStateException) {}
            assertTrue(store.load("account-b", "personal")!!.draft.local.transactions.isEmpty())
            try { store.create("account-a", "combined", base); fail("Combined persisted") } catch (_: IllegalArgumentException) {}
        }
        BookStore(context).use { store ->
            val restored = store.load("account-a", "personal")!!.draft
            assertTrue(restored.conflicted); assertEquals(0L, restored.baseRevision)
            assertEquals("t", restored.local.transactions.single().id)
        }
    }
}
