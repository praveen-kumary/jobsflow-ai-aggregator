export interface DuplicateCandidate {
  id: string;
  company: string;
  role: string;
  city: string[];
  batchYears: string[];
  descriptionSnippet?: string;
}

export interface RawJobWithCandidates {
  id: string;
  rawTitle: string;
  rawHtml: string;
  sourceCategoryTags: string[];
  duplicateCandidates: DuplicateCandidate[];
  applyPageDescription?: string;
}

export interface CategoryAliasMatch {
  canonicalType: "batchYear" | "degree" | "city" | "jobType" | "functionalArea";
  canonicalValue: string;
  confidence: number;
}
