"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CheckCircle, MapPin, Home, Car, FileCheck } from "lucide-react";

export default function ListingsPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Listing Details - Pending Approval: Juan's Driveway Space
        </h1>
        <button className="text-sm text-gray-600 hover:text-gray-900">
          Listing Details View
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Host Information */}
          <Card>
            <CardHeader>
              <CardTitle>Host Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    Juan dela Cruz
                  </h3>
                  <p className="text-sm text-gray-600">(810) 356-7872</p>
                  <p className="text-sm text-gray-600">juan.cruz@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  Verification Status:
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Address
                  </p>
                  <p className="text-sm text-gray-900">
                    3 STiram st, Pandaiang City, Davao City
                  </p>
                </div>

                {/* Map Placeholder */}
                <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                    <p className="text-sm text-gray-600">Map View</p>
                    <p className="text-xs text-gray-500">Davao</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Capacity
                  </p>
                  <p className="text-sm text-gray-900">1 Vehicle (Light)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Proof */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Property Proof</CardTitle>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Gallery
              </button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* Image 1 */}
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                  <Home className="w-12 h-12 text-gray-500" />
                </div>
                {/* Image 2 */}
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                  <Car className="w-12 h-12 text-gray-500" />
                </div>
                {/* Image 3 - Document */}
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-300">
                  <FileCheck className="w-12 h-12 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision Action */}
          <Card>
            <CardHeader>
              <CardTitle>Decision Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter reason for rejection..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold">
                    Approve Listing
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full h-12 text-base font-semibold"
                  >
                    Reject Listing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
