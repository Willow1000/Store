import { useEffect } from 'react';

const SCRIPT_ID = 'blootrue-platform-js';
const SCRIPT_SRC = 'https://api.blootrue.com/api/widgets/platform.js';
const WIDGET_CLASS = 'blootrue-widget-4KMJ5Vs1p_2V';

function ensureBlootrueScript(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

export function BlootrueWidget() {
  useEffect(() => {
    ensureBlootrueScript();
  }, []);

  return <div className={WIDGET_CLASS} />;
}

export const TrustindexWidget = BlootrueWidget;
