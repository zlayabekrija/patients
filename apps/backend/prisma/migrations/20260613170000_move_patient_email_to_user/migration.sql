DELETE FROM "Patient";

DROP INDEX "Patient_email_key";

ALTER TABLE "Patient" DROP COLUMN "email",
ADD COLUMN "userId" TEXT NOT NULL;

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");
CREATE INDEX "Patient_userId_idx" ON "Patient"("userId");
