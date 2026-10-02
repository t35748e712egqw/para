import { InputState, GameSettings } from '../types/game';

/**
 * Android Mobile Touchscreen Input Manager for PARADOX ROOM
 * 100% Touch-native architecture.
 * Dedicated virtual movement joystick, isolated camera-look touch drag,
 * contextual interaction trigger, reality shift trigger, and hold-to-sprint.
 */
export class InputManager {
  // Continuous touch inputs
  private touchMove = { x: 0, y: 0 };
  private touchSprintActive: boolean = false;

  // Camera look touch accumulator
  private lookDeltaAccumulator = { x: 0, y: 0 };

  // Edge triggers (consumed on frame update)
  private interactRequested: boolean = false;
  private realityShiftRequested: boolean = false;
  private pauseRequested: boolean = false;

  // Settings
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  public updateSettings(newSettings: GameSettings) {
    this.settings = { ...newSettings };
  }

  public attachToElement(_element: HTMLElement) {
    // Pure touch driven through HUD touch layers
  }

  public detach() {
    this.resetAllInputs();
  }

  public resetAllInputs() {
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.touchSprintActive = false;
    this.lookDeltaAccumulator.x = 0;
    this.lookDeltaAccumulator.y = 0;
    this.interactRequested = false;
    this.realityShiftRequested = false;
    this.pauseRequested = false;
  }

  // ============================================
  // Mobile Virtual Joystick (Left Region)
  // ============================================
  public setVirtualJoystick(x: number, y: number) {
    // 8% Dead zone filter to prevent thumb drift
    const dist = Math.hypot(x, y);
    if (dist < 0.08) {
      this.touchMove.x = 0;
      this.touchMove.y = 0;
      return;
    }

    // Normalized clamping
    const normX = Math.max(-1, Math.min(1, x));
    const normY = Math.max(-1, Math.min(1, y));
    const len = Math.hypot(normX, normY);

    if (len > 1.0) {
      this.touchMove.x = normX / len;
      this.touchMove.y = normY / len;
    } else {
      this.touchMove.x = normX;
      this.touchMove.y = normY;
    }
  }

  // ============================================
  // Camera Look Touch Area (Right Open Region)
  // ============================================
  public addTouchLookDelta(dx: number, dy: number) {
    const sens = this.settings.touchSensitivity * 0.0034;
    const invertSign = this.settings.invertY ? 1 : -1;

    this.lookDeltaAccumulator.x += dx * sens;
    this.lookDeltaAccumulator.y += dy * sens * invertSign;
  }

  // ============================================
  // Action Button Triggers
  // ============================================
  public setTouchSprint(active: boolean) {
    this.touchSprintActive = active;
  }

  public triggerInteract() {
    this.interactRequested = true;
  }

  public triggerRealityShift() {
    this.realityShiftRequested = true;
  }

  public triggerPause() {
    this.pauseRequested = true;
  }

  // ============================================
  // Frame Polling (called by PlayerController & GameEngine)
  // ============================================
  public consumeInput(): InputState {
    const moveX = this.touchMove.x;
    const moveY = this.touchMove.y;
    const sprint = this.touchSprintActive;

    const lookX = this.lookDeltaAccumulator.x;
    const lookY = this.lookDeltaAccumulator.y;
    this.lookDeltaAccumulator.x = 0;
    this.lookDeltaAccumulator.y = 0;

    const interact = this.interactRequested;
    const realityShift = this.realityShiftRequested;
    const pause = this.pauseRequested;

    this.interactRequested = false;
    this.realityShiftRequested = false;
    this.pauseRequested = false;

    return {
      move: { x: moveX, y: moveY },
      look: { x: lookX, y: lookY },
      sprint,
      interact,
      realityShift,
      jump: false, // Room 02 is no-jump
      pause,
    };
  }
}
