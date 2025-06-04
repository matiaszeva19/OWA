import { CryptoCurrency } from './types';

// Initial prices are placeholders and will be overwritten by real API data.
export const AVAILABLE_CRYPTOS: CryptoCurrency[] = [
  { 
    id: 'bitcoin', 
    name: 'Bitcoin', 
    symbol: 'BTC', 
    tradingViewSymbol: 'COINBASE:BTCUSD', // Example, TradingView might auto-resolve BTCUSD too
    currentPrice: 0, 
    priceChange24hPercent: 0, 
    priceHistory: [], 
    volume24h: 0, 
    marketCap: 0,
  },
  { 
    id: 'ethereum', 
    name: 'Ethereum', 
    symbol: 'ETH', 
    tradingViewSymbol: 'COINBASE:ETHUSD',
    currentPrice: 0, 
    priceChange24hPercent: 0, 
    priceHistory: [], 
    volume24h: 0, 
    marketCap: 0,
  },
  { 
    id: 'solana', 
    name: 'Solana', 
    symbol: 'SOL', 
    tradingViewSymbol: 'COINBASE:SOLUSD',
    currentPrice: 0, 
    priceChange24hPercent: 0, 
    priceHistory: [], 
    volume24h: 0, 
    marketCap: 0,
  },
  { 
    id: 'dogecoin', 
    name: 'Dogecoin', 
    symbol: 'DOGE', 
    tradingViewSymbol: 'BINANCE:DOGEUSD',
    currentPrice: 0, 
    priceChange24hPercent: 0, 
    priceHistory: [], 
    volume24h: 0, 
    marketCap: 0,
  },
  { 
    id: 'cardano', 
    name: 'Cardano', 
    symbol: 'ADA', 
    tradingViewSymbol: 'BINANCE:ADAUSD',
    currentPrice: 0, 
    priceChange24hPercent: 0, 
    priceHistory: [], 
    volume24h: 0, 
    marketCap: 0,
  },
];

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
// CHART_DATA_POINTS is no longer needed as TradingView handles its own data points.
