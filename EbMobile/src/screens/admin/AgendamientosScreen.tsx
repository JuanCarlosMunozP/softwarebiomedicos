import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import {
  Bell,
  Check,
  ClipboardCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ListItem } from "@/components/ui/ListItem";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { schedulingService } from "@/services/scheduling.service";
import { equipmentService } from "@/services/equipment.service";
import { usersService } from "@/services/users.service";
import type { ScheduleKind, ScheduledMaintenance } from "@/types/scheduling";
import type { Equipment } from "@/types/equipment";
import type { Usuario } from "@/types/auth";

const KIND_OPTS: SelectOption<ScheduleKind>[] = [
  { label: "Preventivo", value: "PREVENTIVE" },
  { label: "Reparación", value: "REPAIR" },
];

const today = () => new Date().toISOString().slice(0, 10);

interface FormState {
  equipment: number;
  kind: ScheduleKind;
  scheduled_date: string;
  notes: string;
  technician: number | null;
}

function emptyForm(): FormState {
  return {
    equipment: 0,
    kind: "PREVENTIVE",
    scheduled_date: "",
    notes: "",
    technician: null,
  };
}

export function AgendamientosScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const role = usuario?.role;
  const canCreate = can(role, "scheduling", "create");
  const canEdit = can(role, "scheduling", "edit");
  const canDelete = can(role, "scheduling", "delete");

  const [items, setItems] = useState<ScheduledMaintenance[]>([]);
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [filter, setFilter] = useState<"pending" | "completed" | "all">(
    "pending",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<ScheduledMaintenance | "new" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toDelete, setToDelete] = useState<ScheduledMaintenance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, eq] = await Promise.all([
        schedulingService.list({
          is_completed:
            filter === "all" ? undefined : filter === "completed",
          ordering: "-requested_date",
        }),
        equipmentService.list({ ordering: "name" }),
      ]);
      setItems(list);
      setEquipos(eq);
      // El listado de usuarios solo lo permite el rol admin; si falla (403),
      // el selector de técnicos queda vacío pero la pantalla sigue viva.
      usersService
        .list({ is_active: true })
        .then(setTecnicos)
        .catch(() => setTecnicos([]));
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const eqOpts: SelectOption<number>[] = useMemo(
    () => equipos.map((e) => ({ label: `${e.asset_tag} · ${e.name}`, value: e.id })),
    [equipos],
  );
  const tecOpts: SelectOption<number>[] = useMemo(
    () =>
      tecnicos
        .filter((u) => ["tecnico", "ingeniero", "coordinador"].includes(u.role))
        .map((u) => ({
          label: `${u.first_name} ${u.last_name} (${u.username})`.trim(),
          value: u.id,
        })),
    [tecnicos],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (s: ScheduledMaintenance) => {
    setForm({
      equipment: s.equipment,
      kind: s.kind,
      scheduled_date: s.scheduled_date ?? "",
      notes: s.notes ?? "",
      technician: s.technician ?? null,
    });
    setFormError(null);
    setEditing(s);
  };

  const submit = async () => {
    if (!form.equipment) {
      setFormError("El equipo es requerido.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await schedulingService.create({
          equipment: form.equipment,
          kind: form.kind,
          notes: form.notes,
        });
      } else if (editing) {
        await schedulingService.update(editing.id, {
          equipment: form.equipment,
          kind: form.kind,
          scheduled_date: form.scheduled_date || null,
          notes: form.notes,
          technician: form.technician,
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  const complete = async (it: ScheduledMaintenance) => {
    try {
      await schedulingService.complete(it.id);
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  };

  const notify = async (it: ScheduledMaintenance) => {
    try {
      const r = await schedulingService.notify(it.id);
      Alert.alert("Notificación enviada", r.detail ?? "Listo");
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await schedulingService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer scroll={false} contentClassName="gap-3">
      <View className="gap-3 px-4 pt-4">
        <Select
          value={filter}
          options={[
            { label: "Pendientes", value: "pending" },
            { label: "Completadas", value: "completed" },
            { label: "Todas", value: "all" },
          ]}
          onChange={(v) => setFilter(v as any)}
        />
        {canCreate && (
          <Button
            onPress={openCreate}
            leftIcon={<Plus size={16} color="#fff" />}
            fullWidth
          >
            Nueva solicitud
          </Button>
        )}
      </View>

      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-6 gap-2"
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ClipboardCheck size={28} color={colors.textMuted} />}
            title="Sin solicitudes"
            description="No hay solicitudes de mantenimiento con este filtro."
          />
        }
        renderItem={({ item }) => {
          const showActive = !item.is_completed && canEdit;
          const showEdit = !item.is_completed && canEdit;
          const showDelete = canDelete;
          const hasActions = showActive || showEdit || showDelete;
          const solicitadaPor =
            item.requested_by_detail?.full_name ||
            item.requested_by_detail?.username;
          return (
            <ListItem
              title={`${item.equipment_asset_tag ?? ""} · ${item.equipment_name ?? ""}`.trim() ||
                "Equipo"}
              subtitle={item.notes ?? "Sin notas"}
              meta={[
                `Solicitada ${item.requested_date}`,
                item.scheduled_date
                  ? `Programada ${item.scheduled_date}`
                  : "Por programar",
                solicitadaPor ? `por ${solicitadaPor}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              trailing={
                <Badge tone={item.is_completed ? "success" : "warning"}>
                  {item.is_completed ? "Completada" : "Pendiente"}
                </Badge>
              }
              actions={
                hasActions ? (
                  <>
                    {showActive && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => notify(item)}
                          leftIcon={<Bell size={14} color={colors.text} />}
                          className="flex-1"
                        >
                          Notificar
                        </Button>
                        <Button
                          size="sm"
                          onPress={() => complete(item)}
                          leftIcon={<Check size={14} color="#fff" />}
                          className="flex-1"
                        >
                          Completar
                        </Button>
                      </>
                    )}
                    {showEdit && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => openEdit(item)}
                        leftIcon={<Pencil size={14} color={colors.text} />}
                        className="flex-1"
                      >
                        {item.scheduled_date ? "Editar" : "Programar"}
                      </Button>
                    )}
                    {showDelete && (
                      <Button
                        variant="danger"
                        size="sm"
                        onPress={() => setToDelete(item)}
                        leftIcon={<Trash2 size={14} color="#fff" />}
                        className="flex-1"
                      >
                        Eliminar
                      </Button>
                    )}
                  </>
                ) : undefined
              }
            />
          );
        }}
      />

      <Modal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nueva solicitud" : "Programar solicitud"}
        footer={
          <>
            <Button variant="secondary" onPress={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onPress={submit} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <View className="gap-3">
          {formError && (
            <Text className="text-sm text-red-600">{formError}</Text>
          )}
          <Select
            label="Equipo *"
            value={form.equipment || null}
            options={eqOpts}
            onChange={(v) => setForm({ ...form, equipment: v })}
          />
          <Select
            label="Tipo *"
            value={form.kind}
            options={KIND_OPTS}
            onChange={(v) => setForm({ ...form, kind: v })}
          />
          {editing === "new" ? (
            <Input
              label="Fecha de solicitud"
              value={today()}
              editable={false}
            />
          ) : (
            <>
              <Input
                label="Fecha programada (YYYY-MM-DD)"
                value={form.scheduled_date}
                onChangeText={(v) => setForm({ ...form, scheduled_date: v })}
              />
              <Select
                label="Técnico"
                value={form.technician ?? null}
                options={[{ label: "Sin asignar", value: 0 }, ...tecOpts]}
                onChange={(v) =>
                  setForm({ ...form, technician: v ? Number(v) : null })
                }
              />
            </>
          )}
          <Input
            label="Notas"
            value={form.notes ?? ""}
            onChangeText={(v) => setForm({ ...form, notes: v })}
            multiline
            numberOfLines={3}
            className="h-24 py-2"
          />
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminar solicitud"
        message="¿Eliminar definitivamente esta solicitud? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenContainer>
  );
}
