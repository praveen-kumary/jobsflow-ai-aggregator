import * as cheerio from "cheerio";

// Blacklist of domains that are ads, affiliate courses, social, telegram, or aggregator loops
export const BLACKLISTED_DOMAINS = [
  // Course / Bootcamp / EdTech affiliate marketers
  "acciojob.com",
  "scaler.com",
  "newtonschool.co",
  "masaischool.com",
  "simplilearn.com",
  "greatlearning.in",
  "coursera.org",
  "udemy.com",
  "unacademy.com",
  "prepinsta.com",
  "geeksforgeeks.org",
  "leetcode.com",
  "topmate.io",
  "instamojo.com",
  "gumroad.com",
  "testbook.com",
  "byjus.com",
  "vedantu.com",
  "upgrad.com",
  "internshala.com", // Often training courses
  
  // Messaging / Social groups
  "whatsapp.com",
  "chat.whatsapp.com",
  "telegram.me",
  "telegram.org",
  "t.me",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "discord.gg",
  "discord.com",

  // URL shorteners / Ad networks
  "bit.ly",
  "tinyurl.com",
  "cutt.ly",
  "linktr.ee",
  "doubleclick.net",
  "googleadservices.com",
  "googlesyndication.com",
  "google.com",
  "amazon.in",
  "amazon.com",
  "flipkart.com",

  // Aggregator loop domains
  "fresherstech.com",
  "jobsnet.in",
  "offcampusjobs4u.com",
  "freshershunt.in",
  "yohire.in",
  "yohire.com",
];

// Verified enterprise ATS and recruiting platforms
export const ATS_DOMAINS = [
  "myworkdayjobs.com",
  "greenhouse.io",
  "lever.co",
  "smartrecruiters.com",
  "taleo.net",
  "icims.com",
  "eightfold.ai",
  "successfactors.com",
  "successfactors.eu",
  "oraclecloud.com",
  "zoho.com",
  "darwinbox.in",
  "ashbyhq.com",
  "workable.com",
  "phenompeople.com",
  "brassring.com",
  "recruitee.com",
  "bamboohr.com",
  "ultipro.com",
  "adp.com",
  "jobvite.com",
  "ripplehire.com",
];

export interface CandidateLink {
  href: string;
  text: string;
  score: number;
  reasons: string[];
}

/**
 * Intelligently extracts the direct, authentic corporate application URL
 * from scraped HTML while strictly rejecting ad/affiliate/course links.
 */
export function extractBestApplyUrl(
  rawHtml: string,
  sourceUrl?: string,
  companyGuess?: string | null
): string {
  if (!rawHtml) return sourceUrl || "https://careers.example.com/apply";

  const $ = cheerio.load(rawHtml);
  const candidates: CandidateLink[] = [];

  $("a").each((_, el) => {
    let href = $(el).attr("href") || "";
    if (!href.startsWith("http")) return;

    try {
      const parsed = new URL(href);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

      // 1. Strict blacklist check
      if (BLACKLISTED_DOMAINS.some((b) => host === b || host.endsWith("." + b))) {
        return;
      }

      // Check for generic LinkedIn feed or personal profile links (only allow job postings)
      if (
        host === "linkedin.com" &&
        (parsed.pathname.startsWith("/in/") ||
          parsed.pathname.startsWith("/company/") ||
          parsed.pathname.startsWith("/feed/") ||
          parsed.pathname.startsWith("/posts/"))
      ) {
        return;
      }

      const text = $(el).text().toLowerCase().replace(/\s+/g, " ").trim();
      const parentText = $(el).parent().text().toLowerCase().replace(/\s+/g, " ").trim();
      const ariaLabel = ($(el).attr("aria-label") || "").toLowerCase();
      const titleAttr = ($(el).attr("title") || "").toLowerCase();
      const combinedText = `${text} ${parentText} ${ariaLabel} ${titleAttr}`;

      let score = 10;
      const reasons: string[] = [];

      // 2. ATS Domain bonus (Tier 1: +100 pts)
      if (ATS_DOMAINS.some((ats) => host.includes(ats))) {
        score += 100;
        reasons.push("ATS domain");
      }

      // 3. Official career path / subdomain bonus (Tier 2: +70 pts)
      if (
        host.startsWith("careers.") ||
        host.startsWith("jobs.") ||
        parsed.pathname.includes("/careers") ||
        parsed.pathname.includes("/jobs/") ||
        parsed.pathname.includes("/job/") ||
        parsed.pathname.includes("/job-detail") ||
        parsed.pathname.includes("/positions") ||
        parsed.pathname.includes("/openings") ||
        parsed.pathname.includes("/recruitment")
      ) {
        score += 70;
        reasons.push("Careers/Jobs path or subdomain");
      }

      // 4. Anchor text indicates direct application (Tier 3: +40 to +60 pts)
      if (
        text.includes("click here to apply") ||
        text.includes("apply on official") ||
        text.includes("apply online") ||
        text === "apply now" ||
        text.startsWith("apply for")
      ) {
        score += 60;
        reasons.push("Explicit apply anchor text");
      } else if (text.includes("apply") || text.includes("register")) {
        score += 35;
        reasons.push("Apply keyword in text");
      }

      // 5. Parent text / context indicates apply (e.g. "Apply Link: [Link]")
      if (
        parentText.includes("apply link") ||
        parentText.includes("registration link") ||
        parentText.includes("official website") ||
        parentText.includes("how to apply")
      ) {
        score += 45;
        reasons.push("Apply context in parent container");
      }

      // 6. Company name matching hostname (+50 pts)
      if (companyGuess) {
        const cleanComp = companyGuess.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanComp.length > 3 && host.includes(cleanComp)) {
          score += 50;
          reasons.push("Host matches company name");
        }
      }

      // 7. Negative penalties for educational affiliate courses, mock tests, or syllabus links
      if (
        combinedText.includes("syllabus") ||
        combinedText.includes("pattern sheet") ||
        combinedText.includes("question paper") ||
        combinedText.includes("dsa sheet") ||
        combinedText.includes("mock test") ||
        combinedText.includes("pay after placement") ||
        combinedText.includes("full stack development course") ||
        combinedText.includes("free course")
      ) {
        score -= 90;
      }
      if (text === "click here" && score <= 10) {
        score -= 20;
      }

      candidates.push({
        href,
        text,
        score,
        reasons,
      });
    } catch {
      // Invalid URL
    }
  });

  if (candidates.length === 0) {
    return sourceUrl || "https://careers.example.com/apply";
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (best.score >= 30) {
    return best.href;
  }

  return candidates[0].href || sourceUrl || "https://careers.example.com/apply";
}
