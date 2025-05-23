'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  SelectOption,
  Button,
} from '@samatransport/ui';

export interface VehicleFormData {
  id?: string;
  registration_number: string;
  make?: string;
  model?: string;
  year_of_manufacture?: number | null;
  vehicle_type_id: string;
  assigned_agency_id?: string | null;
  status?: string; // e.g., 'Active', 'Under Maintenance', 'Out of Service'
  last_maintenance_date?: string | null; // YYYY-MM-DD
  next_maintenance_due_date?: string | null; // YYYY-MM-DD
}

// Form state will handle numbers and dates as strings for easier input management
interface FormState extends Omit<VehicleFormData, 'year_of_manufacture' | 'last_maintenance_date' | 'next_maintenance_due_date' | 'assigned_agency_id'> {
  year_of_manufacture_str: string;
  last_maintenance_date_str: string;
  next_maintenance_due_date_str: string;
  assigned_agency_id_str: string; // Select component uses string values
}


interface VehicleFormProps {
  initialData?: Partial<VehicleFormData>;
  onSubmit: (data: VehicleFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
  agenciesList: SelectOption[];
  vehicleTypesList: SelectOption[];
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  agenciesList,
  vehicleTypesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    registration_number: initialData?.registration_number || '',
    make: initialData?.make || '',
    model: initialData?.model || '',
    year_of_manufacture_str: initialData?.year_of_manufacture?.toString() || '',
    vehicle_type_id: initialData?.vehicle_type_id || '',
    assigned_agency_id_str: initialData?.assigned_agency_id || '',
    status: initialData?.status || 'Active',
    last_maintenance_date_str: initialData?.last_maintenance_date || '',
    next_maintenance_due_date_str: initialData?.next_maintenance_due_date || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        registration_number: initialData.registration_number || '',
        make: initialData.make || '',
        model: initialData.model || '',
        year_of_manufacture_str: initialData.year_of_manufacture?.toString() || '',
        vehicle_type_id: initialData.vehicle_type_id || '',
        assigned_agency_id_str: initialData.assigned_agency_id || '',
        status: initialData.status || 'Active',
        last_maintenance_date_str: initialData.last_maintenance_date || '',
        next_maintenance_due_date_str: initialData.next_maintenance_due_date || '',
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
    if (!formData.registration_number.trim()) errors.registration_number = 'Registration number is required.';
    if (!formData.vehicle_type_id) errors.vehicle_type_id = 'Vehicle type is required.';
    
    if (formData.year_of_manufacture_str) {
        const year = parseInt(formData.year_of_manufacture_str, 10);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
            errors.year_of_manufacture_str = `Invalid year. Must be between 1900 and ${new Date().getFullYear() + 1}.`;
        }
    }
    // Basic date validation (YYYY-MM-DD format) - can be improved with regex or date-fns
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (formData.last_maintenance_date_str && !dateRegex.test(formData.last_maintenance_date_str)) {
        errors.last_maintenance_date_str = 'Invalid date format. Use YYYY-MM-DD.';
    }
    if (formData.next_maintenance_due_date_str && !dateRegex.test(formData.next_maintenance_due_date_str)) {
        errors.next_maintenance_due_date_str = 'Invalid date format. Use YYYY-MM-DD.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    const submissionData: VehicleFormData = {
      ...formData,
      year_of_manufacture: formData.year_of_manufacture_str ? parseInt(formData.year_of_manufacture_str, 10) : null,
      assigned_agency_id: formData.assigned_agency_id_str || null, // Ensure null if empty string
      last_maintenance_date: formData.last_maintenance_date_str || null,
      next_maintenance_due_date: formData.next_maintenance_due_date_str || null,
      id: initialData?.id,
    };
    // @ts-ignore
    delete submissionData.year_of_manufacture_str;
    // @ts-ignore
    delete submissionData.last_maintenance_date_str;
    // @ts-ignore
    delete submissionData.next_maintenance_due_date_str;
    // @ts-ignore
    delete submissionData.assigned_agency_id_str;


    await onSubmit(submissionData);
  };

  const statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Under Maintenance', label: 'Under Maintenance' },
    { value: 'Out of Service', label: 'Out of Service' },
  ];

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input
        label="Registration Number"
        name="registration_number"
        value={formData.registration_number}
        onChange={handleChange}
        error={fieldErrors.registration_number}
        required
        maxLength={50}
      />
      <Select
        label="Vehicle Type"
        name="vehicle_type_id"
        value={formData.vehicle_type_id}
        onChange={handleChange}
        options={vehicleTypesList}
        error={fieldErrors.vehicle_type_id}
        required
      />
       <Select
        label="Assigned Agency (Optional)"
        name="assigned_agency_id_str" // Use string version for form state
        value={formData.assigned_agency_id_str}
        onChange={handleChange}
        options={[{ value: '', label: 'None' }, ...agenciesList]} // Add a "None" option
        error={fieldErrors.assigned_agency_id_str}
      />
      <Input
        label="Make"
        name="make"
        value={formData.make}
        onChange={handleChange}
        error={fieldErrors.make}
        maxLength={50}
      />
      <Input
        label="Model"
        name="model"
        value={formData.model}
        onChange={handleChange}
        error={fieldErrors.model}
        maxLength={50}
      />
      <Input
        label="Year of Manufacture"
        name="year_of_manufacture_str"
        type="number" // HTML5 number input
        value={formData.year_of_manufacture_str}
        onChange={handleChange}
        error={fieldErrors.year_of_manufacture_str}
        min="1900"
        max={new Date().getFullYear() + 1}
      />
      <Select
        label="Status"
        name="status"
        value={formData.status}
        onChange={handleChange}
        options={statusOptions}
        error={fieldErrors.status}
      />
      <Input
        label="Last Maintenance Date (YYYY-MM-DD)"
        name="last_maintenance_date_str"
        type="date" // HTML5 date input
        value={formData.last_maintenance_date_str}
        onChange={handleChange}
        error={fieldErrors.last_maintenance_date_str}
      />
      <Input
        label="Next Maintenance Due Date (YYYY-MM-DD)"
        name="next_maintenance_due_date_str"
        type="date" // HTML5 date input
        value={formData.next_maintenance_due_date_str}
        onChange={handleChange}
        error={fieldErrors.next_maintenance_due_date_str}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (initialData?.id ? 'Saving...' : 'Creating...') : (initialData?.id ? 'Save Changes' : 'Create Vehicle')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default VehicleForm;
