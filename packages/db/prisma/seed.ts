import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding canonical taxonomy values...");

  const canonicalValues: { type: string; value: string }[] = [
    // Batch Years
    { type: "batchYear", value: "2022" },
    { type: "batchYear", value: "2023" },
    { type: "batchYear", value: "2024" },
    { type: "batchYear", value: "2025" },
    { type: "batchYear", value: "2026" },
    { type: "batchYear", value: "2027" },

    // Degrees
    { type: "degree", value: "B.E/B.Tech" },
    { type: "degree", value: "M.E/M.Tech/M.S" },
    { type: "degree", value: "BCA/MCA" },
    { type: "degree", value: "B.Com/M.Com" },
    { type: "degree", value: "B.Sc/M.Sc" },
    { type: "degree", value: "BBA" },
    { type: "degree", value: "MBA" },
    { type: "degree", value: "Any Degree" },
    { type: "degree", value: "Diploma" },

    // Cities
    { type: "city", value: "Bangalore" },
    { type: "city", value: "Pune" },
    { type: "city", value: "Chennai" },
    { type: "city", value: "Hyderabad" },
    { type: "city", value: "Noida" },
    { type: "city", value: "Mumbai" },
    { type: "city", value: "Kolkata" },
    { type: "city", value: "Gurgaon" },
    { type: "city", value: "Delhi" },
    { type: "city", value: "Remote" },
    { type: "city", value: "Pan India" },

    // Job Types
    { type: "jobType", value: "fresher" },
    { type: "jobType", value: "internship" },
    { type: "jobType", value: "experienced" },

    // Functional Areas
    { type: "functionalArea", value: "Software Development" },
    { type: "functionalArea", value: "QA/Testing" },
    { type: "functionalArea", value: "Data/Analytics" },
    { type: "functionalArea", value: "DevOps/Cloud" },
    { type: "functionalArea", value: "Support/Service Desk" },
    { type: "functionalArea", value: "Business/Consulting" },
    { type: "functionalArea", value: "HR" },
    { type: "functionalArea", value: "Finance/Accounting" },
    { type: "functionalArea", value: "Other" },
  ];

  for (const cv of canonicalValues) {
    await prisma.canonicalValue.upsert({
      where: { type_value: { type: cv.type, value: cv.value } },
      update: {},
      create: cv,
    });
  }

  // 1. YoHire
  await prisma.source.upsert({
    where: { id: "source_yohire" },
    update: {},
    create: {
      id: "source_yohire",
      name: "YoHire",
      baseUrl: "https://yohire.in",
      feedUrl: "https://yohire.in/feed.php",
      scrapeConfig: {
        feedUrl: "https://yohire.in/feed.php",
        detailSelectors: {
          title: "h1.job-title, h1.entry-title, h1",
          body: ".job-desc, .job-details, .entry-content, main",
          applyLink: "a[href*='apply'], a.btn-apply, a.apply-now, a.apply-btn",
          categoryTags: ".badge, .tag, a[rel='category tag'], .job-tags span",
        },
        rateLimitMs: 2500,
      },
      isActive: true,
    },
  });

  // 2. OffCampusJobs4u
  await prisma.source.upsert({
    where: { id: "source_offcampusjobs4u" },
    update: {},
    create: {
      id: "source_offcampusjobs4u",
      name: "OffCampusJobs4u",
      baseUrl: "https://offcampusjobs4u.com",
      feedUrl: null,
      scrapeConfig: {
        listingUrl: "https://offcampusjobs4u.com/",
        detailSelectors: {
          title: "h1.entry-title, h1",
          body: ".entry-content",
          applyLink: "a.apply-now-btn, a[href*='apply'], a.btn",
          categoryTags: "a[rel='category tag']",
        },
        rateLimitMs: 2500,
      },
      isActive: true,
    },
  });

  // 3. FreshersHunt
  await prisma.source.upsert({
    where: { id: "source_freshershunt" },
    update: {},
    create: {
      id: "source_freshershunt",
      name: "FreshersHunt",
      baseUrl: "https://freshershunt.in",
      feedUrl: null,
      scrapeConfig: {
        listingUrl: "https://freshershunt.in/",
        detailSelectors: {
          title: "h1.entry-title, h1",
          body: ".entry-content",
          applyLink: "a[href*='hiremee.co.in'], a[href*='apply'], a.btn-primary",
          categoryTags: "a[rel='category tag'], a[rel='tag']",
        },
        rateLimitMs: 2500,
      },
      isActive: true,
    },
  });

  // 4. FreshersTech
  console.log("Seeding Source 4: FreshersTech...");
  const fresherstech = await prisma.source.upsert({
    where: { id: "source_fresherstech" },
    update: {},
    create: {
      id: "source_fresherstech",
      name: "FreshersTech",
      baseUrl: "https://fresherstech.com",
      feedUrl: null,
      scrapeConfig: {
        listingUrl: "https://fresherstech.com/2026-batch-off-campus-jobs/",
        detailSelectors: {
          title: "h1.entry-title, h1",
          body: ".entry-content",
          applyLink: "a.apply-now-btn, a[href*='apply'], a.btn",
          categoryTags: "a[rel='category tag']",
        },
        rateLimitMs: 2500,
      },
      isActive: true,
    },
  });

  // 5. JobsNet
  console.log("Seeding Source 5: JobsNet...");
  const jobsnet = await prisma.source.upsert({
    where: { id: "source_jobsnet" },
    update: {},
    create: {
      id: "source_jobsnet",
      name: "JobsNet",
      baseUrl: "https://jobsnet.in",
      feedUrl: null,
      scrapeConfig: {
        listingUrl: "https://jobsnet.in/",
        detailSelectors: {
          title: "h1.entry-title, h1",
          body: ".entry-content",
          applyLink: "a[href*='apply'], a.btn-primary, a.apply-link",
          categoryTags: "a[rel='category tag']",
        },
        rateLimitMs: 2500,
      },
      isActive: true,
    },
  });

  // Aliases for FreshersTech
  const ftAliases = [
    { rawValue: "2026 Batch", canonicalType: "batchYear", canonicalValue: "2026" },
    { rawValue: "2025 Batch", canonicalType: "batchYear", canonicalValue: "2025" },
    { rawValue: "2024 Batch", canonicalType: "batchYear", canonicalValue: "2024" },
    { rawValue: "Bangalore", canonicalType: "city", canonicalValue: "Bangalore" },
    { rawValue: "Hyderabad", canonicalType: "city", canonicalValue: "Hyderabad" },
    { rawValue: "Pune", canonicalType: "city", canonicalValue: "Pune" },
    { rawValue: "Chennai", canonicalType: "city", canonicalValue: "Chennai" },
    { rawValue: "Noida", canonicalType: "city", canonicalValue: "Noida" },
    { rawValue: "B.Tech", canonicalType: "degree", canonicalValue: "B.E/B.Tech" },
    { rawValue: "BE/B.Tech", canonicalType: "degree", canonicalValue: "B.E/B.Tech" },
    { rawValue: "Internships", canonicalType: "jobType", canonicalValue: "internship" },
    { rawValue: "Fresher Jobs", canonicalType: "jobType", canonicalValue: "fresher" },
  ];

  for (const a of ftAliases) {
    await prisma.categoryAlias.upsert({
      where: {
        sourceId_rawValue_canonicalType: {
          sourceId: fresherstech.id,
          rawValue: a.rawValue,
          canonicalType: a.canonicalType,
        },
      },
      update: {},
      create: {
        sourceId: fresherstech.id,
        rawValue: a.rawValue,
        canonicalType: a.canonicalType,
        canonicalValue: a.canonicalValue,
        confidence: 1.0,
        createdBy: "manual",
      },
    });
  }

  // Aliases for JobsNet
  const jnAliases = [
    { rawValue: "2026", canonicalType: "batchYear", canonicalValue: "2026" },
    { rawValue: "2025", canonicalType: "batchYear", canonicalValue: "2025" },
    { rawValue: "Bangalore", canonicalType: "city", canonicalValue: "Bangalore" },
    { rawValue: "Hyderabad", canonicalType: "city", canonicalValue: "Hyderabad" },
    { rawValue: "Pune", canonicalType: "city", canonicalValue: "Pune" },
    { rawValue: "Noida", canonicalType: "city", canonicalValue: "Noida" },
    { rawValue: "Freshers", canonicalType: "jobType", canonicalValue: "fresher" },
    { rawValue: "Internship", canonicalType: "jobType", canonicalValue: "internship" },
  ];

  for (const a of jnAliases) {
    await prisma.categoryAlias.upsert({
      where: {
        sourceId_rawValue_canonicalType: {
          sourceId: jobsnet.id,
          rawValue: a.rawValue,
          canonicalType: a.canonicalType,
        },
      },
      update: {},
      create: {
        sourceId: jobsnet.id,
        rawValue: a.rawValue,
        canonicalType: a.canonicalType,
        canonicalValue: a.canonicalValue,
        confidence: 1.0,
        createdBy: "manual",
      },
    });
  }

  console.log("All 5 sources and aliases seeded successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
