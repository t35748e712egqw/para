package com.paradoxroom.game.player

import com.paradoxroom.game.core.AABB
import com.paradoxroom.game.core.LogicalInputState
import com.paradoxroom.game.core.RealityLayer
import com.paradoxroom.game.core.Vector3
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Kinematic First-Person Player Controller
 * Handles movement, wall sliding, gravity, grounding, sprinting, and checkpoint respawn.
 */
class PlayerController {
    val radius = 0.35f
    val height = 1.8f
    val eyeHeight = 1.65f

    // Configurable Speeds
    var walkSpeed = 4.0f
    var sprintSpeed = 6.2f // ~1.55x walk speed
    var acceleration = 35.0f
    var deceleration = 25.0f
    var gravity = 18.0f
    var jumpStrength = 5.2f

    val position = Vector3(0f, 0f, 11f)
    val velocity = Vector3(0f, 0f, 0f)

    var isGrounded = true
        private set
    var isSprinting = false
        private set
    var isMoving = false
        private set

    // Checkpoint
    private val checkpoint = Vector3(0f, 0f, 11f)
    var onHazardFall: (() -> Unit)? = null

    // Collision geometry
    private var collisionBoxes: List<AABB> = emptyList()

    fun setCollisionBoxes(boxes: List<AABB>) {
        collisionBoxes = boxes
    }

    fun setCheckpoint(pos: Vector3) {
        checkpoint.set(pos.x, pos.y, pos.z)
    }

    fun setPosition(pos: Vector3) {
        position.set(pos.x, pos.y, pos.z)
        velocity.set(0f, 0f, 0f)
    }

    fun update(
        deltaTime: Float,
        input: LogicalInputState,
        cameraYaw: Float,
        activeReality: RealityLayer,
        canJump: Boolean
    ) {
        val hasMoveInput = hypot(input.moveX, input.moveY) > 0.05f
        isSprinting = input.sprint && hasMoveInput
        val targetSpeed = if (isSprinting) sprintSpeed else walkSpeed

        // 1. Convert input to world movement vector based on camera yaw
        var targetVelX = 0f
        var targetVelZ = 0f

        if (hasMoveInput) {
            val sinYaw = sin(cameraYaw)
            val cosYaw = cos(cameraYaw)

            val fwdX = -sinYaw * input.moveY
            val fwdZ = -cosYaw * input.moveY
            val rightX = cosYaw * input.moveX
            val rightZ = -sinYaw * input.moveX

            val dirX = fwdX + rightX
            val dirZ = fwdZ + rightZ
            val len = hypot(dirX, dirZ)

            if (len > 0.001f) {
                targetVelX = (dirX / len) * targetSpeed
                targetVelZ = (dirZ / len) * targetSpeed
            }
        }

        // 2. Acceleration / Deceleration
        val rate = if (hasMoveInput) acceleration else deceleration
        velocity.x += (targetVelX - velocity.x) * min(1f, deltaTime * rate)
        velocity.z += (targetVelZ - velocity.z) * min(1f, deltaTime * rate)

        // 3. Jump and Gravity
        if (canJump && input.jump && isGrounded) {
            velocity.y = jumpStrength
            isGrounded = false
        }

        if (!isGrounded) {
            velocity.y -= gravity * deltaTime
        }

        // 4. Resolve displacement with wall sliding
        val deltaX = velocity.x * deltaTime
        val deltaZ = velocity.z * deltaTime
        val deltaY = velocity.y * deltaTime

        // X movement
        position.x += deltaX
        if (checkHorizontalCollision(activeReality)) {
            position.x -= deltaX
            velocity.x = 0f
        }

        // Z movement
        position.z += deltaZ
        if (checkHorizontalCollision(activeReality)) {
            position.z -= deltaZ
            velocity.z = 0f
        }

        // Y movement and grounding
        position.y += deltaY
        val groundY = resolveGroundHeight(activeReality)

        if (position.y <= groundY) {
            position.y = groundY
            velocity.y = 0f
            isGrounded = true
        } else {
            isGrounded = false
        }

        // 5. Fall hazard check (bottomless chasm)
        if (position.y < -1.8f) {
            respawnAtCheckpoint()
        }

        val horizontalSpeed = hypot(velocity.x, velocity.z)
        isMoving = horizontalSpeed > 0.2f
    }

    private fun checkHorizontalCollision(activeReality: RealityLayer): Boolean {
        val feetY = position.y
        val headY = feetY + height

        for (box in collisionBoxes) {
            if (box.isHazard) continue
            if (box.realityAffinity != null && box.realityAffinity != activeReality) continue

            // Vertical overlap
            if (headY <= box.min.y || feetY >= box.max.y) continue

            // Circle-AABB horizontal overlap
            val closestX = max(box.min.x, min(position.x, box.max.x))
            val closestZ = max(box.min.z, min(position.z, box.max.z))

            val dx = position.x - closestX
            val dz = position.z - closestZ
            if (dx * dx + dz * dz < radius * radius) {
                return true
            }
        }
        return false
    }

    private fun resolveGroundHeight(activeReality: RealityLayer): Float {
        var highest = -100f
        for (box in collisionBoxes) {
            if (box.realityAffinity != null && box.realityAffinity != activeReality) continue

            if (position.x >= box.min.x - radius && position.x <= box.max.x + radius &&
                position.z >= box.min.z - radius && position.z <= box.max.z + radius
            ) {
                if (box.isHazard) continue // Void chasm has no floor
                if (box.max.y <= position.y + 0.3f && box.max.y > highest) {
                    highest = box.max.y
                }
            }
        }
        return highest
    }

    fun respawnAtCheckpoint() {
        position.set(checkpoint.x, checkpoint.y, checkpoint.z)
        velocity.set(0f, 0f, 0f)
        isGrounded = true
        onHazardFall?.invoke()
    }
}
