// Utility to fetch geolocation data from ipgeolocation.io

export interface GeolocationData {
  ip: string;
  location: {
    continent_code: string;
    continent_name: string;
    country_code2: string;
    country_code3: string;
    country_name: string;
    country_name_official: string;
    country_capital: string;
    state_prov: string;
    state_code: string;
    district: string;
    city: string;
    zipcode: string;
    latitude: string;
    longitude: string;
    is_eu: boolean;
    country_flag: string;
    geoname_id: string;
    country_emoji: string;
  };
  country_metadata: {
    calling_code: string;
    tld: string;
    languages: string[];
  };
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  asn: {
    as_number: string;
    organization: string;
    country: string;
  };
  time_zone: any;
}

export async function fetchGeolocation(ip?: string): Promise<GeolocationData | null> {
  const apiKey = '991a9e6eefd54dbb91b0bf82625a48c2';
  let url = `https://api.ipgeolocation.io/v3/ipgeo?apiKey=${apiKey}`;
  if (ip) url += `&ip=${encodeURIComponent(ip)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}
