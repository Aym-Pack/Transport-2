'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  SelectOption,
  Checkbox,
  Button,
  Textarea, // Added Textarea for address
} from '@samatransport/ui';

export interface AgencyFormData {
  id?: string; // Present for editing, absent for creation
  name: string;
  address?: string;
  city?: string;
  country_code?: string;
  phone_number?: string;
  email?: string;
  operational_currency_code: string;
  is_active: boolean;
}

interface AgencyFormProps {
  initialData?: Partial<AgencyFormData>;
  onSubmit: (data: AgencyFormData) => Promise<void>;
  isSaving: boolean;
  currencies: SelectOption[]; // For currency dropdown
  formError?: string | null;
  onCancel: () => void;
}

export const AgencyForm: React.FC<AgencyFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  currencies,
  formError,
  onCancel,
}) => {
  const [formData, setFormData] = useState<AgencyFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    country_code: initialData?.country_code || '',
    phone_number: initialData?.phone_number || '',
    email: initialData?.email || '',
    operational_currency_code: initialData?.operational_currency_code || '',
    is_active: initialData?.is_active === undefined ? true : initialData.is_active,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AgencyFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        country_code: initialData.country_code || '',
        phone_number: initialData.phone_number || '',
        email: initialData.email || '',
        operational_currency_code: initialData.operational_currency_code || '',
        is_active: initialData.is_active === undefined ? true : initialData.is_active,
        id: initialData.id,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    // Clear field error on change
    if (fieldErrors[name as keyof AgencyFormData]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AgencyFormData, string>> = {};
    if (!formData.name.trim()) errors.name = 'Agency name is required.';
    if (!formData.operational_currency_code) errors.operational_currency_code = 'Operational currency is required.';
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format.';
    // Add other validations as needed (e.g., phone_number format, country_code length)

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    await onSubmit(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input
        label="Agency Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={fieldErrors.name}
        required
        maxLength={100}
      />
      <Textarea
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        error={fieldErrors.address}
        rows={3}
        maxLength={255}
      />
      <Input
        label="City"
        name="city"
        value={formData.city}
        onChange={handleChange}
        error={fieldErrors.city}
        maxLength={50}
      />
      <Input
        label="Country Code (e.g., US, CA)"
        name="country_code"
        value={formData.country_code}
        onChange={handleChange}
        error={fieldErrors.country_code}
        maxLength={3} // Assuming 2 or 3 letter codes
      />
      <Input
        label="Phone Number"
        name="phone_number"
        value={formData.phone_number}
        onChange={handleChange}
        error={fieldErrors.phone_number}
        maxLength={20}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={fieldErrors.email}
        maxLength={100}
      />
      <Select
        label="Operational Currency"
        name="operational_currency_code"
        value={formData.operational_currency_code}
        onChange={handleChange}
        options={currencies}
        error={fieldErrors.operational_currency_code}
        required
      />
      <Checkbox
        label="Is Active"
        name="is_active"
        checked={formData.is_active}
        onChange={handleChange}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (initialData?.id ? 'Saving...' : 'Creating...') : (initialData?.id ? 'Save Changes' : 'Create Agency')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default AgencyForm;
