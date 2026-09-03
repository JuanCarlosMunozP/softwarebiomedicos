import type { AssignedUser, Usuario } from "@/types/auth";

/** Nombre mostrable de un usuario asignado anidado (`*_detail`) del backend. */
export function assignedUserName(u?: AssignedUser | null): string | null {
  if (!u) return null;
  return u.full_name?.trim() || u.username;
}

/**
 * El backend separa la asignación en dos FK según el rol —
 * `assigned_technician` (rol técnico) y `assigned_engineer` (rol ingeniero) —
 * y valida el rol estrictamente. Dado el usuario elegido, enruta su id al
 * campo correcto y deja el otro en null.
 */
export function assignmentPayload(user?: Usuario | null): {
  assigned_technician: number | null;
  assigned_engineer: number | null;
} {
  if (!user) return { assigned_technician: null, assigned_engineer: null };
  if (user.role === "ingeniero")
    return { assigned_technician: null, assigned_engineer: user.id };
  return { assigned_technician: user.id, assigned_engineer: null };
}

/** Opciones para un <Select> de responsable: solo técnicos e ingenieros activos. */
export function assignableUserOptions(users: Usuario[]) {
  return users
    .filter((u) => u.is_active && (u.role === "tecnico" || u.role === "ingeniero"))
    .map((u) => ({
      label: `${`${u.first_name} ${u.last_name}`.trim() || u.username} · ${
        u.role === "ingeniero" ? "Ingeniero" : "Técnico"
      }`,
      value: u.id,
    }));
}
