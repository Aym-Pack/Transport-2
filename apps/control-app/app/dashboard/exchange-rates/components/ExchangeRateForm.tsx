'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  SelectOption,
  Button,
} from '@samatransport/ui';

export interface ExchangeRateFormData {
  id?: string; // Present for editing
  source_currency_code: string;
  target_currency_code: string;
  rate: number; // Store as number, but handle as string in form
  source_of_rate?: string;
}

// Form state will handle rate as a string for easier input management
interface FormState extends Omit<ExchangeRateFormData, 'rate'> {
  rate_str: string;
}


interface ExchangeRateFormProps {
  initialData?: Partial<ExchangeRateFormData>;
  onSubmit: (data: ExchangeRateFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
  currenciesList: SelectOption[];
}

export const ExchangeRateForm: React.FC<ExchangeRateFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  currenciesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    source_currency_code: initialData?.source_currency_code || '',
    target_currency_code: initialData?.target_currency_code || '',
    rate_str: initialData?.rate?.toString() || '',
    source_of_rate: initialData?.source_of_rate || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        source_currency_code: initialData.source_currency_code || '',
        target_currency_code: initialData.target_currency_code || '',
        rate_str: initialData.rate?.toString() || '',
        source_of_rate: initialData.source_of_rate || '',
        id: initialData.id,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.source_currency_code) errors.source_currency_code = 'Source currency is required.';
    if (!formData.target_currency_code) errors.target_currency_code = 'Target currency is required.';
    if (formData.source_currency_code && formData.target_currency_code && formData.source_currency_code === formData.target_currency_code) {
      errors.target_currency_code = 'Target currency must be different from source currency.';
    }
    if (!formData.rate_str.trim()) {
        errors.rate_str = 'Rate is required.';
    } else if (isNaN(parseFloat(formData.rate_str)) || parseFloat(formData.rate_str) <= 0) {
        errors.rate_str = 'Rate must be a positive number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: ExchangeRateFormData = {
      ...formData,
      rate: parseFloat(formData.rate_str),
      id: initialData?.id,
    };
    // @ts-ignore
    delete submissionData.rate_str;

    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Select
        label="Source Currency"
        name="source_currency_code"
        value={formData.source_currency_code}
        onChange={handleChange}
        options={currenciesList}
        error={fieldErrors.source_currency_code}
        required
      />
      <Select
        label="Target Currency"
        name="target_currency_code"
        value={formData.target_currency_code}
        onChange={handleChange}
        options={currenciesList}
        error={fieldErrors.target_currency_code}
        required
      />
      <Input
        label="Rate (e.g., 1.123456)"
        name="rate_str"
        type="text" // Using text to allow for more flexible decimal input
        value={formData.rate_str}
        onChange={handleChange}
        error={fieldErrors.rate_str}
        required
        placeholder="Enter numeric rate"
      />
      <Input
        label="Source of Rate (Optional)"
        name="source_of_rate"
        value={formData.source_of_rate || ''}
        onChange={handleChange}
        error={fieldErrors.source_of_rate}
        maxLength={100}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (initialData?.id ? 'Saving...' : 'Creating...') : (initialData?.id ? 'Save Changes' : 'Create Exchange Rate')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default ExchangeRateForm;
