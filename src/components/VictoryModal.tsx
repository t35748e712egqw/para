import React from 'react';
import { Room02Data } from '../types/game';
import { CheckCircle2, RotateCcw, Home, Sparkles, Clock, ShieldCheck, Zap } from 'lucide-react';

interface VictoryModalProps {
  roomData: Room02Data;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  roomData,
  onRestart,
  onMainMenu,
}) => {
  const formatTime = (secs: number | null) => {
    if (secs === null) return '00:00';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 text-center">
        {/* Glow Header */}
        <div className="p-6 bg-gradient-to-b from-cyan-950/40 to-slate-950 border-b border-cyan-500/20 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-3 shadow-[0_0_20px_#06b6d4]">
            <CheckCircle2 size={32} />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
            CHAMBER 02 COMPLETE
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            ROOM CLEARED
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reality Layer Stabilized · The Invisible Bridge Crossed
          </p>
        </div>

        {/* Results Stats */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
              <Clock size={16} className="text-cyan-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Time</span>
              <span className="font-mono text-sm font-bold text-white mt-0.5">
                {formatTime(roomData.completionTime)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
              <Sparkles size={16} className="text-amber-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Shifts</span>
              <span className="font-mono text-sm font-bold text-white mt-0.5">
                {roomData.shiftCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
              <ShieldCheck size={16} className="text-emerald-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Falls</span>
              <span className="font-mono text-sm font-bold text-white mt-0.5">
                {roomData.fallsCount}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-left text-xs text-slate-300">
            <span className="font-mono text-cyan-400 font-bold block mb-1">
              PARADOX LOG SUMMARY:
            </span>
            You successfully discovered the Reality Terminal, identified the phase divergence between Reality 1 and Reality 2, and synchronized the cross-dimensional bridge mechanism to reach the exit portal.
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onRestart}
              className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.99] text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all"
            >
              <RotateCcw size={16} />
              RESTART CHAMBER 02
            </button>

            <button
              onClick={onMainMenu}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 border border-slate-800 transition-colors"
            >
              <Home size={15} />
              RETURN TO MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
