'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  SelectOption,
  Checkbox,
  Button,
  Textarea, // Not explicitly in spec, but good for notes if any; removing for now.
} from '@samatransport/ui';

export type StaffRoleType = 'DRIVER' | 'HOSTESS' | 'MECHANIC' | 'OTHER_CREW';

export interface StaffFormData {
  id?: string; // UUID, string in JS
  user_profile_id?: string | null; // UUID, optional
  first_name: string;
  last_name: string;
  staff_type: StaffRoleType;
  employee_id_number?: string | null;
  contact_phone?: string | null;
  license_number?: string | null; // For drivers
  license_expiry_date?: string | null; // YYYY-MM-DD
  is_active: boolean;
}

// Form state handles dates as strings
interface FormState {
  id?: string;
  user_profile_id_str: string; // Empty string for "None"
  first_name: string;
  last_name: string;
  staff_type: StaffRoleType;
  employee_id_number: string;
  contact_phone: string;
  license_number: string;
  license_expiry_date_str: string;
  is_active: boolean;
}

interface StaffFormProps {
  initialData?: Partial<StaffFormData>;
  onSubmit: (data: StaffFormData) => Promise<void>;
  isSaving: boolean;
  formError?: string | string[] | null;
  onCancel: () => void;
  usersList: SelectOption[]; // { value: user_profile_id, label: "Email (Name)" }
}

const staffTypeOptions: SelectOption[] = [
  { value: 'DRIVER', label: 'Driver' },
  { value: 'HOSTESS', label: 'Hostess' },
  { value: 'MECHANIC', label: 'Mechanic' },
  { value: 'OTHER_CREW', label: 'Other Crew' },
];

const noneOption = { value: '', label: 'None / Not a system user' };

export const StaffForm: React.FC<StaffFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  usersList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    user_profile_id_str: initialData?.user_profile_id || '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    staff_type: initialData?.staff_type || 'DRIVER',
    employee_id_number: initialData?.employee_id_number || '',
    contact_phone: initialData?.contact_phone || '',
    license_number: initialData?.license_number || '',
    license_expiry_date_str: initialData?.license_expiry_date || '',
    is_active: initialData?.is_active === undefined ? true : initialData.is_active,
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
        user_profile_id_str: initialData.user_profile_id || '',
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        staff_type: initialData.staff_type || 'DRIVER',
        employee_id_number: initialData.employee_id_number || '',
        contact_phone: initialData.contact_phone || '',
        license_number: initialData.license_number || '',
        license_expiry_date_str: initialData.license_expiry_date || '',
        is_active: initialData.is_active === undefined ? true : initialData.is_active,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.first_name.trim()) errors.first_name = 'First name is required.';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required.';
    if (!formData.staff_type) errors.staff_type = 'Staff type is required.';

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (formData.license_expiry_date_str && !dateRegex.test(formData.license_expiry_date_str)) {
        errors.license_expiry_date_str = 'Invalid license expiry date format. Use YYYY-MM-DD.';
    }
    // Add more specific validations as needed (e.g., phone format, employee ID format/uniqueness if client-side check is desired)

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const submissionData: StaffFormData = {
      id: formData.id,
      user_profile_id: formData.user_profile_id_str || null,
      first_name: formData.first_name,
      last_name: formData.last_name,
      staff_type: formData.staff_type,
      employee_id_number: formData.employee_id_number || null,
      contact_phone: formData.contact_phone || null,
      license_number: formData.license_number || null,
      license_expiry_date: formData.license_expiry_date_str || null,
      is_active: formData.is_active,
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

      <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} error={fieldErrors.first_name} required maxLength={100}/>
      <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} error={fieldErrors.last_name} required maxLength={100}/>
      <Select label="Staff Type" name="staff_type" value={formData.staff_type} onChange={handleChange} options={staffTypeOptions} error={fieldErrors.staff_type} required/>

      <Select label="Link to System User (Optional)" name="user_profile_id_str" value={formData.user_profile_id_str} onChange={handleChange} options={[noneOption, ...usersList]} error={fieldErrors.user_profile_id_str} />
      <Input label="Employee ID Number (Optional)" name="employee_id_number" value={formData.employee_id_number} onChange={handleChange} error={fieldErrors.employee_id_number} maxLength={50}/>
      <Input label="Contact Phone (Optional)" name="contact_phone" value={formData.contact_phone} onChange={handleChange} error={fieldErrors.contact_phone} maxLength={30}/>

      {formData.staff_type === 'DRIVER' && (
        <>
          <Input label="License Number (for Driver)" name="license_number" value={formData.license_number} onChange={handleChange} error={fieldErrors.license_number} maxLength={50}/>
          <Input label="License Expiry Date (for Driver, YYYY-MM-DD)" name="license_expiry_date_str" type="date" value={formData.license_expiry_date_str} onChange={handleChange} error={fieldErrors.license_expiry_date_str} />
        </>
      )}

      <Checkbox label="Is Active" name="is_active" checked={formData.is_active} onChange={handleChange} />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Staff Member')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default StaffForm;
