import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorPlay, Download, Swords, FastForward } from 'lucide-react'; 
import GameLayout from './GameLayout';

// --- NEW: Audio Utility Function ---
const playSound = (soundType) => {
  const soundFiles = {
    pickup: '/sounds/card_pickup.wav',
    drop: '/sounds/card_drop.wav',
    slam: '/sounds/card_slam.mp3',
    revive: '/sounds/medic_revive.wav',
    victory: '/sounds/victory.mp3', 
    defeat: '/sounds/defeat.mp3'    
  };

  const src = soundFiles[soundType];
  if (src) {
    const audio = new Audio(src);
    audio.volume = 0.6; 
    audio.play().catch(err => console.log('Audio playback prevented by browser:', err));
  }
};

// --- CARD IMAGE MAPPER ---
const getCardImage = (type, color) => {
  const typeMap = { 'king': 'k1', 'knight': 'n1', 'pawn': 'p1', 'rook': 'r1', 'queen': 'q1', 'bishop': 'b1' };
  const prefix = typeMap[type] || 'p1'; 
  return `/cards/${prefix}_${color}.png`;
};

// --- REAL GAME VALIDATION LOGIC ---
function isValidMove(board, piece, from, to) {
    const targetSquare = board[to.r][to.c];
    if (targetSquare && targetSquare.color === piece.color) return false; 

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
            const forward = piece.color === 'black' ? 1 : -1; 
            if (colDiff === 0 && rowDiff === forward) return targetSquare === null;
            if (absColDiff === 1 && rowDiff === forward) return targetSquare !== null; 
            return false;
        default: return false;
    }
}

// --- INITIAL SCENARIO ---
const getInitialBoard = () => {
  const board = Array(4).fill(null).map(() => Array(4).fill(null));
  
  board[0][1] = { type: 'king', color: 'black' };
  board[0][3] = { type: 'queen', color: 'black' };
  board[1][1] = { type: 'pawn', color: 'black' };
  board[1][3] = { type: 'pawn', color: 'black' };
  
  board[2][2] = { type: 'pawn', color: 'red' };
  board[3][1] = { type: 'knight', color: 'red' };
  board[3][2] = { type: 'king', color: 'red' };
  board[3][3] = { type: 'rook', color: 'red' };
  return board;
};

// --- THE CINEMATIC SCRIPT ---
const GUIDED_STEPS = {
  1: { from: {r: 2, c: 2}, to: {r: 1, c: 1}, text: "PAWNS CAPTURE DIAGONALLY. TAP IT.", targetText: "HIT THE PAWN. SHOW NO MERCY." },
  2: { from: {r: 3, c: 1}, to: {r: 1, c: 2}, text: "KNIGHTS JUMP IN AN 'L' SHAPE. SELECT IT.", targetText: "POSITION FOR AN ATTACK." },
  3: { from: {r: 3, c: 2}, to: {r: 2, c: 3}, text: "KINGS MOVES 1 TILE. TAP YOUR KING.", targetText: "CAPTURE THEIR PAWN." },
  4: { from: {r: 3, c: 3}, to: {r: 3, c: 0}, text: "ROOKS SLIDE IN STRAIGHT LINES.", targetText: "TAKE THE OPEN LANE." }
};

const BOT_MOVES = {
  1: { from: {r: 0, c: 3}, to: {r: 0, c: 2} }, 
  2: { from: {r: 1, c: 3}, to: {r: 2, c: 3} }, 
  3: { from: {r: 0, c: 2}, to: {r: 1, c: 1} }, 
  4: { from: {r: 0, c: 1}, to: {r: 0, c: 0} }, 
};

// --- DATA FOR THE MINI-BOARD VISUAL TUTORIALS ---
const MINI_BOARD_DEMO = {
    1: { type: 'pawn', title: 'PAWN MOVEMENT', r: 2, c: 1, targets: [[1,1], [1,0], [1,2]], desc: "Moves 1 step forward. Captures diagonally." },
    2: { type: 'knight', title: 'KNIGHT MOVEMENT', r: 2, c: 2, targets: [[0,1], [0,3], [1,0], [3,0], [4,1], [4,3]], desc: "Jumps in an 'L' shape. Leaps over other pieces." },
    3: { type: 'king', title: 'KING MOVEMENT', r: 2, c: 2, targets: [[1,1], [1,2], [1,3], [2,1], [2,3], [3,1], [3,2], [3,3]], desc: "Moves exactly 1 tile in any direction." },
    4: { type: 'rook', title: 'ROOK MOVEMENT', r: 2, c: 2, targets: [[0,2], [1,2], [3,2], [2,0], [2,1], [2,3]], desc: "Slides continuously in straight lines." }
};

const PlayableAd = () => {
  const navigate = useNavigate();
  
  const [board, setBoard] = useState(getInitialBoard());
  const [turn, setTurn] = useState('red'); 
  const [step, setStep] = useState(1);
  const [freeMoves, setFreeMoves] = useState(0);
  const [selectedCell, setSelectedCell] = useState(null);
  
  const [paywall, setPaywall] = useState({ show: false, title: '', subtitle: '' });
  
  const [introDelay, setIntroDelay] = useState(true);
  const [tutorialText, setTutorialText] = useState("OBSERVE THE BATTLEFIELD...");
  const [miniBoard, setMiniBoard] = useState({ show: false, step: 1, timer: 10 });
  const [shownTutorials, setShownTutorials] = useState([]); 

  const matteGold = '#E2C255'; 
  const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';

  // --- BULLETPROOF BOARD REF ---
  const boardRef = useRef(board);
  useEffect(() => {
      boardRef.current = board;
  }, [board]);

  useEffect(() => {
      const timer = setTimeout(() => {
          setIntroDelay(false);
      }, 5000);
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      if (!introDelay && turn === 'red' && step <= 4 && !paywall.show && !shownTutorials.includes(step)) {
          setMiniBoard({ show: true, step: step, timer: 10 });
          setShownTutorials(prev => [...prev, step]);
          setSelectedCell(null); 
          setTutorialText(GUIDED_STEPS[step].text); 
      }
  }, [turn, step, paywall.show, shownTutorials, introDelay]);

  useEffect(() => {
      let interval;
      if (miniBoard.show && miniBoard.timer > 0) {
          interval = setInterval(() => {
              setMiniBoard(prev => ({ ...prev, timer: prev.timer - 1 }));
          }, 1000);
      } else if (miniBoard.show && miniBoard.timer <= 0) {
          setMiniBoard(prev => ({ ...prev, show: false })); 
      }
      return () => clearInterval(interval);
  }, [miniBoard.show, miniBoard.timer]);

  // --- BOT LOGIC ---
  useEffect(() => {
    if (turn === 'black' && !paywall.show) {
      
      const botTimer = setTimeout(() => {
        let newBoard = [...boardRef.current.map(row => [...row])];
        let move = null;
        const botStep = step - 1; 

        if (botStep >= 1 && botStep <= 4) {
            move = BOT_MOVES[botStep];
        } else {
            let captureMoves = [];
            let normalMoves = [];
            
            for(let r=0; r<4; r++) {
                for(let c=0; c<4; c++) {
                    const p = newBoard[r][c];
                    if (p && p.color === 'black') {
                        for(let tr=0; tr<4; tr++) {
                            for(let tc=0; tc<4; tc++) {
                                if (isValidMove(newBoard, p, {r,c}, {r:tr, c:tc})) {
                                    if (newBoard[tr][tc] && newBoard[tr][tc].color === 'red') {
                                        captureMoves.push({from: {r,c}, to: {r:tr, c:tc}}); 
                                    } else {
                                        normalMoves.push({from: {r,c}, to: {r:tr, c:tc}}); 
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (captureMoves.length > 0) {
                move = captureMoves[Math.floor(Math.random() * captureMoves.length)];
            } else if (normalMoves.length > 0) {
                move = normalMoves[Math.floor(Math.random() * normalMoves.length)];
            }
        }

        if (move) {
            const targetPiece = newBoard[move.to.r][move.to.c];
            playSound(targetPiece ? 'slam' : 'drop'); // Bot plays sound on move completion
            
            newBoard[move.to.r][move.to.c] = newBoard[move.from.r][move.from.c];
            newBoard[move.from.r][move.from.c] = null;
        }

        setBoard(newBoard);
        setTurn('red');
        checkGameEnd(newBoard, 'red');

        if (step <= 4) {
            setTutorialText(GUIDED_STEPS[step].text);
        } else {
            setTutorialText("THE BOARD IS YOURS. FINISH THEM.");
        }

      }, 1500);

      return () => clearTimeout(botTimer);
    }
  }, [turn, step, paywall.show]); 

  const handleCellClick = (r, c) => {
    if (introDelay || turn !== 'red' || paywall.show || miniBoard.show) return;

    const clickedPiece = board[r][c];

    if (step <= 4) {
        // GUIDED PHASE
        const expectedFrom = GUIDED_STEPS[step].from;
        const expectedTo = GUIDED_STEPS[step].to;

        if (!selectedCell) {
            if (r === expectedFrom.r && c === expectedFrom.c) {
                playSound('pickup'); // Sound on correct guide pickup
                setSelectedCell({ r, c });
                setTutorialText(GUIDED_STEPS[step].targetText); 
            }
        } else {
            if (r === expectedTo.r && c === expectedTo.c) {
                playSound(clickedPiece ? 'slam' : 'drop'); // Sound on successful guide drop/capture
                executeMove(r, c);
                setStep(prev => prev + 1); 
            } else if (clickedPiece && clickedPiece.color === 'red' && r === expectedFrom.r && c === expectedFrom.c) {
                playSound('pickup'); // Sound on re-selecting the piece
                setSelectedCell({ r, c }); 
                setTutorialText(GUIDED_STEPS[step].targetText);
            } else {
                setSelectedCell(null);
                setTutorialText(GUIDED_STEPS[step].text); 
            }
        }
    } else {
        // FREE MOVEMENT PHASE
        if (!selectedCell) {
            if (clickedPiece && clickedPiece.color === 'red') {
                playSound('pickup'); // Sound on free pickup
                setSelectedCell({ r, c });
            }
        } else {
            const piece = board[selectedCell.r][selectedCell.c];
            
            if (clickedPiece && clickedPiece.color === 'red') {
                playSound('pickup'); // Sound on switching selected piece
                setSelectedCell({ r, c });
                return;
            }

            if (isValidMove(board, piece, selectedCell, { r, c })) {
                playSound(clickedPiece ? 'slam' : 'drop'); // Sound on successful free move/capture
                executeMove(r, c);
                setStep(prev => prev + 1); 
                const newFreeMoves = freeMoves + 1;
                setFreeMoves(newFreeMoves);
                
                if (newFreeMoves >= 3) {
                    setTimeout(() => triggerPaywall("IMPRESSIVE STRATEGY", "YOU SURVIVED THE AMBUSH. THE REAL BATTLE AWAITS."), 800);
                }
            } else {
                setSelectedCell(null); 
            }
        }
    }
  };

  const executeMove = (r, c) => {
      let newBoard = [...board.map(row => [...row])];
      newBoard[r][c] = newBoard[selectedCell.r][selectedCell.c];
      newBoard[selectedCell.r][selectedCell.c] = null;
      setBoard(newBoard);
      setSelectedCell(null);
      setTurn('black');
      checkGameEnd(newBoard, 'black');
  };

  const checkGameEnd = (currentBoard, nextTurn) => {
      let blackCount = 0, redCount = 0;
      currentBoard.forEach(row => row.forEach(cell => {
          if (cell?.color === 'black') blackCount++;
          if (cell?.color === 'red') redCount++;
      }));

      if (blackCount === 0) {
          playSound('victory'); // Play victory sound on win
          triggerPaywall("VICTORY ACHIEVED", "THE ENEMY HAS FALLEN. READY FOR A REAL CHALLENGE?");
      } else if (redCount === 0) {
          // Emitting no sound on defeat as per previous preferences
          triggerPaywall("DEFEAT", "THE ENEMY OVERWHELMED YOU. RETRY IN THE FULL GAME.");
      }
  };

  const triggerPaywall = (title, subtitle) => {
      setPaywall({ show: true, title, subtitle });
  };

  const finishTrial = (route) => {
    localStorage.setItem('has_played_trial', 'true');
    // Directing them straight to the registration page to capture the user
    if (route === 'web') navigate('/register');
    if (route === 'app') window.open('https://play.google.com/store', '_blank'); 
  };

  const isGuidedSquare = (r, c, type) => {
      if (step > 4 || turn !== 'red' || paywall.show || miniBoard.show || introDelay) return false;
      const expected = GUIDED_STEPS[step][type];
      return expected.r === r && expected.c === c;
  };

  const activeDemo = MINI_BOARD_DEMO[miniBoard.step];

  // --- RENDER LOGIC WITH HIGHLIGHTS ---
  const renderBoard = useMemo(() => {
    let cells = [];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let cellData = board[r][c];
        let cellColor = cellData ? cellData.color : 'empty'; 
        let isTarget = false;

        // Determine if this cell should get the gold target glow
        if (step <= 4) {
            // Guided phase: Only light up the specific scripted destination
            isTarget = selectedCell && isGuidedSquare(r, c, 'to');
        } else {
            // Free phase: Calculate all valid moves dynamically like GameArena
            if (selectedCell && turn === 'red') {
                const activePiece = board[selectedCell.r][selectedCell.c];
                if (activePiece && activePiece.color === 'red') {
                    isTarget = isValidMove(board, activePiece, selectedCell, { r, c });
                }
            }
        }

        cells.push({ id: `cell-${r}-${c}`, realRow: r, realCol: c, color: cellColor, piece: cellData, isTarget: isTarget });
      }
    }
    return cells;
  }, [board, selectedCell, turn, step, paywall.show, miniBoard.show, introDelay]);

  return (
    <GameLayout phase={1}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

          /* --- STYLE GUIDE APPLIED --- */
          .ad-prompt-container { position: absolute; top: clamp(40px, 8vh, 100px); left: 50%; transform: translateX(-50%); width: 90vw; max-width: 600px; z-index: 100; display: flex; flex-direction: column; align-items: center; }
          .ad-prompt-title { font-family: 'Inter', sans-serif; color: #fff; font-size: clamp(16px, 4vw, 24px); font-weight: 900; letter-spacing: 4px; text-transform: uppercase; text-shadow: 0 0 20px rgba(226, 194, 85, 0.5); text-align: center; transition: all 0.3s ease; }
          
          .arena-stage { position: absolute; top: 57%; left: 50%; transform: translate(-50%, -50%); perspective: 2500px; z-index: 50; width: clamp(260px, 75vmin, 650px); }
          .board-3d { position: relative; width: 100%; padding: 2.2vmin; background: #08080a; border: 3.5px solid ${matteGold}; border-radius: 15px; box-shadow: 0 12px 0 #2a1d05, 0 40px 100px rgba(0,0,0,1), 0 10px 40px rgba(226, 194, 85, 0.15); transform: rotateX(46deg); transform-style: preserve-3d; }
          .grid-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.8vmin; background: rgba(255, 255, 255, 0.03); padding: 1.5vmin; border-radius: 8px; transform-style: preserve-3d; }
          
          .board-card { aspect-ratio: 0.75; border-radius: 6px; border: 1.8px solid rgba(226, 194, 85, 0.6); position: relative; transform: translateZ(10px); box-shadow: -4px 10px 15px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5); cursor: pointer; overflow: visible; transition: all 0.3s ease; }
          .board-card.empty { background: rgba(255,255,255,0.02); border-style: dashed; }
          .board-card.selected-glow { box-shadow: 0 0 25px 5px #fff, inset 0 0 15px #fff; border-color: #fff; transform: translateZ(30px); z-index: 20; }
          
          .board-card.tutorial-glow { 
              border-color: #E2C255; 
              box-shadow: 0 0 30px 10px rgba(226, 194, 85, 0.6), inset 0 0 20px rgba(226, 194, 85, 0.4); 
              animation: neonThrob 1s infinite alternate; 
              z-index: 25; 
              transform: translateZ(25px); 
          }

          /* --- NEW: TARGET GLOW FOR FREE MOVES (Matching GameArena) --- */
          .board-card.is-target { 
              border-color: #E2C255 !important; 
              box-shadow: 0 0 30px 10px rgba(226, 194, 85, 0.9), inset 0 0 20px rgba(226, 194, 85, 0.7) !important; 
              z-index: 25 !important; 
              transform: translateZ(25px) !important; 
              animation: targetShadowPulse 1s infinite alternate !important; 
          }
          
          @keyframes targetShadowPulse { 
              0% { box-shadow: 0 0 20px 4px rgba(226, 194, 85, 0.5), inset 0 0 10px rgba(226, 194, 85, 0.3) !important; border-color: rgba(226, 194, 85, 0.7) !important; } 
              100% { box-shadow: 0 0 40px 12px rgba(226, 194, 85, 1), inset 0 0 25px rgba(226, 194, 85, 0.8) !important; border-color: rgba(226, 194, 85, 1) !important; } 
          }

          @keyframes neonThrob { 0% { filter: brightness(1); } 100% { filter: brightness(1.4); } }
          
          .mini-overlay { position: absolute; inset: 0; z-index: 9998; background: rgba(5, 5, 10, 0.95); backdrop-filter: blur(10px); display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif; }
          
          /* MODAL STANDARD APPLIED */
          .mini-box { 
              background: linear-gradient(135deg, rgba(15,15,20,0.95), rgba(5,5,8,0.98)); 
              border: 1px solid rgba(226, 194, 85, 0.5); 
              border-radius: 16px; 
              padding: 25px; 
              display: flex; flex-direction: column; align-items: center; 
              box-shadow: 0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2); 
              width: 90vw; max-width: 350px; 
              animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
          }
          @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          
          .mini-title { color: ${matteGold}; font-size: 20px; font-weight: 900; letter-spacing: 4px; margin: 0 0 10px 0; text-transform: uppercase; text-shadow: 0 0 20px rgba(226,194,85,0.5); }
          .mini-desc { color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 600; text-align: center; margin: 0 0 20px 0; letter-spacing: 1px; }
          
          .mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; width: 100%; aspect-ratio: 1; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          .mini-cell { background: rgba(0,0,0,0.5); border-radius: 4px; border: 1px dashed rgba(255,255,255,0.1); display: flex; justify-content: center; align-items: center; position: relative; }
          .mini-piece { width: 90%; height: 90%; background-size: contain; background-repeat: no-repeat; background-position: center; }
          
          /* SYSTEM STATUS COLOR APPLIED */
          .mini-target-dot { width: 35%; height: 35%; border-radius: 50%; background: #00ffcc; box-shadow: 0 0 10px #00ffcc; animation: pulseDot 1s infinite alternate; }
          @keyframes pulseDot { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.2); opacity: 1; } }

          .mini-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }
          .mini-timer { color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; letter-spacing: 1px; }
          
          /* SECONDARY BUTTON STANDARD APPLIED */
          .mini-skip-btn { background: rgba(0,0,0,0.5); border: 2px solid ${matteGold}; color: ${matteGold}; padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s; }
          .mini-skip-btn:hover { background: rgba(226, 194, 85, 0.1); transform: translateY(-2px); }

          .paywall-overlay { position: absolute; inset: 0; z-index: 9999; background-color: rgba(5, 5, 10, 0.95); display: flex; flex-direction: column; justify-content: center; align-items: center; backdrop-filter: blur(10px); padding: 20px; font-family: 'Inter', sans-serif; }
          .paywall-title { color: ${matteGold}; font-size: clamp(32px, 8vw, 64px); font-weight: 900; letter-spacing: 6px; margin: 0; text-transform: uppercase; text-shadow: 0 0 20px rgba(226,194,85,0.5); text-align: center; }
          .paywall-subtitle { color: rgba(255,255,255,0.8); font-size: clamp(12px, 3vw, 16px); font-weight: 600; margin: 15px 0 40px 0; letter-spacing: 4px; text-align: center; max-width: 600px; }
          .button-group { display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 380px; }
          
          /* PRIMARY BUTTON STANDARD APPLIED */
          .cta-btn { display: flex; align-items: center; justify-content: center; gap: 12px; padding: clamp(16px, 2vh, 20px) 20px; border-radius: 8px; font-size: clamp(12px, 2.5vw, 14px); font-weight: 900; letter-spacing: 2px; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; width: 100%; font-family: 'Inter', sans-serif; }
          .cta-btn.primary { background: ${metalGradient}; color: #000; border: none; box-shadow: 0 10px 20px rgba(226, 194, 85, 0.3); }
          .cta-btn.primary:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(226, 194, 85, 0.5); }
          .cta-btn.secondary { background: rgba(0,0,0,0.5); border: 2px solid ${matteGold}; color: ${matteGold}; backdrop-filter: blur(10px); }
          .cta-btn.secondary:hover { background: rgba(226, 194, 85, 0.1); transform: translateY(-3px); }

          @media (max-height: 650px) {
              .arena-stage { top: 62%; width: clamp(220px, 65vmin, 500px); } 
              .ad-prompt-container { top: 5vh; }
              .button-group { flex-direction: row; max-width: 600px; gap: 15px; }
              .paywall-title { font-size: clamp(24px, 5vw, 40px); }
              .paywall-subtitle { margin: 10px 0 20px 0; }
          }
        `}
      </style>

      {/* DYNAMIC TOP HEADER */}
      <div className="ad-prompt-container">
          <div className="ad-prompt-title" style={{ color: turn === 'black' ? '#ff3333' : '#fff' }}>
            {turn === 'black' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <Swords size={24} color="#ff3333" /> OPPONENT IS THINKING...
                </div>
            ) : (
                miniBoard.show ? "" : (introDelay ? "OBSERVE THE BATTLEFIELD..." : tutorialText)
            )}
          </div>
      </div>

      {/* THE MINI-BOARD TUTORIAL MODAL */}
      {miniBoard.show && activeDemo && (
          <div className="mini-overlay">
              <div className="mini-box">
                  <h2 className="mini-title">{activeDemo.title}</h2>
                  <p className="mini-desc">{activeDemo.desc}</p>
                  
                  <div className="mini-grid">
                      {Array.from({ length: 4 }).map((_, r) => (
                          Array.from({ length: 4 }).map((_, c) => {
                              const isPiece = activeDemo.r === r && activeDemo.c === c;
                              const isTarget = activeDemo.targets.some(t => t[0] === r && t[1] === c);
                              
                              return (
                                  <div key={`${r}-${c}`} className="mini-cell">
                                      {isPiece && <div className="mini-piece" style={{ backgroundImage: `url(${getCardImage(activeDemo.type, 'red')})` }} />}
                                      {isTarget && !isPiece && <div className="mini-target-dot" />}
                                  </div>
                              );
                          })
                      ))}
                  </div>

                  <div className="mini-footer">
                      <span className="mini-timer">RESUMING IN {miniBoard.timer}S...</span>
                      <button className="mini-skip-btn" onClick={() => setMiniBoard(prev => ({ ...prev, show: false }))}>
                          <FastForward size={14} /> SKIP
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* THE DEMO BOARD */}
      <div className="arena-stage" style={{ 
          filter: paywall.show || miniBoard.show ? 'blur(8px)' : 'none', 
          opacity: paywall.show || miniBoard.show ? 0.4 : 1, 
          pointerEvents: introDelay || miniBoard.show ? 'none' : 'auto', 
          transition: 'all 0.5s ease' 
      }}>
        <div className="board-3d">
          <div className="grid-container">
            {renderBoard.map((cell) => {
              
              const isSource = step <= 4 && !selectedCell && isGuidedSquare(cell.realRow, cell.realCol, 'from');
              const isGuidedTarget = step <= 4 && selectedCell && isGuidedSquare(cell.realRow, cell.realCol, 'to');
              
              const isGlowing = (isSource || isGuidedTarget) && !miniBoard.show;
              const isSelected = selectedCell && selectedCell.r === cell.realRow && selectedCell.c === cell.realCol;

              let glowClass = '';
              if (isSelected) glowClass = 'selected-glow';
              else if (isGlowing) glowClass = 'tutorial-glow';
              else if (cell.isTarget) glowClass = 'is-target';

              return (
                <div 
                  key={cell.id} 
                  className={`board-card ${cell.piece ? '' : 'empty'} ${glowClass}`}
                  onClick={() => handleCellClick(cell.realRow, cell.realCol)}
                >
                  {cell.piece && (
                    <div style={{ 
                        width: '100%', height: '100%', 
                        backgroundImage: `url(${getCardImage(cell.piece.type, cell.piece.color)})`, 
                        backgroundSize: '100% 100%', backgroundPosition: 'center', borderRadius: '4px',
                        pointerEvents: 'none',
                        transform: cell.piece.color === 'black' ? 'rotate(180deg)' : 'none'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* THE PAYWALL SCREEN */}
      {paywall.show && (
        <div className="paywall-overlay">
            <h1 className="paywall-title">{paywall.title}</h1>
            <p className="paywall-subtitle">{paywall.subtitle}</p>
            
            <div className="button-group">
                <button className="cta-btn primary" onClick={() => finishTrial('web')}>
                    <MonitorPlay size={22} strokeWidth={2.5} />
                    <span>PLAY FULL WEB VERSION</span>
                </button>
                <button className="cta-btn secondary" onClick={() => finishTrial('app')}>
                    <Download size={22} strokeWidth={2.5} />
                    <span>DOWNLOAD THE APP</span>
                </button>
            </div>
        </div>
      )}
    </GameLayout>
  );
};

export default PlayableAd;