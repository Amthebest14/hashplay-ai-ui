import { useState, useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { appKitInstance } from '../context/WalletConnectContext';
import { BrowserProvider, Contract, formatUnits, parseUnits, parseEther } from 'ethers';
import PlayTokenArtifact from '../contracts/PlayToken.json';

const PLAY_TOKEN_ADDRESS = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";

export default function SectionToken() {
  const { isConnected, address } = useAppKitAccount();
  const [supply, setSupply] = useState<string>("0");
  const [balance, setBalance] = useState<string>("0");
  const [price, setPrice] = useState<string>("0.0000");
  const [marketCap, setMarketCap] = useState<string>("0");
  const holders = "426+";

  // Swap State
  const [swapMode, setSwapMode] = useState<'buy' | 'sell'>('buy');
  const [swapAmount, setSwapAmount] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState(false);

  useEffect(() => {
    fetchTokenData();
    const interval = setInterval(fetchTokenData, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  const fetchTokenData = async () => {
    try {
      const provider = appKitInstance.getWalletProvider();
      let ethersProvider;
      if (provider) {
        ethersProvider = new BrowserProvider(provider as any);
      } else {
        ethersProvider = new BrowserProvider(window.ethereum || (window as any).hashconnect || null);
      }

      if (!ethersProvider) return;

      const playToken = new Contract(PLAY_TOKEN_ADDRESS, PlayTokenArtifact.abi, ethersProvider);
      
      const totalSupply = await playToken.totalSupply();
      const currentSupply = Number(formatUnits(totalSupply, 8));
      setSupply(currentSupply.toLocaleString(undefined, { maximumFractionDigits: 0 }));

      if (isConnected && address && provider) {
        const userBal = await playToken.balanceOf(address);
        setBalance(Number(formatUnits(userBal, 8)).toLocaleString(undefined, { maximumFractionDigits: 2 }));
      } else {
        setBalance("0");
      }

      const priceWei = await playToken.currentPrice();
      const priceHbar = Number(formatUnits(priceWei, 18));
      setPrice(priceHbar.toFixed(4));

      const mcap = currentSupply * priceHbar;
      setMarketCap(mcap.toLocaleString(undefined, { maximumFractionDigits: 0 }));
    } catch (e) {
      console.error("Error fetching token data:", e);
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !address) return alert("Please connect your wallet first.");
    if (!swapAmount || isNaN(Number(swapAmount)) || Number(swapAmount) <= 0) return alert("Enter a valid amount.");

    setIsSwapping(true);
    try {
      const provider = appKitInstance.getWalletProvider();
      const ethersProvider = new BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      const playToken = new Contract(PLAY_TOKEN_ADDRESS, PlayTokenArtifact.abi, signer);

      if (swapMode === 'buy') {
        const tx = await playToken.buy({ value: parseEther(swapAmount) });
        await tx.wait();
        alert("Successfully bought $PLAY!");
      } else {
        const tx = await playToken.sell(parseUnits(swapAmount, 8));
        await tx.wait();
        alert("Successfully sold $PLAY!");
      }
      setSwapAmount('');
      fetchTokenData();
    } catch (e: any) {
      console.error(e);
      alert("Swap failed. Check console for details.");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleMax = () => {
    if (swapMode === 'sell') {
      setSwapAmount(balance.replace(/,/g, ''));
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-16 z-10 pt-24 pb-40 px-6 animate-fade-in font-sans">
      
      {/* Header Section */}
      <div className="text-center space-y-4 relative w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[200%] bg-hedera-green/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4 shadow-[0_0_15px_rgba(0,193,110,0.1)]">
            <span className="w-2 h-2 rounded-full bg-hedera-green animate-pulse" />
            <span className="text-xs font-semibold text-white/80 tracking-widest uppercase">Live Bonding Curve</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight relative z-10">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-hedera-green to-emerald-400">$PLAY</span> Economy
        </h1>
        <p className="text-base md:text-xl text-white/50 max-w-2xl mx-auto font-medium relative z-10">
          A truly decentralized, deflationary token powering the Hashplay ecosystem. Built on Hedera for maximum speed and zero friction.
        </p>
      </div>

      {/* Stats Grid - Premium Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
        {[
          { label: "Market Cap", value: marketCap, unit: "HBAR", color: "from-emerald-500/20 to-transparent", icon: "💰" },
          { label: "Live Price", value: price, unit: "HBAR/PLAY", color: "from-blue-500/20 to-transparent", icon: "📈" },
          { label: "Total Supply", value: supply, unit: "$PLAY", color: "from-purple-500/20 to-transparent", icon: "💎" },
          { label: "Holders", value: holders, unit: "PLAYERS", color: "from-pink-500/20 to-transparent", icon: "👥" }
        ].map((stat, i) => (
          <div key={i} className="relative p-[1px] rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-white/20 transition-all duration-500 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className={`absolute -inset-24 bg-gradient-to-tr ${stat.color} blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
            <div className="bg-black/40 backdrop-blur-xl p-6 h-full rounded-3xl flex flex-col items-start justify-between gap-4 relative z-10">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-white/40 tracking-wider uppercase">{stat.label}</span>
                <span className="text-lg opacity-60 grayscale group-hover:grayscale-0 transition-all duration-500">{stat.icon}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                <span className="text-xs font-semibold text-white/30 mt-1">{stat.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Interaction Area: Balance & Swap */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Balance Card */}
        <div className="relative p-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent h-full">
          <div className="bg-black/40 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] h-full flex flex-col justify-center relative overflow-hidden border border-white/5">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-hedera-green/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-hedera-green to-emerald-600 p-[1px] shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-black/50 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold tracking-widest text-white/40 uppercase mb-2">Available Balance</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-white tracking-tighter">{balance}</span>
                  <span className="text-xl font-bold text-hedera-green">$PLAY</span>
                </div>
                <p className="text-sm font-medium text-white/30 mt-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  ≈ {(parseFloat(balance.replace(/,/g, '')) * parseFloat(price)).toFixed(2)} HBAR estimated value
                </p>
              </div>

              <div className="mt-8 p-5 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-sm text-white/60 leading-relaxed font-medium">
                  Holding $PLAY grants you exclusive access to arena features, reduced platform fees, and future ecosystem airdrops.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Swap Interface */}
        <div className="relative p-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent">
          <div className="bg-[#0A0A0C] backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] border border-white/5 relative z-10 shadow-2xl">
            
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white">Swap</h3>
              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => { setSwapMode('buy'); setSwapAmount(''); }}
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${swapMode === 'buy' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                >
                  Buy
                </button>
                <button 
                  onClick={() => { setSwapMode('sell'); setSwapAmount(''); }}
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${swapMode === 'sell' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                >
                  Sell
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Input Box */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group hover:border-white/10 transition-colors focus-within:border-hedera-green/50">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">You pay</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-medium text-white/40">Balance: {swapMode === 'sell' ? balance : '—'}</span>
                    {swapMode === 'sell' && (
                      <button onClick={handleMax} className="text-[10px] font-bold text-hedera-green bg-hedera-green/10 px-2 py-0.5 rounded uppercase hover:bg-hedera-green/20 transition-colors">Max</button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <input 
                    type="number"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent text-4xl font-bold text-white placeholder:text-white/10 outline-none p-0"
                    disabled={isSwapping}
                  />
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl ml-4 shrink-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${swapMode === 'buy' ? 'bg-black text-white border border-white/20' : 'bg-hedera-green text-black'}`}>
                      {swapMode === 'buy' ? 'H' : 'P'}
                    </div>
                    <span className="font-bold text-white text-sm">{swapMode === 'buy' ? 'HBAR' : 'PLAY'}</span>
                  </div>
                </div>
              </div>

              {/* Swap Icon */}
              <div className="flex justify-center -my-6 relative z-10 pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-[#0A0A0C] border border-white/10 flex items-center justify-center text-white/40 shadow-xl">
                  <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
              </div>

              {/* Output Box */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">You receive</span>
                </div>
                <div className="flex items-center justify-between">
                  <input 
                    type="text"
                    value={swapAmount ? (swapMode === 'buy' ? (parseFloat(swapAmount) / parseFloat(price)).toFixed(4) : (parseFloat(swapAmount) * parseFloat(price)).toFixed(4)) : ''}
                    placeholder="0.0"
                    readOnly
                    className="w-full bg-transparent text-4xl font-bold text-white/50 outline-none p-0"
                  />
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl ml-4 shrink-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${swapMode === 'sell' ? 'bg-black text-white border border-white/20' : 'bg-hedera-green text-black'}`}>
                      {swapMode === 'sell' ? 'H' : 'P'}
                    </div>
                    <span className="font-bold text-white text-sm">{swapMode === 'sell' ? 'HBAR' : 'PLAY'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Exchange Rate details */}
            <div className="mt-4 px-2 flex justify-between items-center text-xs font-medium text-white/40">
              <span>Exchange Rate</span>
              <span>1 PLAY ≈ {price} HBAR</span>
            </div>

            {/* Swap Button */}
            <button 
              onClick={handleSwap}
              disabled={isSwapping || !swapAmount || parseFloat(swapAmount) <= 0}
              className="w-full mt-6 py-4 rounded-xl font-bold text-black bg-gradient-to-r from-hedera-green to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 shadow-[0_0_20px_rgba(0,193,110,0.3)] hover:shadow-[0_0_30px_rgba(0,193,110,0.5)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isSwapping ? 'Processing Transaction...' : swapAmount ? `Confirm ${swapMode}` : 'Enter Amount'}
            </button>
          </div>
        </div>
      </div>

      {/* Tokenomics Deep Dive Section */}
      <div className="w-full mt-16 pt-16 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Transparent Tokenomics</h2>
          <p className="text-white/40 max-w-2xl mx-auto font-medium">
            Designed for sustainability and continuous value accrual. No hidden allocations, no presale unlocks, just pure community-driven mechanics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent group">
            <div className="bg-black/40 backdrop-blur-md p-8 rounded-[2rem] h-full flex flex-col gap-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-xl">⚖️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Fair Launch Model</h3>
                  <p className="text-sm text-white/40 font-medium">100% Circulating from Day 1</p>
                </div>
              </div>
              
              <div className="space-y-5">
                {[
                  { label: "Community Airdrop", value: "100%", detail: "20,000,000 PLAY", color: "bg-hedera-green" },
                  { label: "Team Allocation", value: "0%", detail: "No vesting overhang", color: "bg-white/10" },
                  { label: "Pre-Sale / VCs", value: "0%", detail: "No seed rounds", color: "bg-white/10" }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/70 font-medium">{item.label}</span>
                      <span className="text-white font-bold">{item.value}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: item.value === '0%' ? '0%' : item.value }} />
                    </div>
                    <span className="text-xs text-white/30">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent group">
            <div className="bg-black/40 backdrop-blur-md p-8 rounded-[2rem] h-full flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-2 relative z-10">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <span className="text-xl">🔥</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Hyper-Deflationary Sink</h3>
                  <p className="text-sm text-orange-400/80 font-medium tracking-wide">Automated Protocol Buybacks</p>
                </div>
              </div>

              <div className="relative z-10 flex-1 flex flex-col justify-center">
                <p className="text-white/60 leading-relaxed font-medium mb-8">
                  The Arena V7 Smart Contract incorporates an autonomous economic engine. When players lose wagers against the house, the protocol fee is instantly mobilized:
                </p>

                <div className="flex items-stretch gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                  <div className="w-1.5 rounded-full bg-orange-500 shrink-0" />
                  <div>
                    <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                      2.5% Auto-Burn <span className="px-2 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400 uppercase tracking-widest">Live</span>
                    </h4>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Automatically routes HBAR to the DEX to market-buy $PLAY, permanently locking it in the Arena contract as a verifiable protocol-owned burn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
