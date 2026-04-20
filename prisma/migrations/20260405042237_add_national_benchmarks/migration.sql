-- CreateTable
CREATE TABLE "NationalBenchmark" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NationalBenchmark_year_quarter_idx" ON "NationalBenchmark"("year", "quarter" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "NationalBenchmark_year_quarter_key" ON "NationalBenchmark"("year", "quarter");
