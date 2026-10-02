package com.paradoxroom.app.ui

import android.os.Bundle
import android.view.SurfaceView
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import com.paradoxroom.app.ui.hud.MobileHud
import com.paradoxroom.app.ui.menu.MainMenuScreen
import com.paradoxroom.app.ui.theme.ParadoxRoomTheme
import com.paradoxroom.game.camera.FirstPersonCamera
import com.paradoxroom.game.core.GameState
import com.paradoxroom.game.core.InteractableObject
import com.paradoxroom.game.core.RealityLayer
import com.paradoxroom.game.input.UnifiedInput
import com.paradoxroom.game.interaction.LookAtInteraction
import com.paradoxroom.game.player.PlayerController
import com.paradoxroom.game.reality.RealityManager
import com.paradoxroom.game.rendering.FilamentRenderer
import com.paradoxroom.game.world.Room02World

enum class ScreenState {
    MAIN_MENU,
    GAME,
    RESULTS
}

class MainActivity : ComponentActivity() {

    private var filamentRenderer: FilamentRenderer? = null
    private val unifiedInput = UnifiedInput()
    private val playerController = PlayerController()
    private val fpsCamera = FirstPersonCamera()
    private val realityManager = RealityManager()
    private val world = Room02World()
    private val lookAtInteraction = LookAtInteraction()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on during 3D puzzle gameplay
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Setup world collisions
        playerController.setCollisionBoxes(world.collisionBoxes)
        playerController.setPosition(world.startCheckpoint)
        playerController.setCheckpoint(world.startCheckpoint)

        setContent {
            ParadoxRoomTheme {
                var currentScreen by remember { mutableStateOf(ScreenState.MAIN_MENU) }
                var currentReality by remember { mutableStateOf(RealityLayer.REALITY_01) }
                var currentTarget by remember { mutableStateOf<InteractableObject?>(null) }
                var objectiveText by remember { mutableStateOf("Find a way across the gap.") }

                LaunchedEffect(Unit) {
                    realityManager.addListener { newReality ->
                        currentReality = newReality
                        filamentRenderer?.setupSkybox(newReality)
                    }

                    world.onBridgeActivated = {
                        objectiveText = "Reach the exit."
                        playerController.setCollisionBoxes(world.collisionBoxes)
                    }

                    world.onExitTriggered = {
                        if (world.isExitUnlocked) {
                            currentScreen = ScreenState.RESULTS
                        }
                    }
                }

                Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
                    when (currentScreen) {
                        ScreenState.MAIN_MENU -> {
                            MainMenuScreen(
                                onPlayClick = { currentScreen = ScreenState.GAME },
                                onSettingsClick = { /* Settings dialog */ },
                                onHowToPlayClick = { /* Tutorial guide */ }
                            )
                        }

                        ScreenState.GAME -> {
                            // 1. Google Filament SurfaceView integration
                            AndroidView(
                                modifier = Modifier.fillMaxSize(),
                                factory = { context ->
                                    val surfaceView = SurfaceView(context)
                                    filamentRenderer = FilamentRenderer(context, surfaceView) { deltaTime ->
                                        // Main Game Loop Tick
                                        val input = unifiedInput.pollInput()

                                        if (input.realityShift) {
                                            realityManager.shiftReality()
                                        }

                                        // Player physics & collision
                                        playerController.update(
                                            deltaTime,
                                            input,
                                            fpsCamera.yaw,
                                            realityManager.currentReality,
                                            canJump = false
                                        )

                                        // Camera follow
                                        fpsCamera.addRotation(input.lookX, input.lookY)
                                        fpsCamera.update(
                                            deltaTime,
                                            playerController.position,
                                            playerController.eyeHeight,
                                            playerController.isSprinting,
                                            playerController.isMoving
                                        )

                                        // Look-at ray detection
                                        val target = lookAtInteraction.update(
                                            fpsCamera.position,
                                            fpsCamera.getForwardVector(),
                                            world.interactables,
                                            realityManager.currentReality
                                        )
                                        currentTarget = target

                                        if (input.interact) {
                                            lookAtInteraction.executeCurrentInteraction()
                                        }

                                        // Filament Camera update
                                        filamentRenderer?.updateCamera(fpsCamera)
                                    }
                                    surfaceView
                                }
                            )

                            // 2. Jetpack Compose Mobile HUD Overlay
                            MobileHud(
                                reality = currentReality,
                                currentInteractable = currentTarget,
                                objective = objectiveText,
                                unifiedInput = unifiedInput,
                                onPauseClick = { currentScreen = ScreenState.MAIN_MENU }
                            )
                        }

                        ScreenState.RESULTS -> {
                            // Results Screen
                            MainMenuScreen(
                                onPlayClick = {
                                    world.reset()
                                    realityManager.reset()
                                    playerController.setPosition(world.startCheckpoint)
                                    currentScreen = ScreenState.GAME
                                },
                                onSettingsClick = {},
                                onHowToPlayClick = {}
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        filamentRenderer?.destroy()
    }
}
