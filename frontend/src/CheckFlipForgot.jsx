import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameLayout from './GameLayout';
import Header from './Header';

/**
 * CheckFlipForgot Component
 * Integrates modular Layout and Header with a centered cinematic recovery form.
 */
const CheckFlipForgot = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  // Branding Constants
  const matteGold = '#E2C255';
  const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';

  useEffect(() => {
    // Phase 1: Background animations (nebula/stars)
    const t1 = setTimeout(() => setPhase(1), 100);
    // Phase 2: Form fade-in
    const t2 = setTimeout(() => setPhase(2), 500);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <GameLayout phase={phase}>
      {/* Variant "profile" is used here to match your logic 
          where the Profile button is visible in the header.
      */}
      <Header variant="profile" />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

          /* --- STYLE GUIDE: INPUTS & BUTTONS --- */
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

      {/* RECOVERY FORM CONTAINER - UPDATED TO MODAL SPEC */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: phase >= 2 ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -45%) scale(0.95)',
          width: 'clamp(320px, 90vw, 420px)',
          padding: '40px',
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%)',
          border: `1px solid rgba(226, 194, 85, 0.5)`,
          borderRadius: '16px',
          boxShadow: `0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2)`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          zIndex: 100,
        }}
      >
        {/* Recovery Header */}
        <div style={{ textAlign: 'center', marginBottom: '5px' }}>
          <h2
            style={{
              margin: 0,
              color: matteGold,
              fontSize: '24px',
              fontWeight: '900',
              letterSpacing: '4px',
              fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase',
              textShadow: '0 0 20px rgba(226,194,85,0.5)'
            }}
          >
            RECOVER ACCOUNT
          </h2>
          <p
            style={{
              margin: '12px 0 0 0',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '11px',
              letterSpacing: '1px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: '600',
              lineHeight: '1.6'
            }}
          >
            ENTER YOUR EMAIL ADDRESS AND WE WILL SEND YOU A SECURE RESET LINK.
          </p>
        </div>

        {/* Cyber Input for Email Recovery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="EMAIL ADDRESS"
            className="cyber-input"
          />
        </div>

        {/* Action Button - Matte Gold Style */}
        <button 
          className="cyber-btn"
          onClick={() => console.log("Reset link sent")}
        >
          SEND RESET LINK
        </button>

        {/* Back Navigation Link */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '5px',
            fontSize: '12px',
            color: '#aaa',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '1px'
          }}
        >
          REMEMBERED YOUR PASSWORD?{' '}
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
            BACK TO LOGIN
          </span>
        </div>
      </div>
    </GameLayout>
  );
};

export default CheckFlipForgot;