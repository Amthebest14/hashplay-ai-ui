import { useState, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import BackgroundShader from './components/BackgroundShader';
import PersistentUI from './components/PersistentUI';
import SectionHero from './components/SectionHero';
import SectionArena from './components/SectionArena';
import SectionLeaderboard from './components/SectionLeaderboard';

function App() {
  const [currentSection, setCurrentSection] = useState<'home' | 'arena' | 'leaderboard'>('home');
  const [bgSpeed, setBgSpeed] = useState(1);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Use layout effect to handle the GSAP logic when currentSection changes
  useLayoutEffect(() => {
    if (!mainContainerRef.current) return;

    // Animate IN the new section
    gsap.fromTo(mainContainerRef.current,
      { filter: 'blur(20px)', scale: 0.8, opacity: 0 },
      { filter: 'blur(0px)', scale: 1.0, opacity: 1, duration: 0.8, ease: "power3.out", clearProps: "filter" }
    );
  }, [currentSection]);

  const navigateTo = (section: 'home' | 'arena' | 'leaderboard') => {
    if (section === currentSection) return;

    // Speed up ripples by 5x to indicate movement
    setBgSpeed(5);

    // Animate OUT the current section
    if (mainContainerRef.current) {
      gsap.to(mainContainerRef.current, {
        filter: 'blur(10px)',
        scale: 0.9,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
          // Switch state exactly when the out-animation finishes
          setCurrentSection(section);

          // Return ripples to normal slow speed
          setTimeout(() => {
            setBgSpeed(1);
          }, 300);
        }
      });
    } else {
      setCurrentSection(section);
      setBgSpeed(1);
    }
  };

  return (
    <div className="w-full min-h-screen relative overflow-hidden text-white font-inter selection:bg-hedera-green/30 selection:text-white">
      {/* Persistant Shader Background */}
      <BackgroundShader speedLevel={bgSpeed} />

      {/* Main App Container Overlay */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {/* Persistent UI Components */}
        <PersistentUI />

        {/* Dynamic Section Content via GSAP */}
        <main className="w-full pointer-events-auto">
          <div ref={mainContainerRef} className="w-full flex justify-center items-start">
            {currentSection === 'home' && <SectionHero onEnterArena={() => navigateTo('arena')} />}
            {currentSection === 'arena' && <SectionArena />}
            {currentSection === 'leaderboard' && <SectionLeaderboard />}
          </div>
        </main>

        {/* Minimalist Floating Navigation Menu */}
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 glass-panel rounded-full px-8 py-3 flex gap-8 items-center z-50 shadow-2xl">
          <button
            onClick={() => navigateTo('home')}
            className={`tracking-widest transition-colors duration-300 ${currentSection === 'home' ? 'text-hedera-green drop-shadow-[0_0_8px_rgba(0,193,110,0.8)]' : 'text-white/40 hover:text-white'}`}
          >
            Home
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => navigateTo('arena')}
            className={`tracking-widest transition-colors duration-300 ${currentSection === 'arena' ? 'text-hedera-green drop-shadow-[0_0_8px_rgba(0,193,110,0.8)]' : 'text-white/40 hover:text-white'}`}
          >
            Arena
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => navigateTo('leaderboard')}
            className={`tracking-widest transition-colors duration-300 ${currentSection === 'leaderboard' ? 'text-hedera-green drop-shadow-[0_0_8px_rgba(0,193,110,0.8)]' : 'text-white/40 hover:text-white'}`}
          >
            Ranks
          </button>
        </nav>
      </div>
    </div>
  );
}

export default App;
