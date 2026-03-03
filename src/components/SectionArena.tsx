import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import Tilt from 'react-parallax-tilt';

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

    return (
        <div className="w-full max-w-5xl flex flex-col gap-8">
            {/* Wager Global Interface */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <span className="text-white/50 text-sm tracking-widest">Select Wager (HBAR)</span>
                    <div className="flex flex-wrap gap-2">
                        {wagerOptions.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => setWager(amount)}
                                className={`px-4 py-2 rounded-xl text-sm transition-all duration-300 ${wager === amount
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[500px]">
                {/* Dice Game Card */}
                <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} glareEnable={true} glareMaxOpacity={0.1} glareColor="#00C16E" glarePosition="all" scale={1.02} transitionSpeed={2000} className="arena-card h-full">
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
                            {['Lower', 'Equal', 'Higher'].map((choice) => (
                                <button
                                    key={choice}
                                    className="glass-panel py-3 rounded-xl text-sm tracking-widest hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05] transition-all"
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>
                    </div>
                </Tilt>

                {/* Coin Flip Card */}
                <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} glareEnable={true} glareMaxOpacity={0.1} glareColor="#00C16E" glarePosition="all" scale={1.02} transitionSpeed={2000} className="arena-card h-full">
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
                            {['Heads', 'Tails'].map((choice) => (
                                <button
                                    key={choice}
                                    className="glass-panel py-3 rounded-xl text-sm tracking-widest hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.05] transition-all"
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>
                    </div>
                </Tilt>
            </div>
        </div>
    );
}
