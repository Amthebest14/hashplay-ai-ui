import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTopHolders, type LeaderboardEntry } from '../services/mirrorNodeService';

export default function SectionLeaderboard() {
    const [holders, setHolders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            setLoading(true);
            const topHolders = await getTopHolders(25);
            setHolders(topHolders);
            setLoading(false);
        }

        fetchLeaderboard();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl flex flex-col h-[70vh]"
        >
            <div className="flex flex-col gap-2 mb-8 text-center">
                <h2 className="text-3xl font-light tracking-widest text-white">High Score</h2>
                <div className="h-px w-24 bg-hedera-green/50 mx-auto mt-2" />
            </div>

            <div className="glass-panel rounded-3xl flex-1 flex flex-col overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-4 px-8 py-4 bg-black/40 border-b border-white/10 text-xs tracking-widest text-white/50 uppercase">
                    <div className="col-span-1">RANK</div>
                    <div className="col-span-2">ADDRESS</div>
                    <div className="col-span-1 text-right">BALANCE ($HASHPLAY)</div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-sm rounded-xl">
                            <div className="animate-pulse text-hedera-green tracking-widest text-sm">LOADING NETWORK DATA...</div>
                        </div>
                    )}

                    {!loading && holders.length === 0 && (
                        <div className="flex items-center justify-center h-full text-white/40 tracking-widest text-sm">
                            NO HOLDERS FOUND RECORDED ON CHAIN
                        </div>
                    )}

                    {holders.map((row, index) => (
                        <div
                            key={row.account}
                            className="grid grid-cols-4 px-6 py-4 mx-2 my-1 rounded-xl hover:bg-white/5 transition-colors items-center text-sm group"
                        >
                            <div className="col-span-1 font-semibold text-white/70 group-hover:text-white transition-colors">
                                #{index + 1}
                            </div>
                            <div className="col-span-2 tracking-[0.2em]">{row.account}</div>
                            <div className="col-span-1 text-right text-hedera-green font-medium">
                                {Number(row.balance).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-center text-xs text-white/40 tracking-widest mt-6">
                Rankings are snapshot-ready for the mainnet airdrop allocation.
            </p>
        </motion.div>
    );
}
