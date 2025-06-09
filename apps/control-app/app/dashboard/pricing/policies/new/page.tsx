'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { PolicyRuleForm, PolicyRuleFormData } from '../components/PolicyRuleForm';

// Define types for related data
interface Route { id: string; name: string; }
interface VehicleType { id: string; name: string; }

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewPolicyRulePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null); // Allow string array
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(true);

  const fetchRelatedData = useCallback(async () => {
    setLoadingRelatedData(true);
    setFormError(null);
    try {
      const [routesRes, vehicleTypesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      if (!routesRes.ok) throw new Error('Failed to fetch routes');
      const routesData: Route[] = await routesRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

    } catch (error: any) {
      console.error("Error fetching related data:", error);
      setFormError('Failed to load form dependencies: ' + error.message);
    } finally {
      setLoadingRelatedData(false);
    }
  }, []);

  useEffect(() => {
    fetchRelatedData();
  }, [fetchRelatedData]);

  const handleCreatePolicyRule = async (data: PolicyRuleFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-policy-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to create policy rule');
        throw { message }; // Throw an object to distinguish from string errors
      }
      setSubmissionStatus({ type: 'success', message: 'Policy rule created successfully! Redirecting...' });
      // router.push('/dashboard/pricing/policies'); // Keep for now, or redirect after timeout
      setTimeout(() => router.push('/dashboard/pricing/policies'), 2000); // Redirect after 2s
    } catch (error: any) {
      console.error("Error creating policy rule:", error);
      const errorMessage = error.message || 'An unexpected error occurred.';
      setFormError(errorMessage); // Pass to formError prop
      setSubmissionStatus({ type: 'error', message: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/pricing/policies');
  };

  if (loadingRelatedData) {
    return <p>Loading form dependencies...</p>;
  }

  if (formError && routesList.length === 0 && vehicleTypesList.length === 0) {
      return <p style={{ color: 'red' }}>Error loading form: {formError}</p>;
  }

  return (
    <>
      <PageHeader title="Create New Policy Rule" />
      {submissionStatus && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '4px',
          border: `1px solid ${submissionStatus.type === 'success' ? 'green' : 'red'}`,
          background: submissionStatus.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: submissionStatus.type === 'success' ? 'green' : 'red',
        }}>
          {typeof submissionStatus.message === 'string' ? submissionStatus.message : (
            submissionStatus.message.map((msg, idx) => <p key={idx}>{msg}</p>)
          )}
        </div>
      )}
      <PolicyRuleForm
        onSubmit={handleCreatePolicyRule}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        routesList={routesList}
        vehicleTypesList={vehicleTypesList}
      />
    </>
  );
}
