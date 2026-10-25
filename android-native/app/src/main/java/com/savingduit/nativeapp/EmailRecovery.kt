package com.savingduit.nativeapp

object EmailRecovery {
    data class Link(val purpose: String, val token: String)
    fun parse(value: String): Link {
        val uri = java.net.URI(value.trim())
        require(uri.scheme == "https" && uri.host == "moneyplanner.darmintompel.my.id" && uri.port == -1 && uri.rawUserInfo == null && uri.path in listOf("/akun-email", "/akun-email.html") && uri.rawQuery == null) { "Gunakan tautan email resmi KantongKita" }
        val match = Regex("(verify|reset)=([a-f0-9]{64})").matchEntire(uri.rawFragment ?: "") ?: throw IllegalArgumentException("Tautan tidak valid")
        return Link(match.groupValues[1], match.groupValues[2])
    }
}
