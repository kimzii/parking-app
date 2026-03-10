import api from "./api";

export interface CalculateFeeRequest {
  parkingSpaceId: string;
  startTime: string;
  endTime: string;
}

export interface CalculateFeeResponse {
  parkingSpaceId: string;
  locationTitle: string;
  slotNumber: number;
  startTime: string;
  endTime: string;
  durationHours: number;
  pricePerHour: number;
  totalAmount: number;
}

export interface CreateReservationRequest {
  parkingSpaceId: string;
  startTime: string;
  endTime: string;
  vehicleId?: string;
}

export interface Reservation {
  id: string;
  qrCode: string;
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startTime: string;
  endTime: string;
  actualEntryTime?: string;
  actualExitTime?: string;
  totalAmount: number;
  escrowAmount?: number;
  finalAmount?: number;
  overtimeAmount?: number;
  parkingSpace: {
    id: string;
    slotNumber: number;
    name?: string;
  };
  parkingLocation: {
    id: string;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    image?: string;
    images?: Array<{ id: string; imageUrl: string; isPrimary: boolean }>;
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
    startTime: string;
    endTime: string;
    actualEntryTime?: string;
    actualExitTime?: string;
    totalAmount: number;
    finalAmount?: number;
    overtimeAmount?: number;
  };
  driver?: {
    name: string;
    phone?: string;
    vehicle?: {
      plateNumber?: string;
      brand?: string;
      model?: string;
      color?: string;
    };
  };
  hadOvertime?: boolean;
  overtimeCharge?: number;
}

/**
 * Calculate estimated parking fee
 */
export async function calculateFee(
  data: CalculateFeeRequest,
): Promise<CalculateFeeResponse> {
  const response = await api.post("/reservations/calculate-fee", data);
  return response.data;
}

/**
 * Create a new reservation
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
 * Host: Scan QR code for entry
 */
export async function scanEntry(qrCode: string): Promise<ScanResponse> {
  const response = await api.post("/reservations/scan/entry", { qrCode });
  return response.data;
}

/**
 * Host: Scan QR code for exit
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
): Promise<Reservation[]> {
  const params: Record<string, string> = {};
  if (locationId) params.locationId = locationId;
  if (status) params.status = status;
  const response = await api.get("/reservations/host/reservations", { params });
  return response.data;
}
