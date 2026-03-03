import { motion } from 'framer-motion';

export default function SectionHero({ onEnterArena }: { onEnterArena: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center text-center h-full max-w-3xl"
        >
            <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col items-center gap-12"
            >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight tracking-widest text-white/90">
                    The future of play is <span className="text-hedera-green">liquid</span>. <br />
                    Mine $HASHPLAY through every wager.
                </h1>

                <button
                    onClick={onEnterArena}
                    className="glass-panel px-12 py-5 rounded-full text-lg tracking-widest hover:bg-hedera-green/20 hover:border-hedera-green/50 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,193,110,0.3)] transition-all duration-300"
                >
                    Enter the Arena
                </button>
            </motion.div>
        </motion.div>
    );
}
