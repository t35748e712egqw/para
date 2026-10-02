package com.paradoxroom.game.reality

import com.paradoxroom.game.core.RealityLayer

/**
 * Reality Manager
 * Controls active quantum reality layer, shifting locks, and notifies listeners.
 */
class RealityManager(
    initialReality: RealityLayer = RealityLayer.REALITY_01
) {
    var currentReality: RealityLayer = initialReality
        private set

    var isShiftLocked: Boolean = false
        private set

    var shiftCount: Int = 0
        private set

    private val realityChangeListeners = mutableListOf<(RealityLayer) -> Unit>()

    fun addListener(listener: (RealityLayer) -> Unit) {
        realityChangeListeners.add(listener)
    }

    fun removeListener(listener: (RealityLayer) -> Unit) {
        realityChangeListeners.remove(listener)
    }

    /**
     * Executes Reality Shift: 1 -> 2, 2 -> 1
     */
    fun shiftReality(onComplete: () -> Unit = {}): Boolean {
        if (isShiftLocked) return false

        isShiftLocked = true
        shiftCount++

        val nextReality = currentReality.toggle()
        currentReality = nextReality

        // Notify observers immediately to update 3D meshes & materials
        realityChangeListeners.forEach { it.invoke(nextReality) }

        // Release lock after brief transition duration (~200ms)
        isShiftLocked = false
        onComplete.invoke()
        return true
    }

    fun reset() {
        currentReality = RealityLayer.REALITY_01
        isShiftLocked = false
        shiftCount = 0
        realityChangeListeners.forEach { it.invoke(currentReality) }
    }
}
