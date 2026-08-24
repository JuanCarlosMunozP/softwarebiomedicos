export type Rol = "superadmin" | "admin" | "coordinador" | "ingeniero" | "tecnico";

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Rol;
  phone?: string | null;
  is_active: boolean;
  branch?: number | null;
  branch_name?: string | null;
  date_joined?: string;
  last_login?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RefreshResponse {
  access: string;
}
