'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, Button } from '@samatransport/ui';

// Re-using Passenger interface for type safety, ensure it matches the structure
interface Passenger {
  seatNumber: string;
  fullName: string;
  age: string;
  gender: string;
}

const PaymentPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract data from query parameters
  const departureId = searchParams.get('departureId');
  const scheduleId = searchParams.get('scheduleId');
  const vehicleId = searchParams.get('vehicleId');
  const departurePoint = searchParams.get('dp');
  const arrivalPoint = searchParams.get('ap');
  const travelDate = searchParams.get('date');
  const departureTime = searchParams.get('dt');
  const arrivalTime = searchParams.get('at');
  const pricePerSeat = parseFloat(searchParams.get('price') || '0');
  const selectedSeatIdentifiers = useMemo(() => (searchParams.get('seats') || '').split(',').filter(s => s), [searchParams]);
  const numSeats = parseInt(searchParams.get('numSeats') || '0', 10);
  const totalPrice = parseFloat(searchParams.get('totalPrice') || '0');

  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const passengers: Passenger[] = useMemo(() => {
    const passengersString = searchParams.get('passengers');
    try {
      return passengersString ? JSON.parse(passengersString) : [];
    } catch (e) {
      console.error("Failed to parse passengers JSON:", e);
      setBookingError("Error reading passenger data. Please go back and try again.");
      return [];
    }
  }, [searchParams]);

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    setBookingError(null);

    // Prepare payload for the Supabase function
    // Passenger details need to map seatNumber to seatIdentifier for the backend
    const passengerPayload = passengers.map(p => ({
      fullName: p.fullName,
      age: p.age ? parseInt(p.age, 10) : null,
      gender: p.gender || null,
      seatIdentifier: p.seatNumber, // frontend 'seatNumber' is backend 'seatIdentifier'
    }));

    const bookingDetails = {
      departureId,
      scheduleId, // Ensure scheduleId is correctly passed and available
      vehicleId,
      totalAmount: totalPrice,
      paymentStatus: 'paid', // Assuming payment is successful for simulation
      bookingStatus: 'confirmed',
      passengerDetails: passengerPayload,
      selectedSeats: selectedSeatIdentifiers,
      // userId: null, // TODO: Get actual user ID from Supabase auth if available
    };

    if (!scheduleId) {
        setBookingError("Schedule information is missing. Cannot proceed.");
        setIsBooking(false);
        return;
    }

    try {
      const { data: result, error: funcError } = await supabaseJsClient.functions.invoke(
        'create-booking-final',
        { body: bookingDetails }
      );

      if (funcError) throw new Error(`Network or function invocation error: ${funcError.message}`);
      if (result.error) throw new Error(result.error); // Error from within the function logic

      // Successful booking
      setIsBooking(false);
      const queryParams = new URLSearchParams({
        // Carry over essential display info
        dp: departurePoint || '',
        ap: arrivalPoint || '',
        date: travelDate || '',
        dt: departureTime || '',
        at: arrivalTime || '',
        seats: selectedSeatIdentifiers.join(','),
        totalPrice: totalPrice.toFixed(2),
        passengers: JSON.stringify(passengers), // Keep original passenger structure for confirmation display
        bookingId: result.bookingId, // Add the real booking ID
      }).toString();
      router.push(`/dashboard/bookings/new/confirmation?${queryParams}`);

    } catch (err: any) {
      setIsBooking(false);
      console.error('Booking failed:', err);
      setBookingError(err.message || 'Failed to create booking. Seats might no longer be available or an unexpected error occurred. Please try again.');
    }
  };

  const handleBack = () => {
    if (isBooking) return;
    router.push(`/dashboard/bookings/new/passenger-details?${searchParams.toString()}`);
  };

  if (!departureId || passengers.length === 0 && !bookingError) {
     return (
        <div className="container mx-auto p-4">
            <PageHeader title="Error" />
            <p className="text-red-500">Booking information is incomplete. Please start over.</p>
            <Button onClick={() => router.push('/dashboard/bookings/new/select-route')} variant="outline">
              Start Over
            </Button>
        </div>
     );
  }

  return (
    <>
      <PageHeader title="New Booking - Step 4: Payment" />
      <div className="container mx-auto p-4 max-w-3xl">
        {/* Booking Summary */}
        <div className="mb-6 p-6 border rounded-lg shadow-lg bg-white">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">Booking Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p><strong>Route:</strong> {departurePoint} to {arrivalPoint}</p>
              <p><strong>Date:</strong> {travelDate}</p>
              <p><strong>Time:</strong> {departureTime} - {arrivalTime}</p>
            </div>
            <div>
              <p><strong>Selected Seats:</strong> {selectedSeatIdentifiers.join(', ')}</p>
              <p><strong>Number of Passengers:</strong> {numSeats}</p>
              <p className="text-lg font-bold"><strong>Total Price:</strong> ${totalPrice.toFixed(2)}</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3 mt-6 text-gray-700">Passenger Details</h3>
          <ul className="space-y-2">
            {passengers.map((p, index) => (
              <li key={index} className="p-3 bg-gray-50 rounded-md text-sm">
                <strong>Seat {p.seatNumber}:</strong> {p.fullName}
                {p.age && `, Age: ${p.age}`}
                {p.gender && `, Gender: ${p.gender}`}
              </li>
            ))}
          </ul>
        </div>

        {/* Payment Placeholder */}
        <div className="my-8 p-6 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 text-center">
          <h2 className="text-xl font-bold text-blue-700 mb-2">Payment Gateway Integration</h2>
          <p className="text-blue-600">This section will house the actual payment processing steps.</p>
          <p className="text-blue-600 font-semibold mt-2">-- Coming Soon --</p>
        </div>

        {bookingError && (
          <div className="my-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
            <p><strong>Booking Error:</strong> {bookingError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <Button onClick={handleBack} variant="outline" disabled={isBooking}>
            Back to Passenger Details
          </Button>
          <Button onClick={handleConfirmBooking} disabled={isBooking || !!bookingError}>
            {isBooking ? 'Processing Booking...' : 'Confirm Booking (Simulate Payment)'}
          </Button>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;
