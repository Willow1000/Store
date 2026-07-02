import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    renderTrustindexWidgets?: () => void;
  }
}

const SCRIPT_ID = 'trustindex-loader-script-073ba8375c346572929604423c7';
const SCRIPT_SRC = 'https://cdn.trustindex.io/loader.js?073ba8375c346572929604423c7';

function getTrustedScriptURL(url: string): string {
  if (typeof window === 'undefined' || !(window as any).trustedTypes) {
    return url;
  }

  const trustedTypes = (window as any).trustedTypes;
  let policy = typeof trustedTypes.getPolicy === 'function'
    ? trustedTypes.getPolicy('trustindex-loader')
    : null;

  if (!policy && typeof trustedTypes.createPolicy === 'function') {
    policy = trustedTypes.createPolicy('trustindex-loader', {
      createScriptURL: (input: string) => input,
    });
  }

  return policy?.createScriptURL ? policy.createScriptURL(url) : url;
}

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
      script.src = getTrustedScriptURL(SCRIPT_SRC);
      container.appendChild(script);
      return;
    }

    if (typeof window.renderTrustindexWidgets === 'function') {
      window.renderTrustindexWidgets();
    }
  }, []);

  return <div ref={containerRef} className="trustindex-widget" />;
}
