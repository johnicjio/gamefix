# 🎮 GameFix - Multiplayer Gaming Arena

A serverless peer-to-peer multiplayer gaming platform featuring classic board games built with React, TypeScript, and WebRTC.

## 🎲 Games Available

### 1. Ludo
- Classic board game with dice rolls
- 2 players (Red vs Blue)
- Race your pieces around the board to reach home
- Strategic gameplay with dice-based movement

### 2. Tic Tac Toe
- Quick strategic game of X's and O's
- 2 players
- First to get three in a row wins
- Classic and timeless

### 3. Rock Paper Scissors
- Best of 5 rounds
- 2 players
- Simultaneous choice revelation
- First to 3 wins takes the match

### 4. Snake & Ladders
- 100-square board adventure
- 2 players
- Climb ladders, avoid snakes
- Race to square 100!

## 🚀 Features

- **Serverless Architecture**: No backend required, fully peer-to-peer using WebRTC
- **Real-time Multiplayer**: Instant synchronization between players
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Easy Connection**: Share your Player ID to connect with friends
- **Mobile Friendly**: Fully responsive for all devices

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **P2P**: PeerJS (WebRTC wrapper)
- **Build Tool**: Vite
- **Styling**: Custom CSS with modern gradients and animations
- **Deployment**: Vercel

## 🎯 How to Play

1. **Choose a Game**: Select from the four available games on the lobby screen
2. **Get Your Player ID**: Your unique ID will be generated automatically
3. **Share ID**: Send your Player ID to a friend
4. **Connect**: Enter your friend's Player ID
5. **Play**: Start playing once connected!

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment

The app is deployed on Vercel at: [gamefix.vercel.app](https://gamefix.vercel.app)

## 🎮 Game Rules

### Ludo
- Roll a 6 to bring a piece onto the board
- Move pieces according to dice roll
- Roll a 6 to get another turn
- First to get all 4 pieces home wins

### Tic Tac Toe
- Take turns placing X or O
- Get three in a row (horizontal, vertical, or diagonal) to win
- If all cells are filled with no winner, it's a draw

### Rock Paper Scissors
- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock
- First to win 3 rounds wins the match

### Snake & Ladders
- Roll dice to move forward
- Land on a ladder to climb up
- Land on a snake to slide down
- First to reach square 100 wins

## 🔧 Architecture

- **Peer-to-Peer Communication**: Uses PeerJS for WebRTC data channels
- **State Synchronization**: Game state synced between peers in real-time
- **No Backend Required**: Completely serverless, only PeerJS signaling server used
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 📝 License

MIT License - Feel free to use this project for learning and fun!

## 👏 Credits

Built with ❤️ using React, TypeScript, and WebRTC

---

**Enjoy gaming with friends! 🎮🎉**