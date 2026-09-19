import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { ModelFormModalProps } from "@/types/equipment/catalog-props";

export function ModelFormModal({
  creatingModel,
  editingModel,
  closeModelModal,
  submitModel,
  modelForm,
  setModelForm,
  brandOptions,
  savingModel,
}: ModelFormModalProps) {
  return (
    <Modal
      open={creatingModel || !!editingModel}
      onClose={closeModelModal}
      title={editingModel ? "Editar modelo" : "Nuevo modelo"}
      size="sm"
      nested
    >
      <form onSubmit={submitModel} className="flex flex-col gap-4">
        <Select
          label="Marca"
          value={modelForm.brand ? String(modelForm.brand) : ""}
          onChange={(e) =>
            setModelForm({ ...modelForm, brand: Number(e.target.value) })
          }
          options={brandOptions}
          required
        />
        <Input
          label="Nombre del modelo"
          value={modelForm.name}
          onChange={(e) =>
            setModelForm({ ...modelForm, name: e.target.value })
          }
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeModelModal}>
            Cancelar
          </Button>
          <Button type="submit" loading={savingModel}>
            {editingModel ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
