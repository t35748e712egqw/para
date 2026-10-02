package com.paradoxroom.game.camera

import com.paradoxroom.game.core.Vector3
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * First-Person Camera
 * Attached to player eye position. Smooth yaw/pitch with vertical clamping to prevent jitter.
 */
class FirstPersonCamera(
    var baseFov: Float = 75f
) {
    var yaw: Float = 0f
        private set
    var pitch: Float = 0f
        private set

    // Vertical pitch limits (~ -85 deg to +85 deg)
    private val minPitch = -1.48f
    private val maxPitch = 1.48f

    var currentFov: Float = baseFov
        private set

    val position = Vector3()

    fun addRotation(deltaYaw: Float, deltaPitch: Float) {
        yaw -= deltaYaw
        pitch = max(minPitch, min(maxPitch, pitch + deltaPitch))
    }

    fun setRotation(newYaw: Float, newPitch: Float) {
        yaw = newYaw
        pitch = max(minPitch, min(maxPitch, newPitch))
    }

    fun update(
        deltaTime: Float,
        playerPos: Vector3,
        eyeHeight: Float,
        isSprinting: Boolean,
        isMoving: Boolean
    ) {
        position.set(playerPos.x, playerPos.y + eyeHeight, playerPos.z)

        // Dynamic FOV expansion on sprint
        val targetFov = if (isSprinting && isMoving) baseFov + 4f else baseFov
        currentFov += (targetFov - currentFov) * min(1f, deltaTime * 8f)
    }

    fun getForwardVector(): Vector3 {
        val cosPitch = cos(pitch)
        val sinPitch = sin(pitch)
        val cosYaw = cos(yaw)
        val sinYaw = sin(yaw)

        // Standard forward in Right-Handed coordinates
        return Vector3(
            x = -sinYaw * cosPitch,
            y = sinPitch,
            z = -cosYaw * cosPitch
        ).normalize()
    }
}
