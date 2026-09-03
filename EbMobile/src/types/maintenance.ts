export type MaintenanceKind = "PREVENTIVE" | "CORRECTIVE" | "REPAIR";

export interface MaintenanceRecord {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  equipment_name?: string;
  kind: MaintenanceKind;
  date: string;
  description: string;
  /** Comentario libre de quien ejecutó el mantenimiento (hallazgos, trabajo realizado). */
  observations?: string;
  technician: number;
  technician_name?: string;
  technician_username?: string;
  cost?: string | null;
  pdf_file_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceInput {
  equipment: number;
  kind: MaintenanceKind;
  date: string;
  description: string;
  observations?: string;
  technician: number;
  cost?: string;
}
