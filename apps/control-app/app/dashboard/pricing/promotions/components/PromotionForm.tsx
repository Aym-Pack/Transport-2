'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  SelectOption,
  Checkbox,
  Button,
  Textarea,
} from '@samatransport/ui';

export interface PromotionFormData {
  id?: string; // BIGINT, string in JS
  name: string;
  description?: string;
  promo_code?: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number; // Numeric
  applicable_to_all_tariffs: boolean;
  applicable_routes?: string[] | null; // Array of route UUIDs
  applicable_vehicle_types?: string[] | null; // Array of vehicle type UUIDs
  valid_from: string; // ISO datetime string
  valid_until: string; // ISO datetime string
  max_uses?: number | null;
  is_active: boolean;
  // For submission, this will be used by the parent page to construct the final payload
  passenger_tariff_ids?: string[]; // Array of tariff IDs (BIGINTs as strings)
}

// Form state handles numbers and dates as strings, and multi-selects as Sets
interface FormState {
  id?: string;
  name: string;
  description: string;
  promo_code: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value_str: string;
  applicable_to_all_tariffs: boolean;
  selected_tariff_ids: Set<string>;
  selected_route_ids: Set<string>;
  selected_vehicle_type_ids: Set<string>;
  valid_from_str: string; // YYYY-MM-DDTHH:mm
  valid_until_str: string; // YYYY-MM-DDTHH:mm
  max_uses_str: string;
  is_active: boolean;
}

interface PromotionFormProps {
  initialData?: Partial<PromotionFormData>; // From API, passenger_tariff_ids, applicable_routes, applicable_vehicle_types are arrays
  onSubmit: (data: PromotionFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
  tariffsList: SelectOption[]; // { value: string (id), label: string }
  routesList: SelectOption[];
  vehicleTypesList: SelectOption[];
}

export const PromotionForm: React.FC<PromotionFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  tariffsList,
  routesList,
  vehicleTypesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    description: initialData?.description || '',
    promo_code: initialData?.promo_code || '',
    discount_type: initialData?.discount_type || 'PERCENTAGE',
    discount_value_str: initialData?.discount_value?.toString() || '',
    applicable_to_all_tariffs: initialData?.applicable_to_all_tariffs === undefined ? false : initialData.applicable_to_all_tariffs,
    selected_tariff_ids: new Set(initialData?.passenger_tariff_ids?.map(String) || []),
    selected_route_ids: new Set(initialData?.applicable_routes?.map(String) || []),
    selected_vehicle_type_ids: new Set(initialData?.applicable_vehicle_types?.map(String) || []),
    valid_from_str: initialData?.valid_from ? initialData.valid_from.slice(0, 16) : '', // YYYY-MM-DDTHH:mm
    valid_until_str: initialData?.valid_until ? initialData.valid_until.slice(0, 16) : '', // YYYY-MM-DDTHH:mm
    max_uses_str: initialData?.max_uses?.toString() || '',
    is_active: initialData?.is_active === undefined ? true : initialData.is_active,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || undefined,
        name: initialData.name || '',
        description: initialData.description || '',
        promo_code: initialData.promo_code || '',
        discount_type: initialData.discount_type || 'PERCENTAGE',
        discount_value_str: initialData.discount_value?.toString() || '',
        applicable_to_all_tariffs: initialData.applicable_to_all_tariffs === undefined ? false : initialData.applicable_to_all_tariffs,
        selected_tariff_ids: new Set(initialData.passenger_tariff_ids?.map(String) || []),
        selected_route_ids: new Set(initialData.applicable_routes?.map(String) || []),
        selected_vehicle_type_ids: new Set(initialData.applicable_vehicle_types?.map(String) || []),
        valid_from_str: initialData.valid_from ? initialData.valid_from.slice(0, 16) : '',
        valid_until_str: initialData.valid_until ? initialData.valid_until.slice(0, 16) : '',
        max_uses_str: initialData.max_uses?.toString() || '',
        is_active: initialData.is_active === undefined ? true : initialData.is_active,
      });
    }
  }, [initialData]);

  const handleMultiSelectChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    const { value, checked } = e.target;
    setter(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(value);
      else newSet.delete(value);
      return newSet;
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox' && name !== 'is_active' && name !== 'applicable_to_all_tariffs') {
        // This case is handled by specific multi-select handlers if needed, or can be generalized
    } else if (type === 'checkbox') { // For is_active and applicable_to_all_tariffs
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    }
    else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };


  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.name.trim()) errors.name = 'Promotion name is required.';
    if (!formData.discount_value_str.trim()) {
      errors.discount_value_str = 'Discount value is required.';
    } else if (isNaN(parseFloat(formData.discount_value_str)) || parseFloat(formData.discount_value_str) <= 0) {
      errors.discount_value_str = 'Discount value must be a positive number.';
    }
    if (!formData.valid_from_str) errors.valid_from_str = 'Valid from date is required.';
    if (!formData.valid_until_str) errors.valid_until_str = 'Valid until date is required.';
    if (formData.valid_from_str && formData.valid_until_str && new Date(formData.valid_from_str) >= new Date(formData.valid_until_str)) {
      errors.valid_until_str = '"Valid Until" must be after "Valid From".';
    }
    if (formData.max_uses_str && (isNaN(parseInt(formData.max_uses_str, 10)) || parseInt(formData.max_uses_str, 10) < 0)) {
      errors.max_uses_str = 'Max uses must be a non-negative integer if provided.';
    }
    if (formData.promo_code && !/^[a-zA-Z0-9_-]+$/.test(formData.promo_code)) {
        errors.promo_code = 'Promo code can only contain letters, numbers, underscores, and hyphens.';
    }
    if (!formData.applicable_to_all_tariffs && formData.selected_tariff_ids.size === 0) {
        errors.selected_tariff_ids = 'Please select specific tariffs or choose "Applicable to all tariffs".';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: PromotionFormData = {
      id: formData.id,
      name: formData.name,
      description: formData.description || undefined,
      promo_code: formData.promo_code || undefined,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value_str),
      applicable_to_all_tariffs: formData.applicable_to_all_tariffs,
      passenger_tariff_ids: formData.applicable_to_all_tariffs ? [] : Array.from(formData.selected_tariff_ids),
      applicable_routes: Array.from(formData.selected_route_ids).length > 0 ? Array.from(formData.selected_route_ids) : null,
      applicable_vehicle_types: Array.from(formData.selected_vehicle_type_ids).length > 0 ? Array.from(formData.selected_vehicle_type_ids) : null,
      valid_from: new Date(formData.valid_from_str).toISOString(),
      valid_until: new Date(formData.valid_until_str).toISOString(),
      max_uses: formData.max_uses_str ? parseInt(formData.max_uses_str, 10) : null,
      is_active: formData.is_active,
    };
    await onSubmit(submissionData);
  };

  const discountTypeOptions: SelectOption[] = [
    { value: 'PERCENTAGE', label: 'Percentage (%)' },
    { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
  ];

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input label="Promotion Name" name="name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required maxLength={100}/>
      <Textarea label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} rows={3}/>
      <Input label="Promo Code (Optional)" name="promo_code" value={formData.promo_code} onChange={handleChange} error={fieldErrors.promo_code} maxLength={50}/>

      <div style={{display: 'flex', gap: '1rem'}}>
        <Select label="Discount Type" name="discount_type" value={formData.discount_type} onChange={handleChange} options={discountTypeOptions} error={fieldErrors.discount_type} required/>
        <Input label="Discount Value" name="discount_value_str" type="text" value={formData.discount_value_str} onChange={handleChange} error={fieldErrors.discount_value_str} required placeholder="e.g., 10 or 10.50"/>
      </div>

      <Input label="Valid From" name="valid_from_str" type="datetime-local" value={formData.valid_from_str} onChange={handleChange} error={fieldErrors.valid_from_str} required />
      <Input label="Valid Until" name="valid_until_str" type="datetime-local" value={formData.valid_until_str} onChange={handleChange} error={fieldErrors.valid_until_str} required />
      <Input label="Max Uses (Optional, 0 for unlimited if backend handles 0 as unlimited)" name="max_uses_str" type="number" value={formData.max_uses_str} onChange={handleChange} error={fieldErrors.max_uses_str} min="0" />
      <Checkbox label="Is Active" name="is_active" checked={formData.is_active} onChange={handleChange} />

      <hr style={{margin: "20px 0"}}/>
      <Checkbox label="Applicable to All Tariffs" name="applicable_to_all_tariffs" checked={formData.applicable_to_all_tariffs} onChange={handleChange} />
      {!formData.applicable_to_all_tariffs && (
        <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Applicable Tariffs:</label>
          {fieldErrors.selected_tariff_ids && <p style={{color: 'red', fontSize: '0.875rem'}}>{fieldErrors.selected_tariff_ids}</p>}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {tariffsList.map(tariff => (
              <Checkbox key={tariff.value} name="selected_tariffs" value={tariff.value} label={tariff.label} checked={formData.selected_tariff_ids.has(tariff.value)} onChange={(e) => handleMultiSelectChange(e, setFormData.bind(null, prev => ({...prev, selected_tariff_ids: prev.selected_tariff_ids})))} />
            ))}
          </div>
        </div>
      )}

      <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Restrict to Specific Routes (Optional):</label>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {routesList.map(route => (
                <Checkbox key={route.value} name="selected_routes" value={route.value} label={route.label} checked={formData.selected_route_ids.has(route.value)} onChange={(e) => handleMultiSelectChange(e, setFormData.bind(null, prev => ({...prev, selected_route_ids: prev.selected_route_ids})))} />
            ))}
        </div>
      </div>

      <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Restrict to Specific Vehicle Types (Optional):</label>
         <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {vehicleTypesList.map(vt => (
                <Checkbox key={vt.value} name="selected_vehicle_types" value={vt.value} label={vt.label} checked={formData.selected_vehicle_type_ids.has(vt.value)} onChange={(e) => handleMultiSelectChange(e, setFormData.bind(null, prev => ({...prev, selected_vehicle_type_ids: prev.selected_vehicle_type_ids})))} />
            ))}
        </div>
      </div>


      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Promotion')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default PromotionForm;
