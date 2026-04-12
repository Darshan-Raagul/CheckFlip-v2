import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import GameLayout from './GameLayout';
import Header from './Header';

const CheckFlipLogin = () => {
  const navigate = useNavigate();
  const location = useLocation(); // <-- This grabs the secret map we sent from BattleSelection
  const [phase, setPhase] = useState(0);

  // Branding Constants
  const matteGold = '#E2C255';
  const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // --- THIS FUNCTION BREAKS THE LOOP ---
  const handleAuthentication = () => {
    // 1. Give the browser the "Key" so BattleSelection knows you are logged in
    localStorage.setItem('mock_guest_session', 'true');

    // 2. Read the secret map sent by the Selection page
    const destination = location.state?.redirectTo;

    if (destination) {
        // Instantly route them into the Arena (No Loop!)
        navigate(destination.pathname, { state: destination.state });
    } else {
        // Fallback routing
        navigate('/selection');
    }
  };

  return (
    <GameLayout phase={phase}>
      <Header variant="auth" />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

          /* --- STYLE GUIDE: INPUTS & PRIMARY BUTTON --- */
          .cyber-input {
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(226, 194, 85, 0.3);
            border-radius: 8px;
            color: #fff;
            padding: 15px 20px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            letter-spacing: 1px;
            outline: none;
            transition: all 0.3s ease;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
          }
          
          .cyber-input:focus {
            border-color: ${matteGold};
            box-shadow: 0 0 15px rgba(226, 194, 85, 0.2), inset 0 0 10px rgba(0,0,0,0.5);
          }
          
          .cyber-input::placeholder {
            color: rgba(255, 255, 255, 0.3);
            font-weight: 600;
          }

          .cyber-btn {
            background: ${metalGradient};
            color: #000;
            font-weight: 900;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-radius: 8px;
            border: none;
            padding: 16px 30px;
            box-shadow: 0 10px 20px rgba(226, 194, 85, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Inter', sans-serif;
          }

          .cyber-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(226, 194, 85, 0.5);
          }

          /* --- STYLE GUIDE: SECONDARY BUTTON (GUEST) --- */
          .guest-btn {
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid ${matteGold};
            color: ${matteGold};
            font-weight: 900;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-radius: 8px;
            padding: 14px 30px; /* slightly less padding to account for 2px border */
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Inter', sans-serif;
          }

          .guest-btn:hover {
            background: rgba(226, 194, 85, 0.1);
            transform: translateY(-3px);
          }
        `}
      </style>

      {/* MODAL CONTAINER - UPDATED TO STYLE GUIDE SPEC */}
      <div style={{
          position: 'absolute', top: '55%', left: '50%',
          transform: phase >= 2 ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -45%) scale(0.95)',
          width: 'clamp(320px, 90vw, 420px)', padding: '40px', boxSizing: 'border-box',
          background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%)',
          border: `1px solid rgba(226, 194, 85, 0.5)`, borderRadius: '16px',
          boxShadow: `0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2)`,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', gap: '24px',
          opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          zIndex: 100,
        }}
      >
        {/* TYPOGRAPHY - UPDATED TO STYLE GUIDE SPEC */}
        <div style={{ textAlign: 'center', marginBottom: '5px' }}>
          <h2 style={{ margin: 0, color: matteGold, fontSize: '24px', fontWeight: '900', letterSpacing: '4px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', textShadow: '0 0 20px rgba(226,194,85,0.5)' }}>
            WELCOME BACK
          </h2>
          <p style={{ margin: '12px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '11px', letterSpacing: '1px', fontFamily: "'Inter', sans-serif", fontWeight: '600', lineHeight: '1.6' }}>
            ENTER YOUR CREDENTIALS
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="USERNAME OR EMAIL" className="cyber-input" />
          <input type="password" placeholder="PASSWORD" className="cyber-input" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter', sans-serif", letterSpacing: '1px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
            <input type="checkbox" style={{ accentColor: matteGold, cursor: 'pointer' }} /> REMEMBER ME
          </label>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} style={{ color: matteGold, textDecoration: 'none', transition: 'text-shadow 0.3s' }} onMouseOver={(e) => e.target.style.textShadow = `0 0 8px ${matteGold}`} onMouseOut={(e) => e.target.style.textShadow = 'none'}>
            FORGOT PASSWORD?
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '5px' }}>
          {/* PRIMARY LOGIN BUTTON */}
          <button onClick={handleAuthentication} className="cyber-btn">
            LOGIN
          </button>

          {/* GUEST BUTTON */}
          <button onClick={handleAuthentication} className="guest-btn">
            PLAY AS GUEST
          </button>
        </div>

        {/* BOTTOM LINK - UPDATED TO STYLE GUIDE SPEC */}
        <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '12px', color: '#aaa', fontFamily: "'Inter', sans-serif", letterSpacing: '1px' }}>
          NEW PLAYER?{' '}
          <span 
            onClick={() => navigate('/register')} 
            style={{ color: '#ffffff', fontWeight: '900', cursor: 'pointer', marginLeft: '5px', borderBottom: `2px solid ${matteGold}`, paddingBottom: '2px', transition: 'color 0.3s ease' }}
            onMouseOver={(e) => e.currentTarget.style.color = matteGold}
            onMouseOut={(e) => e.currentTarget.style.color = '#ffffff'}
          >
            CREATE ACCOUNT
          </span>
        </div>
      </div>
    </GameLayout>
  );
};

export default CheckFlipLogin;