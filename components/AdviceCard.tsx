
import React, { useState } from 'react';
import { Advice, AdviceType, CryptoCurrency } from '../types';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, InformationCircleIcon, SparklesIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface AdviceCardProps {
  advice: Advice;
}

const AdviceCard: React.FC<AdviceCardProps> = ({ advice }) => {
  const { t, language } = useLanguage();
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  const renderIndicator = (labelKey: string, value: string | number | undefined, unit: string = "") => {
    if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
      return null;
    }
    return <span className="text-xs mr-2 mb-1 px-2 py-1 rounded-md bg-slate-700 text-slate-300 inline-block shadow">{t(labelKey)}: {value}{unit}</span>;
  };
  
  const getIconAndColor = () => {
    switch (advice.type) {
      case AdviceType.BUY:
        return { icon: <ArrowUpIcon className="text-emerald-400 w-7 h-7" />, borderColor: 'border-emerald-500', bgColor: 'bg-slate-800', textColor: 'text-emerald-400', typeText: t('adviceCard.buy') };
      case AdviceType.SELL:
        return { icon: <ArrowDownIcon className="text-rose-400 w-7 h-7" />, borderColor: 'border-rose-500', bgColor: 'bg-slate-800', textColor: 'text-rose-400', typeText: t('adviceCard.sell') };
      case AdviceType.HOLD:
        return { icon: <MinusIcon className="text-amber-400 w-7 h-7" />, borderColor: 'border-amber-500', bgColor: 'bg-slate-800', textColor: 'text-amber-400', typeText: t('adviceCard.hold') };
      default: // INFO
        return { icon: <InformationCircleIcon className="text-sky-400 w-7 h-7" />, borderColor: 'border-sky-500', bgColor: 'bg-slate-800', textColor: 'text-sky-400', typeText: t('adviceCard.info') };
    }
  };

  const { icon, borderColor, bgColor, textColor, typeText } = getIconAndColor();
  const crypto = advice.crypto;

  const formatPriceForCard = (price: number, symbol?: string): string => {
    if (!price && price !==0) return 'N/A';
    if (price < 0.000001 && price !== 0) return price.toFixed(8);
    if (price < 0.001 && price !== 0) return price.toFixed(6);
    if (symbol?.toUpperCase() === 'DOGE' || symbol?.toUpperCase() === 'ADA' || price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  return (
    <div className={`p-6 rounded-xl shadow-xl border-l-4 ${borderColor} ${bgColor} mb-6 transform hover:shadow-2xl transition-all duration-300 flex flex-col justify-between`}>
      <div>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 pt-1">{icon}</div>
          <div className="flex-grow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className={`text-2xl font-bold ${textColor}`}>{crypto.name} ({crypto.symbol}) - {typeText}</h3>
                <div className="flex items-center text-cyan-400 mt-1 sm:mt-0" title={t('adviceCard.aiGenerated')}>
                    <SparklesIcon className="w-5 h-5 mr-1" />
                    <span className="text-xs">{t('adviceCard.aiGenerated')}</span>
                </div>
            </div>
            
            <p className="text-sm text-slate-400 mb-3">
              {t('adviceCard.priceRefLabel')} ${formatPriceForCard(crypto.currentPrice, crypto.symbol)} | {t('adviceCard.price24hLabel')}
              <span className={`${crypto.priceChange24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {` ${crypto.priceChange24hPercent.toFixed(2)}%`}
              </span>
            </p>
            <div className="text-xs text-slate-500 mb-3 flex flex-wrap items-center">
                {renderIndicator("adviceCard.volume24hLabel", `$${(crypto.volume24h / 1_000_000_000).toFixed(2)}B`)}
                {renderIndicator("adviceCard.marketCapLabel", `$${(crypto.marketCap / 1_000_000_000).toFixed(2)}B`)}
            </div>
            
            {/* Simple Summary */}
            <p className="text-slate-200 text-md leading-relaxed">{advice.message}</p>

            {/* Toggle and Advanced Details Section */}
            {advice.detailedMessage && (
              <div className="mt-4">
                <button
                  onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium py-1 px-2 rounded-md hover:bg-slate-700/70 transition-colors"
                >
                  {showAdvancedDetails ? t('adviceCard.hideAdvancedDetails') : t('adviceCard.showAdvancedDetails')}
                </button>
                {showAdvancedDetails && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{advice.detailedMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-700/70 text-right">
        {t('adviceCard.analyzedAt')} {advice.timestamp.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })} - {advice.timestamp.toLocaleDateString(language)}
      </p>
    </div>
  );
};

export default AdviceCard;