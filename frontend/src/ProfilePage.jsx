import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Swords, Crosshair, LogOut, Settings, User, Gamepad2, Skull } from 'lucide-react';
import GameLayout from './GameLayout';
import Header from './Header';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  // --- STYLE GUIDE CONSTANTS ---
  const matteGold = '#E2C255';
  const crimsonRed = '#d31a1e';
  const metalGradient = 'linear-gradient(to bottom, #FEEFAA 0%, #D4AF37 50%, #B88A30 100%)';

  // --- DB INTEGRATION PREP ---
  // When your backend is ready, use useEffect to fetch this data and update the state.
  const [userData, setUserData] = useState({
    username: "GUEST_WARRIOR",
    title: "GRANDMASTER",
    matches: 187,
    wins: 142,
    defeats: 45,
    streak: "🔥 4 WINS" // Kept in state in case you want to use it elsewhere
  });

  // Dynamically calculate the Win Rate based on DB values
  const calculatedWinRate = userData.matches > 0 
    ? Math.round((userData.wins / userData.matches) * 100) + "%" 
    : "0%";

  useEffect(() => {
    // Cinematic entrance animations
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 400);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleLogout = () => {
    // Clear the mock session we created in the Login/Selection screen
    localStorage.removeItem('mock_guest_session');
    // Redirect to the home/login page
    navigate('/login');
  };

  return (
    <GameLayout phase={phase}>
      <Header variant="profile" />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

          .profile-container {
            position: absolute;
            top: 120px; /* Leaves space for the Header */
            left: 50%;
            transform: translateX(-50%);
            width: clamp(320px, 90vw, 800px);
            display: flex;
            flex-direction: column;
            gap: 30px;
            opacity: ${phase >= 2 ? 1 : 0};
            transition: opacity 1s ease-out, transform 1s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 50;
            padding-bottom: 50px;
            font-family: 'Inter', sans-serif;
          }

          /* --- STYLE GUIDE: MODALS / GLASS PANELS --- */
          .glass-panel {
            background: linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%);
            border: 1px solid rgba(226, 194, 85, 0.5);
            border-radius: 16px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(226, 194, 85, 0.2);
            backdrop-filter: blur(12px);
            WebkitBackdropFilter: blur(12px);
            padding: 30px;
            position: relative;
            overflow: hidden;
          }

          /* --- AVATAR & HEADER SECTION --- */
          .profile-header {
            display: flex;
            align-items: center;
            gap: 25px;
          }

          .avatar-frame {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: rgba(0,0,0,0.8);
            border: 3px solid ${matteGold};
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 0 20px rgba(226, 194, 85, 0.4);
            position: relative;
          }

          .username-text {
            color: #fff;
            font-size: clamp(24px, 4vw, 36px);
            font-weight: 900;
            letter-spacing: 3px;
            margin: 0;
            text-transform: uppercase;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
          }

          .title-text {
            color: ${matteGold};
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 4px;
            margin: 5px 0 0 0;
            text-transform: uppercase;
            text-shadow: 0 0 15px rgba(226, 194, 85, 0.4);
          }

          /* --- STATS GRID --- */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            width: 100%;
          }

          .stat-box {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(226, 194, 85, 0.15);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }

          .stat-box:hover {
            background: rgba(226, 194, 85, 0.05);
            border-color: rgba(226, 194, 85, 0.4);
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.4);
          }

          .stat-value {
            color: #fff;
            font-size: 32px;
            font-weight: 900;
            margin: 10px 0 5px 0;
            text-shadow: 0 0 15px rgba(255,255,255,0.3);
          }

          .stat-label {
            color: rgba(255,255,255,0.5);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
          }

          /* --- STYLE GUIDE: BUTTONS --- */
          .action-buttons {
            display: flex;
            gap: 20px;
            justify-content: flex-end;
          }

          .profile-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            font-family: 'Inter', sans-serif;
          }

          /* Secondary Button Spec */
          .btn-settings {
            background: rgba(0,0,0,0.5);
            color: ${matteGold};
            border: 2px solid ${matteGold};
          }
          .btn-settings:hover {
            background: rgba(226, 194, 85, 0.1);
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(226, 194, 85, 0.2);
          }

          /* Danger/Secondary Variant */
          .btn-logout {
            background: rgba(0,0,0,0.5);
            color: ${crimsonRed};
            border: 2px solid ${crimsonRed};
          }
          .btn-logout:hover {
            background: rgba(211, 26, 30, 0.1);
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(211, 26, 30, 0.2);
          }

          @media (max-width: 600px) {
            .profile-header { flex-direction: column; text-align: center; }
            .action-buttons { flex-direction: column; width: 100%; }
            .profile-btn { justify-content: center; }
          }
        `}
      </style>

      <div className="profile-container" style={{ transform: phase >= 2 ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)' }}>
        
        {/* TOP SECTION: User Info */}
        <div className="glass-panel">
          <div className="profile-header">
            <div className="avatar-frame">
              <User size={48} color={matteGold} />
            </div>
            <div>
              <h1 className="username-text">{userData.username}</h1>
              <h2 className="title-text">{userData.title}</h2>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Stats Grid */}
        <div className="glass-panel">
          <h3 style={{ color: matteGold, fontSize: '16px', letterSpacing: '4px', marginTop: 0, marginBottom: '20px', fontWeight: '900', textTransform: 'uppercase', textShadow: '0 0 20px rgba(226,194,85,0.5)' }}>
            COMBAT RECORD
          </h3>
          <div className="stats-grid">
            
            {/* Matches Played */}
            <div className="stat-box">
              <Gamepad2 size={24} color="#aaaaaa" />
              <div className="stat-value">{userData.matches}</div>
              <div className="stat-label">Matches</div>
            </div>

            {/* Victories */}
            <div className="stat-box">
              <Trophy size={24} color={matteGold} />
              <div className="stat-value">{userData.wins}</div>
              <div className="stat-label">Victories</div>
            </div>

            {/* Defeats */}
            <div className="stat-box">
              <Skull size={24} color={crimsonRed} />
              <div className="stat-value">{userData.defeats}</div>
              <div className="stat-label">Defeats</div>
            </div>

            {/* Win Rate */}
            <div className="stat-box">
              <Crosshair size={24} color="#00ffcc" />
              <div className="stat-value">{calculatedWinRate}</div>
              <div className="stat-label">Win Rate</div>
            </div>

          </div>
        </div>

        {/* BOTTOM SECTION: Actions */}
        <div className="action-buttons">
          <button className="profile-btn btn-settings" onClick={() => alert("Settings coming soon!")}>
            <Settings size={18} /> SETTINGS
          </button>
          
          <button className="profile-btn btn-logout" onClick={handleLogout}>
            <LogOut size={18} /> LOGOUT
          </button>
        </div>

      </div>
    </GameLayout>
  );
};

export default ProfilePage;