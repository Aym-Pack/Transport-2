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

export type LoyaltyRewardType =
  | 'PERCENTAGE_DISCOUNT_ON_BOOKING'
  | 'FIXED_AMOUNT_VOUCHER_ON_BOOKING'
  | 'FREE_TRIP_VOUCHER'
  | 'UPGRADE_TO_VEHICLE_TYPE'
  | 'COMPLIMENTARY_ITEM_OR_SERVICE';

export interface LoyaltyRewardFormData {
  id?: string; // BIGINT, string in JS
  loyalty_tier_id: string; // BIGINT, string in JS. Added by parent page.
  name: string;
  description?: string;
  reward_type: LoyaltyRewardType;
  reward_value_percentage?: number | null;
  reward_value_fixed_amount?: number | null;
  reward_value_currency_code?: string | null;
  free_trip_route_id?: string | null; // UUID
  upgrade_to_vehicle_type_id?: string | null; // UUID
  complimentary_item_description?: string | null;
  points_to_redeem?: number | null;
  is_auto_applied_on_tier_achieve: boolean;
  is_active: boolean;
}

// Form state handles numbers as strings, specific FKs as strings
interface FormState {
  id?: string;
  name: string;
  description: string;
  reward_type: LoyaltyRewardType;
  reward_value_percentage_str: string;
  reward_value_fixed_amount_str: string;
  reward_value_currency_code: string;
  free_trip_route_id_str: string;
  upgrade_to_vehicle_type_id_str: string;
  complimentary_item_description: string;
  points_to_redeem_str: string;
  is_auto_applied_on_tier_achieve: boolean;
  is_active: boolean;
}

interface LoyaltyRewardFormProps {
  initialData?: Partial<LoyaltyRewardFormData>;
  onSubmit: (data: Omit<LoyaltyRewardFormData, 'id' | 'loyalty_tier_id'>) => Promise<void>;
  isSaving: boolean;
  formError?: string | string[] | null;
  onCancel: () => void;
  // tierId: string; // Context, not directly part of form data sent
  currenciesList: SelectOption[];
  routesList: SelectOption[];
  vehicleTypesList: SelectOption[];
}

const rewardTypeOptions: SelectOption[] = [
  { value: 'PERCENTAGE_DISCOUNT_ON_BOOKING', label: 'Percentage Discount on Booking' },
  { value: 'FIXED_AMOUNT_VOUCHER_ON_BOOKING', label: 'Fixed Amount Voucher on Booking' },
  { value: 'FREE_TRIP_VOUCHER', label: 'Free Trip Voucher' },
  { value: 'UPGRADE_TO_VEHICLE_TYPE', label: 'Upgrade to Vehicle Type' },
  { value: 'COMPLIMENTARY_ITEM_OR_SERVICE', label: 'Complimentary Item/Service' },
];

const noneOption = { value: '', label: 'N/A' }; // For optional selects

export const LoyaltyRewardForm: React.FC<LoyaltyRewardFormProps> = ({
  initialData,
  onSubmit,
  isSaving,
  formError,
  onCancel,
  currenciesList,
  routesList,
  vehicleTypesList,
}) => {
  const [formData, setFormData] = useState<FormState>({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    description: initialData?.description || '',
    reward_type: initialData?.reward_type || 'PERCENTAGE_DISCOUNT_ON_BOOKING',
    reward_value_percentage_str: initialData?.reward_value_percentage?.toString() || '',
    reward_value_fixed_amount_str: initialData?.reward_value_fixed_amount?.toString() || '',
    reward_value_currency_code: initialData?.reward_value_currency_code || '',
    free_trip_route_id_str: initialData?.free_trip_route_id || '',
    upgrade_to_vehicle_type_id_str: initialData?.upgrade_to_vehicle_type_id || '',
    complimentary_item_description: initialData?.complimentary_item_description || '',
    points_to_redeem_str: initialData?.points_to_redeem?.toString() || '',
    is_auto_applied_on_tier_achieve: initialData?.is_auto_applied_on_tier_achieve === undefined ? false : initialData.is_auto_applied_on_tier_achieve,
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
        name: initialData.name || '',
        description: initialData.description || '',
        reward_type: initialData.reward_type || 'PERCENTAGE_DISCOUNT_ON_BOOKING',
        reward_value_percentage_str: initialData.reward_value_percentage?.toString() || '',
        reward_value_fixed_amount_str: initialData.reward_value_fixed_amount?.toString() || '',
        reward_value_currency_code: initialData.reward_value_currency_code || '',
        free_trip_route_id_str: initialData.free_trip_route_id || '',
        upgrade_to_vehicle_type_id_str: initialData.upgrade_to_vehicle_type_id || '',
        complimentary_item_description: initialData.complimentary_item_description || '',
        points_to_redeem_str: initialData.points_to_redeem?.toString() || '',
        is_auto_applied_on_tier_achieve: initialData.is_auto_applied_on_tier_achieve === undefined ? false : initialData.is_auto_applied_on_tier_achieve,
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
    if (!formData.name.trim()) errors.name = 'Reward name is required.';

    switch (formData.reward_type) {
      case 'PERCENTAGE_DISCOUNT_ON_BOOKING':
        if (!formData.reward_value_percentage_str.trim()) errors.reward_value_percentage_str = 'Percentage value is required.';
        else {
            const perc = parseFloat(formData.reward_value_percentage_str);
            if (isNaN(perc) || perc <= 0 || perc > 100) errors.reward_value_percentage_str = 'Percentage must be between 1 and 100.';
        }
        break;
      case 'FIXED_AMOUNT_VOUCHER_ON_BOOKING':
        if (!formData.reward_value_fixed_amount_str.trim()) errors.reward_value_fixed_amount_str = 'Fixed amount is required.';
        else if (isNaN(parseFloat(formData.reward_value_fixed_amount_str)) || parseFloat(formData.reward_value_fixed_amount_str) <= 0) errors.reward_value_fixed_amount_str = 'Fixed amount must be a positive number.';
        if (!formData.reward_value_currency_code) errors.reward_value_currency_code = 'Currency code is required for fixed amount.';
        break;
      case 'FREE_TRIP_VOUCHER':
        if (!formData.free_trip_route_id_str) errors.free_trip_route_id_str = 'Route is required for free trip voucher.';
        break;
      case 'UPGRADE_TO_VEHICLE_TYPE':
        if (!formData.upgrade_to_vehicle_type_id_str) errors.upgrade_to_vehicle_type_id_str = 'Vehicle type for upgrade is required.';
        break;
      case 'COMPLIMENTARY_ITEM_OR_SERVICE':
        if (!formData.complimentary_item_description.trim()) errors.complimentary_item_description = 'Item/Service description is required.';
        break;
    }

    if (formData.points_to_redeem_str && (isNaN(parseInt(formData.points_to_redeem_str, 10)) || parseInt(formData.points_to_redeem_str, 10) <= 0)) {
      errors.points_to_redeem_str = 'Points to redeem must be a positive integer if provided.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const cleanDataForSubmission = (data: FormState): Omit<LoyaltyRewardFormData, 'id' | 'loyalty_tier_id'> => {
    const cleaned: any = {
        name: data.name,
        description: data.description || undefined,
        reward_type: data.reward_type,
        points_to_redeem: data.points_to_redeem_str ? parseInt(data.points_to_redeem_str, 10) : null,
        is_auto_applied_on_tier_achieve: data.is_auto_applied_on_tier_achieve,
        is_active: data.is_active,
    };

    switch (data.reward_type) {
      case 'PERCENTAGE_DISCOUNT_ON_BOOKING':
        cleaned.reward_value_percentage = parseFloat(data.reward_value_percentage_str);
        break;
      case 'FIXED_AMOUNT_VOUCHER_ON_BOOKING':
        cleaned.reward_value_fixed_amount = parseFloat(data.reward_value_fixed_amount_str);
        cleaned.reward_value_currency_code = data.reward_value_currency_code;
        break;
      case 'FREE_TRIP_VOUCHER':
        cleaned.free_trip_route_id = data.free_trip_route_id_str || null;
        break;
      case 'UPGRADE_TO_VEHICLE_TYPE':
        cleaned.upgrade_to_vehicle_type_id = data.upgrade_to_vehicle_type_id_str || null;
        break;
      case 'COMPLIMENTARY_ITEM_OR_SERVICE':
        cleaned.complimentary_item_description = data.complimentary_item_description;
        break;
    }
    // Nullify other fields not relevant to the selected type
    if (data.reward_type !== 'PERCENTAGE_DISCOUNT_ON_BOOKING') cleaned.reward_value_percentage = null;
    if (data.reward_type !== 'FIXED_AMOUNT_VOUCHER_ON_BOOKING') {
        cleaned.reward_value_fixed_amount = null;
        cleaned.reward_value_currency_code = null;
    }
    if (data.reward_type !== 'FREE_TRIP_VOUCHER') cleaned.free_trip_route_id = null;
    if (data.reward_type !== 'UPGRADE_TO_VEHICLE_TYPE') cleaned.upgrade_to_vehicle_type_id = null;
    if (data.reward_type !== 'COMPLIMENTARY_ITEM_OR_SERVICE') cleaned.complimentary_item_description = null;

    return cleaned;
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    const submissionData = cleanDataForSubmission(formData);
    await onSubmit(submissionData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {formError && (
        <div style={errorStyle}>
          {typeof formError === 'string' ? <p>{formError}</p> : formError.map((err, index) => <p key={index}>{typeof err === 'object' ? err.message : err}</p>)}
        </div>
      )}

      <Input label="Reward Name" name="name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required maxLength={100}/>
      <Textarea label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} rows={3}/>
      <Select label="Reward Type" name="reward_type" value={formData.reward_type} onChange={handleChange} options={rewardTypeOptions} error={fieldErrors.reward_type} required/>

      {/* Conditional Fields based on Reward Type */}
      {formData.reward_type === 'PERCENTAGE_DISCOUNT_ON_BOOKING' && (
        <Input label="Discount Percentage (%)" name="reward_value_percentage_str" type="number" value={formData.reward_value_percentage_str} onChange={handleChange} error={fieldErrors.reward_value_percentage_str} required min="1" max="100"/>
      )}
      {formData.reward_type === 'FIXED_AMOUNT_VOUCHER_ON_BOOKING' && (
        <>
          <Input label="Fixed Discount Amount" name="reward_value_fixed_amount_str" type="text" value={formData.reward_value_fixed_amount_str} onChange={handleChange} error={fieldErrors.reward_value_fixed_amount_str} required placeholder="e.g., 10.50"/>
          <Select label="Currency for Fixed Amount" name="reward_value_currency_code" value={formData.reward_value_currency_code} onChange={handleChange} options={currenciesList} error={fieldErrors.reward_value_currency_code} required/>
        </>
      )}
      {formData.reward_type === 'FREE_TRIP_VOUCHER' && (
        <Select label="Applicable Route for Free Trip" name="free_trip_route_id_str" value={formData.free_trip_route_id_str} onChange={handleChange} options={[noneOption, ...routesList]} error={fieldErrors.free_trip_route_id_str} required/>
      )}
      {formData.reward_type === 'UPGRADE_TO_VEHICLE_TYPE' && (
        <Select label="Upgrade to Vehicle Type" name="upgrade_to_vehicle_type_id_str" value={formData.upgrade_to_vehicle_type_id_str} onChange={handleChange} options={[noneOption, ...vehicleTypesList]} error={fieldErrors.upgrade_to_vehicle_type_id_str} required/>
      )}
      {formData.reward_type === 'COMPLIMENTARY_ITEM_OR_SERVICE' && (
        <Input label="Complimentary Item/Service Description" name="complimentary_item_description" value={formData.complimentary_item_description} onChange={handleChange} error={fieldErrors.complimentary_item_description} required maxLength={255}/>
      )}

      <Input label="Points to Redeem (Optional)" name="points_to_redeem_str" type="number" value={formData.points_to_redeem_str} onChange={handleChange} error={fieldErrors.points_to_redeem_str} min="1"/>
      <Checkbox label="Automatically Applied on Tier Achievement" name="is_auto_applied_on_tier_achieve" checked={formData.is_auto_applied_on_tier_achieve} onChange={handleChange} />
      <Checkbox label="Is Active" name="is_active" checked={formData.is_active} onChange={handleChange} />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create Reward')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving} style={{ background: 'gray' }}>
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default LoyaltyRewardForm;
