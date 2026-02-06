import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import * as THREE from 'three';
import { useGameStore } from '../store';

// Generate dice face textures procedurally
function createDiceFace(number: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 128, 128);
  
  // Black dots
  ctx.fillStyle = '#000000';
  const dotRadius = 10;
  const positions: { [key: number]: Array<[number, number]> } = {
    1: [[64, 64]],
    2: [[32, 32], [96, 96]],
    3: [[32, 32], [64, 64], [96, 96]],
    4: [[32, 32], [96, 32], [32, 96], [96, 96]],
    5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]],
    6: [[32, 32], [96, 32], [32, 64], [96, 64], [32, 96], [96, 96]]
  };
  
  positions[number].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function Dice() {
  const { rollingDice, setDiceValue, setCanRoll, setRollingDice, canRoll, isHost, currentTurn, myColor } = useGameStore();
  
  const [ref, api] = useBox(() => ({
    mass: 1,
    position: [8, 3, 8],
    args: [1, 1, 1],
    material: { friction: 0.4, restitution: 0.3 }
  }));

  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const angularVelRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const quaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasSettled = useRef(false);

  // Generate textures once
  const materials = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((num) => 
      new THREE.MeshStandardMaterial({
        map: createDiceFace(num),
        roughness: 0.1,
        metalness: 0.1
      })
    );
  }, []);

  useEffect(() => {
    const unsubVel = api.velocity.subscribe((v) => velocityRef.current.set(v[0], v[1], v[2]));
    const unsubAngVel = api.angularVelocity.subscribe((v) => angularVelRef.current.set(v[0], v[1], v[2]));
    const unsubQuat = api.quaternion.subscribe((q) => quaternionRef.current.set(q[0], q[1], q[2], q[3]));
    
    return () => {
      unsubVel();
      unsubAngVel();
      unsubQuat();
    };
  }, [api]);

  useEffect(() => {
    if (rollingDice && isHost) {
      hasSettled.current = false;
      // Apply random impulse and spin
      api.position.set(8, 3, 8);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      
      setTimeout(() => {
        api.applyImpulse([Math.random() * 2 - 1, 8, Math.random() * 2 - 1], [0, 0, 0]);
        api.applyAngularImpulse([
          Math.random() * 20 - 10,
          Math.random() * 20 - 10,
          Math.random() * 20 - 10
        ], [0, 0, 0]);
      }, 50);
    }
  }, [rollingDice, api, isHost]);

  useFrame(() => {
    if (rollingDice && !hasSettled.current) {
      const vel = velocityRef.current.length();
      const angVel = angularVelRef.current.length();
      
      // Check if dice has settled
      if (vel < 0.1 && angVel < 0.1) {
        hasSettled.current = true;
        
        // Determine which face is up
        const up = new THREE.Vector3(0, 1, 0);
        const faces = [
          new THREE.Vector3(1, 0, 0),   // 1
          new THREE.Vector3(-1, 0, 0),  // 2
          new THREE.Vector3(0, 1, 0),   // 3
          new THREE.Vector3(0, -1, 0),  // 4
          new THREE.Vector3(0, 0, 1),   // 5
          new THREE.Vector3(0, 0, -1),  // 6
        ];
        
        let maxDot = -1;
        let faceIndex = 0;
        
        faces.forEach((face, i) => {
          face.applyQuaternion(quaternionRef.current);
          const dot = face.dot(up);
          if (dot > maxDot) {
            maxDot = dot;
            faceIndex = i;
          }
        });
        
        const result = faceIndex + 1;
        setDiceValue(result);
        setRollingDice(false);
        
        // If rolled 6, player gets another turn, otherwise next player
        if (result !== 6) {
          setCanRoll(false);
        }
      }
    }
  });

  const canRollDice = canRoll && currentTurn === myColor && !rollingDice;

  return (
    <mesh
      ref={ref as any}
      castShadow
      onClick={() => {
        if (canRollDice && isHost) {
          setRollingDice(true);
        }
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      {materials.map((mat, i) => (
        <primitive key={i} object={mat} attach={`material-${i}`} />
      ))}
    </mesh>
  );
}