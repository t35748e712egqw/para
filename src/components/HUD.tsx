import React, { useRef, useState } from 'react';
import { GameEngine } from '../core/GameEngine';
import { Room02Data } from '../types/game';
import { 
  Pause, 
  Volume2, 
  VolumeX, 
  Zap, 
  Hand, 
  Sparkles,
  Info
} from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  roomData: Room02Data;
}

export const HUD: React.FC<HUDProps> = ({ engine, roomData }) => {
  // Joystick state & tracking
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [joystickTouchId, setJoystickTouchId] = useState<number | null>(null);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState<boolean>(false);

  // Camera look area touch tracking (isolated touch identifier)
  const lookAreaRef = useRef<HTMLDivElement>(null);
  const [lookTouchId, setLookTouchId] = useState<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sprint hold state
  const [isSprintHeld, setIsSprintHeld] = useState<boolean>(false);

  // ============================================
  // Virtual Joystick Multi-Touch Handlers (Left)
  // ============================================
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchId !== null) return;

    const touch = e.changedTouches[0];
    setJoystickTouchId(touch.identifier);
    setJoystickActive(true);
    processJoystickTouch(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId) {
        processJoystickTouch(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        setJoystickTouchId(null);
        setJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        engine.inputManager.setVirtualJoystick(0, 0);
        break;
      }
    }
  };

  const processJoystickTouch = (clientX: number, clientY: number) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    // 8px Deadzone to prevent micro-jitter
    if (dist < 8) {
      setJoystickPos({ x: 0, y: 0 });
      engine.inputManager.setVirtualJoystick(0, 0);
      return;
    }

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    setJoystickPos({ x: stickX, y: stickY });

    // Output normalized axes: x (-1 to 1), y (1 forward, -1 backward)
    const normX = stickX / maxRadius;
    const normY = -(stickY / maxRadius);
    engine.inputManager.setVirtualJoystick(normX, normY);
  };

  // ============================================
  // Camera Look Touch Handlers (Right Open Area)
  // ============================================
  const handleLookTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (lookTouchId !== null) return;

    const touch = e.changedTouches[0];
    setLookTouchId(touch.identifier);
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (lookTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        engine.inputManager.addTouchLookDelta(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) {
        setLookTouchId(null);
        break;
      }
    }
  };

  // ============================================
  // Action Button Handlers (Isolated Multi-Touch)
  // ============================================
  const handleInteractTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    engine.inputManager.triggerInteract();
    if (navigator.vibrate && engine.settings.vibration) {
      try { navigator.vibrate(30); } catch {}
    }
  };

  const handleRealityShiftTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    engine.inputManager.triggerRealityShift();
    if (navigator.vibrate && engine.settings.vibration) {
      try { navigator.vibrate(40); } catch {}
    }
  };

  const handleSprintStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    setIsSprintHeld(true);
    engine.inputManager.setTouchSprint(true);
  };

  const handleSprintEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    setIsSprintHeld(false);
    engine.inputManager.setTouchSprint(false);
  };

  const handlePauseTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    engine.togglePause();
  };

  const isReality1 = roomData.reality === 1;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-between font-sans">
      {/* 1. TOP BAR: Status & Reality Layer */}
      <div className="p-4 md:p-6 flex items-start justify-between">
        {/* Left: Reality Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-300 flex items-center gap-2.5 shadow-lg ${
              isReality1
                ? 'bg-slate-950/85 border-cyan-500/40 text-cyan-400 shadow-cyan-950/30'
                : 'bg-slate-950/85 border-amber-500/50 text-amber-400 shadow-amber-950/30'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                roomData.realityShiftLocked
                  ? 'bg-white animate-ping'
                  : isReality1
                  ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                  : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
              }`}
            />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              {roomData.realityShiftLocked
                ? 'REALITY SHIFTING...'
                : isReality1
                ? 'REALITY 01'
                : 'REALITY 02'}
            </span>
          </div>
        </div>

        {/* Center: Objective Banner */}
        <div className="flex flex-col items-center">
          <div className="px-4 py-1.5 bg-black/65 backdrop-blur-md border border-white/10 rounded-full text-center shadow-lg">
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider mr-1.5">
              GOAL:
            </span>
            <span className="text-xs font-medium text-slate-100">
              {engine.currentObjective}
            </span>
          </div>
        </div>

        {/* Right: Sound & Touch Pause Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => engine.updateSettings({ soundEnabled: !engine.settings.soundEnabled })}
            className="w-11 h-11 rounded-xl bg-black/65 active:bg-white/15 border border-white/10 text-slate-300 active:scale-95 flex items-center justify-center transition-all backdrop-blur-md cursor-pointer"
            title="Toggle Sound"
            aria-label="Toggle Sound"
          >
            {engine.settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-red-400" />}
          </button>

          <button
            onClick={handlePauseTap}
            onTouchStart={handlePauseTap}
            className="w-11 h-11 rounded-xl bg-black/65 active:bg-white/15 border border-white/10 text-slate-300 active:scale-95 flex items-center justify-center transition-all backdrop-blur-md cursor-pointer"
            title="Pause Menu"
            aria-label="Pause Menu"
          >
            <Pause size={18} />
          </button>
        </div>
      </div>

      {/* 2. CENTER: Minimal Crosshair & Contextual Target Bracket */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {roomData.currentInteractable ? (
            // Expanded target lock bracket
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/90 shadow-[0_0_12px_#22d3ee] animate-pulse" />
          ) : (
            // Minimal 5px center dot
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                isReality1 ? 'bg-cyan-400/80 shadow-[0_0_4px_#38bdf8]' : 'bg-amber-400/80 shadow-[0_0_4px_#f59e0b]'
              }`}
            />
          )}
        </div>

        {/* Environmental Contextual Hint Toast */}
        {roomData.tutorialBanner && (
          <div className="mt-20 px-4 py-2 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-xl text-center max-w-xs transition-all duration-300 shadow-2xl animate-in fade-in">
            <p className="text-xs font-semibold text-cyan-300 tracking-wide">
              {roomData.tutorialBanner.text}
            </p>
            {roomData.tutorialBanner.subText && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {roomData.tutorialBanner.subText}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 3. ACTIVE DIALOG / TERMINAL MODAL */}
      {roomData.activeDialog && (
        <div className="absolute inset-x-4 top-20 max-w-md mx-auto pointer-events-auto bg-slate-950/95 backdrop-blur-lg border border-cyan-500/40 rounded-2xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-top-4 duration-200 z-30">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <span className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} />
              {roomData.activeDialog.title}
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans mb-3">
            {roomData.activeDialog.text}
          </p>
          {roomData.activeDialog.hint && (
            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 mb-4">
              <span className="font-bold mr-1">HINT:</span>
              {roomData.activeDialog.hint}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => engine.closeDialog()}
              onTouchStart={() => engine.closeDialog()}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold tracking-wider transition-all active:scale-95 cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* 4. DEDICATED RIGHT-SIDE CAMERA LOOK TOUCH AREA */}
      {/* Covers the right 60% of the screen, inset from action buttons to prevent conflict */}
      <div
        ref={lookAreaRef}
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
        className="absolute top-16 right-28 bottom-28 left-40 pointer-events-auto touch-none"
      />

      {/* 5. BOTTOM CONTROLS ROW */}
      <div className="w-full flex justify-between items-end p-5 md:p-6 pointer-events-none z-20">
        {/* LEFT: Virtual Movement Joystick */}
        <div
          ref={joystickContainerRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          className="w-32 h-32 rounded-full border-2 border-white/20 bg-black/50 backdrop-blur-sm pointer-events-auto relative flex items-center justify-center touch-none shadow-2xl"
        >
          {/* Inner boundary ring */}
          <div className="w-12 h-12 rounded-full border border-white/15" />
          {/* Floating thumb knob */}
          <div
            className={`w-14 h-14 rounded-full absolute transition-transform duration-75 shadow-lg flex items-center justify-center ${
              joystickActive ? 'bg-cyan-500 text-slate-950 scale-105' : 'bg-white/40 text-transparent'
            }`}
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/40" />
          </div>
        </div>

        {/* RIGHT: Action Button Cluster (Discrete Touch Targets) */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          {/* Contextual INTERACT Button (Visible & glowing only when looking at valid object) */}
          {roomData.currentInteractable && (
            <div className="flex flex-col items-end animate-in fade-in zoom-in-95 duration-150">
              <span className="text-[10px] font-mono text-cyan-300 font-bold bg-slate-950/80 border border-cyan-500/40 px-2 py-0.5 rounded mb-1 shadow-md">
                {roomData.currentInteractable.interactionText}
              </span>
              <button
                onClick={handleInteractTap}
                onTouchStart={handleInteractTap}
                className="w-18 h-18 rounded-2xl bg-cyan-500 active:bg-cyan-400 text-slate-950 font-bold border-2 border-cyan-300 shadow-[0_0_20px_#06b6d4] flex flex-col items-center justify-center transition-transform active:scale-90 cursor-pointer"
              >
                <Hand size={26} />
                <span className="text-[10px] font-mono font-bold uppercase mt-0.5">INTERACT</span>
              </button>
            </div>
          )}

          {/* REALITY SHIFT Button */}
          <button
            onClick={handleRealityShiftTap}
            onTouchStart={handleRealityShiftTap}
            disabled={roomData.realityShiftLocked}
            className={`w-18 h-18 rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl transition-all active:scale-90 cursor-pointer ${
              roomData.realityShiftLocked
                ? 'bg-slate-800 border-slate-700 opacity-60'
                : isReality1
                ? 'bg-amber-500 active:bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/40'
                : 'bg-cyan-500 active:bg-cyan-400 text-slate-950 border-cyan-300 shadow-cyan-500/40'
            }`}
          >
            <Sparkles size={24} />
            <span className="text-[9px] font-mono font-bold uppercase mt-0.5 tracking-tighter">
              REALITY SHIFT
            </span>
          </button>

          {/* SPRINT Button (Hold to sprint) */}
          <button
            onMouseDown={handleSprintStart}
            onMouseUp={handleSprintEnd}
            onTouchStart={handleSprintStart}
            onTouchEnd={handleSprintEnd}
            onTouchCancel={handleSprintEnd}
            className={`w-16 h-14 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              isSprintHeld
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg scale-95'
                : 'bg-black/65 text-slate-200 border-white/20 active:scale-95'
            }`}
          >
            <Zap size={20} />
            <span className="text-[9px] font-mono uppercase mt-0.5 font-bold">SPRINT</span>
          </button>
        </div>
      </div>

      {/* 6. SCREEN DISTORTION & FLASH FOR REALITY TRANSITION */}
      {roomData.realityShiftLocked && (
        <div className="absolute inset-0 pointer-events-none bg-cyan-400/15 mix-blend-screen backdrop-invert backdrop-blur-[2px] animate-pulse transition-opacity duration-150" />
      )}
    </div>
  );
};
