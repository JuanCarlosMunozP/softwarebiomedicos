import type { FailureInput, FailureSeverity } from "@/types/failure/failure";

export const SEV_LABEL: Record<FailureSeverity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const SEV_TONE: Record<FailureSeverity, "info" | "warning" | "danger" | "neutral"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export const PAGE_SIZE = 6;

export const empty: FailureInput = {
  equipment: 0,
  description: "",
  severity: "MEDIUM",
};
