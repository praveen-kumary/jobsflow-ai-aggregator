-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "feedUrl" TEXT,
    "scrapeConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "jobsNew" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawJob" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "rawTitle" TEXT NOT NULL,
    "rawHtml" TEXT NOT NULL,
    "sourceCategoryTags" TEXT[],
    "companyGuess" TEXT,
    "roleGuess" TEXT,
    "cityGuess" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duplicateOfJobId" TEXT,

    CONSTRAINT "RawJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "rawJobId" TEXT,
    "company" TEXT NOT NULL,
    "companyNormalized" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleNormalized" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionRaw" TEXT,
    "batchYears" TEXT[],
    "degree" TEXT[],
    "city" TEXT[],
    "jobType" TEXT NOT NULL,
    "experienceMin" INTEGER,
    "experienceMax" INTEGER,
    "salaryText" TEXT,
    "functionalArea" TEXT,
    "categoryConfidence" TEXT NOT NULL DEFAULT 'high',
    "applyUrl" TEXT NOT NULL,
    "sourceAttribution" TEXT,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "seenOnSourceIds" TEXT[],
    "slug" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "applyClickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalValue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CanonicalValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAlias" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "canonicalType" TEXT NOT NULL,
    "canonicalValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdBy" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "CategoryAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryConflict" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "canonicalType" TEXT NOT NULL,
    "aliasValue" TEXT NOT NULL,
    "llmValue" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawJob_sourceUrl_key" ON "RawJob"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Job_rawJobId_key" ON "Job"("rawJobId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_status_publishedAt_idx" ON "Job"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Job_companyNormalized_roleNormalized_idx" ON "Job"("companyNormalized", "roleNormalized");

-- CreateIndex
CREATE INDEX "Job_categoryConfidence_idx" ON "Job"("categoryConfidence");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalValue_type_value_key" ON "CanonicalValue"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAlias_sourceId_rawValue_canonicalType_key" ON "CategoryAlias"("sourceId", "rawValue", "canonicalType");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawJob" ADD CONSTRAINT "RawJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_rawJobId_fkey" FOREIGN KEY ("rawJobId") REFERENCES "RawJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAlias" ADD CONSTRAINT "CategoryAlias_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
