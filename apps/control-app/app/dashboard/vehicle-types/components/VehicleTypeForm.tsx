'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Textarea,
  Checkbox,
  Button,
} from '@samatransport/ui';

export interface VehicleTypeFormData {
  id?: string;
  name: string;
  capacity_passengers?: number | null;
  capacity_cargo_kg?: number | null;
  description?: string;
  is_passenger_vehicle: boolean;
  is_cargo_vehicle: boolean;
}

interface FormState extends Omit<VehicleTypeFormData, 'capacity_passengers' | 'capacity_cargo_kg'> {
  capacity_passengers_str: string;
  capacity_cargo_kg_str: string;
}

interface VehicleTypeFormProps {
  initialData?: Partial<VehicleTypeFormData>;
  onSubmit: (data: VehicleTypeFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
}

export const VehicleTypeForm: React.FC<VehicleTypeFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormState>({
    name: initialData?.name || '',
    capacity_passengers_str: initialData?.capacity_passengers?.toString() || '',
    capacity_cargo_kg_str: initialData?.capacity_cargo_kg?.toString() || '',
    description: initialData?.description || '',
    is_passenger_vehicle: initialData?.is_passenger_vehicle === undefined ? true : initialData.is_passenger_vehicle,
    is_cargo_vehicle: initialData?.is_cargo_vehicle === undefined ? false : initialData.is_cargo_vehicle,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        capacity_passengers_str: initialData.capacity_passengers?.toString() || '',
        capacity_cargo_kg_str: initialData.capacity_cargo_kg?.toString() || '',
        description: initialData.description || '',
        is_passenger_vehicle: initialData.is_passenger_vehicle === undefined ? true : initialData.is_passenger_vehicle,
        is_cargo_vehicle: initialData.is_cargo_vehicle === undefined ? false : initialData.is_cargo_vehicle,
        id: initialData.id,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.name.trim()) errors.name = 'Vehicle type name is required.';
    if (formData.capacity_passengers_str && isNaN(Number(formData.capacity_passengers_str))) {
        errors.capacity_passengers_str = 'Passenger capacity must be a number.';
    }
    if (formData.capacity_cargo_kg_str && isNaN(Number(formData.capacity_cargo_kg_str))) {
        errors.capacity_cargo_kg_str = 'Cargo capacity must be a number.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    const submissionData: VehicleTypeFormData = {
      ...formData,
      capacity_passengers: formData.capacity_passengers_str ? parseInt(formData.capacity_passengers_str, 10) : null,
      capacity_cargo_kg: formData.capacity_cargo_kg_str ? parseInt(formData.capacity_cargo_kg_str, 10) : null,
      id: initialData?.id,
    };
    // @ts-ignore
    delete submissionData.capacity_passengers_str;
    // @ts-ignore
    delete submissionData.capacity_cargo_kg_str;

    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input
        label="Vehicle Type Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={fieldErrors.name}
        required
        maxLength={100}
      />
      <Input
        label="Passenger Capacity"
        name="capacity_passengers_str"
        type="number"
        value={formData.capacity_passengers_str}
        onChange={handleChange}
        error={fieldErrors.capacity_passengers_str}
      />
      <Input
        label="Cargo Capacity (kg)"
        name="capacity_cargo_kg_str"
        type="number"
        value={formData.capacity_cargo_kg_str}
        onChange={handleChange}
        error={fieldErrors.capacity_cargo_kg_str}
      />
      <Textarea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        error={fieldErrors.description}
        rows={3}
      />
      <Checkbox
        label="Is Passenger Vehicle"
        name="is_passenger_vehicle"
        checked={formData.is_passenger_vehicle}
        onChange={handleChange}
      />
      <Checkbox
        label="Is Cargo Vehicle"
        name="is_cargo_vehicle"
        checked={formData.is_cargo_vehicle}
        onChange={handleChange}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (initialData?.id ? 'Saving...' : 'Creating...') : (initialData?.id ? 'Save Changes' : 'Create Vehicle Type')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default VehicleTypeForm;
