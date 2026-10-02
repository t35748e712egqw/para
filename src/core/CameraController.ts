import * as THREE from 'three';
import { GameSettings } from '../types/game';

/**
 * First-Person Camera Controller for PARADOX ROOM
 * Handles smooth yaw/pitch rotation, vertical clamping,
 * sprint FOV expansion, and optional head bobbing.
 */
export class CameraController {
  public camera: THREE.PerspectiveCamera;
  private settings: GameSettings;

  // Rotation angles (in radians)
  private currentYaw: number = 0;
  private currentPitch: number = 0;
  private targetYaw: number = 0;
  private targetPitch: number = 0;

  // Clamping limits for pitch (avoid looking directly 90 deg down/up)
  private readonly MIN_PITCH = -1.48; // ~ -85 degrees
  private readonly MAX_PITCH = 1.48;  // ~ +85 degrees

  // Head bobbing state
  private bobTimer: number = 0;
  private currentBobOffset = new THREE.Vector3();

  // Field of View state
  private currentFov: number = 75;
  private targetFov: number = 75;

  constructor(fov: number = 75, settings: GameSettings) {
    this.settings = settings;
    this.currentFov = settings.fov || fov;
    this.targetFov = this.currentFov;
    this.camera = new THREE.PerspectiveCamera(
      this.currentFov,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.rotation.order = 'YXZ';
  }

  public updateSettings(newSettings: GameSettings) {
    this.settings = { ...newSettings };
    this.targetFov = this.settings.fov;
  }

  public setRotation(yaw: number, pitch: number) {
    this.targetYaw = yaw;
    this.targetPitch = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, pitch));
    this.currentYaw = this.targetYaw;
    this.currentPitch = this.targetPitch;
    this.applyRotation();
  }

  public addLookDelta(deltaYaw: number, deltaPitch: number) {
    this.targetYaw -= deltaYaw;
    this.targetPitch += deltaPitch;

    // Clamp pitch
    this.targetPitch = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, this.targetPitch));
  }

  public update(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    isMoving: boolean,
    isSprinting: boolean,
    speedRatio: number
  ) {
    // 1. Smooth rotation interpolation (Damped lerp to avoid jitter and feel responsive)
    const smoothFactor = Math.min(1, deltaTime * 24);
    this.currentYaw += (this.targetYaw - this.currentYaw) * smoothFactor;
    this.currentPitch += (this.targetPitch - this.currentPitch) * smoothFactor;
    this.applyRotation();

    // 2. Sprint FOV transition
    const baseFov = this.settings.fov;
    const fovBoost = isSprinting && isMoving ? 5 : 0;
    this.targetFov = baseFov + fovBoost;
    this.currentFov += (this.targetFov - this.currentFov) * Math.min(1, deltaTime * 8);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // 3. Head Bobbing
    const targetBob = new THREE.Vector3();
    if (this.settings.headBobbing && isMoving) {
      const bobFreq = isSprinting ? 12 : 8;
      const bobAmpY = isSprinting ? 0.045 : 0.025;
      const bobAmpX = isSprinting ? 0.025 : 0.015;

      this.bobTimer += deltaTime * bobFreq * speedRatio;
      targetBob.y = Math.sin(this.bobTimer) * bobAmpY;
      targetBob.x = Math.cos(this.bobTimer * 0.5) * bobAmpX;
    } else {
      // Settle back to center when stopped
      this.bobTimer = 0;
    }

    this.currentBobOffset.lerp(targetBob, Math.min(1, deltaTime * 12));

    // 4. Position camera at player eye-line + bob
    this.camera.position.copy(playerPosition).add(this.currentBobOffset);
  }

  private applyRotation() {
    this.camera.rotation.x = this.currentPitch;
    this.camera.rotation.y = this.currentYaw;
    this.camera.rotation.z = 0;
  }

  public getForwardVector(): THREE.Vector3 {
    const vector = new THREE.Vector3(0, 0, -1);
    vector.applyQuaternion(this.camera.quaternion);
    return vector.normalize();
  }

  public getYaw(): number {
    return this.currentYaw;
  }

  public getPitch(): number {
    return this.currentPitch;
  }
}
