import React, { useState, useEffect, useMemo } from 'react';
import { GameEngine } from './core/GameEngine';
import { GameState, Room02Data } from './types/game';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { PauseMenu } from './components/PauseMenu';
import { VictoryModal } from './components/VictoryModal';
import { MainMenu } from './components/MainMenu';

export default function App() {
  const [activeScene, setActiveScene] = useState<'MainMenu' | 'Room02' | 'WinScreen'>('MainMenu');

  // Instantiate singleton engine
  const engine = useMemo(() => new GameEngine(), []);
  const [roomData, setRoomData] = useState<Room02Data>(engine.getStateSnapshot());

  // Subscribe to engine state
  useEffect(() => {
    const unsubscribe = engine.subscribe((data) => {
      setRoomData(data);
      if (data.gameState === GameState.Won && activeScene !== 'WinScreen') {
        setActiveScene('WinScreen');
      }
    });

    return () => {
      unsubscribe();
      engine.destroy();
    };
  }, [engine, activeScene]);

  const handleStartGame = () => {
    setActiveScene('Room02');
    engine.restartRoom();
  };

  const handleRestartRoom = () => {
    setActiveScene('Room02');
    engine.restartRoom();
  };

  const handleMainMenu = () => {
    setActiveScene('MainMenu');
    engine.gameState = GameState.Loading;
    engine.inputManager.resetAllInputs();
  };

  const handleResume = () => {
    engine.resumeGame();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none font-sans">
      {/* 1. SCENE 1: MAIN MENU */}
      {activeScene === 'MainMenu' && (
        <MainMenu engine={engine} onStartGame={handleStartGame} />
      )}

      {/* 2. SCENE 2: ROOM 02 3D ENVIRONMENT */}
      {(activeScene === 'Room02' || activeScene === 'WinScreen') && (
        <div className="relative w-full h-full">
          <GameCanvas engine={engine} />

          {/* Android Mobile HUD Overlay (Always active during Room02 play) */}
          <HUD engine={engine} roomData={roomData} />

          {/* Pause Menu Modal */}
          {roomData.gameState === GameState.Paused && (
            <PauseMenu
              engine={engine}
              onResume={handleResume}
              onRestart={handleRestartRoom}
              onMainMenu={handleMainMenu}
            />
          )}

          {/* 3. SCENE 3: WIN SCREEN / RESULTS MODAL */}
          {(roomData.gameState === GameState.Won || activeScene === 'WinScreen') && (
            <VictoryModal
              roomData={roomData}
              onRestart={handleRestartRoom}
              onMainMenu={handleMainMenu}
            />
          )}
        </div>
      )}
    </main>
  );
}
