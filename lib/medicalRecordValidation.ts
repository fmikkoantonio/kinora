import { getRecordCategory } from "@/data/medicalRecords";
import type {
  MedicalAttachment,
  MedicalExamination,
  MedicalVisit,
  RecordCategory,
  ResultParameter,
  ResultValueType,
} from "@/types/medical";

type DataObject = Record<string, unknown>;

function expectObject(value: unknown, path: string): DataObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value as DataObject;
}

function requiredString(object: DataObject, key: string, path: string): string {
  const value = object[key];
  if (typeof value !== "string") throw new Error(`${path}.${key} must be a string.`);
  return value;
}

function optionalString(object: DataObject, key: string, path: string, fallback = ""): string {
  const value = object[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new Error(`${path}.${key} must be a string.`);
  return value;
}

function parseAttachment(value: unknown, path: string): MedicalAttachment {
  const attachment = expectObject(value, path);
  const name = requiredString(attachment, "name", path);
  const uri = optionalString(attachment, "uri", path);
  const storagePath = optionalString(attachment, "storagePath", path);
  const mimeType = optionalString(attachment, "mimeType", path);
  if (!uri && !storagePath) {
    throw new Error(`${path} must include a URI or storage path.`);
  }
  return {
    name,
    uri,
    ...(mimeType ? { mimeType } : {}),
    ...(storagePath ? { storagePath } : {}),
  };
}

function optionalAttachment(object: DataObject, key: string, path: string): MedicalAttachment | undefined {
  const value = object[key];
  if (value === undefined || value === null) return undefined;
  return parseAttachment(value, `${path}.${key}`);
}

function optionalAttachments(object: DataObject, key: string, path: string): MedicalAttachment[] | undefined {
  const value = object[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error(`${path}.${key} must be an array.`);
  return value.map((item, index) => parseAttachment(item, `${path}.${key}[${index}]`));
}

function parseParameter(value: unknown, path: string): ResultParameter {
  const object = expectObject(value, path);
  const typeValue = object.type === undefined ? "text" : object.type;
  if (
    typeValue !== "numeric"
    && typeValue !== "text"
    && typeValue !== "qualitative"
    && typeValue !== "longText"
  ) {
    throw new Error(`${path}.type is not a supported result type.`);
  }
  return {
    id: requiredString(object, "id", path),
    name: optionalString(object, "name", path),
    type: typeValue as ResultValueType,
    value: optionalString(object, "value", path),
    unit: optionalString(object, "unit", path),
    referenceMin: optionalString(object, "referenceMin", path),
    referenceMax: optionalString(object, "referenceMax", path),
  };
}

function parseExamination(value: unknown, index: number): MedicalExamination {
  const path = `examinations[${index}]`;
  const object = expectObject(value, path);
  const diagnosticId = requiredString(object, "diagnosticId", path);
  const categoryValue = object.category === undefined
    ? getRecordCategory(diagnosticId)
    : requiredString(object, "category", path);
  if (
    categoryValue !== "Laboratory"
    && categoryValue !== "Imaging"
    && categoryValue !== "ECG"
    && categoryValue !== "Other"
  ) {
    throw new Error(`${path}.category is not supported.`);
  }
  const parameters = object.parameters === undefined ? [] : object.parameters;
  if (!Array.isArray(parameters)) throw new Error(`${path}.parameters must be an array.`);

  return {
    id: requiredString(object, "id", path),
    diagnosticId,
    name: requiredString(object, "name", path),
    category: categoryValue as RecordCategory,
    parameters: parameters.map((parameter, parameterIndex) =>
      parseParameter(parameter, `${path}.parameters[${parameterIndex}]`)),
    attachments: optionalAttachments(object, "attachments", path),
  };
}

export function parseMedicalVisitData(value: unknown): Omit<MedicalVisit, "id" | "patientId"> {
  const object = expectObject(value, "record_data");
  if (!Array.isArray(object.examinations)) {
    throw new Error("record_data.examinations must be an array.");
  }

  const createdAt = optionalString(object, "createdAt", "record_data");
  return {
    patientName: requiredString(object, "patientName", "record_data"),
    examinationDate: requiredString(object, "examinationDate", "record_data"),
    facility: optionalString(object, "facility", "record_data"),
    notes: optionalString(object, "notes", "record_data"),
    examinations: object.examinations.map(parseExamination),
    attachment: optionalAttachment(object, "attachment", "record_data"),
    ...(createdAt ? { createdAt } : {}),
  };
}
