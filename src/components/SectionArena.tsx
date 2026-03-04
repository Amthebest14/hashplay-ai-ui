import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { playMiningEngineGame, associateTokenTransaction } from '../services/contractService';
import { getAccountBalances } from '../services/mirrorNodeService';
import { useAppKitAccount } from '@reown/appkit/react';
import { formatEther } from 'ethers';
import gsap from 'gsap';

function getDeterministicResult(txHash: string, gameType: number, prediction: number, won: boolean) {
    const hashNum = parseInt(txHash.slice(2, 10), 16) || 12345;
    if (gameType === 2) {
        return won ? prediction : (prediction === 1 ? 2 : 1);
    }
    const isLower = prediction === 1;
    const isEqual = prediction === 2;
    const isHigher = prediction === 3;
    let targetSum = 7;
    if (won) {
        if (isLower) targetSum = (hashNum % 5) + 2;
        if (isEqual) targetSum = 7;
        if (isHigher) targetSum = (hashNum % 5) + 8;
    } else {
        if (isLower) targetSum = (hashNum % 6) + 7;
        if (isEqual) targetSum = (hashNum % 2 === 0) ? ((hashNum % 5) + 2) : ((hashNum % 5) + 8);
        if (isHigher) targetSum = (hashNum % 6) + 2;
    }
    let d1 = (hashNum % 6) + 1;
    let d2 = targetSum - d1;
    while (d2 < 1 || d2 > 6) {
        d1 = (d1 % 6) + 1;
        d2 = targetSum - d1;
    }
    return [d1, d2];
}

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
        <mesh ref={meshRef}>
            <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
            <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.8} />
            <Text position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.4} color="#000">HEADS</Text>
            <Text position={[0, -0.11, 0]} rotation={[Math.PI / 2, Math.PI, 0]} fontSize={0.4} color="#000">TAILS</Text>
        </mesh>
    );
}

export default function SectionArena() {
    const [wager, setWager] = useState<number>(0);
    const wagerOptions = [5, 10, 25, 50, 100, 500];

    const { address, isConnected } = useAppKitAccount();
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
                const results = getDeterministicResult(result.hash!, gameType, prediction, result.won!);

                let diceRes = [1, 6];
                let coinRes = 1;
                if (gameType === 1) diceRes = results as [number, number];
                if (gameType === 2) coinRes = results as number;

                setGameState({
                    isSpinning: false,
                    gameType,
                    diceResult: diceRes,
                    coinResult: coinRes,
                    outcome: result.won ? 'win' : 'mine',
                    selectedDice: gameState.selectedDice,
                    selectedCoin: gameState.selectedCoin
                });

                const msg = result.won
                    ? `WINNER! Payout: ${formatEther(result.payout || 0)} HBAR`
                    : `MINED! You received $HASHPLAY tokens.`;

                setTxState({ status: 'success', message: msg });

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
            setTxState({ status: 'error', message: isRejected ? 'Transaction Cancelled' : e.message || 'Transaction rejected.' });
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
                            <div className="flex justify-between items-center relative z-10">
                                <h2 className="text-2xl font-light text-white tracking-widest pointer-events-none">Dice Game</h2>
                                <div className="h-2 w-2 rounded-full bg-hedera-green shadow-[0_0_10px_rgba(0,193,110,0.8)]" />
                            </div>

                            <div className={`flex-1 w-full relative my-6 bg-black/40 rounded-2xl overflow-hidden pointer-events-none border border-white/5 shadow-inner transition-all ${gameState.gameType === 1 && gameState.isSpinning ? 'blur-[2px] opacity-80' : 'blur-0 opacity-100'
                                }`}>
                                <Canvas camera={{ position: [0, 0, 5] }}>
                                    <ambientLight intensity={0.5} />
                                    <pointLight position={[10, 10, 10]} intensity={1} />
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

                            <div className={`flex-1 w-full relative my-6 bg-black/40 rounded-2xl overflow-hidden pointer-events-none border border-white/5 shadow-inner transition-all ${gameState.gameType === 2 && gameState.isSpinning ? 'blur-[2px] opacity-80' : 'blur-0 opacity-100'
                                }`}>
                                <Canvas camera={{ position: [0, 0, 5] }}>
                                    <ambientLight intensity={0.5} />
                                    <pointLight position={[10, 10, 10]} intensity={1} />
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

                            <button
                                disabled={!isAssociated || gameState.isSpinning || !gameState.selectedCoin}
                                onClick={() => handlePlayGame(2)}
                                className={`w-full py-4 rounded-xl font-bold tracking-widest transition-all uppercase ${!isAssociated || gameState.isSpinning || !gameState.selectedCoin
                                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                    : 'bg-[var(--color-electric-cyan)] text-black shadow-[0_0_20px_rgba(0,242,255,0.5)] hover:scale-[1.02]'
                                    }`}
                            >
                                {gameState.isSpinning ? 'Flipping...' : 'Flip'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
