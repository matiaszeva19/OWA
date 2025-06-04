
import React, { useState, useCallback } from 'react';
import { CryptoTweetAnalysis } from '../types';
import { CoinGeckoSearchResult, searchCoinGecko as searchCoinGeckoService } from '../services/cryptoService';
import { analyzeCryptoTweets as analyzeCryptoTweetsService } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { SparklesIcon, TrashIcon, PlusCircleIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';


const INITIAL_NUM_TWEET_INPUTS = 3; 

const TWEET_FETCH_ERROR_KEYS = [
  'cryptoXView.emptyUrlError', 'cryptoXView.invalidUrlError', 'cryptoXView.tweetNotFoundError',
  'cryptoXView.rateLimitProxyError', 'cryptoXView.httpErrorProxy', 'cryptoXView.extractionError',
  'cryptoXView.noHtmlError', 'cryptoXView.exceptionLoadingTweet'
];

interface CryptoXViewProps {
  analyzeCryptoTweets: typeof analyzeCryptoTweetsService;
  searchCoinGecko: typeof searchCoinGeckoService;
  isGloballyRateLimited: boolean;
  globalRateLimitCooldownDisplay: string;
}

const CryptoXView: React.FC<CryptoXViewProps> = ({ 
    analyzeCryptoTweets, 
    searchCoinGecko,
    isGloballyRateLimited,
    globalRateLimitCooldownDisplay
}) => {
  const { t } = useLanguage();
  const [cryptoSearchQuery, setCryptoSearchQuery] = useState<string>('');
  const [searchedCryptoName, setSearchedCryptoName] = useState<string | null>(null);
  const [tweetUrls, setTweetUrls] = useState<string[]>(Array(INITIAL_NUM_TWEET_INPUTS).fill(''));
  const [analysisResult, setAnalysisResult] = useState<CryptoTweetAnalysis | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState<boolean>(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showTweetPastingArea, setShowTweetPastingArea] = useState<boolean>(false);
  const [isFetchingTweetContent, setIsFetchingTweetContent] = useState<boolean>(false);
  const [fetchErrorMessages, setFetchErrorMessages] = useState<string[]>([]);

  const handleSearchCryptoForTweets = async () => {
    if (!cryptoSearchQuery.trim()) {
      setSearchError(t('cryptoXView.errorSearchCrypto'));
      return;
    }
    if (isGloballyRateLimited) {
        setSearchError(t('cryptoXView.errorRateLimit', { cooldownDisplay: globalRateLimitCooldownDisplay }));
        return;
    }

    setIsLoadingSearch(true);
    setSearchError(null);
    setAnalysisResult(null);
    setShowTweetPastingArea(false);
    setTweetUrls(Array(INITIAL_NUM_TWEET_INPUTS).fill(''));
    setFetchErrorMessages([]);

    try {
      const searchResult: CoinGeckoSearchResult | null = await searchCoinGecko(cryptoSearchQuery);
      if (searchResult) {
        setSearchedCryptoName(searchResult.name);
        const searchTermForX = encodeURIComponent(searchResult.name); 
        const twitterSearchUrl = `https://x.com/search?q=${searchTermForX}&src=typed_query`; 
        
        window.open(twitterSearchUrl, '_blank');
        setShowTweetPastingArea(true);
      } else {
        setSearchError(t('cryptoXView.errorCoinNotFound', { query: cryptoSearchQuery }));
        setSearchedCryptoName(null);
      }
    } catch (error) {
      console.error("Error searching crypto for CryptoX:", error);
      if ((error as Error).name === 'RateLimitError') {
         // The error message from cryptoService should be a key itself
         setSearchError(t((error as Error).message as string, { cooldownDisplay: globalRateLimitCooldownDisplay }));
      } else {
        setSearchError(t('cryptoXView.errorGenericSearch'));
      }
      setSearchedCryptoName(null);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleTweetUrlChange = (index: number, value: string) => {
    const newTweetUrls = [...tweetUrls];
    newTweetUrls[index] = value;
    setTweetUrls(newTweetUrls);
    setAnalysisError(null); 
    setFetchErrorMessages([]);
  };

  const handleAddTweetField = () => {
    setTweetUrls(prev => [...prev, '']);
  };

  const handleRemoveTweetField = (indexToRemove: number) => {
    setTweetUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const fetchTweetContentFromUrl = async (tweetUrl: string): Promise<string> => {
    if (!tweetUrl.trim()) return t('cryptoXView.emptyUrlError');
    let parsedUrl;
    try {
      parsedUrl = new URL(tweetUrl); 
    } catch (e) {
      return t('cryptoXView.invalidUrlError', { url: tweetUrl }); 
    }
    
    const proxyBaseUrl = 'https://api.allorigins.win/raw?url=';
    const oEmbedTargetUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true&maxwidth=550&hide_media=false&hide_thread=false&align=center`;
    const oEmbedUrl = `${proxyBaseUrl}${encodeURIComponent(oEmbedTargetUrl)}`;
    
    try {
      const response = await fetch(oEmbedUrl);
      if (!response.ok) {
        console.error(`Error fetching tweet data from ${tweetUrl} via proxy: ${response.statusText} (Status: ${response.status})`);
        if (response.status === 404) return t('cryptoXView.tweetNotFoundError', { url: tweetUrl });
        if (response.status === 429) return t('cryptoXView.rateLimitProxyError', { url: tweetUrl });
        return t('cryptoXView.httpErrorProxy', { status: response.status, url: tweetUrl });
      }
      const data = await response.json();
      if (data && data.html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.html;
        const tweetParagraph = tempDiv.querySelector('blockquote > p'); 
        if (tweetParagraph && tweetParagraph.textContent) {
          let text = tweetParagraph.textContent.trim();
          text = text.replace(/https?:\/\/t\.co\/\w+$/, '').trim(); 
          return text;
        }
        const genericParagraph = tempDiv.querySelector('p');
        if(genericParagraph && genericParagraph.textContent) {
            let text = genericParagraph.textContent.trim();
            text = text.replace(/https?:\/\/t\.co\/\w+$/, '').trim();
            return text;
        }
        return t('cryptoXView.extractionError', { url: tweetUrl });
      }
      return t('cryptoXView.noHtmlError', { url: tweetUrl });
    } catch (error) {
      console.error(`Exception fetching tweet data from ${tweetUrl} via proxy:`, error);
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
          return `FALLO_DIRECTO_FETCH_URL:${tweetUrl}`; 
      }
      return t('cryptoXView.exceptionLoadingTweet', { message: (error as Error).message, url: tweetUrl });
    }
  };


  const handleAnalyzeTweetLinks = async () => {
    if (!searchedCryptoName) {
      setAnalysisError(t('cryptoXView.errorNoCryptoForAnalysis'));
      return;
    }
    const validUrls = tweetUrls.filter(url => url.trim().startsWith('http'));
    if (validUrls.length === 0) {
      setAnalysisError(t('cryptoXView.errorNoValidTweetLinks', { cryptoName: searchedCryptoName }));
      return;
    }

    setIsLoadingAnalysis(true);
    setIsFetchingTweetContent(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setFetchErrorMessages([]);

    const processedTweetData: string[] = [];
    const currentFetchErrors: string[] = [];

    for (const url of validUrls) {
      const contentOrUrl = await fetchTweetContentFromUrl(url);
      processedTweetData.push(contentOrUrl);
      
      // Check if contentOrUrl is one of the error messages or the direct fetch fail marker
      const isError = TWEET_FETCH_ERROR_KEYS.some(key => contentOrUrl === t(key, {url:url, status:0, message:''} ) );

      if (contentOrUrl.startsWith('FALLO_DIRECTO_FETCH_URL:') || isError ){
        currentFetchErrors.push(contentOrUrl.startsWith('FALLO_DIRECTO_FETCH_URL:') ? t('cryptoXView.fetchErrorItemGeneric', {url: contentOrUrl.replace('FALLO_DIRECTO_FETCH_URL:', '')}) : contentOrUrl);
      }
    }
    setFetchErrorMessages(currentFetchErrors);
    setIsFetchingTweetContent(false);

    if (processedTweetData.length > 0 && processedTweetData.every(data => {
        if (data.startsWith('FALLO_DIRECTO_FETCH_URL:')) {
            return true; // This item is an error
        }
        // Check if 'data' is one of the translated known error messages.
        // This simplified check assumes error messages won't vary significantly with dynamic params for this specific comparison.
        return TWEET_FETCH_ERROR_KEYS.some(key => data === t(key, { url: '', status: 0, message: '' }));
      })) {
      setAnalysisError(t('cryptoXView.errorFetchingAllTweets'));
      setIsLoadingAnalysis(false);
      return;
    }
    
    try {
      const result = await analyzeCryptoTweets(searchedCryptoName, processedTweetData); // analyzeCryptoTweets handles errors by returning specific structures
      setAnalysisResult(result);
      if (result?.summary.startsWith('Error') || result?.summary.startsWith(t('services.gemini.tweetAnalysisUnavailable'))) {
        setAnalysisError(result.summary);
      }
    } catch (error) { // Should not happen if analyzeCryptoTweets catches its own errors
      console.error("Error analyzing tweets with AI:", error);
      setAnalysisError(t('cryptoXView.errorAIAnalysis'));
      setAnalysisResult(null);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const renderSentimentBadge = (sentiment: CryptoTweetAnalysis['sentiment'] | undefined) => {
    if (!sentiment) return null;
    let bgColor = 'bg-slate-600';
    let textColor = 'text-slate-100';

    switch (sentiment) {
      case 'Positivo': bgColor = 'bg-emerald-500'; textColor = 'text-white'; break;
      case 'Negativo': bgColor = 'bg-rose-500'; textColor = 'text-white'; break;
      case 'Neutral': bgColor = 'bg-sky-500'; textColor = 'text-white'; break;
      case 'Mixto': bgColor = 'bg-amber-500'; textColor = 'text-white'; break;
      case 'Desconocido': bgColor = 'bg-slate-700'; textColor = 'text-slate-300'; break;
    }
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${bgColor} ${textColor}`}>{sentiment}</span>;
  };


  return (
    <div className="mt-6 md:mt-8 p-4 sm:p-6 bg-slate-800/80 rounded-xl shadow-xl">
      <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-cyan-400 text-center">
        {t('cryptoXView.title')}
      </h2>
      
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-slate-400 mb-4 text-center" dangerouslySetInnerHTML={{ __html: t('cryptoXView.description') }}></p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={cryptoSearchQuery}
            onChange={(e) => setCryptoSearchQuery(e.target.value)}
            placeholder={t('cryptoXView.searchPlaceholder')}
            className="flex-grow p-3 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-slate-400 transition-colors"
            disabled={isLoadingSearch || isGloballyRateLimited}
          />
          <button
            onClick={handleSearchCryptoForTweets}
            disabled={isLoadingSearch || isGloballyRateLimited}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-5 rounded-lg transition-colors shadow-md disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoadingSearch ? <LoadingSpinner /> : <><SparklesIcon className="w-5 h-5 mr-2" /> {t('cryptoXView.buttonSearchAndPrepare')}</>}
          </button>
        </div>
        {searchError && <p className="text-rose-400 text-sm mb-4 text-center">{searchError}</p>}
        {isGloballyRateLimited && !searchError && <p className="text-amber-400 text-sm mb-4 text-center">{t('cryptoXView.searchPaused', { cooldownDisplay: globalRateLimitCooldownDisplay })}</p>}


        {showTweetPastingArea && searchedCryptoName && (
          <div className="my-6 p-4 bg-slate-700/50 rounded-lg animate-fadeIn">
            <h3 className="text-lg font-semibold text-slate-100 mb-1">
              {t('cryptoXView.pasteTweetLinksTitle', { cryptoName: searchedCryptoName })}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {t('cryptoXView.pasteTweetLinksDescription', { cryptoName: searchedCryptoName })}
            </p>
            <div className="space-y-3 mb-4">
              {tweetUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                    <input
                    type="url"
                    value={url}
                    onChange={(e) => handleTweetUrlChange(index, e.target.value)}
                    placeholder={t('cryptoXView.tweetLinkInputPlaceholder', { index: index + 1 })}
                    className="w-full p-2.5 rounded-md bg-slate-600 border border-slate-500 text-slate-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-slate-400"
                    aria-label={t('cryptoXView.tweetLinkInputLabel', { index: index + 1 })}
                    />
                    <button
                        onClick={() => handleRemoveTweetField(index)}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-md transition-colors"
                        aria-label={t('cryptoXView.buttonRemoveTweetLink')}
                        title={t('cryptoXView.buttonRemoveTweetLink')}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
              ))}
            </div>
            <button
                onClick={handleAddTweetField}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 py-2 px-3 rounded-md hover:bg-slate-600/70 transition-colors mb-4"
            >
                <PlusCircleIcon className="w-5 h-5" />
                {t('cryptoXView.buttonAddTweetLink')}
            </button>

            {fetchErrorMessages.length > 0 && (
                <div className="my-3 p-2 bg-rose-700/30 border border-rose-600 rounded-md text-xs text-rose-300">
                    <p className="font-semibold mb-1">{t('cryptoXView.fetchErrorTitle')}</p>
                    <ul className="list-disc list-inside pl-2">
                        {fetchErrorMessages.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
            {isFetchingTweetContent && <div className="my-2"><LoadingSpinner /> <p className="text-xs text-center text-slate-400">{t('cryptoXView.fetchingTweetContent')}</p></div>}
            <button
              onClick={handleAnalyzeTweetLinks}
              disabled={isLoadingAnalysis || isFetchingTweetContent}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-5 rounded-lg transition-colors shadow-md disabled:bg-slate-600 flex items-center justify-center"
            >
              {(isLoadingAnalysis && !isFetchingTweetContent) || isFetchingTweetContent ? <LoadingSpinner /> : t('cryptoXView.buttonAnalyzeTweetLinks')}
            </button>
             <p className="text-xs text-slate-500 mt-3">
              {t('cryptoXView.noteTweetFetching')}
            </p>
          </div>
        )}

        {analysisError && <p className="text-rose-400 text-sm my-4 text-center">{analysisError}</p>}

        {analysisResult && (
          <div className="mt-8 p-4 bg-slate-800 rounded-lg shadow-lg animate-fadeInUp border border-cyan-500/30">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              {t('cryptoXView.analysisTitle', { cryptoName: searchedCryptoName || t('general.cryptocurrency', {count: 1, context: 'generic'}) })}
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-semibold text-slate-200 mb-1">{t('cryptoXView.sentimentLabel')}</h4>
                <p>{renderSentimentBadge(analysisResult.sentiment)}</p>
              </div>
              <div>
                <h4 className="text-md font-semibold text-slate-200 mb-1">{t('cryptoXView.narrativesLabel')}</h4>
                {analysisResult.narratives.length > 0 ? (
                  <ul className="list-disc list-inside pl-1 space-y-1 text-slate-300 text-sm">
                    {analysisResult.narratives.map((narrative, index) => (
                      <li key={index}>{narrative}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 text-sm">{t('cryptoXView.narrativesNotFound')}</p>
                )}
              </div>
              <div>
                <h4 className="text-md font-semibold text-slate-200 mb-1">{t('cryptoXView.summaryLabel')}</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{analysisResult.summary}</p>
              </div>
              {analysisResult.rawResponse && (
                 <details className="text-xs text-slate-500 mt-2">
                    <summary className="cursor-pointer hover:text-slate-400">{t('cryptoXView.rawResponseLabel')}</summary>
                    <pre className="mt-1 p-2 bg-slate-900 rounded overflow-x-auto text-xs">{analysisResult.rawResponse}</pre>
                 </details>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-10 p-3 bg-slate-900/70 rounded-lg border border-slate-700 text-xs text-slate-500 text-center max-w-xl mx-auto">
         <p dangerouslySetInnerHTML={{ __html: t('cryptoXView.importantDisclaimer') }}></p>
      </div>
    </div>
  );
};

export default CryptoXView;
