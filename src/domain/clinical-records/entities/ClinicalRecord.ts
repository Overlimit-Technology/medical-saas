export type ClinicalRecordField = {
  id: string;
  label: string;
  fieldType: string;
  position: number;
  isRequired: boolean;
  options: string | null;
};

export type ClinicalRecordValue = {
  id: string;
  fieldId: string;
  value: string;
  field: ClinicalRecordField;
};

export type ClinicalRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  template: { id: string; name: string };
  doctor: {
    id: string;
    profile?: { firstName: string; lastName: string } | null;
  };
  values: ClinicalRecordValue[];
};
