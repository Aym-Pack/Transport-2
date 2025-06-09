'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  SelectOption,
  Checkbox, // Though not directly used for a field, kept for consistency
  Button,
  Textarea,
} from '@samatransport/ui';
import { DepartureStatusEnum } from './types'; // Assuming types are defined here or imported

export interface DepartureFormData {
  id?: string; // BIGSERIAL, string in JS
  schedule_id: string; // UUID
  departure_date: string; // YYYY-MM-DD
  // planned_departure_time & planned_arrival_time are derived from schedule on create
  actual_departure_time?: string | null; // ISO string or empty for null
  actual_arrival_time?: string | null; // ISO string or empty for null
  assigned_vehicle_id?: string | null; // UUID
  status: DepartureStatusEnum;
  notes?: string;
}

// Form state handles date/time strings
interface FormState {
  id?: string;
  schedule_id: string;
  departure_date: string;
  actual_departure_time_str: string; // For datetime-local input
  actual_arrival_time_str: string;   // For datetime-local input
  assigned_vehicle_id_str: string; // Empty string for "None"
  status: DepartureStatusEnum;
  notes: string;
}

interface DepartureFormProps {
  initialData?: Partial<DepartureFormData>; // API data
  // onSubmit data will be closer to API payload, but form handles string versions
  onSubmit: (data: Omit<DepartureFormData, 'id'>) => Promise<void>;
  isSaving: boolean;
  formError?: string | string[] | null;
  onCancel: () => void;
  schedulesList: SelectOption[]; // { value: schedule_id, label: "Route Name @ Time (ID)" }
  vehiclesList: SelectOption[]; // { value: vehicle_id, label: "Reg Number (Make Model)" }
  isEditMode?: boolean;
}

const statusOptions: SelectOption[] = Object.values(DepartureStatusEnum).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, ' ') }));
const noneOption = { value: '', label: 'None / Not Assigned' };


export const DepartureForm: React.FC<DepartureFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  schedulesList,
  vehiclesList,
  isEditMode = false,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    schedule_id: initialData?.schedule_id || '',
    departure_date: initialData?.departure_date || '',
    actual_departure_time_str: initialData?.actual_departure_time ? new Date(initialData.actual_departure_time).toISOString().slice(0,16) : '',
    actual_arrival_time_str: initialData?.actual_arrival_time ? new Date(initialData.actual_arrival_time).toISOString().slice(0,16) : '',
    assigned_vehicle_id_str: initialData?.assigned_vehicle_id || '',
    status: initialData?.status || DepartureStatusEnum.SCHEDULED,
    notes: initialData?.notes || '',
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
        schedule_id: initialData.schedule_id || '',
        departure_date: initialData.departure_date || '',
        actual_departure_time_str: initialData.actual_departure_time ? new Date(initialData.actual_departure_time).toISOString().slice(0,16) : '',
        actual_arrival_time_str: initialData.actual_arrival_time ? new Date(initialData.actual_arrival_time).toISOString().slice(0,16) : '',
        assigned_vehicle_id_str: initialData.assigned_vehicle_id || '',
        status: initialData.status || DepartureStatusEnum.SCHEDULED,
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!isEditMode) { // schedule_id and departure_date are only set on create
        if (!formData.schedule_id) errors.schedule_id = 'Schedule is required.';
        if (!formData.departure_date) errors.departure_date = 'Departure date is required.';
    }
    if (!formData.status) errors.status = 'Status is required.';

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (formData.departure_date && !dateRegex.test(formData.departure_date)) {
        errors.departure_date = 'Invalid departure date format. Use YYYY-MM-DD.';
    }
    // Datetime-local inputs handle their own format largely

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: Omit<DepartureFormData, 'id'> = {
      // schedule_id and departure_date are part of initialData for edit, or formData for create
      schedule_id: formData.schedule_id,
      departure_date: formData.departure_date,
      actual_departure_time: formData.actual_departure_time_str ? new Date(formData.actual_departure_time_str).toISOString() : null,
      actual_arrival_time: formData.actual_arrival_time_str ? new Date(formData.actual_arrival_time_str).toISOString() : null,
      assigned_vehicle_id: formData.assigned_vehicle_id_str || null,
      status: formData.status,
      notes: formData.notes || undefined,
    };
    // For create, schedule_id and departure_date must be present from the form
    // For edit, these are not part of the editable fields directly in this simplified form,
    // but would be if the form allowed changing them.
    // The backend logic for PUT in crud-departures prevents schedule_id update.
    // departure_date update is allowed but might need careful handling of planned times.

    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && (
        <div style={errorStyle}>
          {typeof formError === 'string' ? <p>{formError}</p> :
           (Array.isArray(formError) ? formError.map((err, index) => <p key={index}>{typeof err === 'object' ? `${err.field}: ${err.message}` : err}</p>) : <p>An unknown error occurred</p>)}
        </div>
      )}

      <Select label="Schedule" name="schedule_id" value={formData.schedule_id} onChange={handleChange} options={schedulesList} error={fieldErrors.schedule_id} required disabled={isEditMode} />
      <Input label="Departure Date" name="departure_date" type="date" value={formData.departure_date} onChange={handleChange} error={fieldErrors.departure_date} required disabled={isEditMode} />

      <Select label="Assigned Vehicle (Optional)" name="assigned_vehicle_id_str" value={formData.assigned_vehicle_id_str} onChange={handleChange} options={[noneOption, ...vehiclesList]} error={fieldErrors.assigned_vehicle_id_str} />
      <Select label="Status" name="status" value={formData.status} onChange={handleChange} options={statusOptions} error={fieldErrors.status} required/>

      <Input label="Actual Departure Time (Optional)" name="actual_departure_time_str" type="datetime-local" value={formData.actual_departure_time_str} onChange={handleChange} error={fieldErrors.actual_departure_time_str} />
      <Input label="Actual Arrival Time (Optional)" name="actual_arrival_time_str" type="datetime-local" value={formData.actual_arrival_time_str} onChange={handleChange} error={fieldErrors.actual_arrival_time_str} />

      <Textarea label="Notes (Optional)" name="notes" value={formData.notes} onChange={handleChange} error={fieldErrors.notes} rows={3}/>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Departure')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

// Define ENUM for status to be used in form and pages
export const DepartureStatusEnum = {
  SCHEDULED: 'SCHEDULED',
  BOARDING: 'BOARDING',
  DEPARTED: 'DEPARTED',
  ARRIVED: 'ARRIVED',
  CANCELLED: 'CANCELLED',
  DELAYED: 'DELAYED',
  POSTPONED: 'POSTPONED',
} as const;

export type DepartureStatusEnum = typeof DepartureStatusEnum[keyof typeof DepartureStatusEnum];

export default DepartureForm;
