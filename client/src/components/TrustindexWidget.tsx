import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    renderTrustindexWidgets?: () => void;
  }
}

const SCRIPT_ID = 'trustindex-loader-script-073ba8375c346572929604423c7';
const SCRIPT_SRC = 'https://cdn.trustindex.io/loader.js?073ba8375c346572929604423c7';

export function TrustindexWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = SCRIPT_SRC;
      container.appendChild(script);
      return;
    }

    // If the loader is already present, ask it to scan for new widget placeholders.
    if (typeof window.renderTrustindexWidgets === 'function') {
      window.renderTrustindexWidgets();
    }
  }, []);

  return <div ref={containerRef} className="trustindex-widget" />;
}
