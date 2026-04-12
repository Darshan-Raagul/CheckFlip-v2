import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import GameLayout from './GameLayout';

const GameLobby = () => {
    const navigate = useNavigate();
    const [phase, setPhase] = useState(0);
    const [isExiting, setIsExiting] = useState(false); 

    const matteGold = '#E2C255';

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 100);
        return () => clearTimeout(t1);
    }, []);

    const handlePlayNow = () => {
        if (isExiting) return; 
        setIsExiting(true);
        
        // --- MOCK AUTH CHECK ---
        // This reads the storage at the exact millisecond you click the button,
        // so your console commands will work instantly without refreshing!
        const isAuthenticated = localStorage.getItem('isLoggedIn') === 'true';

        setTimeout(() => {
            if (isAuthenticated) {
                navigate('/selection'); 
            } else {
                navigate('/playable-ad');
            }
        }, 600); 
    };

    return (
        <GameLayout phase={phase}>
            <div className="lobby-wrapper">
                {/* Dynamically pass the variant based on the current storage state */}
                <Header variant={localStorage.getItem('isLoggedIn') === 'true' ? "profile" : "landing"} />

                <style>
                    {`
                    @keyframes floatHand {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-15px); }
                    }

                    @keyframes techPulseGlow {
                        0% { opacity: 0.8; filter: drop-shadow(0 0 10px rgba(226, 194, 85, 0.6)); }
                        100% { opacity: 1; filter: drop-shadow(0 0 25px rgba(226, 194, 85, 1)); }
                    }

                    @keyframes whitePulseGlow {
                        0% { opacity: 0.9; filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.4)); }
                        100% { opacity: 1; filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.8)); }
                    }

                    .lobby-wrapper {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 0 20px;
                        box-sizing: border-box;
                    }

                    .card-fan-container {
                        position: relative;
                        height: clamp(300px, 55vh, 600px);
                        width: 100%;
                        max-width: 800px;
                        opacity: ${phase >= 1 ? 1 : 0};
                        transform: translateY(${phase >= 1 ? '0' : '30px'});
                        transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
                        pointer-events: ${isExiting ? 'none' : 'auto'};
                    }

                    .card-fan-bobbing {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        animation: ${isExiting ? 'none' : 'floatHand 6s ease-in-out infinite'};
                    }

                    .fan-card {
                        width: clamp(140px, 22vw, 260px);
                        aspect-ratio: 2.5 / 3.5;
                        border-radius: 12px;
                        position: absolute;
                        background-size: cover;
                        background-position: center;
                        transform-origin: bottom center; 
                    }

                    .card-left {
                        background-image: url('/black_back.png');
                        background-color: #111; 
                        border: 2px solid rgba(226, 194, 85, 0.3);
                        z-index: 1;
                        transform: translateX(-48%) rotate(-14deg) translateY(20px);
                        box-shadow: -5px 10px 20px rgba(0,0,0,0.5);
                        transition: transform 0.4s ease, opacity 0.4s ease;
                    }

                    .card-center {
                        /* --- NEW: GLOSSY METALLIC GRADIENT --- */
                        background: linear-gradient(135deg, #FFF6D9 0%, #E2C255 40%, #C49830 75%, #FEEFAA 100%);
                        border: 2px solid #ffffff;
                        transform: translateX(0) rotate(0deg) translateY(0);
                        z-index: 2;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        /* --- NEW: INSET SHADOW FOR GLOSSY 3D BEVEL --- */
                        box-shadow: -10px 10px 30px rgba(0,0,0,0.9), 
                                    inset 2px 2px 12px rgba(255, 255, 255, 0.9), 
                                    inset -2px -2px 15px rgba(184, 138, 48, 0.8);
                        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, z-index 0s 0.4s, opacity 0.4s ease;
                    }

                    .card-center:hover {
                        transform: translateY(-35px) scale(1.05);
                        z-index: 10; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.9), 
                                    0 0 40px rgba(226, 194, 85, 0.8), 
                                    inset 2px 2px 15px rgba(255, 255, 255, 1), 
                                    inset -2px -2px 15px rgba(184, 138, 48, 0.8);
                        border-color: #fff;
                        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, z-index 0s 0s;
                    }

                    .card-right {
                        background-image: url('/red_back.png');
                        background-color: #311; 
                        border: 2px solid rgba(211, 26, 30, 0.4);
                        z-index: 3;
                        transform: translateX(48%) rotate(14deg) translateY(20px);
                        box-shadow: -12px 12px 30px rgba(0,0,0,0.9);
                        transition: transform 0.4s ease, opacity 0.4s ease;
                    }

                    .card-left.exiting { transform: translateX(-60%) rotate(-25deg) translateY(80px); opacity: 0; }
                    .card-right.exiting { transform: translateX(60%) rotate(25deg) translateY(80px); opacity: 0; }
                    .card-center.exiting {
                        transform: translateY(-80px) scale(1.2);
                        box-shadow: 0 40px 80px rgba(0,0,0,0.9), 0 0 60px rgba(226, 194, 85, 0.8);
                        opacity: 0; z-index: 20;
                        transition: transform 0.6s cubic-bezier(0.5, 0, 0.2, 1), opacity 0.4s ease 0.2s, box-shadow 0.6s ease;
                    }

                    @media (max-width: 600px) {
                        .card-left { transform: translateX(-35%) rotate(-12deg) translateY(15px); }
                        .card-right { transform: translateX(35%) rotate(12deg) translateY(15px); }
                        .card-left.exiting { transform: translateX(-45%) rotate(-20deg) translateY(60px); }
                        .card-right.exiting { transform: translateX(45%) rotate(20deg) translateY(60px); }
                    }
                    `}
                </style>

                <div className="card-fan-container">
                    <div className="card-fan-bobbing">
                        
                        <div className={`fan-card card-left ${isExiting ? 'exiting' : ''}`}></div>

                        <div className={`fan-card card-center ${isExiting ? 'exiting' : ''}`} onClick={handlePlayNow}>
                            <div style={{ position: 'absolute', inset: '8px', border: `1px solid rgba(255,255,255,0.4)`, borderRadius: '6px', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', inset: '14px', border: `1px dashed rgba(255,255,255,0.6)`, borderRadius: '4px', pointerEvents: 'none' }} />

                            <svg viewBox="0 0 115 100" style={{ width: '38%', height: 'auto', marginLeft: '6%', marginBottom: '20px', zIndex: 2, animation: phase >= 1 ? 'whitePulseGlow 2s infinite alternate' : 'none', pointerEvents: 'none' }}>
                                <polygon points="34,25 80,50 34,75" fill="#ffffff" filter="drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))" />
                            </svg>

                            <div style={{ 
                                zIndex: 2,
                                color: '#ffffff', 
                                fontWeight: '900', fontSize: 'clamp(14px, 2vw, 18px)', letterSpacing: '4px', 
                                textShadow: `0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4)`,
                                animation: phase >= 1 ? 'whitePulseGlow 2s infinite alternate' : 'none',
                                fontFamily: "'Inter', sans-serif",
                                pointerEvents: 'none'
                            }}>
                                PLAY NOW
                            </div>
                        </div>

                        <div className={`fan-card card-right ${isExiting ? 'exiting' : ''}`}></div>

                    </div>
                </div>

            </div>
        </GameLayout>
    );
};

export default GameLobby;