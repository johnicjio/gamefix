import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { Multiplayer } from './components/Multiplayer';
import { UI } from './components/UI';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <div className="app-container">
      {!gameStarted && (
        <Multiplayer onGameStart={() => setGameStarted(true)} />
      )}
      {gameStarted && (
        <>
          <Canvas
            shadows
            camera={{ position: [0, 20, 20], fov: 50 }}
            gl={{ antialias: true }}
          >
            <Scene />
          </Canvas>
          <UI />
        </>
      )}
    </div>
  );
}

export default App;