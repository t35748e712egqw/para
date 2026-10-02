import * as THREE from 'three';
import { InteractableTarget, RealityId } from '../types/game';

/**
 * Look-At Interaction System for PARADOX ROOM
 * Uses center-screen raycasting with wall occlusion checks,
 * reality filtering, and contextual prompt feedback.
 */
export class InteractionSystem {
  private raycaster = new THREE.Raycaster();
  private maxDistance: number = 2.8; // meters (approximately 2 to 3m)
  private interactables: Array<{
    target: InteractableTarget;
    mesh: THREE.Object3D;
  }> = [];
  private occluders: THREE.Object3D[] = [];

  private currentTarget: InteractableTarget | null = null;

  constructor(maxDistance: number = 3.2) {
    this.maxDistance = maxDistance;
  }

  public registerInteractable(target: InteractableTarget, mesh: THREE.Object3D) {
    // Store metadata on mesh for fast reverse lookup
    mesh.userData.interactableId = target.id;
    this.interactables.push({ target, mesh });
  }

  public unregisterInteractable(id: string) {
    this.interactables = this.interactables.filter(item => item.target.id !== id);
  }

  public setOccluders(occluders: THREE.Object3D[]) {
    this.occluders = occluders;
  }

  public update(
    camera: THREE.Camera,
    activeReality: RealityId
  ): InteractableTarget | null {
    // Raycast from camera center
    this.raycaster.set(camera.position, (camera as THREE.PerspectiveCamera).getWorldDirection(new THREE.Vector3()));
    this.raycaster.far = this.maxDistance;

    // Filter candidate interactables by reality affinity and enabled state
    const candidateMeshes: THREE.Object3D[] = [];
    const meshToTargetMap = new Map<string, InteractableTarget>();

    for (const item of this.interactables) {
      if (!item.target.isEnabled) continue;
      if (item.target.realityAffinity !== 'both' && item.target.realityAffinity !== activeReality) {
        continue;
      }
      candidateMeshes.push(item.mesh);
      meshToTargetMap.set(item.mesh.uuid, item.target);
    }

    if (candidateMeshes.length === 0) {
      this.currentTarget = null;
      return null;
    }

    // 1. Raycast candidates
    const candidateIntersects = this.raycaster.intersectObjects(candidateMeshes, true);
    if (candidateIntersects.length === 0) {
      this.currentTarget = null;
      return null;
    }

    const firstCandidateHit = candidateIntersects[0];
    
    // Find the root candidate interactable
    let rootMesh = firstCandidateHit.object;
    while (rootMesh.parent && !meshToTargetMap.has(rootMesh.uuid) && rootMesh.parent.type !== 'Scene') {
      rootMesh = rootMesh.parent;
    }

    const target = meshToTargetMap.get(rootMesh.uuid);
    if (!target) {
      this.currentTarget = null;
      return null;
    }

    // 2. Occlusion check: Is there a solid wall/obstacle between camera and interactable?
    if (this.occluders.length > 0) {
      const occluderIntersects = this.raycaster.intersectObjects(this.occluders, true);
      if (occluderIntersects.length > 0) {
        const wallHit = occluderIntersects[0];
        // If the wall is closer than the interactable, line-of-sight is blocked
        if (wallHit.distance < firstCandidateHit.distance - 0.05) {
          this.currentTarget = null;
          return null;
        }
      }
    }

    target.distance = firstCandidateHit.distance;
    this.currentTarget = target;
    return target;
  }

  public getCurrentTarget(): InteractableTarget | null {
    return this.currentTarget;
  }

  public triggerInteract() {
    if (this.currentTarget && this.currentTarget.isEnabled) {
      this.currentTarget.onInteract();
    }
  }
}
