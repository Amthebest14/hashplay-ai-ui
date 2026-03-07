import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Float } from '@react-three/drei';
import { playMiningEngineGame, associateTokenTransaction } from '../services/contractService';
import { getAccountBalances } from '../services/mirrorNodeService';
import { useAppKitAccount } from '@reown/appkit/react';
import { formatUnits } from 'ethers';
import gsap from 'gsap';
import { useNotification } from '../context/NotificationContext';


function DiceMock({ position, isSpinning, result }: { position: [number, number, number], isSpinning: boolean, result: number }) {
    const meshRef = useRef<any>(null);
    const rotations: Record<number, [number, number, number]> = {
        1: [0, 0, 0], 2: [0, -Math.PI / 2, 0], 3: [Math.PI / 2, 0, 0],
        4: [-Math.PI / 2, 0, 0], 5: [0, Math.PI / 2, 0], 6: [0, Math.PI, 0]
    };

    useFrame(() => {
        if (isSpinning && meshRef.current) {
            meshRef.current.rotation.x += 0.4;
            meshRef.current.rotation.y += 0.5;
        }
    });

    useEffect(() => {
        if (!isSpinning && meshRef.current && result) {
            const [x, y, z] = rotations[result] || [0, 0, 0];
            gsap.to(meshRef.current.rotation, { x: x + Math.PI * 4, y: y + Math.PI * 4, z: z, duration: 1.5, ease: 'power3.out' });
        }
    }, [isSpinning, result]);

    return (
        <mesh ref={meshRef} position={position}>
            <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.2} smoothness={4}>
                <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.8} />
            </RoundedBox>
            <Text position={[0, 0, 0.76]} fontSize={0.5} color="#000">1</Text>
            <Text position={[0, 0, -0.76]} rotation={[0, Math.PI, 0]} fontSize={0.5} color="#000">6</Text>
            <Text position={[0.76, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.5} color="#000">2</Text>
            <Text position={[-0.76, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.5} color="#000">5</Text>
            <Text position={[0, 0.76, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#000">3</Text>
            <Text position={[0, -0.76, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={0.5} color="#000">4</Text>
        </mesh>
    );
}

function CoinMock({ isSpinning, result }: { isSpinning: boolean, result: number }) {
    const meshRef = useRef<any>(null);
    useFrame(() => {
        if (isSpinning && meshRef.current) {
            meshRef.current.rotation.x += 0.8;
            meshRef.current.rotation.y += 0.2;
        }
    });

    useEffect(() => {
        if (!isSpinning && meshRef.current && result) {
            const targetX = result === 1 ? Math.PI / 2 : -Math.PI / 2;
            gsap.to(meshRef.current.rotation, { x: targetX + Math.PI * 10, y: 0, z: 0, duration: 2, ease: 'power3.out' });
        }
    }, [isSpinning, result]);

    return (
        <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
            <group>
                <mesh ref={meshRef}>
                    <cylinderGeometry args={[2.2, 2.2, 0.3, 64]} />
                    <meshStandardMaterial
                        color="#FFD700"
                        roughness={0.05}
                        metalness={1}
                        emissive="#FFD700"
                        emissiveIntensity={0.1}
                    />
                    <Text position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#000">HEADS</Text>
                    <Text position={[0, -0.16, 0]} rotation={[Math.PI / 2, Math.PI, 0]} fontSize={0.5} color="#000">TAILS</Text>
                </mesh>
                <spotLight position={[0, 5, 2]} intensity={50} angle={0.3} penumbra={1} castShadow />
                <pointLight position={[-2, 2, 2]} intensity={20} color="#ffffff" />
            </group>
        </Float>
    );
}

export default function SectionArena() {
    const [wager, setWager] = useState<number>(0);
    const wagerOptions = [5, 10, 25, 50, 100, 500];

    const { address, isConnected } = useAppKitAccount();
    const { notify } = useNotification();
    const [txState, setTxState] = useState<{ status: 'idle' | 'pending' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });
    const [isAssociated, setIsAssociated] = useState<boolean>(true);

    const [gameState, setGameState] = useState({
        isSpinning: false,
        gameType: 0,
        diceResult: [1, 6],
        coinResult: 1,
        outcome: null as 'win' | 'mine' | null,
        selectedDice: null as number | null,
        selectedCoin: null as number | null
    });

    useEffect(() => {
        if (isConnected && address) {
            getAccountBalances(address).then(({ isAssociated }) => {
                setIsAssociated(isAssociated);
            });
        } else {
            setIsAssociated(true);
        }
    }, [isConnected, address]);

    const handleAssociate = async () => {
        setTxState({ status: 'pending', message: 'Associating $HASHPLAY token...' });
        const tokenId = import.meta.env.VITE_HASHPLAY_TOKEN_ID;
        const result = await associateTokenTransaction(tokenId);
        if (result.success) {
            setTxState({ status: 'success', message: 'Token Associated! You can now mine.' });
            setIsAssociated(true);
            window.dispatchEvent(new Event('refreshBalances'));
        } else {
            setTxState({ status: 'error', message: result.error || 'Association failed.' });
        }
        setTimeout(() => setTxState({ status: 'idle', message: '' }), 5000);
    };

    const handlePlayGame = async (gameType: number) => {
        if (!isConnected) {
            setTxState({ status: 'error', message: 'Please connect your wallet first.' });
            setTimeout(() => setTxState({ status: 'idle', message: '' }), 3000);
            return;
        }

        const prediction = gameType === 1 ? gameState.selectedDice : gameState.selectedCoin;
        if (!prediction) {
            setTxState({ status: 'error', message: 'Please select a prediction first.' });
            setTimeout(() => setTxState({ status: 'idle', message: '' }), 3000);
            return;
        }

        if (wager <= 0) {
            setTxState({ status: 'error', message: 'Please enter a valid wager amount.' });
            setTimeout(() => setTxState({ status: 'idle', message: '' }), 3000);
            return;
        }

        setTxState({ status: 'pending', message: 'Awaiting wallet confirmation...' });
        setGameState(prev => ({ ...prev, isSpinning: true, gameType, outcome: null }));

        const congestionTimer = setTimeout(() => {
            setTxState(prev => prev.status === 'pending' ? { ...prev, message: 'Network Congestion: Still awaiting receipt...' } : prev);
        }, 15000);

        try {
            const result = await playMiningEngineGame(wager, gameType, prediction);
            clearTimeout(congestionTimer);

            if (result.success) {
                let diceRes: [number, number] = [1, 6];
                let coinRes = 1;

                const onChainRoll = Number(result.rollResult);

                if (gameType === 1) {
                    // Split the sum into two dice
                    // We can use the same logic as the contract or just a simple split
                    // Since the contract rolled die1 + die2, we can't know exactly what they were 
                    // unless we return die1/die2 separately, but we can simulate a valid pair for that sum.
                    let d1 = Math.floor(onChainRoll / 2);
                    if (d1 < 1) d1 = 1;
                    if (d1 > 6) d1 = 6;
                    let d2 = onChainRoll - d1;
                    if (d2 > 6) {
                        d2 = 6;
                        d1 = onChainRoll - 6;
                    }
                    if (d2 < 1) {
                        d2 = 1;
                        d1 = onChainRoll - 1;
                    }
                    diceRes = [d1, d2];
                } else {
                    // Coin Flip
                    // 1-48 is Heads (1), 53-100 is Tails (2), 49-52 is Edge/Loss
                    if (onChainRoll <= 48) coinRes = 1;
                    else if (onChainRoll >= 53) coinRes = 2;
                    else coinRes = 3; // Special "Edge" state if we had one, but for now just show result
                }

                setGameState({
                    isSpinning: false,
                    gameType,
                    diceResult: diceRes,
                    coinResult: coinRes,
                    outcome: result.won ? 'win' : 'mine',
                    selectedDice: gameState.selectedDice,
                    selectedCoin: gameState.selectedCoin
                });

                let outcomeMsg = '';
                if (result.won) {
                    const hbarAmount = formatUnits(result.payout || 0, 8);
                    const hashAmount = formatUnits(result.hashplayReward || 0, 8);
                    outcomeMsg = `WINNER! Payout: ${hbarAmount} HBAR`;
                    notify('win', `Big win! ${hbarAmount} HBAR payout and ${hashAmount} $HASHPLAY tokens are arriving.`, `${hbarAmount} HBAR`);
                } else {
                    const hashAmount = formatUnits(result.hashplayReward || 0, 8);
                    outcomeMsg = `MINED! Consolation: ${hashAmount} $HASHPLAY`;
                    notify('mine', `Mining complete. You received ${hashAmount} consolation $HASHPLAY tokens.`, `${hashAmount} $HASHPLAY`);
                }

                setTxState({ status: 'success', message: outcomeMsg });

                window.dispatchEvent(new Event('refreshBalances'));
            } else {
                setGameState(prev => ({ ...prev, isSpinning: false }));
                const isRejected = result.error?.toLowerCase().includes('reject');
                setTxState({ status: 'error', message: isRejected ? 'Transaction Cancelled' : result.error || 'Transaction failed.' });
            }
        } catch (e: any) {
            clearTimeout(congestionTimer);
            setGameState(prev => ({ ...prev, isSpinning: false }));
            const isRejected = e.message?.toLowerCase().includes('reject');
            const errorMsg = isRejected ? 'Transaction Cancelled' : e.message || 'Transaction rejected.';
            setTxState({ status: 'error', message: errorMsg });
            notify('error', errorMsg);
        }

        setTimeout(() => {
            setTxState({ status: 'idle', message: '' });
            setGameState(prev => ({ ...prev, outcome: null }));
        }, 6000);
    };

    return (
        <div className="w-full min-h-[100dvh] flex flex-col items-center justify-center pt-24 pb-12 relative">
            {txState.status !== 'idle' && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl transition-all ${txState.status === 'pending' ? 'bg-black/80 border border-white/20 text-white' :
                    txState.status === 'success' ? 'bg-black text-white border border-hedera-green/50 shadow-[0_0_20px_rgba(0,193,110,0.3)]' :
                        'bg-red-500/90 border border-red-400 text-white font-semibold'
                    }`}>
                    <p className="text-sm tracking-widest">{txState.message}</p>
                </div>
            )}

            <div className="w-[95%] max-w-[800px] flex flex-col gap-8 py-4">
                {!isAssociated ? (
                    <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center gap-4 border border-hedera-green/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-hedera-green/5 animate-pulse" />
                        <h3 className="text-xl font-light tracking-widest text-white relative z-10">ACTION REQUIRED</h3>
                        <p className="text-white/60 text-sm text-center max-w-md relative z-10">
                            You must associate the $HASHPLAY token to your wallet before you can participate in the mining engine and receive payouts.
                        </p>
                        <button
                            onClick={handleAssociate}
                            className="bg-hedera-green text-black px-8 py-3 rounded-full font-bold tracking-widest shadow-[0_0_20px_rgba(0,193,110,0.5)] hover:scale-105 transition-all relative z-10"
                        >
                            ENABLE $HASHPLAY MINING
                        </button>
                    </div>
                ) : (
                    <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div className="flex flex-col gap-2 w-full md:w-auto relative z-10">
                            <span className="text-white/50 text-sm tracking-widest">Select Wager (HBAR)</span>
                            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                                {wagerOptions.map((amount) => (
                                    <button key={amount} onClick={() => setWager(amount)}
                                        className={`px-4 py-2 min-h-[44px] rounded-xl text-sm transition-all duration-300 ${wager === amount
                                            ? 'bg-hedera-green text-black font-semibold shadow-[0_0_15px_rgba(0,193,110,0.4)]'
                                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
                                            }`}>
                                        {amount}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-48 relative z-10">
                            <span className="text-white/50 text-sm tracking-widest">Custom Amount</span>
                            <input type="number" placeholder="0.00" value={wager || ''} onChange={(e) => setWager(Number(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-hedera-green/50 transition-colors" />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[500px]">
                    <div className="arena-card h-full relative">
                        {gameState.gameType === 1 && gameState.outcome === 'win' && <div className="absolute inset-0 bg-[#00C16E]/20 blur-3xl rounded-full z-0 pointer-events-none transition-opacity duration-1000" />}
                        {gameState.gameType === 1 && gameState.outcome === 'mine' && <div className="absolute inset-0 bg-[#00F2FF]/20 blur-3xl rounded-full z-0 pointer-events-none transition-opacity duration-1000" />}

                        <div className={`glass-panel rounded-3xl p-8 flex flex-col h-full justify-between transition-all duration-700 border relative z-10 overflow-hidden ${gameState.gameType === 1 && gameState.outcome === 'win' ? 'border-[#00C16E] shadow-[0_0_30px_rgba(0,193,110,0.3)]' :
                            gameState.gameType === 1 && gameState.outcome === 'mine' ? 'border-[#00F2FF] shadow-[0_0_30px_rgba(0,242,255,0.3)]' :
                                'border-white/10'
                            }`}>
                            <div className="flex justify-between items-center relative z-20">
                                <h2 className="text-2xl font-light text-white tracking-widest pointer-events-none">Dice Game</h2>
                                <div className="h-2 w-2 rounded-full bg-hedera-green shadow-[0_0_10px_rgba(0,193,110,0.8)]" />
                            </div>

                            <div className={`flex-1 w-full relative my-6 bg-black/40 rounded-2xl overflow-hidden pointer-events-auto border border-white/5 shadow-inner transition-all z-30 ${gameState.gameType === 1 && gameState.isSpinning ? 'blur-[1px] opacity-90' : 'blur-0 opacity-100'
                                }`}>
                                <Canvas camera={{ position: [0, 0, 5] }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
                                    <ambientLight intensity={0.8} />
                                    <pointLight position={[10, 10, 10]} intensity={1.5} />
                                    <DiceMock position={[-1.6, 0, 0]} isSpinning={gameState.gameType === 1 && gameState.isSpinning} result={gameState.diceResult[0]} />
                                    <DiceMock position={[1.6, 0, 0]} isSpinning={gameState.gameType === 1 && gameState.isSpinning} result={gameState.diceResult[1]} />
                                </Canvas>
                            </div>

                            <div className="grid grid-cols-3 gap-3 relative z-10 mb-4">
                                {['Lower', 'Equal', 'Higher'].map((choice, idx) => {
                                    const predValue = idx + 1;
                                    const isSelected = gameState.selectedDice === predValue;
                                    return (
                                        <button key={choice} disabled={!isAssociated || gameState.isSpinning}
                                            onClick={() => setGameState(prev => ({ ...prev, selectedDice: predValue }))}
                                            className={`glass-panel py-3 min-h-[44px] rounded-xl text-sm tracking-widest transition-all ${!isAssociated || gameState.isSpinning ? 'opacity-50 cursor-not-allowed' :
                                                isSelected ? 'bg-hedera-green text-black font-semibold shadow-[0_0_15px_rgba(0,193,110,0.4)] scale-105' :
                                                    'hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05]'
                                                }`} >{choice}</button>
                                    );
                                })}
                            </div>

                            <button
                                disabled={!isAssociated || gameState.isSpinning || !gameState.selectedDice}
                                onClick={() => handlePlayGame(1)}
                                className={`w-full py-4 rounded-xl font-bold tracking-widest transition-all uppercase ${!isAssociated || gameState.isSpinning || !gameState.selectedDice
                                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                    : 'bg-hedera-green text-black shadow-[0_0_20px_rgba(0,193,110,0.5)] hover:scale-[1.02]'
                                    }`}
                            >
                                {gameState.isSpinning ? 'Rolling...' : 'Roll'}
                            </button>
                        </div>
                    </div>

                    <div className="arena-card h-full relative">
                        {gameState.gameType === 2 && gameState.outcome === 'win' && <div className="absolute inset-0 bg-[#00C16E]/20 blur-3xl rounded-full z-0 pointer-events-none transition-opacity duration-1000" />}
                        {gameState.gameType === 2 && gameState.outcome === 'mine' && <div className="absolute inset-0 bg-[#00F2FF]/20 blur-3xl rounded-full z-0 pointer-events-none transition-opacity duration-1000" />}

                        <div className={`glass-panel rounded-3xl p-8 flex flex-col h-full justify-between transition-all duration-700 border relative overflow-hidden z-10 ${gameState.gameType === 2 && gameState.outcome === 'win' ? 'border-[#00C16E] shadow-[0_0_30px_rgba(0,193,110,0.3)]' :
                            gameState.gameType === 2 && gameState.outcome === 'mine' ? 'border-[#00F2FF] shadow-[0_0_30px_rgba(0,242,255,0.3)]' :
                                'border-white/10'
                            }`}>
                            <div className="flex justify-between items-center relative z-10">
                                <h2 className="text-2xl font-light text-white tracking-widest pointer-events-none">Coin Flip</h2>
                                <div className="h-2 w-2 rounded-full bg-hedera-green shadow-[0_0_10px_rgba(0,193,110,0.8)]" />
                            </div>

                            <div className={`flex-1 w-full relative my-6 bg-black/40 rounded-2xl overflow-hidden pointer-events-auto border border-white/5 shadow-inner transition-all z-30 ${gameState.gameType === 2 && gameState.isSpinning ? 'blur-[1px] opacity-90' : 'blur-0 opacity-100'
                                }`}>
                                <Canvas camera={{ position: [0, 0, 5] }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
                                    <ambientLight intensity={0.8} />
                                    <pointLight position={[10, 10, 10]} intensity={1.5} />
                                    <CoinMock isSpinning={gameState.gameType === 2 && gameState.isSpinning} result={gameState.coinResult} />
                                </Canvas>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10 mb-4">
                                {['Heads', 'Tails'].map((choice, idx) => {
                                    const predValue = idx + 1;
                                    const isSelected = gameState.selectedCoin === predValue;
                                    return (
                                        <button key={choice} disabled={!isAssociated || gameState.isSpinning}
                                            onClick={() => setGameState(prev => ({ ...prev, selectedCoin: predValue }))}
                                            className={`glass-panel py-3 min-h-[44px] rounded-xl text-sm tracking-widest transition-all ${!isAssociated || gameState.isSpinning ? 'opacity-50 cursor-not-allowed' :
                                                isSelected ? 'bg-[var(--color-electric-cyan)] text-black font-semibold shadow-[0_0_15px_rgba(0,242,255,0.4)] scale-105' :
                                                    'hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05]'
                                                }`}>{choice}</button>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4 relative z-10">
                                <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex flex-col">
                                        <span className="text-white/40 text-[10px] tracking-widest uppercase">Mining Reward</span>
                                        <span className="text-hedera-green font-bold text-lg">
                                            {wager ? (wager * 500).toLocaleString() : '0'} $HASH
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-white/20 text-[10px] block uppercase">Win Rate</span>
                                        <span className="text-white/60 font-medium">50% Chance</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handlePlayGame(2)}
                                    disabled={gameState.isSpinning || !wager}
                                    className={`w-full py-4 rounded-2xl font-bold tracking-widest transition-all duration-300 relative overflow-hidden group ${gameState.isSpinning || !wager ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                        }`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    {gameState.isSpinning ? 'MINING...' : 'FLIP COIN'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-hedera-green/60 text-[10px] tracking-[0.2em] uppercase font-bold">Payouts</span>
                    <h4 className="text-white font-medium">2x Payouts (4x on Equal Dice)</h4>
                    <p className="text-white/40 text-xs">Standard win gives 2x. Hit a 7 in Dice for a massive 4x payoff!</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-red-400/60 text-[10px] tracking-[0.2em] uppercase font-bold">Mining</span>
                    <h4 className="text-white font-medium">200 $HASH per Loss</h4>
                    <p className="text-white/40 text-xs">Lose your HBAR? You still mine 200 $HASH per 1 HBAR lost.</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-2 relative group overflow-hidden">
                    <span className="text-blue-400/60 text-[10px] tracking-[0.2em] uppercase font-bold">Bankroll</span>
                    <h4 className="text-white font-medium">Community Owned</h4>
                    <p className="text-white/40 text-xs">The engine is fully funded by the treasury for player rewards.</p>

                    {address?.toLowerCase() === "0x34784bd5c6ec6ef60223700b05b38ed35639f75a" && (
                        <button
                            onClick={async () => {
                                setTxState({ status: 'pending', message: 'Admin Funding: Sending 20M tokens...' });
                                try {
                                    // This would trigger the actual transfer from the UI if implemented in contractService
                                    // But for now it's a UI placeholder or we can use the same associate/transfer logic
                                    notify("info", "Admin Funding Triggered. Please use your wallet to complete the 20M transfer.");
                                } catch (e) {
                                    setTxState({ status: 'error', message: 'Funding failed' });
                                }
                            }}
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-hedera-green/20 text-[8px] text-hedera-green px-2 py-1 rounded border border-hedera-green/30 transition-opacity"
                        >
                            FUND 20M
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
