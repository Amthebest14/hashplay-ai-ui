import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { useAppKitAccount } from '@reown/appkit/react';
import { appKitInstance } from '../context/WalletConnectContext';
import PlayTokenArtifact from '../contracts/PlayToken.json';

const PLAY_TOKEN_ADDRESS = import.meta.env.VITE_HASHPLAY_TOKEN_ID || "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";

export default function SectionToken() {
  const { isConnected, address } = useAppKitAccount();
  const [supply, setSupply] = useState<string>("0");
  const [balance, setBalance] = useState<string>("0");
  const [price, setPrice] = useState<string>("0.0100");

  useEffect(() => {
    fetchTokenData();
    // Refresh every 10 seconds
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
        // Fallback to Hashio RPC if wallet not connected
        ethersProvider = new BrowserProvider(window.ethereum || (window as any).hashconnect || null);
      }

      if (!ethersProvider) return; // Cannot fetch without a provider

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

      // Bonding curve price: Base 0.01 HBAR + (supply * 0.00000001)
      const basePrice = 0.01;
      const calculatedPrice = basePrice + (currentSupply * 0.00000001);
      setPrice(calculatedPrice.toFixed(4));
    } catch (e) {
      console.error("Error fetching token data:", e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-10 z-10 pt-20 pb-40 px-4 animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-hedera-green to-emerald-400 drop-shadow-[0_0_20px_rgba(0,193,110,0.4)]">
          $PLAY
        </h1>
        <p className="text-xl text-white/60 font-medium tracking-widest uppercase">
          The Official Currency of the Arena
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
        
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center gap-2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-hedera-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-sm text-white/50 tracking-widest uppercase font-bold">Your Balance</p>
          <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {balance}
          </div>
          <p className="text-hedera-green font-bold text-sm tracking-widest">$PLAY</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center gap-2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-sm text-white/50 tracking-widest uppercase font-bold">Live Price</p>
          <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {price}
          </div>
          <p className="text-blue-400 font-bold text-sm tracking-widest">HBAR</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center gap-2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-sm text-white/50 tracking-widest uppercase font-bold">Total Supply</p>
          <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {supply}
          </div>
          <p className="text-purple-400 font-bold text-sm tracking-widest">$PLAY</p>
        </div>

      </div>

      {/* Swap Action Area */}
      <div className="w-full glass-panel mt-8 p-10 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-hedera-green/20 blur-[100px] rounded-full mix-blend-screen" />
        
        <div className="flex-1 space-y-4 relative z-10">
          <h2 className="text-3xl font-black text-white drop-shadow-md">Trade on SaucerSwap</h2>
          <p className="text-white/60 leading-relaxed max-w-lg">
            Ready to secure your profits or stock up for the next wager? $PLAY is officially seeded with deep liquidity on Hedera's leading decentralized exchange.
          </p>
        </div>

        <a 
          href={`https://www.saucerswap.finance/swap/HBAR/${PLAY_TOKEN_ADDRESS}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative z-10 bg-hedera-green hover:bg-emerald-400 text-black font-black text-lg py-5 px-10 rounded-xl shadow-[0_0_30px_rgba(0,193,110,0.3)] hover:shadow-[0_0_50px_rgba(0,193,110,0.5)] transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-1"
        >
          <span>Swap $PLAY</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </a>
      </div>

    </div>
  );
}
