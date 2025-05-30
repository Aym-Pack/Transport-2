'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Button, Select, SelectOption, Input, DataTable, ColumnDefinition } from '@samatransport/ui';
import Link from 'next/link';

interface StaffMember {
  id: string; // UUID
  first_name: string;
  last_name: string;
  staff_type: string;
}
interface CrewAssignment {
  staff_member_id: string;
  assigned_role_in_departure: string;
}
interface DepartureCrewMember extends CrewAssignment {
    id?: string; // ID of the departure_crew row itself
    staff_member?: StaffMember; // Joined data
}
interface DepartureInfo {
    id: string;
    departure_date: string;
    schedule?: { route?: { name: string }};
    departure_crew?: DepartureCrewMember[];
}


const SUPABASE_FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';

export default function ManageDepartureCrewPage() {
  const router = useRouter();
  const params = useParams();
  const departureId = params.id as string;

  const [departureInfo, setDepartureInfo] = useState<DepartureInfo | null>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [currentCrew, setCurrentCrew] = useState<DepartureCrewMember[]>([]);

  // For adding a new crew member
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [assignedRole, setAssignedRole] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string | string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    if (!departureId) return;
    setLoading(true);
    setFeedback(null);
    setNotFound(false);
    try {
      const [departureRes, staffRes] = await Promise.all([
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-departures?id=${departureId}`),
        fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-staff-members?is_active=true`), // Fetch active staff
      ]);

      if (!departureRes.ok) {
        if (departureRes.status === 404) { setNotFound(true); throw new Error('Departure not found.'); }
        const errorData = await departureRes.json();
        throw new Error(errorData.error || 'Failed to fetch departure data');
      }
      const depData: DepartureInfo = await departureRes.json();
      setDepartureInfo(depData);
      setCurrentCrew(depData.departure_crew || []);

      if (!staffRes.ok) throw new Error('Failed to fetch staff members.');
      const staffData: StaffMember[] = await staffRes.json();
      setAllStaff(staffData);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }, [departureId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddCrewMember = () => {
    if (!selectedStaffId || !assignedRole.trim()) {
      setFeedback({ type: 'error', message: 'Please select a staff member and specify their role.' });
      return;
    }
    // Check if staff member with this role is already added
    if (currentCrew.some(c => c.staff_member_id === selectedStaffId && c.assigned_role_in_departure.toLowerCase() === assignedRole.trim().toLowerCase())) {
        setFeedback({ type: 'error', message: 'This staff member is already assigned this role for this departure.' });
        return;
    }
    const staffMember = allStaff.find(s => s.id === selectedStaffId);
    if (staffMember) {
      setCurrentCrew(prev => [...prev, {
          staff_member_id: selectedStaffId,
          assigned_role_in_departure: assignedRole.trim(),
          staff_member: staffMember // Add staff member details for immediate display
      }]);
      setSelectedStaffId('');
      setAssignedRole('');
      setFeedback(null);
    }
  };

  const handleRemoveCrewMember = (staffMemberId: string, role: string) => {
    setCurrentCrew(prev => prev.filter(c => !(c.staff_member_id === staffMemberId && c.assigned_role_in_departure === role)));
  };

  const handleSaveCrewAssignments = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload = {
        crew_assignments: currentCrew.map(c => ({
          staff_member_id: c.staff_member_id,
          assigned_role_in_departure: c.assigned_role_in_departure,
        })),
      };
      const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/crud-departures/set-crew?id=${departureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        const message = Array.isArray(responseData.errors) ? responseData.errors : (responseData.error || 'Failed to save crew assignments');
        throw { type: 'validation', messages: message };
      }
      setFeedback({ type: 'success', message: responseData.message || 'Crew assignments saved successfully!' });
      // Optionally refetch or update currentCrew with responseData.crew if it includes full objects
      if(responseData.crew) setCurrentCrew(responseData.crew);

    } catch (error: any) {
      console.error("Error saving crew assignments:", error);
      const message = error.type === 'validation' ? error.messages : (error.message || 'An unexpected error occurred.');
      setFeedback({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  const staffOptions: SelectOption[] = allStaff.map(s => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name} (${s.staff_type})`,
  }));

  const crewColumns: ColumnDefinition<DepartureCrewMember>[] = [
    { header: 'Name', accessor: (row) => `${row.staff_member?.first_name || ''} ${row.staff_member?.last_name || ''}` },
    { header: 'Staff Type', accessor: (row) => row.staff_member?.staff_type || 'N/A' },
    { header: 'Assigned Role', accessor: 'assigned_role_in_departure' },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button onClick={() => handleRemoveCrewMember(row.staff_member_id, row.assigned_role_in_departure)} style={{ background: 'orange', color: 'white' }} size="small">
          Remove
        </Button>
      ),
    },
  ];


  if (loading) return <p>Loading departure and staff data...</p>;
  if (notFound) return (
    <>
      <PageHeader title="Manage Departure Crew" />
      <p>Departure not found.</p>
      <Link href="/dashboard/operations/departures" passHref><Button>Back to Departures List</Button></Link>
    </>
  );
   if (feedback?.type === 'error' && !departureInfo && !loading) {
    return (
      <>
        <PageHeader title="Manage Departure Crew" />
        <p style={{ color: 'red' }}>{ typeof feedback.message === 'string' ? feedback.message : feedback.message.join(', ')}</p>
        <Link href="/dashboard/operations/departures" passHref><Button>Back to Departures List</Button></Link>
      </>
    );
  }
  if (!departureInfo) return <p>Departure data could not be loaded.</p>;

  const pageTitleText = `Manage Crew for Departure: ${departureInfo.schedule?.route?.name || departureInfo.schedule_id} on ${departureInfo.departure_date}`;

  return (
    <>
      <PageHeader title={pageTitleText} />
      {feedback && (
        <div style={{
          padding: '10px', marginBottom: '15px', borderRadius: '4px',
          border: `1px solid ${feedback.type === 'success' ? 'green' : 'red'}`,
          background: feedback.type === 'success' ? '#e6fffa' : '#ffebeb',
          color: feedback.type === 'success' ? 'green' : 'red',
        }}>
          {typeof feedback.message === 'string' ? feedback.message : (
             feedback.message.map((msg, idx) => <p key={idx}>{typeof msg === 'object' ? msg.message : msg}</p>)
          )}
        </div>
      )}

      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px' }}>
        <h3>Add Crew Member</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <Select label="Select Staff Member" name="selectedStaffId" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} options={[{value: '', label: 'Select Staff'}, ...staffOptions]} />
          <Input label="Assigned Role in Departure" name="assignedRole" value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)} placeholder="e.g., DRIVER_MAIN, HOSTESS" />
          <Button onClick={handleAddCrewMember} disabled={isSaving}>Add to Crew</Button>
        </div>
      </div>

      <h3>Current Crew ({currentCrew.length})</h3>
      {currentCrew.length > 0 ? (
        <DataTable data={currentCrew} columns={crewColumns} />
      ) : (
        <p>No crew members assigned yet.</p>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Button onClick={handleSaveCrewAssignments} disabled={isSaving || currentCrew.length === 0}>
          {isSaving ? 'Saving Crew...' : 'Save Crew Assignments'}
        </Button>
        <Button onClick={() => router.push(`/dashboard/operations/departures/${departureId}/edit`)} variant="outline" disabled={isSaving}>
          Back to Edit Departure
        </Button>
         <Button onClick={() => router.push('/dashboard/operations/departures')} variant="outline" disabled={isSaving}>
          Back to Departures List
        </Button>
      </div>
    </>
  );
}
