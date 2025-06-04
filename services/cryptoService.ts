
import { CryptoCurrency, PriceDataPoint } from '../types';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export interface CoinGeckoSearchResult {
    id: string;
    name: string;
    symbol: string;
    thumb?: string; 
}

export class RateLimitError extends Error {
    // The message passed to the constructor should now be a translation key
    constructor(messageKey: string) {
        super(messageKey); // Store the key
        this.name = "RateLimitError";
    }
}

export const fetchCoinGeckoSuggestions = async (query: string): Promise<CoinGeckoSearchResult[]> => {
  if (!query.trim() || query.trim().length < 2) return []; 
  try {
    const response = await fetch(`${COINGECKO_API_BASE}/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Rate limit hit fetching suggestions for "${query}"`);
        throw new RateLimitError(`services.crypto.ERROR_RATE_LIMIT_SUGGESTIONS`);
      }
      console.error(`Error fetching suggestions from CoinGecko for "${query}": ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (data.coins && data.coins.length > 0) {
      return data.coins.slice(0, 7).map((coin: any) => ({ 
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        thumb: coin.thumb,
      }));
    }
    return [];
  } catch (error) {
    if (error instanceof RateLimitError) throw error; 
    console.error(`Exception during CoinGecko suggestion fetch for "${query}":`, error);
    return [];
  }
};


export const searchCoinGecko = async (query: string): Promise<CoinGeckoSearchResult | null> => {
  if (!query.trim()) return null;
  try {
    const suggestions = await fetchCoinGeckoSuggestions(query); 
    if (suggestions.length > 0) {
        const lowerQuery = query.toLowerCase();
        
        let match = suggestions.find(s => s.id.toLowerCase() === lowerQuery);
        if (match) return match;

        match = suggestions.find(s => s.name.toLowerCase() === lowerQuery);
        if (match) return match;

        match = suggestions.find(s => s.symbol.toLowerCase() === lowerQuery);
        if (match) return match;
        
        if (lowerQuery === "bitcoin") {
            const bitcoinCanonical = suggestions.find(s => s.id === "bitcoin");
            if (bitcoinCanonical) return bitcoinCanonical;
        }
        if (lowerQuery === "ethereum" || lowerQuery === "eth") { 
            const ethereumCanonical = suggestions.find(s => s.id === "ethereum");
            if (ethereumCanonical) return ethereumCanonical;
        }
        
        console.warn(`Query "${query}" did not find an exact ID, Name, or Symbol match via primary checks, nor a canonical match for common cryptos. Falling back to CoinGecko's first suggestion: ${suggestions[0]?.name}`);
        return suggestions[0]; 
    }
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    console.error(`Exception during CoinGecko search for "${query}":`, error);
    return null;
  }
};


export const fetchCryptoDataWithDetails = async (cryptoToUpdate: CryptoCurrency): Promise<CryptoCurrency> => {
  let successfullyUpdatedMarketData = false;
  const updatedData: CryptoCurrency = { 
    ...cryptoToUpdate, 
    priceHistory: cryptoToUpdate.priceHistory ? [...cryptoToUpdate.priceHistory] : [] 
  };
  const cryptoNameForError = cryptoToUpdate.name || cryptoToUpdate.id;

  try {
    const coinDataResponse = await fetch(`${COINGECKO_API_BASE}/coins/${cryptoToUpdate.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
    
    if (!coinDataResponse.ok) {
      if (coinDataResponse.status === 429) {
        console.warn(`Rate limit hit fetching main market data for ${cryptoNameForError}`);
        throw new RateLimitError(`services.crypto.ERROR_RATE_LIMIT_DETAILS:{ "cryptoName": "${cryptoNameForError}" }`); // Pass params as JSON string for later parsing
      }
      console.error(`Error fetching main market data for ${cryptoNameForError} from CoinGecko: ${coinDataResponse.statusText} (status: ${coinDataResponse.status})`);
      return cryptoToUpdate; 
    }
    
    const coinData = await coinDataResponse.json();
    const marketData = coinData.market_data;

    if (marketData && typeof marketData.current_price?.usd === 'number') {
        updatedData.currentPrice = marketData.current_price.usd;
        updatedData.priceChange24hPercent = marketData.price_change_percentage_24h ?? updatedData.priceChange24hPercent;
        updatedData.marketCap = marketData.market_cap?.usd ?? updatedData.marketCap;
        updatedData.volume24h = marketData.total_volume?.usd ?? updatedData.volume24h;
        successfullyUpdatedMarketData = true; 
    } else {
        console.error(`Market data or current_price.usd missing or invalid for ${cryptoNameForError}. API Response:`, marketData);
        return cryptoToUpdate; 
    }

    updatedData.priceHistory = [];
    try {
        const historyResponse = await fetch(`${COINGECKO_API_BASE}/coins/${cryptoToUpdate.id}/market_chart?vs_currency=usd&days=30&interval=daily`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          if (historyData.prices && historyData.prices.length > 0) {
            updatedData.priceHistory = historyData.prices.map((p: [number, number]) => ({
              timestamp: Math.floor(p[0] / 1000), 
              price: p[1],
            }));
          } else {
             console.warn(`Price history fetch for ${cryptoNameForError} returned OK but no price data.`);
          }
        } else {
            if (historyResponse.status === 429) {
                 console.warn(`Rate limit hit fetching price history for ${cryptoNameForError}. Main data may still be used if successfully fetched.`);
            } else {
                console.warn(`Error fetching price history for ${cryptoNameForError}: ${historyResponse.statusText}. Main market data may still be used.`);
            }
        }
    } catch (historyError) {
        console.warn(`Exception fetching price history for ${cryptoNameForError}:`, historyError);
    }
    
    if (successfullyUpdatedMarketData) {
      updatedData.lastUpdated = Date.now();
    }
    return updatedData;

  } catch (error) {
    if (error instanceof RateLimitError) throw error; 
    console.error(`Exception during fetchCryptoDataWithDetails for ${cryptoNameForError}:`, error);
    return cryptoToUpdate; 
  }
};