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

export interface PolicyRuleFormData {
  id?: string; // BIGINT, string in JS
  name: string;
  policy_type: 'CANCELLATION' | 'MODIFICATION' | 'REFUND';
  description?: string;
  applicable_route_id?: string | null; // UUID, string in JS
  applicable_vehicle_type_id?: string | null; // UUID, string in JS
  applicable_passenger_category?: string;
  min_hours_before_departure?: number | null;
  max_hours_before_departure?: number | null;
  fee_type: 'PERCENTAGE_OF_PRICE' | 'FIXED_AMOUNT' | 'NO_FEE';
  fee_value?: number | null;
  is_allowed: boolean;
  notes?: string;
  priority: number; // Integer
  is_active: boolean;
}

// Form state will handle numbers as strings for easier input management
interface FormState {
  id?: string;
  name: string;
  policy_type: 'CANCELLATION' | 'MODIFICATION' | 'REFUND';
  description: string;
  applicable_route_id_str: string;
  applicable_vehicle_type_id_str: string;
  applicable_passenger_category: string;
  min_hours_before_departure_str: string;
  max_hours_before_departure_str: string;
  fee_type: 'PERCENTAGE_OF_PRICE' | 'FIXED_AMOUNT' | 'NO_FEE';
  fee_value_str: string;
  is_allowed: boolean;
  notes: string;
  priority_str: string;
  is_active: boolean;
}

interface PolicyRuleFormProps {
  initialData?: Partial<PolicyRuleFormData>;
  onSubmit: (data: PolicyRuleFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | string[] | null; // Modified to accept string array
  onCancel: () => void;
  routesList: SelectOption[];
  vehicleTypesList: SelectOption[];
}

const policyTypeOptions: SelectOption[] = [
  { value: 'CANCELLATION', label: 'Cancellation' },
  { value: 'MODIFICATION', label: 'Modification' },
  { value: 'REFUND', label: 'Refund' },
];

const feeTypeOptions: SelectOption[] = [
  { value: 'NO_FEE', label: 'No Fee' },
  { value: 'PERCENTAGE_OF_PRICE', label: 'Percentage of Price (%)' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
];

const noneOption = { value: '', label: 'None / General' };

export const PolicyRuleForm: React.FC<PolicyRuleFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  routesList,
  vehicleTypesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    policy_type: initialData?.policy_type || 'CANCELLATION',
    description: initialData?.description || '',
    applicable_route_id_str: initialData?.applicable_route_id || '',
    applicable_vehicle_type_id_str: initialData?.applicable_vehicle_type_id || '',
    applicable_passenger_category: initialData?.applicable_passenger_category || '',
    min_hours_before_departure_str: initialData?.min_hours_before_departure?.toString() || '',
    max_hours_before_departure_str: initialData?.max_hours_before_departure?.toString() || '',
    fee_type: initialData?.fee_type || 'NO_FEE',
    fee_value_str: initialData?.fee_value?.toString() || '',
    is_allowed: initialData?.is_allowed === undefined ? true : initialData.is_allowed,
    notes: initialData?.notes || '',
    priority_str: initialData?.priority?.toString() || '0',
    is_active: initialData?.is_active === undefined ? true : initialData.is_active,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Style for error messages
  const errorStyle: React.CSSProperties = {
    color: 'red',
    marginBottom: '1rem',
    padding: '10px',
    border: '1px solid red',
    borderRadius: '4px',
    background: '#ffebeb'
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || undefined,
        name: initialData.name || '',
        policy_type: initialData.policy_type || 'CANCELLATION',
        description: initialData.description || '',
        applicable_route_id_str: initialData.applicable_route_id || '',
        applicable_vehicle_type_id_str: initialData.applicable_vehicle_type_id || '',
        applicable_passenger_category: initialData.applicable_passenger_category || '',
        min_hours_before_departure_str: initialData.min_hours_before_departure?.toString() || '',
        max_hours_before_departure_str: initialData.max_hours_before_departure?.toString() || '',
        fee_type: initialData.fee_type || 'NO_FEE',
        fee_value_str: initialData.fee_value?.toString() || '',
        is_allowed: initialData.is_allowed === undefined ? true : initialData.is_allowed,
        notes: initialData.notes || '',
        priority_str: initialData.priority?.toString() || '0',
        is_active: initialData.is_active === undefined ? true : initialData.is_active,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.name.trim()) errors.name = 'Rule name is required.';
    if (!formData.priority_str.trim()) {
      errors.priority_str = 'Priority is required.';
    } else if (isNaN(parseInt(formData.priority_str, 10))) {
      errors.priority_str = 'Priority must be an integer.';
    }

    const minHours = formData.min_hours_before_departure_str ? parseInt(formData.min_hours_before_departure_str, 10) : null;
    const maxHours = formData.max_hours_before_departure_str ? parseInt(formData.max_hours_before_departure_str, 10) : null;

    if (formData.min_hours_before_departure_str && (isNaN(minHours!) || minHours! < 0)) {
      errors.min_hours_before_departure_str = 'Min hours must be a non-negative integer.';
    }
    if (formData.max_hours_before_departure_str && (isNaN(maxHours!) || maxHours! < 0)) {
      errors.max_hours_before_departure_str = 'Max hours must be a non-negative integer.';
    }
    if (minHours !== null && maxHours !== null && maxHours <= minHours) {
      errors.max_hours_before_departure_str = 'Max hours must be greater than Min hours.';
    }

    if (formData.fee_type !== 'NO_FEE') {
      if (!formData.fee_value_str.trim()) {
        errors.fee_value_str = 'Fee value is required if Fee Type is not "No Fee".';
      } else if (isNaN(parseFloat(formData.fee_value_str)) || parseFloat(formData.fee_value_str) < 0) {
        errors.fee_value_str = 'Fee value must be a non-negative number.';
      }
    } else { // NO_FEE
        if (formData.fee_value_str.trim() !== '') {
             errors.fee_value_str = 'Fee value must be empty or 0 if Fee Type is "No Fee".';
        }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: PolicyRuleFormData = {
      id: formData.id,
      name: formData.name,
      policy_type: formData.policy_type,
      description: formData.description || undefined,
      applicable_route_id: formData.applicable_route_id_str || null,
      applicable_vehicle_type_id: formData.applicable_vehicle_type_id_str || null,
      applicable_passenger_category: formData.applicable_passenger_category || undefined,
      min_hours_before_departure: formData.min_hours_before_departure_str ? parseInt(formData.min_hours_before_departure_str, 10) : null,
      max_hours_before_departure: formData.max_hours_before_departure_str ? parseInt(formData.max_hours_before_departure_str, 10) : null,
      fee_type: formData.fee_type,
      fee_value: formData.fee_type !== 'NO_FEE' ? parseFloat(formData.fee_value_str) : null,
      is_allowed: formData.is_allowed,
      notes: formData.notes || undefined,
      priority: parseInt(formData.priority_str, 10),
      is_active: formData.is_active,
    };
    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && (
        <div style={errorStyle}>
          {typeof formError === 'string' ? (
            <p>{formError}</p>
          ) : (
            formError.map((err, index) => <p key={index}>{err}</p>)
          )}
        </div>
      )}

      <Input label="Rule Name" name="name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required maxLength={100}/>
      <Select label="Policy Type" name="policy_type" value={formData.policy_type} onChange={handleChange} options={policyTypeOptions} error={fieldErrors.policy_type} required/>
      <Textarea label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} rows={3}/>

      <Select label="Applicable Route (Optional)" name="applicable_route_id_str" value={formData.applicable_route_id_str} onChange={handleChange} options={[noneOption, ...routesList]} error={fieldErrors.applicable_route_id_str} />
      <Select label="Applicable Vehicle Type (Optional)" name="applicable_vehicle_type_id_str" value={formData.applicable_vehicle_type_id_str} onChange={handleChange} options={[noneOption, ...vehicleTypesList]} error={fieldErrors.applicable_vehicle_type_id_str} />
      <Input label="Applicable Passenger Category (Optional, e.g., ADULT, CHILD)" name="applicable_passenger_category" value={formData.applicable_passenger_category} onChange={handleChange} error={fieldErrors.applicable_passenger_category} maxLength={50}/>

      <Input label="Min Hours Before Departure (Optional)" name="min_hours_before_departure_str" type="number" value={formData.min_hours_before_departure_str} onChange={handleChange} error={fieldErrors.min_hours_before_departure_str} min="0"/>
      <Input label="Max Hours Before Departure (Optional)" name="max_hours_before_departure_str" type="number" value={formData.max_hours_before_departure_str} onChange={handleChange} error={fieldErrors.max_hours_before_departure_str} min="0"/>

      <Select label="Fee Type" name="fee_type" value={formData.fee_type} onChange={handleChange} options={feeTypeOptions} error={fieldErrors.fee_type} required/>
      {formData.fee_type !== 'NO_FEE' && (
        <Input label="Fee Value" name="fee_value_str" type="text" value={formData.fee_value_str} onChange={handleChange} error={fieldErrors.fee_value_str} required placeholder="e.g., 10.50 or 15"/>
      )}

      <Checkbox label="Is Action Allowed (e.g., Is cancellation allowed?)" name="is_allowed" checked={formData.is_allowed} onChange={handleChange} />
      <Input label="Priority (Integer, higher evaluates first)" name="priority_str" type="number" value={formData.priority_str} onChange={handleChange} error={fieldErrors.priority_str} required/>
      <Checkbox label="Is Active" name="is_active" checked={formData.is_active} onChange={handleChange} />
      <Textarea label="Notes (Optional)" name="notes" value={formData.notes} onChange={handleChange} error={fieldErrors.notes} rows={3}/>


      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Policy Rule')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default PolicyRuleForm;
