import * as THREE from 'three';
import {
  GameState,
  PlayerStatus,
  RealityId,
  GameSettings,
  Room02Data,
  InteractableObject,
  PlayerSnapshot,
} from '../types/game';
import { InputManager } from './InputManager';
import { CameraController } from './CameraController';
import { PlayerController } from './PlayerController';
import { InteractionSystem } from './InteractionSystem';
import { audioManager } from './AudioManager';
import { Room02Scene } from '../world/Room02Scene';

const SETTINGS_STORAGE_KEY = 'paradox_room_settings_v1';
const SAVE_STORAGE_KEY = 'paradox_room_save_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  touchSensitivity: 1.0,
  invertY: false,
  headBobbing: true,
  vibration: true,
  fov: 75,
  soundEnabled: true,
  volume: 0.7,
};

/**
 * PARADOX ROOM — Central Game Engine
 * Coordinates the 15 Event Groups:
 * 01: Game Initialization
 * 02: Input
 * 03: Player Controller
 * 04: Camera
 * 05: Interaction Detection
 * 06: Reality Shift
 * 07: Reality Object Visibility
 * 08: Puzzle Logic
 * 09: Bridge Logic
 * 10: Checkpoint / Fall
 * 11: Exit Logic
 * 12: Win Sequence
 * 13: Pause
 * 14: Audio
 * 15: UI & Contextual Guidance
 */
export class GameEngine {
  // Subsystems
  public inputManager: InputManager;
  public cameraController: CameraController;
  public playerController: PlayerController;
  public interactionSystem: InteractionSystem;
  public sceneManager: Room02Scene | null = null;

  // Settings
  public settings: GameSettings = { ...DEFAULT_SETTINGS };

  // Core Game State
  public gameState: GameState = GameState.Loading;
  public reality: RealityId = 1;
  public realityShiftLocked: boolean = false;
  public playerStatus: PlayerStatus = PlayerStatus.Normal;

  // Puzzle State
  public bridgeActive: boolean = false;
  public exitUnlocked: boolean = false;
  public terminalDiscovered: boolean = false;
  public firstShiftDone: boolean = false;

  // Checkpoint (Starting safe position)
  public checkpoint = { x: 0, y: 1.65, z: 11 };

  // Stats & Timers
  public shiftCount: number = 0;
  public fallsCount: number = 0;
  public startTime: number = Date.now();
  public completionTime: number | null = null;

  // UI & Guidance
  public currentObjective: string = 'Find a way across the gap.';
  public tutorialMessage: string | null = 'Something is wrong here.';
  public tutorialSubMessage: string | null = 'Explore the chamber.';
  public transitionProgress: number = 0; // 0 to 1 during shift screen effect
  public activeDialog: { title: string; text: string; hint?: string } | null = null;
  public currentInteractable: InteractableObject | null = null;

  // Observers
  private stateChangeListeners: Array<(data: Room02Data) => void> = [];

  // Clock
  private clock = new THREE.Clock();
  private isDestroyed = false;

  constructor() {
    this.loadSettings();

    this.inputManager = new InputManager(this.settings);
    this.cameraController = new CameraController(this.settings.fov, this.settings);
    this.playerController = new PlayerController(this.settings);
    this.interactionSystem = new InteractionSystem(2.8);

    this.playerController.onHazardReset(() => {
      this.handlePlayerFall();
    });
  }

  // ============================================
  // EVENT GROUP 01 — Game Initialization
  // ============================================
  public init(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.sceneManager = new Room02Scene(this.interactionSystem, () => {
      // sync internal scene notifications if needed
    });

    this.inputManager.attachToElement(canvas);
    this.playerController.setCollisionBoxes(this.sceneManager.getCollisionBoxes());
    this.playerController.setPosition(this.checkpoint.x, this.checkpoint.y, this.checkpoint.z);
    this.playerController.setCheckpoint(
      new THREE.Vector3(this.checkpoint.x, this.checkpoint.y, this.checkpoint.z)
    );
    this.cameraController.setRotation(0, 0);

    // Register interactables directly with prioritised registry
    this.registerRoomInteractables();

    audioManager.init();
    audioManager.setVolume(this.settings.volume);
    audioManager.setMuted(!this.settings.soundEnabled);

    // Initial objective and state
    this.gameState = GameState.Playing;
    this.playerStatus = PlayerStatus.Normal;
    this.reality = 1;
    this.bridgeActive = false;
    this.exitUnlocked = false;
    this.realityShiftLocked = false;
    this.startTime = Date.now();

    this.updateSceneRealityObjects();
    this.broadcastState();

    // Auto-clear initial hint after 6 seconds if player hasn't seen terminal
    setTimeout(() => {
      if (this.tutorialMessage === 'Something is wrong with this room.') {
        this.tutorialMessage = null;
        this.tutorialSubMessage = null;
        this.broadcastState();
      }
    }, 6000);
  }

  public subscribe(listener: (data: Room02Data) => void) {
    this.stateChangeListeners.push(listener);
    listener(this.getStateSnapshot());
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  public getStateSnapshot(): Room02Data {
    return {
      gameState: this.gameState,
      reality: this.reality,
      realityShiftLocked: this.realityShiftLocked,
      bridgeActive: this.bridgeActive,
      exitUnlocked: this.exitUnlocked,
      playerStatus: this.playerStatus,
      currentInteractable: this.currentInteractable,
      shiftCount: this.shiftCount,
      fallsCount: this.fallsCount,
      startTime: this.startTime,
      completionTime: this.completionTime,
      tutorialBanner: this.tutorialMessage
        ? { text: this.tutorialMessage, subText: this.tutorialSubMessage || undefined, visible: true }
        : null,
      activeDialog: this.activeDialog,
    };
  }

  private broadcastState() {
    const snap = this.getStateSnapshot();
    this.stateChangeListeners.forEach(fn => fn(snap));
  }

  // ============================================
  // EVENT GROUP 02 — Input Processing
  // ============================================
  public update() {
    if (this.isDestroyed) return;
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // Poll unified input
    const input = this.inputManager.consumeInput();

    // Handle Pause Toggle
    if (input.pause) {
      this.togglePause();
      return;
    }

    // Guard: Only process gameplay when Playing
    if (this.gameState !== GameState.Playing) {
      if (this.sceneManager) {
        this.sceneManager.update(deltaTime, elapsedTime);
      }
      return;
    }

    // ============================================
    // EVENT GROUP 06 — Reality Shift
    // ============================================
    if (input.realityShift && !this.realityShiftLocked && this.playerStatus === PlayerStatus.Normal) {
      this.triggerRealityShift();
    }

    // ============================================
    // EVENT GROUP 04 — Camera Look Update
    // ============================================
    if (this.playerStatus !== PlayerStatus.Completed && this.playerStatus !== PlayerStatus.Transitioning) {
      this.cameraController.addLookDelta(input.look.x, input.look.y);
    }

    // ============================================
    // EVENT GROUP 03 — Player Controller Physics
    // ============================================
    if (this.playerStatus === PlayerStatus.Normal) {
      this.playerController.update(
        deltaTime,
        input,
        this.cameraController.getYaw(),
        this.reality
      );
    }

    // Update Camera position & head bob
    this.cameraController.update(
      deltaTime,
      this.playerController.position,
      this.playerController.isMoving,
      this.playerController.isSprinting,
      this.playerController.speedRatio
    );

    // ============================================
    // EVENT GROUP 05 — Interaction Detection
    // ============================================
    if (this.playerStatus === PlayerStatus.Normal) {
      this.evaluateLookAtInteraction();

      if (input.interact && this.currentInteractable) {
        this.executeInteraction(this.currentInteractable);
      }
    }

    // ============================================
    // EVENT GROUP 16 & Scene Animation
    // ============================================
    if (this.sceneManager) {
      this.sceneManager.update(deltaTime, elapsedTime);
    }
  }

  // ============================================
  // EVENT GROUP 05 & 07 — Interaction Registration & Priority
  // ============================================
  private registerRoomInteractables() {
    // 1. Reality Terminal (Start Area)
    const terminalObj: InteractableObject = {
      id: 'reality_terminal',
      name: 'Reality Terminal',
      isInteractable: true,
      interactionType: 'RealityTerminal',
      interactionRange: 3.2,
      interactionText: 'Use Reality Terminal',
      priority: 4, // Priority 4
      visibleReality: 0, // Visible in both
      position: { x: -2.8, y: 1.2, z: 7.5 },
      description: 'Quantum diagnostics terminal regulating chamber reality phase states.',
      execute: () => this.handleTerminalInteraction(),
    };

    // 2. Reality Button / Phase Stabilizer (Reality 2 only)
    const buttonObj: InteractableObject = {
      id: 'reality_button',
      name: 'Bridge System Button',
      isInteractable: true,
      interactionType: 'BridgeButton',
      interactionRange: 3.0,
      interactionText: 'Activate Bridge System',
      priority: 1, // Priority 1 (Puzzle mechanism)
      visibleReality: 2, // Visible ONLY in Reality 2!
      position: { x: 2.8, y: 1.25, z: 6.2 },
      description: 'Temporal bridge matrix synchronization console.',
      execute: () => this.handleBridgeButtonInteraction(),
    };

    // 3. Exit Door (Far Area across the gap)
    const exitObj: InteractableObject = {
      id: 'exit_door',
      name: 'Chamber Exit Door',
      isInteractable: true,
      interactionType: 'ExitDoor',
      interactionRange: 3.5,
      interactionText: 'Enter Exit',
      priority: 2, // Priority 2 (Door)
      visibleReality: 0, // Visible in both
      position: { x: 0, y: 1.6, z: -13.5 },
      description: 'Pressurized airlock portal leading out of Chamber 02.',
      execute: () => this.handleExitDoorInteraction(),
    };

    // 4. Clue Panel 1: Start Wall
    const clueObj1: InteractableObject = {
      id: 'clue_panel_start',
      name: 'Research Slate',
      isInteractable: true,
      interactionType: 'CluePanel',
      interactionRange: 3.0,
      interactionText: 'Examine Clue',
      priority: 5, // Priority 5
      visibleReality: 1, // Reality 1
      position: { x: 4.4, y: 1.6, z: 9.0 },
      clueText: 'WHAT YOU CANNOT SEE MAY STILL EXIST.',
      execute: () => {
        audioManager.playTerminalSound();
        this.activeDialog = {
          title: 'CHAMBER INSCRIPTION 01',
          text: '"WHAT YOU CANNOT SEE MAY STILL EXIST."',
          hint: 'The chasm bridge has no solid footing in this phase state. Shift perspectives to seek what lies hidden.',
        };
        this.broadcastState();
      },
    };

    // 5. Clue Panel 2: Reality 2 Pillar
    const clueObj2: InteractableObject = {
      id: 'clue_panel_r2',
      name: 'Anomalous Inscription',
      isInteractable: true,
      interactionType: 'CluePanel',
      interactionRange: 3.0,
      interactionText: 'Read Anomaly Inscription',
      priority: 5,
      visibleReality: 2, // Reality 2
      position: { x: 3.8, y: 1.6, z: 5.5 },
      clueText: 'THE PATH EXISTS BETWEEN STATES.',
      execute: () => {
        audioManager.playTerminalSound();
        this.activeDialog = {
          title: 'TEMPORAL LOG #099',
          text: '"THE PATH EXISTS BETWEEN STATES."',
          hint: 'Activate the mechanism here in Reality 02, then return to Reality 01 to cross.',
        };
        this.broadcastState();
      },
    };

    // Store in internal list
    this.interactablesList = [buttonObj, exitObj, terminalObj, clueObj1, clueObj2];
  }

  private interactablesList: InteractableObject[] = [];

  private evaluateLookAtInteraction() {
    const cam = this.cameraController.camera;
    const forward = this.cameraController.getForwardVector();
    const eyePos = cam.position;

    let bestTarget: InteractableObject | null = null;
    let highestPriority = 999;
    let closestDistance = 999;

    for (const obj of this.interactablesList) {
      if (!obj.isInteractable) continue;

      // Filter by visible reality (0 = both, 1 = R1 only, 2 = R2 only)
      if (obj.visibleReality !== 0 && obj.visibleReality !== this.reality) {
        continue;
      }

      // Distance check
      const dx = obj.position.x - eyePos.x;
      const dy = obj.position.y - eyePos.y;
      const dz = obj.position.z - eyePos.z;
      const dist = Math.hypot(dx, dy, dz);

      if (dist > obj.interactionRange) continue;

      // Forward dot product check (player looking within cone ~35 deg)
      const toObj = new THREE.Vector3(dx, dy, dz).normalize();
      const dot = forward.dot(toObj);
      if (dot < 0.82) continue;

      // Prioritize: lower priority number = higher importance (1: mechanism, 2: door, etc.)
      if (obj.priority < highestPriority || (obj.priority === highestPriority && dist < closestDistance)) {
        highestPriority = obj.priority;
        closestDistance = dist;
        bestTarget = obj;
      }
    }

    if (this.currentInteractable !== bestTarget) {
      this.currentInteractable = bestTarget;
      this.broadcastState();
    }
  }

  private executeInteraction(obj: InteractableObject) {
    if (this.playerStatus !== PlayerStatus.Normal) return;
    obj.execute();
  }

  // ============================================
  // EVENT GROUP 11 — Tutorial & Terminal Logic
  // ============================================
  private handleTerminalInteraction() {
    audioManager.playTerminalSound();
    this.terminalDiscovered = true;

    // Environmental contextual guidance
    this.tutorialMessage = 'Reality appears unstable.';
    this.tutorialSubMessage = 'Try shifting reality.';

    this.activeDialog = {
      title: 'REALITY TERMINAL',
      text: 'Bridge matrix phase is desynchronized across dimensions. The crossing pathway cannot solidify in Reality 01 until external stabilization is triggered in Reality 02.',
      hint: 'Tap the REALITY SHIFT button to seek the bridge stabilizer in Reality 02.',
    };

    this.broadcastState();
  }

  // ============================================
  // EVENT GROUP 08 — Puzzle & Bridge Logic
  // ============================================
  private handleBridgeButtonInteraction() {
    if (this.reality !== 2) return;

    if (!this.bridgeActive) {
      this.bridgeActive = true;
      this.exitUnlocked = true;

      // Audio & Haptic feedback
      audioManager.playButtonSound();
      audioManager.playMachineSound();
      if (typeof navigator !== 'undefined' && navigator.vibrate && this.settings.vibration) {
        try { navigator.vibrate(50); } catch {}
      }

      // Update objective
      this.currentObjective = 'Reach the exit.';
      this.tutorialMessage = 'BRIDGE SYSTEM ONLINE';
      this.tutorialSubMessage = 'Return to Reality 01 to cross the solidified bridge.';

      // Update 3D scene visual feedback
      if (this.sceneManager) {
        this.sceneManager.roomState.bridgeMatrixCalibrated = true;
      }

      this.activeDialog = {
        title: 'BRIDGE MECHANISM ACTIVATED',
        text: 'Quantum phase harmonic locked! The Invisible Bridge has aligned with baryonic reality.',
        hint: 'The bridge is physically solid in Reality 01. Shift back to cross safely!',
      };

      setTimeout(() => {
        if (this.tutorialMessage === 'BRIDGE SYSTEM ONLINE') {
          this.tutorialMessage = null;
          this.tutorialSubMessage = null;
          this.broadcastState();
        }
      }, 5000);
    } else {
      audioManager.playButtonSound();
      this.activeDialog = {
        title: 'BRIDGE STATUS',
        text: 'Bridge matrix calibration is already online and locked.',
        hint: 'Shift back to Reality 01 to walk across.',
      };
    }

    this.updateSceneRealityObjects();
    this.broadcastState();
  }

  // ============================================
  // EVENT GROUP 10 — Exit & Win Condition
  // ============================================
  private handleExitDoorInteraction() {
    if (!this.exitUnlocked) {
      audioManager.playButtonSound();
      this.activeDialog = {
        title: 'EXIT LOCKED',
        text: 'Chamber 02 security interlock engaged. The Invisible Bridge matrix must be activated first.',
        hint: 'Find the hidden control in Reality 02.',
      };
      this.broadcastState();
      return;
    }

    // Win condition met!
    this.triggerWinSequence();
  }

  private triggerWinSequence() {
    this.gameState = GameState.Won;
    this.playerStatus = PlayerStatus.Completed;
    this.completionTime = Math.round((Date.now() - this.startTime) / 1000);

    audioManager.playDoorUnlocked();
    audioManager.playWinSound();

    this.tutorialMessage = 'ROOM CLEARED';
    this.tutorialSubMessage = 'Reality Layer Stabilized.';

    // Save progression
    this.saveProgress();
    this.broadcastState();
  }

  // ============================================
  // EVENT GROUP 06 — Reality Shift Execution
  // ============================================
  public triggerRealityShift() {
    if (this.gameState !== GameState.Playing || this.realityShiftLocked) return;

    this.realityShiftLocked = true;
    this.playerStatus = PlayerStatus.Transitioning;
    this.shiftCount += 1;

    // Haptics
    if (typeof navigator !== 'undefined' && navigator.vibrate && this.settings.vibration) {
      try { navigator.vibrate(35); } catch {}
    }

    // Switch: 1 -> 2, 2 -> 1
    const nextReality: RealityId = (3 - this.reality) as RealityId;
    this.reality = nextReality;

    audioManager.playRealityShift(nextReality);

    // Update 3D scene reality-dependent objects immediately
    this.updateSceneRealityObjects();

    // Check tutorial milestone: "Reality changed."
    if (!this.firstShiftDone) {
      this.firstShiftDone = true;
      this.tutorialMessage = 'Reality changed.';
      this.tutorialSubMessage = 'Seek the bridge control in this layer.';
      setTimeout(() => {
        if (this.tutorialMessage === 'Reality changed.') {
          this.tutorialMessage = null;
          this.tutorialSubMessage = null;
          this.broadcastState();
        }
      }, 4000);
    }

    // Short transition duration (~220ms) prevents repeated accidental triggering
    setTimeout(() => {
      this.realityShiftLocked = false;
      if (this.gameState === GameState.Playing) {
        this.playerStatus = PlayerStatus.Normal;
      }
      this.broadcastState();
    }, 220);

    this.broadcastState();
  }

  // ============================================
  // EVENT GROUP 07 — Reality Object Visibility & Collision
  // ============================================
  private updateSceneRealityObjects() {
    if (!this.sceneManager) return;

    // Delegate visual changes to scene
    this.sceneManager.activeReality = this.reality;
    this.sceneManager.roomState.activeReality = this.reality;
    this.sceneManager.roomState.bridgeMatrixCalibrated = this.bridgeActive;

    // Sync bridge solid collision:
    // Only safely crossable when: BridgeActive = true AND Reality = 1
    const currentBoxes = this.sceneManager.getCollisionBoxes();
    const bridgeBoxIndex = currentBoxes.findIndex(
      b => b.name === 'Calibrated Invisible Bridge Pathway'
    );

    if (this.bridgeActive && this.reality === 1) {
      if (bridgeBoxIndex === -1) {
        currentBoxes.push({
          min: { x: -1.2, y: -0.4, z: -5.0 },
          max: { x: 1.2, y: 0.0, z: 5.0 },
          realityAffinity: 1,
          name: 'Calibrated Invisible Bridge Pathway',
        });
      }
    } else {
      if (bridgeBoxIndex !== -1) {
        currentBoxes.splice(bridgeBoxIndex, 1);
      }
    }

    this.playerController.setCollisionBoxes(currentBoxes);
    this.sceneManager.toggleReality();
  }

  // ============================================
  // EVENT GROUP 09 — Checkpoint & Fall Recovery
  // ============================================
  private handlePlayerFall() {
    this.fallsCount += 1;
    audioManager.playPlayerFall();

    // Preserve puzzle progress & teleport player to safe checkpoint
    this.playerController.setPosition(this.checkpoint.x, this.checkpoint.y, this.checkpoint.z);
    this.cameraController.setRotation(0, 0);

    this.tutorialMessage = 'Temporal anomaly detected.';
    this.tutorialSubMessage = 'Player restored to safe checkpoint.';

    setTimeout(() => {
      if (this.tutorialMessage === 'Temporal anomaly detected.') {
        this.tutorialMessage = null;
        this.tutorialSubMessage = null;
        this.broadcastState();
      }
    }, 3000);

    this.broadcastState();
  }

  // ============================================
  // EVENT GROUP 12 — Pause & Menus
  // ============================================
  public togglePause() {
    if (this.gameState === GameState.Won || this.gameState === GameState.Loading) return;

    if (this.gameState === GameState.Playing) {
      this.gameState = GameState.Paused;
      this.inputManager.resetAllInputs();
    } else if (this.gameState === GameState.Paused) {
      this.gameState = GameState.Playing;
    }

    this.broadcastState();
  }

  public resumeGame() {
    if (this.gameState === GameState.Paused) {
      this.gameState = GameState.Playing;
      this.broadcastState();
    }
  }

  public restartRoom() {
    this.gameState = GameState.Playing;
    this.playerStatus = PlayerStatus.Normal;
    this.reality = 1;
    this.realityShiftLocked = false;
    this.bridgeActive = false;
    this.exitUnlocked = false;
    this.terminalDiscovered = false;
    this.firstShiftDone = false;
    this.shiftCount = 0;
    this.fallsCount = 0;
    this.startTime = Date.now();
    this.completionTime = null;
    this.currentObjective = 'Find a way across the gap.';
    this.tutorialMessage = 'Something is wrong here.';
    this.tutorialSubMessage = 'Explore the chamber.';
    this.activeDialog = null;
    this.currentInteractable = null;
    this.inputManager.resetAllInputs();

    this.playerController.setPosition(this.checkpoint.x, this.checkpoint.y, this.checkpoint.z);
    this.cameraController.setRotation(0, 0);

    if (this.sceneManager) {
      this.sceneManager.restartRoom();
    }

    this.updateSceneRealityObjects();
    this.broadcastState();
  }

  public closeDialog() {
    this.activeDialog = null;
    this.broadcastState();
  }

  // ============================================
  // Settings & Storage
  // ============================================
  public updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.inputManager.updateSettings(this.settings);
    this.cameraController.updateSettings(this.settings);
    this.playerController.updateSettings(this.settings);
    audioManager.setVolume(this.settings.volume);
    audioManager.setMuted(!this.settings.soundEnabled);

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // storage unavailable
    }

    this.broadcastState();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
  }

  private saveProgress() {
    try {
      const data = {
        completed: true,
        bestTime: this.completionTime,
        shifts: this.shiftCount,
        timestamp: Date.now(),
      };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  /**
   * Multiplayer preparation: snapshot format ready for replication
   */
  public getMultiplayerSnapshot(): PlayerSnapshot {
    return {
      playerId: 'player-local',
      realityId: this.reality,
      status: this.playerStatus,
      position: {
        x: this.playerController.position.x,
        y: this.playerController.position.y,
        z: this.playerController.position.z,
      },
      rotation: {
        yaw: this.cameraController.getYaw(),
        pitch: this.cameraController.getPitch(),
      },
      velocity: {
        x: this.playerController.velocity.x,
        y: this.playerController.velocity.y,
        z: this.playerController.velocity.z,
      },
      isSprinting: this.playerController.isSprinting,
      isGrounded: this.playerController.isGrounded,
      timestamp: Date.now(),
    };
  }

  public destroy() {
    this.isDestroyed = true;
    this.inputManager.detach();
  }
}
