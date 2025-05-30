'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, Button, ColumnDefinition } from '@samatransport/ui';

// Define the Promotion type based on your table structure
export interface Promotion {
  id: string; // BIGINT from DB, string in JS
  name: string;
  description?: string | null;
  promo_code?: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  applicable_to_all_tariffs: boolean;
  applicable_routes?: string[] | null; // Array of route UUIDs
  applicable_vehicle_types?: string[] | null; // Array of vehicle type UUIDs
  valid_from: string; // ISO datetime string
  valid_until: string; // ISO datetime string
  max_uses?: number | null;
  current_uses: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-promotions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch promotions: ${response.status}`);
      }
      const data: Promotion[] = await response.json();
      setPromotions(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching promotions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleDelete = async (promotionId: string) => {
    if (window.confirm('Are you sure you want to delete this promotion?')) {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-promotions?id=${promotionId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete promotion: ${response.status}`);
        }
        alert('Promotion deleted successfully!');
        fetchPromotions(); // Refresh the list
      } catch (err: any) {
        alert(`Error deleting promotion: ${err.message}`);
        console.error("Error deleting promotion:", err);
      }
    }
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short'});
  }

  const columns: ColumnDefinition<Promotion>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Code', accessor: (row) => row.promo_code || '-' },
    {
      header: 'Discount',
      accessor: (row) => `${row.discount_value}${row.discount_type === 'PERCENTAGE' ? '%' : ' (Fixed)'}`
    },
    { header: 'Valid From', accessor: (row) => formatDateTime(row.valid_from) },
    { header: 'Valid Until', accessor: (row) => formatDateTime(row.valid_until) },
    { header: 'Active', accessor: (row) => (row.is_active ? 'Yes' : 'No') },
    {
      header: 'Actions',
      accessor: (row) => (
        <>
          <Button onClick={() => router.push(`/dashboard/pricing/promotions/${row.id}/edit`)} style={{ marginRight: '5px' }}>
            Edit
          </Button>
          <Button onClick={() => handleDelete(row.id)} style={{ background: 'red' }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) return <p>Loading promotions...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading promotions: {error}</p>;

  return (
    <>
      <PageHeader
        title="Promotions Management"
        actions={
          <Link href="/dashboard/pricing/promotions/new" passHref>
            <Button>New Promotion</Button>
          </Link>
        }
      />
      <DataTable data={promotions} columns={columns} />
    </>
  );
}
