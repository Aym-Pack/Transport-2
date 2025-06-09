'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Textarea,
  Checkbox,
  Button,
} from '@samatransport/ui';

export interface RouteFormData {
  id?: string;
  name: string;
  start_city: string;
  end_city: string;
  average_duration_minutes?: number | null;
  distance_km?: number | null;
  stops_details?: any; // Parsed JSON object
  is_active: boolean;
}

// This interface is for the form's internal state, handling stops_details as a string.
interface FormState extends Omit<RouteFormData, 'stops_details' | 'average_duration_minutes' | 'distance_km'> {
  stops_details_str: string;
  average_duration_minutes_str: string;
  distance_km_str: string;
}


interface RouteFormProps {
  initialData?: Partial<RouteFormData>;
  onSubmit: (data: RouteFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
}

export const RouteForm: React.FC<RouteFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormState>({
    name: initialData?.name || '',
    start_city: initialData?.start_city || '',
    end_city: initialData?.end_city || '',
    average_duration_minutes_str: initialData?.average_duration_minutes?.toString() || '',
    distance_km_str: initialData?.distance_km?.toString() || '',
    stops_details_str: initialData?.stops_details ? JSON.stringify(initialData.stops_details, null, 2) : '',
    is_active: initialData?.is_active === undefined ? true : initialData.is_active,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        start_city: initialData.start_city || '',
        end_city: initialData.end_city || '',
        average_duration_minutes_str: initialData.average_duration_minutes?.toString() || '',
        distance_km_str: initialData.distance_km?.toString() || '',
        stops_details_str: initialData.stops_details ? JSON.stringify(initialData.stops_details, null, 2) : '',
        is_active: initialData.is_active === undefined ? true : initialData.is_active,
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
    if (!formData.name.trim()) errors.name = 'Route name is required.';
    if (!formData.start_city.trim()) errors.start_city = 'Start city is required.';
    if (!formData.end_city.trim()) errors.end_city = 'End city is required.';

    if (formData.stops_details_str.trim()) {
      try {
        JSON.parse(formData.stops_details_str);
      } catch (e) {
        errors.stops_details_str = 'Stops details must be valid JSON if provided.';
      }
    }
    if (formData.average_duration_minutes_str && isNaN(Number(formData.average_duration_minutes_str))) {
        errors.average_duration_minutes_str = 'Average duration must be a number.';
    }
    if (formData.distance_km_str && isNaN(Number(formData.distance_km_str))) {
        errors.distance_km_str = 'Distance must be a number.';
    }


    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: RouteFormData = {
      ...formData,
      average_duration_minutes: formData.average_duration_minutes_str ? parseInt(formData.average_duration_minutes_str, 10) : null,
      distance_km: formData.distance_km_str ? parseInt(formData.distance_km_str, 10) : null,
      stops_details: formData.stops_details_str.trim() ? JSON.parse(formData.stops_details_str) : null,
      id: initialData?.id, // Ensure id is passed through if editing
    };
    // Remove string versions from submission
    // @ts-ignore
    delete submissionData.stops_details_str;
    // @ts-ignore
    delete submissionData.average_duration_minutes_str;
    // @ts-ignore
    delete submissionData.distance_km_str;

    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input
        label="Route Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={fieldErrors.name}
        required
        maxLength={100}
      />
      <Input
        label="Start City"
        name="start_city"
        value={formData.start_city}
        onChange={handleChange}
        error={fieldErrors.start_city}
        required
        maxLength={50}
      />
      <Input
        label="End City"
        name="end_city"
        value={formData.end_city}
        onChange={handleChange}
        error={fieldErrors.end_city}
        required
        maxLength={50}
      />
      <Input
        label="Average Duration (minutes)"
        name="average_duration_minutes_str"
        type="number"
        value={formData.average_duration_minutes_str}
        onChange={handleChange}
        error={fieldErrors.average_duration_minutes_str}
      />
      <Input
        label="Distance (km)"
        name="distance_km_str"
        type="number"
        value={formData.distance_km_str}
        onChange={handleChange}
        error={fieldErrors.distance_km_str}
      />
      <Textarea
        label="Stops Details (JSON format)"
        name="stops_details_str"
        value={formData.stops_details_str}
        onChange={handleChange}
        error={fieldErrors.stops_details_str}
        rows={5}
        placeholder='e.g., [{"name": "Stop A", "city": "City A"}, {"name": "Stop B", "city": "City B"}]'
      />
      <Checkbox
        label="Is Active"
        name="is_active"
        checked={formData.is_active}
        onChange={handleChange}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (initialData?.id ? 'Saving...' : 'Creating...') : (initialData?.id ? 'Save Changes' : 'Create Route')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default RouteForm;
