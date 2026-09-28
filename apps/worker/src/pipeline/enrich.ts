import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import { prisma } from "@repo/db";
import {
  JobExtractionSchema,
  JobExtractionResult,
  stripCodeFences,
  normalizeCompanyName,
  normalizeRoleTitle,
  DuplicateCandidate,
} from "@repo/shared";
import { generateJobSlug } from "./slug";
import { mapTagsTier1 } from "./categorize";
import { extractBestApplyUrl } from "../utils/apply-url-extractor";
import { extractDeadline } from "../utils/deadline-extractor";

// Load versioned system prompt from shared package
const PROMPT_PATH = path.resolve(__dirname, "../../../../packages/shared/prompts/extract-job.md");
export const EXTRACT_JOB_SYSTEM_PROMPT = fs.existsSync(PROMPT_PATH)
  ? fs.readFileSync(PROMPT_PATH, "utf-8")
  : "";

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-api-key" || !apiKey.startsWith("sk-ant")) {
    return null;
  }
  return new Anthropic({ apiKey });
}

export function buildUserPrompt(
  rawTitle: string,
  rawHtml: string,
  categoryTags: string[],
  candidates: DuplicateCandidate[],
  applyPageDescription?: string
): string {
  let prompt = `Raw Title: ${rawTitle}\n\n`;
  prompt += `Source Category Tags: ${JSON.stringify(categoryTags)}\n\n`;

  if (candidates && candidates.length > 0) {
    prompt += `Candidate Existing Jobs for Deduplication Check:\n`;
    candidates.forEach((c, idx) => {
      prompt += `Candidate [${idx}]:\n- Company: ${c.company}\n- Role: ${c.role}\n- City: ${JSON.stringify(c.city)}\n- Batch Years: ${JSON.stringify(c.batchYears)}\n- Snippet: ${c.descriptionSnippet || "N/A"}\n\n`;
    });
  } else {
    prompt += `Candidate Existing Jobs: None\n\n`;
  }

  const cleanHtml = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .slice(0, 15000);

  prompt += `--- SOURCE A: Aggregator Blog Post ---\n${cleanHtml}\n\n`;

  if (applyPageDescription && applyPageDescription.length > 50) {
    prompt += `--- SOURCE B: Company Careers/Apply Page (AUTHORITATIVE) ---\n${applyPageDescription.slice(0, 10000)}\n\n`;
    prompt += `NOTE: Source B (company apply page) is the primary source of truth. Use Source A (aggregator blog) to supplement any missing details like batch years, eligibility criteria, or deadlines.\n`;
  } else {
    prompt += `--- SOURCE B: Company Careers/Apply Page ---\nNot available. Use Source A only.\n`;
  }

  return prompt;
}

/**
 * Deterministic local fallback extractor when ANTHROPIC_API_KEY is not yet populated
 * Guarantees pipeline end-to-end functionality during development.
 */
function localMockExtract(
  rawTitle: string,
  rawHtml: string,
  tags: string[],
  companyGuess?: string | null,
  roleGuess?: string | null,
  cityGuess?: string | null,
  candidates: DuplicateCandidate[] = [],
  applyPageDescription?: string
): JobExtractionResult {
  const company = companyGuess || "Tech Innovators";
  const role = roleGuess || "Graduate Engineer Trainee";
  const city = cityGuess ? [cityGuess] : ["Bangalore"];
  const batchYears = tags.filter((t) => /202[2-7]/.test(t)).length > 0 ? tags.filter((t) => /202[2-7]/.test(t)) : ["2026"];

  // Find real direct apply URL using intelligent scoring and ad/course rejection
  const applyUrl = extractBestApplyUrl(rawHtml, "", company);
  let descriptionClean = "";

  // Prefer apply page description (Source B) when available — it's the authoritative source
  if (applyPageDescription && applyPageDescription.length > 100) {
    descriptionClean = applyPageDescription.slice(0, 4000);
  } else if (rawHtml) {
    try {
      const clone = cheerio.load(rawHtml);
      clone("script, style, iframe, nav, footer, header, .sidebar, .comments, .ads, .advertisement, [class*='ad-'], [id*='ad-']").remove();
      
      // Remove known affiliate/ad paragraphs
      clone("p, div").each((_, el) => {
        const t = clone(el).text().toLowerCase();
        if (
          t.includes("acciojob") ||
          t.includes("topmate") ||
          t.includes("dsa pattern sheet") ||
          t.includes("join telegram") ||
          t.includes("join whatsapp") ||
          t.includes("pay after placement")
        ) {
          clone(el).remove();
        }
      });

      const extractedText = clone(".td-post-content, .entry-content, article, body").first().text().replace(/\s+/g, " ").trim();
      if (extractedText.length > 100) {
        descriptionClean = extractedText.slice(0, 3000);
      }
    } catch {
      // Ignore
    }
  }

  if (!descriptionClean) {
    descriptionClean = `${company} is hiring for ${role} in ${city.join(", ")}.\n\nEligibility:\n- Qualification: B.E/B.Tech or BCA/MCA (${batchYears.join(", ")} batch)\n- Experience: 0-1 years\n- Strong problem-solving and coding fundamentals\n\nResponsibilities:\n- Design and develop scalable software modules\n- Collaborate with senior engineers on code reviews and testing\n\nHow to Apply:\nSubmit your application via the official careers link below.`;
  }

  // Deduplication matching
  let isDuplicate = false;
  let duplicateIndex: number | null = null;
  if (candidates && candidates.length > 0) {
    const normComp = company.toLowerCase().trim();
    const normRole = role.toLowerCase().trim();
    const matchIdx = candidates.findIndex((c) => {
      const cComp = c.company.toLowerCase().trim();
      const cRole = c.role.toLowerCase().trim();
      const compMatch = cComp === normComp || cComp.includes(normComp) || normComp.includes(cComp);
      const roleMatch = cRole === normRole || cRole.includes(normRole) || normRole.includes(cRole);
      return compMatch && roleMatch;
    });
    if (matchIdx !== -1) {
      isDuplicate = true;
      duplicateIndex = matchIdx;
    }
  }

  return {
    is_duplicate: isDuplicate,
    duplicate_of_index: duplicateIndex,
    is_valid_job: true,
    rejection_reason: null,
    company,
    role,
    batch_years: batchYears,
    degree: ["B.E/B.Tech", "BCA/MCA"],
    city,
    job_type: /intern/i.test(role) ? "internship" : "fresher",
    functional_area: "Software Development",
    experience_min: 0,
    experience_max: 1,
    salary_text: "Competitive / Best in Industry",
    apply_url: applyUrl,
    deadline: extractDeadline(rawHtml),
    description_clean: descriptionClean,
    // Rich content — reasonable mock for dev
    eligibility_detailed: `- **Educational Qualification:** B.E/B.Tech, BCA/MCA or equivalent degree from a recognized university.\n- **Batch Year:** ${batchYears.join(", ")} passouts are eligible to apply.\n- **Experience:** 0-1 years of experience or freshers looking for entry-level opportunities.\n- **Academic Performance:** Consistent academic record with no active backlogs at the time of joining.\n- **Technical Skills:** Basic understanding of programming fundamentals and software development concepts.\n- **Problem Solving:** Strong analytical and problem-solving abilities.\n- **Communication Skills:** Good verbal and written communication skills in English.\n- **Location:** Willingness to work from ${city.join(", ") || "the company's office location"}.`,
    responsibilities_detailed: `- **Software Development:** Design, develop, and maintain software applications as per project requirements.\n- **Code Quality:** Write clean, well-documented, and testable code following coding standards.\n- **Testing:** Participate in unit testing, integration testing, and debugging of applications.\n- **Collaboration:** Work closely with senior engineers, technical leads, and cross-functional teams.\n- **Learning:** Stay updated with the latest technologies and industry best practices.\n- **Documentation:** Create and maintain technical documentation for developed features.`,
    skills_tools: `Primary Technologies:\n- Programming Languages (Java/Python/C++)\n- Data Structures and Algorithms\n- SQL and Database Fundamentals\n- Version Control (Git)\n\nPreferred Technologies:\n- Web Frameworks (React/Angular/Spring)\n- Cloud Platforms (AWS/Azure/GCP)\n- CI/CD Tools\n- Agile/Scrum Methodology`,
    preparation_tips: `1. **Review Core CS Fundamentals**\nBrush up on data structures, algorithms, and object-oriented programming concepts.\n\n2. **Practice Coding Problems**\nSolve medium-level problems on LeetCode, HackerRank, or CodeSignal.\n\n3. **Understand ${company}'s Products**\nResearch what ${company} does, their products, and recent news.\n\n4. **Prepare for Behavioral Questions**\nBe ready to discuss teamwork, leadership, and conflict resolution with STAR method.\n\n5. **Review System Design Basics**\nUnderstand basic system design concepts like load balancing, caching, and databases.\n\n6. **Mock Interviews**\nPractice with peers or online platforms to build confidence.\n\n7. **Update Your Resume**\nHighlight relevant projects, internships, and technical skills.\n\n8. **Prepare Questions for the Interviewer**\nShow genuine interest by asking about team culture, projects, and growth opportunities.`,
    important_points: `- The position is **${role}**.\n- The hiring company is **${company}**.\n- Job location: **${city.join(", ") || "To be confirmed"}**.\n- This is a **${/intern/i.test(role) ? "internship" : "full-time"}** opportunity.\n- Eligible batch years: **${batchYears.join(", ")}**.\n- Required qualification: **B.E/B.Tech, BCA/MCA**.\n- Experience required: **0-1 years (freshers eligible)**.\n- Salary: **Competitive / Best in Industry**.`,
    about_company: `${company} is a leading organization known for its innovative solutions and global presence. The company operates across multiple domains and serves clients worldwide with cutting-edge technology and services.\n\nFor freshers and early-career professionals, ${company} offers a structured onboarding program, mentorship from experienced professionals, and exposure to real-world projects. The company values continuous learning and provides various training programs to help employees grow in their careers.`,
    career_growth: `Starting as a ${role} at ${company} provides an excellent foundation for a successful career in technology. Employees typically progress through defined career levels, gaining increasing responsibilities and leadership opportunities.\n\nThe role offers hands-on experience with modern technologies, cross-functional collaboration, and the chance to work on impactful projects. ${company} supports career development through internal mobility, skill-building programs, and performance-based advancement.`,
  };
}

/**
 * Handles parsed extraction result according to Section 8 spec.
 * Now stores dual-source descriptions (aggregator + apply page) separately.
 */
export async function handleExtractionResult(
  rawJobId: string,
  data: JobExtractionResult,
  candidates: DuplicateCandidate[],
  descriptionFromSource?: string,
  descriptionFromApply?: string,
  applyPageScraped: boolean = false
): Promise<{ success: boolean; action: string; jobId?: string }> {
  const rawJob = await prisma.rawJob.findUnique({
    where: { id: rawJobId },
  });

  if (!rawJob) {
    throw new Error(`RawJob not found: ${rawJobId}`);
  }

  // 1. Invalid job check
  if (!data.is_valid_job) {
    await prisma.rawJob.update({
      where: { id: rawJobId },
      data: {
        status: "rejected_by_llm",
        processedAt: new Date(),
      },
    });
    return { success: true, action: "rejected_by_llm" };
  }

  // 2. Duplicate merge check
  if (data.is_duplicate && data.duplicate_of_index !== null && data.duplicate_of_index !== undefined) {
    const matchedCandidate = candidates[data.duplicate_of_index];
    if (matchedCandidate) {
      const existingJob = await prisma.job.findUnique({
        where: { id: matchedCandidate.id },
      });

      if (existingJob) {
        const currentSeen = new Set(existingJob.seenOnSourceIds);
        currentSeen.add(rawJob.sourceId);

        let deadlineUpdate = existingJob.deadline;
        if (data.deadline) {
          const newDeadline = new Date(data.deadline);
          if (!isNaN(newDeadline.getTime())) {
            if (!existingJob.deadline || newDeadline > existingJob.deadline) {
              deadlineUpdate = newDeadline;
            }
          }
        }

        await prisma.job.update({
          where: { id: existingJob.id },
          data: {
            seenOnSourceIds: Array.from(currentSeen),
            deadline: deadlineUpdate,
          },
        });

        await prisma.rawJob.update({
          where: { id: rawJobId },
          data: {
            status: "duplicate",
            duplicateOfJobId: existingJob.id,
            processedAt: new Date(),
          },
        });

        return { success: true, action: "merged_duplicate", jobId: existingJob.id };
      }
    }
  }

  // 3. Category comparison between Tier 1 and LLM output
  const tier1 = await mapTagsTier1(rawJob.sourceId, rawJob.sourceCategoryTags);
  let categoryConfidence: "high" | "low" | "needs_review" = "high";

  // Check for conflicts
  if (tier1.batchYears.length > 0 && data.batch_years.length > 0) {
    const t1Set = new Set(tier1.batchYears);
    const hasOverlap = data.batch_years.some((by) => t1Set.has(by));
    if (!hasOverlap) {
      await prisma.categoryConflict.create({
        data: {
          jobId: rawJobId,
          canonicalType: "batchYear",
          aliasValue: tier1.batchYears.join(", "),
          llmValue: data.batch_years.join(", "),
        },
      });
      categoryConfidence = "needs_review";
    }
  }

  if (tier1.city.length > 0 && data.city.length > 0) {
    const t1CitySet = new Set(tier1.city.map((c) => c.toLowerCase()));
    const hasCityOverlap = data.city.some((c) => t1CitySet.has(c.toLowerCase()));
    if (!hasCityOverlap) {
      await prisma.categoryConflict.create({
        data: {
          jobId: rawJobId,
          canonicalType: "city",
          aliasValue: tier1.city.join(", "),
          llmValue: data.city.join(", "),
        },
      });
      categoryConfidence = "needs_review";
    }
  }

  if (data.batch_years.length === 0 || data.city.length === 0) {
    categoryConfidence = "needs_review";
  }

  const finalBatchYears = data.batch_years.length > 0 ? data.batch_years : tier1.batchYears;
  const finalCity = data.city.length > 0 ? data.city : tier1.city;
  const finalDegree = data.degree.length > 0 ? data.degree : tier1.degree;

  // 4. Create Job (status = draft)
  const company = data.company || rawJob.companyGuess || "Unknown";
  const role = data.role || rawJob.roleGuess || rawJob.rawTitle;
  const slug = generateJobSlug(company, role, finalCity);

  let deadlineDate: Date | null = null;
  if (data.deadline) {
    const d = new Date(data.deadline);
    if (!isNaN(d.getTime())) deadlineDate = d;
  }

  const job = await prisma.job.create({
    data: {
      rawJobId: rawJob.id,
      company,
      companyNormalized: normalizeCompanyName(company),
      role,
      roleNormalized: normalizeRoleTitle(role),
      description: data.description_clean || rawJob.rawTitle,
      descriptionRaw: rawJob.rawHtml,
      descriptionFromSource: descriptionFromSource || null,
      descriptionFromApply: descriptionFromApply || null,
      applyPageScraped,
      batchYears: finalBatchYears,
      degree: finalDegree,
      city: finalCity,
      jobType: data.job_type || "fresher",
      experienceMin: data.experience_min ?? null,
      experienceMax: data.experience_max ?? null,
      salaryText: data.salary_text ?? null,
      functionalArea: data.functional_area ?? null,
      categoryConfidence,
      applyUrl: data.apply_url || rawJob.sourceUrl,
      sourceAttribution: rawJob.sourceId,
      deadline: deadlineDate,
      status: "draft",
      seenOnSourceIds: [rawJob.sourceId],
      slug,
      // Rich content fields
      eligibilityDetailed: data.eligibility_detailed ?? null,
      responsibilitiesDetailed: data.responsibilities_detailed ?? null,
      skillsTools: data.skills_tools ?? null,
      preparationTips: data.preparation_tips ?? null,
      importantPoints: data.important_points ?? null,
      aboutCompany: data.about_company ?? null,
      careerGrowth: data.career_growth ?? null,
    },
  });

  await prisma.rawJob.update({
    where: { id: rawJobId },
    data: {
      status: "processed",
      processedAt: new Date(),
    },
  });

  return { success: true, action: "created_job", jobId: job.id };
}

/**
 * Direct enrichment for a single raw job.
 * Now accepts an optional apply-page description for dual-source extraction.
 */
export async function enrichSingleJobDirect(
  rawJobId: string,
  candidates: DuplicateCandidate[] = [],
  applyPageDescription?: string,
  applyPageScraped: boolean = false
): Promise<{ parsed: JobExtractionResult; result: any }> {
  const rawJob = await prisma.rawJob.findUnique({ where: { id: rawJobId } });
  if (!rawJob) throw new Error(`RawJob not found: ${rawJobId}`);

  const client = getAnthropicClient();

  let parsed: JobExtractionResult;

  // Extract a cleaned version of the aggregator blog text to store as descriptionFromSource
  let descriptionFromSource = "";
  if (rawJob.rawHtml) {
    try {
      const $ = cheerio.load(rawJob.rawHtml);
      $("script, style, iframe, nav, footer, header, .sidebar, .comments, .ads, .advertisement").remove();
      $("p, div").each((_, el) => {
        const t = $(el).text().toLowerCase();
        if (
          t.includes("acciojob") || t.includes("topmate") ||
          t.includes("dsa pattern sheet") || t.includes("join telegram") ||
          t.includes("join whatsapp") || t.includes("pay after placement")
        ) {
          $(el).remove();
        }
      });
      const text = $(".td-post-content, .entry-content, article, body").first().text().replace(/\s+/g, " ").trim();
      if (text.length > 100) {
        descriptionFromSource = text.slice(0, 5000);
      }
    } catch {
      // Ignore extraction errors
    }
  }

  if (client) {
    const userPrompt = buildUserPrompt(
      rawJob.rawTitle,
      rawJob.rawHtml,
      rawJob.sourceCategoryTags,
      candidates,
      applyPageDescription
    );

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: EXTRACT_JOB_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const contentBlock = response.content[0];
    if (contentBlock.type !== "text") {
      throw new Error("Unexpected non-text response from Claude");
    }

    const rawJsonText = stripCodeFences(contentBlock.text);
    parsed = JobExtractionSchema.parse(JSON.parse(rawJsonText));
  } else {
    console.log("ANTHROPIC_API_KEY not set or placeholder; utilizing local mock extractor for dev verification.");
    parsed = localMockExtract(
      rawJob.rawTitle,
      rawJob.rawHtml,
      rawJob.sourceCategoryTags,
      rawJob.companyGuess,
      rawJob.roleGuess,
      rawJob.cityGuess,
      candidates,
      applyPageDescription
    );
  }

  const result = await handleExtractionResult(
    rawJobId,
    parsed,
    candidates,
    descriptionFromSource,
    applyPageDescription,
    applyPageScraped
  );
  return { parsed, result };
}
