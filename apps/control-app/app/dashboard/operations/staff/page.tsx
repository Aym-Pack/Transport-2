'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition, Select, SelectOption } from '@samatransport/ui';
import { StaffRoleType } from './components/StaffForm'; // Import type

export interface StaffMember {
  id: string; // UUID
  user_profile_id?: string | null;
  first_name: string;
  last_name: string;
  staff_type: StaffRoleType;
  employee_id_number?: string | null;
  contact_phone?: string | null;
  license_number?: string | null;
  license_expiry_date?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined data from Edge Function
  user_profile?: {
    user_id: string;
    full_name?: string | null;
    // email might come from a further join in the edge function if auth.users is accessed
    // For now, assuming user_profiles might have some displayable info like full_name
  };
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

const staffTypeFilterOptions: SelectOption[] = [
  { value: '', label: 'All Types' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'HOSTESS', label: 'Hostess' },
  { value: 'MECHANIC', label: 'Mechanic' },
  { value: 'OTHER_CREW', label: 'Other Crew' },
];
const activeStatusFilterOptions: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function StaffMembersPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  const [filterStaffType, setFilterStaffType] = useState<string>('');
  const [filterIsActive, setFilterIsActive] = useState<string>('');

  const fetchStaffMembers = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    let url = `${SUPABASE_FUNCTIONS_BASE_URL}/crud-staff-members`;
    const params = new URLSearchParams();
    if (filterStaffType) params.append('staff_type', filterStaffType);
    if (filterIsActive !== '') params.append('is_active', filterIsActive);
    if (params.toString()) url += `?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch staff members: ${response.status}`);
      }
      const data: StaffMember[] = await response.json();
      setStaffMembers(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      console.error("Error fetching staff members:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStaffType, filterIsActive]);

  useEffect(() => {
    fetchStaffMembers();
  }, [fetchStaffMembers]);

  const handleDelete = async (staffId: string) => {
    setFeedback(null);
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-staff-members?id=${staffId}`, {
          method: 'DELETE',
        });
        const responseData = response.status === 204 ? { message: 'Staff member deleted successfully!' } : await response.json();
        if (!response.ok && response.status !== 204) {
          throw new Error(responseData.error || responseData.message || `Failed to delete staff member: ${response.status}`);
        }
        setFeedback({ type: 'success', message: responseData.message || 'Staff member deleted successfully!' });
        fetchStaffMembers(); // Refresh
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Error deleting staff member: ${err.message}` });
        console.error("Error deleting staff member:", err);
      }
    }
  };

  const columns: ColumnDefinition<StaffMember>[] = [
    { header: 'Name', accessor: (row) => `${row.first_name} ${row.last_name}` },
    { header: 'Type', accessor: 'staff_type' },
    { header: 'Employee ID', accessor: (row) => row.employee_id_number || '-' },
    { header: 'Phone', accessor: (row) => row.contact_phone || '-' },
    {
      header: 'Linked User',
      accessor: (row) => row.user_profile?.full_name || row.user_profile_id || 'Not Linked'
    },
    { header: 'Active', accessor: (row) => (row.is_active ? 'Yes' : 'No') },
    {
      header: 'Actions',
      accessor: (row) => (
        <div style={{display: 'flex', gap: '5px'}}>
          <Button onClick={() => router.push(`/dashboard/operations/staff/${row.id}/edit`)}>Edit</Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff Management"
        actions={<Link href="/dashboard/operations/staff/new" passHref><Button>New Staff Member</Button></Link>}
      />
      {feedback && (
        <div style={{
          padding: '10px', margin: '10px 0', borderRadius: '4px',
          border: `1px solid ${feedback.type === 'success' ? 'green' : 'red'}`,
          background: feedback.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: feedback.type === 'success' ? 'green' : 'red',
        }}>{feedback.message}</div>
      )}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <Select label="Filter by Type:" options={staffTypeFilterOptions} value={filterStaffType} onChange={(e) => setFilterStaffType(e.target.value)} name="filterStaffType"/>
        <Select label="Filter by Status:" options={activeStatusFilterOptions} value={filterIsActive} onChange={(e) => setFilterIsActive(e.target.value)} name="filterIsActive"/>
      </div>
      {loading && <p>Loading staff members...</p>}
      {feedback?.type === 'error' && !loading && <p style={{ color: 'red' }}>{feedback.message}</p>}
      {!loading && !(feedback?.type === 'error' && staffMembers.length === 0) && <DataTable data={staffMembers} columns={columns} />}
    </>
  );
}
