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

export interface PassengerTariffFormData {
  id?: string; // BIGINT from DB, string in JS
  name: string;
  route_id?: string | null; // UUID, string in JS
  vehicle_type_id?: string | null; // UUID, string in JS
  passenger_category: string;
  price: number; // Will be string in form state
  currency_code: string; // TEXT
  valid_from?: string | null; // DATE, YYYY-MM-DD
  valid_until?: string | null; // DATE, YYYY-MM-DD
  days_of_week?: number[]; // JSONB array of numbers [1-7]
  is_active: boolean;
  notes?: string;
}

// Form state will handle numbers and dates as strings, and days_of_week as a Set
interface FormState {
  id?: string;
  name: string;
  route_id_str: string; // Empty string for "None"
  vehicle_type_id_str: string; // Empty string for "None"
  passenger_category: string;
  price_str: string;
  currency_code: string;
  valid_from_str: string;
  valid_until_str: string;
  selected_days_of_week: Set<string>; // Set of strings "1", "2", etc.
  is_active: boolean;
  notes: string;
}

interface PassengerTariffFormProps {
  initialData?: Partial<PassengerTariffFormData>;
  onSubmit: (data: PassengerTariffFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
  routesList: SelectOption[];
  vehicleTypesList: SelectOption[];
  currenciesList: SelectOption[];
}

const dayOptions = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

export const PassengerTariffForm: React.FC<PassengerTariffFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  routesList,
  vehicleTypesList,
  currenciesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    route_id_str: initialData?.route_id || '',
    vehicle_type_id_str: initialData?.vehicle_type_id || '',
    passenger_category: initialData?.passenger_category || 'ADULT',
    price_str: initialData?.price?.toString() || '',
    currency_code: initialData?.currency_code || '',
    valid_from_str: initialData?.valid_from || '',
    valid_until_str: initialData?.valid_until || '',
    selected_days_of_week: new Set(initialData?.days_of_week?.map(String) || []),
    is_active: initialData?.is_active === undefined ? true : initialData.is_active,
    notes: initialData?.notes || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || undefined,
        name: initialData.name || '',
        route_id_str: initialData.route_id || '',
        vehicle_type_id_str: initialData.vehicle_type_id || '',
        passenger_category: initialData.passenger_category || 'ADULT',
        price_str: initialData.price?.toString() || '',
        currency_code: initialData.currency_code || '',
        valid_from_str: initialData.valid_from || '',
        valid_until_str: initialData.valid_until || '',
        selected_days_of_week: new Set(initialData.days_of_week?.map(String) || []),
        is_active: initialData.is_active === undefined ? true : initialData.is_active,
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox' && name !== 'is_active') { // Handling days_of_week checkboxes
      const { checked, value: dayValue } = e.target as HTMLInputElement;
      setFormData(prev => {
        const newDays = new Set(prev.selected_days_of_week);
        if (checked) newDays.add(dayValue);
        else newDays.delete(dayValue);
        return { ...prev, selected_days_of_week: newDays };
      });
    } else if (type === 'checkbox' && name === 'is_active') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, is_active: checked }));
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
    if (!formData.name.trim()) errors.name = 'Tariff name is required.';
    if (!formData.passenger_category.trim()) errors.passenger_category = 'Passenger category is required.';
    if (!formData.price_str.trim()) {
        errors.price_str = 'Price is required.';
    } else if (isNaN(parseFloat(formData.price_str)) || parseFloat(formData.price_str) < 0) {
        errors.price_str = 'Price must be a non-negative number.';
    }
    if (!formData.currency_code) errors.currency_code = 'Currency is required.';

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (formData.valid_from_str && !dateRegex.test(formData.valid_from_str)) {
        errors.valid_from_str = 'Invalid "Valid From" date format. Use YYYY-MM-DD.';
    }
    if (formData.valid_until_str && !dateRegex.test(formData.valid_until_str)) {
        errors.valid_until_str = 'Invalid "Valid Until" date format. Use YYYY-MM-DD.';
    }
    if (formData.valid_from_str && formData.valid_until_str && dateRegex.test(formData.valid_from_str) && dateRegex.test(formData.valid_until_str)) {
        if (new Date(formData.valid_from_str) > new Date(formData.valid_until_str)) {
            errors.valid_until_str = '"Valid Until" date must be after or same as "Valid From" date.';
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

    const submissionData: PassengerTariffFormData = {
      id: formData.id,
      name: formData.name,
      route_id: formData.route_id_str || null, // Convert empty string to null
      vehicle_type_id: formData.vehicle_type_id_str || null, // Convert empty string to null
      passenger_category: formData.passenger_category,
      price: parseFloat(formData.price_str),
      currency_code: formData.currency_code,
      valid_from: formData.valid_from_str || null,
      valid_until: formData.valid_until_str || null,
      days_of_week: Array.from(formData.selected_days_of_week).map(Number).sort((a,b) => a-b),
      is_active: formData.is_active,
      notes: formData.notes || undefined, // Send undefined if empty for cleaner DB entry (or null if preferred)
    };

    await onSubmit(submissionData);
  };

  const noneOption = { value: '', label: 'None / General' };


  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input label="Tariff Name" name="name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required maxLength={100}/>
      <Input label="Passenger Category (e.g., ADULT, CHILD)" name="passenger_category" value={formData.passenger_category} onChange={handleChange} error={fieldErrors.passenger_category} required maxLength={50}/>
      <Input label="Price" name="price_str" type="text" value={formData.price_str} onChange={handleChange} error={fieldErrors.price_str} required placeholder="e.g., 150.00"/>
      <Select label="Currency" name="currency_code" value={formData.currency_code} onChange={handleChange} options={currenciesList} error={fieldErrors.currency_code} required/>

      <Select label="Route (Optional)" name="route_id_str" value={formData.route_id_str} onChange={handleChange} options={[noneOption, ...routesList]} error={fieldErrors.route_id_str} />
      <Select label="Vehicle Type (Optional)" name="vehicle_type_id_str" value={formData.vehicle_type_id_str} onChange={handleChange} options={[noneOption, ...vehicleTypesList]} error={fieldErrors.vehicle_type_id_str} />

      <Input label="Valid From (YYYY-MM-DD, Optional)" name="valid_from_str" type="date" value={formData.valid_from_str} onChange={handleChange} error={fieldErrors.valid_from_str} />
      <Input label="Valid Until (YYYY-MM-DD, Optional)" name="valid_until_str" type="date" value={formData.valid_until_str} onChange={handleChange} error={fieldErrors.valid_until_str} />

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Days of Week (Optional):</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {dayOptions.map(day => (
            <Checkbox
              key={day.value}
              name="days_of_week" // Group name
              value={day.value} // Specific value for this checkbox
              label={day.label}
              checked={formData.selected_days_of_week.has(day.value)}
              onChange={handleChange}
            />
          ))}
        </div>
      </div>

      <Checkbox label="Is Active" name="is_active" checked={formData.is_active} onChange={handleChange} />
      <Textarea label="Notes (Optional)" name="notes" value={formData.notes} onChange={handleChange} error={fieldErrors.notes} rows={3}/>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Tariff')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default PassengerTariffForm;
