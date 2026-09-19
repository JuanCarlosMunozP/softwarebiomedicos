import type { ScheduleKind } from "@/types/agendamientos/scheduling";

export interface FormState {
  equipment: number;
  kind: ScheduleKind;
  requested_date: string;
  scheduled_date: string;
  notes: string;
  assigned_technician: number | null;
  assigned_engineer: number | null;
}
