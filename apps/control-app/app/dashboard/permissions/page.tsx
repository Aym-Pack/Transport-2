'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the Permission type based on your table structure
export interface Permission {
  id: string; // BIGINT from DB, but string in JS/JSON
  action: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-permissions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch permissions: ${response.status}`);
      }
      const data: Permission[] = await response.json();
      setPermissions(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching permissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleDelete = async (permissionId: string) => {
    if (window.confirm('Are you sure you want to delete this permission? This might affect roles that use it.')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-permissions?id=${permissionId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409) { // Conflict due to FK constraint
             throw new Error(errorData.error || `Cannot delete permission. It is currently assigned to one or more roles. Please remove it from all roles before deleting.`);
           }
          throw new Error(errorData.error || `Failed to delete permission: ${response.status}`);
        }
        // The crud-permissions DELETE endpoint currently returns a JSON message on success
        // const successMessage = await response.json();
        // alert(successMessage.message || 'Permission deleted successfully!');
        alert('Permission deleted successfully!'); // Assuming 200 with message or 204
        fetchPermissions(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting permission: ${err.message}`);
        console.error("Error deleting permission:", err);
      }
    }
  };

  const columns: ColumnDefinition<Permission>[] = [
    { header: 'Action', accessor: 'action' },
    { header: 'Description', accessor: (row) => row.description || '-' },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/permissions/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading permissions...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading permissions: {error}</p>;

  return (
    <>
      <PageHeader
        title="Permissions"
        actions={
          <Link href="/dashboard/permissions/new" passHref>
            <Button>New Permission</Button>
          </Link>
        }
      />
      <DataTable data={permissions} columns={columns} />
    </>
  );
}
