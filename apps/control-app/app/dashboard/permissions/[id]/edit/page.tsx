'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Button } from '@samatransport/ui';
import { PermissionForm, PermissionFormData } from '../components/PermissionForm';
import Link from 'next/link';

// Define the Permission type based on your table structure
interface Permission extends PermissionFormData {
  id: string; // BIGINT from DB, but string in JS/JSON
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditPermissionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string; // The 'id' from the URL path

  const [initialData, setInitialData] = useState<Partial<PermissionFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchPermission = useCallback(async () => {
    if (!id) return;

    setLoadingData(true);
    setFormError(null);
    setNotFound(false);

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-permissions?id=${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
          throw new Error('Permission not found.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch permission data');
      }
      const permissionData: Permission = await response.json();
      setInitialData(permissionData);

    } catch (error: any) {
      console.error("Error fetching permission data:", error);
      if (!notFound) { // Only set formError if it's not a "not found" error
        setFormError(error.message);
      }
    } finally {
      setLoadingData(false);
    }
  }, [id, notFound]); // Added notFound to dependency array

  useEffect(() => {
    fetchPermission();
  }, [fetchPermission]);

  const handleUpdatePermission = async (formData: PermissionFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      // The ID is part of formData if initialData had it, but endpoint expects it in query
      const { id: formId, ...updatePayload } = formData; 
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-permissions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update permission');
      }
      alert('Permission updated successfully!');
      router.push('/dashboard/permissions');
    } catch (error: any) {
      console.error("Error updating permission:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/permissions');
  };

  if (loadingData) {
    return <p>Loading permission data...</p>;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Edit Permission" />
        <p>Permission not found.</p>
        <Link href="/dashboard/permissions" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }
  
  if (formError && !initialData) {
     return (
      <>
        <PageHeader title="Edit Permission" />
        <p style={{ color: 'red' }}>Error loading data: {formError}</p>
         <Link href="/dashboard/permissions" passHref>
          <Button>Back to List</Button>
        </Link>
      </>
    );
  }

  if (!initialData) {
      return <p>Permission data could not be loaded.</p>;
  }

  return (
    <>
      <PageHeader title={`Edit Permission: ${initialData?.action || ''}`} />
      <PermissionForm
        initialData={initialData}
        onSubmit={handleUpdatePermission}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
      />
    </>
  );
}
