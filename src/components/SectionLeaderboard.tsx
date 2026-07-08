import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTopPlayersByXP, type LeaderboardEntry } from '../services/mirrorNodeService';
import season1Data from '../data/season1.json';

const PLAYERS_PER_PAGE = 100;

export default function SectionLeaderboard() {
    const [allPlayers, setAllPlayers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeSeason, setActiveSeason] = useState<1 | 2>(2);

    useEffect(() => {
        async function fetchLeaderboard() {
            setLoading(true);
            if (activeSeason === 2) {
                const topPlayers = await getTopPlayersByXP(500);
                setAllPlayers(topPlayers);
            } else {
                setAllPlayers(season1Data as LeaderboardEntry[]);
            }
            setCurrentPage(1);
            setLoading(false);
        }
        fetchLeaderboard();
    }, [activeSeason]);

    const totalPages = Math.max(1, Math.ceil(allPlayers.length / PLAYERS_PER_PAGE));
    const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
    const currentPlayers = allPlayers.slice(startIndex, startIndex + PLAYERS_PER_PAGE);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getRankStyle = (globalIndex: number) => {
        if (globalIndex === 0) return 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]';
        if (globalIndex === 1) return 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]';
        if (globalIndex === 2) return 'text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]';
        return 'text-white/70';
    };

    const getRankBorder = (globalIndex: number) => {
        if (globalIndex === 0) return 'border-l-2 border-yellow-400/40';
        if (globalIndex === 1) return 'border-l-2 border-gray-300/30';
        if (globalIndex === 2) return 'border-l-2 border-amber-600/30';
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
                
                {/* Season Toggle */}
                <div className="flex justify-center mt-4">
                    <div className="bg-black/40 p-1 rounded-xl border border-emerald-400/20 flex gap-1">
                        <button 
                            onClick={() => setActiveSeason(1)}
                            className={`px-6 py-2 rounded-lg text-xs font-bold tracking-widest transition-all duration-300 ${activeSeason === 1 ? 'bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'text-white/40 hover:text-white/80'}`}
                        >
                            SEASON 1
                        </button>
                        <button 
                            onClick={() => setActiveSeason(2)}
                            className={`px-6 py-2 rounded-lg text-xs font-bold tracking-widest transition-all duration-300 ${activeSeason === 2 ? 'bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'text-white/40 hover:text-white/80'}`}
                        >
                            SEASON 2 (LIVE)
                        </button>
                    </div>
                </div>
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

                    {!loading && allPlayers.length === 0 && (
                        <div className="flex items-center justify-center h-full text-white/40 tracking-widest text-sm">
                            NO PLAYERS RANKED YET — BE THE FIRST
                        </div>
                    )}

                    {currentPlayers.map((row, localIndex) => {
                        const globalIndex = startIndex + localIndex;
                        return (
                            <motion.div
                                key={row.account}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: localIndex * 0.02 }}
                                className={`grid grid-cols-3 px-6 py-4 mx-2 my-1 rounded-xl hover:bg-emerald-400/5 transition-all duration-300 items-center text-sm group ${getRankBorder(globalIndex)}`}
                            >
                                <div className={`col-span-1 font-bold text-lg ${getRankStyle(globalIndex)} transition-colors`}>
                                    #{globalIndex + 1}
                                </div>
                                <div className="col-span-1 tracking-[0.15em] text-white/80 group-hover:text-white transition-colors font-mono text-xs">
                                    {row.account}
                                </div>
                                <div className="col-span-1 text-right font-semibold tracking-widest text-emerald-400 group-hover:text-emerald-300 transition-colors">
                                    {row.xp.toLocaleString()} <span className="text-[10px] text-emerald-400/50">XP</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Pagination Bar */}
                {!loading && allPlayers.length > PLAYERS_PER_PAGE && (
                    <div className="flex items-center justify-center gap-2 px-8 py-4 bg-black/60 border-t border-emerald-400/10">
                        {/* Previous Button */}
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg text-xs tracking-widest font-semibold transition-all duration-300 
                                       disabled:opacity-20 disabled:cursor-not-allowed
                                       text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-400/10"
                        >
                            ‹ PREV
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`w-9 h-9 rounded-lg text-sm font-bold tracking-wider transition-all duration-300
                                    ${currentPage === page
                                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        {/* Next Button */}
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg text-xs tracking-widest font-semibold transition-all duration-300 
                                       disabled:opacity-20 disabled:cursor-not-allowed
                                       text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-400/10"
                        >
                            NEXT ›
                        </button>

                        {/* Player Count */}
                        <span className="ml-4 text-[10px] text-white/30 tracking-widest">
                            {allPlayers.length} PLAYERS
                        </span>
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-white/30 tracking-widest mt-6">
                On-chain XP is earned through gameplay. Rankings update in real-time.
            </p>
        </motion.div>
    );
}
