'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, SelectOption, Button } from '@samatransport/ui';
import { StaffForm, StaffFormData } from '../components/StaffForm';
import Link from 'next/link';

interface UserProfileOption {
  id: string;
  email?: string;
  profile?: { full_name?: string | null; } | null;
}

// Staff member data as returned by API for editing
interface StaffMemberAPIResponse extends StaffFormData {
  id: string;
  // user_profile may be joined
  user_profile?: { user_id: string; full_name?: string | null; /* other fields */ };
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function EditStaffMemberPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<StaffFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | string[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);

  const [usersList, setUsersList] = useState<SelectOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pageTitle, setPageTitle] = useState("Edit Staff Member");


  const fetchStaffAndUsers = useCallback(async () => {
    if (!staffId) return;
    setLoadingData(true);
    setFormError(null);
    setSubmissionStatus(null);
    setNotFound(false);

    try {
      const [staffRes, usersRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-staff-members?id=${staffId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/manage-user-roles`), // Fetch all users for dropdown
      ]);

      if (!staffRes.ok) {
        if (staffRes.status === 404) { setNotFound(true); throw new Error('Staff member not found.'); }
        const errorData = await staffRes.json();
        throw new Error(errorData.error || 'Failed to fetch staff member data');
      }
      const staffData: StaffMemberAPIResponse = await staffRes.json();
      setInitialData({
          ...staffData,
          // Ensure license_expiry_date is in YYYY-MM-DD for the date input, or empty string
          license_expiry_date: staffData.license_expiry_date ? new Date(staffData.license_expiry_date).toISOString().split('T')[0] : '',
      });
      setPageTitle(`Edit Staff: ${staffData.first_name} ${staffData.last_name}`);

      if (!usersRes.ok) throw new Error('Failed to fetch users list for linking.');
      const usersData: UserProfileOption[] = await usersRes.json();
      // TODO: Filter usersList to exclude users already linked to *other* staff members.
      // For now, it includes all users. The currently linked user (if any) will be pre-selected.
      // Backend validation will prevent linking a user already linked to another staff member.
      setUsersList(usersData.map(u => ({
        value: u.id,
        label: `${u.email || 'N/A'} (${u.profile?.full_name || 'No Profile Name'})`
      })));


    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (!notFound) {
        setSubmissionStatus({ type: 'error', message: 'Failed to load data: ' + error.message });
      }
    } finally {
      setLoadingData(false);
    }
  }, [staffId, notFound]);

  useEffect(() => {
    fetchStaffAndUsers();
  }, [fetchStaffAndUsers]);

  const handleUpdateStaff = async (data: StaffFormData) => {
    setIsSaving(true);
    setFormError(null);
    setSubmissionStatus(null);
    try {
      const { id, ...updatePayload } = data; // id is not part of update payload body
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-staff-members?id=${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to update staff member');
        throw { type: 'validation', messages: message };
      }
      setSubmissionStatus({ type: 'success', message: 'Staff member updated successfully!' });
      // Update initialData to reflect changes if needed, or refetch
      setInitialData(prev => prev ? {...prev, ...responseData} : responseData);

    } catch (error: any) {
      console.error("Error updating staff member:", error);
      if (error.type === 'validation') {
        setFormError(error.messages);
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

  if (loadingData) return <p>Loading staff member data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Edit Staff Member" />
      <p>Staff member not found.</p>
      <Link href="/dashboard/operations/staff" passHref><Button>Back to List</Button></Link>
    </>
  );
  if (submissionStatus?.type === 'error' && !initialData && !loadingData) {
    return (
      <>
        <PageHeader title="Edit Staff Member" />
        <p style={{ color: 'red' }}>{typeof submissionStatus.message === 'string' ? submissionStatus.message : submissionStatus.message.join(', ')}</p>
        <Link href="/dashboard/operations/staff" passHref><Button>Back to List</Button></Link>
      </>
    );
  }
  if (!initialData) return <p>Staff member data could not be loaded.</p>;


  return (
    <>
      <PageHeader title={pageTitle} />
       {submissionStatus && (
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
        initialData={initialData}
        onSubmit={handleUpdateStaff}
        isSaving={isSaving}
        formError={formError}
        onCancel={handleCancel}
        usersList={usersList}
      />
    </>
  );
}
