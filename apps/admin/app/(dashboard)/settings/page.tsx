"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure application settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Settings configuration coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
