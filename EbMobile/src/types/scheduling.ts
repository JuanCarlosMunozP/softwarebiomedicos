export type ScheduleKind = "PREVENTIVE" | "REPAIR";

export interface ScheduledMaintenance {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  equipment_name?: string;
  kind: ScheduleKind;
  scheduled_date: string;
  notes?: string;
  technician?: number | null;
  technician_name?: string | null;
  technician_username?: string | null;
  is_completed: boolean;
  notified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleInput {
  equipment: number;
  kind: ScheduleKind;
  scheduled_date: string;
  notes?: string;
  technician?: number | null;
}
