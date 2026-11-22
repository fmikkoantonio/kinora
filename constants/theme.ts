import type { RecordCategory } from "@/types/medical";

export const colors = {
  primary: "#397FC2",
  primaryLight: "#EAF3FC",
  teal: "#51AFA3",
  tealLight: "#E5F4EF",
  background: "#F5F8FA",
  surface: "#FFFFFF",
  text: "#263849",
  muted: "#718096",
  border: "#E5EBF0",
  success: "#27794C",
  successLight: "#E7F3EC",
  warning: "#A66B16",
  warningLight: "#FFF4DF",
};

export const recordCategoryTones: Record<RecordCategory, { iconBackground: string; accent: string }> = {
  Laboratory: { iconBackground: "#DDF1EA", accent: "#318B7E" },
  Imaging: { iconBackground: "#EAE3F5", accent: "#7959A8" },
  ECG: { iconBackground: "#FCE5E1", accent: "#C65B50" },
  Other: { iconBackground: "#E7EBEF", accent: "#64748B" },
};
