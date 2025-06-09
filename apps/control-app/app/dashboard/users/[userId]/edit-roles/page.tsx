'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Button, Checkbox } from '@samatransport/ui';
import Link from 'next/link'; // For the "Back to List" link on not found

// Types from page.tsx - consider moving to a shared types file
export interface UserProfile {
  user_id: string;
  full_name?: string | null;
  job_title?: string | null;
}
export interface Role {
  id: string; // BIGINT, so string in JS
  name: string;
}
export interface UserWithProfileAndRoles {
  id: string; // UUID from auth.users
  email?: string;
  profile: UserProfile | null;
  roles: Role[];
  created_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditUserRolesPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [userData, setUserData] = useState<UserWithProfileAndRoles | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoadingData(true);
    setFormError(null);
    setNotFound(false);

    try {
      const [userRes, rolesRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/manage-user-roles?userId=${userId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-roles`),
      ]);

      if (!userRes.ok) {
        if (userRes.status === 404) {
          setNotFound(true);
          throw new Error('User not found.');
        }
        const errorData = await userRes.json();
        throw new Error(errorData.error || 'Failed to fetch user data');
      }
      const fetchedUserData: UserWithProfileAndRoles = await userRes.json();
      setUserData(fetchedUserData);
      setSelectedRoleIds(new Set(fetchedUserData.roles.map(role => role.id.toString())));


      if (!rolesRes.ok) {
        const errorData = await rolesRes.json();
        throw new Error(errorData.error || 'Failed to fetch roles list');
      }
      const rolesData: Role[] = await rolesRes.json();
      setAllRoles(rolesData);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) {
        setFormError(error.message);
      }
    } finally {
      setLoadingData(false);
    }
  }, [userId, notFound]); // Added notFound

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = (roleId: string, checked: boolean) => {
    setSelectedRoleIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(roleId);
      } else {
        newSet.delete(roleId);
      }
      return newSet;
    });
  };

  const handleSaveUserRoles = async () => {
    setIsSaving(true);
    setFormError(null);
    try {
      const roleIdsToSave = Array.from(selectedRoleIds).map(id => BigInt(id)); // Convert string IDs to BigInts
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/manage-user-roles/set-user-roles?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_ids: roleIdsToSave }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user roles');
      }
      alert('User roles updated successfully!');
      // Optionally, refetch user data or update local state if response contains updated roles
      // For now, we'll just navigate back or let the user see the changes on next load
      router.push('/dashboard/users');
    } catch (error: any) {
      console.error("Error saving user roles:", error);
      setFormError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/users');
  };

  if (loadingData) return <p>Loading user and role data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit User Roles" />
      <p>User not found.</p>
      <Link href="/dashboard/users" passHref><Button>Back to Users List</Button></Link>
    </>
  );
  if (formError && !userData) return (
    <>
      <PageHeader title="Edit User Roles" />
      <p style={{ color: 'red' }}>Error loading data: {formError}</p>
      <Link href="/dashboard/users" passHref><Button>Back to Users List</Button></Link>
    </>
  );
  if (!userData) return <p>User data could not be loaded.</p>;

  return (
    <>
      <PageHeader title={`Edit Roles for: ${userData.profile?.full_name || userData.email || 'User'}`} />

      <div style={{ marginBottom: '1rem' }}>
        <p><strong>User ID:</strong> {userData.id}</p>
        <p><strong>Email:</strong> {userData.email || 'N/A'}</p>
        <p><strong>Full Name:</strong> {userData.profile?.full_name || 'N/A'}</p>
        <p><strong>Job Title:</strong> {userData.profile?.job_title || 'N/A'}</p>
      </div>

      <div style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', background: '#fff' }}>
        <h3>Assign Roles</h3>
        {formError && <p style={{ color: 'red', marginBottom: '1rem' }}>{formError}</p>}

        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
          {allRoles.length === 0 && <p>No roles available to assign.</p>}
          {allRoles.map(role => (
            <div key={role.id} style={{ marginBottom: '0.5rem' }}>
              <Checkbox
                name={`role-${role.id}`}
                label={`${role.name}`}
                checked={selectedRoleIds.has(role.id.toString())}
                onChange={(e) => handleRoleChange(role.id.toString(), e.target.checked)}
                disabled={isSaving}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <Button onClick={handleSaveUserRoles} disabled={isSaving}>
            {isSaving ? 'Saving Roles...' : 'Save Roles'}
            </Button>
            <Button type="button" onClick={handleCancel} disabled={isSaving} style={{ background: 'gray' }}>
            Cancel
            </Button>
        </div>
      </div>
    </>
  );
}
