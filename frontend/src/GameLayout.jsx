import React, { useMemo } from 'react';

const matteGold = '#E2C255';
const crimsonRed = '#d31a1e';
const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';

const GameLayout = ({ children, phase }) => {
    // Generate a tiny amount of high-impact particles (40 instead of 2000)
    const battleEmbers = useMemo(() => {
        return Array.from({ length: 40 }).map((_, i) => {
            const isRedSide = i % 2 === 0;
            return {
                id: i,
                left: isRedSide ? `${Math.random() * 45}vw` : `${55 + Math.random() * 45}vw`,
                top: `${Math.random() * 100}vh`,
                size: Math.random() * 4 + 2,
                duration: Math.random() * 5 + 4, // 4-9 seconds
                delay: Math.random() * 5,
                color: isRedSide ? '#ff3333' : matteGold,
                shadow: isRedSide ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
            };
        });
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#050508', overflow: 'hidden' }}>
            <style>
                {`
                    /* --- ATMOSPHERIC BATTLE ANIMATIONS --- */
                    @keyframes clashBreatheRed {
                        0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.15; }
                        50% { transform: scale(1.1) translate(2%, 2%); opacity: 0.3; }
                    }
                    @keyframes clashBreatheGold {
                        0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.15; }
                        50% { transform: scale(1.05) translate(-2%, -2%); opacity: 0.25; }
                    }
                    @keyframes gridPan {
                        0% { background-position: 0% 0%; }
                        100% { background-position: 100px 100px; }
                    }
                    @keyframes emberFloat {
                        0% { transform: translateY(0) scale(1); opacity: 0; }
                        20% { opacity: 1; }
                        80% { opacity: 1; }
                        100% { transform: translateY(-30vh) scale(0.5); opacity: 0; }
                    }
                    .metallic-text {
                        background: ${metalGradient};
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        filter: drop-shadow(0 2px 4px rgba(150, 115, 38, 0.3));
                    }
                `}
            </style>

            {/* --- THE BATTLE VOID BACKGROUND --- */}
            <div style={{ 
                position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', 
                opacity: phase >= 1 ? 1 : 0, transition: 'opacity 2s ease-in' 
            }}>
                
                {/* 1. Tactical Grid */}
                <div style={{ 
                    position: 'absolute', inset: -200, 
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '100px 100px', animation: 'gridPan 90s linear infinite',
                    transform: 'perspective(500px) rotateX(15deg)', transformOrigin: 'top center', opacity: 0.4
                }} />

                {/* 2. Red & White Clash Glow (Left Side) */}
                <div style={{ 
                    position: 'absolute', top: '-10%', left: '-20%', width: '70vw', height: '120vh', 
                    background: `radial-gradient(ellipse, ${crimsonRed} 0%, transparent 60%)`, 
                    filter: 'blur(100px)', animation: 'clashBreatheRed 8s ease-in-out infinite'
                }} />

                {/* 3. Black & Gold Clash Glow (Right Side) */}
                <div style={{ 
                    position: 'absolute', top: '-10%', right: '-20%', width: '70vw', height: '120vh', 
                    background: `radial-gradient(ellipse, ${matteGold} 0%, transparent 60%)`, 
                    filter: 'blur(120px)', animation: 'clashBreatheGold 10s ease-in-out infinite'
                }} />

                {/* 4. Center Divider Shadow (Creates the "VS" split) */}
                <div style={{ 
                    position: 'absolute', inset: 0, 
                    background: 'linear-gradient(90deg, transparent 40%, rgba(0,0,0,0.8) 50%, transparent 60%)' 
                }} />

                {/* 5. Floating Embers */}
                {battleEmbers.map(ember => (
                    <div key={ember.id} style={{
                        position: 'absolute', left: ember.left, top: ember.top,
                        width: `${ember.size}px`, height: `${ember.size}px`,
                        backgroundColor: ember.color, borderRadius: '50%',
                        boxShadow: `0 0 ${ember.size * 2}px ${ember.color}, 0 0 ${ember.size * 4}px ${ember.shadow}`,
                        animation: `emberFloat ${ember.duration}s linear infinite ${ember.delay}s`,
                        opacity: 0 // handled by keyframe
                    }} />
                ))}

                {/* 6. Deep Vignette Overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(5,5,8,0.9) 90%, #000 100%)' }} />
            </div>

            {/* --- FOREGROUND CONTENT --- */}
            <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
                {children}
            </div>
        </div>
    );
};

export default GameLayout;