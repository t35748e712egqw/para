package com.paradoxroom.game.core

import kotlin.math.sqrt

enum class GameState {
    LOADING,
    PLAYING,
    PAUSED,
    TRANSITIONING,
    PUZZLE_INTERACTION,
    WON,
    FAILED
}

enum class RealityLayer {
    REALITY_01,
    REALITY_02;

    fun toggle(): RealityLayer = if (this == REALITY_01) REALITY_02 else REALITY_01
}

enum class InteractionType {
    BUTTON,
    SWITCH,
    TERMINAL,
    DOOR,
    CLUE,
    PUZZLE_DEVICE,
    CHECKPOINT
}

enum class InteractionPriority(val value: Int) {
    PUZZLE_MECHANISM(1),
    DOOR(2),
    SWITCH_BUTTON(3),
    REALITY_TERMINAL(4),
    CLUE(5),
    GENERAL(6)
}

data class Vector3(
    var x: Float = 0f,
    var y: Float = 0f,
    var z: Float = 0f
) {
    fun set(nx: Float, ny: Float, nz: Float) {
        x = nx; y = ny; z = nz
    }

    fun add(other: Vector3): Vector3 = Vector3(x + other.x, y + other.y, z + other.z)
    fun subtract(other: Vector3): Vector3 = Vector3(x - other.x, y - other.y, z - other.z)
    fun length(): Float = sqrt(x * x + y * y + z * z)
    fun normalize(): Vector3 {
        val l = length()
        return if (l > 0.0001f) Vector3(x / l, y / l, z / l) else Vector3(0f, 0f, 0f)
    }
}

data class AABB(
    val min: Vector3,
    val max: Vector3,
    val name: String = "",
    val isHazard: Boolean = false,
    val realityAffinity: RealityLayer? = null // null means solid in both realities
)

data class LogicalInputState(
    val moveX: Float = 0f,
    val moveY: Float = 0f,
    val lookX: Float = 0f,
    val lookY: Float = 0f,
    val interact: Boolean = false,
    val sprint: Boolean = false,
    val jump: Boolean = false,
    val realityShift: Boolean = false,
    val pause: Boolean = false
)

data class InteractableObject(
    val id: String,
    val name: String,
    val isInteractable: Boolean = true,
    val interactionType: InteractionType,
    val interactionRange: Float = 3.2f,
    val interactionText: String,
    val priority: InteractionPriority = InteractionPriority.GENERAL,
    val visibleReality: Int = 0, // 0 = both, 1 = R1, 2 = R2
    val position: Vector3,
    val clueText: String? = null,
    val onExecute: () -> Unit
)
