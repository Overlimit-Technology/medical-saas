export type FieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT" | "TEXTAREA" | "BOOLEAN";

export type TemplateField = {
  id?: string;
  label: string;
  fieldType: FieldType;
  position: number;
  isRequired: boolean;
  options: string | null;
  defaultValue: string | null;
};

export type FormTemplate = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  fields: TemplateField[];
  _count: { clinicalRecords: number };
};
