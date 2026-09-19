import type { UserTableProps } from "@/types/authentication/props";
import { UserRow } from "@/pages/admin/usuarios/UserRow";

export function UserTable({
  items,
  loading,
  canEdit,
  canDelete,
  role,
  usuario,
  togglingId,
  requestToggle,
  setPwdTarget,
  setNewPassword,
  openEdit,
  setToDelete,
}: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
            <th className="pb-2 font-medium">Usuario</th>
            <th className="pb-2 font-medium">Rol</th>
            <th className="pb-2 font-medium">Estado</th>
            <th className="pb-2 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {loading ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-app-muted">
                Sin usuarios.
              </td>
            </tr>
          ) : (
            items.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                canEdit={canEdit}
                canDelete={canDelete}
                role={role}
                usuario={usuario}
                togglingId={togglingId}
                requestToggle={requestToggle}
                setPwdTarget={setPwdTarget}
                setNewPassword={setNewPassword}
                openEdit={openEdit}
                setToDelete={setToDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
