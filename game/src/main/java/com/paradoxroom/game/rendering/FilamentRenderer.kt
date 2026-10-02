package com.paradoxroom.game.rendering

import android.content.Context
import android.view.Choreographer
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.google.android.filament.Camera
import com.google.android.filament.Engine
import com.google.android.filament.EntityManager
import com.google.android.filament.Filament
import com.google.android.filament.LightManager
import com.google.android.filament.Renderer
import com.google.android.filament.Scene
import com.google.android.filament.Skybox
import com.google.android.filament.SwapChain
import com.google.android.filament.ToneMapping
import com.google.android.filament.View
import com.google.android.filament.Viewport
import com.paradoxroom.game.camera.FirstPersonCamera
import com.paradoxroom.game.core.RealityLayer
import com.paradoxroom.game.core.Vector3
import kotlin.math.cos
import kotlin.math.sin

/**
 * Google Filament 3D Renderer Integration
 * Handles Engine, Renderer, Scene, View, Camera, SurfaceView lifecycle,
 * and high-performance frame rendering via Android Choreographer.
 */
class FilamentRenderer(
    private val context: Context,
    private val surfaceView: SurfaceView,
    private val onFrameTick: (deltaTime: Float) -> Unit
) : SurfaceHolder.Callback, Choreographer.FrameCallback {

    private val engine: Engine
    private val renderer: Renderer
    private val scene: Scene
    private val view: View
    private val camera: Camera
    private val cameraEntity: Int

    private var swapChain: SwapChain? = null
    private val choreographer = Choreographer.getInstance()

    private var lastFrameTimeNanos: Long = 0L
    private var isRendering = false

    // Lighting Entities
    private var sunEntity: Int = 0
    private var ambientLightEntity: Int = 0

    init {
        // 1. Initialize Filament native libraries
        Filament.init()

        // 2. Create core Filament pipeline
        engine = Engine.create()
        renderer = engine.createRenderer()
        scene = engine.createScene()
        view = engine.createView()

        cameraEntity = EntityManager.get().create()
        camera = engine.createCamera(cameraEntity)

        view.camera = camera
        view.scene = scene

        // Tone Mapping & Color Grading
        val colorGrading = com.google.android.filament.ColorGrading.Builder()
            .toneMapping(ToneMapping.ACES)
            .build(engine)
        view.colorGrading = colorGrading

        setupLighting()
        setupSkybox(RealityLayer.REALITY_01)

        surfaceView.holder.addCallback(this)
    }

    private fun setupLighting() {
        // Directional Sun Light
        sunEntity = EntityManager.get().create()
        LightManager.Builder(LightManager.Type.DIRECTIONAL)
            .color(0.25f, 0.75f, 1.0f) // Cyan key light
            .intensity(110000.0f)
            .direction(0.5f, -1.0f, -0.5f)
            .castShadows(true)
            .build(engine, sunEntity)
        scene.addEntity(sunEntity)
    }

    fun setupSkybox(reality: RealityLayer) {
        val skyColor = if (reality == RealityLayer.REALITY_01) {
            floatArrayOf(0.01f, 0.04f, 0.08f, 1.0f) // Deep Navy/Cyan
        } else {
            floatArrayOf(0.08f, 0.02f, 0.09f, 1.0f) // Obsidian/Magenta
        }

        val skybox = Skybox.Builder()
            .color(skyColor[0], skyColor[1], skyColor[2], skyColor[3])
            .build(engine)
        scene.skybox = skybox
    }

    fun updateCamera(fpsCam: FirstPersonCamera) {
        val eye = fpsCam.position
        val fwd = fpsCam.getForwardVector()
        val target = Vector3(eye.x + fwd.x, eye.y + fwd.y, eye.z + fwd.z)

        camera.lookAt(
            eye.x.toDouble(), eye.y.toDouble(), eye.z.toDouble(),
            target.x.toDouble(), target.y.toDouble(), target.z.toDouble(),
            0.0, 1.0, 0.0
        )
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        swapChain = engine.createSwapChain(holder.surface)
        isRendering = true
        lastFrameTimeNanos = System.nanoTime()
        choreographer.postFrameCallback(this)
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        view.viewport = Viewport(0, 0, width, height)
        val aspect = width.toDouble() / height.toDouble()
        camera.setProjection(75.0, aspect, 0.1, 100.0, Camera.Fov.VERTICAL)
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        isRendering = false
        choreographer.removeFrameCallback(this)
        swapChain?.let {
            engine.destroySwapChain(it)
            swapChain = null
        }
    }

    override fun doFrame(frameTimeNanos: Long) {
        if (!isRendering) return

        if (lastFrameTimeNanos == 0L) {
            lastFrameTimeNanos = frameTimeNanos
        }
        val deltaTimeSec = ((frameTimeNanos - lastFrameTimeNanos) / 1_000_000_000.0f).coerceIn(0.001f, 0.1f)
        lastFrameTimeNanos = frameTimeNanos

        // Game update tick
        onFrameTick.invoke(deltaTimeSec)

        // Filament Render Frame
        swapChain?.let { sc ->
            if (renderer.beginFrame(sc, frameTimeNanos)) {
                renderer.render(view)
                renderer.endFrame()
            }
        }

        choreographer.postFrameCallback(this)
    }

    fun destroy() {
        isRendering = false
        choreographer.removeFrameCallback(this)

        swapChain?.let { engine.destroySwapChain(it) }
        engine.destroyEntity(cameraEntity)
        engine.destroyEntity(sunEntity)
        engine.destroyView(view)
        engine.destroyScene(scene)
        engine.destroyRenderer(renderer)
        engine.destroy()
    }
}
