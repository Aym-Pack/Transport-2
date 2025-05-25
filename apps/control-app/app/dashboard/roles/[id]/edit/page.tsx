'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Button, Checkbox } from '@samatransport/ui';
import { RoleForm, RoleFormData } from '../components/RoleForm';
import Link from 'next/link';

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

interface RoleDetails extends RoleFormData {
  id: string;
  permission_ids?: number[]; // Comes from the /crud-roles?id=X endpoint
}

interface Permission {
  id: string; // Actually a BIGINT, but string in JS
  action: string;
  description?: string | null;
}

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params.id as string;

  const [roleDetails, setRoleDetails] = useState<RoleDetails | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());

  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [formErrorDetails, setFormErrorDetails] = useState<string | null>(null);
  const [formErrorPermissions, setFormErrorPermissions] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    if (!roleId) return;
    setLoadingData(true);
    setFormErrorDetails(null);
    setFormErrorPermissions(null);
    setNotFound(false);

    try {
      const [roleRes, permissionsRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-roles?id=${roleId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-permissions`),
      ]);

      if (!roleRes.ok) {
        if (roleRes.status === 404) {
          setNotFound(true);
          throw new Error('Role not found.');
        }
        const errorData = await roleRes.json();
        throw new Error(errorData.error || 'Failed to fetch role details');
      }
      const roleData: RoleDetails = await roleRes.json();
      setRoleDetails(roleData);
      setSelectedPermissionIds(new Set(roleData.permission_ids?.map(String) || []));


      if (!permissionsRes.ok) {
        const errorData = await permissionsRes.json();
        throw new Error(errorData.error || 'Failed to fetch permissions list');
      }
      const permissionsData: Permission[] = await permissionsRes.json();
      setAllPermissions(permissionsData);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) { // Only set formError if it's not a "not found" error that's handled by the notFound state
        setFormErrorDetails(error.message); // General error for the page
      }
    } finally {
      setLoadingData(false);
    }
  }, [roleId, notFound]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateRoleDetails = async (data: Pick<RoleFormData, 'name' | 'description'>) => {
    setIsSavingDetails(true);
    setFormErrorDetails(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-roles?id=${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role details');
      }
      const updatedRole = await response.json();
      setRoleDetails(prev => prev ? {...prev, ...updatedRole} : updatedRole); // Update local state
      alert('Role details updated successfully!');
    } catch (error: any) {
      console.error("Error updating role details:", error);
      setFormErrorDetails(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(permissionId);
      } else {
        newSet.delete(permissionId);
      }
      return newSet;
    });
  };

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    setFormErrorPermissions(null);
    try {
      const permissionIdsToSave = Array.from(selectedPermissionIds).map(id => BigInt(id)); // Convert back to BigInt for backend
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-roles/set-permissions?id=${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_ids: permissionIdsToSave }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save permissions');
      }
      alert('Permissions saved successfully!');
      // Optionally re-fetch role data if the response from set-permissions doesn't include the updated permission_ids
      // For now, assume the local selectedPermissionIds is the source of truth until next full fetch.
       const updatedRoleData = await response.json();
       if (roleDetails && updatedRoleData.permission_ids) {
           setRoleDetails(prev => prev ? {...prev, permission_ids: updatedRoleData.permission_ids.map(String) } : null );
       }

    } catch (error: any) {
      console.error("Error saving permissions:", error);
      setFormErrorPermissions(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSavingPermissions(false);
    }
  };


  const handleCancel = () => {
    router.push('/dashboard/roles');
  };

  if (loadingData) return <p>Loading role and permission data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit Role" />
      <p>Role not found.</p>
      <Link href="/dashboard/roles" passHref><Button>Back to List</Button></Link>
    </>
  );
  if (formErrorDetails && !roleDetails) return (
    <>
      <PageHeader title="Edit Role" />
      <p style={{ color: 'red' }}>Error loading data: {formErrorDetails}</p>
      <Link href="/dashboard/roles" passHref><Button>Back to List</Button></Link>
    </>
  );
  if (!roleDetails) return <p>Role data could not be loaded.</p>;

  return (
    <>
      <PageHeader title={`Edit Role: ${roleDetails.name}`} />
      
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', background: '#fff' }}>
        <h3>Role Details</h3>
        <RoleForm
          initialData={roleDetails}
          onSubmit={handleUpdateRoleDetails}
          isSaving={isSavingDetails}
          formError={formErrorDetails}
          onCancel={handleCancel}
        />
      </div>

      <div style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', background: '#fff' }}>
        <h3>Assign Permissions</h3>
        {formErrorPermissions && <p style={{ color: 'red', marginBottom: '1rem' }}>{formErrorPermissions}</p>}
        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
          {allPermissions.length === 0 && <p>No permissions available.</p>}
          {allPermissions.map(permission => (
            <div key={permission.id} style={{ marginBottom: '0.5rem' }}>
              <Checkbox
                name={`perm-${permission.id}`}
                label={`${permission.action} - (${permission.description || 'No description'})`}
                checked={selectedPermissionIds.has(permission.id.toString())}
                onChange={(e) => handlePermissionChange(permission.id.toString(), e.target.checked)}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSavePermissions} disabled={isSavingPermissions}>
          {isSavingPermissions ? 'Saving Permissions...' : 'Save Permissions'}
        </Button>
      </div>
    </>
  );
}
