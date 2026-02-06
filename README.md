# 🎲 3D Ludo King - WebGL Multiplayer

A production-ready, "Ludo King" style 3D multiplayer board game built with React Three Fiber, physics simulation, and real-time WebRTC networking.

![Ludo King 3D](https://img.shields.io/badge/WebGL-3D_Graphics-990000?style=for-the-badge&logo=webgl)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)
![Three.js](https://img.shields.io/badge/Three.js-0.160-000000?style=for-the-badge&logo=three.js)

## ✨ Features

### 🎮 Game Features
- **3D Graphics**: Full WebGL rendering with React Three Fiber
- **Physics Simulation**: Real dice physics using Cannon.js
- **Multiplayer**: Peer-to-peer WebRTC networking with PeerJS
- **Smooth Animations**: Parabolic piece movement with 300ms transitions
- **Procedural Generation**: All textures and geometries generated in code
- **Production Ready**: Optimized bundle splitting and performance

### 💻 Technical Highlights
- **No External Assets**: 100% procedural textures using CanvasTexture
- **Physics Authority**: Host-based physics for deterministic gameplay
- **Low Latency**: Optimized WebRTC data payloads
- **State Management**: Zustand for predictable game state
- **Type Safety**: Full TypeScript coverage
- **Responsive**: Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

```json
{
  "rendering": "React Three Fiber (R3F)",
  "physics": "@react-three/cannon (Cannon.js)",
  "3d-helpers": "@react-three/drei",
  "networking": "PeerJS (WebRTC)",
  "state": "Zustand",
  "language": "TypeScript",
  "bundler": "Vite"
}
```

## 📐 Architecture

### File Structure
```
src/
├── store.ts              # Zustand game state
├── App.tsx               # Main application
├── main.tsx              # Entry point
└── components/
    ├── Scene.tsx         # R3F Canvas setup
    ├── Board.tsx         # Procedural board generation
    ├── Dice.tsx          # Physics-based dice with face detection
    ├── Pieces.tsx        # Animated game pieces
    ├── Multiplayer.tsx   # PeerJS connection handling
    └── UI.tsx            # Game UI overlay
```

### Networking Protocol

**Host/Join System:**
- **Host**: Acts as physics authority (calculates dice rolls)
- **Client**: Receives and applies state updates

**Message Types:**
```typescript
{ type: 'INIT', color: 'red' | 'green' }
{ type: 'ROLL', value: 1-6 }
{ type: 'MOVE', pieceId: string, targetPosition: number }
{ type: 'TURN', color: PlayerColor }
```

## 🎯 Game Rules

### Movement
1. **Entry**: Roll a 6 to bring a piece from yard to start
2. **Movement**: Move pieces based on dice value
3. **Bonus Turn**: Rolling 6 gives another turn
4. **Capture**: Landing on opponent sends them back to yard
5. **Safe Zones**: Star cells and colored cells are safe
6. **Home Stretch**: Last 5 cells leading to center
7. **Win**: Get all 4 pieces to center

### Physics
- Dice uses real 3D physics simulation
- Random impulse (upward force) + angular velocity (spin)
- Face detection using quaternion math
- Settles when velocity < 0.1

### Animations
- **Piece Movement**: Parabolic hop (sine wave on Y-axis)
- **Duration**: 300ms per hop
- **Interpolation**: Linear for X/Z, sinusoidal for Y

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/johnicjio/gamefix.git
cd gamefix

# Install dependencies
npm install
```

### Development
```bash
# Start dev server
npm run dev

# Open http://localhost:5173
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎮 How to Play

### Setup
1. **Player 1 (Host)**:
   - Open the game
   - Copy your Player ID
   - Share with Player 2
   - Wait for connection

2. **Player 2 (Client)**:
   - Open the game
   - Paste Player 1's ID
   - Click "Connect"
   - Wait for Player 1 to start

3. **Start Game**: Host clicks "Start Game"

### Gameplay
1. Click the dice when it's your turn
2. Wait for dice to settle
3. Click a piece to move it
4. First to get all 4 pieces home wins!

## 🔧 Advanced Features

### Procedural Texture Generation
```typescript
// Dice faces generated via Canvas API
function createDiceFace(number: 1-6): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // Draw white background + black dots
  // Returns CanvasTexture (no image files needed)
}
```

### Physics-Based Dice
```typescript
// Cannon.js physics body
const [ref, api] = useBox(() => ({
  mass: 1,
  position: [8, 3, 8],
  args: [1, 1, 1],
  material: { friction: 0.4, restitution: 0.3 }
}));

// Apply random impulse
api.applyImpulse([random(), 8, random()], [0, 0, 0]);
api.applyAngularImpulse([random(), random(), random()], [0, 0, 0]);
```

### Face Detection Algorithm
```typescript
// Determine which face is "up" using quaternions
const up = new THREE.Vector3(0, 1, 0);
const faces = [/* 6 face normals */];

faces.forEach((face) => {
  face.applyQuaternion(diceQuaternion);
  const dot = face.dot(up);
  if (dot > maxDot) {
    upFace = faceIndex;
  }
});
```

### Parabolic Movement
```typescript
// Smooth piece animation with jump
const x = lerp(startX, targetX, t);
const z = lerp(startZ, targetZ, t);
const y = baseY + Math.sin(t * Math.PI) * jumpHeight;

mesh.position.set(x, y, z);
```

## 🎨 Visual Features

### Lighting
- **Environment**: HDR city preset for realistic reflections
- **Directional Light**: Shadows enabled (1024x1024 shadow map)
- **Ambient Light**: Soft fill lighting

### Materials
- **Board**: MeshStandardMaterial with low roughness
- **Pieces**: Glossy plastic look (roughness: 0.1, metalness: 0.1)
- **Dice**: Procedural dot textures on white base

### Camera
- Orthographic/Perspective at [0, 20, 20]
- OrbitControls restricted to prevent under-board view
- maxPolarAngle limited to 2.5 radians

## 📊 Performance

### Optimizations
- **Code Splitting**: Three.js and React-Three in separate chunks
- **Memoization**: Textures generated once with useMemo
- **Bundle Size**: ~300KB gzipped (including Three.js)
- **Frame Rate**: 60fps on modern devices
- **Physics**: 20 iterations per frame for stability

### Build Output
```
dist/
├── index.html
├── assets/
    ├── index-[hash].js      (~200KB)
    ├── three-[hash].js      (~500KB)
    └── react-three-[hash].js (~150KB)
```

## 🐛 Known Limitations

1. **2 Players Only**: Currently supports Red vs Green
2. **No AI**: Requires 2 human players
3. **Browser Support**: Requires WebGL 2.0 and WebRTC
4. **Network**: Direct peer connection (may require TURN server for some NATs)

## 🛣️ Roadmap

- [ ] 4-player support (Red, Green, Yellow, Blue)
- [ ] AI opponent with minimax algorithm
- [ ] Game replay system
- [ ] Mobile touch controls optimization
- [ ] Sound effects and music
- [ ] Game statistics and leaderboard
- [ ] Custom board themes
- [ ] Tournament mode

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - See LICENSE file for details

## 👏 Credits

**Built with:**
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
- [Three.js](https://threejs.org/) - 3D graphics library
- [Cannon.js](https://github.com/pmndrs/cannon-es) - Physics engine
- [PeerJS](https://peerjs.com/) - WebRTC wrapper
- [Zustand](https://github.com/pmndrs/zustand) - State management

**Inspired by:** Ludo King by Gametion Technologies

---

**Made with ❤️ and WebGL**

*For issues or questions, open a GitHub issue or contact the maintainer.*