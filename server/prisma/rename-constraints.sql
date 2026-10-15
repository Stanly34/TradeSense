ALTER TABLE "Account" RENAME CONSTRAINT "Template_pkey" TO "Account_pkey";
ALTER INDEX "Template_userId_idx" RENAME TO "Account_userId_idx";
ALTER TABLE "Account" RENAME CONSTRAINT "Template_userId_fkey" TO "Account_userId_fkey";
ALTER TABLE "Trade" RENAME CONSTRAINT "Trade_templateId_fkey" TO "Trade_accountId_fkey";
