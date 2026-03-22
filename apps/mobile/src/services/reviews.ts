import api from "./api";

export interface Review {
  id: string;
  reservationId: string;
  reviewerId: string;
  reviewType: "DRIVER_TO_LOCATION" | "HOST_TO_DRIVER";
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
  };
}

export interface LocationRating {
  averageRating: number | null;
  totalReviews: number;
}

export async function createDriverReview(
  reservationId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const { data } = await api.post("/reviews/driver", {
    reservationId,
    rating,
    comment,
  });
  return data;
}

export async function createHostReview(
  reservationId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const { data } = await api.post("/reviews/host", {
    reservationId,
    rating,
    comment,
  });
  return data;
}

export async function getLocationReviews(
  locationId: string,
): Promise<Review[]> {
  const { data } = await api.get(`/reviews/location/${locationId}`);
  return data;
}

export async function getLocationRating(
  locationId: string,
): Promise<LocationRating> {
  const { data } = await api.get(`/reviews/location/${locationId}/rating`);
  return data;
}

export async function getReservationReviews(
  reservationId: string,
): Promise<Review[]> {
  const { data } = await api.get(`/reviews/reservation/${reservationId}`);
  return data;
}
