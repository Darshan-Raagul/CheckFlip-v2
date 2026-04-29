import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, 
    Home, 
    BookOpen 
} from 'lucide-react';

const matteGold = '#E2C255';

const Header = ({ variant = 'landing' }) => {
    const navigate = useNavigate();

    // --- FUTURE-PROOF AUTH ROUTING ---
    // TEAMMATES: When the DB/Backend is connected, replace the localStorage check 
    // with your actual global Auth state (e.g., Redux or React Context).
    const handleHomeClick = (e) => {
        if (e) e.preventDefault();
        
        // Mock frontend auth check 
        const isAuthenticated = localStorage.getItem('isLoggedIn') === 'true';

        if (isAuthenticated) {
            // Logged in: Go to the game modes
            navigate('/selection');
        } else {
            // Logged out / New User: Go to the Auth page
            navigate('/login'); 
        }
    };

    return (
        <>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,600;0,700;0,900;1,900&display=swap');

                .header-wrapper {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    z-index: 1000;
                    padding: clamp(0.5rem, 2vh, 1rem) clamp(1rem, 4vw, 2rem);
                    background: linear-gradient(to bottom, rgba(5,7,9,0.98) 0%, transparent 100%);
                    font-family: 'Inter', sans-serif;
                    box-sizing: border-box;
                }

                .header-container {
                    display: flex;
                    justify-content: space-between; 
                    align-items: center;
                    width: 100%;
                }

                /* --- BRAND LAYOUT --- */
                .brand-group {
                    display: flex;
                    flex-direction: row; 
                    align-items: center;
                    justify-content: flex-start;
                    gap: clamp(0.5rem, 1.5vw, 0.8rem);
                    cursor: pointer;
                    flex-shrink: 0; 
                }
                
                .brand-logo {
                    height: clamp(26px, 5vw, 38px); 
                    width: auto;
                    object-fit: contain;
                    display: block;
                }

                .brand-text-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                
                .logo-text {
                    font-weight: 900;
                    font-style: italic;
                    font-size: clamp(1rem, 2.5vw, 1.3rem);
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    line-height: 1;
                    margin: 0 0 0.1rem 0;
                    padding: 0;
                    color: ${matteGold}; /* FIXED: Using the matteGold constant */
                }

                .tagline {
                    font-weight: 600;
                    font-size: clamp(0.4rem, 1vw, 0.55rem);
                    letter-spacing: 0.12em;
                    color: rgba(255, 255, 255, 0.5);
                    margin: 0;
                    padding: 0;
                    white-space: nowrap;
                    line-height: 1;
                }

                .nav-group {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end; 
                    gap: clamp(1rem, 3vw, 2rem);
                    flex-grow: 1;
                }

                .auth-btn { 
                    padding: clamp(0.3rem, 1vh, 0.4rem) clamp(0.8rem, 2vw, 1rem);
                    border-radius: 2rem; 
                    font-size: clamp(0.6rem, 1.5vw, 0.75rem); 
                    font-weight: 700;
                    border: 0.1rem solid ${matteGold}; 
                    color: ${matteGold}; 
                    background: rgba(226, 194, 85, 0.05); 
                    cursor: pointer; 
                    display: flex; 
                    align-items: center; 
                    gap: 0.5rem;
                    transition: all 0.3s ease;
                }

                .auth-btn:hover {
                    background: rgba(226, 194, 85, 0.15);
                    box-shadow: 0 0 1rem rgba(226, 194, 85, 0.2);
                }

                .nav-icon-link {
                    color: #aaa;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                }

                .nav-icon-link:hover {
                    color: ${matteGold};
                }

                .nav-text-label {
                    font-weight: 700;
                    font-size: clamp(0.55rem, 1.2vw, 0.65rem);
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                /* Mobile View: Hide text and collapse button into circular icon */
                @media (max-width: 48rem) {
                    .nav-text-label, .full-text { 
                        display: none !important; 
                    }
                    
                    .auth-btn { 
                        padding: 0.5rem; 
                        border-radius: 50%;
                        justify-content: center;
                    }

                    .brand-logo { height: clamp(22px, 6vw, 28px); }
                    .logo-text { font-size: clamp(0.9rem, 3.5vw, 1.1rem); }
                    .tagline { font-size: clamp(0.35rem, 1.2vw, 0.45rem); }
                }
                `}
            </style>

            <div className="header-wrapper">
                <header className="header-container">
                    
                    {/* LEFT: BRANDING WITH LOGO AND TEXT */}
                    <div className="brand-group" onClick={() => handleHomeClick()}>
                        <img src="/logo.png" alt="CheckFlip Logo" className="brand-logo" />
                        <div className="brand-text-container">
                            <span className="logo-text">CHECK FLIP</span>
                            <span className="tagline">Where Strategies meets Chances</span>
                        </div>
                    </div>

                    {/* RIGHT: ALL MENU OPTIONS & PROFILE */}
                    <div className="nav-group">
                        {variant === 'profile' ? (
                            <>
                                <div style={{ display: 'flex', gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
                                    {/* <a href="#" onClick={handleHomeClick} className="nav-icon-link">
                                        <Home size="1.2rem" />
                                        <span className="nav-text-label">HOME</span>
                                    </a> */}
                                    <a href="#" className="nav-icon-link">
                                        <BookOpen size="1.2rem" />
                                        <span className="nav-text-label">GUIDE</span>
                                    </a>
                                </div>

                                {/* <a href="profile" onClick={(e) => { e.preventDefault(); navigate('/profile'); }} className="nav-icon-link">
                                    <User size="1.2rem" />
                                    <span className="nav-text-label">PROFILE</span>
                                </a> */}
                            </>
                        ) : (
                            <div style={{ display: 'flex', gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
                                {/* <a href="#" onClick={handleHomeClick} className="nav-icon-link">
                                    <Home size="1.2rem" />
                                    <span className="nav-text-label">HOME</span>
                                </a> */}
                                <a href="#" className="nav-icon-link">
                                    <BookOpen size="1.2rem" />
                                    <span className="nav-text-label">GUIDE</span>
                                </a>
                            </div>
                        )}
                    </div>

                </header>
            </div>
        </>
    );
};

export default Header;