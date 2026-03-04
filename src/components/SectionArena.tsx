import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { playMiningEngineGame } from '../services/contractService';
import { useAppKitAccount } from '@reown/appkit/react';

function DiceMock({ position }: { position: [number, number, number] }) {
    return (
        <mesh position={position} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
            <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.2} smoothness={4}>
                <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.8} />
            </RoundedBox>
        </mesh>
    );
}

function CoinMock() {
    return (
        <mesh rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
            <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.8} />
            <Text position={[0, 0, 0.11]} fontSize={0.4} color="#000" anchorX="center" anchorY="middle">
                HEADS
            </Text>
        </mesh>
    );
}

export default function SectionArena() {
    const [wager, setWager] = useState<number>(0);
    const wagerOptions = [5, 10, 25, 50, 100, 500];

    const { isConnected } = useAppKitAccount();
    const [txState, setTxState] = useState<{ status: 'idle' | 'pending' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

    const handlePlayGame = async (gameType: number, prediction: number) => {
        if (!isConnected) {
            setTxState({ status: 'error', message: 'Please connect your wallet first.' });
            setTimeout(() => setTxState({ status: 'idle', message: '' }), 3000);
            return;
        }

        if (wager <= 0) {
            setTxState({ status: 'error', message: 'Please enter a valid wager amount.' });
            setTimeout(() => setTxState({ status: 'idle', message: '' }), 3000);
            return;
        }

        setTxState({ status: 'pending', message: 'Awaiting wallet confirmation...' });

        const result = await playMiningEngineGame(wager, gameType, prediction);

        if (result.success) {
            setTxState({ status: 'success', message: `Transaction Successful! Hash: ${result.hash?.substring(0, 10)}...` });
        } else {
            setTxState({ status: 'error', message: result.error || 'Transaction failed.' });
        }

        setTimeout(() => setTxState({ status: 'idle', message: '' }), 5000);
    };

    return (
        <div className="w-full min-h-[100dvh] flex flex-col items-center justify-center pt-24 pb-12 relative">
            {/* Transaction Feedback Toast */}
            {txState.status !== 'idle' && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl transition-all ${txState.status === 'pending' ? 'bg-black/80 border border-white/20 text-white' :
                    txState.status === 'success' ? 'bg-hedera-green/90 border border-hedera-green text-black font-semibold' :
                        'bg-red-500/90 border border-red-400 text-white font-semibold'
                    }`}>
                    <p className="text-sm tracking-widest">{txState.message}</p>
                </div>
            )}

            <div className="w-[95%] max-w-[800px] flex flex-col gap-8 py-4">
                {/* Wager Global Interface */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <span className="text-white/50 text-sm tracking-widest">Select Wager (HBAR)</span>
                        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                            {wagerOptions.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setWager(amount)}
                                    className={`px-4 py-2 min-h-[44px] rounded-xl text-sm transition-all duration-300 ${wager === amount
                                        ? 'bg-hedera-green text-black font-semibold shadow-[0_0_15px_rgba(0,193,110,0.4)]'
                                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
                                        }`}
                                >
                                    {amount}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-48">
                        <span className="text-white/50 text-sm tracking-widest">Custom Amount</span>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={wager || ''}
                            onChange={(e) => setWager(Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-hedera-green/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Game Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[500px]">
                    {/* Dice Game Card */}
                    <div className="arena-card h-full">
                        <div className="glass-panel rounded-3xl p-8 flex flex-col h-full justify-between transition-colors border border-white/10 relative overflow-hidden">
                            <div className="flex justify-between items-center relative z-10">
                                <h2 className="text-2xl font-light text-white tracking-widest pointer-events-none">Dice Game</h2>
                                <div className="h-2 w-2 rounded-full bg-hedera-green shadow-[0_0_10px_rgba(0,193,110,0.8)]" />
                            </div>

                            <div className="flex-1 w-full relative my-6 bg-black/20 rounded-2xl overflow-hidden pointer-events-none border border-white/5 shadow-inner">
                                <Canvas camera={{ position: [0, 0, 5] }}>
                                    <ambientLight intensity={0.5} />
                                    <pointLight position={[10, 10, 10]} intensity={1} />
                                    <DiceMock position={[-1, 0, 0]} />
                                    <DiceMock position={[1, 0, 0]} />
                                </Canvas>
                            </div>

                            <div className="grid grid-cols-3 gap-3 relative z-10">
                                {['Lower', 'Equal', 'Higher'].map((choice, idx) => (
                                    <button
                                        key={choice}
                                        onClick={() => handlePlayGame(1, idx + 1)}
                                        className="glass-panel py-3 min-h-[44px] rounded-xl text-sm tracking-widest hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05] transition-all"
                                    >
                                        {choice}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Coin Flip Card */}
                    <div className="arena-card h-full">
                        <div className="glass-panel rounded-3xl p-8 flex flex-col h-full justify-between transition-colors border border-white/10 relative overflow-hidden">
                            <div className="flex justify-between items-center relative z-10">
                                <h2 className="text-2xl font-light text-white tracking-widest pointer-events-none">Coin Flip</h2>
                                <div className="h-2 w-2 rounded-full bg-hedera-green shadow-[0_0_10px_rgba(0,193,110,0.8)]" />
                            </div>

                            <div className="flex-1 w-full relative my-6 bg-black/20 rounded-2xl overflow-hidden pointer-events-none border border-white/5 shadow-inner">
                                <Canvas camera={{ position: [0, 0, 5] }}>
                                    <ambientLight intensity={0.5} />
                                    <pointLight position={[10, 10, 10]} intensity={1} />
                                    <CoinMock />
                                </Canvas>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                {['Heads', 'Tails'].map((choice, idx) => (
                                    <button
                                        key={choice}
                                        onClick={() => handlePlayGame(2, idx + 1)}
                                        className="glass-panel py-3 min-h-[44px] rounded-xl text-sm tracking-widest hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05] transition-all"
                                    >
                                        {choice}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
