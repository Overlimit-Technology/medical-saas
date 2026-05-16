-- Add SIGNATURE and VARIABLE to FormFieldType enum
ALTER TYPE "FormFieldType" ADD VALUE 'SIGNATURE';
ALTER TYPE "FormFieldType" ADD VALUE 'VARIABLE';

-- Add TemplateType enum
CREATE TYPE "TemplateType" AS ENUM ('REPORT', 'CONSENT', 'ATTENDANCE_CERTIFICATE');

-- Add templateType column to FormTemplate
ALTER TABLE "FormTemplate" ADD COLUMN "templateType" "TemplateType" NOT NULL DEFAULT 'REPORT';
