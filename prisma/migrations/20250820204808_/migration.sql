-- CreateTable
CREATE TABLE "SurveyProgress" (
    "id" SERIAL NOT NULL,
    "currentQuestion" INTEGER,
    "phoneNumber" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyProgress_pkey" PRIMARY KEY ("id")
);
