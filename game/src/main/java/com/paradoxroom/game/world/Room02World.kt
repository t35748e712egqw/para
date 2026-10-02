package com.paradoxroom.game.world

import com.paradoxroom.game.core.AABB
import com.paradoxroom.game.core.InteractableObject
import com.paradoxroom.game.core.InteractionPriority
import com.paradoxroom.game.core.InteractionType
import com.paradoxroom.game.core.RealityLayer
import com.paradoxroom.game.core.Vector3

/**
 * Room 02 — The Invisible Bridge World Representation
 * Manages chamber dimensions, collision geometry, interactables, and puzzle state.
 */
class Room02World {
    var isBridgeActive: Boolean = false
        private set

    var isExitUnlocked: Boolean = false
        private set

    val startCheckpoint = Vector3(0f, 0f, 11f)

    // Collision geometry
    val collisionBoxes = mutableListOf<AABB>()

    // Interactable objects
    val interactables = mutableListOf<InteractableObject>()

    var onBridgeActivated: (() -> Unit)? = null
    var onExitTriggered: (() -> Unit)? = null
    var onTerminalUsed: (() -> Unit)? = null
    var onClueRead: ((String) -> Unit)? = null

    init {
        buildWorldGeometry()
        registerInteractables()
    }

    private fun buildWorldGeometry() {
        collisionBoxes.clear()

        // 1. Start Platform Floor (Z: 5 to 14, X: -4.5 to 4.5, Y: 0)
        collisionBoxes.add(
            AABB(
                min = Vector3(-4.5f, -0.5f, 5.0f),
                max = Vector3(4.5f, 0.0f, 14.0f),
                name = "Start Platform Floor"
            )
        )

        // 2. Exit Platform Floor across the chasm (Z: -14 to -5, X: -4.5 to 4.5)
        collisionBoxes.add(
            AABB(
                min = Vector3(-4.5f, -0.5f, -14.0f),
                max = Vector3(4.5f, 0.0f, -5.0f),
                name = "Exit Platform Floor"
            )
        )

        // 3. Chamber Walls
        // Left Wall
        collisionBoxes.add(
            AABB(
                min = Vector3(-5.2f, -0.5f, -15f),
                max = Vector3(-4.5f, 6.0f, 15f),
                name = "Left Wall"
            )
        )
        // Right Wall
        collisionBoxes.add(
            AABB(
                min = Vector3(4.5f, -0.5f, -15f),
                max = Vector3(5.2f, 6.0f, 15f),
                name = "Right Wall"
            )
        )
        // Back Wall
        collisionBoxes.add(
            AABB(
                min = Vector3(-5f, -0.5f, 14.0f),
                max = Vector3(5f, 6.0f, 14.8f),
                name = "Back Entrance Wall"
            )
        )
        // Far Wall
        collisionBoxes.add(
            AABB(
                min = Vector3(-5f, -0.5f, -14.8f),
                max = Vector3(5f, 6.0f, -14.0f),
                name = "Far Exit Wall"
            )
        )

        // 4. Edge Barriers with gap for bridge
        collisionBoxes.add(AABB(Vector3(-4.5f, 0f, 4.9f), Vector3(-1.3f, 1.2f, 5.1f), "Start Left Barrier"))
        collisionBoxes.add(AABB(Vector3(1.3f, 0f, 4.9f), Vector3(4.5f, 1.2f, 5.1f), "Start Right Barrier"))
        collisionBoxes.add(AABB(Vector3(-4.5f, 0f, -5.1f), Vector3(-1.3f, 1.2f, -4.9f), "Exit Left Barrier"))
        collisionBoxes.add(AABB(Vector3(1.3f, 0f, -5.1f), Vector3(4.5f, 1.2f, -4.9f), "Exit Right Barrier"))

        // 5. Chasm Void Hazard (falling below triggers respawn)
        collisionBoxes.add(
            AABB(
                min = Vector3(-5f, -20f, -5f),
                max = Vector3(5f, -0.1f, 5f),
                isHazard = true,
                name = "Chasm Void Hazard"
            )
        )

        // 6. Reality 2 Console Obstacle (only collides in Reality 2)
        collisionBoxes.add(
            AABB(
                min = Vector3(2.3f, 0f, 5.7f),
                max = Vector3(3.3f, 1.5f, 6.7f),
                realityAffinity = RealityLayer.REALITY_02,
                name = "R2 Stabilizer Pedestal"
            )
        )
    }

    private fun registerInteractables() {
        interactables.clear()

        // 1. Reality Terminal (Start Area)
        interactables.add(
            InteractableObject(
                id = "reality_terminal",
                name = "Reality Terminal",
                interactionType = InteractionType.TERMINAL,
                interactionRange = 3.2f,
                interactionText = "Use Reality Terminal",
                priority = InteractionPriority.REALITY_TERMINAL,
                visibleReality = 0, // Both
                position = Vector3(-2.8f, 1.2f, 7.5f),
                onExecute = { onTerminalUsed?.invoke() }
            )
        )

        // 2. Reality Button / Bridge System Stabilizer (Reality 2 only!)
        interactables.add(
            InteractableObject(
                id = "reality_button",
                name = "Bridge System Button",
                interactionType = InteractionType.BUTTON,
                interactionRange = 3.0f,
                interactionText = "Activate Bridge System",
                priority = InteractionPriority.PUZZLE_MECHANISM,
                visibleReality = 2, // Reality 2 only
                position = Vector3(2.8f, 1.25f, 6.2f),
                onExecute = { activateBridge() }
            )
        )

        // 3. Exit Door (Far end across the gap)
        interactables.add(
            InteractableObject(
                id = "exit_door",
                name = "Chamber Exit",
                interactionType = InteractionType.DOOR,
                interactionRange = 3.5f,
                interactionText = "Enter Exit",
                priority = InteractionPriority.DOOR,
                visibleReality = 0,
                position = Vector3(0f, 1.6f, -13.5f),
                onExecute = { onExitTriggered?.invoke() }
            )
        )

        // 4. Clue Panel: "THE PATH EXISTS BETWEEN STATES."
        interactables.add(
            InteractableObject(
                id = "clue_states",
                name = "Research Slate",
                interactionType = InteractionType.CLUE,
                interactionRange = 3.0f,
                interactionText = "Read Clue",
                priority = InteractionPriority.CLUE,
                visibleReality = 1,
                position = Vector3(4.4f, 1.6f, 9.0f),
                clueText = "THE PATH EXISTS BETWEEN STATES.",
                onExecute = { onClueRead?.invoke("THE PATH EXISTS BETWEEN STATES.") }
            )
        )
    }

    fun activateBridge() {
        if (!isBridgeActive) {
            isBridgeActive = true
            isExitUnlocked = true

            // Add solid collision for the bridge in Reality 1
            collisionBoxes.add(
                AABB(
                    min = Vector3(-1.2f, -0.4f, -5.0f),
                    max = Vector3(1.2f, 0.0f, 5.0f),
                    realityAffinity = RealityLayer.REALITY_01,
                    name = "Calibrated Invisible Bridge Pathway"
                )
            )

            onBridgeActivated?.invoke()
        }
    }

    fun reset() {
        isBridgeActive = false
        isExitUnlocked = false
        buildWorldGeometry()
    }
}
