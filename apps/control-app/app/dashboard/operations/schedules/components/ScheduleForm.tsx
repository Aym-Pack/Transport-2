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

export interface ScheduleFormData {
  id?: string; // UUID, string in JS
  route_id: string; // UUID
  departure_time: string; // HH:MM
  arrival_time: string; // HH:MM
  days_of_operation: number[]; // Array of numbers [1-7]
  default_vehicle_type_id: string; // UUID
  vehicle_id?: string | null; // UUID, optional
  is_active: boolean;
  notes?: string;
}

// Form state handles days_of_operation as a Set for easier checkbox management
interface FormState {
  id?: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  selected_days_of_week: Set<string>; // Set of strings "1", "2", etc.
  default_vehicle_type_id: string;
  vehicle_id_str: string; // Empty string for "None"
  is_active: boolean;
  notes: string;
}

interface ScheduleFormProps {
  initialData?: Partial<ScheduleFormData>;
  onSubmit: (data: ScheduleFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | string[] | null;
  onCancel: () => void;
  routesList: SelectOption[];
  vehicleTypesList: SelectOption[];
  vehiclesList: SelectOption[]; // For assigned vehicle (optional)
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

const noneOption = { value: '', label: 'None / Not Assigned' };

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  routesList,
  vehicleTypesList,
  vehiclesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    route_id: initialData?.route_id || '',
    departure_time: initialData?.departure_time || '',
    arrival_time: initialData?.arrival_time || '',
    selected_days_of_week: new Set(initialData?.days_of_operation?.map(String) || []),
    default_vehicle_type_id: initialData?.default_vehicle_type_id || '',
    vehicle_id_str: initialData?.vehicle_id || '',
    is_active: initialData?.is_active === undefined ? true : initialData.is_active,
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
        route_id: initialData.route_id || '',
        departure_time: initialData.departure_time || '',
        arrival_time: initialData.arrival_time || '',
        selected_days_of_week: new Set(initialData.days_of_operation?.map(String) || []),
        default_vehicle_type_id: initialData.default_vehicle_type_id || '',
        vehicle_id_str: initialData.vehicle_id || '',
        is_active: initialData.is_active === undefined ? true : initialData.is_active,
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox' && name === 'days_of_week_option') {
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
    if (!formData.route_id) errors.route_id = 'Route is required.';
    if (!formData.departure_time) errors.departure_time = 'Departure time is required.';
    if (!formData.arrival_time) errors.arrival_time = 'Arrival time is required.';
    if (formData.selected_days_of_week.size === 0) errors.selected_days_of_week = 'At least one day of operation must be selected.';
    if (!formData.default_vehicle_type_id) errors.default_vehicle_type_id = 'Default vehicle type is required.';

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (formData.departure_time && !timeRegex.test(formData.departure_time)) {
        errors.departure_time = 'Invalid departure time format (HH:MM).';
    }
    if (formData.arrival_time && !timeRegex.test(formData.arrival_time)) {
        errors.arrival_time = 'Invalid arrival time format (HH:MM).';
    }
    // Consider validating arrival_time > departure_time if on same day or for simple overnight logic.

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: ScheduleFormData = {
      id: formData.id,
      route_id: formData.route_id,
      departure_time: formData.departure_time,
      arrival_time: formData.arrival_time,
      days_of_operation: Array.from(formData.selected_days_of_week).map(Number).sort((a,b) => a-b),
      default_vehicle_type_id: formData.default_vehicle_type_id,
      vehicle_id: formData.vehicle_id_str || null, // Convert empty string to null
      is_active: formData.is_active,
      notes: formData.notes || undefined,
    };
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

      <Select label="Route" name="route_id" value={formData.route_id} onChange={handleChange} options={routesList} error={fieldErrors.route_id} required/>
      <Input label="Departure Time (HH:MM)" name="departure_time" type="time" value={formData.departure_time} onChange={handleChange} error={fieldErrors.departure_time} required/>
      <Input label="Arrival Time (HH:MM)" name="arrival_time" type="time" value={formData.arrival_time} onChange={handleChange} error={fieldErrors.arrival_time} required/>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Days of Operation*:</label>
        {fieldErrors.selected_days_of_week && <p style={{color: 'red', fontSize: '0.875rem'}}>{fieldErrors.selected_days_of_week}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {dayOptions.map(day => (
            <Checkbox
              key={day.value}
              name="days_of_week_option" // Special name for handling in handleChange
              value={day.value}
              label={day.label}
              checked={formData.selected_days_of_week.has(day.value)}
              onChange={handleChange}
            />
          ))}
        </div>
      </div>

      <Select label="Default Vehicle Type" name="default_vehicle_type_id" value={formData.default_vehicle_type_id} onChange={handleChange} options={vehicleTypesList} error={fieldErrors.default_vehicle_type_id} required/>
      <Select label="Assigned Vehicle (Optional)" name="vehicle_id_str" value={formData.vehicle_id_str} onChange={handleChange} options={[noneOption, ...vehiclesList]} error={fieldErrors.vehicle_id_str} />

      <Checkbox label="Is Active" name="is_active" checked={formData.is_active} onChange={handleChange} />
      <Textarea label="Notes (Optional)" name="notes" value={formData.notes} onChange={handleChange} error={fieldErrors.notes} rows={3}/>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Schedule')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default ScheduleForm;
