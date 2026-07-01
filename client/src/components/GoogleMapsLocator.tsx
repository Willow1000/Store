import { useEffect, useRef } from 'react';

type StoreLocatorElement = HTMLElement & {
  configureFromQuickBuilder?: (config: unknown) => void;
};

const EXTENDED_COMPONENT_LIBRARY_SRC =
  'https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.15/index.min.js';

const MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyDqTomDyT4kx1vag6aYDfTNHF4gZRbIUJc';

const LOCATOR_CONFIG = {
  locations: [
    {
      title: 'MotorVault',
      address1: 'Nijverheidsweg 27',
      address2: 'Heinenoord, Netherlands',
      coords: { lat: 51.8146575, lng: 4.5248489 },
      placeId: 'ChIJc1_jJvjLxUcRg1eYeu9wEPo',
    },
  ],
  mapOptions: {
    center: { lat: 38.0, lng: -100.0 },
    fullscreenControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    zoom: 4,
    zoomControl: true,
    maxZoom: 17,
    mapId: '',
  },
  mapsApiKey: MAPS_API_KEY,
  capabilities: {
    input: false,
    autocomplete: false,
    directions: false,
    distanceMatrix: false,
    details: false,
    actions: false,
  },
};

function ensureGoogleMapsLocatorScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${EXTENDED_COMPONENT_LIBRARY_SRC}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps locator script')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = EXTENDED_COMPONENT_LIBRARY_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps locator script'));
    document.head.appendChild(script);
  });
}

export function GoogleMapsLocator() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        await ensureGoogleMapsLocatorScript();
        await customElements.whenDefined('gmpx-store-locator');
        if (!mounted || !rootRef.current) return;

        const root = rootRef.current;
        root.replaceChildren();

        const loader = document.createElement('gmpx-api-loader');
        loader.setAttribute('key', MAPS_API_KEY);
        loader.setAttribute('solution-channel', 'GMP_QB_locatorplus_v11_c');

        const locator = document.createElement('gmpx-store-locator') as StoreLocatorElement;
        locator.setAttribute('map-id', 'DEMO_MAP_ID');
        locator.style.width = '100%';
        locator.style.height = '100%';

        root.appendChild(loader);
        root.appendChild(locator);

        if (locator.configureFromQuickBuilder) {
          locator.configureFromQuickBuilder(LOCATOR_CONFIG);
        }
      } catch (err) {
        console.error('Unable to initialize Google Maps locator', err);
      }
    };

    void setup();

    return () => {
      mounted = false;
    };
  }, []);

  return <div ref={rootRef} className="h-full w-full" />;
}
