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

export interface LoyaltyProgramFormData {
  id?: string; // BIGINT, string in JS
  name: string;
  description?: string;
  points_per_currency_unit_spent: number; // Numeric
  base_currency_code_for_points: string; // TEXT
  is_active: boolean;
}

// Form state will handle points as a string for easier input management
interface FormState {
  id?: string;
  name: string;
  description: string;
  points_per_currency_unit_spent_str: string;
  base_currency_code_for_points: string;
  is_active: boolean;
}

interface LoyaltyProgramFormProps {
  initialData?: Partial<LoyaltyProgramFormData>;
  onSubmit: (data: LoyaltyProgramFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | string[] | null; // Allow string array for multiple errors
  onCancel: () => void;
  currenciesList: SelectOption[];
}

export const LoyaltyProgramForm: React.FC<LoyaltyProgramFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  currenciesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    description: initialData?.description || '',
    points_per_currency_unit_spent_str: initialData?.points_per_currency_unit_spent?.toString() || '',
    base_currency_code_for_points: initialData?.base_currency_code_for_points || '',
    is_active: initialData?.is_active === undefined ? false : initialData.is_active, // Default to false for new
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const errorStyle: React.CSSProperties = {
    color: 'red', marginBottom: '1rem', padding: '10px',
    border: '1px solid red', borderRadius: '4px', background: '#ffebeb'
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || undefined,
        name: initialData.name || '',
        description: initialData.description || '',
        points_per_currency_unit_spent_str: initialData.points_per_currency_unit_spent?.toString() || '',
        base_currency_code_for_points: initialData.base_currency_code_for_points || '',
        is_active: initialData.is_active === undefined ? false : initialData.is_active,
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
    if (!formData.name.trim()) errors.name = 'Program name is required.';
    if (!formData.points_per_currency_unit_spent_str.trim()) {
      errors.points_per_currency_unit_spent_str = 'Points rule is required.';
    } else if (isNaN(parseFloat(formData.points_per_currency_unit_spent_str)) || parseFloat(formData.points_per_currency_unit_spent_str) <= 0) {
      errors.points_per_currency_unit_spent_str = 'Points must be a positive number.';
    }
    if (!formData.base_currency_code_for_points) errors.base_currency_code_for_points = 'Base currency is required.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: LoyaltyProgramFormData = {
      id: formData.id,
      name: formData.name,
      description: formData.description || undefined,
      points_per_currency_unit_spent: parseFloat(formData.points_per_currency_unit_spent_str),
      base_currency_code_for_points: formData.base_currency_code_for_points,
      is_active: formData.is_active,
    };
    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && (
        <div style={errorStyle}>
          {typeof formError === 'string' ? <p>{formError}</p> : formError.map((err, index) => <p key={index}>{err}</p>)}
        </div>
      )}

      <Input label="Program Name" name="name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required maxLength={100}/>
      <Textarea label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} rows={3}/>
      <Input label="Points Awarded (per unit of base currency spent)" name="points_per_currency_unit_spent_str" type="text" value={formData.points_per_currency_unit_spent_str} onChange={handleChange} error={fieldErrors.points_per_currency_unit_spent_str} required placeholder="e.g., 1 or 0.5"/>
      <Select label="Base Currency for Points Calculation" name="base_currency_code_for_points" value={formData.base_currency_code_for_points} onChange={handleChange} options={currenciesList} error={fieldErrors.base_currency_code_for_points} required/>
      <Checkbox label="Is Active Program (Note: Activating this program may deactivate other active programs)" name="is_active" checked={formData.is_active} onChange={handleChange} />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Program')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default LoyaltyProgramForm;
