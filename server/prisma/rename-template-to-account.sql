ALTER TABLE "Template" RENAME TO "Account";
ALTER TABLE "Trade" RENAME COLUMN "templateId" TO "accountId";
ALTER TYPE "TemplateType" RENAME TO "AccountType";
