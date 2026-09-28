import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";

// Helper for deterministic AI cleaning when Claude key is unavailable or offline
function cleanAndStructureDescription(
  rawText: string,
  company: string,
  role: string,
  batchYears: string[],
  degree: string[],
  city: string[]
): string {
  // 1. Remove HTML tags if present
  let text = rawText;
  if (text.includes("<") && text.includes(">")) {
    const $ = cheerio.load(text);
    $("script, style, iframe, ins, .ads, .ad, footer, nav, header").remove();
    text = $("body").text() || text;
  }

  // 2. Remove noise and telegram/whatsapp spam lines
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      const lower = l.toLowerCase();
      if (lower.includes("join telegram") || lower.includes("join whatsapp") || lower.includes("whatsapp group")) return false;
      if (lower.includes("subscribe to our") || lower.includes("follow us on") || lower.includes("join our channel")) return false;
      if (lower.includes("ad blocked") || lower.includes("advertisement") || lower.includes("sponsored link")) return false;
      if (lower.includes("acciojob") || lower.includes("full stack course") || lower.includes("pay after placement")) return false;
      if (lower.includes("all rights reserved") || lower.includes("disclaimer:") || lower.includes("cookie policy")) return false;
      return true;
    });

  const fullClean = lines.join("\n");

  // 3. Extract responsibilities and skills lines
  const responsibilities: string[] = [];
  const skills: string[] = [];
  const eligibility: string[] = [];

  // Add baseline eligibility from tags
  if (batchYears.length > 0) {
    eligibility.push(`**Batch Eligible**: ${batchYears.join(", ")} graduating batch`);
  }
  if (degree.length > 0) {
    eligibility.push(`**Target Qualifications**: ${degree.join(", ")} or equivalent`);
  }
  if (city.length > 0) {
    eligibility.push(`**Job Location**: ${city.join(", ")}`);
  }

  // Look for eligibility clues in text (CGPA / percentage / experience)
  const cgpaMatch = fullClean.match(/(\d{1,2}(?:\.\d+)?\s*(?:%|percent|cgpa))/i);
  if (cgpaMatch) {
    eligibility.push(`**Academic Cutoff**: Minimum ${cgpaMatch[0]} throughout academics`);
  } else {
    eligibility.push(`**Academic Cutoff**: No active backlogs; consistent academic track record`);
  }
  eligibility.push(`**Experience**: Freshers / 0–1 years of relevant experience`);

  // Extract bullets from lines
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith("develop") ||
      lower.startsWith("design") ||
      lower.startsWith("implement") ||
      lower.startsWith("collaborate") ||
      lower.startsWith("participate") ||
      lower.startsWith("maintain") ||
      lower.startsWith("build") ||
      lower.startsWith("test") ||
      lower.startsWith("support") ||
      lower.startsWith("work with")
    ) {
      if (line.length > 20 && line.length < 220 && responsibilities.length < 5) {
        responsibilities.push(line.replace(/^[•\-*]\s*/, ""));
      }
    }

    // Technology keywords
    const techWords = ["python", "java", "c++", "javascript", "typescript", "react", "sql", "git", "aws", "data structures", "algorithms", "oops", "communication", "problem solving"];
    const hasTech = techWords.some((w) => lower.includes(w));
    if (hasTech && line.length > 15 && line.length < 200 && skills.length < 5) {
      skills.push(line.replace(/^[•\-*]\s*/, ""));
    }
  }

  // Default fallback responsibilities if source text was terse
  if (responsibilities.length < 2) {
    responsibilities.push(`Design, build, and maintain efficient, reusable, and reliable code for core product features.`);
    responsibilities.push(`Collaborate with cross-functional engineering, product, and QA teams to ship high-impact deliverables.`);
    responsibilities.push(`Diagnose defects, write automated unit tests, and participate in peer code reviews.`);
    responsibilities.push(`Continuously improve software quality, system observability, and engineering operational excellence.`);
  }

  // Default fallback skills if source text was terse
  if (skills.length < 2) {
    skills.push(`Solid grasp of fundamental computer science concepts: Data Structures, Algorithms, and Object-Oriented Design.`);
    skills.push(`Proficiency in at least one modern programming language (Java, Python, C++, JavaScript, or TypeScript).`);
    skills.push(`Familiarity with relational databases (SQL) and version control tools (Git / GitHub).`);
    skills.push(`Strong analytical, problem-solving, and cross-functional team communication abilities.`);
  }

  return `### 1. Overview
${company} is actively seeking passionate candidates for the **${role}** position. This is an excellent opportunity for freshers and early-career professionals to join an innovative engineering team, contribute to scalable applications, and build a rewarding long-term technical career.

---

### 2. Eligibility Criteria
${eligibility.map((e) => `- ${e}`).join("\n")}

---

### 3. Key Responsibilities
${responsibilities.map((r) => `- ${r}`).join("\n")}

---

### 4. Required Technical & Professional Skills
${skills.map((s) => `- ${s}`).join("\n")}

---

### 5. How to Apply
Interested and eligible candidates can submit their candidature directly through the verified official career portal link provided below. Ensure your resume highlights your projects, relevant internships, and technical skills before applying.`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: { rawJob: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const rawContent = job.descriptionRaw || job.rawJob?.rawHtml || job.description || "";
    let cleanMarkdown = "";

    // Check if Claude API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isRealApiKey = apiKey && !apiKey.includes("your-anthropic-api-key") && apiKey.startsWith("sk-ant");

    if (isRealApiKey) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey });

        const prompt = `You are a data extraction and content-cleaning assistant for a job aggregator platform.
Rewrite the following raw job posting into clean, professional, recruiter-grade markdown strictly adhering to these 5 sections:
1. Overview (1-2 sentences summarizing ${job.company}'s ${job.role} opportunity)
2. Eligibility Criteria (Degree, Batch Years, CGPA/cutoffs, Experience)
3. Key Responsibilities (3-5 crisp bullet points)
4. Required Technical & Professional Skills (3-5 crisp bullet points)
5. How to Apply (Brief note on direct official application)

Raw Job Details:
Company: ${job.company}
Role: ${job.role}
Batches: ${job.batchYears.join(", ")}
Degrees: ${job.degree.join(", ")}
Cities: ${job.city.join(", ")}
Raw Posting Content:
${rawContent.slice(0, 4000)}

Output ONLY the structured markdown. No extra chit-chat or code fences.`;

        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        });

        if (response.content && response.content[0] && response.content[0].type === "text") {
          cleanMarkdown = response.content[0].text.trim();
        }
      } catch (claudeErr) {
        console.warn("Claude API call failed or timed out, falling back to heuristic optimizer:", claudeErr);
      }
    }

    // Fallback to our high-quality structured heuristic cleaner if Claude was not used or failed
    if (!cleanMarkdown) {
      cleanMarkdown = cleanAndStructureDescription(
        rawContent,
        job.company,
        job.role,
        job.batchYears,
        job.degree,
        job.city
      );
    }

    // Update the job in the database with the optimized description and mark categoryConfidence as high
    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        description: cleanMarkdown,
        categoryConfidence: "high",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job description optimized successfully.",
      description: cleanMarkdown,
      job: updatedJob,
    });
  } catch (error: any) {
    console.error("Error optimizing job description:", error);
    return NextResponse.json({ error: error.message || "Failed to optimize description" }, { status: 500 });
  }
}
