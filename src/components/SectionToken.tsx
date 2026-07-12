import { useState, useEffect, useCallback } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { appKitInstance } from '../context/WalletConnectContext';
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, parseUnits, parseEther } from 'ethers';
import PlayTokenArtifact from '../contracts/PlayToken.json';

const PLAY_TOKEN_ADDRESS = "0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81";
const HASHIO_RPC = "https://mainnet.hashio.io/api";
const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com/api/v1";

type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

interface TxState {
  status: TxStatus;
  message: string;
  txHash?: string;
  received?: string;
}

function getReadProvider() {
  return new JsonRpcProvider(HASHIO_RPC);
}

export default function SectionToken() {
  const { isConnected, address } = useAppKitAccount();

  // Chain data
  const [supply, setSupply] = useState<string>("—");
  const [balance, setBalance] = useState<string>("0");
  const [priceRaw, setPriceRaw] = useState<number>(0.0001);
  const [marketCap, setMarketCap] = useState<string>("—");
  const [holders, setHolders] = useState<string>("—");
  const [poolLiquidity, setPoolLiquidity] = useState<string>("—");

  // Swap UI
  const [swapMode, setSwapMode] = useState<'buy' | 'sell'>('buy');
  const [swapAmount, setSwapAmount] = useState<string>('');
  const [txState, setTxState] = useState<TxState>({ status: 'idle', message: '' });

  // Tokenomics toggle
  const [showTokenomics, setShowTokenomics] = useState(false);

  // ── Fetch all on-chain data ────────────────────────────────────────────────
  const fetchTokenData = useCallback(async () => {
    try {
      const readProvider = getReadProvider();
      const playToken = new Contract(PLAY_TOKEN_ADDRESS, PlayTokenArtifact.abi, readProvider);

      const [totalSupply, priceWei, contractBalanceWei] = await Promise.all([
        playToken.totalSupply(),
        playToken.currentPrice(),
        readProvider.getBalance(PLAY_TOKEN_ADDRESS),
      ]);

      const currentSupply = Number(formatUnits(totalSupply, 8));
      const priceHbar = Number(formatUnits(priceWei, 8));
      const liquidityHbar = Number(formatUnits(contractBalanceWei, 18));

      setSupply(currentSupply.toLocaleString(undefined, { maximumFractionDigits: 0 }));
      setPriceRaw(priceHbar);
      setMarketCap((currentSupply * priceHbar).toLocaleString(undefined, { maximumFractionDigits: 0 }));
      setPoolLiquidity(liquidityHbar.toFixed(2));

      // User balance — use wallet provider if connected, else read-only
      if (isConnected && address) {
        const userBal = await playToken.balanceOf(address);
        setBalance(Number(formatUnits(userBal, 8)).toLocaleString(undefined, { maximumFractionDigits: 2 }));
      } else {
        setBalance("0");
      }
    } catch (e) {
      console.error("fetchTokenData error:", e);
    }
  }, [isConnected, address]);

  // ── Fetch holder count from Mirror Node ───────────────────────────────────
  const fetchHolders = useCallback(async () => {
    try {
      // Use the Hedera token ID for holder count (faster than EVM scan)
      const tokenId = import.meta.env.VITE_HASHPLAY_TOKEN_ID || "0.0.8076828";
      const res = await fetch(`${MIRROR_BASE}/tokens/${tokenId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.total_supply !== undefined) {
        // total_supply gives token holders count from HTS if available
        // Fallback: use accounts endpoint
      }
      // Use balances endpoint to count holders
      const countRes = await fetch(`${MIRROR_BASE}/tokens/${tokenId}/balances?limit=100&order=desc`);
      if (!countRes.ok) return;
      const countData = await countRes.json();
      const count = countData.balances?.length ?? 0;
      const hasMore = !!countData.links?.next;
      setHolders(hasMore ? `${count}+` : `${count}`);
    } catch (e) {
      console.error("fetchHolders error:", e);
    }
  }, []);

  useEffect(() => {
    fetchTokenData();
    fetchHolders();
    const interval = setInterval(() => {
      fetchTokenData();
    }, 10000);
    const holdersInterval = setInterval(fetchHolders, 60000);
    return () => { clearInterval(interval); clearInterval(holdersInterval); };
  }, [fetchTokenData, fetchHolders]);

  // ── Estimated output ───────────────────────────────────────────────────────
  const estimatedOutput = (): string => {
    const amt = parseFloat(swapAmount);
    if (!amt || isNaN(amt) || priceRaw === 0) return '';
    if (swapMode === 'buy') {
      return (amt / priceRaw).toFixed(2);
    } else {
      return (amt * priceRaw * 0.95).toFixed(4);
    }
  };

  // ── Validate before swap ───────────────────────────────────────────────────
  const getValidationError = (): string | null => {
    const amt = parseFloat(swapAmount);
    if (!swapAmount || isNaN(amt) || amt <= 0) return null;

    if (swapMode === 'sell') {
      const balNum = parseFloat(balance.replace(/,/g, ''));
      if (amt > balNum) return 'Insufficient $PLAY balance';
      const expectedHbar = amt * priceRaw * 0.95;
      const liquidityNum = parseFloat(poolLiquidity);
      if (expectedHbar > liquidityNum) return `Low pool liquidity (${poolLiquidity} HBAR available)`;
    }
    return null;
  };

  // ── Handle Swap ────────────────────────────────────────────────────────────
  const handleSwap = async () => {
    if (!isConnected || !address) {
      setTxState({ status: 'error', message: 'Connect your wallet first.' });
      return;
    }
    const validationError = getValidationError();
    if (validationError) {
      setTxState({ status: 'error', message: validationError });
      return;
    }
    const amt = parseFloat(swapAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setTxState({ status: 'error', message: 'Enter a valid amount.' });
      return;
    }

    setTxState({ status: 'pending', message: 'Waiting for wallet confirmation...' });

    try {
      const provider = appKitInstance.getWalletProvider();
      if (!provider) throw new Error('No wallet provider found.');
      const ethersProvider = new BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      const playToken = new Contract(PLAY_TOKEN_ADDRESS, PlayTokenArtifact.abi, signer);

      let tx;
      if (swapMode === 'buy') {
        tx = await playToken.buy({ value: parseEther(swapAmount) });
      } else {
        tx = await playToken.sell(parseUnits(swapAmount, 8));
      }

      setTxState({ status: 'confirming', message: 'Transaction submitted, confirming on-chain...', txHash: tx.hash });

      const receipt = await tx.wait();
      const out = estimatedOutput();

      if (receipt?.status === 1) {
        setTxState({
          status: 'success',
          message: swapMode === 'buy'
            ? `Successfully bought ~${out} $PLAY`
            : `Successfully sold for ~${out} HBAR`,
          txHash: tx.hash,
          received: out,
        });
        setSwapAmount('');
        // Refresh data after swap
        setTimeout(fetchTokenData, 2000);
      } else {
        throw new Error('Transaction reverted on-chain.');
      }
    } catch (e: any) {
      console.error('Swap error:', e);
      const msg = e?.reason || e?.shortMessage || e?.message || 'Transaction failed. Try again.';
      setTxState({ status: 'error', message: msg.length > 100 ? 'Transaction failed. Check wallet and try again.' : msg });
    }
  };

  const handleMax = () => {
    if (swapMode === 'sell') {
      setSwapAmount(balance.replace(/,/g, ''));
    }
  };

  const resetTx = () => {
    setTxState({ status: 'idle', message: '' });
  };

  const validationError = getValidationError();
  const isProcessing = txState.status === 'pending' || txState.status === 'confirming';
  const priceDisplay = priceRaw > 0 ? priceRaw.toFixed(7) : '—';

  const stats = [
    { label: "Market Cap", value: marketCap, unit: "HBAR", color: "from-emerald-500/20 to-transparent", icon: "💰" },
    { label: "Live Price", value: priceDisplay, unit: "HBAR / PLAY", color: "from-blue-500/20 to-transparent", icon: "📈" },
    { label: "Total Supply", value: supply, unit: "$PLAY", color: "from-purple-500/20 to-transparent", icon: "💎" },
    { label: "Holders", value: holders, unit: "PLAYERS", color: "from-pink-500/20 to-transparent", icon: "👥" },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-16 z-10 pt-24 pb-40 px-6 animate-fade-in font-sans">

      {/* Header */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
        {stats.map((stat, i) => (
          <div key={i} className="relative p-[1px] rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-white/20 transition-all duration-500 group overflow-hidden">
            <div className={`absolute -inset-24 bg-gradient-to-tr ${stat.color} blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
            <div className="bg-black/40 backdrop-blur-xl p-6 h-full rounded-3xl flex flex-col items-start justify-between gap-4 relative z-10">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-white/40 tracking-wider uppercase">{stat.label}</span>
                <span className="text-lg opacity-60 grayscale group-hover:grayscale-0 transition-all duration-500">{stat.icon}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                <span className="text-xs font-semibold text-white/30 mt-1">{stat.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Area: Balance + Swap */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Balance Card */}
        <div className="relative p-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent h-full">
          <div className="bg-black/40 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] h-full flex flex-col justify-between relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-hedera-green/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-hedera-green to-emerald-600 p-[1px] shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-black/50 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold tracking-widest text-white/40 uppercase mb-2">Your Balance</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-white tracking-tighter">{balance}</span>
                  <span className="text-xl font-bold text-hedera-green">$PLAY</span>
                </div>
                <p className="text-sm font-medium text-white/30 mt-3">
                  ≈ {(parseFloat(balance.replace(/,/g, '')) * priceRaw).toFixed(4)} HBAR estimated value
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-sm text-white/60 leading-relaxed font-medium">
                  Holding $PLAY grants exclusive access to arena features, reduced platform fees, and future ecosystem rewards.
                </p>
              </div>
            </div>

            {/* Pool Liquidity */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40 font-medium flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${parseFloat(poolLiquidity) > 10 ? 'bg-hedera-green' : parseFloat(poolLiquidity) > 2 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                  Pool Liquidity
                </span>
                <span className="text-white font-bold">{poolLiquidity} HBAR</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${parseFloat(poolLiquidity) > 10 ? 'bg-hedera-green' : parseFloat(poolLiquidity) > 2 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min((parseFloat(poolLiquidity) / 100) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/30 mt-1">Available for sell transactions</p>
            </div>
          </div>
        </div>

        {/* Swap Card */}
        <div className="relative p-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent">
          <div className="bg-[#0A0A0C] backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] border border-white/5 relative z-10 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white">Swap</h3>
              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => { setSwapMode('buy'); setSwapAmount(''); resetTx(); }}
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${swapMode === 'buy' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
                >Buy</button>
                <button
                  onClick={() => { setSwapMode('sell'); setSwapAmount(''); resetTx(); }}
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${swapMode === 'sell' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
                >Sell</button>
              </div>
            </div>

            {/* Input */}
            <div className={`bg-black/40 rounded-2xl p-4 border transition-colors ${txState.status === 'error' ? 'border-red-500/40' : 'border-white/5 focus-within:border-hedera-green/50'}`}>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">You pay</span>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-medium text-white/40">
                    {swapMode === 'sell' ? `Balance: ${balance} PLAY` : '—'}
                  </span>
                  {swapMode === 'sell' && (
                    <button onClick={handleMax} className="text-[10px] font-bold text-hedera-green bg-hedera-green/10 px-2 py-0.5 rounded uppercase hover:bg-hedera-green/20 transition-colors">Max</button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => { setSwapAmount(e.target.value); if (txState.status === 'error') resetTx(); }}
                  placeholder="0.0"
                  min="0"
                  className="w-full bg-transparent text-4xl font-bold text-white placeholder:text-white/10 outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  disabled={isProcessing}
                />
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl ml-4 shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${swapMode === 'buy' ? 'bg-black text-white border border-white/20' : 'bg-hedera-green text-black'}`}>
                    {swapMode === 'buy' ? 'H' : 'P'}
                  </div>
                  <span className="font-bold text-white text-sm">{swapMode === 'buy' ? 'HBAR' : 'PLAY'}</span>
                </div>
              </div>
            </div>

            {/* Arrow divider */}
            <div className="flex justify-center -my-2 relative z-10 pointer-events-none">
              <div className="w-9 h-9 rounded-xl bg-[#0A0A0C] border border-white/10 flex items-center justify-center text-white/30 shadow-xl">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            {/* Output */}
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">You receive</span>
                {swapMode === 'sell' && swapAmount && (
                  <span className="text-xs text-white/30 font-medium">5% spread applied</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold text-white/50">
                  {estimatedOutput() || <span className="text-white/10">0.0</span>}
                </span>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl ml-4 shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${swapMode === 'sell' ? 'bg-black text-white border border-white/20' : 'bg-hedera-green text-black'}`}>
                    {swapMode === 'sell' ? 'H' : 'P'}
                  </div>
                  <span className="font-bold text-white text-sm">{swapMode === 'sell' ? 'HBAR' : 'PLAY'}</span>
                </div>
              </div>
            </div>

            {/* Rate + validation warning */}
            <div className="mt-3 px-1 space-y-1">
              <div className="flex justify-between text-xs font-medium text-white/30">
                <span>Rate</span>
                <span>1 PLAY ≈ {priceDisplay} HBAR</span>
              </div>
              {validationError && (
                <p className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                  {validationError}
                </p>
              )}
            </div>

            {/* TX Status Banner */}
            {txState.status !== 'idle' && (
              <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 ${
                txState.status === 'success' ? 'bg-hedera-green/10 border-hedera-green/30' :
                txState.status === 'error' ? 'bg-red-500/10 border-red-500/30' :
                'bg-white/5 border-white/10'
              }`}>
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  {txState.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  {txState.status === 'confirming' && <div className="w-4 h-4 rounded-full border-2 border-blue-400/50 border-t-blue-400 animate-spin" />}
                  {txState.status === 'success' && <svg className="w-4 h-4 text-hedera-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  {txState.status === 'error' && <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${
                    txState.status === 'success' ? 'text-hedera-green' :
                    txState.status === 'error' ? 'text-red-400' : 'text-white'
                  }`}>{txState.message}</p>
                  {txState.txHash && (
                    <a
                      href={`https://hashscan.io/mainnet/transaction/${txState.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/40 hover:text-white/70 transition-colors mt-1 flex items-center gap-1 font-mono truncate"
                    >
                      {txState.txHash.slice(0, 20)}...{txState.txHash.slice(-8)}
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
                {(txState.status === 'success' || txState.status === 'error') && (
                  <button onClick={resetTx} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            )}

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={isProcessing || !swapAmount || parseFloat(swapAmount) <= 0 || !!validationError}
              className="w-full mt-5 py-4 rounded-xl font-bold text-black bg-gradient-to-r from-hedera-green to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 shadow-[0_0_20px_rgba(0,193,110,0.3)] hover:shadow-[0_0_30px_rgba(0,193,110,0.5)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {isProcessing && <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />}
              {txState.status === 'pending' ? 'Waiting for wallet...' :
               txState.status === 'confirming' ? 'Confirming on-chain...' :
               !swapAmount || parseFloat(swapAmount) <= 0 ? 'Enter Amount' :
               validationError ? validationError :
               `Confirm ${swapMode === 'buy' ? 'Buy' : 'Sell'}`}
            </button>

            {!isConnected && (
              <p className="text-center text-xs text-white/30 mt-3">Connect your wallet to swap</p>
            )}
          </div>
        </div>
      </div>

      {/* Tokenomics Toggle Section */}
      <div className="w-full border-t border-white/5 pt-10">
        <button
          onClick={() => setShowTokenomics(v => !v)}
          className="w-full flex items-center justify-between group mb-8"
        >
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Transparent Tokenomics</h2>
            <p className="text-white/40 text-sm mt-1 font-medium">No hidden allocations. No presale. Pure community mechanics.</p>
          </div>
          <div className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-transform duration-300 shrink-0 ${showTokenomics ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showTokenomics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-fade-in">

            {/* Fair Launch */}
            <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent">
              <div className="bg-black/40 backdrop-blur-md p-8 rounded-[2rem] h-full flex flex-col gap-6">
                <div className="flex items-center gap-4">
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
                    { label: "Community Airdrop", value: "100%", detail: "20,000,000 PLAY distributed", color: "bg-hedera-green", width: "100%" },
                    { label: "Team Allocation", value: "0%", detail: "No vesting overhang", color: "bg-white/10", width: "0%" },
                    { label: "Pre-Sale / VCs", value: "0%", detail: "No seed rounds", color: "bg-white/10", width: "0%" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/70 font-medium">{item.label}</span>
                        <span className="text-white font-bold">{item.value}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: item.width }} />
                      </div>
                      <span className="text-xs text-white/30">{item.detail}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-4 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-xs text-white/50 leading-relaxed">
                    Liquidity is protocol-owned and managed via a continuous bonding curve — no external LP needed. Price increases automatically with every buy.
                  </p>
                </div>
              </div>
            </div>

            {/* Deflationary Sink */}
            <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent">
              <div className="bg-black/40 backdrop-blur-md p-8 rounded-[2rem] h-full flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <span className="text-xl">🔥</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Hyper-Deflationary Sink</h3>
                    <p className="text-sm text-orange-400/80 font-medium">Automated Protocol Buybacks</p>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col gap-4">
                  <p className="text-white/60 leading-relaxed text-sm font-medium">
                    The Arena V7 Smart Contract has an autonomous economic engine built in. When players lose wagers, the 5% house edge is split:
                  </p>
                  {[
                    { pct: "2.5%", label: "Treasury", desc: "Funds ongoing platform development and operations.", color: "bg-blue-500" },
                    { pct: "2.5%", label: "Auto-Buyback & Burn", desc: "Instantly routes HBAR to buy $PLAY from the curve. Purchased tokens are locked in the Arena contract permanently — a provable, on-chain burn.", color: "bg-orange-500" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-stretch gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                      <div className={`w-1 rounded-full ${item.color} shrink-0`} />
                      <div>
                        <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${item.color === 'bg-orange-500' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{item.pct}</span>
                          {item.label}
                          {item.color === 'bg-orange-500' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400 uppercase tracking-widest">Live</span>}
                        </h4>
                        <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
