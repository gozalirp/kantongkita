package com.savingduit.nativeapp

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight

val Orange = Color(0xFFF5790B)
val Ink = Color(0xFF181818)
val Sora = FontFamily(Font(R.font.sora, FontWeight.Normal), Font(R.font.sora, FontWeight.Bold))
@Composable fun NativeTheme(content: @Composable () -> Unit) {
    val t = Typography()
    MaterialTheme(colorScheme = lightColorScheme(primary = Ink, onPrimary = Color.White, secondaryContainer = Orange, background = Color(0xFFFFF9EE), surface = Color.White), typography = Typography(
        displayLarge = t.displayLarge.copy(fontFamily = Sora), headlineLarge = t.headlineLarge.copy(fontFamily = Sora), headlineMedium = t.headlineMedium.copy(fontFamily = Sora),
        titleLarge = t.titleLarge.copy(fontFamily = Sora), titleMedium = t.titleMedium.copy(fontFamily = Sora), titleSmall = t.titleSmall.copy(fontFamily = Sora),
        bodyLarge = t.bodyLarge.copy(fontFamily = Sora), bodyMedium = t.bodyMedium.copy(fontFamily = Sora), bodySmall = t.bodySmall.copy(fontFamily = Sora),
        labelLarge = t.labelLarge.copy(fontFamily = Sora), labelMedium = t.labelMedium.copy(fontFamily = Sora), labelSmall = t.labelSmall.copy(fontFamily = Sora)
    ), content = content)
}
