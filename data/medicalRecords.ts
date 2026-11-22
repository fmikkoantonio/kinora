import diagnostics from "@/data/diagnostics.json";
import parameterCatalog from "@/data/result-parameters.json";
import {
  MedicalExamination,
  RecordCategory,
  ResultParameter,
  ResultValueType,
} from "@/types/medical";

export interface Diagnostic {
  diagnosticId: string;
  diagnosticDescription: string;
}

export const diagnosticCatalog = diagnostics as Diagnostic[];

const parameterDefinitions = parameterCatalog as Record<
  string,
  { name: string; type: ResultValueType }[]
>;

export function hasResultTemplate(diagnosticId: string): boolean {
  return Boolean(parameterDefinitions[diagnosticId]?.length);
}

export function getRecordCategory(diagnosticId: string): RecordCategory {
  if (diagnosticId === "4") return "Imaging";
  if (diagnosticId === "9") return "ECG";
  if (["1", "2", "3", "5", "6", "7", "8", "13", "14", "15", "17", "18", "19"].includes(diagnosticId)) {
    return "Laboratory";
  }
  return "Other";
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createExamination(diagnosticId: string): MedicalExamination {
  const diagnostic = diagnosticCatalog.find((item) => item.diagnosticId === diagnosticId);
  const definitions = parameterDefinitions[diagnosticId] ?? [
    { name: "", type: "longText" as const },
  ];

  return {
    id: createId(),
    diagnosticId,
    name: diagnostic?.diagnosticDescription ?? "Other examination",
    category: getRecordCategory(diagnosticId),
    parameters: definitions.map((definition): ResultParameter => ({
      id: createId(),
      name: definition.name,
      type: definition.type,
      value: "",
      unit: "",
      referenceMin: "",
      referenceMax: "",
    })),
  };
}

export function getResultIndicator(parameter: ResultParameter): "Low" | "Within range" | "High" | null {
  if (parameter.type !== "numeric" || !parameter.value.trim()) return null;

  const value = Number(parameter.value);
  const minimum = Number(parameter.referenceMin);
  const maximum = Number(parameter.referenceMax);
  if (
    !Number.isFinite(value) ||
    !parameter.referenceMin.trim() ||
    !parameter.referenceMax.trim() ||
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum > maximum
  ) {
    return null;
  }

  if (value < minimum) return "Low";
  if (value > maximum) return "High";
  return "Within range";
}

export function getExaminationSummary(examination: MedicalExamination): string {
  const completed = examination.parameters.filter((parameter) => parameter.value.trim());
  if (!completed.length) return "No results entered";
  const first = completed[0];
  return `${first.name}: ${first.value}${first.unit ? ` ${first.unit}` : ""}${
    completed.length > 1 ? ` · +${completed.length - 1} more` : ""
  }`;
}

export function getCategoryLabel(examinations: MedicalExamination[]): string {
  const categories = Array.from(new Set(examinations.map((item) => item.category)));
  return categories.join(" · ");
}
