/**
 * Social Image Generator
 * 
 * Uses Satori (JSX → SVG) + resvg (SVG → PNG) to generate
 * branded 1080×1350 social images for job postings.
 */

import fs from "fs";
import path from "path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { prisma } from "@repo/db";
import { DefaultJobTemplate, FeaturedJobTemplate, type JobImageData } from "./social-templates";

// Resolve fontsource directory using require.resolve
function getFontsourceDir(): string {
  try {
    const indexPath = require.resolve("@fontsource/inter/index.css");
    return path.join(path.dirname(indexPath), "files");
  } catch {
    // Fallback: search common locations
    const candidates = [
      path.resolve(process.cwd(), "node_modules/@fontsource/inter/files"),
      path.resolve(__dirname, "../../../node_modules/@fontsource/inter/files"),
      path.resolve(__dirname, "../../../../node_modules/@fontsource/inter/files"),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
    throw new Error("Could not find @fontsource/inter/files directory");
  }
}

interface FontEntry {
  data: ArrayBuffer;
  weight: number;
}

const fontCache: FontEntry[] = [];

function loadFonts(): FontEntry[] {
  if (fontCache.length > 0) return fontCache;

  const fontsDir = getFontsourceDir();
  const weights = [
    { weight: 400, file: "inter-latin-400-normal.woff" },
    { weight: 600, file: "inter-latin-600-normal.woff" },
    { weight: 700, file: "inter-latin-700-normal.woff" },
    { weight: 800, file: "inter-latin-800-normal.woff" },
  ];

  for (const { weight, file } of weights) {
    const fontPath = path.join(fontsDir, file);
    if (fs.existsSync(fontPath)) {
      const buffer = fs.readFileSync(fontPath);
      fontCache.push({
        data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        weight,
      });
    } else {
      console.warn(`Font file not found: ${fontPath}`);
    }
  }

  if (fontCache.length === 0) {
    throw new Error("No Inter font files found. Install @fontsource/inter.");
  }

  return fontCache;
}


const TEMPLATES: Record<string, (data: JobImageData) => any> = {
  default: DefaultJobTemplate,
  featured: FeaturedJobTemplate,
};

export interface GenerateImageResult {
  pngBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Generate a social image for a job posting.
 */
export async function generateJobImage(
  jobData: JobImageData,
  template: string = "default"
): Promise<GenerateImageResult> {
  const fonts = loadFonts();
  const templateFn = TEMPLATES[template] || TEMPLATES.default;
  const element = templateFn(jobData);

  const width = 1080;
  const height = 1350;

  const svg = await satori(element, {
    width,
    height,
    fonts: fonts.map((f) => ({
      name: "Inter",
      data: f.data,
      weight: f.weight as 400 | 600 | 700 | 800,
      style: "normal" as const,
    })),
  });


  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return { pngBuffer: Buffer.from(pngBuffer), width, height };
}

/**
 * Generate and save a social image for a specific job.
 * Returns the file path where the image was saved.
 */
export async function generateAndSaveJobImage(
  jobId: string,
  template: string = "default",
  outputDir?: string
): Promise<string> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) throw new Error(`Job not found: ${jobId}`);

  // Get company logo
  const logo = await prisma.companyLogo.findUnique({
    where: { companyNormalized: job.companyNormalized },
  });

  // Calculate deadline urgency
  let daysLeft: number | null = null;
  let isUrgent = false;
  if (job.deadline) {
    const diffMs = new Date(job.deadline).getTime() - Date.now();
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    isUrgent = daysLeft >= 0 && daysLeft <= 3;
  }

  const imageData: JobImageData = {
    company: job.company,
    role: job.role,
    city: job.city,
    batchYears: job.batchYears,
    degree: job.degree,
    jobType: job.jobType,
    deadline: job.deadline,
    logoUrl: logo?.logoUrl || null,
    salaryText: job.salaryText,
    isUrgent,
    daysLeft,
  };

  const { pngBuffer } = await generateJobImage(imageData, template);

  // Save to output directory
  const dir = outputDir || path.resolve(__dirname, "../../generated-images");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `${job.slug || job.id}_${template}.png`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, pngBuffer);

  console.log(`📸 Generated social image: ${filepath} (${(pngBuffer.length / 1024).toFixed(0)} KB)`);
  return filepath;
}
