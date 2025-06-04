
import React, { useState, useEffect, useRef } from 'react';
import { AppView } from '../types';
import { SparklesIcon, ChevronDownIcon, ChatBubbleOvalLeftEllipsisIcon } from './icons'; 
import { useLanguage } from '../contexts/LanguageContext';

// Simple UsersIcon as a placeholder
const UsersIconPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.247-3.345A6.375 6.375 0 0 1 12 12.75a6.375 6.375 0 0 1-3.248-.915m6.496 0a4.5 4.5 0 0 1-.88 2.644M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);


interface NavigationBarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ currentView, setCurrentView }) => {
  const { t, language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    {
      view: AppView.MAIN_ANALYSIS,
      labelKey: 'navigation.mainAnalysis',
      icon: <SparklesIcon className="w-5 h-5 mr-2 flex-shrink-0" />,
    },
    {
      view: AppView.EXPERT_TRADERS,
      labelKey: 'navigation.expertTraders',
      icon: <UsersIconPlaceholder className="w-5 h-5 mr-2 flex-shrink-0" />,
    },
    {
      view: AppView.CRYPTO_X,
      labelKey: 'navigation.cryptoX',
      icon: <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 mr-2 flex-shrink-0" />,
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNavItemClick = (view: AppView) => {
    setCurrentView(view);
    setIsOpen(false);
  };

  return (
    <nav className="mb-6 md:mb-8 sticky top-2 z-50 flex justify-center" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 font-medium py-2.5 px-4 rounded-lg shadow-md flex items-center justify-center transition-colors duration-200"
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-controls="nav-menu"
        >
          {t('navigation.menuButton')}
          <ChevronDownIcon className={`w-5 h-5 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            id="nav-menu"
            className="absolute top-full mt-2 w-72 sm:w-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-60 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:min-w-[260px] max-h-[70vh] overflow-y-auto"
            role="menu"
          >
            <ul>
                {navItems.map((item) => (
                <li key={item.view} role="none">
                    <button
                    onClick={() => handleNavItemClick(item.view)}
                    className={`w-full flex items-center px-4 py-2.5 text-sm sm:text-base transition-all duration-200 ease-in-out
                        ${
                        currentView === item.view
                            ? 'bg-cyan-500 text-white'
                            : 'text-slate-300 hover:bg-cyan-600 hover:text-white'
                        }`}
                    role="menuitem"
                    aria-current={currentView === item.view ? 'page' : undefined}
                    >
                    {item.icon}
                    <span className="truncate">{t(item.labelKey)}</span>
                    </button>
                </li>
                ))}
            </ul>
            <div className="border-t border-slate-700 my-1"></div>
            <div className="flex justify-around p-2">
                <button
                    onClick={() => { setLanguage('es'); setIsOpen(false); }}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${language === 'es' ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                    {t('navigation.languageSelectorES')}
                </button>
                <button
                    onClick={() => { setLanguage('en'); setIsOpen(false); }}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${language === 'en' ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                    {t('navigation.languageSelectorEN')}
                </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationBar;