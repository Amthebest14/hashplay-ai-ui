import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Float, Environment } from '@react-three/drei';
import { playMiningEngineGame } from '../services/contractService';
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
            meshRef.current.rotation.z += 0.2;
        }
    });

    useEffect(() => {
        if (!isSpinning && meshRef.current && result) {
            const [x, y, z] = rotations[result] || [0, 0, 0];
            gsap.to(meshRef.current.rotation, { x: x + Math.PI * 4, y: y + Math.PI * 4, z: z + Math.PI * 4, duration: 1.5, ease: 'power3.out' });
        }
    }, [isSpinning, result]);

    return (
        <group position={position}>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <mesh ref={meshRef}>
                    <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.15} smoothness={4}>
                        <meshStandardMaterial color="#0a0a0a" roughness={0.15} metalness={0.9} envMapIntensity={2} />
                    </RoundedBox>
                    <Text position={[0, 0, 0.77]} fontSize={0.6} color="#00C16E" outlineWidth={0.015} outlineColor="#005A33" fontWeight="bold">1</Text>
                    <Text position={[0, 0, -0.77]} rotation={[0, Math.PI, 0]} fontSize={0.6} color="#00C16E" outlineWidth={0.015} outlineColor="#005A33" fontWeight="bold">6</Text>
                    <Text position={[0.77, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.6} color="#00C16E" outlineWidth={0.015} outlineColor="#005A33" fontWeight="bold">2</Text>
                    <Text position={[-0.77, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.6} color="#00C16E" outlineWidth={0.015} outlineColor="#005A33" fontWeight="bold">5</Text>
                    <Text position={[0, 0.77, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.6} color="#00C16E" outlineWidth={0.015} outlineColor="#005A33" fontWeight="bold">3</Text>
                    <Text position={[0, -0.77, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={0.6} color="#00C16E" outlineWidth={0.015} outlineColor="#005A33" fontWeight="bold">4</Text>
                </mesh>
            </Float>
        </group>
    );
}

function CoinMock({ isSpinning, result }: { isSpinning: boolean, result: number }) {
    const meshRef = useRef<any>(null);
    useFrame(() => {
        if (isSpinning && meshRef.current) {
            meshRef.current.rotation.x += 0.8;
            meshRef.current.rotation.y += 0.2;
            meshRef.current.rotation.z += 0.1;
        }
    });

    useEffect(() => {
        if (!isSpinning && meshRef.current && result) {
            const targetX = result === 1 ? Math.PI / 2 : -Math.PI / 2;
            gsap.to(meshRef.current.rotation, { x: targetX + Math.PI * 10, y: 0, z: 0, duration: 2, ease: 'power3.out' });
        }
    }, [isSpinning, result]);

    return (
        <Float speed={3} rotationIntensity={1} floatIntensity={1.5}>
            <group ref={meshRef}>
                <mesh>
                    <cylinderGeometry args={[2, 2, 0.15, 64]} />
                    <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.9} envMapIntensity={1.5} />
                </mesh>
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2, 0.15, 32, 100]} />
                    <meshStandardMaterial color="#00C16E" roughness={0.1} metalness={0.8} emissive="#00C16E" emissiveIntensity={0.2} />
                </mesh>
                <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.7, 0.02, 16, 100]} />
                    <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} />
                </mesh>
                <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.7, 0.02, 16, 100]} />
                    <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} />
                </mesh>
                <Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.7} color="#ffffff" outlineWidth={0.02} outlineColor="#00C16E" fontWeight="bold">HEADS</Text>
                <Text position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={0.7} color="#ffffff" outlineWidth={0.02} outlineColor="#00C16E" fontWeight="bold">TAILS</Text>
            </group>
            <pointLight position={[0, 3, 2]} intensity={20} color="#00C16E" distance={10} />
            <pointLight position={[0, -3, -2]} intensity={20} color="#00F2FF" distance={10} />
        </Float>
    );
}

export default function SectionArena() {
    const [wager, setWager] = useState<number>(0);
    const wagerOptions = [5, 10, 25, 50, 100, 500];

    const { isConnected } = useAppKitAccount();
    const { notify } = useNotification();
    const [txState, setTxState] = useState<{ status: 'idle' | 'pending' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

    const [gameState, setGameState] = useState({
        isSpinning: false,
        gameType: 0,
        diceResult: [1, 6],
        coinResult: 1,
        outcome: null as 'win' | 'mine' | null,
        selectedDice: null as number | null,
        selectedCoin: null as number | null
    });

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
                    const pointsAmount = result.pointsEarned ? result.pointsEarned.toString() : '0';
                    outcomeMsg = `WINNER! Payout: ${hbarAmount} HBAR`;
                    notify('win', `Big win! ${hbarAmount} HBAR payout and ${pointsAmount} Points have been added to your scorecard.`, `${hbarAmount} HBAR`);
                } else {
                    const pointsAmount = result.pointsEarned ? result.pointsEarned.toString() : '0';
                    outcomeMsg = `MINED! Consolation: ${pointsAmount} Points`;
                    notify('mine', `Mining complete. You received ${pointsAmount} consolation Points on your scorecard.`, `${pointsAmount} Points`);
                }

                setTxState({ status: 'success', message: outcomeMsg });
                window.dispatchEvent(new Event('refreshPoints'));
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
                                    <Environment preset="city" />
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
                                        <button key={choice} disabled={gameState.isSpinning}
                                            onClick={() => setGameState(prev => ({ ...prev, selectedDice: predValue }))}
                                            className={`glass-panel py-3 min-h-[44px] rounded-xl text-sm tracking-widest transition-all ${gameState.isSpinning ? 'opacity-50 cursor-not-allowed' :
                                                isSelected ? 'bg-hedera-green text-black font-semibold shadow-[0_0_15px_rgba(0,193,110,0.4)] scale-105' :
                                                    'hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05]'
                                                }`} >{choice}</button>
                                    );
                                })}
                            </div>

                            <button
                                disabled={gameState.isSpinning || !gameState.selectedDice || wager < 1}
                                onClick={() => handlePlayGame(1)}
                                className={`w-full py-4 rounded-xl font-bold tracking-widest transition-all uppercase ${gameState.isSpinning || !gameState.selectedDice || wager < 1
                                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                    : 'bg-hedera-green text-black shadow-[0_0_20px_rgba(0,193,110,0.5)] hover:scale-[1.02]'
                                    }`}
                            >
                                {wager < 1 ? 'Min 1 HBAR' : gameState.isSpinning ? 'Rolling...' : 'Roll'}
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
                                    <Environment preset="city" />
                                    <pointLight position={[10, 10, 10]} intensity={1.5} />
                                    <CoinMock isSpinning={gameState.gameType === 2 && gameState.isSpinning} result={gameState.coinResult} />
                                </Canvas>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10 mb-4">
                                {['Heads', 'Tails'].map((choice, idx) => {
                                    const predValue = idx + 1;
                                    const isSelected = gameState.selectedCoin === predValue;
                                    return (
                                        <button key={choice} disabled={gameState.isSpinning}
                                            onClick={() => setGameState(prev => ({ ...prev, selectedCoin: predValue }))}
                                            className={`glass-panel py-3 min-h-[44px] rounded-xl text-sm tracking-widest transition-all ${gameState.isSpinning ? 'opacity-50 cursor-not-allowed' :
                                                isSelected ? 'bg-[var(--color-electric-cyan)] text-black font-semibold shadow-[0_0_15px_rgba(0,242,255,0.4)] scale-105' :
                                                    'hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05]'
                                                }`}>{choice}</button>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4 relative z-10">
                                <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex flex-col">
                                        <span className="text-white/40 text-[10px] tracking-widest uppercase">XP Reward</span>
                                        <span className="text-emerald-400 font-bold text-lg">
                                            {wager ? (wager * 500).toLocaleString() : '0'} XP
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-white/20 text-[10px] block uppercase">Win Rate</span>
                                        <span className="text-white/60 font-medium">50% Chance</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handlePlayGame(2)}
                                    disabled={gameState.isSpinning || wager < 1}
                                    className={`w-full py-4 rounded-2xl font-bold tracking-widest transition-all duration-300 relative overflow-hidden group ${gameState.isSpinning || wager < 1 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                        }`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    {wager < 1 ? 'Min 1 HBAR' : gameState.isSpinning ? 'PLAYING...' : 'FLIP COIN'}
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
                    <span className="text-emerald-400/60 text-[10px] tracking-[0.2em] uppercase font-bold">XP</span>
                    <h4 className="text-white font-medium">Earn XP even on loss</h4>
                    <p className="text-white/40 text-xs">You earn 200 XP per 1 HBAR wagered even if you lose.</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-2 relative group overflow-hidden">
                    <span className="text-blue-400/60 text-[10px] tracking-[0.2em] uppercase font-bold">Bankroll</span>
                    <h4 className="text-white font-medium">Community Owned</h4>
                    <p className="text-white/40 text-xs">The engine is fully funded by the treasury for player rewards.</p>
                </div>
            </div>
        </div>
    );
}
