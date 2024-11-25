-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);
