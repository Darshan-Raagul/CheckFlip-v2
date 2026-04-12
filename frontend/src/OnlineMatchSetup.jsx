import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, Swords } from 'lucide-react';
import Header from './Header';
import GameLayout from './GameLayout';
import socket from './socket';

const matteGold = '#E2C255';
const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';

const OnlineMatchSetup = () => {
    const navigate = useNavigate();
    
    const [mode, setMode] = useState('join'); 
    const [bgPhase, setBgPhase] = useState(0);

    // Host State
    const [generatedCode, setGeneratedCode] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [localColor, setLocalColor] = useState(null);

    // Join State
    const [joinCode, setJoinCode] = useState(['', '', '', '']);
    const [isJoining, setIsJoining] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const inputRefs = useRef([]);

    useEffect(() => {
        const timer = setTimeout(() => setBgPhase(1), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (mode === 'join' && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [mode]);

    // --- REAL BACKEND SOCKET LISTENERS ---
    useEffect(() => {
        socket.on('assignColor', (color) => {
            setLocalColor(color);
        });

        socket.on('gameJoined', (roomId) => {
            setGeneratedCode(roomId);
            setIsGenerating(false);
            
            if (mode === 'join') {
                setIsJoining(false);
                navigate('/decide-fate', { state: { matchCode: roomId, gameMode: 'online', isHost: false } });
            }
        });

        socket.on('errorMsg', (msg) => {
            setErrorMsg(msg);
            setIsJoining(false);
            setJoinCode(['', '', '', '']); 
            if (inputRefs.current[0]) inputRefs.current[0].focus();
        });

        return () => {
            socket.off('assignColor');
            socket.off('gameJoined');
            socket.off('errorMsg');
        };
    }, [mode, navigate]);

    // --- TRIGGER BACKEND ACTIONS ---
    const handleGenerateCode = () => {
        setIsGenerating(true);
        socket.emit('createGame'); 
    };

    const handleEnterMatchHost = () => {
        navigate('/decide-fate', { 
            state: { matchCode: generatedCode, gameMode: 'online', isHost: true } 
        });
    };

    const triggerJoinMatch = (code) => {
        setIsJoining(true);
        setErrorMsg('');
        socket.emit('joinGame', code); 
    };

    // --- JOIN INPUT LOGIC ---
    const handleInputChange = (index, e) => {
        const val = e.target.value.toUpperCase();
        if (!/^[A-Z0-9]?$/.test(val)) return;

        const newCode = [...joinCode];
        newCode[index] = val;
        setJoinCode(newCode);

        if (val && index < 3) inputRefs.current[index + 1].focus();

        const fullCode = newCode.join('');
        if (fullCode.length === 4) triggerJoinMatch(fullCode);
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !joinCode[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        
        if (pasteData) {
            const newCode = [...joinCode];
            pasteData.split('').forEach((char, i) => newCode[i] = char);
            setJoinCode(newCode);
            
            const focusIndex = Math.min(pasteData.length, 3);
            if (inputRefs.current[focusIndex]) inputRefs.current[focusIndex].focus();
            
            if (pasteData.length === 4) triggerJoinMatch(pasteData);
        }
    };

    return (
        <GameLayout phase={bgPhase}>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
                <Header variant="profile" />
            </div>

            <style>
                {`
                .metallic-text {
                    background: ${metalGradient};
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 2px rgba(150, 115, 38, 0.5));
                }

                .page-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: clamp(280px, 85vw, 800px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    z-index: 20;
                }

                .match-container {
                    display: flex;
                    width: 100%;
                    gap: clamp(20px, 4vw, 40px);
                    margin-top: clamp(20px, 4vh, 30px);
                }

                .column {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .mode-btn {
                    padding: clamp(12px, 2vh, 15px) clamp(20px, 4vw, 30px);
                    margin-bottom: 15px;
                    border-radius: 8px;
                    font-size: clamp(14px, 2vw, 16px);
                    font-weight: 800;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 1px solid transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }

                .mode-btn.active {
                    background: rgba(226, 194, 85, 0.1);
                    border-color: ${matteGold};
                    color: ${matteGold};
                    box-shadow: 0 0 20px rgba(226, 194, 85, 0.2);
                }

                .mode-btn.inactive {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.3);
                }

                .mode-btn.inactive:hover {
                    color: rgba(255, 255, 255, 0.6);
                    background: rgba(255, 255, 255, 0.05);
                }

                .action-btn {
                    padding: clamp(14px, 2.5vh, 18px) 40px;
                    border-radius: 30px;
                    font-size: clamp(12px, 1.8vw, 14px);
                    font-weight: 800;
                    letter-spacing: 2px;
                    background: ${metalGradient};
                    color: #000;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }

                .action-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 25px rgba(226, 194, 85, 0.4);
                }

                .code-boxes {
                    display: flex;
                    gap: clamp(8px, 1.5vw, 20px);
                    justify-content: center;
                    width: 100%;
                }

                .char-box {
                    width: clamp(45px, 10vw, 75px);
                    height: clamp(55px, 12vw, 95px);
                    background: rgba(0, 0, 0, 0.6);
                    border: 2px solid rgba(226, 194, 85, 0.3);
                    border-radius: clamp(8px, 2vw, 12px);
                    color: ${matteGold};
                    font-size: clamp(24px, 5vw, 42px);
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    outline: none;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                }

                input.char-box:focus {
                    border-color: ${matteGold};
                    box-shadow: 0 0 25px rgba(226, 194, 85, 0.3);
                    transform: translateY(-3px);
                }

                div.char-box {
                    border-color: rgba(226, 194, 85, 0.7);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.4);
                }

                /* --- RESPONSIVE MOBILE FIXES --- */
                @media (max-width: 768px) {
                    .page-wrapper {
                        top: 55%; 
                        width: 90vw;
                    }
                    .match-container { 
                        flex-direction: column; 
                        gap: 20px; 
                        align-items: center; /* FORCES COLUMNS TO CENTER */
                    }
                    .column { 
                        align-items: center; 
                        width: 100%;
                    }
                    .mode-btn { 
                        width: 100%; 
                        max-width: 320px; 
                    }
                    .mode-btn.active { 
                        order: 2; 
                        margin-bottom: 0px; 
                    }
                    .mode-btn.inactive { 
                        order: 1; 
                        margin-bottom: 15px; 
                    }
                    .right-panel { 
                        width: 100%; 
                        max-width: 320px; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        margin: 15px auto 0 auto; /* GUARANTEES PERFECT HORIZONTAL CENTERING */
                    }
                }

                /* For very short phones (landscape or tiny screens) */
                @media (max-height: 650px) and (max-width: 768px) {
                    .page-wrapper { top: 60%; }
                    .mode-btn { padding: 10px 20px; margin-bottom: 10px; }
                }
                `}
            </style>

            <div className="page-wrapper">
                <h1 className="metallic-text" style={{ fontSize: 'clamp(28px, 5vw, 48px)', margin: '0', textTransform: 'uppercase', textAlign: 'center' }}>
                    MATCH
                </h1>

                <div className="match-container">
                    {/* LEFT COLUMN: SELECTION */}
                    <div className="column">
                        <button 
                            className={`mode-btn ${mode === 'host' ? 'active' : 'inactive'}`}
                            onClick={() => { 
                                if (mode !== 'host') {
                                    setMode('host'); 
                                    setJoinCode(['','','','']); 
                                    setErrorMsg('');
                                    handleGenerateCode(); 
                                }
                            }}
                        >
                            <Shield size={20} />
                            HOST
                        </button>
                        
                        <button 
                            className={`mode-btn ${mode === 'join' ? 'active' : 'inactive'}`}
                            onClick={() => { 
                                setMode('join'); 
                                setGeneratedCode(null); 
                                setErrorMsg('');
                            }}
                        >
                            <LogIn size={20} />
                            JOIN
                        </button>
                    </div>

                    {/* RIGHT COLUMN: DYNAMIC CONTENT */}
                    <div className="column right-panel">
                        
                        {/* HOST UI */}
                        {mode === 'host' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 4vh, 30px)', width: '100%', alignItems: 'center' }}>
                                {isGenerating || !generatedCode ? (
                                    <div style={{ color: matteGold, textAlign: 'center', fontSize: '12px', letterSpacing: '2px', animation: 'pulseText 1.5s infinite' }}>
                                        CONTACTING SERVER...
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ textAlign: 'center', width: '100%' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '2px', marginBottom: '15px' }}>YOUR MATCH CODE</div>
                                            <div className="code-boxes">
                                                {generatedCode.split('').map((char, i) => (
                                                    <div key={i} className="char-box">{char}</div>
                                                ))}
                                            </div>
                                        </div>

                                        <button className="action-btn" style={{ width: '100%' }} onClick={handleEnterMatchHost}>
                                            <Swords size={18} />
                                            ENTER MATCH
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* JOIN UI */}
                        {mode === 'join' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(15px, 3vh, 20px)', width: '100%', alignItems: 'center' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '2px', textAlign: 'center' }}>
                                    ENTER 4-CHARACTER CODE
                                </div>
                                
                                <div className="code-boxes">
                                    {joinCode.map((char, index) => (
                                        <input
                                            key={index}
                                            ref={(el) => (inputRefs.current[index] = el)}
                                            type="text"
                                            maxLength={1}
                                            value={char}
                                            onChange={(e) => handleInputChange(index, e)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            onPaste={handlePaste}
                                            className="char-box"
                                            disabled={isJoining}
                                        />
                                    ))}
                                </div>

                                {isJoining && !errorMsg && (
                                    <div style={{ color: matteGold, textAlign: 'center', fontSize: '12px', letterSpacing: '2px', animation: 'pulseText 1.5s infinite' }}>
                                        CONNECTING TO ROOM...
                                    </div>
                                )}

                                {/* ERROR MESSAGE DISPLAY */}
                                {errorMsg && (
                                    <div style={{ color: '#d31a1e', textAlign: 'center', fontSize: '12px', letterSpacing: '1px', fontWeight: 'bold' }}>
                                        {errorMsg.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GameLayout>
    );
};

export default OnlineMatchSetup;