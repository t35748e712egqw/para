package com.paradoxroom.app.ui.hud

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paradoxroom.app.ui.theme.AmberAccent
import com.paradoxroom.app.ui.theme.CyanAccent
import com.paradoxroom.game.core.InteractableObject
import com.paradoxroom.game.core.RealityLayer
import com.paradoxroom.game.input.UnifiedInput
import kotlin.math.hypot
import kotlin.math.roundToInt

@Composable
fun MobileHud(
    reality: RealityLayer,
    currentInteractable: InteractableObject?,
    objective: String,
    unifiedInput: UnifiedInput,
    onPauseClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // ============================================
        // 1. TOP BAR: Reality Indicator & Pause
        // ============================================
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Reality Indicator
            val isR1 = reality == RealityLayer.REALITY_01
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.7f))
                    .border(
                        1.dp,
                        if (isR1) CyanAccent.copy(alpha = 0.5f) else AmberAccent.copy(alpha = 0.5f),
                        RoundedCornerShape(8.dp)
                    )
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (isR1) CyanAccent else AmberAccent)
                )
                Text(
                    text = if (isR1) "REALITY 01" else "REALITY 02",
                    color = if (isR1) CyanAccent else AmberAccent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }

            // Objective Display
            Text(
                text = "OBJECTIVE: $objective",
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            )

            // Pause Button
            IconButton(
                onClick = onPauseClick,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
            ) {
                Icon(
                    imageVector = Icons.Default.Pause,
                    contentDescription = "Pause",
                    tint = Color.White
                )
            }
        }

        // ============================================
        // 2. CENTER: Crosshair & Interaction Prompt
        // ============================================
        Box(
            modifier = Modifier.align(Alignment.Center),
            contentAlignment = Alignment.Center
        ) {
            // Minimal Crosshair
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(if (reality == RealityLayer.REALITY_01) CyanAccent else AmberAccent)
            )

            // Look-At Contextual Prompt
            AnimatedVisibility(
                visible = currentInteractable != null,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.padding(top = 70.dp)
            ) {
                currentInteractable?.let { target ->
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.Black.copy(alpha = 0.85f))
                            .border(1.dp, CyanAccent.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "TAP",
                            color = CyanAccent,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier
                                .background(CyanAccent.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                        Column {
                            Text(
                                text = target.interactionText,
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = target.name,
                                color = Color.Gray,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }
        }

        // ============================================
        // 3. RIGHT TOUCH CAMERA DRAG AREA
        // ============================================
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(0.65f)
                .align(Alignment.CenterEnd)
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        unifiedInput.addTouchLookDelta(dragAmount.x, dragAmount.y)
                    }
                }
        )

        // ============================================
        // 4. BOTTOM LEFT: Virtual Movement Joystick
        // ============================================
        var thumbOffset by remember { mutableStateOf(IntOffset.Zero) }
        val maxRadius = 100f

        Box(
            modifier = Modifier
                .size(130.dp)
                .align(Alignment.BottomStart)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.45f))
                .border(2.dp, Color.White.copy(alpha = 0.2f), CircleShape)
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragEnd = {
                            thumbOffset = IntOffset.Zero
                            unifiedInput.setVirtualJoystick(0f, 0f)
                        },
                        onDragCancel = {
                            thumbOffset = IntOffset.Zero
                            unifiedInput.setVirtualJoystick(0f, 0f)
                        }
                    ) { change, dragAmount ->
                        change.consume()
                        val newX = thumbOffset.x + dragAmount.x
                        val newY = thumbOffset.y + dragAmount.y
                        val dist = hypot(newX, newY)
                        val clampedDist = dist.coerceAtMost(maxRadius)
                        val angle = kotlin.math.atan2(newY, newX)

                        val finalX = (kotlin.math.cos(angle) * clampedDist)
                        val finalY = (kotlin.math.sin(angle) * clampedDist)
                        thumbOffset = IntOffset(finalX.roundToInt(), finalY.roundToInt())

                        unifiedInput.setVirtualJoystick(
                            finalX / maxRadius,
                            -(finalY / maxRadius)
                        )
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .offset { thumbOffset }
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(CyanAccent.copy(alpha = 0.8f))
            )
        }

        // ============================================
        // 5. BOTTOM RIGHT: Action Button Cluster
        // ============================================
        Column(
            modifier = Modifier.align(Alignment.BottomEnd),
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Contextual Interact Button (Visible when looking at interactable)
            if (currentInteractable != null) {
                IconButton(
                    onClick = { unifiedInput.triggerInteract() },
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(CyanAccent)
                ) {
                    Icon(
                        imageVector = Icons.Default.TouchApp,
                        contentDescription = "Interact",
                        tint = Color.Black
                    )
                }
            }

            // Reality Shift Button
            IconButton(
                onClick = { unifiedInput.triggerRealityShift() },
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (reality == RealityLayer.REALITY_01) AmberAccent else CyanAccent)
            ) {
                Icon(
                    imageVector = Icons.Default.Visibility,
                    contentDescription = "Reality Shift",
                    tint = Color.Black
                )
            }
        }
    }
}
