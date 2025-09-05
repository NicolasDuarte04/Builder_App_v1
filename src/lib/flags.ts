export const FLAGS = {
  enrichedCatalog: process.env.NEXT_PUBLIC_FLAG_ENRICHED_CATALOG === '1',
  newSearchRanking: process.env.NEXT_PUBLIC_FLAG_NEW_SEARCH_RANKING === '1',
} as const;


