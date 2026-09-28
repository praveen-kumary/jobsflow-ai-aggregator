/**
 * Monogram Generator
 * 
 * Generates SVG monogram fallback logos for companies.
 * Deterministic colors based on company name hash.
 * Returns inline SVG data URI — always works, no external deps.
 */

// Curated palette — vibrant but professional, distinct from each other
const MONOGRAM_COLORS = [
  "#2563EB", // blue
  "#7C3AED", // violet
  "#DB2777", // pink
  "#DC2626", // red
  "#EA580C", // orange
  "#CA8A04", // amber
  "#16A34A", // green
  "#0D9488", // teal
  "#0891B2", // cyan
  "#4F46E5", // indigo
  "#9333EA", // purple
  "#C026D3", // fuchsia
  "#059669", // emerald
  "#0284C7", // sky
  "#1D4ED8", // blue-darker
  "#6D28D9", // violet-darker
];

/**
 * Simple deterministic hash of a string to pick a consistent color
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Extract 1-2 letter initials from a company name.
 * "Tata Consultancy Services" → "TC"
 * "HCL" → "HC"
 * "A" → "A"
 */
function getInitials(companyName: string): string {
  const words = companyName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return "?";
  if (words.length === 1) {
    // Single word — take first two chars if long enough
    return words[0].substring(0, 2).toUpperCase();
  }
  // Multiple words — first letter of first two
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generate an SVG monogram as a data URI string.
 * Deterministic: same company name always produces the same color + initials.
 */
export function generateMonogramDataUri(companyName: string): string {
  const svg = generateMonogramSvg(companyName);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate raw SVG string for a monogram.
 */
export function generateMonogramSvg(companyName: string, size: number = 128): string {
  const initials = getInitials(companyName);
  const colorIndex = hashString(companyName.toLowerCase()) % MONOGRAM_COLORS.length;
  const bgColor = MONOGRAM_COLORS[colorIndex];
  const fontSize = initials.length === 1 ? size * 0.5 : size * 0.4;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${bgColor}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
    font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
    font-weight="700" font-size="${fontSize}" fill="white"
    letter-spacing="1">${initials}</text>
</svg>`;
}

export { getInitials, hashString, MONOGRAM_COLORS };
