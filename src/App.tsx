import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import BackgroundShader from './components/BackgroundShader';
import PersistentUI from './components/PersistentUI';
import SectionHero from './components/SectionHero';
import SectionArena from './components/SectionArena';
import SectionLeaderboard from './components/SectionLeaderboard';

function App() {
  // Navigation states: 'home', 'arena', 'leaderboard'
  const [currentSection, setCurrentSection] = useState<'home' | 'arena' | 'leaderboard'>('home');
  // When switching, temporarily increase speed for transition
  const [bgSpeed, setBgSpeed] = useState(1);

  const navigateTo = (section: 'home' | 'arena' | 'leaderboard') => {
    if (section === currentSection) return;

    setCurrentSection(section);
    // Speed up ripples by 3x to indicate movement
    setBgSpeed(3);
    setTimeout(() => {
      setBgSpeed(1);
    }, 800); // return to normal after 0.8s
  };

  return (
    <div className="w-full min-h-screen relative overflow-hidden text-white font-inter selection:bg-hedera-green/30 selection:text-white">
      {/* Persistant Shader Background */}
      <BackgroundShader speedLevel={bgSpeed} />

      {/* Main App Container Overlay */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {/* Persistent UI Components */}
        <PersistentUI />

        {/* Dynamic Section Content */}
        <main className="flex-grow flex items-center justify-center pt-24 pb-32 px-6">
          <AnimatePresence mode="wait">
            {currentSection === 'home' && (
              <SectionHero key="home" onEnterArena={() => navigateTo('arena')} />
            )}

            {currentSection === 'arena' && (
              <SectionArena key="arena" />
            )}

            {currentSection === 'leaderboard' && (
              <SectionLeaderboard key="leaderboard" />
            )}
          </AnimatePresence>
        </main>

        {/* Minimalist Floating Navigation Menu */}
        <nav className="fixed bottom-24 left-1/2 -translate-x-1/2 glass-panel rounded-full px-8 py-3 flex gap-8 items-center z-50 shadow-2xl">
          <button
            onClick={() => navigateTo('home')}
            className={`tracking-widest transition-colors duration-300 ${currentSection === 'home' ? 'text-hedera-green drop-shadow-[0_0_8px_rgba(0,193,110,0.8)]' : 'text-white/40 hover:text-white'}`}
          >
            home
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => navigateTo('arena')}
            className={`tracking-widest transition-colors duration-300 ${currentSection === 'arena' ? 'text-hedera-green drop-shadow-[0_0_8px_rgba(0,193,110,0.8)]' : 'text-white/40 hover:text-white'}`}
          >
            arena
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => navigateTo('leaderboard')}
            className={`tracking-widest transition-colors duration-300 ${currentSection === 'leaderboard' ? 'text-hedera-green drop-shadow-[0_0_8px_rgba(0,193,110,0.8)]' : 'text-white/40 hover:text-white'}`}
          >
            ranks
          </button>
        </nav>
      </div>
    </div>
  );
}

export default App;
