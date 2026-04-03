import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { formatUnits } from 'ethers';
import { useAppKitAccount } from '@reown/appkit/react';
import { playMiningEngineGame, associateTokenTransaction, getUserPoints } from '../services/contractService';
import { getAccountBalances } from '../services/mirrorNodeService';
import { DiceMock } from './three/DiceMock';
import { CoinMock } from './three/CoinMock';
import { notify } from '../utils/notifications';

interface GameState {
    isSpinning: boolean;
    gameType: number; // 1: Dice, 2: Coin
    diceResult: [number, number];
    coinResult: number;
    outcome: 'win' | 'mine' | null;
    selectedDice: number | null;
    selectedCoin: number | null;
}

export default function SectionArena() {
    const { address, isConnected } = useAppKitAccount();
    const [wager, setWager] = useState<number>(0);
    const [isAssociated, setIsAssociated] = useState(true);
    const [txState, setTxState] = useState<{ status: 'idle' | 'pending' | 'success' | 'error', message: string }>({
        status: 'idle',
        message: ''
    });

    const [gameState, setGameState] = useState<GameState>({
        isSpinning: false,
        gameType: 1,
        diceResult: [1, 1],
        coinResult: 1,
        outcome: null,
        selectedDice: null,
        selectedCoin: null
    });

    const wagerOptions = [1, 5, 10, 25, 50, 100];

    useEffect(() => {
        // No association required for the Points system.
        setIsAssociated(true);
    }, [isConnected, address]);

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
                    if (onChainRoll <= 48) coinRes = 1;
                    else if (onChainRoll >= 53) coinRes = 2;
                    else coinRes = 3;
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
                    const pointsCount = result.pointsEarned.toString();
                    outcomeMsg = `WINNER! Payout: ${hbarAmount} HBAR`;
                    notify('win', `Big win! ${hbarAmount} HBAR payout and ${pointsCount} Points have been added to your scorecard.`, `${hbarAmount} HBAR`);
                } else {
                    const pointsCount = result.pointsEarned.toString();
                    outcomeMsg = `MINED! Consolation: ${pointsCount} Points`;
                    notify('mine', `Mining complete. You received ${pointsCount} consolation Points on your scorecard.`, `${pointsCount} Points`);
                }

                setTxState({ status: 'success', message: outcomeMsg });
                window.dispatchEvent(new Event('refreshBalances'));
                window.dispatchEvent(new Event('refreshPoints'));
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
                                                }`}>
                                            {choice}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => handlePlayGame(1)}
                                disabled={gameState.isSpinning || !wager || !gameState.selectedDice}
                                className={`w-full py-4 rounded-2xl font-bold tracking-widest transition-all duration-300 relative overflow-hidden group ${gameState.isSpinning || !wager || !gameState.selectedDice ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-hedera-green text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,193,110,0.3)]'
                                    }`}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {gameState.isSpinning ? 'ROLLING...' : 'ROLL DICE'}
                            </button>
                        </div>
                    </div>

                    <div className="arena-card h-full relative">
                        {gameState.gameType === 2 && gameState.outcome === 'win' && <div className="absolute inset-0 bg-[#00C16E]/20 blur-3xl rounded-full z-0 pointer-events-none transition-opacity duration-1000" />}
                        {gameState.gameType === 2 && gameState.outcome === 'mine' && <div className="absolute inset-0 bg-[#00F2FF]/20 blur-3xl rounded-full z-0 pointer-events-none transition-opacity duration-1000" />}

                        <div className={`glass-panel rounded-3xl p-8 flex flex-col h-full justify-between transition-all duration-700 border relative z-10 overflow-hidden ${gameState.gameType === 2 && gameState.outcome === 'win' ? 'border-[#00C16E] shadow-[0_0_30px_rgba(0,193,110,0.3)]' :
                            gameState.gameType === 2 && gameState.outcome === 'mine' ? 'border-[#00F2FF] shadow-[0_0_30px_rgba(0,242,255,0.3)]' :
                                'border-white/10'
                            }`}>
                            <div className="flex justify-between items-center relative z-20">
                                <h2 className="text-2xl font-light text-white tracking-widest pointer-events-none">Coin Flip</h2>
                                <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                            </div>

                            <div className={`flex-1 w-full relative my-6 bg-black/40 rounded-2xl overflow-hidden pointer-events-auto border border-white/5 shadow-inner transition-all z-30 ${gameState.gameType === 2 && gameState.isSpinning ? 'scale-110' : 'scale-100'
                                }`}>
                                <Canvas camera={{ position: [0, 0, 5] }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
                                    <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                                    <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.5} />
                                    <ambientLight intensity={0.5} />
                                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                                    <Environment preset="night" />
                                    <CoinMock isSpinning={gameState.gameType === 2 && gameState.isSpinning} result={gameState.coinResult} />
                                </Canvas>
                            </div>

                            <div className="grid grid-cols-2 gap-4 relative z-10 mb-4">
                                {['Heads', 'Tails'].map((choice, idx) => {
                                    const predValue = idx + 1;
                                    const isSelected = gameState.selectedCoin === predValue;
                                    return (
                                        <button key={choice} disabled={gameState.isSpinning}
                                            onClick={() => setGameState(prev => ({ ...prev, selectedCoin: predValue }))}
                                            className={`glass-panel py-3 min-h-[44px] rounded-xl text-sm tracking-widest transition-all ${gameState.isSpinning ? 'opacity-50 cursor-not-allowed' :
                                                isSelected ? 'bg-white text-black font-semibold shadow-[0_0_15px_rgba(255,255,255,0.2)]' :
                                                    'hover:bg-white/10'
                                                }`}>
                                            {choice}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => handlePlayGame(2)}
                                disabled={gameState.isSpinning || !wager || !gameState.selectedCoin}
                                className={`w-full py-4 rounded-2xl font-bold tracking-widest transition-all duration-300 relative overflow-hidden group ${gameState.isSpinning || !wager || !gameState.selectedCoin ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                    }`}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {gameState.isSpinning ? 'FLIPPING...' : 'FLIP COIN'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-[95%] max-w-[800px]">
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-hedera-green/60 text-[10px] tracking-[0.2em] uppercase font-bold">Payouts</span>
                    <h4 className="text-white font-medium">2x Payouts (4x on Equal Dice)</h4>
                    <p className="text-white/40 text-xs">Standard win gives 2x. Hit a 7 in Dice for a massive 4x payoff!</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-red-400/60 text-[10px] tracking-[0.2em] uppercase font-bold">Mining</span>
                    <h4 className="text-white font-medium">200 Points per Loss</h4>
                    <p className="text-white/40 text-xs">Lose your HBAR? You still mine 200 Points per 1 HBAR lost.</p>
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
