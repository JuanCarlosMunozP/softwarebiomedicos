import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Usuario } from "@/types/authentication/auth";
import type { ScheduledMaintenance } from "@/types/agendamientos/scheduling";
import type { WorkOrderDetail } from "@/types/equipment/workorder";
import type { FormState } from "@/types/agendamientos/form";

export interface SchedulingHeaderProps {
  canCreate: boolean;
  onCreate: () => void;
}

export interface SchedulingFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  completedFilter: string;
  onCompletedFilterChange: (value: string) => void;
}

export interface SchedulingRowProps {
  s: ScheduledMaintenance;
  showRequestingArea: boolean;
  equipmentLabel: (id: number) => string;
  canOpenWorkOrder: boolean;
  canRegisterMaintenance: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: (s: ScheduledMaintenance) => void;
  onOpenWorkOrders: () => void;
  onRegisterMaintenance: (s: ScheduledMaintenance) => void;
  onComplete: (s: ScheduledMaintenance) => void;
  onEdit: (s: ScheduledMaintenance) => void;
  onDelete: (s: ScheduledMaintenance) => void;
}

export interface SchedulingTableProps
  extends Omit<SchedulingRowProps, "s"> {
  items: ScheduledMaintenance[];
  loading: boolean;
  tableColSpan: number;
}

export interface SchedulingPaginationProps {
  count: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (targetPage: number) => void;
}

export interface WorkOrderInterventionProps {
  woLoading: boolean;
  woDetail: WorkOrderDetail | null;
}

export interface SchedulingDetailModalProps {
  viewing: ScheduledMaintenance | null;
  onClose: () => void;
  canOpenWorkOrder: boolean;
  workOrderId: number | undefined;
  woLoading: boolean;
  woDetail: WorkOrderDetail | null;
  showRequestingArea: boolean;
  equipmentLabel: (id: number) => string;
}

export interface SchedulingFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: ScheduledMaintenance | null;
  creating: boolean;
  isCoordinatorOrSuperadmin: boolean;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  onSubmit: (ev: FormEvent) => void;
  saving: boolean;
  equipmentLabel: (id: number) => string;
  equipmentOptions: { value: string; label: string }[];
  equipmentError: boolean;
  technicianListAvailable: boolean;
  technicians: Usuario[];
}
