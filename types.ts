
export interface PriceDataPoint {
  timestamp: number; // Unix timestamp (seconds for CoinGecko history)
  price: number;
}

export interface CryptoCurrency {
  id: string; // CoinGecko ID (e.g., 'bitcoin')
  name: string;
  symbol: string; // e.g., BTC
  tradingViewSymbol: string; // e.g., 'COINBASE:BTCUSD' or 'BTCUSD'
  currentPrice: number;
  priceChange24hPercent: number;
  priceHistory: PriceDataPoint[]; // For AI analysis, fetched from CoinGecko
  volume24h: number;
  marketCap: number;
  lastUpdated?: number; // Timestamp of the last data fetch
}

export enum AdviceType {
  BUY = 'COMPRAR', // Changed to Spanish
  SELL = 'VENDER', // Changed to Spanish
  HOLD = 'MANTENER', // Changed to Spanish
  INFO = 'INFO',
}

export interface Advice {
  id: string;
  crypto: CryptoCurrency; 
  type: AdviceType;
  message: string; // Will be in Spanish - this is the simple summary
  detailedMessage?: string; // Optional detailed technical analysis
  timestamp: Date;
  rawGeminiResponse?: string;
}

// --- Tipos para Alertas ---
export enum AlertConditionType {
  PRICE_DROPS_TO = 'PRICE_DROPS_TO', // Para comprar cuando el precio baja
  PRICE_RISES_TO = 'PRICE_RISES_TO', // Para vender cuando el precio sube
}

export interface CryptoAlert {
  id: string; // uuid
  cryptoId: string; // ID de CoinGecko
  cryptoName: string;
  cryptoSymbol: string;
  targetPrice: number;
  condition: AlertConditionType;
  createdAt: number; // Timestamp
  isActive: boolean;
  triggeredAt?: number; // Timestamp
}

// --- Tipos para Vistas de la Aplicación ---
export enum AppView {
  MAIN_ANALYSIS = 'MAIN_ANALYSIS',
  EXPERT_TRADERS = 'EXPERT_TRADERS',
  CRYPTO_X = 'CRYPTO_X', // Nueva vista para análisis de tweets
}

// --- Tipos para Traders Expertos (Opcional, para estructura) ---
export interface ExpertTrader {
  name: string;
  twitterHandle: string; // e.g., "VitalikButerin" (sin el @)
  description?: string; // Short description or specialty
}

// --- Tipos para CryptoX ---
export interface CryptoTweetAnalysis {
  sentiment: 'Positivo' | 'Negativo' | 'Neutral' | 'Mixto' | 'Desconocido';
  narratives: string[]; // Array de temas o narrativas clave
  summary: string; // Resumen general del análisis
  rawResponse?: string; // Para depuración
}

// --- Tipos para Internacionalización (i18n) ---
export type Locale = 'es' | 'en';

export interface Translations {
  [key: string]: string | Translations; // Permite anidación simple si es necesario
}

export interface LocaleMessages {
  es: Translations;
  en: Translations;
}