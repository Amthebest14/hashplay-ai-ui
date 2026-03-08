import { useState, useEffect, useRef } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKit } from '@reown/appkit/react'
import { getAccountBalances } from '../services/mirrorNodeService';
import { ensureHederaNetwork } from '../context/WalletConnectContext';
import gsap from 'gsap';
import { ShieldCheck, Wallet, AlertCircle, Cpu } from 'lucide-react';

export default function PersistentUI() {
    const { address, isConnected } = useAppKitAccount();
    const { caipNetwork } = useAppKitNetwork();
    const { open } = useAppKit();

    const [balances, setBalances] = useState({ hbar: 0, hashplay: 0 });
    const [isAssociated, setIsAssociated] = useState(true);
    const displayRef = useRef({ hbar: 0, hashplay: 0 });
    const [renderBalances, setRenderBalances] = useState({ hbar: 0, hashplay: 0 });
    const [isLoading, setIsLoading] = useState(false);

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
                const b = await getAccountBalances(address);
                setBalances({ hbar: b.hbar, hashplay: b.hashplay });
                setIsAssociated(b.isAssociated);
            }
        }

        fetchBalances();

        if (isConnected) {
            interval = setInterval(fetchBalances, 10000);
            window.addEventListener('refreshBalances', fetchBalances);
        }

        return () => {
            if (interval) clearInterval(interval);
            window.removeEventListener('refreshBalances', fetchBalances);
        };
    }, [address, isConnected]);

    const handleConnectClick = async () => {
        setIsLoading(true);
        try {
            // Step A: Pre-flight check (Metamask Network Prompt)
            const networkOk = await ensureHederaNetwork();

            // Step B: Open Modal
            if (networkOk || !isConnected) {
                await open();
            }
        } catch (e) {
            console.error("Connection flow interrupted", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Determine Connection Status for the custom button
    const getStatus = () => {
        if (!isConnected) return 'disconnected';
        if (caipNetwork?.id !== 296) return 'wrong-network';
        if (!isAssociated) return 'missing-association';
        return 'synced';
    };

    const status = getStatus();

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

                    {/* Custom Hedera-Ready Status Button */}
                    <div className="pointer-events-auto flex items-center">
                        <button
                            onClick={handleConnectClick}
                            disabled={isLoading}
                            className={`flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-300 shadow-xl group relative overflow-hidden ${status === 'disconnected' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' :
                                status === 'wrong-network' ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' :
                                    status === 'missing-association' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20' :
                                        'bg-hedera-green/10 border-hedera-green/30 text-hedera-green hover:bg-hedera-green/20'
                                }`}
                        >
                            {/* Visual Status Icon */}
                            <div className="relative flex items-center justify-center">
                                <div className={`absolute inset-0 blur-md rounded-full animate-pulse transition-colors ${status === 'disconnected' ? 'bg-white/20' :
                                    status === 'wrong-network' ? 'bg-red-500/40' :
                                        status === 'missing-association' ? 'bg-orange-500/40' :
                                            'bg-hedera-green/40'
                                    }`} />

                                <div className={`w-2.5 h-2.5 rounded-full relative z-10 ${status === 'disconnected' ? 'bg-white/40' :
                                    status === 'wrong-network' ? 'bg-red-500' :
                                        status === 'missing-association' ? 'bg-orange-500' :
                                            'bg-hedera-green shadow-[0_0_10px_rgba(0,193,110,0.8)]'
                                    }`} />
                            </div>

                            <span className="text-xs font-semibold tracking-widest uppercase truncate max-w-[120px]">
                                {isLoading ? 'SYNCING...' :
                                    status === 'disconnected' ? 'Connect' :
                                        status === 'wrong-network' ? 'Wrong Network' :
                                            status === 'missing-association' ? 'Enable Mining' :
                                                address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Synced'}
                            </span>

                            {status === 'synced' ? (
                                <ShieldCheck className="w-4 h-4 text-hedera-green opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : status === 'missing-association' ? (
                                <Cpu className="w-4 h-4 text-orange-400 animate-spin-slow" />
                            ) : status === 'wrong-network' ? (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                            ) : (
                                <Wallet className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                            )}

                            {/* Hover Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
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
