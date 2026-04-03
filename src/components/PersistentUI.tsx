import { useState, useEffect, useRef } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKit } from '@reown/appkit/react'
import { getAccountBalances } from '../services/mirrorNodeService';
import { getUserPoints } from '../services/contractService';
import { ensureHederaNetwork } from '../context/WalletConnectContext';
import gsap from 'gsap';
import { ShieldCheck, Wallet, AlertCircle } from 'lucide-react';

export default function PersistentUI() {
    const { address, isConnected } = useAppKitAccount();
    const { caipNetwork } = useAppKitNetwork();
    const { open } = useAppKit();

    const [balances, setBalances] = useState({ hbar: 0, hashplay: 0, points: 0n });
    const [nativeId, setNativeId] = useState<string | null>(null);
    const displayRef = useRef({ hbar: 0, hashplay: 0, points: 0 });
    const [renderBalances, setRenderBalances] = useState({ hbar: 0, hashplay: 0, points: 0 });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        gsap.to(displayRef.current, {
            hbar: balances.hbar,
            hashplay: balances.hashplay,
            points: Number(balances.points),
            duration: 1.5,
            ease: "power2.out",
            onUpdate: () => {
                setRenderBalances({
                    hbar: displayRef.current.hbar,
                    hashplay: displayRef.current.hashplay,
                    points: Math.round(displayRef.current.points)
                });
            }
        });
    }, [balances]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        async function fetchData() {
            if (isConnected && address) {
                const b = await getAccountBalances(address);
                const p = await getUserPoints(address);
                setBalances({ hbar: b.hbar, hashplay: b.hashplay, points: p });
                setNativeId(b.nativeId);
            } else {
                setNativeId(null);
            }
        }

        fetchData();

        if (isConnected) {
            interval = setInterval(fetchData, 10000);
            window.addEventListener('refreshBalances', fetchData);
            window.addEventListener('refreshPoints', fetchData);
        }

        return () => {
            if (interval) clearInterval(interval);
            window.removeEventListener('refreshBalances', fetchData);
            window.removeEventListener('refreshPoints', fetchData);
        };
    }, [address, isConnected]);

    const handleConnectClick = async () => {
        setIsLoading(true);
        try {
            const networkOk = await ensureHederaNetwork();
            if (networkOk || !isConnected) {
                await open();
            }
        } catch (e) {
            console.error("Connection flow interrupted", e);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatus = () => {
        if (!isConnected) return 'disconnected';
        // Check for Hedera Testnet (296) or Mainnet (295)
        const chainId = caipNetwork?.id;
        const targetChainId = import.meta.env.VITE_NETWORK === 'mainnet' ? 295 : 296;
        if (chainId !== targetChainId) return 'wrong-network';
        return 'synced';
    };

    const status = getStatus();

    return (
        <>
            <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-50">
                <div className="pointer-events-auto">
                    <a
                        href={import.meta.env.VITE_NETWORK === 'mainnet' ? "https://hashscan.io/mainnet" : "https://portal.hedera.com/faucet"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/60 hover:text-hedera-green text-sm tracking-widest transition-colors duration-300"
                    >
                        {import.meta.env.VITE_NETWORK === 'mainnet' ? "HashScan Mainnet ↗" : "Get Testnet HBAR ↗"}
                    </a>
                </div>

                <div className="flex gap-4 items-center">
                    <div className={`pointer-events-auto flex items-center transition-all duration-500 overflow-hidden ${isConnected ? 'opacity-100 max-w-lg' : 'opacity-0 max-w-0'} gap-1 sm:gap-2 glass-panel rounded-full p-1 border border-white/10 shadow-lg`}>
                        <div className="flex flex-col text-right px-2 py-1 sm:px-3 sm:py-1 bg-black/20 rounded-full">
                            <span className="hidden sm:inline text-[8px] sm:text-[10px] text-white/50 uppercase tracking-tighter">HBAR</span>
                            <span className="text-xs sm:text-sm">{renderBalances.hbar.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right px-2 py-1 sm:px-3 sm:py-1 bg-black/20 rounded-full">
                            <span className="hidden sm:inline text-[8px] sm:text-[10px] text-blue-400/50 uppercase tracking-tighter">Points</span>
                            <span className="text-xs sm:text-sm text-blue-400">{renderBalances.points}</span>
                        </div>
                        <div className="flex flex-col text-right px-2 py-1 sm:px-3 sm:py-1 bg-black/20 rounded-full">
                            <span className="hidden sm:inline text-[8px] sm:text-[10px] text-hedera-green/50 uppercase tracking-tighter">$HASH</span>
                            <span className="text-xs sm:text-sm text-hedera-green">{renderBalances.hashplay.toFixed(0)}</span>
                        </div>
                    </div>

                    <div className="pointer-events-auto flex items-center">
                        <button
                            onClick={handleConnectClick}
                            disabled={isLoading}
                            className={`flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-300 shadow-xl group relative overflow-hidden ${status === 'disconnected' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' :
                                status === 'wrong-network' ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' :
                                    'bg-hedera-green/10 border-hedera-green/30 text-hedera-green hover:bg-hedera-green/20'
                                }`}
                        >
                            <div className="relative flex items-center justify-center">
                                <div className={`absolute inset-0 blur-md rounded-full animate-pulse transition-colors ${status === 'disconnected' ? 'bg-white/20' :
                                    status === 'wrong-network' ? 'bg-red-500/40' :
                                        'bg-hedera-green/40'
                                    }`} />

                                <div className={`w-2.5 h-2.5 rounded-full relative z-10 ${status === 'disconnected' ? 'bg-white/40' :
                                    status === 'wrong-network' ? 'bg-red-500' :
                                        'bg-hedera-green shadow-[0_0_10px_rgba(0,193,110,0.8)]'
                                    }`} />
                            </div>

                            <span className="text-xs font-semibold tracking-widest uppercase truncate max-w-[120px]">
                                {isLoading ? 'SYNCING...' :
                                    status === 'disconnected' ? 'Connect' :
                                        status === 'wrong-network' ? 'Wrong Network' :
                                            nativeId ? nativeId :
                                                address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Synced'}
                            </span>

                            {status === 'synced' ? (
                                <ShieldCheck className="w-4 h-4 text-hedera-green opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : status === 'wrong-network' ? (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                            ) : (
                                <Wallet className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </div>
            </header>

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
