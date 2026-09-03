export type ScheduleKind = "PREVENTIVE" | "REPAIR";

export interface RequestedByUser {
  id: number;
  username: string;
  full_name: string;
}

export interface ScheduledMaintenance {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  equipment_name?: string;
  kind: ScheduleKind;
  /** Fecha en que se creó la solicitud (solo lectura). */
  requested_date: string;
  requested_by_detail?: RequestedByUser | null;
  /** Fecha de programación; null mientras la solicitud no se agenda. */
  scheduled_date: string | null;
  notes?: string;
  technician?: number | null;
  technician_name?: string | null;
  technician_username?: string | null;
  is_completed: boolean;
  notified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Campos que envía el formulario de "Nueva solicitud". */
export interface ScheduleCreateInput {
  equipment: number;
  kind: ScheduleKind;
  notes?: string;
}

/** Campos editables al programar/asignar una solicitud existente. */
export interface ScheduleUpdateInput {
  equipment?: number;
  kind?: ScheduleKind;
  scheduled_date?: string | null;
  notes?: string;
  technician?: number | null;
  is_completed?: boolean;
}
