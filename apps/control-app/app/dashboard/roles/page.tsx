'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the Role type based on your table structure
export interface Role {
  id: string; // BIGINT from DB, but string in JS/JSON
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-roles`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch roles: ${response.status}`);
      }
      const data: Role[] = await response.json();
      setRoles(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching roles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role? This might affect users assigned to this role.')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-roles?id=${roleId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409) { // Conflict due to FK constraint
             throw new Error(errorData.error || `Cannot delete role. It might be in use or have other dependencies.`);
           }
          throw new Error(errorData.error || `Failed to delete role: ${response.status}`);
        }
        alert('Role deleted successfully!');
        fetchRoles(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting role: ${err.message}`);
        console.error("Error deleting role:", err);
      }
    }
  };

  const columns: ColumnDefinition<Role>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: (row) => row.description || '-' },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/roles/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading roles...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading roles: {error}</p>;

  return (
    <>
      <PageHeader
        title="Roles"
        actions={
          <Link href="/dashboard/roles/new" passHref>
            <Button>New Role</Button>
          </Link>
        }
      />
      <DataTable data={roles} columns={columns} />
    </>
  );
}
