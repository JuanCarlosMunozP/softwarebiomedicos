import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMantenimientos } from "@/pages/admin/mantenimientos/useMantenimientos";
import { MaintenanceHeader } from "@/pages/admin/mantenimientos/MaintenanceHeader";
import { MaintenanceFilter } from "@/pages/admin/mantenimientos/MaintenanceFilter";
import { MaintenanceTable } from "@/pages/admin/mantenimientos/MaintenanceTable";
import { MaintenancePagination } from "@/pages/admin/mantenimientos/MaintenancePagination";
import { MaintenanceFormModal } from "@/pages/admin/mantenimientos/MaintenanceFormModal";

export function MantenimientosPage() {
  const {
    role,
    items,
    count,
    page,
    equipmentError,
    loading,
    error,
    search,
    setSearch,
    kindFilter,
    setKindFilter,
    equipmentFilter,
    setEquipmentFilter,
    editing,
    creating,
    form,
    setForm,
    setPdf,
    saving,
    toDelete,
    setToDelete,
    deleting,
    technicians,
    technicianListAvailable,
    canCreate,
    canEdit,
    canDelete,
    equipmentOptions,
    equipmentLabel,
    scheduleOptions,
    load,
    openCreate,
    openEdit,
    closeModal,
    submit,
    confirmDelete,
    totalPages,
    start,
    end,
  } = useMantenimientos();

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <MaintenanceHeader
        canCreate={canCreate}
        onCreate={openCreate}
      />

      <Card>
        <MaintenanceFilter
          search={search}
          setSearch={setSearch}
          equipmentFilter={equipmentFilter}
          setEquipmentFilter={setEquipmentFilter}
          equipmentOptions={equipmentOptions}
          kindFilter={kindFilter}
          setKindFilter={setKindFilter}
        />

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <MaintenanceTable
          items={items}
          loading={loading}
          equipmentLabel={equipmentLabel}
          canEdit={canEdit}
          canDelete={canDelete}
          openEdit={openEdit}
          setToDelete={setToDelete}
        />

        <MaintenancePagination
          count={count}
          start={start}
          end={end}
          page={page}
          totalPages={totalPages}
          loading={loading}
          load={load}
        />
      </Card>

      <MaintenanceFormModal
        creating={creating}
        editing={editing}
        closeModal={closeModal}
        submit={submit}
        form={form}
        setForm={setForm}
        equipmentOptions={equipmentOptions}
        equipmentError={equipmentError}
        scheduleOptions={scheduleOptions}
        technicianListAvailable={technicianListAvailable}
        technicians={technicians}
        role={role}
        setPdf={setPdf}
        saving={saving}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar mantenimiento"
        description="¿Eliminar este registro? Si tiene PDF también se borrará."
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
