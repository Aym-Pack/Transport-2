'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, SelectOption } from '@samatransport/ui';
import { StaffForm, StaffFormData } from '../components/StaffForm';

// Define type for user profiles (adjust based on actual data from your /manage-user-roles endpoint)
interface UserProfileOption {
  id: string; // This would be user_id from auth.users, which is user_profile.user_id
  email?: string;
  profile?: { full_name?: string | null; } | null;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function NewStaffMemberPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [usersList, setUsersList] = useState<SelectOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch users who could be linked.
  // Ideally, backend provides an endpoint for users *not* yet linked to staff.
  // For now, fetching all and letting backend validate uniqueness of user_profile_id.
  const fetchUsersWithoutStaffProfile = useCallback(async () => {
    setLoadingUsers(true);
    try {
      // Assuming /manage-user-roles returns users with profiles.
      // A more specific endpoint might be needed in a large system.
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/manage-user-roles`);
      if (!response.ok) throw new Error('Failed to fetch users list');
      const data: UserProfileOption[] = await response.json();

      // TODO: Ideally, filter out users already linked to a staff_member.
      // This requires fetching all staff_members and comparing.
      // For simplicity now, we pass all users and rely on backend validation (409 conflict).
      // A better UX would be to disable already linked users or not show them.
      setUsersList(data.map(u => ({
        value: u.id,
        label: `${u.email || 'N/A'} (${u.profile?.full_name || 'No Profile Name'})`
      })));
    } catch (error: any) {
      console.error("Error fetching users list:", error);
      setSubmissionStatus({ type: 'error', message: 'Failed to load users list for linking: ' + error.message });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersWithoutStaffProfile();
  }, [fetchUsersWithoutStaffProfile]);

  const handleCreateStaff = async (data: StaffFormData) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-staff-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to create staff member');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Staff member created successfully! Redirecting...' });
      setTimeout(() => router.push('/dashboard/operations/staff'), 2000);
    } catch (error: any) {
      console.error("Error creating staff member:", error);
      if (error.type === 'validation') {
        setFormError(error.messages); // Pass array to form
        setSubmissionStatus({ type: 'error', message: error.messages });
      } else {
        const errorMessage = error.message || 'An unexpected error occurred.';
        setFormError(errorMessage);
        setSubmissionStatus({ type: 'error', message: errorMessage });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/operations/staff');
  };

  if (loadingUsers) {
    return <p>Loading user data for form...</p>;
  }

  return (
    <>
      <PageHeader title="Add New Staff Member" />
      {submissionStatus && ( // Display general submission status above form
        <div style={{
          padding: '10px', marginBottom: '15px', borderRadius: '4px',
          border: `1px solid ${submissionStatus.type === 'success' ? 'green' : 'red'}`,
          background: submissionStatus.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: submissionStatus.type === 'success' ? 'green' : 'red',
        }}>
          {typeof submissionStatus.message === 'string' ? submissionStatus.message : (
             submissionStatus.message.map((msg, idx) => <p key={idx}>{typeof msg === 'object' ? msg.message : msg}</p>)
          )}
        </div>
      )}
      <StaffForm
        onSubmit={handleCreateStaff}
        isSaving={isSaving}
        formError={formError} // This is for field-specific errors shown by the form
        onCancel={handleCancel}
        usersList={usersList}
      />
    </>
  );
}
