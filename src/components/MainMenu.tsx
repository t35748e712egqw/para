import React, { useState } from 'react';
import { GameEngine } from '../core/GameEngine';
import { Play, HelpCircle, Sparkles, Smartphone, Hand, Zap, Layers, Info } from 'lucide-react';

interface MainMenuProps {
  engine: GameEngine;
  onStartGame: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [showControls, setShowControls] = useState(false);

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col justify-between p-6 md:p-12 overflow-y-auto select-none touch-none font-sans">
      {/* Background Subtle Gradient & Grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-black to-black pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d40a_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
            <Sparkles size={18} />
          </div>
          <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
            PARADOX RESEARCH FACILITY
          </span>
        </div>
        <div className="text-right flex items-center gap-3">
          <span className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/50 border border-cyan-500/30 px-3 py-1 rounded-lg">
            ANDROID MOBILE · 3D FIRST-PERSON
          </span>
        </div>
      </div>

      {/* Hero Brand Section */}
      <div className="relative z-10 max-w-2xl my-auto py-8">
        <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase block mb-2">
          Touchscreen 3D Puzzle Game
        </span>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2">
          PARADOX ROOM
        </h1>
        <p className="text-sm font-mono text-cyan-300 italic mb-5">
          "Different Eyes. Same World. One Escape."
        </p>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8 max-w-xl">
          Enter Test Chamber 02: The Invisible Bridge.
          Navigate the chamber using smooth dual-touch controls.
          Switch between Reality 1 and Reality 2 to uncover hidden mechanisms and cross the quantum chasm.
        </p>

        {/* Start Game Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={onStartGame}
            onTouchStart={onStartGame}
            className="py-4 px-8 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 transition-all cursor-pointer"
          >
            <Play size={18} />
            START ROOM 02: THE INVISIBLE BRIDGE
          </button>

          <button
            onClick={() => setShowControls(true)}
            onTouchStart={() => setShowControls(true)}
            className="py-4 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <HelpCircle size={16} />
            HOW TO PLAY
          </button>
        </div>

        {/* Device Badges */}
        <div className="flex items-center gap-6 mt-8 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Smartphone size={15} className="text-cyan-400" />
            Designed for Landscape Android Touchscreen
          </span>
          <span className="flex items-center gap-1.5">
            <Layers size={15} className="text-amber-400" />
            Dual-Reality Quantum Shifting
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
        <span>Room 02 — The Invisible Bridge</span>
        <span>Pure Touchscreen Virtual Joystick & Isolated Touch Camera</span>
      </div>

      {/* Touch Controls Modal */}
      {showControls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Smartphone size={18} />
                <h3 className="font-mono text-sm font-bold uppercase">
                  TOUCHSCREEN CONTROLS
                </h3>
              </div>
              <button
                onClick={() => setShowControls(false)}
                className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Left Virtual Joystick</h4>
                  <p className="text-slate-300">Drag your left thumb in any direction to walk. Releasing smoothly stops movement without sliding.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Play size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Right Touch Drag (Camera)</h4>
                  <p className="text-slate-300">Swipe on the right side of the screen to rotate your view horizontally and vertically.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Hand size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Contextual INTERACT Button</h4>
                  <p className="text-slate-300">When looking at a puzzle object within range, the INTERACT button activates. Tap to operate terminals, levers, and doors.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-0.5">REALITY SHIFT Button</h4>
                  <p className="text-slate-300">Tap to toggle between Reality 1 and Reality 2. Different puzzle objects only exist in one reality layer!</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-0.5">SPRINT Button</h4>
                  <p className="text-slate-300">Hold to sprint at approximately 1.5x walking speed while moving.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowControls(false)}
              className="mt-5 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
