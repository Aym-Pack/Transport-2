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
  points_per_currency_unit_spent?: number | null; // Numeric
  base_currency_code_for_points?: string | null; // TEXT
  is_active: boolean;
  earning_rule_type?: 'PER_CURRENCY_UNIT_SPENT' | 'PER_TRANSACTION' | 'PER_ITEM_QUANTITY';
  fixed_points_per_transaction?: number | null;
  points_per_item?: number | null;
  item_unit_description?: string | null;
}

// Form state will handle points as a string for easier input management
interface FormState {
  id?: string;
  name: string;
  description: string;
  points_per_currency_unit_spent_str: string;
  base_currency_code_for_points: string;
  is_active: boolean;
  earning_rule_type: 'PER_CURRENCY_UNIT_SPENT' | 'PER_TRANSACTION' | 'PER_ITEM_QUANTITY';
  fixed_points_per_transaction_str: string;
  points_per_item_str: string;
  item_unit_description: string;
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
    earning_rule_type: initialData?.earning_rule_type || 'PER_CURRENCY_UNIT_SPENT',
    fixed_points_per_transaction_str: initialData?.fixed_points_per_transaction?.toString() || '',
    points_per_item_str: initialData?.points_per_item?.toString() || '',
    item_unit_description: initialData?.item_unit_description || '',
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
        earning_rule_type: initialData.earning_rule_type || 'PER_CURRENCY_UNIT_SPENT',
        fixed_points_per_transaction_str: initialData.fixed_points_per_transaction?.toString() || '',
        points_per_item_str: initialData.points_per_item?.toString() || '',
        item_unit_description: initialData.item_unit_description || '',
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

    if (formData.earning_rule_type === 'PER_CURRENCY_UNIT_SPENT') {
      if (!formData.points_per_currency_unit_spent_str.trim()) {
        errors.points_per_currency_unit_spent_str = 'Points rule is required.';
      } else if (isNaN(parseFloat(formData.points_per_currency_unit_spent_str)) || parseFloat(formData.points_per_currency_unit_spent_str) <= 0) {
        errors.points_per_currency_unit_spent_str = 'Points must be a positive number.';
      }
      if (!formData.base_currency_code_for_points) errors.base_currency_code_for_points = 'Base currency is required.';
    } else if (formData.earning_rule_type === 'PER_TRANSACTION') {
      if (!formData.fixed_points_per_transaction_str.trim()) {
        errors.fixed_points_per_transaction_str = 'Fixed points per transaction is required.';
      } else if (isNaN(parseFloat(formData.fixed_points_per_transaction_str)) || parseFloat(formData.fixed_points_per_transaction_str) <= 0) {
        errors.fixed_points_per_transaction_str = 'Fixed points must be a positive number.';
      }
    } else if (formData.earning_rule_type === 'PER_ITEM_QUANTITY') {
      if (!formData.points_per_item_str.trim()) {
        errors.points_per_item_str = 'Points per item/unit is required.';
      } else if (isNaN(parseFloat(formData.points_per_item_str)) || parseFloat(formData.points_per_item_str) <= 0) {
        errors.points_per_item_str = 'Points per item/unit must be a positive number.';
      }
      if (!formData.item_unit_description.trim()) {
        errors.item_unit_description = 'Item/Unit description is required.';
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

    const submissionData: LoyaltyProgramFormData = {
      id: formData.id,
      name: formData.name,
      description: formData.description || undefined,
      is_active: formData.is_active,
      earning_rule_type: formData.earning_rule_type,
      points_per_currency_unit_spent: null,
      base_currency_code_for_points: null,
      fixed_points_per_transaction: null,
      points_per_item: null,
      item_unit_description: null,
    };

    if (formData.earning_rule_type === 'PER_CURRENCY_UNIT_SPENT') {
      submissionData.points_per_currency_unit_spent = parseFloat(formData.points_per_currency_unit_spent_str);
      submissionData.base_currency_code_for_points = formData.base_currency_code_for_points;
    } else if (formData.earning_rule_type === 'PER_TRANSACTION') {
      submissionData.fixed_points_per_transaction = parseFloat(formData.fixed_points_per_transaction_str);
    } else if (formData.earning_rule_type === 'PER_ITEM_QUANTITY') {
      submissionData.points_per_item = parseFloat(formData.points_per_item_str);
      submissionData.item_unit_description = formData.item_unit_description;
    }

    await onSubmit(submissionData);
  };

  const earningRuleTypeOptions: SelectOption[] = [
    { value: 'PER_CURRENCY_UNIT_SPENT', label: 'Points per currency unit spent' },
    { value: 'PER_TRANSACTION', label: 'Fixed points per transaction' },
    { value: 'PER_ITEM_QUANTITY', label: 'Points per item/unit in transaction' },
  ];

  return (
    <Form onSubmit={handleSubmit}>
      {formError && (
        <div style={errorStyle}>
          {typeof formError === 'string' ? <p>{formError}</p> : formError.map((err, index) => <p key={index}>{err}</p>)}
        </div>
      )}

      <Input label="Program Name" name="name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required maxLength={100}/>
      <Textarea label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} rows={3}/>

      <Select
        label="Earning Rule Type"
        name="earning_rule_type"
        value={formData.earning_rule_type}
        onChange={handleChange}
        options={earningRuleTypeOptions}
        required
      />

      {formData.earning_rule_type === 'PER_CURRENCY_UNIT_SPENT' && (
        <>
          <Input label="Points Awarded (per unit of base currency spent)" name="points_per_currency_unit_spent_str" type="text" value={formData.points_per_currency_unit_spent_str} onChange={handleChange} error={fieldErrors.points_per_currency_unit_spent_str} required placeholder="e.g., 1 or 0.5"/>
          <Select label="Base Currency for Points Calculation" name="base_currency_code_for_points" value={formData.base_currency_code_for_points} onChange={handleChange} options={currenciesList} error={fieldErrors.base_currency_code_for_points} required/>
        </>
      )}

      {formData.earning_rule_type === 'PER_TRANSACTION' && (
        <Input label="Fixed Points per Transaction" name="fixed_points_per_transaction_str" type="number" value={formData.fixed_points_per_transaction_str} onChange={handleChange} error={fieldErrors.fixed_points_per_transaction_str} required placeholder="e.g., 100"/>
      )}

      {formData.earning_rule_type === 'PER_ITEM_QUANTITY' && (
        <>
          <Input label="Points per Item/Unit" name="points_per_item_str" type="number" value={formData.points_per_item_str} onChange={handleChange} error={fieldErrors.points_per_item_str} required placeholder="e.g., 10"/>
          <Input label="Description of Item/Unit (e.g., 'passenger', 'parcel')" name="item_unit_description" type="text" value={formData.item_unit_description} onChange={handleChange} error={fieldErrors.item_unit_description} required placeholder="e.g., passenger"/>
        </>
      )}

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
