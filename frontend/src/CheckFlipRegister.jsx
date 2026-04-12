import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameLayout from './GameLayout';
import Header from './Header';

const CheckFlipRegister = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  // Constants to match branding exactly
  const matteGold = '#E2C255';
  const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <GameLayout phase={phase}>
      {/* HEADER SECTION */}
      <div className="header-wrapper-fixed" style={{ position: 'relative', zIndex: 100 }}>
        <Header variant="auth" />
      </div>

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
        `}
      </style>

      {/* SCROLLABLE CONTENT AREA 
          FIXED: Removed 'alignItems: center' and added 'margin: auto' to the child 
          to prevent the Flexbox Overflow Clipping bug.
      */}
      <div style={{
        position: 'absolute', 
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', 
        flexDirection: 'column', 
        paddingTop: '140px', // Space for fixed Header
        paddingBottom: '40px',
        boxSizing: 'border-box', 
        overflowY: 'auto', 
        zIndex: 40,
        scrollBehavior: 'smooth'
      }}>

        {/* REGISTRATION FORM - UPDATED TO MODAL SPEC */}
        <div
          style={{
            margin: 'auto', // <--- This safely centers it without breaking scroll
            width: 'clamp(320px, 90vw, 460px)',
            padding: '40px',
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%)',
            border: `1px solid rgba(226, 194, 85, 0.5)`,
            borderRadius: '16px',
            boxShadow: `0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2)`,
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 1s ease-out, transform 1s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* TYPOGRAPHY - UPDATED TO STYLE GUIDE SPEC */}
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <h2 style={{ margin: 0, color: matteGold, fontSize: '24px', fontWeight: '900', letterSpacing: '4px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', textShadow: '0 0 20px rgba(226,194,85,0.5)' }}>
              CREATE ACCOUNT
            </h2>
            <p style={{ margin: '12px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '11px', letterSpacing: '1px', fontFamily: "'Inter', sans-serif", fontWeight: '600', lineHeight: '1.6' }}>
              JOIN THE BATTLE TODAY
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="email" placeholder="EMAIL ADDRESS" className="cyber-input" />
            <input type="text" placeholder="CHOOSE USERNAME" className="cyber-input" />
            <input type="password" placeholder="PASSWORD" className="cyber-input" />
            <input type="password" placeholder="CONFIRM PASSWORD" className="cyber-input" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter', sans-serif", letterSpacing: '1px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
              <input type="checkbox" style={{ accentColor: matteGold, width: '16px', height: '16px', cursor: 'pointer' }} /> 
              I AGREE TO THE TERMS & CONDITIONS
            </label>
          </div>

          {/* PRIMARY BUTTON */}
          <button onClick={() => navigate('/selection')} className="cyber-btn" style={{ marginTop: '5px' }}>
            SIGN UP
          </button>

          {/* BOTTOM LINK */}
          <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '12px', color: '#aaa', fontFamily: "'Inter', sans-serif", letterSpacing: '1px' }}>
            ALREADY A PLAYER?{' '}
            <span
              onClick={() => navigate('/login')}
              style={{
                color: '#ffffff',
                fontWeight: '900',
                cursor: 'pointer',
                marginLeft: '5px',
                borderBottom: `2px solid ${matteGold}`,
                paddingBottom: '2px',
                transition: 'color 0.3s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = matteGold}
              onMouseOut={(e) => e.currentTarget.style.color = '#ffffff'}
            >
              LOGIN HERE
            </span>
          </div>
        </div>

      </div>
    </GameLayout>
  );
};

export default CheckFlipRegister;