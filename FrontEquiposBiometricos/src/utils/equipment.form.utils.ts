import type { Equipment, EquipmentInput } from "@/types/equipment/equipment";
import type { FormState } from "@/types/equipment/form";

export function equipmentToForm(e: Equipment, inferredBrand: number): FormState {
  return {
    name: e.name ?? "",
    asset_tag: e.asset_tag ?? "",
    internal_code: e.internal_code ?? "",
    serial:e.serial ?? "",
    software_identifier: e.software_identifier ?? "",

    brand: inferredBrand,
    equipment_model: e.equipment_model,
    branch: e.branch,
    branch_text:e.branch_text ?? "",
    department:e.department ?? "",
    city: e.city ?? "",
    area:e.area ?? "",
    location: e.location ?? "",

    technology_type:e.technology_type ?? "",
    biomedical_classification:e.biomedical_classification ?? "",
    risk_class: e.risk_class,

    manufacturer: e.manufacturer ?? "",
    owner: e.owner ?? "",
    client_name: e.client_name ?? "",

    purchase_date: e.purchase_date,
    manufacture_date:e.manufacture_date ?? "",
    supplier_acquisition: e.supplier_acquisition ?? "",
    start_use_date:e.start_use_date ?? "",
    equipment_cost:
      e.equipment_cost !== null && e.equipment_cost !== undefined
        ? String(e.equipment_cost)
        : "",
      
    warranty_start_date: e.warranty_start_date ?? "",
    warranty_end_date: e.warranty_end_date ?? "",

    maintenance_provider: e.maintenance_provider ?? "",
    maintenance_frequency_months:
      e.maintenance_frequency_months !== null && 
      e.maintenance_frequency_months !== undefined
        ? String(e.maintenance_frequency_months)
        : "",
      last_preventive: e.last_preventive ?? "",
      next_preventive:e.next_preventive ?? "",

      calibration_date: e.calibration_date ?? "",
      calibration_frequency_months:
        e.calibration_frequency_months != null
          ? String(e.calibration_frequency_months)
          : "",
          
      
    last_calibration: e.last_calibration ?? "",
    next_calibration: e.next_calibration ?? "",

    electrical_safety_class:e.electrical_safety_class ?? "",
    electrical_safety_type: e.electrical_safety_type ?? "",

    invima_registration: e.invima_registration ?? "",
    ecri: e.ecri ?? "",

    life_use_years: 
      e.life_use_years !== null && e.life_use_years !== undefined
        ? String(e.life_use_years)
        : "",
        
    status: e.status,

    observations: e.observations ?? "",
  };
}

export function formToPayload(form: FormState): EquipmentInput {
  return {
    name: form.name,
    asset_tag: form.asset_tag,
    internal_code:form.internal_code,
    serial: form.serial,
    software_identifier: form.software_identifier,

    equipment_model: form.equipment_model,
      
    branch: form.branch,
    branch_text: form.branch_text,
    department: form.department,
    city: form.city,
    area: form.area,
    location: form.location,

    technology_type: form.technology_type,
    biomedical_classification:form.biomedical_classification,
    risk_class:form.risk_class,

    manufacturer: form.manufacturer,
    owner: form.owner,
    client_name: form.client_name,
  
    purchase_date: form.purchase_date,
    supplier_acquisition: form.supplier_acquisition,
    equipment_cost:form.equipment_cost,
    manufacture_date:form.manufacture_date || undefined,
    start_use_date: form.start_use_date || undefined,

    warranty_start_date:form.warranty_start_date || undefined,
    warranty_end_date: form.warranty_end_date || undefined,

    maintenance_provider: form.maintenance_provider,
    maintenance_frequency_months: form.maintenance_frequency_months
      ? Number(form.maintenance_frequency_months)
      : undefined,
    last_preventive: form.last_preventive,
    next_preventive: form.next_preventive,

    calibration_date: form.calibration_date,
    calibration_frequency_months: form.calibration_frequency_months
      ? Number(form.calibration_frequency_months)
      : undefined,
    last_calibration: form.last_calibration,
    next_calibration:form.next_calibration,

    electrical_safety_class: form.electrical_safety_class,
    electrical_safety_type: form.electrical_safety_type,

    invima_registration: form.invima_registration,
    ecri:form.ecri,

    life_use_years:form.life_use_years
      ? Number(form.life_use_years)
      : undefined,

    status: form.status,

    observations:form.observations,
  };
}
