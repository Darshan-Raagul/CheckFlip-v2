import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; 
import { Crown, Play, ArrowLeft, Skull, ArrowUpCircle, ArrowDownCircle, RefreshCcw, Gamepad2 } from 'lucide-react'; 
import GameLayout from './GameLayout';
import Header from './Header';
import socket from './socket';

// --- Audio Utility Function ---
const playSound = (soundType) => {
  const soundFiles = {
    pickup: '/sounds/card_pickup.wav',
    drop: '/sounds/card_drop.wav',
    slam: '/sounds/card_slam.mp3',
    revive: '/sounds/medic_revive.wav',
    victory: '/sounds/victory.mp3'
  };

  const src = soundFiles[soundType];
  if (src) {
    const audio = new Audio(src);
    audio.volume = 0.6; 
    audio.play().catch(err => console.log('Audio playback prevented by browser:', err));
  }
};

const getCardImage = (type, color) => {
  const typeMap = { 'king': 'k1', 'knight': 'n1', 'pawn': 'p1', 'medic': 'm1', 'bishop': 'b1', 'rook': 'r1', 'queen': 'q1' };
  const prefix = typeMap[type] || 'p1'; 
  return `/cards/${prefix}_${color}.png`;
};

function isValidMove(board, piece, from, to) {
    const targetSquare = board[to.r][to.c];
    if (targetSquare === 'BLOCKED') return false; 
    if (targetSquare && targetSquare !== 'BLOCKED' && targetSquare.color === piece.color) return false; 
    
    if (targetSquare && targetSquare !== 'BLOCKED' && targetSquare.type === 'medic') return false; 

    const rowDiff = to.r - from.r;
    const colDiff = to.c - from.c;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    const isPathClear = (rDir, cDir) => {
        let r = from.r + rDir;
        let c = from.c + cDir;
        while (r !== to.r || c !== to.c) {
            if (board[r][c] !== null) return false; 
            r += rDir;
            c += cDir;
        }
        return true;
    };

    switch (piece.type) {
        case 'king': return absRowDiff <= 1 && absColDiff <= 1;
        case 'knight': return ((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2));
        case 'rook': if (from.r !== to.r && from.c !== to.c) return false; return isPathClear(Math.sign(rowDiff), Math.sign(colDiff));
        case 'bishop': if (absRowDiff !== absColDiff) return false; return isPathClear(Math.sign(rowDiff), Math.sign(colDiff));
        case 'queen': if (from.r !== to.r && from.c !== to.c && absRowDiff !== absColDiff) return false; return isPathClear(Math.sign(rowDiff), Math.sign(colDiff));
        case 'pawn':
            const forward = piece.direction === 'up' ? -1 : 1; 
            if (colDiff === 0 && rowDiff === forward) return targetSquare === null; 
            if (absColDiff === 1 && rowDiff === forward) return targetSquare !== null && targetSquare !== 'BLOCKED'; 
            return false;
        case 'medic': return absRowDiff <= 1 && absColDiff <= 1;
        default: return false;
    }
}

const GameArena = () => {
  const location = useLocation();
  const navigate = useNavigate(); 
  
  const gameMode = location.state?.gameMode || 'local'; 
  const initialColor = location.state?.localPlayerColor || 'red'; 
  const matchCode = location.state?.matchCode || null;

  const [roomCode, setRoomCode] = useState(matchCode);
  const [localPlayerColor] = useState(initialColor); 
  const [currentTurn, setCurrentTurn] = useState('red');
  const [timeLeft, setTimeLeft] = useState(30);
  const [bgPhase, setBgPhase] = useState(0);

  const MAX_ARMY = 16; 
  const [redArmy, setRedArmy] = useState(16);
  const [blackArmy, setBlackArmy] = useState(16);
  const [redKings, setRedKings] = useState(2);
  const [blackKings, setBlackKings] = useState(2);

  const [gameState, setGameState] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null); 
  const [deckCount, setDeckCount] = useState(20);

  const [arenaReady, setArenaReady] = useState(false); 
  const skipFired = useRef(false);
  const hasPlayedEndSound = useRef(false); 

  const [pendingPawnDeploy, setPendingPawnDeploy] = useState(null); 
  const [isPawnFlipped, setIsPawnFlipped] = useState(false); 
  const [pawnDirectionConfirmed, setPawnDirectionConfirmed] = useState(false);
  const [activeMedic, setActiveMedic] = useState(null);

  const [opponentAbandoned, setOpponentAbandoned] = useState(false);

  const [medicVanishedMsg, setMedicVanishedMsg] = useState(null);
  const previousMedics = useRef({ red: null, black: null });

  // STYLE GUIDE CONSTANTS
  const matteGold = '#E2C255'; 
  const crimsonRed = '#d31a1e';
  const darkRed = '#6b0000';

  const activeColor = gameMode === 'local' ? currentTurn : localPlayerColor;

  const drawnCard = gameState?.phase === 'holding_drawn_card' && currentTurn === activeColor 
      ? gameState.players[activeColor].hand 
      : null;

  useEffect(() => { setBgPhase(1); }, []);

  useEffect(() => {
    const handleExit = () => {
        if (matchCode && gameMode !== 'local') {
            socket.emit('leaveMatch', { roomId: matchCode });
        }
    };
    
    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('popstate', handleExit);
    
    return () => {
        window.removeEventListener('beforeunload', handleExit);
        window.removeEventListener('popstate', handleExit);
    };
  }, [matchCode, gameMode]);

  useEffect(() => {
    socket.on('opponentAbandoned', () => setOpponentAbandoned(true));
    socket.on('forceLobbyReturn', () => navigate('/selection'));
    
    return () => {
        socket.off('opponentAbandoned');
        socket.off('forceLobbyReturn');
    };
  }, [navigate]);

  useEffect(() => {
    socket.on('gameJoined', (id) => setRoomCode(id));
    return () => socket.off('gameJoined');
  }, []);

  useEffect(() => {
    if (!roomCode) {
        if (gameMode === 'local' && !gameState) {
            socket.emit('createLocalGame');
        }
        return;
    }

    socket.emit('arenaLoaded', { roomId: roomCode, playerColor: activeColor });
    socket.emit('requestSync', { roomId: roomCode });
    const pingInterval = setInterval(() => {
        if (!arenaReady) socket.emit('arenaLoaded', { roomId: roomCode, playerColor: activeColor });
    }, 1000);
    return () => clearInterval(pingInterval);
  }, [gameMode, roomCode, activeColor, arenaReady, gameState]);

  useEffect(() => {
    socket.on('arenaReady', () => setArenaReady(true));
    
    const handleStateUpdate = (game) => {
        if (game.status === 'abandoned') {
            setOpponentAbandoned(true);
            return; 
        }

        setGameState(game);
        setCurrentTurn(game.turn);
        const actingColor = game.gameMode === 'local' ? game.turn : localPlayerColor;
        
        let rArmy = 0, bArmy = 0;
        let currentMedics = { red: null, black: null };

        game.board.forEach((row, r) => row.forEach((cell, c) => {
            if (cell && cell !== 'BLOCKED') {
                if (cell.color === 'red' && cell.type !== 'king') rArmy++;
                if (cell.color === 'black' && cell.type !== 'king') bArmy++;
                
                if (cell.type === 'medic') currentMedics[cell.color] = { r, c };
            }
        }));

        if (previousMedics.current.red && !currentMedics.red) {
            const prevLoc = previousMedics.current.red;
            if (game.board[prevLoc.r][prevLoc.c] === null) {
                setMedicVanishedMsg('RED');
                setTimeout(() => setMedicVanishedMsg(null), 3500);
            }
        }
        if (previousMedics.current.black && !currentMedics.black) {
            const prevLoc = previousMedics.current.black;
            if (game.board[prevLoc.r][prevLoc.c] === null) {
                setMedicVanishedMsg('BLACK');
                setTimeout(() => setMedicVanishedMsg(null), 3500);
            }
        }
        previousMedics.current = currentMedics;

        setRedArmy(rArmy); setBlackArmy(bArmy);
        setRedKings(game.players.red.kingsAlive); setBlackKings(game.players.black.kingsAlive);
        setDeckCount(game.players[actingColor].deck.length);

        if (game.turn !== actingColor) {
            setSelectedCell(null);
            setIsPawnFlipped(false);
            setPawnDirectionConfirmed(false);
            setActiveMedic(null);
        }
    };
    
    socket.on('gameStateUpdate', handleStateUpdate);
    return () => { socket.off('gameStateUpdate', handleStateUpdate); socket.off('arenaReady'); };
  }, [localPlayerColor]);

  useEffect(() => {
    let redirectTimer;
    if (gameState?.winner) {
        redirectTimer = setTimeout(() => {
            if (roomCode) {
                socket.emit('returnToLobby', { roomId: roomCode });
            }
            navigate('/selection');
        }, 120000); 
    }
    return () => {
        if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [gameState?.winner, navigate, roomCode]);

  useEffect(() => {
      if (gameState?.winner && !hasPlayedEndSound.current) {
          if (gameMode === 'local') {
              playSound('victory');
          } else if (gameState.winner === localPlayerColor) {
              playSound('victory');
          }
          hasPlayedEndSound.current = true;
      }
  }, [gameState?.winner, localPlayerColor, gameMode]);

  useEffect(() => {
    if (gameState?.status === 'playing') {
        setTimeLeft(30); 
        skipFired.current = false; 
        hasPlayedEndSound.current = false; 
    }
  }, [gameState?.turn, gameState?.status]);

  useEffect(() => {
    if (gameState?.status === 'playing' && arenaReady && !gameState?.winner && !opponentAbandoned) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                if (!skipFired.current) {
                    skipFired.current = true;
                    socket.emit('skipTurn', { roomId: roomCode });
                    setIsPawnFlipped(false);
                    setPawnDirectionConfirmed(false);
                    setActiveMedic(null);
                }
                return 0; 
            }
            return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.status, arenaReady, roomCode, gameState?.winner, opponentAbandoned]);

  const renderBoard = useMemo(() => {
    let cells = [];
    const isRedLocal = activeColor === 'red'; 

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const serverRow = isRedLocal ? 3 - r : r;
        const serverCol = isRedLocal ? 3 - c : c;

        let cellData = null;
        let cellColor = null;
        let isTarget = false;

        if (gameState) {
            cellData = gameState.board[serverRow][serverCol];
            cellColor = (cellData && cellData !== 'BLOCKED') ? cellData.color : 'empty'; 

            if (selectedCell && currentTurn === activeColor && gameState.status === 'playing') {
                const activePiece = gameState.board[selectedCell.row][selectedCell.col];
                if (activePiece && activePiece !== 'BLOCKED' && activePiece.color === activeColor) {
                    isTarget = isValidMove(gameState.board, activePiece, { r: selectedCell.row, c: selectedCell.col }, { r: serverRow, c: serverCol });
                }
            } else if (drawnCard && currentTurn === activeColor && cellColor === 'empty' && cellData !== 'BLOCKED') {
                if (drawnCard.type.toLowerCase() === 'pawn') {
                    if (pawnDirectionConfirmed) isTarget = true;
                } else {
                    isTarget = true;
                }
            }
        }
        cells.push({ id: `cell-${serverRow}-${serverCol}`, realRow: serverRow, realCol: serverCol, color: cellColor, piece: cellData, isTarget: isTarget });
      }
    }
    return cells;
  }, [gameState, activeColor, selectedCell, currentTurn, drawnCard, pawnDirectionConfirmed]);

  const handleDeckClick = () => {
    if (currentTurn !== activeColor || gameState?.phase !== 'idle' || gameState?.status === 'paused' || !arenaReady) return;
    playSound('pickup');
    socket.emit('drawCard', { roomId: roomCode, playerColor: activeColor });
  };

  const handleCancelDraw = () => {
    if (gameState?.status === 'paused') return;
    setIsPawnFlipped(false);
    setPawnDirectionConfirmed(false);
    socket.emit('cancelDraw', { roomId: roomCode, playerColor: activeColor });
  };

  const handleCellClick = (row, col) => {
    if (currentTurn !== activeColor || gameState?.status === 'paused' || !arenaReady) return;

    if (gameState.phase === 'holding_drawn_card') {
        if (!gameState.board[row][col]) {
            if (drawnCard.type.toLowerCase() === 'pawn') {
                if (!pawnDirectionConfirmed) return;

                const isRed = activeColor === 'red';
                const direction = isPawnFlipped ? (isRed ? 'up' : 'down') : (isRed ? 'down' : 'up');
                
                playSound('drop');
                socket.emit('deployCard', { roomId: roomCode, row, col, playerColor: activeColor, pawnDirection: direction });
                setIsPawnFlipped(false);
                setPawnDirectionConfirmed(false);
            } else {
                playSound('drop');
                socket.emit('deployCard', { roomId: roomCode, row, col, playerColor: activeColor, pawnDirection: activeColor === 'black' ? 'up' : 'down' });
            }
        }
    } else if (gameState.phase === 'idle') {
        const targetSquare = gameState.board[row][col];

        if (targetSquare && targetSquare.type === 'medic' && targetSquare.color === activeColor) {
            if (gameState.players[activeColor].graveyard.length > 0) {
                playSound('pickup');
                setActiveMedic({ row, col });
            }
            return; 
        }

        if (selectedCell) {
            const isCapture = targetSquare && targetSquare !== 'BLOCKED' && targetSquare.color !== activeColor;
            playSound(isCapture ? 'slam' : 'drop');
            socket.emit('movePiece', { roomId: roomCode, from: selectedCell, to: { row, col }, playerColor: activeColor });
            setSelectedCell((targetSquare && targetSquare !== 'BLOCKED' && targetSquare.color === activeColor) ? { row, col } : null);
        } else if (targetSquare && targetSquare !== 'BLOCKED' && targetSquare.color === activeColor) {
            playSound('pickup');
            setSelectedCell({ row, col }); 
        }
    }
  };

  const handleReviveSelect = (graveyardIndex) => {
      playSound('revive');
      const medicLoc = activeMedic;
      setActiveMedic(null);

      setTimeout(() => {
          socket.emit('revivePiece', { roomId: roomCode, medicLocation: medicLoc, graveyardIndex, playerColor: activeColor });
      }, 600); 
  };

  const renderKings = (kingsAlive, colorHex) => (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
      <Crown size={18} color={kingsAlive >= 1 ? colorHex : 'rgba(255,255,255,0.1)'} style={{ filter: kingsAlive >= 1 ? `drop-shadow(0 0 8px ${colorHex})` : 'none', transition: 'all 0.5s ease' }} />
      <Crown size={18} color={kingsAlive >= 2 ? colorHex : 'rgba(255,255,255,0.1)'} style={{ filter: kingsAlive >= 2 ? `drop-shadow(0 0 8px ${colorHex})` : 'none', transition: 'all 0.5s ease' }} />
    </div>
  );

  return (
    <GameLayout phase={bgPhase}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}><Header variant="profile" /></div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          
          /* --- STYLE GUIDE COMPONENTS --- */
          .cyber-btn {
            background: linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%);
            color: #000; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;
            border-radius: 8px; border: none; padding: 16px 30px; box-shadow: 0 10px 20px rgba(226, 194, 85, 0.3);
            cursor: pointer; transition: all 0.3s ease; font-family: 'Inter', sans-serif;
            display: flex; align-items: center; justify-content: center; gap: 10px;
          }
          .cyber-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(226, 194, 85, 0.5); }

          .cyber-btn-secondary {
            background: rgba(0,0,0,0.5); color: ${matteGold}; border: 2px solid ${matteGold};
            font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;
            border-radius: 8px; padding: 14px 30px; cursor: pointer; transition: all 0.3s ease;
            font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; gap: 10px;
          }
          .cyber-btn-secondary:hover { background: rgba(226, 194, 85, 0.1); transform: translateY(-3px); box-shadow: 0 10px 25px rgba(226, 194, 85, 0.2); }

          .cyber-modal {
            background: linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%);
            border: 1px solid rgba(226, 194, 85, 0.5); border-radius: 16px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2);
            padding: 30px 40px; display: flex; flex-direction: column; align-items: center; text-align: center;
            backdrop-filter: blur(12px); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Inter', sans-serif;
          }

          /* --- UI PLACEMENT & FIXES --- */
          .board-timer-wrapper { position: absolute; top: clamp(80px, 10vh, 100px); left: 50%; transform: translateX(-50%); width: clamp(200px, 30vw, 400px); display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 60; }
          .board-timer-text { font-family: monospace; font-size: clamp(18px, 3vw, 24px); font-weight: 900; color: #fff; text-shadow: 0 0 15px rgba(255,255,255,0.8); letter-spacing: 2px; }
          .board-timer-track { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; box-shadow: inset 0 0 5px rgba(0,0,0,0.5); }
          .board-timer-fill { height: 100%; transition: width 1s linear, background-color 0.5s ease, box-shadow 0.5s ease; }

          .progress-container { position: absolute; top: clamp(100px, 16vh, 150px); right: clamp(15px, 4vw, 40px); display: flex; gap: clamp(15px, 3vw, 25px); z-index: 100; font-family: 'Inter', sans-serif; }
          .progress-wrapper { display: flex; flex-direction: column; align-items: center; }
          .progress-label { color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 800; letter-spacing: 2px; margin-bottom: 6px; }
          .progress-track { width: clamp(12px, 2vw, 16px); height: clamp(150px, 25vh, 220px); background: rgba(0, 0, 0, 0.6); border: 1.5px solid rgba(255, 255, 255, 0.1); border-radius: 8px; display: flex; align-items: flex-end; overflow: hidden; box-shadow: inset 0 0 15px rgba(0,0,0,0.8); margin-bottom: 8px; }
          .progress-fill { width: 100%; transition: height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
          .fill-red { background: linear-gradient(to top, ${darkRed}, ${crimsonRed}); box-shadow: 0 0 20px ${crimsonRed}; }
          .fill-gold { background: linear-gradient(to top, #B88A30, ${matteGold}); box-shadow: 0 0 20px ${matteGold}; }
          .progress-value { color: #fff; font-size: clamp(14px, 2vw, 18px); font-weight: 900; text-shadow: 0 0 10px rgba(255,255,255,0.4); }

          .deck-wrapper { position: absolute; bottom: clamp(15px, 5vh, 40px); right: clamp(15px, 5vw, 50px); width: clamp(60px, 14vmin, 110px); aspect-ratio: 0.75; z-index: 80; transform-style: preserve-3d; transform: perspective(1200px) rotateX(40deg) rotateZ(-10deg); cursor: pointer; transition: filter 0.3s; }
          .deck-wrapper:hover { filter: brightness(1.2); }
          .deck-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) translateZ(60px) rotateX(-30deg); width: clamp(40px, 10vmin, 55px); aspect-ratio: 1; z-index: 100; background: linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%); display: flex; align-items: center; justify-content: center; font-weight: 900; color: #000; font-size: clamp(16px, 2.5vmin, 22px); font-family: 'Inter', sans-serif; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); box-shadow: 0 10px 20px rgba(0,0,0,0.5); filter: drop-shadow(0 0 10px rgba(226,194,85,0.4)); }

          .arena-stage { position: absolute; top: 57%; left: 50%; transform: translate(-50%, -50%); perspective: 2500px; z-index: 50; width: clamp(260px, 75vmin, 650px); }
          .board-3d { position: relative; width: 100%; padding: 2.2vmin; background: #08080a; border: 3.5px solid ${matteGold}; border-radius: 15px; box-shadow: 0 12px 0 #2a1d05, 0 40px 100px rgba(0,0,0,1), 0 10px 40px rgba(226, 194, 85, 0.15); transform: rotateX(46deg); transform-style: preserve-3d; }
          .grid-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.8vmin; background: rgba(255, 255, 255, 0.03); padding: 1.5vmin; border-radius: 8px; transform-style: preserve-3d; }
          
          .board-card { aspect-ratio: 0.75; border-radius: 6px; border: 1.8px solid rgba(226, 194, 85, 0.6); position: relative; transform: translateZ(10px); box-shadow: -4px 10px 15px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .board-card:hover { transform: translateZ(20px); filter: brightness(1.2); }
          .board-card.empty { background: rgba(255,255,255,0.02); border-style: dashed; }
          .board-card.selected-glow { box-shadow: 0 0 25px 5px #fff, inset 0 0 15px #fff; border-color: #fff; transform: translateZ(30px); z-index: 20; }
          
          .board-card.is-target { border-color: #E2C255 !important; box-shadow: 0 0 30px 10px rgba(226, 194, 85, 0.9), inset 0 0 20px rgba(226, 194, 85, 0.7) !important; z-index: 25 !important; transform: translateZ(25px) !important; animation: targetShadowPulse 1s infinite alternate !important; }
          @keyframes targetShadowPulse { 0% { box-shadow: 0 0 20px 4px rgba(226, 194, 85, 0.5), inset 0 0 10px rgba(226, 194, 85, 0.3) !important; border-color: rgba(226, 194, 85, 0.7) !important; } 100% { box-shadow: 0 0 40px 12px rgba(226, 194, 85, 1), inset 0 0 25px rgba(226, 194, 85, 0.8) !important; border-color: rgba(226, 194, 85, 1) !important; } }
          
          .blocked-text { color: rgba(255,255,255,0.2); font-weight: 900; font-size: 24px; pointer-events: none; }
          .deck-stack { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; }
          .deck-card-layer { position: absolute; inset: 0; border-radius: 8px; border: 1.5px solid ${matteGold}; box-shadow: -1px 1px 0px ${matteGold}, -4px 4px 10px rgba(0,0,0,0.9); }

          @keyframes floatCard { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }

          /* --- EPIC WINNER ANIMATIONS --- */
          @keyframes epicSlam { 0% { transform: scale(1.5); opacity: 0; filter: blur(10px); } 100% { transform: scale(1); opacity: 1; filter: blur(0px); } }
          @keyframes slideInFromLeft { 0% { transform: translateX(-100px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
          @keyframes slideInFromRight { 0% { transform: translateX(100px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
          @keyframes godRaySpin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }

          @keyframes victoryFloat { 0% { transform: scale(1.15) translateY(0px); } 50% { transform: scale(1.15) translateY(-10px); } 100% { transform: scale(1.15) translateY(0px); } }
          @keyframes defeatSag { 0% { transform: rotate(180deg) translateY(0px); } 50% { transform: rotate(180deg) translateY(5px); } 100% { transform: rotate(180deg) translateY(0px); } }

          .graveyard-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 20px; max-height: 40vh; overflow-y: auto; }
          .grave-card { width: 80px; aspect-ratio: 0.75; border-radius: 6px; border: 1px solid #444; cursor: pointer; transition: transform 0.2s; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
          .grave-card:hover { transform: scale(1.1); border-color: ${matteGold}; }
          @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

          /* --- MOBILE OVERLAP FIX --- */
          @media (max-width: 768px) {
            .board-timer-wrapper { top: 80px; width: 40vw; }
            .progress-container { top: 80px; right: 10px; gap: 12px; transform: scale(0.85); transform-origin: top right; }
            .progress-track { height: 90px; width: 10px; }
            .progress-label { font-size: 10px; }
            .progress-value { font-size: 14px; }
            .arena-stage { width: 95vw; top: 62%; } 
            .deck-wrapper { width: 55px; right: 10px; bottom: 20px; }
          }
        `}
      </style>

      {/* BACKGROUND CANCEL OVERLAY */}
      {drawnCard && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={handleCancelDraw} title="Click outside to cancel" />
      )}

      {/* DRAWN CARD UI (NON-PAWN) */}
      {drawnCard && drawnCard.type.toLowerCase() !== 'pawn' && (
        <div 
            style={{ position: 'absolute', bottom: 'clamp(120px, 25vh, 200px)', right: 'clamp(15px, 5vw, 50px)', zIndex: 150, cursor: 'pointer', animation: 'floatCard 2.5s infinite ease-in-out' }} 
            onClick={handleCancelDraw} 
            title="Click card to cancel"
        >
            <div style={{ 
                width: 'clamp(80px, 18vmin, 140px)', aspectRatio: '0.75', borderRadius: '8px', 
                boxShadow: '0 15px 35px rgba(0,0,0,0.8), 0 0 25px rgba(226, 194, 85, 0.6)', 
                border: `2px solid ${matteGold}`, backgroundImage: `url(${getCardImage(drawnCard.type, drawnCard.color)})`, 
                backgroundSize: '100% 100%', backgroundPosition: 'center', transition: 'transform 0.3s' 
            }} 
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
        </div>
      )}

      {/* DRAWN CARD UI (PAWN ROTATION) */}
      {drawnCard && drawnCard.type.toLowerCase() === 'pawn' && (
        <div style={{ 
            position: 'absolute', top: '50%', right: 'clamp(15px, 5vw, 60px)', transform: 'translateY(-50%)', 
            zIndex: 150, background: '#0a0a0c', border: `2px solid ${matteGold}`, borderRadius: '12px', 
            padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', 
            width: 'clamp(120px, 16vw, 180px)', boxShadow: '0 15px 40px rgba(0,0,0,0.9)' 
        }}>
            
            <div 
                onClick={handleCancelDraw} 
                title="Click card to cancel"
                style={{
                    width: '80%', aspectRatio: '0.75', cursor: 'pointer',
                    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isPawnFlipped ? 'rotate(180deg)' : 'rotate(0deg)',
                    borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                    backgroundImage: `url(${getCardImage(drawnCard.type, drawnCard.color)})`, 
                    backgroundSize: '100% 100%'
                }}
            />

            {!pawnDirectionConfirmed ? (
                <>
                    <div style={{ color: '#aaa', fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: '900', letterSpacing: '1px', marginTop: '15px', marginBottom: '10px', textAlign: 'center', lineHeight: '1.4' }}>
                        SELECT DIRECTION
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <button 
                            onClick={() => { setIsPawnFlipped(false); setPawnDirectionConfirmed(true); }} 
                            style={{ backgroundColor: '#27ae60', color: 'white', fontFamily: "'Inter', sans-serif", border: 'none', borderRadius: '6px', padding: '10px 0', fontWeight: '900', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', textTransform: 'uppercase' }}
                        >
                            <ArrowUpCircle size={16} /> FORWARD
                        </button>
                        <button 
                            onClick={() => { setIsPawnFlipped(true); setPawnDirectionConfirmed(true); }} 
                            style={{ backgroundColor: 'transparent', color: crimsonRed, fontFamily: "'Inter', sans-serif", border: `1px solid ${crimsonRed}`, borderRadius: '6px', padding: '10px 0', fontWeight: '900', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', textTransform: 'uppercase' }}
                        >
                            <ArrowDownCircle size={16} /> BACKWARD
                        </button>
                    </div>
                </>
            ) : (
                <div style={{ color: matteGold, fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: '900', letterSpacing: '1px', marginTop: '15px', textAlign: 'center', lineHeight: '1.4', animation: 'pulseText 1.5s infinite alternate' }}>
                    SELECT EMPTY TILE
                </div>
            )}
        </div>
      )}

      {/* --- OPPONENT ABANDONED MODAL --- */}
      {opponentAbandoned && !gameState?.winner && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, backgroundColor: 'rgba(5, 5, 10, 0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)', padding: '20px' }}>
            <div className="cyber-modal">
                <h1 style={{ color: matteGold, fontSize: 'clamp(24px, 5vw, 36px)', margin: 0, textTransform: 'uppercase', textShadow: '0 0 20px rgba(226,194,85,0.5)', textAlign: 'center', fontWeight: '900',letterSpacing: '3px' }}>OPPONENT DISCONNECTED</h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(14px, 3vw, 16px)', margin: '15px 0 30px 0', letterSpacing: '2px', textAlign: 'center', fontWeight: '600' }}>THEY EITHER LEFT THE MATCH OR WENT AFK.</p>
                <div style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', alignItems: 'center' }}>
                   <button onClick={() => navigate('/selection')} className="cyber-btn"><RefreshCcw size={18} strokeWidth={2.5} /><span>FIND NEW MATCH</span></button>
                   <button onClick={() => { navigate('/game-arena', { state: { gameMode: 'local', localPlayerColor: 'red' }, replace: true }); window.location.reload(); }} className="cyber-btn-secondary"><Gamepad2 size={18} strokeWidth={2.5} /><span>PLAY LOCAL</span></button>
                </div>
            </div>
        </div>
      )}

      {/* MEDIC VANISHED POPUP */}
      {medicVanishedMsg && (
        <div style={{
            position: 'fixed', top: '15%', left: '50%', transform: 'translate(-50%, 0)', zIndex: 10000,
            background: 'linear-gradient(135deg, rgba(15,15,20,0.95), rgba(5,5,8,0.98))',
            border: `2px solid ${medicVanishedMsg === 'RED' ? crimsonRed : matteGold}`,
            boxShadow: `0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px ${medicVanishedMsg === 'RED' ? crimsonRed : matteGold}44`,
            borderRadius: '50px', padding: '15px 40px', textAlign: 'center',
            animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Skull size={24} color={medicVanishedMsg === 'RED' ? crimsonRed : matteGold} />
                <span style={{ color: '#fff', fontFamily: "'Inter', sans-serif", fontWeight: '900', letterSpacing: '3px', fontSize: '16px' }}>
                    {medicVanishedMsg} MEDIC VANISHED
                </span>
            </div>
        </div>
      )}

      {/* GRAVEYARD (MEDIC REVIVE) MODAL */}
      {activeMedic && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(5,5,10,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
            <div className="cyber-modal" style={{ width: 'clamp(300px, 90vw, 600px)' }}>
                <h2 style={{ color: matteGold, margin: 0, textTransform: 'uppercase', letterSpacing: '4px', fontWeight: '900', textShadow: '0 0 20px rgba(226,194,85,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}><Skull size={24} /> GRAVEYARD REVIVE</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '600', letterSpacing: '1px', marginTop: '10px' }}>Select a fallen piece to resurrect onto the Medic's tile.</p>
                <div className="graveyard-grid">
                    {gameState.players[activeColor].graveyard.map((deadPiece, index) => (
                        <div key={index} className="grave-card" style={{ backgroundImage: `url(${getCardImage(deadPiece.type, deadPiece.color)})`, backgroundSize: '100% 100%' }} onClick={() => handleReviveSelect(index)} />
                    ))}
                </div>
                <button onClick={() => setActiveMedic(null)} className="cyber-btn-secondary" style={{ marginTop: '25px', border: 'none', background: 'none', padding: '10px' }}>CANCEL REVIVE</button>
            </div>
        </div>
      )}

      {!gameState && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, backgroundColor: '#030406', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: matteGold, fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '4px', fontWeight: '900', animation: 'pulseText 1.5s infinite' }}>SYNCING SECURE CONNECTION...</div>
        </div>
      )}

      {gameState && !arenaReady && !gameState.winner && !opponentAbandoned && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9998, backgroundColor: 'rgba(5, 5, 10, 0.92)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
            <div style={{ color: matteGold, fontFamily: "'Inter', sans-serif", fontSize: '16px', letterSpacing: '4px', fontWeight: '900', animation: 'pulseText 1.5s infinite', textTransform: 'uppercase' }}>WAITING FOR OPPONENT TO RENDER BOARD...</div>
        </div>
      )}

      {/* MATCH PAUSED MODAL */}
      {gameState?.status === 'paused' && !gameState?.winner && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, backgroundColor: 'rgba(5, 5, 10, 0.92)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
            <div className="cyber-modal" style={{ width: 'clamp(300px, 90vw, 500px)' }}>
                <h1 style={{ color: matteGold, fontSize: 'clamp(24px, 5vw, 36px)', margin: 0, textTransform: 'uppercase', textShadow: '0 0 20px rgba(226,194,85,0.5)', textAlign: 'center', fontWeight: '900' }}>MATCH PAUSED</h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(12px, 3vw, 14px)', fontWeight: '600', margin: '20px 0 30px 0', letterSpacing: '2px', textAlign: 'center' }}>THE GAME WAS PAUSED DUE TO INACTIVITY. READY TO RETURN TO BATTLE?</p>
                <button onClick={() => socket.emit('resumeGame', { roomId: roomCode })} className="cyber-btn"><Play size={20} fill="#000" /> RESUME GAME</button>
            </div>
        </div>
      )}

      {/* --- WINNER SCREEN --- */}
      {gameState?.winner && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
            
            {/* God Rays Background Animation */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', width: '150vmax', height: '150vmax',
                background: `conic-gradient(from 0deg, transparent 10deg, ${gameState.winner === 'red' ? crimsonRed : '#aaaaaa'} 45deg, transparent 80deg, ${gameState.winner === 'red' ? crimsonRed : '#aaaaaa'} 135deg, transparent 170deg, ${gameState.winner === 'red' ? crimsonRed : '#aaaaaa'} 225deg, transparent 260deg, ${gameState.winner === 'red' ? crimsonRed : '#aaaaaa'} 315deg, transparent 350deg)`,
                opacity: 0.15,
                animation: 'godRaySpin 30s linear infinite',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* Slam-in Wrapper for all content */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, animation: 'epicSlam 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(15px, 4vw, 40px)', marginBottom: '10px' }}>
                    {/* Left Card Wrapper (Entrance Slide) */}
                    <div style={{ animation: 'slideInFromLeft 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', animationDelay: '0.2s', opacity: 0 }}>
                        <div style={{ 
                            width: 'clamp(60px, 14vw, 110px)', aspectRatio: '0.75', 
                            backgroundImage: `url(${getCardImage('king', gameState.winner === 'red' ? 'black' : 'red')})`, 
                            backgroundSize: '100% 100%', 
                            transform: 'rotate(180deg)', 
                            filter: 'grayscale(0.7) brightness(0.5)',
                            border: '2px solid #333',
                            borderRadius: '8px',
                            animation: 'defeatSag 3s ease-in-out infinite 0.8s'
                        }} />
                    </div>

                    <h1 style={{ 
                        color: gameState.winner === 'red' ? crimsonRed : '#ffffff', 
                        fontSize: 'clamp(30px, 6vw, 80px)', 
                        margin: 0, 
                        fontWeight: '900',
                        textTransform: 'uppercase', 
                        whiteSpace: 'nowrap',
                        textShadow: gameState.winner === 'red' 
                            ? `0 0 20px ${crimsonRed}, 0 0 40px ${crimsonRed}, 0 0 80px ${crimsonRed}` 
                            : `0 0 20px #888888, 0 0 40px #888888, 0 0 80px #888888`
                    }}>
                        {gameMode === 'local' 
                            ? `${gameState.winner} WINS` 
                            : (gameState.winner === localPlayerColor ? 'YOU WIN' : 'OPPONENT WINS')
                        }
                    </h1>

                    {/* Right Card Wrapper (Entrance Slide) */}
                    <div style={{ animation: 'slideInFromRight 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', animationDelay: '0.2s', opacity: 0 }}>
                        <div style={{ 
                            width: 'clamp(60px, 14vw, 110px)', aspectRatio: '0.75', 
                            backgroundImage: `url(${getCardImage('king', gameState.winner === 'red' ? 'red' : 'black')})`, 
                            backgroundSize: '100% 100%', 
                            transform: 'scale(1.15)',
                            filter: gameState.winner === 'red' ? `drop-shadow(0 0 20px ${crimsonRed})` : `drop-shadow(0 0 20px #aaaaaa)`,
                            border: `2px solid ${gameState.winner === 'red' ? crimsonRed : '#aaaaaa'}`,
                            borderRadius: '8px',
                            animation: 'victoryFloat 3s ease-in-out infinite 0.8s'
                        }} />
                    </div>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: '18px', marginTop: '40px', marginBottom: '40px', letterSpacing: '4px' }}>MATCH CONCLUDED</p>
                <button onClick={() => {
                    socket.emit('returnToLobby', { roomId: roomCode });
                    navigate('/selection');
                }} className="cyber-btn-secondary"><ArrowLeft size={20} /> BACK TO LOBBY</button>
            </div>
        </div>
      )}

      <div className="board-timer-wrapper">
        <div className="board-timer-text">{gameState?.status === 'paused' || (gameState && !arenaReady) ? '--:--' : `00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`}</div>
        <div className="board-timer-track"><div className="board-timer-fill" style={{ width: `${gameState?.status === 'paused' || (gameState && !arenaReady) ? 0 : (timeLeft / 30) * 100}%`, backgroundColor: currentTurn === 'red' ? crimsonRed : matteGold, boxShadow: `0 0 15px ${currentTurn === 'red' ? crimsonRed : matteGold}` }} /></div>
      </div>

      <div className="progress-container">
        <div className="progress-wrapper"><div className="progress-label">{gameMode === 'local' ? 'RED' : (localPlayerColor === 'red' ? 'YOU' : 'FOE')}</div>{renderKings(redKings, crimsonRed)}<div className="progress-track"><div className="progress-fill fill-red" style={{ height: `${(redArmy / MAX_ARMY) * 100}%` }} /></div><div className="progress-value">{redArmy}</div></div>
        <div className="progress-wrapper"><div className="progress-label">{gameMode === 'local' ? 'BLK' : (localPlayerColor === 'black' ? 'YOU' : 'FOE')}</div>{renderKings(blackKings, matteGold)}<div className="progress-track"><div className="progress-fill fill-gold" style={{ height: `${(blackArmy / MAX_ARMY) * 100}%` }} /></div><div className="progress-value">{blackArmy}</div></div>
      </div>

      <div className="arena-stage" style={{ filter: gameState?.status === 'paused' ? 'blur(8px)' : 'none', pointerEvents: gameState?.status === 'paused' ? 'none' : 'auto', transition: 'filter 0.5s ease' }}>
        <div className="board-3d">
          <div className="grid-container">
            {renderBoard.map((cell) => {
                const isSelected = selectedCell && selectedCell.row === cell.realRow && selectedCell.col === cell.realCol;
                const isBlocked = cell.piece === 'BLOCKED';
                
                let cardTransform = 'none';
                if (cell.piece && cell.piece !== 'BLOCKED') {
                    if (cell.piece.color !== activeColor) {
                        cardTransform = 'rotate(180deg)'; 
                        if (cell.piece.type === 'pawn') {
                            const oppForward = cell.piece.color === 'red' ? 'down' : 'up';
                            if (cell.piece.direction !== oppForward) cardTransform = 'rotate(0deg)'; 
                        }
                    } else {
                        if (cell.piece.type === 'pawn') {
                            const locForward = activeColor === 'red' ? 'down' : 'up';
                            if (cell.piece.direction !== locForward) cardTransform = 'rotate(180deg)'; 
                        }
                    }
                }

                return (
                    <div key={cell.id} className={`board-card ${cell.color || 'empty'} ${isSelected ? 'selected-glow' : ''} ${cell.isTarget ? 'is-target' : ''}`} onClick={() => handleCellClick(cell.realRow, cell.realCol)}>
                        {cell.piece && !isBlocked && (
                            <div style={{ width: '100%', height: '100%', backgroundImage: `url(${getCardImage(cell.piece.type, cell.piece.color)})`, backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderRadius: '4px', pointerEvents: 'none', transform: cardTransform }}>
                                {cell.piece.type === 'medic' && cell.piece.lifespan !== undefined && (
                                    <div style={{
                                        position: 'absolute', bottom: '5px', left: '50%', transform: 'translateX(-50%)',
                                        background: 'rgba(0,0,0,0.85)', color: matteGold, fontSize: '9px', fontWeight: '900',
                                        fontFamily: "'Inter', sans-serif",
                                        padding: '3px 6px', borderRadius: '4px', border: `1px solid ${matteGold}`,
                                        letterSpacing: '1px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none'
                                    }}>
                                        LIFE: {cell.piece.lifespan}/3
                                    </div>
                                )}
                            </div>
                        )}
                        {isBlocked && <span className="blocked-text" style={{ fontFamily: "'Inter', sans-serif" }}>X</span>}
                    </div>
                );
            })}
          </div>
        </div>
      </div>

      <div className="deck-wrapper" onClick={handleDeckClick} style={{ opacity: drawnCard || gameState?.status === 'paused' || !arenaReady ? 0.3 : 1, pointerEvents: drawnCard || gameState?.status === 'paused' || !arenaReady ? 'none' : 'auto' }}>
        <div className="deck-stack">
          {[...Array(Math.max(1, Math.min(10, deckCount)))].map((_, i) => (<div key={i} className="deck-card-layer" style={{ transform: `translateZ(${i * 4}px)`, background: activeColor === 'red' ? `linear-gradient(135deg, ${darkRed}, ${crimsonRed})` : `linear-gradient(135deg, #1a1a20, #000)` }} />))}
          <div className="deck-badge" style={{ transform: `translate(-50%, -50%) translateZ(${Math.min(10, deckCount) * 4 + 20}px) rotateX(-30deg)` }}>{deckCount}</div>
        </div>
      </div>

      {gameMode === 'local' ? (
        <div style={{ position: 'absolute', bottom: '15px', left: '15px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => socket.emit('skipTurn', { roomId: roomCode })} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', letterSpacing: '1px', fontWeight: '900', fontFamily: "'Inter', sans-serif" }}>DEV: SKIP TURN ({currentTurn.toUpperCase()})</button>
        </div>
      ) : (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 100, padding: '10px 20px', borderRadius: '8px', background: 'rgba(10,10,15,0.85)', border: `1.5px solid ${currentTurn === localPlayerColor ? matteGold : '#333'}`, color: currentTurn === localPlayerColor ? matteGold : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', animation: currentTurn === localPlayerColor && gameState?.status === 'playing' ? 'neonPulseGlow 2s infinite alternate' : 'none', opacity: gameState?.status === 'paused' || !arenaReady ? 0 : 1, fontFamily: "'Inter', sans-serif" }}>
          {gameState?.phase === 'holding_drawn_card' && currentTurn === localPlayerColor ? 'SELECT EMPTY TILE TO DEPLOY' : (currentTurn === localPlayerColor ? 'YOUR TURN' : "OPPONENT'S TURN")}
        </div>
      )}
    </GameLayout>
  );
};

export default GameArena;