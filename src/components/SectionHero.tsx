import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getTotalMined } from '../services/mirrorNodeService';

export default function SectionHero({ onEnterArena }: { onEnterArena: () => void }) {
    const [totalMined, setTotalMined] = useState<number>(0);

    useEffect(() => {
        const fetchMined = async () => {
            const mined = await getTotalMined();
            setTotalMined(mined);
        };
        fetchMined();
        window.addEventListener('refreshBalances', fetchMined);
        return () => window.removeEventListener('refreshBalances', fetchMined);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center justify-start text-center"
        >
            {/* Section 1: The Hero (The Hook) */}
            <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full px-4 gap-12 pt-20">
                <motion.div
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center gap-8 max-w-4xl"
                >
                    <h1 className="font-light leading-tight tracking-widest text-[#F8FAFC]" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
                        The House Always Wins.<br />
                        <span className="text-white/50">Until You Become The House.</span>
                    </h1>

                    <p className="text-white/70 tracking-widest max-w-2xl text-base md:text-lg">
                        The future of play is <span className="text-[var(--color-hedera-green)]">liquid</span>. Mine $HASHPLAY through every wager on the Hedera Network.
                    </p>

                    <div className="flex flex-col items-center gap-2 mt-2 mb-4 glass-panel px-8 py-4 rounded-3xl border border-hedera-green/30 shadow-[0_0_20px_rgba(0,193,110,0.15)] backdrop-blur-md">
                        <span className="text-white/50 text-xs tracking-widest uppercase">Total $HASHPLAY Mined</span>
                        <span className="text-4xl md:text-5xl font-light text-[var(--color-hedera-green)]">
                            {totalMined.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>

                    <button
                        onClick={onEnterArena}
                        className="glass-panel px-10 py-4 min-h-[44px] rounded-full text-base tracking-widest border border-hedera-green/50 hover:bg-hedera-green/20 hover:border-hedera-green hover:scale-105 hover:shadow-[0_0_30px_rgba(0,193,110,0.4)] transition-all duration-300"
                    >
                        Enter the Arena
                    </button>
                </motion.div>

                {/* Scroll Indicator (Hidden on mobile) */}
                <div className="hidden md:flex absolute bottom-10 flex-col items-center gap-2 opacity-50 animate-bounce">
                    <span className="text-xs tracking-widest">Scroll to Explore</span>
                    <div className="w-px h-8 bg-white" />
                </div>
            </div>

            {/* Section 2: The Engine (Provable Integrity) */}
            <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full px-4 gap-12 py-20 relative z-10">
                <h2 className="font-light tracking-widest text-[#F8FAFC]" style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}>
                    0.0.169: The Pulse of Fairness
                </h2>

                <div className="glass-panel p-8 md:p-12 rounded-3xl max-w-3xl bg-[var(--color-deep-indigo)]/40 border-t border-t-[var(--color-electric-cyan)]/50 shadow-[0_-10px_40px_rgba(0,242,255,0.15)] backdrop-blur-3xl">
                    <p className="text-white/80 tracking-widest leading-relaxed text-sm md:text-lg text-left">
                        Transparency is not a feature; it is our foundation. Hashplay AI utilizes the Hedera Native PRNG System Contract for true on-chain randomness. Every roll, every flip, and every payout is mathematically verified and immutable. No black boxes. No house edge. Just pure code.
                    </p>
                </div>
            </div>

            {/* Section 3: The Mining Loop (Asymmetric Value) */}
            <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full px-4 gap-16 py-20 relative z-10">
                <h2 className="font-light tracking-widest text-[#F8FAFC]" style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}>
                    Winning is the Goal.<br />
                    Mining is the Guarantee.
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                    {/* Box A */}
                    <div className="glass-panel p-8 md:p-10 rounded-3xl flex flex-col gap-4 items-start text-left border border-white/5 hover:border-hedera-green/30 transition-colors group bg-black/40">
                        <span className="text-[var(--color-hedera-green)] tracking-widest text-xs font-bold uppercase letter-spacing-widest">Win</span>
                        <h3 className="text-2xl text-white tracking-widest font-light group-hover:text-[var(--color-hedera-green)] transition-colors">High-Stakes Multipliers</h3>
                        <p className="text-white/60 tracking-widest text-sm md:text-base leading-relaxed">
                            2x HBAR Payouts. Hit the winning bracket and scale your portfolio instantly.
                        </p>
                    </div>

                    {/* Box B */}
                    <div className="glass-panel p-8 md:p-10 rounded-3xl flex flex-col gap-4 items-start text-left border border-white/5 hover:border-[var(--color-electric-cyan)]/30 transition-colors group bg-black/40">
                        <span className="text-[var(--color-electric-cyan)] tracking-widest text-xs font-bold uppercase letter-spacing-widest">Mine</span>
                        <h3 className="text-2xl text-white tracking-widest font-light group-hover:text-[var(--color-electric-cyan)] transition-colors">No-Loss Compensation</h3>
                        <p className="text-white/60 tracking-widest text-sm md:text-base leading-relaxed">
                            Even when the dice don't roll your way, you mine $HASHPLAY tokens. Every interaction builds your equity in the ecosystem.
                        </p>
                    </div>
                </div>

                <button
                    onClick={onEnterArena}
                    className="mt-8 glass-panel px-10 py-4 min-h-[44px] rounded-full text-base tracking-widest hover:bg-white/10 transition-all duration-300"
                >
                    Play Now
                </button>
            </div>
        </motion.div>
    );
}
