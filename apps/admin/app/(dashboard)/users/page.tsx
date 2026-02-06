"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600 mt-1">
          Manage drivers and hosts in your platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">User management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}