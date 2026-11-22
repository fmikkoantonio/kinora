export type RecordCategory = "Laboratory" | "Imaging" | "ECG" | "Other";
export type ResultValueType = "numeric" | "text" | "qualitative" | "longText";

export interface ResultParameter {
  id: string;
  name: string;
  type: ResultValueType;
  value: string;
  unit: string;
  referenceMin: string;
  referenceMax: string;
}

export interface MedicalExamination {
  id: string;
  diagnosticId: string;
  name: string;
  category: RecordCategory;
  parameters: ResultParameter[];
  attachments?: MedicalAttachment[];
}

export interface MedicalAttachment {
  name: string;
  uri: string;
  mimeType?: string;
  storagePath?: string;
}

export interface MedicalVisit {
  id: string;
  patientId: string;
  patientName: string;
  examinationDate: string;
  createdAt?: string;
  facility: string;
  notes: string;
  attachment?: MedicalAttachment;
  examinations: MedicalExamination[];
}
