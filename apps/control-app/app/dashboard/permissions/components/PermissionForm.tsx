'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Textarea,
  Button,
} from '@samatransport/ui';

export interface PermissionFormData {
  id?: string; // Present for editing, BIGINT from DB but string in JS
  action: string;
  description?: string;
}

interface PermissionFormProps {
  initialData?: Partial<PermissionFormData>;
  onSubmit: (data: PermissionFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
}

export const PermissionForm: React.FC<PermissionFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
}) => {
  const [formData, setFormData] = useState<PermissionFormData>({
    action: initialData?.action || '',
    description: initialData?.description || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PermissionFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        action: initialData.action || '',
        description: initialData.description || '',
        id: initialData.id, // Ensure id is carried over if present
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof PermissionFormData]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof PermissionFormData, string>> = {};
    if (!formData.action.trim()) {
      errors.action = 'Permission action is required.';
    } else if (!/^[a-zA-Z0-9_]+:[a-zA-Z0-9_]+$/.test(formData.action.trim())) {
      errors.action = 'Action must follow the format "module:action" or "verb:resource" (e.g., "users:create", "bookings:read_all"). Use lowercase letters, numbers, and underscores only.';
    }
    // Description is optional, no validation needed unless specific rules apply

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Ensure action is lowercase if that's a convention
    const submissionData = {
        ...formData,
        action: formData.action.toLowerCase().trim(),
    };
    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

      <Input
        label="Action (e.g., users:create, bookings:read_all)"
        name="action"
        value={formData.action}
        onChange={handleChange}
        error={fieldErrors.action}
        required
        maxLength={100}
        placeholder="module:action"
        // Consider disabling if initialData.id exists (meaning it's an edit and action might be immutable)
        // disabled={!!initialData?.id} 
        // style={!!initialData?.id ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}
      />
      <Textarea
        label="Description (Optional)"
        name="description"
        value={formData.description || ''}
        onChange={handleChange}
        error={fieldErrors.description}
        rows={3}
      />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (initialData?.id ? 'Saving...' : 'Creating...') : (initialData?.id ? 'Save Changes' : 'Create Permission')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default PermissionForm;
