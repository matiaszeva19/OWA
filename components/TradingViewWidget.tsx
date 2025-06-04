import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string; // e.g., COINBASE:BTCUSD
  theme?: 'light' | 'dark';
  locale?: string;
  width?: string | number;
  height?: string | number;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  theme = 'dark',
  locale = 'es',
  width = '100%',
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null); // To store the widget instance if needed for cleanup

  useEffect(() => {
    if (!containerRef.current || !window.TradingView || typeof window.TradingView.widget !== 'function') {
      console.warn('TradingView library not loaded or container not available.');
      const checkInterval = setInterval(() => {
        if (window.TradingView && typeof window.TradingView.widget === 'function') {
          clearInterval(checkInterval);
          // Retry initialization, though this simple version doesn't explicitly do it.
          // For robustness, one might add a state to trigger re-render or re-init.
        }
      }, 500); // Check every 500ms
      return () => clearInterval(checkInterval);
    }

    // Ensure the container is empty before creating a new widget
    // This is important if the component re-renders with different symbols
    if (containerRef.current) {
        containerRef.current.innerHTML = '';
    }
    
    const widgetOptions = {
      symbol: symbol,
      theme: theme,
      locale: locale,
      width: width,
      height: height,
      autosize: true, // Let the widget try to fit its container
      interval: "D", // Daily interval
      timezone: "Etc/UTC",
      style: "1", // Style type
      toolbar_bg: theme === 'dark' ? "#131722" : "#f1f3f6", // Match theme
      enable_publishing: false,
      hide_top_toolbar: false, // Show basic toolbar (symbol, interval)
      hide_legend: true,
      allow_symbol_change: false, // Prevent user from changing symbol in this widget
      save_image: false,
      container_id: containerRef.current.id,
      show_popup_button: false, // No "open in new tab" button
      popup_width: "1000",
      popup_height: "650",
    };
    
    // Using a unique ID for each widget instance
    containerRef.current.id = `tradingview-widget-${symbol}-${Math.random().toString(36).substr(2, 9)}`;
    widgetOptions.container_id = containerRef.current.id;


    if (window.TradingView && typeof window.TradingView.widget === 'function') {
         widgetRef.current = new window.TradingView.widget(widgetOptions);
    }


    // Cleanup function: TradingView widgets might not have a direct 'destroy' method
    // available or documented for all widget types. Removing the container's content
    // is a common way to handle cleanup in React.
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''; // Clear the widget on unmount
      }
      widgetRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, theme, locale, width, height]); // Re-run if these critical props change

  return <div ref={containerRef} style={{ width, height }} className="tradingview-widget-container-wrapper"></div>;
};

// Memoize to prevent re-renders if props haven't changed, especially important for externally loaded scripts
export default memo(TradingViewWidget);
