-- CreateTable
CREATE TABLE "CompanyLogo" (
    "id" TEXT NOT NULL,
    "companyNormalized" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "resolvedDomain" TEXT,
    "source" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "imageUrl" TEXT,
    "caption" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "postedAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyLogo_companyNormalized_key" ON "CompanyLogo"("companyNormalized");

-- CreateIndex
CREATE INDEX "SocialPost_jobId_idx" ON "SocialPost"("jobId");

-- CreateIndex
CREATE INDEX "SocialPost_status_platform_idx" ON "SocialPost"("status", "platform");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
