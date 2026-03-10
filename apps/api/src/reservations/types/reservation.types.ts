import { Prisma } from '@prisma/client';

/**
 * Plain reservation record (no relations included)
 */
export type ReservationRecord = Prisma.ReservationGetPayload<object>;

/**
 * Reservation with parkingSpace -> parkingLocation -> images included
 */
export type ReservationWithSpaceAndLocation = Prisma.ReservationGetPayload<{
  include: {
    parkingSpace: {
      include: {
        parkingLocation: {
          include: {
            images: true;
          };
        };
      };
    };
    driver: {
      include: {
        user: {
          select: {
            firstName: true;
            lastName: true;
          };
        };
      };
    };
  };
}>;

/**
 * Reservation with parkingSpace -> parkingLocation and primary image
 */
export type ReservationWithPrimaryImage = Prisma.ReservationGetPayload<{
  include: {
    parkingSpace: {
      include: {
        parkingLocation: {
          include: {
            images: true;
          };
        };
      };
    };
  };
}>;

/**
 * Reservation with driver details and vehicles (for host views)
 */
export type ReservationWithDriverDetails = Prisma.ReservationGetPayload<{
  include: {
    parkingSpace: {
      include: {
        parkingLocation: true;
      };
    };
    driver: {
      include: {
        user: {
          select: {
            firstName: true;
            lastName: true;
            phoneNumber: true;
          };
        };
        vehicles: true;
      };
    };
  };
}>;

/**
 * Reservation with wallet transaction (for cancellation)
 */
export type ReservationWithTransaction = Prisma.ReservationGetPayload<{
  include: {
    walletTransaction: true;
  };
}>;
