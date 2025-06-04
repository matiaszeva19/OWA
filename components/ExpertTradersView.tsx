
import React, { useEffect, useRef } from 'react';
import { ExpertTrader } from '../types'; 
import { useLanguage } from '../contexts/LanguageContext';

// Declare twttr object from Twitter's widgets.js
declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
        createTimeline: (
          options: any,
          targetEl: HTMLElement,
          // eslint-disable-next-line @typescript-eslint/ban-types
          callback?: Function
        ) => Promise<HTMLElement | undefined>;
      };
    };
  }
}

const expertTradersData: (Omit<ExpertTrader, 'description'> & { descriptionKey: string })[] = [
  { name: 'Vitalik Buterin', twitterHandle: 'VitalikButerin', descriptionKey: 'expertTradersView.vitalikDescription' },
  { name: 'Michael Saylor', twitterHandle: 'saylor', descriptionKey: 'expertTradersView.saylorDescription' },
  { name: 'Cobie', twitterHandle: 'cobie', descriptionKey: 'expertTradersView.cobieDescription' },
  { name: 'Raoul Pal', twitterHandle: 'RaoulGMI', descriptionKey: 'expertTradersView.raoulDescription' },
  { name: 'Willy Woo', twitterHandle: 'woonomic', descriptionKey: 'expertTradersView.willyDescription' },
];


const ExpertTradersView: React.FC = () => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const expertTraders: ExpertTrader[] = React.useMemo(() => 
    expertTradersData.map(trader => ({
      name: trader.name,
      twitterHandle: trader.twitterHandle,
      description: t(trader.descriptionKey)
    })), [t]
  );


  useEffect(() => {
    if (window.twttr && window.twttr.widgets && typeof window.twttr.widgets.load === 'function') {
      if (containerRef.current) {
        window.twttr.widgets.load(containerRef.current);
      } else {
        window.twttr.widgets.load();
      }
    }
  }, []); 

  return (
    <div className="mt-6 md:mt-8" ref={containerRef}>
      <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-cyan-400 text-center">
        {t('expertTradersView.title')}
      </h2>
      <p className="text-sm text-slate-400 mb-8 text-center max-w-2xl mx-auto">
        {t('expertTradersView.description')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {expertTraders.map((trader) => (
          <div key={trader.twitterHandle} className="bg-slate-900 p-4 rounded-xl shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-1">{trader.name}</h3>
            <p className="text-xs text-cyan-400 mb-3">@{trader.twitterHandle}</p>
            {trader.description && <p className="text-xs text-slate-400 mb-3">{trader.description}</p>}
            <div className="rounded-lg overflow-hidden min-h-[400px] max-h-[500px] bg-slate-800 twitter-timeline-container">
              <a
                className="twitter-timeline"
                data-theme="dark" 
                data-height="450" 
                data-chrome="noheader nofooter noborders" 
                href={`https://twitter.com/${trader.twitterHandle}?ref_src=twsrc%5Etfw`}
              >
                Tweets by @{trader.twitterHandle}
              </a>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-10 text-center">
        {t('expertTradersView.note')}
      </p>
    </div>
  );
};

export default ExpertTradersView;
