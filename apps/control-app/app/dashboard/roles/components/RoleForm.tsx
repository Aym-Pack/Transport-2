'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Textarea,
  Button,
} from '@samatransport/ui';

export interface RoleFormData {
  id?: string; // Present for editing, BIGINT from DB but string in JS
  name: string;
  description?: string;
}

interface RoleFormProps {
  initialData?: Partial<RoleFormData>;
  onSubmit: (data: Pick<RoleFormData, 'name' | 'description'>) => Promise<void>; // Only name/desc for this form
  isSaving: boolean;
  formError?: string | null;
  onCancel: () => void;
}

export const RoleForm: React.FC<RoleFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Pick<RoleFormData, 'name' | 'description'>>({
    name: initialData?.name || '',
    description: initialData?.description || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RoleFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof RoleFormData]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof RoleFormData, string>> = {};
    if (!formData.name.trim()) {
      errors.name = 'Role name is required.';
    }
    // Description is optional

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
        label="Role Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={fieldErrors.name}
        required
        maxLength={100}
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
          {isSaving ? 'Saving...' : 'Save Role Details'}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default RoleForm;
