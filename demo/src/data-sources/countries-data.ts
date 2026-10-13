export interface CountryOption {
  label: string;
  value: string;
  region: string;
}

export const REGIONS = ['europe', 'asia', 'americas', 'africa', 'oceania'] as const;

const COUNTRIES_BY_REGION: Record<(typeof REGIONS)[number], Array<[string, string]>> = {
  europe: [
    ['Poland', 'PL'],
    ['Germany', 'DE'],
    ['France', 'FR'],
    ['Spain', 'ES'],
    ['Italy', 'IT'],
    ['Sweden', 'SE'],
    ['Norway', 'NO'],
    ['Netherlands', 'NL'],
  ],
  asia: [
    ['Japan', 'JP'],
    ['India', 'IN'],
    ['South Korea', 'KR'],
    ['Singapore', 'SG'],
    ['Vietnam', 'VN'],
    ['Thailand', 'TH'],
  ],
  americas: [
    ['United States', 'US'],
    ['Canada', 'CA'],
    ['Brazil', 'BR'],
    ['Mexico', 'MX'],
    ['Argentina', 'AR'],
    ['Chile', 'CL'],
  ],
  africa: [
    ['Nigeria', 'NG'],
    ['Kenya', 'KE'],
    ['South Africa', 'ZA'],
    ['Egypt', 'EG'],
    ['Morocco', 'MA'],
  ],
  oceania: [
    ['Australia', 'AU'],
    ['New Zealand', 'NZ'],
    ['Fiji', 'FJ'],
  ],
};

export const COUNTRIES: readonly CountryOption[] = REGIONS.flatMap((region) =>
  COUNTRIES_BY_REGION[region].map(([label, value]) => ({ label, value, region })),
);
