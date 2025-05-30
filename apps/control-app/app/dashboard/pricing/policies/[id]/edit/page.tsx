'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { PolicyRuleForm, PolicyRuleFormData } from '../components/PolicyRuleForm';
import Link from 'next/link'; // For "Back to List" link

// Define types for related data (can be moved to a shared types file)
interface Route { id: string; name: string; }
interface VehicleType { id: string; name: string; }

// Define the PolicyRule type as expected from the API
interface PolicyRuleAPIResponse extends PolicyRuleFormData {
  id: string;
  // Potentially joined data, though our form expects IDs for applicable_route_id etc.
  // The form itself will handle initialData mapping.
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditPolicyRulePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string; // Policy Rule ID from URL

  const [initialData, setInitialData] = useState<Partial<PolicyRuleFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null); // Allow string array
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [routesList, setRoutesList] = useState<SelectOption[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<SelectOption[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchPolicyRuleAndRelatedData = useCallback(async () => {
    if (!id) return;

    setLoadingData(true);
    setFormError(null);
    setNotFound(false);

    try {
      const [policyRuleRes, routesRes, vehicleTypesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-policy-rules?id=${id}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-routes`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-vehicle-types`),
      ]);

      // Process Policy Rule Data
      if (!policyRuleRes.ok) {
        if (policyRuleRes.status === 404) {
          setNotFound(true);
          throw new Error('Policy Rule not found.');
        }
        const errorData = await policyRuleRes.json();
        throw new Error(errorData.error || 'Failed to fetch policy rule data');
      }
      const policyRuleData: PolicyRuleAPIResponse = await policyRuleRes.json();
      // The PolicyRuleForm's useEffect will handle mapping to its internal string-based state
      setInitialData(policyRuleData);

      // Process Routes
      if (!routesRes.ok) throw new Error('Failed to fetch routes');
      const routesData: Route[] = await routesRes.json();
      setRoutesList(routesData.map(r => ({ value: r.id, label: r.name })));

      // Process Vehicle Types
      if (!vehicleTypesRes.ok) throw new Error('Failed to fetch vehicle types');
      const vehicleTypesData: VehicleType[] = await vehicleTypesRes.json();
      setVehicleTypesList(vehicleTypesData.map(vt => ({ value: vt.id, label: vt.name })));

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) { // Only set formError if it's not a "not found" error that's handled by the notFound state
        setFormError(error.message);
      }
    } finally {
      setLoadingData(false);
    }
  }, [id, notFound]);

  useEffect(() => {
    fetchPolicyRuleAndRelatedData();
  }, [fetchPolicyRuleAndRelatedData]);

  const handleUpdatePolicyRule = async (formData: PolicyRuleFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      // The ID is part of formData if initialData had it, but the endpoint expects it in query
      const { id: formId, ...updatePayload } = formData;
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-policy-rules?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload), // Send payload without ID in body
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to update policy rule');
        throw { message }; // Throw an object to distinguish from string errors
      }
      setSubmissionStatus({ type: 'success', message: 'Policy Rule updated successfully!' });
      // Optionally, keep the user on the page or redirect after a timeout
      // router.push('/dashboard/pricing/policies');
    } catch (error: any) {
      console.error("Error updating policy rule:", error);
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

  if (loadingData) {
    return <p>Loading policy rule data...</p>;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Edit Policy Rule" />
        <p>Policy Rule not found.</p>
        <Link href="/dashboard/pricing/policies" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }

  if (formError && !initialData) {
     return (
      <>
        <PageHeader title="Edit Policy Rule" />
        <p style={{ color: 'red' }}>Error loading data: {formError}</p>
         <Link href="/dashboard/pricing/policies" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }

  if (!initialData) { // Fallback if data is still null after loading and no specific error set
      return <p>Policy Rule data could not be loaded.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Policy Rule: ${initialData?.name || ''}`} />
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
        initialData={initialData}
        onSubmit={handleUpdatePolicyRule}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        routesList={routesList}
        vehicleTypesList={vehicleTypesList}
      />
    </>
  );
}
