import { X } from 'lucide-react';

export default function PersistentUI() {
    return (
        <>
            <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-50">
                {/* Faucet Hook */}
                <div className="pointer-events-auto">
                    <a
                        href="https://portal.hedera.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/60 hover:text-hedera-green text-sm tracking-widest transition-colors duration-300"
                    >
                        Get Testnet HBAR ↗
                    </a>
                </div>

                {/* Top-Right Balance Capsule */}
                <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 glass-panel rounded-full p-1 border border-white/10 shadow-lg">
                    <div className="flex flex-col text-right px-2 py-1 sm:px-3 sm:py-1 bg-black/20 rounded-full">
                        <span className="hidden sm:inline text-[10px] sm:text-xs text-white/50">HBAR</span>
                        <span className="text-xs sm:text-sm">0.00</span>
                    </div>
                    <div className="flex flex-col text-right px-2 py-1 sm:px-3 sm:py-1 bg-black/20 rounded-full">
                        <span className="hidden sm:inline text-[10px] sm:text-xs text-hedera-green/50">$HASHPLAY</span>
                        <span className="text-xs sm:text-sm text-hedera-green">0.00</span>
                    </div>
                    <button className="p-1 sm:p-2 rounded-full hover:bg-white/10 transition-colors mr-1 group">
                        <X className="w-3 h-3 sm:w-4 sm:h-4 text-white/50 group-hover:text-white" />
                    </button>
                </div>
            </header>

            {/* Social Footer */}
            <footer className="fixed bottom-6 w-full flex justify-between px-6 pointer-events-none z-50">
                <div className="flex gap-4 pointer-events-auto">
                    <a
                        href="https://x.com/HashPlayApp"
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/40 hover:text-white transition-colors text-xs tracking-widest"
                    >
                        X (Twitter)
                    </a>
                    <a
                        href="https://discord.gg/8nvyyHPJ"
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/40 hover:text-white transition-colors text-xs tracking-widest"
                    >
                        Discord
                    </a>
                </div>
            </footer>
        </>
    );
}
