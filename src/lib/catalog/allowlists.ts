export const AllowedProducts = [
  "auto",
  "health",
  "home",
  "travel",
  "life",
  "pet",
  "dental",
] as const;

export const AllowedCountries = [
  "MX",
  "CO",
  "CL",
  "PE",
  "AR",
  "US",
] as const; // extend if needed

export const AllowedCurrencies = [
  "MXN",
  "COP",
  "CLP",
  "PEN",
  "ARS",
  "USD",
] as const;

// Canonical coverage keys to encourage consistent JSON
export const CoverageKeys = [
  // cross-product common
  "medical",
  "hospital",
  "emergency",
  "ambulance",
  "telemedicine",
  // auto-specific
  "third_party_liability",
  "collision",
  "theft",
  "windscreen",
  "roadside_assistance",
  // travel-specific
  "trip_cancellation",
  "baggage_loss",
  "repatriation",
  "travel_delay",
  // home-specific
  "structure",
  "contents",
  "liability",
  "earthquake",
  "flood",
  // health-specific
  "outpatient",
  "inpatient",
  "maternity",
  "pharmacy",
] as const;

export type AllowedProduct = typeof AllowedProducts[number];
export type AllowedCountry = typeof AllowedCountries[number];
export type AllowedCurrency = typeof AllowedCurrencies[number];

// Preferred carriers for seeding/QA per product+country
export const PreferredCarriers: Record<string, string[]> = {
  'auto|CO': [
    'SURA',
    'Seguros SURA',
    'Seguros Bolívar',
    'MAPFRE',
    'AXA Colpatria',
    'Allianz',
    'Liberty',
    'HDI',
    'HDI Seguros',
  ],
};

