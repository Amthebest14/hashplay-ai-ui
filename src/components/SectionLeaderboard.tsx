import { motion } from 'framer-motion';

const MOCK_WALLETS = Array.from({ length: 25 }).map((_, i) => ({
    rank: i + 1,
    address: `0.0.${Math.floor(100000 + Math.random() * 900000)}`,
    balance: (100000 / (i + 1) + Math.random() * 500).toFixed(2),
}));

export default function SectionLeaderboard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl flex flex-col h-[70vh]"
        >
            <div className="flex flex-col gap-2 mb-8 text-center">
                <h2 className="text-3xl font-light tracking-widest text-white">high score</h2>
                <div className="h-px w-24 bg-hedera-green/50 mx-auto mt-2" />
            </div>

            <div className="glass-panel rounded-3xl flex-1 flex flex-col overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-4 px-8 py-4 bg-black/40 border-b border-white/10 text-xs tracking-widest text-white/50 uppercase">
                    <div className="col-span-1">rank</div>
                    <div className="col-span-2">address</div>
                    <div className="col-span-1 text-right">balance ($hashplay)</div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {MOCK_WALLETS.map((row) => (
                        <div
                            key={row.rank}
                            className="grid grid-cols-4 px-6 py-4 mx-2 my-1 rounded-xl hover:bg-white/5 transition-colors items-center text-sm group"
                        >
                            <div className="col-span-1 font-semibold text-white/70 group-hover:text-white transition-colors">
                                #{row.rank}
                            </div>
                            <div className="col-span-2 tracking-[0.2em]">{row.address}</div>
                            <div className="col-span-1 text-right text-hedera-green font-medium">
                                {Number(row.balance).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-center text-xs text-white/40 tracking-widest mt-6">
                rankings are snapshot-ready for the mainnet airdrop allocation.
            </p>
        </motion.div>
    );
}
