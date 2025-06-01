'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader, Button } from '@samatransport/ui';
import { supabaseJsClient } from '../../../../../../supabase'; // Adjust path as needed

// Assuming a Route type like this, fetched from DB
interface RouteLocation {
  id: string; // Or number, depending on your schema
  name: string;
}

// Define a structure for what the routes table might look like to get locations
interface DbRoute {
  id: number; // or string
  departure_location_name: string; // Example column name
  arrival_location_name: string;   // Example column name
  // other route properties like price, etc.
}


const SelectRoutePage = () => {
  const [departurePoint, setDeparturePoint] = useState('');
  const [arrivalPoint, setArrivalPoint] = useState('');
  const [travelDate, setTravelDate] = useState('');

  const [allLocations, setAllLocations] = useState<RouteLocation[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState<string | null>(null);

  // Part 1: Fetch Routes (actually, unique locations from routes)
  useEffect(() => {
    const fetchRouteLocations = async () => {
      setRoutesLoading(true);
      setRoutesError(null);
      try {
        // For simplicity, fetching all routes and extracting unique locations client-side.
        // Assumes 'routes' table has 'departure_location_name' and 'arrival_location_name'.
        // A more optimized way would be a Supabase function `get-distinct-route-locations`.
        const { data, error } = await supabaseJsClient
          .from('routes') // Replace 'routes' with your actual table name
          .select('departure_location_name, arrival_location_name');

        if (error) throw error;

        if (data) {
          const locationNames = new Set<string>();
          data.forEach((route: Partial<DbRoute>) => {
            if (route.departure_location_name) locationNames.add(route.departure_location_name);
            if (route.arrival_location_name) locationNames.add(route.arrival_location_name);
          });
          const uniqueLocations: RouteLocation[] = Array.from(locationNames).map((name, index) => ({
            id: `loc-${index}`, // Temporary ID, ideally locations have their own IDs from a 'locations' table
            name: name,
          }));
          setAllLocations(uniqueLocations);
        }
      } catch (err: any) {
        console.error('Error fetching route locations:', err);
        setRoutesError('Failed to load route locations. Please try again.');
      } finally {
        setRoutesLoading(false);
      }
    };

    fetchRouteLocations();
  }, []);

  const [schedules, setSchedules] = useState<any[]>([]); // Replace 'any' with a proper Schedule type
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | number | null>(null);


  // Part 2: Fetch Schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!departurePoint || !arrivalPoint || !travelDate) {
        setSchedules([]); // Clear previous schedules if inputs are incomplete
        setSelectedScheduleId(null);
        return;
      }

      setSchedulesLoading(true);
      setSchedulesError(null);
      setSelectedScheduleId(null); // Reset selection when parameters change

      try {
        // Assumes departurePoint and arrivalPoint are location names
        const { data, error } = await supabaseJsClient.functions.invoke('get-available-schedules', {
          body: {
            departureLocationName: departurePoint,
            arrivalLocationName: arrivalPoint,
            travelDate: travelDate,
          },
        });

        if (error) throw new Error(error.message); // Supabase function invocation error
        if (data.error) throw new Error(data.error); // Error from within the function logic

        setSchedules(data || []);
      } catch (err: any) {
        console.error('Error fetching schedules:', err);
        setSchedulesError(`Failed to load schedules: ${err.message}`);
        setSchedules([]);
      } finally {
        setSchedulesLoading(false);
      }
    };

    fetchSchedules();
  }, [departurePoint, arrivalPoint, travelDate]);

  // Part 3: Update State and "Next" Button logic
  const handleScheduleSelect = (scheduleId: string | number) => {
    setSelectedScheduleId(scheduleId);
  };

  const canProceed = useMemo(() => {
    return departurePoint && arrivalPoint && travelDate && selectedScheduleId !== null;
  }, [departurePoint, arrivalPoint, travelDate, selectedScheduleId]);

  const availableDeparturePoints = useMemo(() => {
    return allLocations.filter(loc => loc.name !== arrivalPoint);
  }, [allLocations, arrivalPoint]);

  const availableArrivalPoints = useMemo(() => {
    return allLocations.filter(loc => loc.name !== departurePoint);
  }, [allLocations, departurePoint]);

  return (
    <>
      <PageHeader title="New Booking - Step 1: Select Route & Date" />
      <div className="container mx-auto p-4 max-w-2xl">
        {routesLoading && <p>Loading route information...</p>}
        {routesError && <p className="text-red-500">{routesError}</p>}

        {!routesLoading && !routesError && (
          <div className="space-y-6">
            {/* Departure Point Select */}
            <div>
              <label htmlFor="departurePoint" className="block text-sm font-medium text-gray-700 mb-1">
                Departure Point
              </label>
              <select
                id="departurePoint"
                name="departurePoint"
                value={departurePoint}
                onChange={(e) => setDeparturePoint(e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={routesLoading}
              >
                <option value="" disabled>Select departure point</option>
                {availableDeparturePoints.map((location) => (
                  <option key={location.id} value={location.name}> {/* Using name as value for now */}
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Arrival Point Select */}
            <div>
              <label htmlFor="arrivalPoint" className="block text-sm font-medium text-gray-700 mb-1">
                Arrival Point
              </label>
              <select
                id="arrivalPoint"
                name="arrivalPoint"
                value={arrivalPoint}
                onChange={(e) => setArrivalPoint(e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={routesLoading || !departurePoint}
              >
                <option value="" disabled>Select arrival point</option>
                {availableArrivalPoints.map((location) => (
                  <option key={location.id} value={location.name}> {/* Using name as value for now */}
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Travel Date Picker */}
            <div>
              <label htmlFor="travelDate" className="block text-sm font-medium text-gray-700 mb-1">
                Travel Date
              </label>
              <input
                type="date"
                id="travelDate"
                name="travelDate"
                value={travelDate}
                onChange={(e) => {
                  setTravelDate(e.target.value);
                  setSelectedScheduleId(null); // Reset schedule selection when date changes
                }}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={!departurePoint || !arrivalPoint}
              />
            </div>

            {/* Available Schedules Section */}
            <div className="pt-4">
              <h2 className="text-lg font-semibold mb-2">Available Schedules</h2>
              {schedulesLoading && <p>Loading schedules...</p>}
              {schedulesError && <p className="text-red-500">{schedulesError}</p>}
              {!schedulesLoading && !schedulesError && departurePoint && arrivalPoint && travelDate && schedules.length === 0 && (
                <p className="text-gray-500">No schedules available for the selected route and date.</p>
              )}
              {!schedulesLoading && !schedulesError && schedules.length > 0 && (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id} // Assuming schedule.id is unique for the schedule definition
                      onClick={() => handleScheduleSelect(schedule.departure_instance_id || schedule.id)} // Use departure_instance_id if available
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-100 ${selectedScheduleId === (schedule.departure_instance_id || schedule.id) ? 'bg-indigo-100 border-indigo-500' : 'border-gray-300'}`}
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-medium">
                          {schedule.departure_time} - {schedule.arrival_time}
                        </p>
                        <p className="text-sm text-gray-600">
                          {schedule.vehicles?.type} (Seats: {schedule.departures && schedule.departures[0]?.available_seats !== undefined ? schedule.departures[0].available_seats : 'N/A'})
                        </p>
                      </div>
                      <p className="text-sm">Price: ${schedule.price?.toFixed(2) || 'N/A'}</p>
                      {/* Display more schedule details as needed */}
                    </div>
                  ))}
                </div>
              )}
              {/* Fallback placeholder if no inputs are made yet */}
              {!departurePoint && !arrivalPoint && !travelDate && !schedulesLoading && !schedulesError && (
                 <div className="p-4 border border-dashed border-gray-300 rounded-md min-h-[100px] flex items-center justify-center">
                    <p className="text-gray-500">Select route and date to see available schedules.</p>
                 </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  if (!canProceed) return;
                  const selectedScheduleData = schedules.find(s => (s.departure_instance_id || s.id) === selectedScheduleId);
                  if (!selectedScheduleData) {
                    setSchedulesError("Could not find selected schedule details. Please try again.");
                    return;
                  }
                  // The selectedScheduleId from state is the departure_instance_id
                  const departureId = selectedScheduleId;
                  const scheduleDefId = selectedScheduleData.id; // The original schedule definition ID
                  const vehicleId = selectedScheduleData.vehicles?.id;

                  if (!vehicleId) {
                    setSchedulesError("Vehicle information is missing for the selected schedule.");
                    return;
                  }

                  // TODO: router.push(...);
                  // For now, log and prepare for navigation
                  console.log("Navigating to select-seats with:", {
                    departureId,
                    scheduleDefId, // scheduleId for definition
                    vehicleId,
                    // Also pass other relevant info for display like route, date, time
                    departurePoint,
                    arrivalPoint,
                    travelDate,
                    departureTime: selectedScheduleData.departure_time,
                    arrivalTime: selectedScheduleData.arrival_time,
                    pricePerSeat: selectedScheduleData.price
                  });

                  const queryParams = new URLSearchParams({
                    departureId: departureId.toString(),
                    scheduleId: scheduleDefId.toString(),
                    vehicleId: vehicleId.toString(),
                    dp: departurePoint,
                    ap: arrivalPoint,
                    date: travelDate,
                    dt: selectedScheduleData.departure_time,
                    at: selectedScheduleData.arrival_time,
                    price: selectedScheduleData.price.toString()
                  }).toString();

                  router.push(`/dashboard/bookings/new/select-seats?${queryParams}`);
                }}
                disabled={!canProceed || schedulesLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SelectRoutePage;
