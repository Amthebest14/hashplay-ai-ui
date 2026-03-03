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
                        get testnet hbar ↗
                    </a>
                </div>

                {/* Top-Right Balance Capsule */}
                <div className="pointer-events-auto flex items-center gap-2 glass-panel rounded-full p-1 border border-white/10 shadow-lg">
                    <div className="flex flex-col text-right px-3 py-1 bg-black/20 rounded-full">
                        <span className="text-xs text-white/50">hbar</span>
                        <span className="text-sm">0.00</span>
                    </div>
                    <div className="flex flex-col text-right px-3 py-1 bg-black/20 rounded-full">
                        <span className="text-xs text-hedera-green/50">$hashplay</span>
                        <span className="text-sm text-hedera-green">0.00</span>
                    </div>
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors mr-1 group">
                        <X className="w-4 h-4 text-white/50 group-hover:text-white" />
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
                        x (twitter)
                    </a>
                    <a
                        href="https://discord.gg/8nvyyHPJ"
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/40 hover:text-white transition-colors text-xs tracking-widest"
                    >
                        discord
                    </a>
                </div>
            </footer>
        </>
    );
}
