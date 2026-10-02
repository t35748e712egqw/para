package com.paradoxroom.game.input

import com.paradoxroom.game.core.LogicalInputState
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

/**
 * Unified Input System
 * Consolidates Touch Virtual Joystick, Touch Drag Look, and Keyboard/Mouse into
 * standard logical inputs without duplicating gameplay logic.
 */
class UnifiedInput {
    // Continuous axis inputs
    private var rawMoveX: Float = 0f
    private var rawMoveY: Float = 0f
    private var rawLookX: Float = 0f
    private var rawLookY: Float = 0f
    private var isSprintHeld: Boolean = false

    // Edge triggers
    private var interactTriggered: Boolean = false
    private var realityShiftTriggered: Boolean = false
    private var jumpTriggered: Boolean = false
    private var pauseTriggered: Boolean = false

    // Sensitivity & Preferences
    var lookSensitivity: Float = 1.0f
    var touchSensitivity: Float = 1.0f
    var invertY: Boolean = false

    fun setVirtualJoystick(x: Float, y: Float) {
        rawMoveX = max(-1f, min(1f, x))
        rawMoveY = max(-1f, min(1f, y))
    }

    fun addTouchLookDelta(dx: Float, dy: Float) {
        val sens = touchSensitivity * 0.0035f
        val ySign = if (invertY) 1f else -1f
        rawLookX += dx * sens
        rawLookY += dy * sens * ySign
    }

    fun setSprintActive(active: Boolean) {
        isSprintHeld = active
    }

    fun triggerInteract() {
        interactTriggered = true
    }

    fun triggerRealityShift() {
        realityShiftTriggered = true
    }

    fun triggerJump() {
        jumpTriggered = true
    }

    fun triggerPause() {
        pauseTriggered = true
    }

    /**
     * Consumes the input for the current physics/gameplay tick.
     * Edge triggers are reset to false immediately.
     */
    fun pollInput(): LogicalInputState {
        var normX = rawMoveX
        var normY = rawMoveY
        val len = hypot(normX, normY)
        if (len > 1.0f) {
            normX /= len
            normY /= len
        }

        val lx = rawLookX
        val ly = rawLookY
        rawLookX = 0f
        rawLookY = 0f

        val interact = interactTriggered
        val shift = realityShiftTriggered
        val jump = jumpTriggered
        val pause = pauseTriggered

        interactTriggered = false
        realityShiftTriggered = false
        jumpTriggered = false
        pauseTriggered = false

        return LogicalInputState(
            moveX = normX,
            moveY = normY,
            lookX = lx,
            lookY = ly,
            interact = interact,
            sprint = isSprintHeld,
            jump = jump,
            realityShift = shift,
            pause = pause
        )
    }
}
