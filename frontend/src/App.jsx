import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import BattleSelection from './BattleSelection';
import GameLobby from './GameLobby';
import OnlineMatchSetup from './OnlineMatchSetup';
import DecideFate from './DecideFate'; 
import GameArena from './GameArena';
import PlayableAd from './PlayableAd';
import ProfilePage from './ProfilePage';
import './App.css';
// import GameBoard from './GameBoard';   // Create this component


function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication Flow */}
        <Route path="/" element={<GameLobby/>} />

        
        {/* Game Selection */}
        <Route path="/selection" element={<BattleSelection />} />

        <Route path="/online-match-setup" element={<OnlineMatchSetup />} />
        
        {/* The Fate Ritual Route */}
        <Route path="/decide-fate" element={<DecideFate />} />

        <Route path="/game-arena" element={<GameArena />} />

        <Route path="/playable-ad" element={<PlayableAd />} />

        <Route path="/profile" element={<ProfilePage />} />

        {/* The Actual Game Board */}
        {/* <Route path="/local-mode" element={<GameBoard mode="local" />} /> */}
        
        <Route path="/online-mode" element={
          <div style={{color: 'white', padding: '100px', textAlign: 'center', fontSize: '30px', letterSpacing: '4px'}}>
            SEARCHING FOR WORTHY OPPONENTS...
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
