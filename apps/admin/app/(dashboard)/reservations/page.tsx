"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReservationsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reservations</h1>
        <p className="text-gray-600 mt-1">
          Track and manage parking reservations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservation Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Reservation management features coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
