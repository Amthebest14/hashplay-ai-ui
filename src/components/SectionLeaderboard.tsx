import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTopPlayersByXP, type LeaderboardEntry } from '../services/mirrorNodeService';

export default function SectionLeaderboard() {
    const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            setLoading(true);
            const topPlayers = await getTopPlayersByXP(25);
            setPlayers(topPlayers);
            setLoading(false);
        }
        fetchLeaderboard();
    }, []);

    const getRankStyle = (index: number) => {
        if (index === 0) return 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]';
        if (index === 1) return 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]';
        if (index === 2) return 'text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]';
        return 'text-white/70';
    };

    const getRankBorder = (index: number) => {
        if (index === 0) return 'border-l-2 border-yellow-400/40';
        if (index === 1) return 'border-l-2 border-gray-300/30';
        if (index === 2) return 'border-l-2 border-amber-600/30';
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl flex flex-col h-[70vh]"
        >
            <div className="flex flex-col gap-2 mb-8 text-center">
                <h2 className="text-3xl font-light tracking-widest text-white">Global Leaderboard</h2>
                <p className="text-xs tracking-[0.3em] text-emerald-400/60 uppercase">Ranked by On-Chain XP</p>
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent mx-auto mt-2" />
            </div>

            <div className="glass-panel rounded-3xl flex-1 flex flex-col overflow-hidden border border-emerald-400/10">
                {/* Table Header */}
                <div className="grid grid-cols-3 px-8 py-4 bg-black/60 border-b border-emerald-400/10 text-xs tracking-widest text-emerald-400/50 uppercase">
                    <div className="col-span-1">RANK</div>
                    <div className="col-span-1">PLAYER</div>
                    <div className="col-span-1 text-right">XP</div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-sm rounded-xl">
                            <div className="animate-pulse text-emerald-400 tracking-widest text-sm">LOADING XP DATA...</div>
                        </div>
                    )}

                    {!loading && players.length === 0 && (
                        <div className="flex items-center justify-center h-full text-white/40 tracking-widest text-sm">
                            NO PLAYERS RANKED YET — BE THE FIRST
                        </div>
                    )}

                    {players.map((row, index) => (
                        <motion.div
                            key={row.account}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`grid grid-cols-3 px-6 py-4 mx-2 my-1 rounded-xl hover:bg-emerald-400/5 transition-all duration-300 items-center text-sm group ${getRankBorder(index)}`}
                        >
                            <div className={`col-span-1 font-bold text-lg ${getRankStyle(index)} transition-colors`}>
                                #{index + 1}
                            </div>
                            <div className="col-span-1 tracking-[0.15em] text-white/80 group-hover:text-white transition-colors font-mono text-xs">
                                {row.account}
                            </div>
                            <div className="col-span-1 text-right font-semibold tracking-widest text-emerald-400 group-hover:text-emerald-300 transition-colors">
                                {row.xp.toLocaleString()} <span className="text-[10px] text-emerald-400/50">XP</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <p className="text-center text-xs text-white/30 tracking-widest mt-6">
                On-chain XP is earned through gameplay. Rankings update in real-time.
            </p>
        </motion.div>
    );
}
