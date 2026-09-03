import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type {
  WorkOrder,
  WorkOrderCost,
  WorkOrderDetail,
  WorkOrderEvidence,
  WorkOrderInput,
  WorkOrderMeasurement,
  WorkOrderSignature,
  WorkOrderSparePart,
} from "@/types/workorder";

function unwrap<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export interface WorkOrderListParams {
  ordering?: string;
  equipment?: number;
  status?: string;
  service_type?: string;
  technician?: number;
  search?: string;
}

export const workOrdersService = {
  async list(params: WorkOrderListParams = {}) {
    const res = await api.get<Paginated<WorkOrder> | WorkOrder[]>(
      "/equipment/work-orders/",
      { params },
    );
    return unwrap(res.data);
  },
  async details(id: number) {
    const res = await api.get<WorkOrderDetail>(
      `/equipment/work-orders/${id}/details/`,
    );
    return res.data;
  },
  async create(input: WorkOrderInput) {
    const res = await api.post<WorkOrder>("/equipment/work-orders/", input);
    return res.data;
  },
  async update(id: number, input: Partial<WorkOrderInput>) {
    const res = await api.patch<WorkOrder>(
      `/equipment/work-orders/${id}/`,
      input,
    );
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/equipment/work-orders/${id}/`);
  },

  // --- elementos de una orden ---
  sparePart: crud<WorkOrderSparePart>("/equipment/work-order-spare-parts/"),
  measurement: crud<WorkOrderMeasurement>("/equipment/work-order-measurements/"),
  evidence: crud<WorkOrderEvidence>("/equipment/work-order-evidences/"),
  signature: crud<WorkOrderSignature>("/equipment/work-order-signatures/"),
  cost: crud<WorkOrderCost>("/equipment/work-order-costs/"),
};

function crud<T extends { id: number }>(path: string) {
  return {
    async create(input: Record<string, unknown>) {
      const res = await api.post<T>(path, input);
      return res.data;
    },
    async update(id: number, input: Record<string, unknown>) {
      const res = await api.patch<T>(`${path}${id}/`, input);
      return res.data;
    },
    async remove(id: number) {
      await api.delete(`${path}${id}/`);
    },
  };
}
