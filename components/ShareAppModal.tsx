
import React, { useState, useEffect } from 'react';
import { XCircleIcon, ShareIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose, appUrl }) => {
  const { t } = useLanguage();
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (navigator.share) {
      setCanNativeShare(true);
    }
  }, []);

  const handleNativeShare = async () => {
    if (appUrl.startsWith('file:')) {
      alert(t('shareAppModal.shareErrorFileProtocol'));
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('general.appName'),
          text: t('shareAppModal.shareTextGeneric'),
          url: appUrl,
        });
      } catch (error) {
        if ((error as DOMException).name !== 'AbortError') {
          console.error('Error using Web Share API:', error);
          alert(t('shareAppModal.shareErrorGeneric'));
        }
      }
    } else {
      alert(t('shareAppModal.shareNotAvailableAlert'));
    }
  };

  if (!isOpen) return null;
  
  const shareIconHTML = `<ShareIcon class="w-3 h-3 sm:w-4 sm:h-4 inline-block relative -top-0.5" />`;

  return (
    <div
      className="fixed inset-0 bg-slate-900 bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300 ease-in-out"
      aria-labelledby="share-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700 relative transform transition-all duration-300 ease-out scale-95 group-hover:scale-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors z-20"
          aria-label={t('shareAppModal.closeModalLabel')}
        >
          <XCircleIcon className="w-7 h-7" />
        </button>

        <h2 id="share-modal-title" className="text-2xl sm:text-3xl font-semibold mb-6 text-cyan-400 text-center">
          {t('shareAppModal.title')}
        </h2>

        <div className="space-y-6 text-slate-300 text-sm sm:text-base">
          {canNativeShare && (
            <>
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg text-base"
              >
                <ShareIcon className="w-5 h-5" />
                {t('shareAppModal.buttonShareDirectly')}
              </button>
              <p className="text-xs text-center text-slate-400 -mt-3">
                {t('shareAppModal.shareNativeHelpText')}
              </p>
            </>
          )}
          
          {(canNativeShare) && <hr className="my-6 border-slate-700/60" />}


          <div>
            <h3 className="font-semibold text-xl text-slate-100 mb-3">{t('shareAppModal.installAppTitle')}</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-md text-slate-200 mb-1">{t('shareAppModal.installMobileTitle')}</h4>
                <p className="mb-1 text-xs sm:text-sm">{t('shareAppModal.installMobileStep1')}</p>
                <p className="mb-1 text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: t('shareAppModal.installMobileStep2', { shareIcon: shareIconHTML }) }}></p>
                <p className="text-xs sm:text-sm">{t('shareAppModal.installMobileStep3')}</p>
              </div>
              <div>
                <h4 className="font-medium text-md text-slate-200 mb-1">{t('shareAppModal.installDesktopTitle')}</h4>
                <p className="mb-1 text-xs sm:text-sm">{t('shareAppModal.installDesktopStep1')}</p>
                <p className="mb-1 text-xs sm:text-sm">{t('shareAppModal.installDesktopStep2')}</p>
                <p className="text-xs sm:text-sm">{t('shareAppModal.installDesktopStep3')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('shareAppModal.installDesktopAlt')}</p>
              </div>
            </div>
          </div>
          
          {!canNativeShare && (
             <p className="text-sm text-slate-400 mt-4 p-3 bg-slate-850 border border-slate-700 rounded-lg">
                {t('shareAppModal.shareNotAvailable')}
            </p>
          )}


          <div className="pt-4 border-t border-slate-700/60">
            <p className="text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: t('shareAppModal.shareNote') }}></p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full px-5 py-3 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-100 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          {t('shareAppModal.buttonClose')}
        </button>
      </div>
    </div>
  );
};

export default ShareAppModal;