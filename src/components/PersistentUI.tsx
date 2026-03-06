import { useState, useEffect, useRef } from 'react';
import { useAppKitAccount } from '@reown/appkit/react'
import { getAccountBalances } from '../services/mirrorNodeService';
import gsap from 'gsap';

export default function PersistentUI() {
    const { address, isConnected } = useAppKitAccount();
    const [balances, setBalances] = useState({ hbar: 0, hashplay: 0 });
    const displayRef = useRef({ hbar: 0, hashplay: 0 });
    const [renderBalances, setRenderBalances] = useState({ hbar: 0, hashplay: 0 });

    useEffect(() => {
        gsap.to(displayRef.current, {
            hbar: balances.hbar,
            hashplay: balances.hashplay,
            duration: 1.5,
            ease: "power2.out",
            onUpdate: () => {
                setRenderBalances({
                    hbar: displayRef.current.hbar,
                    hashplay: displayRef.current.hashplay
                });
            }
        });
    }, [balances]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        async function fetchBalances() {
            if (isConnected && address) {
                // Address from AppKit might be in EVM or Hedera format depending on connection
                // Hedera mirror node accepts EVM format "0x..." addresses
                const b = await getAccountBalances(address);
                setBalances(b);
            }
        }

        fetchBalances();

        if (isConnected) {
            // Poll every 10 seconds for balance updates
            interval = setInterval(fetchBalances, 10000);
            window.addEventListener('refreshBalances', fetchBalances);
        }

        return () => {
            if (interval) clearInterval(interval);
            window.removeEventListener('refreshBalances', fetchBalances);
        };
    }, [address, isConnected]);

    return (
        <>
            <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-50">
                {/* Faucet Hook */}
                <div className="pointer-events-auto">
                    <a
                        href="https://portal.hedera.com/faucet"
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/60 hover:text-hedera-green text-sm tracking-widest transition-colors duration-300"
                    >
                        Get Testnet HBAR ↗
                    </a>
                </div>

                {/* Right Side Controls */}
                <div className="flex gap-4 items-center">
                    {/* Dynamic Balances */}
                    <div className={`pointer-events-auto flex items-center transition-all duration-500 overflow-hidden ${isConnected ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'} gap-1 sm:gap-2 glass-panel rounded-full p-1 border border-white/10 shadow-lg`}>
                        <div className="flex flex-col text-right px-2 py-1 sm:px-3 sm:py-1 bg-black/20 rounded-full">
                            <span className="hidden sm:inline text-[10px] sm:text-xs text-white/50">HBAR</span>
                            <span className="text-xs sm:text-sm">{renderBalances.hbar.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right px-2 py-1 sm:px-3 sm:py-1 bg-black/20 rounded-full">
                            <span className="hidden sm:inline text-[10px] sm:text-xs text-[var(--color-hedera-green)]/50">$HASH</span>
                            <span className="text-xs sm:text-sm text-[var(--color-hedera-green)]">{renderBalances.hashplay.toFixed(0)}</span>
                        </div>
                    </div>

                    {/* AppKit Connect Button */}
                    <div className="pointer-events-auto flex items-center shadow-lg">
                        <appkit-button />
                    </div>
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
