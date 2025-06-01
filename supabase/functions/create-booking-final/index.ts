import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface PassengerDetail {
  seatNumber: string; // This is the seatIdentifier
  fullName: string;
  age?: number | null;
  gender?: string | null;
}

interface BookingPayload {
  departureId: string;
  scheduleId: string;
  vehicleId: string;
  totalAmount: number;
  paymentStatus?: string; // Default 'paid' for simulation
  bookingStatus?: string; // Default 'confirmed'
  passengerDetails: PassengerDetail[];
  selectedSeats: string[]; // Array of seat_identifiers
  userId?: string | null; // Optional: from auth.uid() if user is logged in
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: BookingPayload = await req.json();
    const {
      departureId,
      scheduleId,
      vehicleId,
      totalAmount,
      paymentStatus = 'paid', // Simulate successful payment
      bookingStatus = 'confirmed',
      passengerDetails,
      selectedSeats,
      userId = null, // Can be null if bookings can be made by guests
    } = payload;

    if (!departureId || !scheduleId || !vehicleId || !totalAmount || !passengerDetails || !selectedSeats || selectedSeats.length === 0 || passengerDetails.length !== selectedSeats.length) {
      return new Response(JSON.stringify({ error: 'Missing or invalid booking data.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // --- Transaction Start (Conceptual) ---
    // Ideally, operations below would be in a database transaction.
    // We'll proceed sequentially and attempt cleanup if something critical fails.

    // 1. Re-check seat availability (critical step)
    const { data: existingBookedSeats, error: checkError } = await supabaseAdmin
      .from('booked_seats')
      .select('seat_identifier')
      .eq('departure_id', departureId)
      .eq('vehicle_id', vehicleId)
      .in('seat_identifier', selectedSeats)
      .in('status', ['confirmed', 'reserved']);

    if (checkError) throw new Error(`Seat availability check failed: ${checkError.message}`);
    if (existingBookedSeats && existingBookedSeats.length > 0) {
      const alreadyTaken = existingBookedSeats.map(s => s.seat_identifier).join(', ');
      return new Response(JSON.stringify({ error: `Seats no longer available: ${alreadyTaken}. Please try selecting different seats.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // 2. Insert into `bookings` table
    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        departure_id: departureId,
        schedule_id: scheduleId, // Storing schedule_id for reference
        total_amount: totalAmount,
        payment_status: paymentStatus,
        booking_status: bookingStatus,
        // booked_at is default now()
      })
      .select('id') // Return the id of the new booking
      .single();

    if (bookingError || !bookingData) {
      throw new Error(`Failed to create booking record: ${bookingError?.message || 'No data returned'}`);
    }
    const newBookingId = bookingData.id;

    // 3. Insert passengers and their booked seats
    const passengerInserts = [];
    const bookedSeatInserts = [];

    for (const passenger of passengerDetails) {
      // 3a. Insert into `booking_passengers`
      const { data: newPassenger, error: passengerError } = await supabaseAdmin
        .from('booking_passengers')
        .insert({
          booking_id: newBookingId,
          full_name: passenger.fullName,
          age: passenger.age,
          gender: passenger.gender,
          seat_number: passenger.seatNumber, // seatIdentifier is the seat_number here
        })
        .select('id')
        .single();

      if (passengerError || !newPassenger) {
        // Attempt to clean up: Delete the main booking record
        await supabaseAdmin.from('bookings').delete().eq('id', newBookingId);
        throw new Error(`Failed to insert passenger ${passenger.fullName}: ${passengerError?.message || 'No passenger data returned'}`);
      }

      // 3b. Insert into `booked_seats`
      const { error: seatBookingError } = await supabaseAdmin
        .from('booked_seats')
        .insert({
          booking_id: newBookingId,
          departure_id: departureId,
          vehicle_id: vehicleId,
          seat_identifier: passenger.seatNumber,
          passenger_id: newPassenger.id,
          status: 'confirmed', // Mark seat as confirmed
        });

      if (seatBookingError) {
        // Attempt to clean up: Delete booking, passengers for this booking, and any already booked_seats for this booking.
        // This is complex and highlights the need for true transactions or stored procedures.
        await supabaseAdmin.from('booked_seats').delete().eq('booking_id', newBookingId);
        await supabaseAdmin.from('booking_passengers').delete().eq('booking_id', newBookingId);
        await supabaseAdmin.from('bookings').delete().eq('id', newBookingId);
        throw new Error(`Failed to book seat ${passenger.seatNumber}: ${seatBookingError.message}`);
      }
    }

    // --- Transaction End (Conceptual) ---

    return new Response(JSON.stringify({
        message: 'Booking created successfully!',
        bookingId: newBookingId,
        departureId,
        // Include other details client might need for confirmation page
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    console.error('Error in create-booking-final:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Internal Server Error for most catch-all cases
    });
  }
});
