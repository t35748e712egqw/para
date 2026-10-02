package com.paradoxroom.game.interaction

import com.paradoxroom.game.core.InteractableObject
import com.paradoxroom.game.core.RealityLayer
import com.paradoxroom.game.core.Vector3
import kotlin.math.hypot

/**
 * Look-At Interaction System
 * Uses forward cone detection and interaction priority sorting.
 */
class LookAtInteraction {
    var currentTarget: InteractableObject? = null
        private set

    fun update(
        eyePosition: Vector3,
        forwardVector: Vector3,
        interactables: List<InteractableObject>,
        activeReality: RealityLayer
    ): InteractableObject? {
        var bestTarget: InteractableObject? = null
        var highestPriority = 999
        var closestDist = 999f

        val activeRealityInt = if (activeReality == RealityLayer.REALITY_01) 1 else 2

        for (obj in interactables) {
            if (!obj.isInteractable) continue

            // Reality filtering: 0 = both, 1 = R1, 2 = R2
            if (obj.visibleReality != 0 && obj.visibleReality != activeRealityInt) {
                continue
            }

            val dx = obj.position.x - eyePosition.x
            val dy = obj.position.y - eyePosition.y
            val dz = obj.position.z - eyePosition.z
            val dist = hypot(hypot(dx, dy), dz)

            if (dist > obj.interactionRange) continue

            // Forward dot product check
            val dirX = dx / dist
            val dirY = dy / dist
            val dirZ = dz / dist
            val dot = forwardVector.x * dirX + forwardVector.y * dirY + forwardVector.z * dirZ

            // Check if player is facing within ~38 degrees of the object
            if (dot < 0.80f) continue

            val prioVal = obj.priority.value
            if (prioVal < highestPriority || (prioVal == highestPriority && dist < closestDist)) {
                highestPriority = prioVal
                closestDist = dist
                bestTarget = obj
            }
        }

        currentTarget = bestTarget
        return bestTarget
    }

    fun executeCurrentInteraction(): Boolean {
        currentTarget?.let {
            it.onExecute.invoke()
            return true
        }
        return false
    }
}
