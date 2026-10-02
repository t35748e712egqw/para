import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';

interface GameCanvasProps {
  engine: GameEngine;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // 1. Initialize Three.js WebGLRenderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // 2. Initialize Game Engine with canvas
    engine.init(container, canvas);

    // 3. Handle WebGL context lost & restored
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL Context Lost. Suspending render loop.');
    };
    const handleContextRestored = () => {
      console.info('WebGL Context Restored. Rebuilding scene.');
      if (rendererRef.current && containerRef.current) {
        rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // 4. Resize listener
    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      renderer.setSize(width, height);
      engine.cameraController.camera.aspect = width / height;
      engine.cameraController.camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // 5. Main Render Loop
    let animationFrameId: number;

    const renderLoop = () => {
      // Update engine (physics, inputs, camera, audio, scene)
      engine.update();

      // Render Three.js scene
      if (engine.sceneManager) {
        renderer.render(engine.sceneManager.scene, engine.cameraController.camera);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      renderer.dispose();
    };
  }, [engine]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-black">
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />
    </div>
  );
};
