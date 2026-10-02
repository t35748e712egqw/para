import * as THREE from 'three';
import { CollisionAABB, GameSettings, InputState, PlayerState, RealityId } from '../types/game';
import { audioManager } from './AudioManager';

/**
 * Android Mobile First-Person Player Controller for PARADOX ROOM
 * Kinematic movement tailored for touchscreen joystick navigation.
 * Walk: 2.8 units/s, Sprint: 4.2 units/s, responsive non-slippery deceleration.
 */
export class PlayerController {
  // Physical dimensions
  public readonly radius = 0.35; // meters
  public readonly eyeHeight = 1.65; // meters
  public readonly height = 1.8;

  // Speeds (calibrated for puzzle exploration)
  public walkSpeed = 2.8; // units/s
  public sprintSpeed = 4.2; // ~1.5x walk speed
  public acceleration = 26.0; // units/s^2
  public deceleration = 32.0; // units/s^2 (snappy stop when thumb lifts)
  public gravity = 18.0; // units/s^2

  // State
  public position = new THREE.Vector3(0, 1.65, 11);
  public velocity = new THREE.Vector3(0, 0, 0);
  public isGrounded = true;
  public isSprinting = false;
  public isMoving = false;
  public speedRatio = 0;

  // Checkpoint for respawn
  private checkpoint = new THREE.Vector3(0, 1.65, 11);

  // Step audio timing
  private stepDistanceTravelled = 0;
  private readonly stepInterval = 1.6; // meters between footsteps

  // Collision geometry
  private collisionBoxes: CollisionAABB[] = [];

  // Settings
  private settings: GameSettings;

  // Respawn callback
  private onHazardResetCallback?: () => void;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  public updateSettings(newSettings: GameSettings) {
    this.settings = { ...newSettings };
  }

  public setCheckpoint(pos: THREE.Vector3) {
    this.checkpoint.copy(pos);
  }

  public setCollisionBoxes(boxes: CollisionAABB[]) {
    this.collisionBoxes = boxes;
  }

  public onHazardReset(cb: () => void) {
    this.onHazardResetCallback = cb;
  }

  public setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }

  public update(
    deltaTime: number,
    input: InputState,
    cameraYaw: number,
    activeReality: RealityId
  ) {
    const hasMoveInput = Math.hypot(input.move.x, input.move.y) > 0.05;

    // Sprint only active while joystick is actively pushed
    this.isSprinting = input.sprint && hasMoveInput;
    const targetSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    const moveVector = new THREE.Vector3(0, 0, 0);
    if (hasMoveInput) {
      const sinYaw = Math.sin(cameraYaw);
      const cosYaw = Math.cos(cameraYaw);

      // input.move.y: 1 forward, -1 backward
      // input.move.x: 1 right, -1 left
      const fwdX = -sinYaw * input.move.y;
      const fwdZ = -cosYaw * input.move.y;
      const rightX = cosYaw * input.move.x;
      const rightZ = -sinYaw * input.move.x;

      moveVector.set(fwdX + rightX, 0, fwdZ + rightZ).normalize();
    }

    // 2. Horizontal Acceleration & Deceleration
    const targetVelX = moveVector.x * (hasMoveInput ? targetSpeed : 0);
    const targetVelZ = moveVector.z * (hasMoveInput ? targetSpeed : 0);

    const accelRate = hasMoveInput ? this.acceleration : this.deceleration;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, accelRate, deltaTime);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, accelRate, deltaTime);

    // 3. Gravity
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * deltaTime;
    }

    // 4. Collision & Displacement Resolution (Split X and Z for smooth wall sliding)
    const deltaX = this.velocity.x * deltaTime;
    const deltaZ = this.velocity.z * deltaTime;
    const deltaY = this.velocity.y * deltaTime;

    // Resolve X motion
    this.position.x += deltaX;
    if (this.checkHorizontalCollisions(activeReality)) {
      this.position.x -= deltaX;
      this.velocity.x = 0;
    }

    // Resolve Z motion
    this.position.z += deltaZ;
    if (this.checkHorizontalCollisions(activeReality)) {
      this.position.z -= deltaZ;
      this.velocity.z = 0;
    }

    // Resolve Y motion & Grounding
    this.position.y += deltaY;
    const groundHeight = this.resolveGroundHeight(activeReality);

    if (this.position.y <= groundHeight + this.eyeHeight) {
      this.position.y = groundHeight + this.eyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 5. Chasm Fall Hazard Check
    if (this.position.y < -1.6) {
      this.respawnAtCheckpoint();
      return;
    }

    // 6. Movement stats & footstep audio
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.isMoving = horizontalSpeed > 0.25;
    this.speedRatio = horizontalSpeed / this.walkSpeed;

    if (this.isGrounded && this.isMoving) {
      this.stepDistanceTravelled += horizontalSpeed * deltaTime;
      const currentInterval = this.isSprinting ? this.stepInterval * 1.25 : this.stepInterval;
      if (this.stepDistanceTravelled >= currentInterval) {
        audioManager.playFootstep(this.isSprinting);
        this.stepDistanceTravelled = 0;
      }
    } else {
      this.stepDistanceTravelled = 0;
    }
  }

  private checkHorizontalCollisions(activeReality: RealityId): boolean {
    const feetY = this.position.y - this.eyeHeight;
    const headY = feetY + this.height;

    for (const box of this.collisionBoxes) {
      if (box.isHazard) continue;
      if (box.realityAffinity !== 'both' && box.realityAffinity !== activeReality) {
        continue;
      }

      // Vertical overlap
      if (headY <= box.min.y || feetY >= box.max.y) {
        continue;
      }

      // Circle-AABB horizontal overlap
      const closestX = Math.max(box.min.x, Math.min(this.position.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(this.position.z, box.max.z));

      const distX = this.position.x - closestX;
      const distZ = this.position.z - closestZ;
      const distanceSq = distX * distX + distZ * distZ;

      if (distanceSq < this.radius * this.radius) {
        return true;
      }
    }
    return false;
  }

  private resolveGroundHeight(activeReality: RealityId): number {
    let highestFloor = -100;

    for (const box of this.collisionBoxes) {
      if (box.realityAffinity !== 'both' && box.realityAffinity !== activeReality) {
        continue;
      }

      // Check if player's XZ falls within bounds
      if (
        this.position.x >= box.min.x - this.radius &&
        this.position.x <= box.max.x + this.radius &&
        this.position.z >= box.min.z - this.radius &&
        this.position.z <= box.max.z + this.radius
      ) {
        const feetY = this.position.y - this.eyeHeight;
        if (box.max.y <= feetY + 0.35 && box.max.y > highestFloor) {
          if (box.isHazard) continue;
          highestFloor = box.max.y;
        }
      }
    }

    return highestFloor;
  }

  public respawnAtCheckpoint() {
    audioManager.playHazardReset();
    this.position.copy(this.checkpoint);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    if (this.onHazardResetCallback) {
      this.onHazardResetCallback();
    }
  }

  public getPlayerState(yaw: number, pitch: number, activeReality: RealityId): PlayerState {
    return {
      id: 'local-player',
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      yaw,
      pitch,
      velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
      isSprinting: this.isSprinting,
      isMoving: this.isMoving,
      isGrounded: this.isGrounded,
      activeReality,
      timestamp: performance.now(),
    };
  }
}
