import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw,
  Volume2, 
  VolumeX, 
  Trophy, 
  Gamepad2, 
  Keyboard, 
  Sparkles,
  Music,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  Maximize,
  Minimize
} from 'lucide-react';

const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
  [[1, 0, 0], [1, 1, 1]], // L
  [[0, 0, 1], [1, 1, 1]], // J
  [[0, 1, 0], [1, 1, 1]]  // T
];

// Colors adapted to a glowing Waveframe-like palette
const COLORS = [
  '#06b6d4', // cyan (Primary Accent 1)
  '#eab308', // yellow
  '#10b981', // green
  '#ef4444', // red
  '#f97316', // orange
  '#3b82f6', // blue
  '#a855f7'  // purple (Primary Accent 2)
];

const TRANSLATIONS = {
  es: {
    bgMusic: "Música de Fondo",
    score: "PUNTOS",
    lines: "LÍNEAS",
    level: "NIVEL",
    next: "SIGUIENTE",
    readyToPlay: "¿Listo para Jugar?",
    startBtn: "Iniciar Juego",
    paused: "Juego Pausado",
    pausedDesc: "Tómate un respiro y regresa cuando quieras.",
    resumeBtn: "Reanudar Juego",
    gameOver: "Fin del Juego",
    finalScoreDesc: "Tu puntuación final es de:",
    newRecord: "¡Nuevo Récord!",
    enterName: "Ingresa tu nombre",
    saveScoreBtn: "Guardar Puntuación",
    playAgainBtn: "Jugar de Nuevo",
    pauseGameBtn: "Pausar Juego",
    resetBtn: "Reiniciar",
    controls: "Controles",
    records: "Récords",
    muteTip: "Silenciar",
    unmuteTip: "Activar sonido",
    ctrlMove: "Mover Pieza",
    ctrlSoft: "Caída Suave",
    ctrlRotate: "Rotar Pieza",
    ctrlHard: "Caída Rápida",
    ctrlPause: "Pausar"
  },
  en: {
    bgMusic: "Background Music",
    score: "SCORE",
    lines: "LINES",
    level: "LEVEL",
    next: "NEXT",
    readyToPlay: "Ready to Play?",
    startBtn: "Start Game",
    paused: "Game Paused",
    pausedDesc: "Take a break and return whenever you want.",
    resumeBtn: "Resume Game",
    gameOver: "Game Over",
    finalScoreDesc: "Your final score is:",
    newRecord: "New Record!",
    enterName: "Enter your name",
    saveScoreBtn: "Save Score",
    playAgainBtn: "Play Again",
    pauseGameBtn: "Pause Game",
    resetBtn: "Reset",
    controls: "Controls",
    records: "Leaderboard",
    muteTip: "Mute",
    unmuteTip: "Unmute",
    ctrlMove: "Move Piece",
    ctrlSoft: "Soft Drop",
    ctrlRotate: "Rotate Piece",
    ctrlHard: "Hard Drop",
    ctrlPause: "Pause"
  }
};

export default function App() {
  // Language configuration
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('tetrisLang') || 'es';
  });

  const t = TRANSLATIONS[lang];

  // Game states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  
  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);
  
  // Leaderboard & Player name input
  const [leaderboard, setLeaderboard] = useState([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');

  // Canvas refs
  const canvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const mobileNextCanvasRef = useRef(null);
  const audioRef = useRef(null);

  // Core Tetris state refs (to bypass closure issues in event listeners & loops)
  const boardRef = useRef(Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0)));
  const currentPieceRef = useRef(null);
  const nextPieceRef = useRef(null);
  const gameIntervalRef = useRef(null);

  // Load leaderboard on mount
  useEffect(() => {
    const saved = localStorage.getItem('tetrisLeaderboard');
    if (saved) {
      setLeaderboard(JSON.parse(saved));
    } else {
      const defaultScores = [
        { name: 'WAVEFRAME', score: 10000 },
        { name: 'NEXUS', score: 7500 },
        { name: 'ANTIGRAV', score: 5000 },
        { name: 'KINETIC', score: 2500 },
        { name: 'CYPHER', score: 1000 }
      ];
      localStorage.setItem('tetrisLeaderboard', JSON.stringify(defaultScores));
      setLeaderboard(defaultScores);
    }
  }, []);

  // Fullscreen state & listener
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Audio Play/Pause helper
  const handleAudioPlayback = useCallback((shouldPlay) => {
    if (!audioRef.current) return;
    if (shouldPlay && !isMuted) {
      audioRef.current.play().catch(err => console.log('Audio autoplay blocked or waiting for user interaction:', err));
    } else {
      audioRef.current.pause();
    }
  }, [isMuted]);

  // Generate new piece
  const createNewPiece = (shapeIndex = null) => {
    const idx = shapeIndex !== null ? shapeIndex : Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[idx];
    return {
      shape,
      color: COLORS[idx],
      x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
      y: 0
    };
  };

  // Movement & Collision Check
  const checkCollision = (piece, board, offsetX, offsetY, newShape = null) => {
    const shape = newShape || piece.shape;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const nextX = piece.x + x + offsetX;
          const nextY = piece.y + y + offsetY;
          if (nextX < 0 || nextX >= BOARD_WIDTH || nextY >= BOARD_HEIGHT) {
            return true;
          }
          if (nextY >= 0 && board[nextY][nextX]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Calculate Ghost Piece position (where it will land)
  const getGhostY = useCallback((piece, board) => {
    if (!piece) return 0;
    let ghostY = piece.y;
    while (!checkCollision(piece, board, 0, ghostY - piece.y + 1)) {
      ghostY++;
    }
    return ghostY;
  }, []);

  // Drawing Function
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const board = boardRef.current;
    const currentPiece = currentPieceRef.current;

    // Draw background with subtle neon gridlines
    ctx.fillStyle = '#0b0a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Board Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_WIDTH; i++) {
      ctx.beginPath();
      ctx.moveTo(i * BLOCK_SIZE, 0);
      ctx.lineTo(i * BLOCK_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < BOARD_HEIGHT; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * BLOCK_SIZE);
      ctx.lineTo(canvas.width, j * BLOCK_SIZE);
      ctx.stroke();
    }

    // Draw Board settled pieces
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[y][x]) {
          drawBlock(ctx, x, y, board[y][x]);
        }
      }
    }

    if (currentPiece) {
      // 1. Draw Ghost Piece (where the piece will land)
      const ghostY = getGhostY(currentPiece, board);
      if (ghostY > currentPiece.y) {
        drawBlock(ctx, currentPiece.x, ghostY, currentPiece.color, true, currentPiece.shape);
      }

      // 2. Draw Active Piece
      drawBlock(ctx, currentPiece.x, currentPiece.y, currentPiece.color, false, currentPiece.shape);
    }
  }, [getGhostY]);

  // Draw single block or full piece shape on the canvas
  const drawBlock = (ctx, x, y, color, isGhost = false, shape = null) => {
    const drawSingle = (bx, by) => {
      ctx.save();
      if (isGhost) {
        // Ghost representation: empty with colored neon border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx * BLOCK_SIZE + 2, by * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
        ctx.fillStyle = `${color}1a`; // very translucent fill
        ctx.fillRect(bx * BLOCK_SIZE + 2, by * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      } else {
        // Active piece: gradient block with rounded borders
        const gradient = ctx.createLinearGradient(
          bx * BLOCK_SIZE, 
          by * BLOCK_SIZE, 
          (bx + 1) * BLOCK_SIZE, 
          (by + 1) * BLOCK_SIZE
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColorBrightness(color, -30));
        ctx.fillStyle = gradient;
        
        // Draw slightly rounded rectangle block
        const radius = 4;
        const rx = bx * BLOCK_SIZE + 1;
        const ry = by * BLOCK_SIZE + 1;
        const rw = BLOCK_SIZE - 2;
        const rh = BLOCK_SIZE - 2;

        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh - radius);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();

        // Inner highlight for a 3D glass look
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx + 2, ry + rh - 2);
        ctx.lineTo(rx + 2, ry + 2);
        ctx.lineTo(rx + rw - 2, ry + 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    if (shape) {
      for (let sy = 0; sy < shape.length; sy++) {
        for (let sx = 0; sx < shape[sy].length; sx++) {
          if (shape[sy][sx]) {
            drawSingle(x + sx, y + sy);
          }
        }
      }
    } else {
      drawSingle(x, y);
    }
  };

  // Helper to adjust color brightness for visual gradients
  const adjustColorBrightness = (hex, percent) => {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt((R * (100 + percent)) / 100);
    G = parseInt((G * (100 + percent)) / 100);
    B = parseInt((B * (100 + percent)) / 100);

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    R = R > 0 ? R : 0;
    G = G > 0 ? G : 0;
    B = B > 0 ? B : 0;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  // Draw Next Piece canvas
  const drawNextPiece = useCallback(() => {
    const drawToCanvas = (canvas, size) => {
      if (!canvas || !nextPieceRef.current) return;
      const ctx = canvas.getContext('2d');
      const nextPiece = nextPieceRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const offsetX = (canvas.width - nextPiece.shape[0].length * size) / 2;
      const offsetY = (canvas.height - nextPiece.shape.length * size) / 2;

      for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
          if (nextPiece.shape[y][x]) {
            ctx.save();
            const gradient = ctx.createLinearGradient(
              offsetX + x * size,
              offsetY + y * size,
              offsetX + (x + 1) * size,
              offsetY + (y + 1) * size
            );
            gradient.addColorStop(0, nextPiece.color);
            gradient.addColorStop(1, adjustColorBrightness(nextPiece.color, -30));

            ctx.fillStyle = gradient;
            ctx.shadowColor = nextPiece.color;
            ctx.shadowBlur = 6;
            ctx.fillRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
            ctx.restore();
          }
        }
      }
    };

    drawToCanvas(nextCanvasRef.current, 25);
    drawToCanvas(mobileNextCanvasRef.current, 9);
  }, []);

  // Merge current piece to board
  const mergePiece = () => {
    const board = boardRef.current;
    const piece = currentPieceRef.current;
    if (!piece) return;

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          if (piece.y + y >= 0) {
            board[piece.y + y][piece.x + x] = piece.color;
          }
        }
      }
    }
  };

  // Line Clear Checking
  const checkLines = () => {
    const board = boardRef.current;
    let linesCleared = 0;

    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (board[y].every(cell => cell !== 0)) {
        board.splice(y, 1);
        board.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        y++; // Check same index again since lines shifted down
      }
    }

    if (linesCleared > 0) {
      setLines(prev => {
        const newLines = prev + linesCleared;
        setLevel(Math.floor(newLines / 10) + 1);
        return newLines;
      });
      setScore(prev => prev + linesCleared * 100 * level);
    }
  };

  // Trigger game over flow
  const gameOver = useCallback(() => {
    setIsPlaying(false);
    setIsGameOver(true);
    handleAudioPlayback(false);

    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }

    const currentScore = score;
    // Check if score fits in top 10
    const lowestTopScore = leaderboard.length >= 10 ? leaderboard[9].score : 0;
    if (currentScore > lowestTopScore || leaderboard.length < 10) {
      setShowNameInput(true);
    }
  }, [score, leaderboard, handleAudioPlayback]);

  // Main game tick update
  const gameTick = useCallback(() => {
    if (isPaused || !isPlaying) return;

    const board = boardRef.current;
    const currentPiece = currentPieceRef.current;

    if (!currentPiece) return;

    if (!checkCollision(currentPiece, board, 0, 1)) {
      currentPiece.y++;
    } else {
      mergePiece();
      checkLines();

      // Cycle next piece
      currentPieceRef.current = nextPieceRef.current;
      nextPieceRef.current = createNewPiece();
      drawNextPiece();

      // Collision right at spawn means Game Over
      if (checkCollision(currentPieceRef.current, board, 0, 0)) {
        gameOver();
        return;
      }
    }
    drawGame();
  }, [isPaused, isPlaying, level, drawNextPiece, drawGame, gameOver]);

  // Adjust game loop speed on level changes
  useEffect(() => {
    if (isPlaying && !isPaused) {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      const delay = Math.max(100, 1000 - (level - 1) * 80);
      gameIntervalRef.current = setInterval(gameTick, delay);
    }
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, [isPlaying, isPaused, level, gameTick]);

  // Controls Handlers
  const moveLeft = () => {
    if (!isPlaying || isPaused) return;
    if (!checkCollision(currentPieceRef.current, boardRef.current, -1, 0)) {
      currentPieceRef.current.x--;
      drawGame();
    }
  };

  const moveRight = () => {
    if (!isPlaying || isPaused) return;
    if (!checkCollision(currentPieceRef.current, boardRef.current, 1, 0)) {
      currentPieceRef.current.x++;
      drawGame();
    }
  };

  const moveDown = () => {
    if (!isPlaying || isPaused) return;
    if (!checkCollision(currentPieceRef.current, boardRef.current, 0, 1)) {
      currentPieceRef.current.y++;
      setScore(prev => prev + 1);
      drawGame();
    }
  };

  const hardDrop = () => {
    if (!isPlaying || isPaused) return;
    const piece = currentPieceRef.current;
    const board = boardRef.current;
    
    let dropDist = 0;
    while (!checkCollision(piece, board, 0, dropDist + 1)) {
      dropDist++;
    }

    piece.y += dropDist;
    setScore(prev => prev + (dropDist * 2));
    
    // Lock piece immediately
    mergePiece();
    checkLines();

    currentPieceRef.current = nextPieceRef.current;
    nextPieceRef.current = createNewPiece();
    drawNextPiece();

    if (checkCollision(currentPieceRef.current, board, 0, 0)) {
      gameOver();
    } else {
      drawGame();
    }
  };

  const rotate = () => {
    if (!isPlaying || isPaused) return;
    const piece = currentPieceRef.current;
    const newShape = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );

    // Basic rotation check
    if (!checkCollision(piece, boardRef.current, 0, 0, newShape)) {
      piece.shape = newShape;
      drawGame();
    } else {
      // Wall kick logic: try moving left or right by 1 to accommodate rotation
      if (!checkCollision(piece, boardRef.current, -1, 0, newShape)) {
        piece.x--;
        piece.shape = newShape;
        drawGame();
      } else if (!checkCollision(piece, boardRef.current, 1, 0, newShape)) {
        piece.x++;
        piece.shape = newShape;
        drawGame();
      }
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || isPaused) return;

      switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          rotate();
          break;
        case 'Space':
          e.preventDefault();
          hardDrop();
          break;
        case 'KeyP':
          e.preventDefault();
          togglePause();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, level]);

  // Toggle Pause
  const togglePause = () => {
    setIsPaused(prev => {
      const nextPause = !prev;
      handleAudioPlayback(!nextPause);
      return nextPause;
    });
  };

  // Toggle Language
  const toggleLanguage = () => {
    setLang(prev => {
      const nextLang = prev === 'es' ? 'en' : 'es';
      localStorage.setItem('tetrisLang', nextLang);
      return nextLang;
    });
  };

  // Start / Reset Game
  const startNewGame = () => {
    boardRef.current = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);
    
    currentPieceRef.current = createNewPiece();
    nextPieceRef.current = createNewPiece();

    setIsPlaying(true);
    
    setTimeout(() => {
      drawGame();
      drawNextPiece();
      handleAudioPlayback(true);
    }, 50);
  };

  // Save new highscore
  const submitHighScore = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const newEntry = { name: playerName.toUpperCase().substring(0, 12), score };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(updated);
    localStorage.setItem('tetrisLeaderboard', JSON.stringify(updated));
    setShowNameInput(false);
    setPlayerName('');
  };

  return (
    <div className="app-container">
      {/* Background BGM Audio Element */}
      <audio ref={audioRef} src="/sound.wav" loop />

      {/* Header with Waveframe Logo and Neon Aesthetics */}
      <header className={`game-header ${isPlaying ? 'mobile-hide-header' : ''}`}>
        <div className="logo-container">
          <img src="/icon.png" className="logo-icon" alt="Waveframe Logo" />
          <h1 className="logo-title">
            Wave<span>Tris</span>
          </h1>
        </div>

        <div className="header-actions">
          <button 
            onClick={toggleFullscreen}
            className="mute-shortcut-btn"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <button 
            onClick={() => setIsMuted(prev => !prev)}
            className="mute-shortcut-btn"
            title={isMuted ? t.unmuteTip : t.muteTip}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button onClick={toggleLanguage} className="lang-btn">
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="game-layout">
        
        {/* Left Panel: Statistics and Next Piece */}
        <div className={`sidebar ${!isPlaying || isPaused || isGameOver ? 'mobile-hide-sidebar' : ''}`}>
          
          {/* Audio & Settings Card */}
          <div className="glass-panel">
            <h3 className="panel-title purple">
              <Music size={16} /> {t.bgMusic}
            </h3>
            <div className="audio-widget">
              <button 
                onClick={() => setIsMuted(prev => !prev)}
                className="audio-btn"
                title={isMuted ? t.unmuteTip : t.muteTip}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="audio-slider"
              />
            </div>
          </div>

          {/* Stats Card */}
          <div className="glass-panel">
            <div className="stats-display">
              <div className="stat-group">
                <div className="stat-label">{t.score}</div>
                <div className="stat-value large">
                  {score}
                </div>
              </div>
              
              <div className="stats-subgrid">
                <div className="stat-group">
                  <div className="stat-label">{t.lines}</div>
                  <div className="stat-value medium purple">{lines}</div>
                </div>
                <div className="stat-group">
                  <div className="stat-label">{t.level}</div>
                  <div className="stat-value medium amber">{level}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Piece Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 className="panel-title cyan" style={{ alignSelf: 'flex-start' }}>
              {t.next}
            </h3>
            <div className="next-piece-box">
              <canvas 
                ref={nextCanvasRef} 
                width="120" 
                height="120" 
              />
              <div className="next-piece-bg" />
            </div>
          </div>

        </div>

        {/* Center Panel: Main Board Canvas */}
        <div className="board-container">
          
          {/* Mobile HUD Top Bar */}
          <div className="mobile-hud-bar">
            <div className="mobile-hud-stat">
              <span className="mobile-hud-label">{t.score}</span>
              <span className="mobile-hud-val cyan">{score}</span>
            </div>
            <div className="mobile-hud-stat">
              <span className="mobile-hud-label">{t.lines}</span>
              <span className="mobile-hud-val purple">{lines}</span>
            </div>
            <div className="mobile-hud-stat">
              <span className="mobile-hud-label">{t.level}</span>
              <span className="mobile-hud-val amber">{level}</span>
            </div>
            <div className="mobile-hud-next">
              <span className="mobile-hud-label">{t.next}</span>
              <div className="mobile-next-canvas-wrapper">
                <canvas ref={mobileNextCanvasRef} width="44" height="44" />
              </div>
            </div>
            {isPlaying && (
              <div className="mobile-hud-actions">
                <button 
                  onClick={togglePause} 
                  className="mobile-action-icon"
                  title={t.pauseGameBtn}
                >
                  {isPaused ? <Play size={15} fill="white" /> : <Pause size={15} />}
                </button>
                <button 
                  onClick={() => setIsMuted(prev => !prev)} 
                  className="mobile-action-icon"
                  title={isMuted ? t.unmuteTip : t.muteTip}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              </div>
            )}
          </div>

          <div className="board-wrapper">
            <div className="board-inner">
              <canvas 
                ref={canvasRef} 
                width="300" 
                height="600" 
                className="board-canvas"
              />

              {/* Game overlays */}
              {!isPlaying && !isGameOver && (
                <div 
                  className="overlay start-overlay" 
                  onClick={startNewGame}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="overlay-badge">RETRO ARCADE</div>
                  <div className="overlay-icon-wrapper purple glow-pulse">
                    <Gamepad2 size={36} />
                  </div>
                  <h2 className="overlay-title brand-title">
                    Wave<span className="cyan-text">Tris</span>
                  </h2>
                  <p className="overlay-subtitle">
                    {lang === 'es' 
                      ? 'Alinea los bloques, completa líneas y acumula la máxima puntuación.' 
                      : 'Line up blocks, clear lines and achieve the ultimate high score.'}
                  </p>

                  <div className="start-control-hints">
                    <span className="hint-pill">🕹️ {t.ctrlMove}</span>
                    <span className="hint-pill">🔄 {t.ctrlRotate}</span>
                    <span className="hint-pill">⚡ {t.ctrlHard}</span>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); startNewGame(); }}
                    className="btn btn-primary big-start-btn"
                  >
                    <Play size={20} fill="white" /> {t.startBtn}
                  </button>
                  <div className="tap-start-text">
                    {lang === 'es' ? 'TOCA O PRESIONA ESPACIO PARA INICIAR' : 'TAP OR PRESS SPACE TO PLAY'}
                  </div>
                </div>
              )}

              {isPaused && (
                <div className="overlay">
                  <div className="overlay-icon-wrapper cyan">
                    <Pause size={32} />
                  </div>
                  <h2 className="overlay-title">
                    {t.paused}
                  </h2>
                  <p className="overlay-subtitle">
                    {t.pausedDesc}
                  </p>
                  <button 
                    onClick={togglePause}
                    className="btn btn-secondary"
                  >
                    <Play size={16} fill="white" /> {t.resumeBtn}
                  </button>
                </div>
              )}

              {isGameOver && (
                <div className="overlay">
                  <h2 className="overlay-title rose">
                    {t.gameOver}
                  </h2>
                  <p className="overlay-subtitle">{t.finalScoreDesc}</p>
                  <div className="score-display">{score}</div>

                  {showNameInput ? (
                    <form onSubmit={submitHighScore} className="highscore-form">
                      <div className="form-badge">
                        <Sparkles size={14} /> {t.newRecord}
                      </div>
                      <input 
                        type="text" 
                        placeholder={t.enterName}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        maxLength={10}
                        required
                        className="form-input"
                      />
                      <button 
                        type="submit"
                        className="btn btn-primary"
                      >
                        {t.saveScoreBtn}
                      </button>
                    </form>
                  ) : (
                    <button 
                      onClick={startNewGame}
                      className="btn btn-primary"
                    >
                      <RotateCcw size={16} /> {t.playAgainBtn}
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Quick game overlay controls for playing */}
          {isPlaying && (
            <div className="in-game-controls">
              <button 
                onClick={togglePause}
                className="btn-icon-label"
              >
                <Pause size={14} /> {t.pauseGameBtn}
              </button>
              <button 
                onClick={startNewGame}
                className="btn-icon-label"
              >
                <RotateCcw size={14} /> {t.resetBtn}
              </button>
            </div>
          )}

          {/* Mobile Gamepad Layout */}
          {isPlaying && !isPaused && (
            <div className="mobile-gamepad">
              <div className="gamepad-direction">
                <button 
                  onClick={moveLeft}
                  onTouchStart={(e) => { e.preventDefault(); moveLeft(); }}
                  className="gamepad-btn btn-dir" 
                  aria-label="Left"
                >
                  <ArrowLeft size={22} />
                </button>
                <button 
                  onClick={moveDown}
                  onTouchStart={(e) => { e.preventDefault(); moveDown(); }}
                  className="gamepad-btn btn-dir" 
                  aria-label="Soft Drop"
                >
                  <ArrowDown size={22} />
                </button>
                <button 
                  onClick={moveRight}
                  onTouchStart={(e) => { e.preventDefault(); moveRight(); }}
                  className="gamepad-btn btn-dir" 
                  aria-label="Right"
                >
                  <ArrowRight size={22} />
                </button>
              </div>

              {/* Center GIRAR Button */}
              <button 
                onClick={rotate}
                onTouchStart={(e) => { e.preventDefault(); rotate(); }}
                className="gamepad-btn action-rotate" 
                aria-label="Girar Pieza"
                title="Girar Bloque"
              >
                <RotateCw size={26} />
                <span className="btn-subtext">GIRAR</span>
              </button>

              <div className="gamepad-actions">
                <button 
                  onClick={hardDrop}
                  onTouchStart={(e) => { e.preventDefault(); hardDrop(); }}
                  className="gamepad-btn action-drop" 
                  aria-label="Hard Drop"
                >
                  <ChevronsDown size={18} />
                  <span className="btn-subtext">DROP</span>
                </button>
                <button 
                  onClick={togglePause} 
                  className="gamepad-btn action-pause" 
                  title={t.pauseGameBtn}
                >
                  <Pause size={18} />
                  <span className="btn-subtext">PAUSA</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Panel: Controls & Leaderboard */}
        <div className="sidebar">
          
          {/* Controls Card */}
          <div className="glass-panel">
            <h3 className="panel-title cyan">
              <Keyboard size={16} /> {t.controls}
            </h3>
            <div className="controls-list">
              <div className="controls-row">
                <span>{t.ctrlMove}</span>
                <span className="control-key">← → / A D</span>
              </div>
              <div className="controls-row">
                <span>{t.ctrlSoft}</span>
                <span className="control-key">↓ / S</span>
              </div>
              <div className="controls-row">
                <span>{t.ctrlRotate}</span>
                <span className="control-key">↑ / W</span>
              </div>
              <div className="controls-row">
                <span>{t.ctrlHard}</span>
                <span className="control-key">Espacio / Space</span>
              </div>
              <div className="controls-row">
                <span>{t.ctrlPause}</span>
                <span className="control-key">P</span>
              </div>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="glass-panel">
            <h3 className="panel-title amber">
              <Trophy size={16} /> {t.records}
            </h3>
            <ul className="leaderboard-list">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <li 
                  key={index}
                  className={`leaderboard-item ${index === 0 ? 'top' : ''}`}
                >
                  <div className="leaderboard-left">
                    <span className="leaderboard-rank">
                      {index + 1}.
                    </span>
                    <span className="leaderboard-name">{entry.name}</span>
                  </div>
                  <span className="leaderboard-score">{entry.score}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
