import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, GraduationCap } from 'lucide-react'; 
import Header from './Header';
import GameLayout from './GameLayout';

const GameLobby = () => {
    const navigate = useNavigate();
    const [phase, setPhase] = useState(0);
    const [isExiting, setIsExiting] = useState(false); 
    const [showModeSelect, setShowModeSelect] = useState(false); 

    const matteGold = '#E2C255';

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 100);
        return () => clearTimeout(t1);
    }, []);

    const handlePlayNow = () => {
        if (isExiting) return; 
        setIsExiting(true);
        
        setTimeout(() => {
            setShowModeSelect(true);
        }, 600); 
    };

    return (
        <GameLayout phase={phase}>
            <div className="lobby-wrapper">
                <Header variant={localStorage.getItem('isLoggedIn') === 'true' ? "profile" : "landing"} />

                <style>
                    {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

                    @keyframes floatHand {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-15px); }
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
                        background: linear-gradient(135deg, #FFF6D9 0%, #E2C255 40%, #C49830 75%, #FEEFAA 100%);
                        border: 2px solid #ffffff;
                        transform: translateX(0) rotate(0deg) translateY(0);
                        z-index: 2;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
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

                    /* --- RESPONSIVE MODE SELECTION VISUALS --- */
                    .mode-selection-modal {
                        width: clamp(320px, 90vw, 700px);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        animation: popInModal 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    }

                    @keyframes popInModal {
                        0% { transform: scale(0.9) translateY(10px); opacity: 0; }
                        100% { transform: scale(1) translateY(0); opacity: 1; }
                    }

                    .mode-cards-container {
                        display: flex;
                        flex-direction: row;
                        gap: clamp(20px, 5vw, 40px);
                        width: 100%;
                        justify-content: center;
                    }

                    /* --- BASE CARD STYLES --- */
                    .mode-card {
                        flex: 1;
                        border-radius: 16px;
                        padding: clamp(20px, 5vw, 40px) clamp(10px, 3vw, 20px);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        backdrop-filter: blur(12px);
                        transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), 
                                    box-shadow 0.4s ease, 
                                    border-color 0.4s ease, 
                                    background 0.4s ease;
                        aspect-ratio: 1; 
                        max-width: 300px;
                    }

                    /* --- PRIMARY (HERO) CARD: ENTER ARENA --- */
                    .mode-card.primary {
                        background: linear-gradient(135deg, rgba(30, 25, 10, 0.95) 0%, rgba(10, 10, 12, 0.98) 100%);
                        border: 2px solid rgba(226, 194, 85, 0.6);
                        box-shadow: 0 15px 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(226, 194, 85, 0.15);
                    }

                    /* Rich, fiery gold glow on hover */
                    .mode-card.primary:hover {
                        transform: translateY(-10px) scale(1.05);
                        border-color: #FEEFAA; 
                        background: linear-gradient(135deg, rgba(60, 45, 15, 0.98) 0%, rgba(20, 15, 5, 1) 100%);
                        box-shadow: 0 25px 50px rgba(0,0,0,0.9), 
                                    0 0 40px rgba(226, 194, 85, 0.8), 
                                    inset 0 0 30px rgba(226, 194, 85, 0.5);
                    }

                    /* --- SECONDARY (GHOST) CARD: PLAY TUTORIAL --- */
                    .mode-card.secondary {
                        background: linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%);
                        border: 2px solid rgba(255,255,255,0.15);
                        box-shadow: 0 15px 35px rgba(0,0,0,0.6), inset 0 0 15px rgba(255, 255, 255, 0.02);
                    }

                    /* Subtle, cool illumination on hover to not compete with Arena */
                    .mode-card.secondary:hover {
                        transform: translateY(-5px) scale(1.02);
                        border-color: rgba(255, 255, 255, 0.5);
                        background: linear-gradient(135deg, rgba(25, 25, 30, 0.98) 0%, rgba(10, 10, 15, 1) 100%);
                        box-shadow: 0 20px 40px rgba(0,0,0,0.8), 
                                    0 0 25px rgba(255, 255, 255, 0.15), 
                                    inset 0 0 20px rgba(255, 255, 255, 0.1);
                    }

                    /* --- ICON ANIMATIONS --- */
                    .mode-icon {
                        width: clamp(50px, 12vw, 100px); 
                        height: auto;
                        margin-bottom: clamp(15px, 4vw, 30px);
                        transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), 
                                    color 0.4s ease, filter 0.4s ease;
                    }

                    /* Primary Icon (Gold to Blazing White/Gold) */
                    .mode-card.primary .mode-icon {
                        color: ${matteGold};
                        filter: drop-shadow(0 0 10px rgba(226, 194, 85, 0.4));
                    }
                    .mode-card.primary:hover .mode-icon {
                        color: #FFF6D9;
                        transform: translateY(-8px) scale(1.15);
                        filter: drop-shadow(0 0 25px rgba(226, 194, 85, 1));
                    }

                    /* Secondary Icon (Muted Grey to Soft Silver) */
                    .mode-card.secondary .mode-icon {
                        color: rgba(255,255,255,0.4);
                    }
                    .mode-card.secondary:hover .mode-icon {
                        color: rgba(255,255,255,0.9);
                        transform: translateY(-4px) scale(1.05);
                        filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.4));
                    }

                    /* --- TEXT ANIMATIONS --- */
                    .mode-card-title {
                        font-family: 'Inter', sans-serif;
                        font-weight: 900;
                        font-size: clamp(14px, 3.5vw, 22px);
                        letter-spacing: clamp(1px, 0.5vw, 3px);
                        text-transform: uppercase;
                        text-align: center;
                        margin: 0;
                        transition: all 0.4s ease;
                    }

                    .mode-card.primary .mode-card-title {
                        color: ${matteGold};
                    }
                    .mode-card.primary:hover .mode-card-title {
                        color: #FFF6D9;
                        text-shadow: 0 0 20px rgba(226, 194, 85, 1), 0 0 40px rgba(226, 194, 85, 0.6);
                    }

                    .mode-card.secondary .mode-card-title {
                        color: rgba(255,255,255,0.4);
                    }
                    .mode-card.secondary:hover .mode-card-title {
                        color: rgba(255,255,255,0.9);
                        text-shadow: 0 0 15px rgba(255,255,255,0.4);
                    }
                    `}
                </style>

                {!showModeSelect ? (
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
                ) : (
                    <div className="mode-selection-modal">
                        <h2 style={{ 
                            margin: 0, color: matteGold, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: '900', 
                            letterSpacing: '6px', fontFamily: "'Inter', sans-serif", 
                            textTransform: 'uppercase', textShadow: '0 0 25px rgba(226,194,85,0.8)', 
                            textAlign: 'center', 
                            marginBottom: '45px'
                        }}>
                            SELECT PATH
                        </h2>
                        
                        <div className="mode-cards-container">
                            <div className="mode-card primary" onClick={() => navigate('/selection')}>
                                <Swords strokeWidth={1.5} className="mode-icon" />
                                <h3 className="mode-card-title">ENTER ARENA</h3>
                            </div>
                            
                            <div className="mode-card secondary" onClick={() => navigate('/playable-ad')}>
                                <GraduationCap strokeWidth={1.5} className="mode-icon" />
                                <h3 className="mode-card-title">PLAY TUTORIAL</h3>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </GameLayout>
    );
};

export default GameLobby;