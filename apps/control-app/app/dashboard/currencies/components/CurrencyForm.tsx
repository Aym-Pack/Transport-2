'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
} from '@samatransport/ui';

export interface CurrencyFormData {
  code: string; // Primary key, not editable after creation
  name: string;
  symbol?: string;
}

interface CurrencyFormProps {
  initialData?: Partial<CurrencyFormData>;
  onSubmit: (data: CurrencyFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
  isEditMode: boolean; // To disable 'code' field during edit
}

export const CurrencyForm: React.FC<CurrencyFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  isEditMode,
}) => {
  const [formData, setFormData] = useState<CurrencyFormData>({
    code: initialData?.code || '',
    name: initialData?.name || '',
    symbol: initialData?.symbol || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CurrencyFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        symbol: initialData.symbol || '',
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof CurrencyFormData]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CurrencyFormData, string>> = {};
    if (!formData.code.trim()) {
      errors.code = 'Currency code is required.';
    } else if (formData.code.length < 3 || formData.code.length > 5) {
      errors.code = 'Code must be between 3 and 5 characters.';
    } else if (!/^[A-Z0-9]+$/.test(formData.code.toUpperCase())) {
      errors.code = 'Code must be alphanumeric (A-Z, 0-9).';
    }


    if (!formData.name.trim()) errors.name = 'Currency name is required.';
    if (formData.symbol && formData.symbol.length > 5) {
        errors.symbol = 'Symbol should not exceed 5 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Uppercase the code before submitting
    const submissionData = {
        ...formData,
        code: formData.code.toUpperCase(),
    };
    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input
        label="Currency Code (e.g., USD, EUR, XOF)"
        name="code"
        value={formData.code}
        onChange={handleChange}
        error={fieldErrors.code}
        required
        maxLength={5}
        disabled={isEditMode} // Disable code field in edit mode
        style={isEditMode ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}
        autoCapitalize="characters"
      />
      <Input
        label="Currency Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={fieldErrors.name}
        required
        maxLength={100}
      />
      <Input
        label="Symbol (Optional, e.g., $, €)"
        name="symbol"
        value={formData.symbol || ''}
        onChange={handleChange}
        error={fieldErrors.symbol}
        maxLength={5}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Currency')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default CurrencyForm;
