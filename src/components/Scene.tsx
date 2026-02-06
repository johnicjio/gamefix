import { Suspense } from 'react';
import { OrbitControls, Environment } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import { Board } from './Board';
import { Dice } from './Dice';
import { Pieces } from './Pieces';

export function Scene() {
  return (
    <>
      {/* Lighting */}
      <Environment preset="city" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <ambientLight intensity={0.5} />

      {/* Camera Controls */}
      <OrbitControls
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enablePan={false}
        target={[0, 0, 0]}
      />

      {/* Game Objects */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -30, 0]} iterations={20}>
          <Board />
          <Dice />
          <Pieces />
        </Physics>
      </Suspense>
    </>
  );
}