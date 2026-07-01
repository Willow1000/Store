import { useEffect, useRef, useState } from 'react';

type StoreLocatorElement = HTMLElement & {
  configureFromQuickBuilder?: (config: unknown) => void;
};

const EXTENDED_COMPONENT_LIBRARY_SRC =
  'https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.15/index.min.js';

const MAPS_API_KEY = String(
  import.meta.env.GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
).trim();
const MAPS_MAP_ID = String(
  import.meta.env.GOOGLE_MAPS_MAP_ID || import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || ''
).trim();
const GOOGLE_MAPS_PLACE_LINK = 'https://maps.google.com/?q=Nijverheidsweg+27,+Heinenoord,+Netherlands';
// Explicit opt-in keeps local/dev clean when API billing/key restrictions are not ready.
const MAPS_TOGGLE = String(import.meta.env.VITE_GOOGLE_MAPS_ENABLED || '').trim().toLowerCase();
const MAPS_ENABLED = MAPS_TOGGLE ? MAPS_TOGGLE === 'true' : MAPS_API_KEY.length > 0;

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
    // Force raster to avoid WebGL/3D context crashes on unsupported devices.
    renderingType: 'RASTER',
    ...(MAPS_MAP_ID ? { mapId: MAPS_MAP_ID } : {}),
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!MAPS_ENABLED) return;

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
        if (MAPS_MAP_ID) {
          locator.setAttribute('map-id', MAPS_MAP_ID);
        }
        locator.style.width = '100%';
        locator.style.height = '100%';

        root.appendChild(loader);
        root.appendChild(locator);

        if (locator.configureFromQuickBuilder) {
          locator.configureFromQuickBuilder(LOCATOR_CONFIG);
        }
      } catch (err) {
        console.error('Unable to initialize Google Maps locator', err);
        if (mounted) {
          setLoadError('Map preview is unavailable right now.');
        }
      }
    };

    void setup();

    return () => {
      mounted = false;
    };
  }, []);

  if (!MAPS_ENABLED || loadError) {
    return (
      <div className="h-full w-full rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col justify-center">
        <p className="text-sm text-gray-700 font-medium">MotorVault</p>
        <p className="text-sm text-gray-600">Nijverheidsweg 27, Heinenoord, Netherlands</p>
        {loadError ? <p className="mt-2 text-xs text-gray-500">{loadError}</p> : null}
        <a
          href={GOOGLE_MAPS_PLACE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-fit items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Open in Google Maps
        </a>
      </div>
    );
  }

  return <div ref={rootRef} className="h-full w-full" />;
}
