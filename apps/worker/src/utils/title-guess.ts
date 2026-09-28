/**
 * Cheap regex pass on raw job title to extract rough guesses for company, role, and city.
 * Used exclusively for Stage-A deduplication pre-filtering.
 */
export function extractTitleGuesses(title: string): {
  companyGuess?: string;
  roleGuess?: string;
  cityGuess?: string;
} {
  if (!title) return {};

  let cleaned = title
    .replace(/[🎯📅🔗📍🏢💬📱📘⭐]/g, "")
    .replace(/\s*\|\s*Apply Now.*$/i, "")
    .replace(/\s*\|\s*Apply Online.*$/i, "")
    .replace(/\s*\|\s*Click Here.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  let company: string | undefined;
  let role: string | undefined;
  let city: string | undefined;

  // Check for common Indian tech cities
  const cities = ["Bangalore", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Noida", "Gurgaon", "Gurugram", "Mumbai", "Delhi", "Kolkata", "Remote", "India"];
  for (const c of cities) {
    if (new RegExp(`\\b${c}\\b`, "i").test(title)) {
      city = c;
      break;
    }
  }

  // Pattern 1: "Company Off Campus ... Hiring [for/Freshers] Role"
  const m1 = cleaned.match(/^([A-Za-z0-9\s&.]+?)\s+(?:Off\s*Campus|Recruitment|Drive|Careers|Hiring)\b.*?\b(?:Hiring\s+(?:for\s+|Freshers\s+)?|for\s+)(.+?)(?:\s+in\s+([A-Za-z\s]+))?$/i);
  if (m1) {
    company = m1[1].trim();
    role = m1[2]
      .replace(/\b(Freshers|Fresher|202[0-9]|Batch|Apply Now)\b/gi, "")
      .replace(/^(?:for\s+|hiring\s+)+/i, "")
      .trim();
  }

  // Pattern 2: "Company Off Campus Drive 2026 - Role – Freshers"
  if (!company || !role) {
    const m2 = cleaned.match(/^([A-Za-z0-9\s&.]+?)\s+(?:Off\s*Campus|Recruitment|Drive|Careers)\b[^-–—|]*[-–—|]\s*(.+?)(?:[-–—|].*)?$/i);
    if (m2) {
      company = m2[1].trim();
      role = m2[2]
        .replace(/\b(Freshers|Fresher|202[0-9]|Batch|Apply Now)\b/gi, "")
        .replace(/^(?:for\s+|hiring\s+)+/i, "")
        .trim();
    }
  }

  // Pattern 3: "Company | Role | City"
  if (!company || !role) {
    const parts = cleaned.split(/[-–—|]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      company = parts[0]
        .replace(/\b(Off Campus|Drive|Recruitment|Hiring|Careers|202[0-9])\b/gi, "")
        .trim();
      role = parts[1]
        .replace(/\b(Off Campus|Drive|Recruitment|Hiring|Freshers|Fresher|202[0-9])\b/gi, "")
        .replace(/^(?:for\s+|hiring\s+)+/i, "")
        .trim();
      if (!city && parts.length >= 3) {
        city = parts[2].trim();
      }
    }
  }

  return {
    companyGuess: company || undefined,
    roleGuess: role || undefined,
    cityGuess: city || undefined,
  };
}
