import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, RoundedBox, useTexture, Html } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { RefreshCcw, Gamepad2, Lock, ShieldCheck } from 'lucide-react'; 

import GameLayout from './GameLayout';
import Header from './Header';
import socket from './socket';

const matteGold = '#E2C255'; 
const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';
const crimsonRed = '#d31a1e';

// --- PROCEDURAL HELPERS ---
const createParticleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true; return tex;
};

const SteamParticle = ({ texture, color, initialP, stackHeight }) => {
  const spriteRef = useRef();
  const materialRef = useRef();

  useFrame(() => {
    if (!spriteRef.current || !materialRef.current) return;
    spriteRef.current.position.y += initialP.speed;
    if (spriteRef.current.position.y > stackHeight + 0.6) {
      spriteRef.current.position.y = -0.1;
    }
    let currentOpacity = initialP.maxOpacity;
    const y = spriteRef.current.position.y;
    if (y < 0.1) currentOpacity *= (y + 0.1) / 0.2; 
    else if (y > stackHeight) currentOpacity *= (stackHeight + 0.6 - y) / 0.6; 
    materialRef.current.opacity = Math.max(0, currentOpacity);
  });

  return (
    <sprite ref={spriteRef} position={[initialP.x, initialP.y, initialP.z]} scale={[initialP.size, initialP.size, 1]}>
      <spriteMaterial ref={materialRef} map={texture} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

const StrictEdgeFlame = ({ color, scale, texture, stackHeight }) => {
  const particles = useMemo(() => {
    return Array.from({ length: 150 }, () => {
      const isXEdge = Math.random() > 0.5;
      let x, z;
      if (isXEdge) {
        x = (Math.random() > 0.5 ? 1 : -1) * 1.62; 
        z = (Math.random() - 0.5) * 4.45;
      } else {
        x = (Math.random() - 0.5) * 3.15;
        z = (Math.random() > 0.5 ? 1 : -1) * 2.27; 
      }
      const isAsh = Math.random() > 0.7;
      return { 
        x, z, y: Math.random() * stackHeight, 
        speed: isAsh ? Math.random() * 0.03 + 0.02 : Math.random() * 0.015 + 0.005, 
        size: isAsh ? Math.random() * 0.15 + 0.05 : Math.random() * 0.5 + 0.2, 
        maxOpacity: isAsh ? Math.random() * 0.8 + 0.4 : Math.random() * 0.4 + 0.2, 
      };
    });
  }, [stackHeight]);

  if (!texture) return null;

  return (
    <animated.group scale={scale}>
      {particles.map((p, i) => (
        <SteamParticle key={i} texture={texture} color={color} initialP={p} stackHeight={stackHeight} />
      ))}
    </animated.group>
  );
};

const DeckCard = ({ isRed, isTopCard, cardBackTex }) => {
  const edgeColor = '#fdfdfd'; 
  const planeWidth = 3.16; 
  const planeLength = 4.46;

  return (
    <group>
      <RoundedBox args={[3.2, 0.015, 4.5]} radius={0.004} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color={edgeColor} metalness={0.0} roughness={0.9} />
      </RoundedBox>

      {isTopCard && (
        <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[planeWidth, planeLength]} />
          <meshStandardMaterial map={cardBackTex} roughness={0.4} metalness={isRed ? 0.1 : 0.2} />
        </mesh>
      )}

      {!isTopCard && (
        <mesh position={[0, -0.008, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <planeGeometry args={[3.1, 4.4]} />
          <meshStandardMaterial color="#000000" roughness={1} />
        </mesh>
      )}
    </group>
  );
};

const DeckStack = ({ basePosition, baseRotation, baseScale, isVisible, auraTexture, cardBackTex, isFocused, showPrompt, promptText, promptColor, isMobile, onClick }) => {
  const { scale } = useSpring({ scale: isVisible ? baseScale : 0, config: { duration: 50 } });

  const cardTransforms = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
    x: (Math.random() - 0.5) * 0.015,
    z: (Math.random() - 0.5) * 0.015,
    rotY: (Math.random() - 0.5) * 0.01,
    y: i * 0.025
  })), []);

  const labelY = isMobile ? 2.4 : 2.5; 
  const promptZ = -0.5; 

  return (
    <group position={basePosition}>
      <animated.group 
        rotation={baseRotation} 
        scale={scale} 
        onClick={isVisible && onClick ? (e) => { e.stopPropagation(); onClick(); } : null}
        onPointerOver={() => { if(onClick && isVisible) document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <StrictEdgeFlame color={promptColor} scale={1} texture={auraTexture} stackHeight={0.75} />
        {cardTransforms.map((t, i) => (
          <group key={i} position={[t.x, t.y, t.z]} rotation={[0, t.rotY, 0]}>
            <DeckCard isTopCard={i === 29} cardBackTex={cardBackTex} />
          </group>
        ))}
      </animated.group>

      {showPrompt && (
        <Html position={[0, labelY, promptZ]} center style={{ zIndex: 120 }}>
          <div style={{ 
            opacity: isFocused ? 1 : 0, 
            transition: 'opacity 0.5s ease',
            color: promptColor, 
            fontFamily: "'Inter', sans-serif",
            fontSize: isMobile ? '12px' : '15px', 
            fontWeight: '900', 
            letterSpacing: '4px', paddingLeft: '4px', textShadow: `0 0 15px ${promptColor}`, 
            pointerEvents: 'none', whiteSpace: 'nowrap',
            animation: (promptText.includes("WAITING") || promptText.includes("OPPONENT")) ? 'pulseText 1.5s infinite' : 'none'
          }}>
            {promptText}
          </div>
        </Html>
      )}
    </group>
  );
};

const WebGLScene = ({ phase, localPicked, opponentPicked, auraTexture, isFocused, isMobile, isTablet, localPlayerColor, handleLocalDraw, onLoadComplete }) => {
  const [redTex, blackTex] = useTexture(['/red_back.png', '/black_back.png']);
  useEffect(() => onLoadComplete(), [onLoadComplete]);

  const localDeckPos = isMobile ? [0, -4.2, 0] : (isTablet ? [-2.8, -1.0, 0] : [-4.0, -1.0, 0]);
  const opponentDeckPos = isMobile ? [0, 1.2, 0] : (isTablet ? [2.8, -1.0, 0] : [4.0, -1.0, 0]);
  const vsPosition = isMobile ? [0, -1.3, 0] : [0, -1.0, 0];
  const deckScale = isMobile ? 0.6 : (isTablet ? 0.65 : 0.85);

  const isLocalBlack = localPlayerColor === 'black';

  let localPrompt = "SELECT YOUR DECK";
  if (localPicked && !opponentPicked) localPrompt = "WAITING FOR OPPONENT...";
  if (!localPicked && opponentPicked) localPrompt = "YOUR TURN TO SELECT";

  return (
    <>
      <ambientLight intensity={isFocused ? 0.3 : 0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
      <Environment preset="city" />
      
      <DeckStack 
        basePosition={localDeckPos} 
        baseRotation={[0.35, 0, 0]} 
        baseScale={deckScale * (isMobile ? 1.05 : 1)} 
        isVisible={!localPicked} 
        auraTexture={auraTexture} 
        cardBackTex={isLocalBlack ? blackTex : redTex} 
        isFocused={isFocused && phase === 'picking'} 
        showPrompt={phase === 'picking' && !localPicked} 
        promptText={localPrompt} 
        promptColor={isLocalBlack ? matteGold : '#ff1100'} 
        isMobile={isMobile} 
        onClick={handleLocalDraw} 
      />

      <DeckStack 
        basePosition={opponentDeckPos} 
        baseRotation={[0.35, 0, 0]} 
        baseScale={deckScale} 
        isVisible={!opponentPicked} 
        auraTexture={auraTexture} 
        cardBackTex={isLocalBlack ? redTex : blackTex} 
        isFocused={isFocused && phase === 'picking'} 
        showPrompt={phase === 'picking' && !opponentPicked} 
        promptText={opponentPicked ? "CHOICE LOCKED" : "OPPONENT CHOOSING..."} 
        promptColor={isLocalBlack ? '#ff1100' : '#aaa'} 
        isMobile={isMobile} 
      />

      <Html position={vsPosition} center style={{ zIndex: 120, pointerEvents: 'none' }}>
        <div style={{ color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: isMobile ? '18px' : '24px', fontWeight: '900', fontStyle: 'italic', letterSpacing: '2px', opacity: isFocused ? 0.2 : 0.8 }}>VS</div>
      </Html>
    </>
  );
};

const ActionPopup = ({ show, text, Icon, color }) => {
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0) scale(1)' : 'translateY(-15px) scale(0.9)',
      transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      background: 'linear-gradient(135deg, rgba(15,15,20,0.95), rgba(5,5,8,0.98))',
      border: `1px solid rgba(226, 194, 85, 0.5)`,
      boxShadow: `0 15px 40px rgba(0,0,0,0.9), inset 0 0 15px ${color}33`,
      borderRadius: '50px',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backdropFilter: 'blur(10px)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    }}>
      <Icon size={18} color={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      <span style={{ color: '#fff', fontFamily: "'Inter', sans-serif", fontWeight: '900', letterSpacing: '2px', fontSize: '12px', textShadow: `0 0 10px ${color}66` }}>
        {text}
      </span>
    </div>
  );
};

const UICard = ({ isRed, cardData, isPicked, phase, isWinner, isMobile, isTablet }) => {
  const isSpinning = phase === 'spinning';
  const isResting = phase === 'resting';
  const isRevealed = phase === 'revealed' || phase === 'exploded';
  const showRealCard = isRevealed;

  let rotateY = 0;
  if (isSpinning || isResting) rotateY = 1080; 
  if (isRevealed) rotateY = 1080 + 180; 

  let transitionStyle = 'none';
  if (isSpinning) transitionStyle = 'transform 3.7s cubic-bezier(0.1, 0.8, 0.2, 1)'; 
  else if (isRevealed) transitionStyle = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'; 

  const isVisible = isPicked || !!cardData;
  const colorHex = isRed ? crimsonRed : matteGold;

  return (
    <div style={{ width: isMobile ? '35vw' : (isTablet ? '20vw' : '16vw'), maxWidth: '220px', minWidth: '100px', aspectRatio: '2.5/3.5', perspective: '1200px' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative', transition: transitionStyle, transformStyle: 'preserve-3d', transform: `rotateY(${rotateY}deg) scale(${isVisible ? (isWinner && phase === 'exploded' ? 1.1 : 1) : 0.8})`, opacity: isVisible ? 1 : 0, boxShadow: isVisible ? (isWinner && phase === 'exploded' ? `0 0 40px 15px ${isRed ? '#ff4d4d' : '#ffffff'}` : `0 15px 35px rgba(0,0,0,0.8), 0 0 25px ${colorHex}55`) : 'none', borderRadius: '12px' }}>
        
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', backgroundImage: isRed ? 'url(/red_back.png)' : 'url(/black_back.png)', backgroundColor: isRed ? '#ff6600' : '#111111', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderRadius: '12px' }} />
        
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: showRealCard ? '#f5f5f5' : (isRed ? '#ff6600' : '#111111'), border: showRealCard ? '2px solid #222' : 'none', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', backgroundImage: showRealCard && cardData?.img ? `url("${cardData.img}")` : 'none', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', transform: showRealCard ? 'none' : 'scaleX(-1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
             {showRealCard && cardData && !cardData.img && (
                 <span style={{color: '#111', fontFamily: "'Inter', sans-serif", fontWeight: '900', fontSize: 'clamp(14px, 2vw, 20px)'}}>{cardData.name}</span>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

const DecideFate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [screen, setScreen] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sceneReady, setSceneReady] = useState(false);
  
  const [phase, setPhase] = useState('initializing'); 
  const [hasTimedOut, setHasTimedOut] = useState(false); 
  const [timeoutReason, setTimeoutReason] = useState('no_show'); 
  
  const [localPicked, setLocalPicked] = useState(false);
  const [opponentPicked, setOpponentPicked] = useState(false);

  const [showLocalLock, setShowLocalLock] = useState(false);
  const [showOpponentLock, setShowOpponentLock] = useState(false);

  const [localCard, setLocalCard] = useState(null);
  const [opponentCard, setOpponentCard] = useState(null);
  const [winner, setWinner] = useState(null);
  const [isTieBreak, setIsTieBreak] = useState(false);
  
  const [bgPhase, setBgPhase] = useState(0); 
  const [auraTexture, setAuraTexture] = useState(null);
  
  const isHost = location.state?.isHost ?? true;
  const localPlayerColor = location.state?.localPlayerColor || (isHost ? 'black' : 'red'); 
  const matchCode = location.state?.matchCode || "ERROR";

  const isLocalBlack = localPlayerColor === 'black';

  // --- FIX: REACT 18 DOUBLE INVOKE GUARD ---
  const hasEnteredRoom = useRef(false);

  useEffect(() => {
    const handlePopState = () => socket.emit('leaveMatch', { roomId: matchCode });
    const handleBeforeUnload = () => socket.emit('leaveMatch', { roomId: matchCode });

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [matchCode]);

  useEffect(() => {
    const handleAbandon = () => {
      setHasTimedOut(true);
      setTimeoutReason('abandoned');
    };

    socket.on('opponentAbandoned', handleAbandon);
    return () => socket.off('opponentAbandoned', handleAbandon);
  }, []);

  useEffect(() => {
    const handleResize = () => setScreen({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPortrait = screen.h > screen.w;
  const isMobile = screen.w <= 768 || (isPortrait && screen.w <= 1024);
  const isTablet = screen.w > 768 && screen.w <= 1180 && !isMobile;

  useEffect(() => {
    setAuraTexture(createParticleTexture());
    const bgTimer = setTimeout(() => setBgPhase(1), 100);
    return () => clearTimeout(bgTimer);
  }, []);

  useEffect(() => {
    let timer;
    if (phase === 'waiting_connection') {
        timer = setTimeout(() => {
            setHasTimedOut(true);
            setTimeoutReason('no_show');
        }, 30000); 
    } else if (phase === 'picking') {
        timer = setTimeout(() => {
            if (!localPicked || !opponentPicked) {
                setHasTimedOut(true);
                setTimeoutReason('afk');
            }
        }, 30000);
    }
    return () => clearTimeout(timer);
  }, [phase, localPicked, opponentPicked]);

  useEffect(() => {
    if (phase === 'match_connected') {
        const t = setTimeout(() => {
            setPhase('picking');
        }, 3000);
        return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (localPicked) {
        setShowLocalLock(true);
        setTimeout(() => setShowLocalLock(false), 3000);
    }
  }, [localPicked]);

  useEffect(() => {
    if (opponentPicked) {
        setShowOpponentLock(true);
        setTimeout(() => setShowOpponentLock(false), 3000);
    }
  }, [opponentPicked]);

  useEffect(() => {
    // Prevent strictly executing twice in dev mode
    if (!hasEnteredRoom.current) {
      socket.emit('enterFateScreen', { roomId: matchCode, playerColor: localPlayerColor });
      hasEnteredRoom.current = true;
    }
    socket.emit('requestSync', { roomId: matchCode });

    const handleStateUpdate = (game) => {
        if (game.status === 'abandoned') {
            setHasTimedOut(true);
            setTimeoutReason('abandoned');
            return; 
        }

        setPhase((prev) => {
            if (game.status === 'waiting') return 'waiting_connection';
            if (game.status === 'coin_flip' && (prev === 'initializing' || prev === 'waiting_connection')) {
                setHasTimedOut(false);
                return 'match_connected'; 
            }
            return prev;
        });

        if (game.status === 'coin_flip' && game.cardPicks) {
            const oppColor = localPlayerColor === 'red' ? 'black' : 'red';
            setOpponentPicked(game.cardPicks[oppColor]);
            setLocalPicked(game.cardPicks[localPlayerColor]);
        }
    };

    socket.on('gameStateUpdate', handleStateUpdate);
    return () => socket.off('gameStateUpdate', handleStateUpdate);
  }, [localPlayerColor, matchCode]);

  useEffect(() => {
      const handleTriggerSpin = ({ redCard, blackCard, winnerColor, isTie }) => {
          setLocalCard(localPlayerColor === 'red' ? redCard : blackCard);
          setOpponentCard(localPlayerColor === 'red' ? blackCard : redCard);
          
          setIsTieBreak(isTie);
          triggerSequence(winnerColor);
      };

      socket.on('triggerSpin', handleTriggerSpin);
      return () => socket.off('triggerSpin', handleTriggerSpin);
  }, [localPlayerColor, navigate]);

  const handleLocalDraw = () => {
    if (phase !== 'picking' || !sceneReady || localPicked || hasTimedOut) return;
    setLocalPicked(true); 
    socket.emit('drawCardPick', { roomId: matchCode, playerColor: localPlayerColor });
  };

  const triggerSequence = (winnerColor) => {
    setPhase('spinning');
    setTimeout(() => {
      setPhase('resting');
      setTimeout(() => {
        setPhase('revealed');
        setWinner(winnerColor);
        setTimeout(() => {
          setPhase('exploded');
          setTimeout(() => navigate('/game-arena', { 
            state: { gameMode: 'online', localPlayerColor: localPlayerColor, matchCode: matchCode } 
          }), 2500); 
        }, 1000); 
      }, 500); 
    }, 3700); 
  };

  const isCinematic = phase === 'initializing' || phase === 'waiting_connection' || phase === 'match_connected';

  const localCardTop = isMobile ? '82%' : (isTablet ? '60%' : '55%');
  const localCardLeft = isMobile ? '50%' : (isTablet ? '28%' : '25%');
  
  const opponentCardTop = isMobile ? '30%' : (isTablet ? '60%' : '55%');
  const opponentCardLeft = isMobile ? '50%' : (isTablet ? '72%' : '75%');

  return (
    <GameLayout phase={bgPhase}> 
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

          @keyframes pulseText { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
          @keyframes popIn { 0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
          
          /* STYLE GUIDE TYPOGRAPHY APPLIED */
          .global-header { 
            font-family: 'Inter', sans-serif;
            margin: 0; color: #ffffff; font-size: clamp(20px, 4vw, 42px); font-weight: 900; 
            letter-spacing: ${isMobile ? '3px' : '6px'}; text-transform: uppercase; padding: 0 10px; 
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); 
          }
          .global-sub { 
            font-family: 'Inter', sans-serif;
            margin: 5px 0 0 0; color: ${matteGold}; font-size: clamp(10px, 1.5vw, 14px); font-weight: 800; 
            letter-spacing: ${isMobile ? '4px' : '8px'}; text-transform: uppercase; 
          }
          
          .cyber-progress-container { width: 100%; max-width: 350px; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; margin-top: 25px; box-shadow: inset 0 0 10px rgba(0,0,0,0.8); position: relative; }
          .cyber-progress-fill { height: 100%; background: ${matteGold}; box-shadow: 0 0 15px ${matteGold}; transition: width 0.4s ease-out, background 0.4s ease-out, box-shadow 0.4s ease-out; }
          .fill-waiting { width: 30%; animation: progressPingPong 1.5s infinite ease-in-out; }
          .fill-connected { width: 100%; background: #00ffcc; box-shadow: 0 0 20px #00ffcc; }

          @keyframes progressPingPong { 0% { transform: translateX(-100%); width: 40%; } 100% { transform: translateX(350%); width: 40%; } }

          /* BUTTON STANDARDIZATION */
          .timeout-btn { 
            font-family: 'Inter', sans-serif;
            display: flex; align-items: center; justify-content: center; gap: 10px; padding: 15px 30px; border-radius: 8px; font-size: 14px; font-weight: 900; letter-spacing: 2px; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; border: none; width: 100%; max-width: 280px; 
          }
          .timeout-btn.primary { background: ${metalGradient}; color: #000; box-shadow: 0 10px 20px rgba(226, 194, 85, 0.3); }
          .timeout-btn.primary:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(226, 194, 85, 0.5); }
          .timeout-btn.secondary { background: rgba(0,0,0,0.5); border: 2px solid ${matteGold}; color: ${matteGold}; }
          .timeout-btn.secondary:hover { background: rgba(226, 194, 85, 0.1); transform: translateY(-3px); }
        `}
      </style>

      {!sceneReady && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, backgroundColor: '#030406', display: 'flex', justifyContent: 'center', alignItems: 'center', color: matteGold, fontSize: '14px', letterSpacing: '4px', fontWeight: '900', fontFamily: "'Inter', sans-serif" }}>
          <div style={{ animation: 'pulseText 1.5s infinite' }}>INITIALIZING ARENA...</div>
        </div>
      )}

      {/* --- TIMEOUT MODAL (STANDARDIZED) --- */}
      {hasTimedOut && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, backgroundColor: 'rgba(5, 5, 10, 0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(12px)', padding: '20px' }}>
          <h1 style={{ color: matteGold, fontFamily: "'Inter', sans-serif", fontSize: 'clamp(24px, 5vw, 40px)', margin: 0, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', textShadow: '0 0 20px rgba(226,194,85,0.5)', textAlign: 'center' }}>
            {timeoutReason === 'no_show' ? (isLocalBlack ? 'NO ONE JOINED.' : 'HOST NEVER CONNECTED.') 
             : timeoutReason === 'abandoned' ? 'ROOM INVALID / ABANDONED'
             : 'OPPONENT WENT AFK.'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: 'clamp(14px, 3vw, 18px)', marginTop: '20px', marginBottom: '40px', letterSpacing: '2px', textAlign: 'center', maxWidth: '500px' }}>
            {timeoutReason === 'no_show' ? 'PLEASE TRY AGAIN.' 
             : timeoutReason === 'abandoned' ? (isLocalBlack ? 'THE OPPONENT LEFT. PLEASE GENERATE A NEW ROOM CODE.' : 'THE HOST HAS CLOSED THIS ROOM. PLEASE FIND A NEW MATCH.')
             : 'THEY FAILED TO MAKE A SELECTION.'}
          </p>
          <div style={{ display: 'flex', gap: '20px', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', width: '100%', alignItems: 'center' }}>
             <button className="timeout-btn primary" onClick={() => {
                 socket.emit('leaveMatch', { roomId: matchCode });
                 navigate(-1);
             }}>
                <RefreshCcw size={18} strokeWidth={2.5} />
                <span>{isLocalBlack && timeoutReason === 'abandoned' ? 'GENERATE NEW CODE' : 'TRY AGAIN'}</span>
             </button>
             <button className="timeout-btn secondary" onClick={() => {
                 socket.emit('leaveMatch', { roomId: matchCode });
                 navigate('/game-arena', { state: { gameMode: 'local', localPlayerColor: 'red', firstTurn: 'red' } });
             }}>
                <Gamepad2 size={18} strokeWidth={2.5} /><span>PLAY LOCAL MODE</span>
             </button>
          </div>
        </div>
      )}

      {/* --- TIE BREAK MODAL (STANDARDIZED) --- */}
      {isTieBreak && (phase === 'revealed' || phase === 'exploded') && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', animation: 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(15,15,20,0.95), rgba(5,5,8,0.98))', border: `1px solid rgba(226, 194, 85, 0.5)`, boxShadow: `0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2)`, borderRadius: '16px', padding: '20px 40px', textAlign: 'center' }}>
             <h2 style={{ color: '#fff', fontFamily: "'Inter', sans-serif", fontWeight: '900', fontSize: 'clamp(16px, 3vw, 24px)', margin: 0, letterSpacing: '4px', textTransform: 'uppercase' }}>
               VALUES ARE EQUAL
             </h2>
             <h3 style={{ color: matteGold, fontFamily: "'Inter', sans-serif", fontWeight: '700', fontSize: 'clamp(14px, 2vw, 18px)', margin: '10px 0 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>
               HOST ADVANTAGE APPLIED
             </h3>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', top: '45%', left: '0', width: '100%', zIndex: 1100, display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ height: showOpponentLock ? '45px' : '0', overflow: 'hidden', transition: 'height 0.4s ease' }}><ActionPopup show={showOpponentLock} text="OPPONENT LOCKED CHOICE" Icon={ShieldCheck} color={localPlayerColor === 'red' ? matteGold : crimsonRed} /></div>
        <div style={{ height: showLocalLock ? '45px' : '0', overflow: 'hidden', transition: 'height 0.4s ease' }}><ActionPopup show={showLocalLock} text="CHOICE LOCKED" Icon={Lock} color={localPlayerColor === 'red' ? crimsonRed : matteGold} /></div>
      </div>

      <div style={{ opacity: sceneReady ? 1 : 0, transition: 'opacity 1.5s ease-in-out', width: '100%', height: '100%' }}>

        <Canvas shadows={{ type: THREE.PCFShadowMap }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }} camera={{ position: [0, 5, isMobile ? 14 : 12], fov: isMobile ? 60 : 40 }}>
          {auraTexture && (
            <Suspense fallback={null}>
              <WebGLScene phase={phase} localPicked={localPicked} opponentPicked={opponentPicked} auraTexture={auraTexture} isFocused={!isCinematic} isMobile={isMobile} isTablet={isTablet} localPlayerColor={localPlayerColor} handleLocalDraw={handleLocalDraw} onLoadComplete={() => setSceneReady(true)} />
            </Suspense>
          )}
        </Canvas>

        <div style={{ position: 'absolute', inset: 0, backdropFilter: isCinematic ? 'blur(15px)' : 'none', backgroundColor: isCinematic ? 'rgba(0,0,0,0.6)' : 'transparent', transition: 'all 1.5s ease', pointerEvents: isCinematic ? 'auto' : 'none', zIndex: 15 }} />

        {/* --- WAITING MODAL (STANDARDIZED) --- */}
        {(phase === 'waiting_connection' || phase === 'match_connected') && !hasTimedOut && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(15,15,20,0.95), rgba(5,5,8,0.98))', border: `1px solid rgba(226, 194, 85, 0.5)`, boxShadow: `0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2)`, borderRadius: '16px', padding: '40px 60px', textAlign: 'center', width: 'clamp(280px, 80vw, 450px)' }}>
               
               <h2 style={{ color: phase === 'match_connected' ? '#00ffcc' : matteGold, fontFamily: "'Inter', sans-serif", fontWeight: '900', fontSize: 'clamp(18px, 4vw, 30px)', margin: 0, letterSpacing: '4px', textTransform: 'uppercase', transition: 'color 0.5s' }}>
                 {phase === 'waiting_connection' ? (isLocalBlack ? 'WAITING FOR OPPONENT' : 'WAITING FOR HOST TO CONNECT') : 'MATCH CONNECTED'}
               </h2>
               
               {phase === 'waiting_connection' && (
                 <p style={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: 'clamp(14px, 2vw, 18px)', margin: '15px 0 0 0', letterSpacing: '2px' }}>
                   ROOM CODE: <strong style={{ color: matteGold, fontSize: '1.2em' }}>{matchCode}</strong>
                 </p>
               )}
               
               <div className="cyber-progress-container"><div className={`cyber-progress-fill ${phase === 'waiting_connection' ? 'fill-waiting' : 'fill-connected'}`} /></div>
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', opacity: isCinematic ? 0 : 1, transition: 'opacity 1s ease' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, pointerEvents: 'auto' }}><Header variant="profile" /></div>
            <div style={{ textAlign: 'center', marginTop: isMobile ? '9vh' : '12vh', position: 'relative', zIndex: 110 }}>
              <h1 className="global-header">CREATE DOMINANCE</h1>
              <h2 className="global-sub">TO MAKE YOUR FIRST MOVE</h2>
            </div>
          </div>

          <div style={{ position: 'absolute', top: localCardTop, left: localCardLeft, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <UICard isRed={localPlayerColor === 'red'} cardData={localCard} isPicked={localPicked} phase={phase} isWinner={winner === localPlayerColor} isMobile={isMobile} isTablet={isTablet} />
          </div>

          <div style={{ position: 'absolute', top: opponentCardTop, left: opponentCardLeft, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <UICard isRed={localPlayerColor === 'black'} cardData={opponentCard} isPicked={opponentPicked} phase={phase} isWinner={winner !== localPlayerColor && winner !== 'tie'} isMobile={isMobile} isTablet={isTablet} />
          </div>

        </div>

        <div style={{ position: 'absolute', inset: 0, backgroundColor: winner === 'red' ? crimsonRed : '#ffffff', pointerEvents: 'none', zIndex: 50, transition: 'opacity 0.8s ease-out', opacity: phase === 'exploded' ? 0.3 : 0 }} />
      
      </div>
    </GameLayout>
  );
};

export default DecideFate;