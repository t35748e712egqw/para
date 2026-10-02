import React, { useState } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GameSettings } from '../types/game';
import { 
  Play, 
  RotateCcw, 
  Sliders, 
  HelpCircle, 
  Home,
  X,
  Smartphone
} from 'lucide-react';

interface PauseMenuProps {
  engine: GameEngine;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  engine,
  onResume,
  onRestart,
  onMainMenu,
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'controls'>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...engine.settings });

  const handleSettingChange = (patch: Partial<GameSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    engine.updateSettings(patch);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
          <div>
            <h2 className="text-sm font-mono font-bold tracking-widest text-cyan-400 uppercase">
              PARADOX ROOM // PAUSED
            </h2>
            <p className="text-xs text-slate-400">Android Mobile Touch Controller</p>
          </div>
          <button
            onClick={onResume}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Resume"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 px-6 bg-slate-950">
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Touch Controls
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {/* TAB 1: Core Menu Actions */}
          {activeTab === 'menu' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={onResume}
                className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.99] text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
              >
                <Play size={16} />
                RESUME GAMEPLAY
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
              >
                <Sliders size={15} />
                TOUCH SENSITIVITY & AUDIO
              </button>

              <button
                onClick={onRestart}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw size={15} />
                RESTART ROOM 02
              </button>

              <button
                onClick={onMainMenu}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-red-950/40 text-slate-400 hover:text-red-300 font-medium text-xs flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
              >
                <Home size={15} />
                MAIN MENU
              </button>
            </div>
          )}

          {/* TAB 2: Mobile Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4 text-xs">
              {/* Touch Drag Sensitivity */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Touch Look Sensitivity</span>
                  <span className="font-mono text-cyan-400">{settings.touchSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={settings.touchSensitivity}
                  onChange={(e) => handleSettingChange({ touchSensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Volume */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Audio Volume</span>
                  <span className="font-mono text-cyan-400">{Math.round(settings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => handleSettingChange({ volume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-2 border-t border-slate-800">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 cursor-pointer hover:bg-slate-850">
                  <span className="text-slate-300">Invert Vertical Look (Y-Axis)</span>
                  <input
                    type="checkbox"
                    checked={settings.invertY}
                    onChange={(e) => handleSettingChange({ invertY: e.target.checked })}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 cursor-pointer hover:bg-slate-850">
                  <span className="text-slate-300">Touch Haptic Vibration</span>
                  <input
                    type="checkbox"
                    checked={settings.vibration}
                    onChange={(e) => handleSettingChange({ vibration: e.target.checked })}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 cursor-pointer hover:bg-slate-850">
                  <span className="text-slate-300">Camera Head Bobbing</span>
                  <input
                    type="checkbox"
                    checked={settings.headBobbing}
                    onChange={(e) => handleSettingChange({ headBobbing: e.target.checked })}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Touch Controls Reference */}
          {activeTab === 'controls' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold mb-1">
                <Smartphone size={16} />
                <span>TOUCHSCREEN CONTROLS:</span>
              </div>

              <div className="space-y-2 text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-white">Left Virtual Joystick</span>
                  <span className="text-cyan-300">Move (Smooth analog direction)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-white">Right Touch Drag</span>
                  <span className="text-cyan-300">First-Person Camera Look</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-white">Contextual INTERACT</span>
                  <span className="text-cyan-300">Tap to activate targeted puzzle object</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-white">REALITY SHIFT</span>
                  <span className="text-amber-300">Tap to switch between Reality 1 and 2</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-white">SPRINT Button</span>
                  <span className="text-emerald-300">Hold to sprint (1.5x speed)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-white">Pause Button</span>
                  <span className="text-slate-400">Top-right icon to pause</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
