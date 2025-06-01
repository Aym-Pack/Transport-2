'use client';

import React, { useEffect, useState, useCallback } from 'react';
// import Link from 'next/link'; // Not used for "New User" in this scope
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the User type based on your expected API response
export interface UserProfile {
  user_id: string;
  full_name?: string | null;
  job_title?: string | null;
  // other profile fields
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
  // other auth.users fields like created_at, last_sign_in_at etc.
  created_at?: string;
}

// Basic pagination state
interface PaginationState {
  page: number;
  perPage: number;
  // totalUsers: number; // The API for listUsers in Supabase admin doesn't directly give total count easily
}


const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function UsersPage() {
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithProfileAndRoles[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, perPage: 10 });

  const fetchUsers = useCallback(async (page: number, perPage: number) => {
    setLoading(true);
    setError(null);
    try {
      // Note: Supabase listUsers uses 1-based indexing for page.
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/manage-user-roles?page=${page}&perPage=${perPage}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch users: ${response.status}`);
      }
      const data: UserWithProfileAndRoles[] = await response.json();
      setUsersWithRoles(data);
      // The manage-user-roles Edge Function currently doesn't return total count.
      // For true pagination, the API would need to provide this.
      // If data.length < perPage, it implies it's the last page.
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(pagination.page, pagination.perPage);
  }, [fetchUsers, pagination.page, pagination.perPage]);

  // Basic pagination handlers (no total count from API yet)
  const handleNextPage = () => {
    if (usersWithRoles.length === pagination.perPage) { // Only go next if current page was full
        setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handlePreviousPage = () => {
    setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  };


  const columns: ColumnDefinition<UserWithProfileAndRoles>[] = [
    { header: 'Email', accessor: (row) => row.email || 'N/A' },
    { header: 'Full Name', accessor: (row) => row.profile?.full_name || 'N/A' },
    { header: 'Job Title', accessor: (row) => row.profile?.job_title || 'N/A' },
    {
      header: 'Roles',
      accessor: (row) => row.roles.map(role => role.name).join(', ') || 'No roles assigned',
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button onClick={() => router.push(`/dashboard/users/${row.id}/edit-roles`)}>
          Edit Roles
        </Button>
      ),
    },
  ];

  if (loading) return <p>Loading users...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading users: {error}</p>;

  const router = useRouter(); // Added for navigation

  return (
    <>
      <PageHeader
        title="User Management"
        actions={
          <Button onClick={() => router.push('/dashboard/users/create')}>
            Create User
          </Button>
        }
      />
      <DataTable data={usersWithRoles} columns={columns} />
       <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handlePreviousPage} disabled={pagination.page === 1 || loading}>
          Previous
        </Button>
        <span>Page {pagination.page}</span>
        <Button onClick={handleNextPage} disabled={usersWithRoles.length < pagination.perPage || loading}>
          Next
        </Button>
      </div>
    </>
  );
}
