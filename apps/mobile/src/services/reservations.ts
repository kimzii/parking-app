import api from "./api";

export interface FirstHourFeeResponse {
  parkingSpaceId: string;
  locationTitle: string;
  slotNumber: number;
  slotName?: string;
  description?: string;
  pricePerHour: number;
  firstHourFee: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  is24Hours: boolean;
}

export interface CreateReservationRequest {
  parkingSpaceId: string;
  vehicleId?: string;
}

export interface Reservation {
  id: string;
  qrCode: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED"
    | "EXPIRED";
  arrivalDeadline: string;
  sessionStartedAt?: string | null;
  sessionEndedAt?: string | null;
  totalAmount: number;
  escrowAmount?: number | null;
  finalAmount?: number | null;
  overtimeAmount?: number | null;
  createdAt: string;
  parkingSpace: {
    id: string;
    slotNumber: number;
    name?: string;
    description?: string;
  };
  parkingLocation: {
    id: string;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    image?: string;
    images?: { id: string; imageUrl: string; isPrimary: boolean }[];
    basePricePerHour?: number;
  };
}

export interface CreateReservationResponse extends Reservation {
  message: string;
}

export interface ScanResponse {
  success: boolean;
  message: string;
  reservation: {
    id: string;
    status: string;
    slotNumber?: number;
    slotName?: string;
    sessionStartedAt?: string | null;
    sessionEndedAt?: string | null;
    totalAmount: number;
    finalAmount?: number;
    durationHours?: number;
  };
  driver?: {
    name: string;
    phone?: string | null;
    licenseNumber?: string | null;
    vehicle?: {
      id?: string;
      plateNumber?: string;
      brand?: string;
      model?: string;
      color?: string;
      vehicleType?: string;
    };
  };
  additionalCharge?: number | null;
}

export interface HostReservation extends Reservation {
  driver?: {
    name: string;
    phone?: string | null;
    image?: string | null;
    licenseNumber?: string | null;
    licenseImageUrl?: string | null;
    vehicle?: {
      id?: string;
      plateNumber?: string;
      brand?: string;
      model?: string;
      color?: string;
      vehicleType?: string;
    } | null;
  };
}

/**
 * Get first-hour fee info for a parking space
 */
export async function getFirstHourFee(
  parkingSpaceId: string,
): Promise<FirstHourFeeResponse> {
  const response = await api.get(
    `/reservations/first-hour-fee/${parkingSpaceId}`,
  );
  return response.data;
}

/**
 * Create a new reservation — pays 1st hour, then waits for host approval
 */
export async function createReservation(
  data: CreateReservationRequest,
): Promise<CreateReservationResponse> {
  const response = await api.post("/reservations", data);
  return response.data;
}

/**
 * Get driver's reservations
 */
export async function getMyReservations(
  status?: string,
): Promise<Reservation[]> {
  const params = status ? { status } : {};
  const response = await api.get("/reservations/my-reservations", { params });
  return response.data;
}

/**
 * Get a single reservation by ID
 */
export async function getReservation(id: string): Promise<Reservation> {
  const response = await api.get(`/reservations/${id}`);
  return response.data;
}

/**
 * Cancel a reservation
 */
export async function cancelReservation(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const response = await api.post(`/reservations/${id}/cancel`);
  return response.data;
}

/**
 * Host: Approve a pending reservation
 */
export async function approveReservation(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await api.post(`/reservations/host/${id}/approve`);
  return response.data;
}

/**
 * Host: Reject a pending reservation
 */
export async function rejectReservation(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await api.post(`/reservations/host/${id}/reject`);
  return response.data;
}

/**
 * Host: Scan QR code for entry — starts parking session
 */
export async function scanEntry(qrCode: string): Promise<ScanResponse> {
  const response = await api.post("/reservations/scan/entry", { qrCode });
  return response.data;
}

/**
 * Host: Scan QR code for exit — ends session, calculates payment
 */
export async function scanExit(qrCode: string): Promise<ScanResponse> {
  const response = await api.post("/reservations/scan/exit", { qrCode });
  return response.data;
}

/**
 * Host: Get reservations for my locations
 */
export async function getHostReservations(
  locationId?: string,
  status?: string,
): Promise<HostReservation[]> {
  const params: Record<string, string> = {};
  if (locationId) params.locationId = locationId;
  if (status) params.status = status;
  const response = await api.get("/reservations/host/reservations", { params });
  return response.data;
}
