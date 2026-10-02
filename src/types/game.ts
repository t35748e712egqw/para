/**
 * PARADOX ROOM — Room 02: The Invisible Bridge
 * Android Mobile 3D Puzzle Game Core Types
 */

export enum GameState {
  Loading = 0,
  Playing = 1,
  Paused = 2,
  PuzzleInteraction = 3,
  Transition = 4,
  Won = 5,
  Restarting = 6,
}

export enum PlayerStatus {
  Normal = 0,
  Interacting = 1,
  Transitioning = 2,
  Completed = 3,
}

export type RealityId = 1 | 2;

/**
 * 0 = Visible in both realities
 * 1 = Reality 1 only
 * 2 = Reality 2 only
 */
export type VisibleReality = 0 | 1 | 2;

export enum InteractionPriority {
  PuzzleMechanism = 1,
  Door = 2,
  SwitchButton = 3,
  RealityTerminal = 4,
  Clue = 5,
  General = 6,
}

export type InteractionType =
  | 'RealityTerminal'
  | 'BridgeButton'
  | 'ExitDoor'
  | 'CluePanel'
  | 'GeneralInteractable';

export interface InteractableObject {
  id: string;
  name: string;
  isInteractable: boolean;
  interactionType: InteractionType;
  interactionRange: number;
  interactionText: string;
  priority: InteractionPriority;
  visibleReality: VisibleReality;
  position: { x: number; y: number; z: number };
  description?: string;
  clueText?: string;
  execute: () => void;
}

export interface InteractableTarget {
  id: string;
  name: string;
  actionText: string;
  position: { x: number; y: number; z: number };
  distance: number;
  realityAffinity: 'both' | RealityId;
  isEnabled: boolean;
  description?: string;
  icon?: string;
  onInteract: () => void;
}

export interface CollisionAABB {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  realityAffinity: 'both' | RealityId;
  isHazard?: boolean;
  name?: string;
}

export interface InputState {
  move: { x: number; y: number }; // normalized -1 to 1 from virtual joystick
  look: { x: number; y: number }; // delta yaw and pitch from touch drag
  sprint: boolean;
  interact: boolean;
  realityShift: boolean;
  jump: boolean;
  pause: boolean;
}

export interface GameSettings {
  touchSensitivity: number; // 0.2 to 3.0 (default 1.0)
  invertY: boolean;
  headBobbing: boolean;
  vibration: boolean;
  fov: number; // 65 to 90 (default 75)
  soundEnabled: boolean;
  volume: number; // 0.0 to 1.0 (default 0.7)
}

export interface PlayerSnapshot {
  id?: string;
  playerId?: string;
  realityId?: RealityId;
  activeReality?: RealityId;
  status?: PlayerStatus;
  position: { x: number; y: number; z: number };
  rotation?: { yaw: number; pitch: number };
  yaw?: number;
  pitch?: number;
  velocity: { x: number; y: number; z: number };
  isSprinting: boolean;
  isMoving?: boolean;
  isGrounded: boolean;
  timestamp: number;
}

export type PlayerState = PlayerSnapshot;

export interface TutorialBanner {
  text: string;
  subText?: string;
  visible: boolean;
  duration?: number;
}

export interface Room02State {
  activeReality: RealityId;
  terminalExamined: boolean;
  realityShiftUnlocked: boolean;
  bridgeMatrixCalibrated: boolean;
  exitUnlocked: boolean;
  isCompleted: boolean;
  shiftCount: number;
  interactionsCount: number;
  startTime: number;
  completionTime: number | null;
  currentObjective: string;
  activeDialog: { title: string; text: string; hint?: string } | null;
}

export interface Room02Data {
  gameState: GameState;
  reality: RealityId;
  realityShiftLocked: boolean;
  bridgeActive: boolean;
  exitUnlocked: boolean;
  playerStatus: PlayerStatus;
  currentInteractable: InteractableObject | null;
  shiftCount: number;
  fallsCount: number;
  startTime: number;
  completionTime: number | null;
  tutorialBanner: TutorialBanner | null;
  activeDialog: { title: string; text: string; hint?: string } | null;
}
