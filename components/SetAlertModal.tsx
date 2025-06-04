
import React, { useState, useEffect } from 'react';
import { AlertConditionType } from '../types'; 
import { useLanguage } from '../contexts/LanguageContext';

interface SetAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetAlert: (targetPrice: number, condition: AlertConditionType) => void;
  currentPrice: number;
  cryptoName: string;
  cryptoSymbol: string;
}

const SetAlertModal: React.FC<SetAlertModalProps> = ({ 
  isOpen, 
  onClose, 
  onSetAlert, 
  currentPrice, 
  cryptoName,
  cryptoSymbol
}) => {
  const { t } = useLanguage();
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [condition, setCondition] = useState<AlertConditionType>(AlertConditionType.PRICE_DROPS_TO);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const formattedPrice = currentPrice > 0 
        ? currentPrice.toFixed(currentPrice < 1 ? 4 : 2) 
        : '';
      setTargetPrice(formattedPrice);
      setCondition(AlertConditionType.PRICE_DROPS_TO); 
      setError('');
    }
  }, [isOpen, currentPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError(t('setAlertModal.errorInvalidPrice'));
      return;
    }
    if (condition === AlertConditionType.PRICE_DROPS_TO && price >= currentPrice) {
      setError(t('setAlertModal.errorDropPriceHigher'));
      return;
    }
    if (condition === AlertConditionType.PRICE_RISES_TO && price <= currentPrice) {
      setError(t('setAlertModal.errorRisePriceLower'));
      return;
    }
    onSetAlert(price, condition);
  };

  if (!isOpen) return null;

  const formatDisplayPrice = (price: number): string => {
    if (!price && price !==0) return 'N/A';
    if (price < 0.000001 && price !== 0) return price.toFixed(8);
    if (price < 0.001 && price !== 0) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  }

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300 ease-in-out"
         aria-labelledby="modal-title"
         role="dialog"
         aria-modal="true">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg border border-slate-700">
        <h2 id="modal-title" className="text-2xl font-semibold mb-2 text-cyan-400">
          {t('setAlertModal.title', { cryptoName, cryptoSymbol })}
        </h2>
        <p className="text-sm text-slate-400 mb-6">{t('setAlertModal.currentPriceLabel')} ${formatDisplayPrice(currentPrice)}</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="targetPrice" className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('setAlertModal.targetPriceLabel')}
            </label>
            <input
              type="number"
              id="targetPrice"
              value={targetPrice}
              onChange={(e) => {
                setTargetPrice(e.target.value);
                setError('');
              }}
              onWheel={(e) => (e.target as HTMLInputElement).blur()} 
              step="any"
              className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-slate-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('setAlertModal.alertConditionLabel')}</label>
            <div className="space-y-3">
              <div className="flex items-center p-3 rounded-lg bg-slate-700/70 border border-slate-600/50 hover:border-cyan-600 transition-colors has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-950/30">
                <input 
                  type="radio" 
                  id="dropsTo" 
                  name="condition" 
                  value={AlertConditionType.PRICE_DROPS_TO} 
                  checked={condition === AlertConditionType.PRICE_DROPS_TO}
                  onChange={() => setCondition(AlertConditionType.PRICE_DROPS_TO)}
                  className="h-4 w-4 text-cyan-500 focus:ring-cyan-500 border-slate-500 bg-slate-600 cursor-pointer"
                />
                <label htmlFor="dropsTo" className="ml-3 block text-sm text-slate-200 cursor-pointer">
                  {t('setAlertModal.conditionDropsToLabel', { buyOpportunity: `<span class="font-semibold text-emerald-400">${t('setAlertModal.buyOpportunity')}</span>`})}
                </label>
              </div>
              <div className="flex items-center p-3 rounded-lg bg-slate-700/70 border border-slate-600/50 hover:border-cyan-600 transition-colors has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-950/30">
                <input 
                  type="radio" 
                  id="risesTo" 
                  name="condition" 
                  value={AlertConditionType.PRICE_RISES_TO}
                  checked={condition === AlertConditionType.PRICE_RISES_TO}
                  onChange={() => setCondition(AlertConditionType.PRICE_RISES_TO)}
                  className="h-4 w-4 text-cyan-500 focus:ring-cyan-500 border-slate-500 bg-slate-600 cursor-pointer"
                />
                <label htmlFor="risesTo" className="ml-3 block text-sm text-slate-200 cursor-pointer">
                   {t('setAlertModal.conditionRisesToLabel', { sellOpportunity: `<span class="font-semibold text-rose-400">${t('setAlertModal.sellOpportunity')}</span>`})}
                </label>
              </div>
            </div>
          </div>
          
          {error && <p className="text-rose-400 text-sm -mt-2 mb-3 text-center">{error}</p>}

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-100 transition-colors font-medium w-full sm:w-auto shadow-sm hover:shadow-md"
            >
              {t('setAlertModal.buttonCancel')}
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-colors w-full sm:w-auto shadow-md hover:shadow-lg"
            >
              {t('setAlertModal.buttonSetAlert')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetAlertModal;