export type Related = { keyword: string; pc: number | null; mobile: number | null; total: number | null; adCompetition: string; relevance: number; blogTotal?: number | null };
export type TrendPoint = { label: string; value: number };
export type SearchResult = {
  keyword: string;
  summary: { pc: number | null; mobile: number | null; total: number | null; blogTotal: number | null;
    recentCount: number | null; recentCapped: boolean; recentScanned: number; recentError?: string;
    adCompetition: string; recentRatio: number | null; };
  related: Related[];
  posts: { title: string; link: string; description: string; postdate: string }[];
  trend: { monthly: TrendPoint[]; weekday: TrendPoint[]; error?: string };
  searchedAt: string;
  warnings: string[];
};
