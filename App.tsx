
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    CryptoCurrency, Advice, AdviceType, CryptoAlert, AlertConditionType, AppView, CryptoTweetAnalysis
} from './types';
import AdviceCard from './components/AdviceCard';
import LoadingSpinner from './components/LoadingSpinner';
import TradingViewWidget from './components/TradingViewWidget';
import SetAlertModal from './components/SetAlertModal';
import ShareAppModal from './components/ShareAppModal';
import NavigationBar from './components/NavigationBar';
import ExpertTradersView from './components/ExpertTradersView';
import CryptoXView from './components/CryptoXView'; 
import { getInvestmentAdvice, analyzeCryptoTweets } from './services/geminiService'; 
import { fetchCryptoDataWithDetails, searchCoinGecko, fetchCoinGeckoSuggestions, CoinGeckoSearchResult, RateLimitError } from './services/cryptoService';
import { SparklesIcon, InformationCircleIcon, BellIcon, XCircleIcon, TrashIcon, PlusCircleIcon, ShareIcon } from './components/icons';
import { useLanguage } from './contexts/LanguageContext';

// Simple Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const ALERTS_STORAGE_KEY = 'cryptoAdvisorAlerts';

const App: React.FC = () => {
  const { t, language } = useLanguage(); // Hook de idioma
  const [currentView, setCurrentView] = useState<AppView>(AppView.MAIN_ANALYSIS);
  const [selectedCryptoIds, setSelectedCryptoIds] = useState<string[]>([]);
  const [cryptoData, setCryptoData] = useState<Record<string, CryptoCurrency>>({});
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<Record<string, boolean>>({});
  const [isLoadingAdvice, setIsLoadingAdvice] = useState<Record<string, boolean>>({});
  const [isAIServiceAvailable, setIsAIServiceAvailable] = useState<boolean>(!!process.env.API_KEY);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 700);
  const [isSearching, setIsSearching] = useState<boolean>(false); 
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CoinGeckoSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [alerts, setAlerts] = useState<CryptoAlert[]>([]);
  const [showSetAlertModalFor, setShowSetAlertModalFor] = useState<CryptoCurrency | null>(null);
  const [triggeredAlertsQueue, setTriggeredAlertsQueue] = useState<CryptoAlert[]>([]);
  
  const [isGloballyRateLimited, setIsGloballyRateLimited] = useState<boolean>(false);
  const [rateLimitCooldownEndTimestamp, setRateLimitCooldownEndTimestamp] = useState<number | null>(null);
  const [cooldownTimerDisplay, setCooldownTimerDisplay] = useState<string>('');
  const RATE_LIMIT_COOLDOWN_DURATION = 90 * 1000; 

  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    setAppUrl(window.location.href);
  }, []);


  const activateRateLimitCooldown = useCallback((errorMessageKey?: string) => {
    setIsGloballyRateLimited(true);
    const cooldownEnd = Date.now() + RATE_LIMIT_COOLDOWN_DURATION;
    setRateLimitCooldownEndTimestamp(cooldownEnd);
    const specificError = errorMessageKey ? t(errorMessageKey) : t('app.rateLimitActiveError');
    setGlobalError(`${specificError} ${t('app.rateLimitPauseMessage')}`);
  }, [t]); 

  useEffect(() => {
    let intervalId: number | undefined;
    if (isGloballyRateLimited && rateLimitCooldownEndTimestamp) {
      intervalId = window.setInterval(() => {
        const timeLeft = Math.max(0, Math.ceil((rateLimitCooldownEndTimestamp - Date.now()) / 1000));
        setCooldownTimerDisplay(t('app.rateLimitCooldownDisplayPrefix') + timeLeft + t('app.rateLimitCooldownDisplaySuffix'));
        if (timeLeft === 0) {
          setIsGloballyRateLimited(false);
          setRateLimitCooldownEndTimestamp(null);
          setCooldownTimerDisplay('');
          setGlobalError(null); 
          setSearchError(null); 
        }
      }, 1000);
    } else {
        setCooldownTimerDisplay(''); 
    }
    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [isGloballyRateLimited, rateLimitCooldownEndTimestamp, t]);


  useEffect(() => {
    if (!process.env.API_KEY) {
      setGlobalError(t('app.geminiApiKeyError'));
      setIsAIServiceAvailable(false);
    } else {
      setIsAIServiceAvailable(true);
    }
    const storedAlerts = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (storedAlerts) {
      try {
        setAlerts(JSON.parse(storedAlerts));
      } catch (e) {
        console.error("Error loading alerts from localStorage:", e);
        localStorage.removeItem(ALERTS_STORAGE_KEY);
      }
    }
  }, [t]);

  useEffect(() => {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    if (debouncedSearchQuery.trim().length > 1 && !isGloballyRateLimited) {
      setIsLoadingSuggestions(true);
      setShowSuggestions(true);
      setSearchError(null);
      fetchCoinGeckoSuggestions(debouncedSearchQuery)
        .then(results => {
          setSuggestions(results);
        })
        .catch(error => {
          if (error instanceof RateLimitError) {
            activateRateLimitCooldown((error.message as string)); // Error message is already a key
          } else {
            setSearchError(t('app.searchErrorSuggestions'));
          }
          setSuggestions([]);
        })
        .finally(() => {
          setIsLoadingSuggestions(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      if (isGloballyRateLimited && debouncedSearchQuery.trim().length > 1) {
        setSearchError(t('app.searchPausedRateLimit'));
      }
    }
  }, [debouncedSearchQuery, isGloballyRateLimited, activateRateLimitCooldown, t]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const formatPrice = (price: number, symbol?: string): string => {
    if (!price && price !==0) return 'N/A';
    if (price < 0.000001 && price !== 0) return price.toFixed(8);
    if (price < 0.001 && price !== 0) return price.toFixed(6);
    if (symbol?.toUpperCase() === 'DOGE' || symbol?.toUpperCase() === 'ADA' || price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const checkAndTriggerAlerts = useCallback((updatedCrypto: CryptoCurrency) => {
    if (!updatedCrypto || typeof updatedCrypto.currentPrice !== 'number') return;
    const activeAlertsForCrypto = alerts.filter(alert => alert.cryptoId === updatedCrypto.id && alert.isActive);
    activeAlertsForCrypto.forEach(alert => {
      let triggered = false;
      if (alert.condition === AlertConditionType.PRICE_DROPS_TO && updatedCrypto.currentPrice <= alert.targetPrice) {
        triggered = true;
      } else if (alert.condition === AlertConditionType.PRICE_RISES_TO && updatedCrypto.currentPrice >= alert.targetPrice) {
        triggered = true;
      }
      if (triggered) {
        setAlerts(prevAlerts =>
          prevAlerts.map(a => a.id === alert.id ? { ...a, isActive: false, triggeredAt: Date.now() } : a)
        );
        setTriggeredAlertsQueue(prevQueue => {
            const newTriggeredAlert = { ...alert, isActive: false, triggeredAt: Date.now() };
            if (prevQueue.find(q => q.id === newTriggeredAlert.id)) return prevQueue; 
            return [newTriggeredAlert, ...prevQueue].slice(0, 5); 
        });
      }
    });
  }, [alerts]);

  const updateCryptoData = useCallback(async (id: string, initialSymbol?: string, initialName?: string): Promise<CryptoCurrency | null> => {
    if (isGloballyRateLimited) {
      console.warn("UpdateCryptoData skipped due to global rate limit.");
      setGlobalError(t('app.rateLimitActiveGeneral'));
      return cryptoData[id] || null; 
    }
    setIsLoadingData(prev => ({ ...prev, [id]: true }));
    const baseCrypto: CryptoCurrency = cryptoData[id] || {
        id, name: initialName || id, symbol: initialSymbol || id.toUpperCase(),
        tradingViewSymbol: `${(initialSymbol || id).toUpperCase()}USD`,
        currentPrice: 0, priceChange24hPercent: 0, priceHistory: [],
        volume24h: 0, marketCap: 0
    };
    try {
        const updatedCrypto = await fetchCryptoDataWithDetails(baseCrypto);
        if (updatedCrypto.lastUpdated) {
            setCryptoData(prev => ({ ...prev, [id]: updatedCrypto }));
            checkAndTriggerAlerts(updatedCrypto);
            return updatedCrypto;
        } else {
            setCryptoData(prev => ({ ...prev, [id]: { ...baseCrypto, name: updatedCrypto.name || baseCrypto.name, symbol: updatedCrypto.symbol || baseCrypto.symbol } }));
            return null; 
        }
    } catch (error) {
        if (error instanceof RateLimitError) {
            // error.message is already a translation key
            activateRateLimitCooldown(error.message as string); 
        }
        throw error; 
    } finally {
        setIsLoadingData(prev => ({ ...prev, [id]: false }));
    }
  }, [cryptoData, checkAndTriggerAlerts, isGloballyRateLimited, activateRateLimitCooldown, t]); 

  const fetchAdviceForCrypto = useCallback(async (crypto: CryptoCurrency, isManualRequest: boolean = false) => {
    if (!isAIServiceAvailable) {
        const newAdviceInfo: Advice = {
            id: crypto.id + Date.now() + "_aiservice_unavailable", crypto,
            type: AdviceType.INFO,
            message: t('services.gemini.adviceUnavailable'),
            detailedMessage: t('app.geminiApiKeyError'),
            timestamp: new Date(),
        };
        setAdvices([newAdviceInfo]); 
        return;
    }
    if (!crypto.lastUpdated || !crypto.priceHistory || crypto.priceHistory.length === 0) {
        const noDataAdvice: Advice = {
            id: crypto.id + Date.now() + "_nodata", crypto,
            type: AdviceType.INFO,
            message: t('services.gemini.adviceNoData', { cryptoName: crypto.name }),
            timestamp: new Date(),
        };
        setAdvices([noDataAdvice]); 
        return;
    }
    setIsLoadingAdvice(prev => ({ ...prev, [crypto.id]: true }));
    const adviceResult = await getInvestmentAdvice(crypto); // This function internally uses keys for its errors
    if (adviceResult) {
      const newAdvice: Advice = {
        id: crypto.id + Date.now() + (adviceResult.rawGeminiResponse || Math.random().toString()),
        crypto, type: adviceResult.adviceType, message: adviceResult.adviceText, // adviceText comes translated or as key
        detailedMessage: adviceResult.detailedMessage, 
        timestamp: new Date(), rawGeminiResponse: adviceResult.rawGeminiResponse
      };
      // If adviceText is a key, translate it
      if (adviceResult.adviceText.startsWith('services.gemini.')) {
        newAdvice.message = t(adviceResult.adviceText, { cryptoName: crypto.name, details: (adviceResult as any).details || ''});
      }

      setAdvices([newAdvice]); 
    }
    setIsLoadingAdvice(prev => ({ ...prev, [crypto.id]: false }));
  }, [isAIServiceAvailable, t]);

  useEffect(() => {
    const dataUpdateInterval = 7 * 60 * 1000; 
    const adviceCheckInterval = 2 * 60 * 60 * 1000; 

    const dataIntervalId = window.setInterval(() => {
      if (isGloballyRateLimited) {
        console.log("Global rate limit active, skipping periodic data update cycle.");
        return;
      }
      selectedCryptoIds.forEach(id => {
        if (cryptoData[id] && !isLoadingData[id]) { 
            updateCryptoData(id, cryptoData[id].symbol, cryptoData[id].name)
                .catch(error => { 
                    console.warn(`Error updating data periodically for ${id}: ${(error as Error).message}`);
                    if (!(error instanceof RateLimitError)){ 
                       setGlobalError(t('app.updateDataError', { cryptoName: cryptoData[id]?.name || id }));
                    }
                });
        }
      });
    }, dataUpdateInterval);

    const adviceIntervalId = window.setInterval(() => {
        if (selectedCryptoIds.length > 0 && currentView === AppView.MAIN_ANALYSIS) {
            const currentCryptoId = selectedCryptoIds[0];
            if (cryptoData[currentCryptoId] && !isLoadingAdvice[currentCryptoId] && isAIServiceAvailable) {
                const cryptoToAdvise = cryptoData[currentCryptoId];
                if (cryptoToAdvise.lastUpdated && cryptoToAdvise.priceHistory && cryptoToAdvise.priceHistory.length > 0) {
                    fetchAdviceForCrypto(cryptoToAdvise, false); 
                }
            }
        }
    }, adviceCheckInterval);

    return () => {
        window.clearInterval(dataIntervalId);
        window.clearInterval(adviceIntervalId);
    };
  }, [isGloballyRateLimited, selectedCryptoIds, cryptoData, isLoadingData, updateCryptoData, currentView, isLoadingAdvice, isAIServiceAvailable, fetchAdviceForCrypto, t]);


  const handleSelectCrypto = async (searchResult: CoinGeckoSearchResult) => {
    if (isGloballyRateLimited) {
        setGlobalError(t('app.rateLimitActiveGeneral')); // Or a more specific "selection paused"
        return;
    }
    setSearchQuery(''); 
    setSuggestions([]); 
    setShowSuggestions(false);

    if (!selectedCryptoIds.includes(searchResult.id)) {
        setSelectedCryptoIds([searchResult.id]); 
        setAdvices([]); 
    }

    setIsLoadingData(prev => ({ ...prev, [searchResult.id]: true }));
    try {
        const freshData = await updateCryptoData(searchResult.id, searchResult.symbol, searchResult.name);
        if (freshData && isAIServiceAvailable) {
            fetchAdviceForCrypto(freshData, true);
        } else if (!isAIServiceAvailable && freshData) { // Ensure freshData exists before calling
             fetchAdviceForCrypto(freshData, true); 
        } else if (!isAIServiceAvailable && !freshData) { // Handle case where data fetch also fails
            const placeholderCrypto = {id: searchResult.id, name: searchResult.name, symbol: searchResult.symbol, currentPrice: 0, priceChange24hPercent: 0, priceHistory: [], volume24h: 0, marketCap: 0 } as CryptoCurrency;
            fetchAdviceForCrypto(placeholderCrypto, true);
        }
    } catch (error) {
        if (error instanceof RateLimitError) {
            // activateRateLimitCooldown is already called by updateCryptoData
        } else {
            setGlobalError(t('app.processCryptoError', {cryptoName: searchResult.name}));
        }
    } finally {
        setIsLoadingData(prev => ({ ...prev, [searchResult.id]: false }));
    }
  };

  const handleAddAlert = (targetPrice: number, condition: AlertConditionType) => {
    if (showSetAlertModalFor) {
      const newAlert: CryptoAlert = {
        id: crypto.randomUUID(),
        cryptoId: showSetAlertModalFor.id,
        cryptoName: showSetAlertModalFor.name,
        cryptoSymbol: showSetAlertModalFor.symbol,
        targetPrice,
        condition,
        createdAt: Date.now(),
        isActive: true,
      };
      setAlerts(prev => [...prev, newAlert]);
      setShowSetAlertModalFor(null);
    }
  };
  
  const handleRemoveAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };
  
  const handleClearTriggeredAlert = (alertId: string) => {
    setTriggeredAlertsQueue(prev => prev.filter(a => a.id !== alertId));
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center p-2 sm:p-4 font-sans">
      <div className="w-full max-w-5xl">
        <header className="text-center my-4 md:my-6">
            <div className="flex items-center justify-center space-x-2">
                <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" title={t('general.appName')}/>
                <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">
                    {t('general.appName')}
                </h1>
            </div>
          <p className="text-sm sm:text-base text-slate-400 mt-1">{t('app.headerSubtitle')}</p>
        </header>

        <NavigationBar currentView={currentView} setCurrentView={setCurrentView} />
        
        <button
          onClick={() => setShowShareModal(true)}
          className="fixed top-4 right-4 bg-sky-500 hover:bg-sky-600 text-white p-2.5 rounded-full shadow-lg z-50 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-50"
          aria-label={t('app.shareAppButtonLabel')}
        >
          <ShareIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {globalError && (
          <div className="my-4 p-3 bg-rose-700/30 text-rose-300 border border-rose-600 rounded-lg text-sm text-center shadow-md" role="alert">
            <p><strong>{t('app.globalErrorPrefix')}</strong> {globalError} {cooldownTimerDisplay && <span className="font-semibold">{cooldownTimerDisplay}</span>}</p>
          </div>
        )}
        
        {isGloballyRateLimited && !cooldownTimerDisplay && (
             <div className="my-4 p-3 bg-amber-600/30 text-amber-300 border border-amber-500 rounded-lg text-sm text-center shadow-md" role="alert">
                <p>{t('app.rateLimitActiveGeneral')}</p>
            </div>
        )}


        {currentView === AppView.MAIN_ANALYSIS && (
          <main className="w-full px-1 sm:px-2">
            <div ref={searchContainerRef} className="relative mb-6 max-w-2xl mx-auto">
              <input
                type="text"
                placeholder={t('app.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => debouncedSearchQuery.trim().length > 1 && setShowSuggestions(true)}
                className="w-full p-3.5 pl-10 rounded-xl bg-slate-800 border-2 border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 outline-none text-slate-100 placeholder-slate-500 transition-all shadow-lg"
                aria-label={t('app.searchPlaceholder')}
                disabled={isGloballyRateLimited}
              />
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>
              </div>
              {(isLoadingSuggestions || isSearching) && <div className="absolute right-3 top-1/2 -translate-y-1/2"><LoadingSpinner /></div>}

              {showSuggestions && suggestions.length > 0 && !isGloballyRateLimited && (
                <ul className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-y-auto max-h-72 animate-fadeIn">
                  {suggestions.map(s => (
                    <li key={s.id} 
                        onClick={() => { handleSelectCrypto(s); }}
                        className="p-3 hover:bg-cyan-600/80 cursor-pointer transition-colors flex items-center gap-3 border-b border-slate-700/50 last:border-b-0">
                      {s.thumb && <img src={s.thumb} alt={s.name} className="w-6 h-6 rounded-full"/>}
                      <span className="font-medium text-slate-200">{s.name}</span>
                      <span className="text-xs text-slate-400 ml-auto bg-slate-700 px-1.5 py-0.5 rounded-md">{s.symbol}</span>
                    </li>
                  ))}
                </ul>
              )}
              {showSuggestions && suggestions.length === 0 && debouncedSearchQuery.trim().length > 1 && !isLoadingSuggestions && !isGloballyRateLimited && (
                <div className="absolute z-10 w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-lg text-slate-400 text-sm">
                  {t('app.noSuggestionsFound', { query: debouncedSearchQuery })}
                </div>
              )}
              {searchError && <p className="text-rose-400 text-sm mt-2 text-center">{searchError}</p>}
            </div>

            {selectedCryptoIds.length === 0 && !isSearching && (
              <div className="text-center p-6 bg-slate-800/70 rounded-xl shadow-lg max-w-lg mx-auto">
                <SparklesIcon className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-100 mb-2">{t('app.welcomeTitle')}</h2>
                <p className="text-slate-400">{t('app.welcomeMessage')}</p>
              </div>
            )}

            {selectedCryptoIds.map(id => cryptoData[id] && (
              <div key={id} className="mb-8 p-4 sm:p-6 bg-slate-800 rounded-xl shadow-xl animate-slideUp">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
                        {cryptoData[id].name} <span className="text-slate-500">({cryptoData[id].symbol})</span>
                    </h2>
                    <button 
                        onClick={() => setShowSetAlertModalFor(cryptoData[id])}
                        disabled={isGloballyRateLimited}
                        className="mt-2 sm:mt-0 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md text-sm flex items-center"
                        aria-label={t('app.createAlertButton')} // Simplified label, more specific in modal
                    >
                        <BellIcon className="w-4 h-4 mr-1.5" /> {t('app.createAlertButton')}
                    </button>
                </div>
                <TradingViewWidget symbol={cryptoData[id].tradingViewSymbol || `${cryptoData[id].symbol}USD`} height={350} locale={language} />
              </div>
            ))}
            
            {selectedCryptoIds.map(id => (isLoadingData[id] || isLoadingAdvice[id]) && <LoadingSpinner key={`loader-${id}`} />)}

            {advices.map(advice => <AdviceCard key={advice.id} advice={advice} />)}

            {alerts.length > 0 && (
              <section className="my-8 p-4 sm:p-6 bg-slate-800/80 rounded-xl shadow-xl">
                <h3 className="text-xl font-semibold text-slate-100 mb-4 flex items-center">
                    <BellIcon className="w-6 h-6 mr-2 text-amber-400"/>
                    {t('app.activeAlertsTitle', { count: alerts.filter(a=>a.isActive).length })}
                </h3>
                {alerts.filter(a => a.isActive).length === 0 && <p className="text-slate-400 text-sm">{t('app.noActiveAlerts')}</p>}
                <ul className="space-y-3">
                  {alerts.filter(a => a.isActive).map(alert => (
                    <li key={alert.id} className="p-3 bg-slate-700/60 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex-grow">
                        <span className="font-semibold text-slate-200">{alert.cryptoName} ({alert.cryptoSymbol})</span>
                        <span className={`text-sm ml-2 ${alert.condition === AlertConditionType.PRICE_DROPS_TO ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {alert.condition === AlertConditionType.PRICE_DROPS_TO ? t('app.alertConditionDropsTo') : t('app.alertConditionRisesTo')} ${formatPrice(alert.targetPrice, alert.cryptoSymbol)}
                        </span>
                        <p className="text-xs text-slate-400">{t('app.alertCreatedAt')} {new Date(alert.createdAt).toLocaleString(language)}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveAlert(alert.id)} 
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-md hover:bg-rose-500/20 transition-colors self-start sm:self-center" 
                        aria-label={t('app.alertDeleteLabel', { cryptoName: alert.cryptoName })}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {triggeredAlertsQueue.length > 0 && (
                <div className="fixed bottom-4 right-4 w-full max-w-xs sm:max-w-sm z-[150] space-y-3">
                    {triggeredAlertsQueue.map(alert => (
                        <div key={`triggered-${alert.id}`} className="bg-gradient-to-r from-cyan-600 to-sky-700 p-4 rounded-xl shadow-2xl border border-cyan-400/50 animate-fadeInUp" role="alertdialog" aria-labelledby={`alert-title-${alert.id}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <h4 id={`alert-title-${alert.id}`} className="text-lg font-bold text-white flex items-center">
                                        <BellIcon className="w-6 h-6 mr-2 animate-pulseOnce" />
                                        {t('app.triggeredAlertTitle')}
                                    </h4>
                                    <p className="text-sm text-sky-100 mt-1">
                                        {alert.condition === AlertConditionType.PRICE_DROPS_TO 
                                            ? t('app.triggeredAlertMessageDropped', { cryptoName: alert.cryptoName, cryptoSymbol: alert.cryptoSymbol, targetPrice: formatPrice(alert.targetPrice, alert.cryptoSymbol)})
                                            : t('app.triggeredAlertMessageRisen', { cryptoName: alert.cryptoName, cryptoSymbol: alert.cryptoSymbol, targetPrice: formatPrice(alert.targetPrice, alert.cryptoSymbol)})}
                                    </p>
                                    <p className="text-xs text-sky-200/80 mt-0.5">
                                        {t('app.triggeredAlertCurrentPrice', { currentPrice: formatPrice(cryptoData[alert.cryptoId]?.currentPrice, alert.cryptoSymbol)})}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleClearTriggeredAlert(alert.id)} 
                                    className="text-sky-200 hover:text-white transition-colors" 
                                    aria-label={t('app.triggeredAlertDismissLabel')}
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}


          </main>
        )}

        {currentView === AppView.EXPERT_TRADERS && <ExpertTradersView />}
        
        {currentView === AppView.CRYPTO_X && (
            <CryptoXView 
                analyzeCryptoTweets={analyzeCryptoTweets} 
                searchCoinGecko={searchCoinGecko}
                isGloballyRateLimited={isGloballyRateLimited}
                globalRateLimitCooldownDisplay={cooldownTimerDisplay}
            />
        )}

        {showSetAlertModalFor && (
          <SetAlertModal
            isOpen={!!showSetAlertModalFor}
            onClose={() => setShowSetAlertModalFor(null)}
            onSetAlert={handleAddAlert}
            currentPrice={showSetAlertModalFor.currentPrice}
            cryptoName={showSetAlertModalFor.name}
            cryptoSymbol={showSetAlertModalFor.symbol}
          />
        )}
        
        <ShareAppModal 
            isOpen={showShareModal} 
            onClose={() => setShowShareModal(false)} 
            appUrl={appUrl}
        />

        <footer className="text-center my-8 py-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500">{t('app.footerCopyright', { year: new Date().getFullYear() })}</p>
            <p className="text-xs text-slate-600 mt-1">{t('app.footerDisclaimer')}</p>
        </footer>
      </div>
    </div>
  );
};

export default App;