import * as THREE from 'three';
import { CollisionAABB, InteractableTarget, RealityId, Room02State } from '../types/game';
import { InteractionSystem } from '../core/InteractionSystem';
import { audioManager } from '../core/AudioManager';

/**
 * Scene builder and animator for
 * "PARADOX ROOM: Room 02 — The Invisible Bridge"
 */
export class Room02Scene {
  public scene: THREE.Scene;
  private interactionSystem: InteractionSystem;

  // Reality states & visual themes
  public activeReality: RealityId = 1;
  public roomState: Room02State;
  private onStateChange: (state: Room02State) => void;

  // Lighting references
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private pointLights: THREE.PointLight[] = [];

  // Reality 1 specific meshes (visible only in R1)
  private reality1Group = new THREE.Group();
  // Reality 2 specific meshes (visible only in R2)
  private reality2Group = new THREE.Group();

  // The Invisible Bridge meshes
  private bridgeSolidMesh!: THREE.Mesh;
  private bridgeGhostMesh!: THREE.Mesh;
  private bridgeCollisionBox!: CollisionAABB;
  private bridgeEmitters: THREE.Mesh[] = [];

  // Interactive objects
  private terminalScreenCanvas!: HTMLCanvasElement;
  private terminalScreenTexture!: THREE.CanvasTexture;
  private terminalLeverMesh!: THREE.Mesh;
  private realitySwitchMesh!: THREE.Mesh;
  private realitySwitchLight!: THREE.PointLight;
  private exitPortalMesh!: THREE.Mesh;
  private exitPortalIris!: THREE.Mesh;

  // Particle systems
  private r1DustParticles!: THREE.Points;
  private r2DustParticles!: THREE.Points;

  // Occluders for raycast line-of-sight checks
  private occluders: THREE.Object3D[] = [];
  private collisionBoxes: CollisionAABB[] = [];

  constructor(
    interactionSystem: InteractionSystem,
    onStateChange: (state: Room02State) => void
  ) {
    this.scene = new THREE.Scene();
    this.interactionSystem = interactionSystem;
    this.onStateChange = onStateChange;

    this.roomState = {
      activeReality: 1,
      terminalExamined: false,
      realityShiftUnlocked: true, // available from start of Room 02 as requested
      bridgeMatrixCalibrated: false,
      exitUnlocked: false,
      isCompleted: false,
      shiftCount: 0,
      interactionsCount: 0,
      startTime: Date.now(),
      completionTime: null,
      currentObjective: 'Investigate the Chamber Terminal & inspect the chasm.',
      activeDialog: null,
    };

    this.initScene();
  }

  private initScene() {
    // 1. Fog and Environment
    this.scene.background = new THREE.Color(0x020813);
    this.scene.fog = new THREE.FogExp2(0x020813, 0.028);

    // 2. Lighting setup
    this.ambientLight = new THREE.AmbientLight(0x0a192f, 1.2);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    this.dirLight.position.set(5, 12, 5);
    this.scene.add(this.dirLight);

    // Chamber ambient point lights
    const p1 = new THREE.PointLight(0x00f0ff, 2.0, 15);
    p1.position.set(0, 4.5, 9);
    this.scene.add(p1);
    this.pointLights.push(p1);

    const p2 = new THREE.PointLight(0x00f0ff, 2.0, 15);
    p2.position.set(0, 4.5, -9);
    this.scene.add(p2);
    this.pointLights.push(p2);

    this.scene.add(this.reality1Group);
    this.scene.add(this.reality2Group);
    this.reality2Group.visible = false;

    // 3. Build Architecture
    this.buildChamberArchitecture();

    // 4. Build The Invisible Bridge
    this.buildInvisibleBridge();

    // 5. Build Interactive Objects (Terminal, Clue, Switch, Exit)
    this.buildInteractiveObjects();

    // 6. Build Reality Dust Particles
    this.buildParticles();

    // Apply initial reality lighting & visibility
    this.applyRealityTheme(1);
  }

  private buildChamberArchitecture() {
    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.7,
      metalness: 0.3,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.8,
      metalness: 0.2,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
    });
    const trimCyanMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
    });

    // A. Start Platform (Z: 5 to 14, X: -4.5 to 4.5, Y: -0.2 to 0)
    const startFloorGeo = new THREE.BoxGeometry(9, 0.4, 9);
    const startFloor = new THREE.Mesh(startFloorGeo, floorMat);
    startFloor.position.set(0, -0.2, 9.5);
    this.scene.add(startFloor);
    this.occluders.push(startFloor);

    this.collisionBoxes.push({
      min: { x: -4.5, y: -0.4, z: 5.0 },
      max: { x: 4.5, y: 0.0, z: 14.0 },
      realityAffinity: 'both',
      name: 'Start Platform Floor',
    });

    // B. Exit Platform across the chasm (Z: -14 to -5, X: -4.5 to 4.5, Y: -0.2 to 0)
    const exitFloor = new THREE.Mesh(startFloorGeo, floorMat);
    exitFloor.position.set(0, -0.2, -9.5);
    this.scene.add(exitFloor);
    this.occluders.push(exitFloor);

    this.collisionBoxes.push({
      min: { x: -4.5, y: -0.4, z: -14.0 },
      max: { x: 4.5, y: 0.0, z: -5.0 },
      realityAffinity: 'both',
      name: 'Exit Platform Floor',
    });

    // C. Chamber Boundary Walls
    // Left Wall
    const sideWallGeo = new THREE.BoxGeometry(0.8, 6, 30);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-4.9, 2.8, 0);
    this.scene.add(leftWall);
    this.occluders.push(leftWall);
    this.collisionBoxes.push({
      min: { x: -5.3, y: -0.5, z: -15 },
      max: { x: -4.5, y: 5.8, z: 15 },
      realityAffinity: 'both',
      name: 'Left Wall',
    });

    // Right Wall
    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(4.9, 2.8, 0);
    this.scene.add(rightWall);
    this.occluders.push(rightWall);
    this.collisionBoxes.push({
      min: { x: 4.5, y: -0.5, z: -15 },
      max: { x: 5.3, y: 5.8, z: 15 },
      realityAffinity: 'both',
      name: 'Right Wall',
    });

    // Back Wall (Entrance bulkhead behind player at Z = 14)
    const backWallGeo = new THREE.BoxGeometry(9.8, 6, 0.8);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 2.8, 14.4);
    this.scene.add(backWall);
    this.occluders.push(backWall);
    this.collisionBoxes.push({
      min: { x: -4.9, y: -0.5, z: 14.0 },
      max: { x: 4.9, y: 5.8, z: 14.8 },
      realityAffinity: 'both',
      name: 'Back Wall',
    });

    // Far Wall (Exit end at Z = -14)
    const farWall = new THREE.Mesh(backWallGeo, wallMat);
    farWall.position.set(0, 2.8, -14.4);
    this.scene.add(farWall);
    this.occluders.push(farWall);
    this.collisionBoxes.push({
      min: { x: -4.9, y: -0.5, z: -14.8 },
      max: { x: 4.9, y: 5.8, z: -14.0 },
      realityAffinity: 'both',
      name: 'Far Wall',
    });

    // Ceiling
    const ceilingGeo = new THREE.BoxGeometry(10, 0.4, 30);
    const ceiling = new THREE.Mesh(ceilingGeo, trimMat);
    ceiling.position.set(0, 5.8, 0);
    this.scene.add(ceiling);

    // Decorative wall neon runner strips
    [-4.45, 4.45].forEach((xPos) => {
      const stripGeo = new THREE.BoxGeometry(0.1, 0.08, 28);
      const strip = new THREE.Mesh(stripGeo, trimCyanMat);
      strip.position.set(xPos, 2.5, 0);
      this.scene.add(strip);
    });

    // D. Chasm Hazards: Floor railings and hazard void area
    // The chasm spans Z: -5.0 to 5.0. If player walks off platforms into this area without bridge, they fall!
    this.collisionBoxes.push({
      min: { x: -4.5, y: -25, z: -5.0 },
      max: { x: 4.5, y: -0.05, z: 5.0 },
      realityAffinity: 'both',
      isHazard: true,
      name: 'Chasm Void Hazard',
    });

    // Chasm Visual Grid at deep bottom
    const gridHelper = new THREE.GridHelper(24, 24, 0x06b6d4, 0x0f2b38);
    gridHelper.position.set(0, -10, 0);
    this.scene.add(gridHelper);

    // Glowing chasm abyss fog light
    const chasmLight = new THREE.PointLight(0x0284c7, 3, 20);
    chasmLight.position.set(0, -6, 0);
    this.scene.add(chasmLight);

    // Side safety stanchions with gap for bridge entrance
    this.buildEdgeBarriers();
  }

  private buildEdgeBarriers() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Edge markers at start platform edge (Z = 5.0)
    // Left barrier: X = -4.5 to -1.3
    const leftBarrierGeo = new THREE.BoxGeometry(3.0, 0.6, 0.2);
    const startLeftBarrier = new THREE.Mesh(leftBarrierGeo, postMat);
    startLeftBarrier.position.set(-2.8, 0.3, 5.0);
    this.scene.add(startLeftBarrier);
    this.collisionBoxes.push({
      min: { x: -4.3, y: 0, z: 4.9 },
      max: { x: -1.3, y: 1.2, z: 5.1 },
      realityAffinity: 'both',
      name: 'Start Platform Left Barrier',
    });

    // Right barrier: X = 1.3 to 4.5
    const startRightBarrier = new THREE.Mesh(leftBarrierGeo, postMat);
    startRightBarrier.position.set(2.8, 0.3, 5.0);
    this.scene.add(startRightBarrier);
    this.collisionBoxes.push({
      min: { x: 1.3, y: 0, z: 4.9 },
      max: { x: 4.3, y: 1.2, z: 5.1 },
      realityAffinity: 'both',
      name: 'Start Platform Right Barrier',
    });

    // Far platform edge barriers at Z = -5.0
    const exitLeftBarrier = new THREE.Mesh(leftBarrierGeo, postMat);
    exitLeftBarrier.position.set(-2.8, 0.3, -5.0);
    this.scene.add(exitLeftBarrier);
    this.collisionBoxes.push({
      min: { x: -4.3, y: 0, z: -5.1 },
      max: { x: -1.3, y: 1.2, z: -4.9 },
      realityAffinity: 'both',
      name: 'Exit Platform Left Barrier',
    });

    const exitRightBarrier = new THREE.Mesh(leftBarrierGeo, postMat);
    exitRightBarrier.position.set(2.8, 0.3, -5.0);
    this.scene.add(exitRightBarrier);
    this.collisionBoxes.push({
      min: { x: 1.3, y: 0, z: -5.1 },
      max: { x: 4.3, y: 1.2, z: -4.9 },
      realityAffinity: 'both',
      name: 'Exit Platform Right Barrier',
    });

    // Bridge pylons / emitters on both sides of entrance
    [
      { x: -1.4, z: 5.0 }, { x: 1.4, z: 5.0 },
      { x: -1.4, z: -5.0 }, { x: 1.4, z: -5.0 }
    ].forEach((pos) => {
      const pylonGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8);
      const pylon = new THREE.Mesh(pylonGeo, postMat);
      pylon.position.set(pos.x, 0.6, pos.z);
      this.scene.add(pylon);

      const capGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const cap = new THREE.Mesh(capGeo, glowMat);
      cap.position.set(pos.x, 1.25, pos.z);
      this.scene.add(cap);
      this.bridgeEmitters.push(cap);
    });
  }

  private buildInvisibleBridge() {
    // The Invisible Bridge spans Z: 5.0 to -5.0 (length 10m, width 2.4m, thickness 0.25m)
    // Centered at X = 0, Y = -0.125, Z = 0
    const bridgeGeo = new THREE.BoxGeometry(2.4, 0.25, 10);

    // 1. Ghost / Translucent lattice mesh (faint outline when uncalibrated)
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.3,
    });
    this.bridgeGhostMesh = new THREE.Mesh(bridgeGeo, ghostMat);
    this.bridgeGhostMesh.position.set(0, -0.125, 0);
    this.scene.add(this.bridgeGhostMesh);

    // 2. Solidified crystalline bridge mesh (materializes upon puzzle calibration)
    const solidMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.4,
    });
    this.bridgeSolidMesh = new THREE.Mesh(bridgeGeo, solidMat);
    this.bridgeSolidMesh.position.set(0, -0.125, 0);
    this.bridgeSolidMesh.visible = false; // initially inactive
    this.scene.add(this.bridgeSolidMesh);

    // Bridge internal step runes
    for (let z = -4; z <= 4; z += 1.6) {
      const stepRuneGeo = new THREE.BoxGeometry(2.0, 0.02, 0.3);
      const stepRuneMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
      const rune = new THREE.Mesh(stepRuneGeo, stepRuneMat);
      rune.position.set(0, 0.01, z);
      this.bridgeSolidMesh.add(rune);
    }

    // Bridge collision box specification
    this.bridgeCollisionBox = {
      min: { x: -1.2, y: -0.4, z: -5.0 },
      max: { x: 1.2, y: 0.0, z: 5.0 },
      realityAffinity: 1, // Only solid in Reality 1 after calibration!
      name: 'Calibrated Invisible Bridge Pathway',
    };
  }

  private buildInteractiveObjects() {
    // ============================================
    // 1. Reality Terminal at start platform (X: -2.8, Z: 7.5)
    // ============================================
    const terminalGroup = new THREE.Group();
    terminalGroup.position.set(-2.8, 0, 7.5);
    terminalGroup.rotation.y = Math.PI * 0.35; // angled toward player spawn

    // Base pedestal
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });
    const pedGeo = new THREE.BoxGeometry(0.9, 1.1, 0.6);
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.position.y = 0.55;
    terminalGroup.add(pedMesh);

    // Screen housing
    const screenBoxGeo = new THREE.BoxGeometry(1.0, 0.7, 0.12);
    const screenBox = new THREE.Mesh(screenBoxGeo, pedMat);
    screenBox.position.set(0, 1.25, 0);
    screenBox.rotation.x = -Math.PI * 0.18; // tilted up
    terminalGroup.add(screenBox);

    // Interactive Dynamic Screen Texture
    this.terminalScreenCanvas = document.createElement('canvas');
    this.terminalScreenCanvas.width = 512;
    this.terminalScreenCanvas.height = 360;
    this.terminalScreenTexture = new THREE.CanvasTexture(this.terminalScreenCanvas);
    this.updateTerminalScreenGraphics();

    const screenSurfaceGeo = new THREE.PlaneGeometry(0.92, 0.62);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.terminalScreenTexture,
      toneMapped: false,
    });
    const screenMesh = new THREE.Mesh(screenSurfaceGeo, screenMat);
    screenMesh.position.set(0, 0, 0.065);
    screenBox.add(screenMesh);

    // Pedestal glow light
    const termLight = new THREE.PointLight(0x06b6d4, 1.5, 3.5);
    termLight.position.set(0, 1.3, 0.3);
    terminalGroup.add(termLight);

    this.scene.add(terminalGroup);
    this.occluders.push(pedMesh);

    // Register Terminal with Interaction System
    const terminalTarget: InteractableTarget = {
      id: 'reality_terminal',
      name: 'Reality Diagnostic Terminal',
      actionText: 'Access Reality Terminal',
      position: { x: -2.8, y: 1.2, z: 7.5 },
      distance: 0,
      realityAffinity: 'both',
      isEnabled: true,
      icon: 'terminal',
      description: 'Quantum diagnostics terminal regulating chamber reality phase states.',
      onInteract: () => this.handleInteractTerminal(),
    };
    this.interactionSystem.registerInteractable(terminalTarget, screenBox);

    // Collision for terminal pedestal
    this.collisionBoxes.push({
      min: { x: -3.3, y: 0, z: 7.0 },
      max: { x: -2.3, y: 1.8, z: 8.0 },
      realityAffinity: 'both',
      name: 'Reality Terminal Pedestal',
    });

    // ============================================
    // 2. Wall Log / Clue Slate (X: 3.9, Y: 1.6, Z: 9.0)
    // ============================================
    const slateGroup = new THREE.Group();
    slateGroup.position.set(4.4, 1.6, 9.0);
    slateGroup.rotation.y = -Math.PI * 0.5;

    const slateBackGeo = new THREE.BoxGeometry(0.8, 0.6, 0.06);
    const slateBack = new THREE.Mesh(slateBackGeo, pedMat);
    slateGroup.add(slateBack);

    const slateGlowGeo = new THREE.PlaneGeometry(0.72, 0.52);
    const slateGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const slateGlow = new THREE.Mesh(slateGlowGeo, slateGlowMat);
    slateGlow.position.z = 0.035;
    slateGroup.add(slateGlow);

    this.scene.add(slateGroup);

    const slateTarget: InteractableTarget = {
      id: 'chamber_log_02',
      name: 'Chamber Log 02: Quantum Divergence',
      actionText: 'Read Log Inscription',
      position: { x: 4.4, y: 1.6, z: 9.0 },
      distance: 0,
      realityAffinity: 'both',
      isEnabled: true,
      icon: 'examine',
      description: 'A research note etched into the reinforced composite wall.',
      onInteract: () => this.handleInteractLog(),
    };
    this.interactionSystem.registerInteractable(slateTarget, slateBack);

    // ============================================
    // 3. Reality-Dependent Puzzle Control (Reality 2 ONLY)
    // In Reality 2, an anomalous floating pillar materializes at (X: 2.8, Z: 6.2)
    // with a Quantum Phase Matrix Stabilizer!
    // ============================================
    const r2ConsoleGroup = new THREE.Group();
    r2ConsoleGroup.position.set(2.8, 0, 6.2);
    r2ConsoleGroup.rotation.y = -Math.PI * 0.3;

    // Anomalous crystalline pedestal
    const r2PedMat = new THREE.MeshStandardMaterial({
      color: 0x3b0764,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x581c87,
      emissiveIntensity: 0.4,
    });
    const r2Ped = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.1, 6), r2PedMat);
    r2Ped.position.y = 0.55;
    r2ConsoleGroup.add(r2Ped);

    // Glowing anomalous core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.realitySwitchMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24), coreMat);
    this.realitySwitchMesh.position.set(0, 1.25, 0);
    r2ConsoleGroup.add(this.realitySwitchMesh);

    // Mechanical Lever / Switch arm
    const leverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
    this.terminalLeverMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3), leverMat);
    this.terminalLeverMesh.position.set(0, 1.25, 0.15);
    this.terminalLeverMesh.rotation.x = Math.PI * 0.25;
    r2ConsoleGroup.add(this.terminalLeverMesh);

    // Local amber point light
    this.realitySwitchLight = new THREE.PointLight(0xf59e0b, 2.0, 4);
    this.realitySwitchLight.position.set(0, 1.4, 0);
    r2ConsoleGroup.add(this.realitySwitchLight);

    // Add to Reality 2 Group (so it only renders and interacts in Reality 2!)
    this.reality2Group.add(r2ConsoleGroup);

    // Register with Interaction System (realityAffinity: 2)
    const switchTarget: InteractableTarget = {
      id: 'reality_switch_bridge',
      name: 'Quantum Bridge Phase Stabilizer',
      actionText: 'Calibrate Bridge Matrix',
      position: { x: 2.8, y: 1.25, z: 6.2 },
      distance: 0,
      realityAffinity: 2, // strictly Reality 2!
      isEnabled: true,
      icon: 'switch',
      description: 'Stabilizes the harmonic frequency of the Invisible Bridge across dimensional axes.',
      onInteract: () => this.handleInteractSwitch(),
    };
    this.interactionSystem.registerInteractable(switchTarget, this.realitySwitchMesh);

    // Collision for R2 console
    this.collisionBoxes.push({
      min: { x: 2.3, y: 0, z: 5.7 },
      max: { x: 3.3, y: 1.6, z: 6.7 },
      realityAffinity: 2, // only collides in Reality 2!
      name: 'R2 Phase Stabilizer Console',
    });

    // In Reality 2, also add glowing floating crystal monoliths around the chasm
    this.buildR2Anomalies();

    // ============================================
    // 4. Exit Portal at Far Platform (X: 0, Z: -13.8)
    // ============================================
    const exitGroup = new THREE.Group();
    exitGroup.position.set(0, 1.6, -13.9);

    // Giant outer ring
    const ringGeo = new THREE.TorusGeometry(1.6, 0.22, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    this.exitPortalMesh = new THREE.Mesh(ringGeo, ringMat);
    exitGroup.add(this.exitPortalMesh);

    // Glowing Iris Door
    const irisGeo = new THREE.CircleGeometry(1.4, 32);
    const irisMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    this.exitPortalIris = new THREE.Mesh(irisGeo, irisMat);
    exitGroup.add(this.exitPortalIris);

    const exitLight = new THREE.PointLight(0x38bdf8, 2, 6);
    exitLight.position.set(0, 0, 0.5);
    exitGroup.add(exitLight);

    this.scene.add(exitGroup);

    const exitTarget: InteractableTarget = {
      id: 'chamber_exit',
      name: 'Chamber 02 Exit Airlock',
      actionText: 'Cycle Exit Airlock',
      position: { x: 0, y: 1.6, z: -13.5 },
      distance: 0,
      realityAffinity: 'both',
      isEnabled: true,
      icon: 'door',
      description: 'Hermetic decompression portal leading to Chamber 03.',
      onInteract: () => this.handleInteractExit(),
    };
    this.interactionSystem.registerInteractable(exitTarget, this.exitPortalMesh);
  }

  private buildR2Anomalies() {
    // Glowing anomalous monoliths suspended in the void in Reality 2
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xd946ef,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.4,
    });

    [
      { x: -3.5, y: -2, z: 0, s: 1.4 },
      { x: 3.5, y: -1.5, z: 2, s: 1.8 },
      { x: -2.8, y: -3, z: -3, s: 2.2 },
    ].forEach((pos) => {
      const geo = new THREE.OctahedronGeometry(pos.s);
      const mesh = new THREE.Mesh(geo, crystalMat);
      mesh.position.set(pos.x, pos.y, pos.z);
      this.reality2Group.add(mesh);
    });
  }

  private buildParticles() {
    // 1. Reality 1 Quantum Motes (Cyan)
    const r1Geo = new THREE.BufferGeometry();
    const count1 = 200;
    const pos1 = new Float32Array(count1 * 3);
    for (let i = 0; i < count1 * 3; i += 3) {
      pos1[i] = (Math.random() - 0.5) * 12;
      pos1[i + 1] = Math.random() * 5;
      pos1[i + 2] = (Math.random() - 0.5) * 26;
    }
    r1Geo.setAttribute('position', new THREE.BufferAttribute(pos1, 3));
    const r1Mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0.6,
    });
    this.r1DustParticles = new THREE.Points(r1Geo, r1Mat);
    this.reality1Group.add(this.r1DustParticles);

    // 2. Reality 2 Temporal Motes (Amber / Magenta)
    const r2Geo = new THREE.BufferGeometry();
    const count2 = 300;
    const pos2 = new Float32Array(count2 * 3);
    for (let i = 0; i < count2 * 3; i += 3) {
      pos2[i] = (Math.random() - 0.5) * 12;
      pos2[i + 1] = Math.random() * 5;
      pos2[i + 2] = (Math.random() - 0.5) * 26;
    }
    r2Geo.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    const r2Mat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
    });
    this.r2DustParticles = new THREE.Points(r2Geo, r2Mat);
    this.reality2Group.add(this.r2DustParticles);
  }

  // ============================================
  // Gameplay Logic Handlers
  // ============================================

  public toggleReality(): boolean {
    const nextReality: RealityId = this.activeReality === 1 ? 2 : 1;
    this.activeReality = nextReality;
    this.roomState.activeReality = nextReality;
    this.roomState.shiftCount += 1;

    audioManager.playRealityShift(nextReality);
    this.applyRealityTheme(nextReality);

    // Update objective prompt dynamically
    if (!this.roomState.bridgeMatrixCalibrated) {
      if (nextReality === 2) {
        this.roomState.currentObjective = 'In Reality 02: Locate & calibrate the Quantum Phase Stabilizer.';
      } else {
        this.roomState.currentObjective = 'Shift to Reality 02 [Q / Tap Shift] to reveal hidden temporal controls.';
      }
    } else {
      if (nextReality === 1) {
        this.roomState.currentObjective = 'The bridge is materialized! Cross the Invisible Bridge to the exit.';
      } else {
        this.roomState.currentObjective = 'Return to Reality 01 [Q / Tap Shift] to solidify the energy bridge!';
      }
    }

    this.onStateChange({ ...this.roomState });
    return true;
  }

  private applyRealityTheme(reality: RealityId) {
    if (reality === 1) {
      this.scene.background = new THREE.Color(0x020813);
      this.scene.fog = new THREE.FogExp2(0x020813, 0.028);
      this.ambientLight.color.setHex(0x0a192f);
      this.dirLight.color.setHex(0x38bdf8);
      this.pointLights[0].color.setHex(0x00f0ff);
      this.pointLights[1].color.setHex(0x00f0ff);

      this.reality1Group.visible = true;
      this.reality2Group.visible = false;

      // In Reality 1: Bridge is solid if calibrated!
      if (this.roomState.bridgeMatrixCalibrated) {
        this.bridgeSolidMesh.visible = true;
        this.bridgeGhostMesh.visible = false;
      } else {
        this.bridgeSolidMesh.visible = false;
        this.bridgeGhostMesh.visible = true;
      }
    } else {
      // Reality 2: Golden / Magenta anomalous atmosphere
      this.scene.background = new THREE.Color(0x130718);
      this.scene.fog = new THREE.FogExp2(0x130718, 0.025);
      this.ambientLight.color.setHex(0x2e1065);
      this.dirLight.color.setHex(0xf59e0b);
      this.pointLights[0].color.setHex(0xd946ef);
      this.pointLights[1].color.setHex(0xf59e0b);

      this.reality1Group.visible = false;
      this.reality2Group.visible = true;

      // In Reality 2, the bridge is out of phase
      this.bridgeSolidMesh.visible = false;
      this.bridgeGhostMesh.visible = true;
    }
  }

  private handleInteractTerminal() {
    audioManager.playTerminalBeep();
    this.roomState.terminalExamined = true;
    this.roomState.interactionsCount += 1;

    this.roomState.activeDialog = {
      title: 'QUANTUM TERMINAL 02 — PHASE DIAGNOSTIC',
      text: 'Bridge matrix phase is desynchronized. The crossing walkway cannot condense into baryonic matter in Reality 01 without external quantum calibration.',
      hint: 'Shift to Reality 02 [Q on PC or Tap Reality Shift on Mobile] to locate the temporal phase stabilizer!',
    };

    if (!this.roomState.bridgeMatrixCalibrated) {
      this.roomState.currentObjective = 'Shift to Reality 02 [Q / Tap Shift] to access the temporal stabilizer.';
    }

    this.updateTerminalScreenGraphics();
    this.onStateChange({ ...this.roomState });
  }

  private handleInteractLog() {
    audioManager.playInteract();
    this.roomState.interactionsCount += 1;

    this.roomState.activeDialog = {
      title: 'RESEARCH LOG #084 — INVISIBLE BRIDGE',
      text: '"The bridge emitter operates simultaneously across two dimensional planes. If you look into the abyss in Reality 1, you see only void. Shift your perspective into Reality 2 to locate the stabilizer relay."',
      hint: 'Remember: The bridge only solidifies as a physical path in Reality 01 after calibration!',
    };

    this.onStateChange({ ...this.roomState });
  }

  private handleInteractSwitch() {
    audioManager.playSwitchToggle();
    this.roomState.interactionsCount += 1;

    if (!this.roomState.bridgeMatrixCalibrated) {
      this.roomState.bridgeMatrixCalibrated = true;
      audioManager.playBridgeAlign();

      // Animate lever and switch color to luminous emerald / cyan
      this.terminalLeverMesh.rotation.x = -Math.PI * 0.25;
      (this.realitySwitchMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
      this.realitySwitchLight.color.setHex(0x10b981);

      // Light up bridge emitters
      this.bridgeEmitters.forEach(cap => {
        (cap.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
      });

      // Add bridge to active collision boxes!
      this.collisionBoxes.push(this.bridgeCollisionBox);

      this.roomState.activeDialog = {
        title: 'BRIDGE MATRIX SYNCHRONIZED',
        text: 'Quantum phase harmonic locked! The Invisible Bridge has materialized across the chasm.',
        hint: 'Return to Reality 01 [Q / Tap Shift] to cross the solidified bridge to the exit!',
      };

      this.roomState.currentObjective = 'Return to Reality 01 [Q / Tap Shift] and cross the Invisible Bridge!';
    } else {
      this.roomState.activeDialog = {
        title: 'BRIDGE MATRIX STATUS',
        text: 'Bridge matrix calibration is already optimal. Harmonic lock maintained.',
        hint: 'Return to Reality 01 to walk across the bridge.',
      };
    }

    this.updateTerminalScreenGraphics();
    this.onStateChange({ ...this.roomState });
  }

  private handleInteractExit() {
    this.roomState.interactionsCount += 1;

    if (!this.roomState.bridgeMatrixCalibrated) {
      audioManager.playInteract();
      this.roomState.activeDialog = {
        title: 'ACCESS RESTRICTED',
        text: 'Airlock security interlock engaged. Chamber 02 puzzle protocol incomplete.',
        hint: 'Calibrate the Invisible Bridge and reach the terminal platform.',
      };
      this.onStateChange({ ...this.roomState });
      return;
    }

    // Victory!
    audioManager.playVictory();
    this.roomState.exitUnlocked = true;
    this.roomState.isCompleted = true;
    this.roomState.completionTime = Math.round((Date.now() - this.roomState.startTime) / 1000);
    this.roomState.currentObjective = 'Chamber 02 Cleared! Step through the airlock to proceed.';

    // Animate exit iris
    (this.exitPortalIris.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
    this.exitPortalIris.scale.set(0.1, 0.1, 0.1); // opens doorway

    this.onStateChange({ ...this.roomState });
  }

  public dismissDialog() {
    this.roomState.activeDialog = null;
    this.onStateChange({ ...this.roomState });
  }

  private updateTerminalScreenGraphics() {
    const ctx = this.terminalScreenCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#03101e';
    ctx.fillRect(0, 0, 512, 360);

    // Header bar
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, 512, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PARADOX ROOM // TERMINAL 02', 20, 32);

    // Status lines
    ctx.font = '16px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CHAMBER: 02 - THE INVISIBLE BRIDGE', 24, 90);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ACTIVE REALITY:', 24, 130);
    ctx.fillStyle = this.activeReality === 1 ? '#38bdf8' : '#f59e0b';
    ctx.fillText(this.activeReality === 1 ? 'REALITY 01 [STANDARD]' : 'REALITY 02 [ANOMALOUS]', 180, 130);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('BRIDGE STATUS:', 24, 170);
    ctx.fillStyle = this.roomState.bridgeMatrixCalibrated ? '#10b981' : '#ef4444';
    ctx.fillText(this.roomState.bridgeMatrixCalibrated ? 'CALIBRATED & CONDENSED' : 'PHASE MISALIGNED (UNSTABLE)', 180, 170);

    // Graphic visualization of the bridge
    ctx.strokeStyle = this.roomState.bridgeMatrixCalibrated ? '#10b981' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 220, 392, 40);

    if (this.roomState.bridgeMatrixCalibrated) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.fillRect(60, 220, 392, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('[ HARMONIC LOCK ACTIVE ]', 140, 246);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('[ QUANTUM VOID GAP // DESYNC ]', 110, 246);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '13px monospace';
    ctx.fillText('ACTION: PRESS Q / TAP SHIFT TO TOGGLE REALITY', 24, 320);

    this.terminalScreenTexture.needsUpdate = true;
  }

  // ============================================
  // Animation / Render loop update
  // ============================================

  public update(deltaTime: number, elapsedTime: number) {
    // 1. Gently animate dust motes
    if (this.r1DustParticles && this.reality1Group.visible) {
      this.r1DustParticles.rotation.y = elapsedTime * 0.03;
    }
    if (this.r2DustParticles && this.reality2Group.visible) {
      this.r2DustParticles.rotation.y = -elapsedTime * 0.05;
      this.r2DustParticles.rotation.x = Math.sin(elapsedTime * 0.2) * 0.05;
    }

    // 2. Animate ghost bridge flickering when not yet calibrated
    if (this.bridgeGhostMesh && this.bridgeGhostMesh.visible) {
      const flicker = 0.2 + Math.sin(elapsedTime * 8) * 0.08 + Math.cos(elapsedTime * 15) * 0.04;
      (this.bridgeGhostMesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0.1, flicker);
    }

    // 3. Animate Reality 2 switch pulse and floating anomalies
    if (this.realitySwitchMesh && this.reality2Group.visible) {
      this.realitySwitchMesh.rotation.y = elapsedTime * 1.5;
      this.realitySwitchMesh.rotation.x = elapsedTime * 0.8;
      const pulse = 1.6 + Math.sin(elapsedTime * 4) * 0.6;
      this.realitySwitchLight.intensity = pulse;
    }

    // 4. Animate exit portal outer ring slow rotation
    if (this.exitPortalMesh) {
      this.exitPortalMesh.rotation.z = elapsedTime * 0.4;
    }
  }

  public getCollisionBoxes(): CollisionAABB[] {
    return this.collisionBoxes;
  }

  public getOccluders(): THREE.Object3D[] {
    return this.occluders;
  }

  public restartRoom() {
    this.roomState = {
      activeReality: 1,
      terminalExamined: false,
      realityShiftUnlocked: true,
      bridgeMatrixCalibrated: false,
      exitUnlocked: false,
      isCompleted: false,
      shiftCount: 0,
      interactionsCount: 0,
      startTime: Date.now(),
      completionTime: null,
      currentObjective: 'Investigate the Chamber Terminal & inspect the chasm.',
      activeDialog: null,
    };
    this.activeReality = 1;

    // Reset switch
    (this.realitySwitchMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b);
    this.realitySwitchLight.color.setHex(0xf59e0b);
    this.terminalLeverMesh.rotation.x = Math.PI * 0.25;

    // Reset emitters
    this.bridgeEmitters.forEach(cap => {
      (cap.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
    });

    // Remove bridge collision if present
    this.collisionBoxes = this.collisionBoxes.filter(box => box.name !== 'Calibrated Invisible Bridge Pathway');

    // Reset exit door
    (this.exitPortalIris.material as THREE.MeshBasicMaterial).color.setHex(0x0369a1);
    this.exitPortalIris.scale.set(1, 1, 1);

    this.applyRealityTheme(1);
    this.updateTerminalScreenGraphics();
    this.onStateChange({ ...this.roomState });
  }
}
