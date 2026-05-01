import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameLayout from './GameLayout';
import Header from './Header';

const BattleSelection = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  
  // Real state variable for login status
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  const matteGold = '#E2C255';

  useEffect(() => {
    // --- FAKE AUTHENTICATION CHECK ---
    // If the browser remembers we clicked "Play as Guest", unlock the doors!
    const session = localStorage.getItem('mock_guest_session');
    if (session === 'true') {
        setIsLoggedIn(true);
    }

    // Animations
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 500);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // --- SMART NAVIGATION LOGIC ---
const handleModeSelection = (mode) => {
  if (mode === 'local') {
    navigate('/game-arena', { state: { gameMode: 'local', firstTurn: 'red' } });
  } else if (mode === 'online') {
    navigate('/online-match-setup');
  }
};

  return (
    <GameLayout phase={phase}>
      <Header variant={isLoggedIn ? "profile" : "auth"} />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

          @keyframes pulseGoldPortal {
            0% { box-shadow: 0 0 15px rgba(226, 194, 85, 0.4), 0 5px 20px rgba(0,0,0,0.5); }
            100% { box-shadow: 0 0 35px rgba(226, 194, 85, 0.8), 0 10px 30px rgba(0,0,0,0.6); }
          }

          /* --- STYLE GUIDE TYPOGRAPHY --- */
          .page-title {
            font-family: 'Inter', sans-serif;
            color: #ffffff;
            font-weight: 900;
            font-size: clamp(16px, 2.5vw, 24px);
            letter-spacing: 6px;
            text-transform: uppercase;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
            text-align: center;
            margin-bottom: 5vh;
            flex-shrink: 0;
          }

          .mode-title {
            font-family: 'Inter', sans-serif;
            color: ${matteGold};
            font-weight: 900;
            font-size: clamp(24px, 3vw, 36px);
            letter-spacing: 4px;
            text-transform: uppercase;
            text-shadow: 0 0 20px rgba(226, 194, 85, 0.5);
            margin: 0;
          }

          .mode-subtitle {
            font-family: 'Inter', sans-serif;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 5px 0 0 0;
          }

          .portal-container {
            position: relative;
            width: clamp(280px, 35vw, 500px);
            aspect-ratio: 16 / 9;
            border-radius: 16px;
            border: 3px solid ${matteGold};
            background: rgba(10, 10, 15, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease;
            overflow: hidden;
            animation: pulseGoldPortal 3s infinite alternate ease-in-out;
          }

          .portal-overlay {
            position: absolute;
            inset: 0;
            box-shadow: inset 0 0 40px rgba(0,0,0,0.9);
            pointer-events: none;
            z-index: 5;
          }

          .mode-wrapper:hover .portal-container {
            transform: scale(1.05) translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.9), 0 0 40px rgba(226, 194, 85, 0.6) !important;
            animation: none; /* Stop the pulse while hovered so the intense shadow takes over */
          }

          @media (max-width: 768px) {
            .portals-flex { 
              flex-direction: column !important; 
              gap: 40px !important; 
              padding: 20px 0 !important; 
              overflow-y: auto !important;
              justify-content: flex-start !important;
            }
            .portal-container { width: 85vw; }
          }
        `}
      </style>

      <div style={{ position: 'absolute', top: '140px', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', boxSizing: 'border-box', overflow: 'hidden', zIndex: 40 }}>

        <h1 className="page-title">
          SELECT YOUR BATTLEGROUND
        </h1>

        <div className="portals-flex" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 'clamp(40px, 8vw, 120px)', opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? 'scale(1)' : 'scale(0.95)', transition: 'opacity 1s ease-out, transform 1s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>

          {/* LOCAL MODE */}
          <div className="mode-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }} onClick={() => handleModeSelection('local')}>
            <div className="portal-container">
              <img src="/localmode.png" alt="Local Mode" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              <div className="portal-overlay"></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 className="mode-title">LOCAL</h2>
              <h3 className="mode-subtitle">OFFLINE 1V1</h3>
            </div>
          </div>

          {/* ONLINE MODE */}
          <div className="mode-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }} onClick={() => handleModeSelection('online')}>
            <div className="portal-container">
              <img src="/onlinemode.png" alt="Online Mode" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              <div className="portal-overlay"></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 className="mode-title">ONLINE</h2>
              <h3 className="mode-subtitle">GLOBAL BATTLE</h3>
            </div>
          </div>

        </div>
      </div>
    </GameLayout>
  );
};

export default BattleSelection;
