'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Textarea,
  Button,
} from '@samatransport/ui';

export interface LoyaltyTierFormData {
  id?: string; // BIGINT, string in JS
  loyalty_program_id: string; // BIGINT, string in JS. Added by parent page.
  name: string;
  points_threshold: number; // Numeric
  description?: string;
  tier_order: number; // Numeric
}

// Form state will handle numbers as strings
interface FormState {
  id?: string;
  name: string;
  points_threshold_str: string;
  description: string;
  tier_order_str: string;
}

interface LoyaltyTierFormProps {
  initialData?: Partial<Omit<LoyaltyTierFormData, 'loyalty_program_id'>>; // program_id is context
  onSubmit: (data: Omit<LoyaltyTierFormData, 'id' | 'loyalty_program_id'>) => Promise<void>;
  isSaving: boolean;
  formError?: string | string[] | null;
  onCancel: () => void;
  // programId is not directly used by the form fields but good for context if needed
  // programId: string;
}

export const LoyaltyTierForm: React.FC<LoyaltyTierFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    points_threshold_str: initialData?.points_threshold?.toString() || '0',
    description: initialData?.description || '',
    tier_order_str: initialData?.tier_order?.toString() || '0',
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
        points_threshold_str: initialData.points_threshold?.toString() || '0',
        description: initialData.description || '',
        tier_order_str: initialData.tier_order?.toString() || '0',
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.name.trim()) errors.name = 'Tier name is required.';

    if (!formData.points_threshold_str.trim()) {
      errors.points_threshold_str = 'Points threshold is required.';
    } else if (isNaN(parseInt(formData.points_threshold_str, 10)) || parseInt(formData.points_threshold_str, 10) < 0) {
      errors.points_threshold_str = 'Points threshold must be a non-negative integer.';
    }

    if (!formData.tier_order_str.trim()) {
      errors.tier_order_str = 'Tier order is required.';
    } else if (isNaN(parseInt(formData.tier_order_str, 10)) || parseInt(formData.tier_order_str, 10) < 0) {
      errors.tier_order_str = 'Tier order must be a non-negative integer.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: Omit<LoyaltyTierFormData, 'id' | 'loyalty_program_id'> = {
      name: formData.name,
      description: formData.description || undefined,
      points_threshold: parseInt(formData.points_threshold_str, 10),
      tier_order: parseInt(formData.tier_order_str, 10),
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

      <Input label="Tier Name" name="name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required maxLength={100}/>
      <Input label="Points Threshold (Min points to reach this tier)" name="points_threshold_str" type="number" value={formData.points_threshold_str} onChange={handleChange} error={fieldErrors.points_threshold_str} required min="0"/>
      <Input label="Tier Order (e.g., 0 for Bronze, 1 for Silver)" name="tier_order_str" type="number" value={formData.tier_order_str} onChange={handleChange} error={fieldErrors.tier_order_str} required min="0"/>
      <Textarea label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} rows={3}/>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Tier')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default LoyaltyTierForm;
