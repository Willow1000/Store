import { useEffect, useRef, useState } from 'react';

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
  const [shouldLoadScript, setShouldLoadScript] = useState(false);

  useEffect(() => {
    if (!containerRef.current || shouldLoadScript) return;

    const scheduleLoad = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => setShouldLoadScript(true), { timeout: 2000 });
        return;
      }
      globalThis.setTimeout(() => setShouldLoadScript(true), 600);
    };

    if (!('IntersectionObserver' in window)) {
      scheduleLoad();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry || !entry.isIntersecting) return;
        observer.disconnect();
        scheduleLoad();
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldLoadScript]);

  useEffect(() => {
    if (!containerRef.current || !shouldLoadScript) return;

    const container = containerRef.current;
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = getTrustedScriptURL(SCRIPT_SRC);
      script.onload = () => {
        if (typeof window.renderTrustindexWidgets === 'function') {
          window.renderTrustindexWidgets();
        }
      };
      container.appendChild(script);
      return;
    }

    if (typeof window.renderTrustindexWidgets === 'function') {
      window.renderTrustindexWidgets();
      return;
    }

    const onLoad = () => {
      if (typeof window.renderTrustindexWidgets === 'function') {
        window.renderTrustindexWidgets();
      }
    };
    existingScript.addEventListener('load', onLoad);
    return () => existingScript.removeEventListener('load', onLoad);
  }, [shouldLoadScript]);

  return <div ref={containerRef} className="trustindex-widget" />;
}
