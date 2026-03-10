"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Image as ImageIcon,
  User,
  CheckCircle,
  MapPin,
  Home,
  Car,
  FileCheck,
  ArrowLeft
} from "lucide-react";

// --- Types (Aligned with Prisma Schema) ---
type ParkingLocationImage = {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
};

type UserModel = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  profilePicture: string | null;
};

type Host = {
  id: string;
  user: UserModel;
};

type ParkingLocation = {
  id: string;
  title: string;
  address: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalSlots: number; // Added from Prisma Schema for the Capacity field
  host: Host;
  images: ParkingLocationImage[];
};

// --- Mock Data ---
const mockListings: ParkingLocation[] = [
  {
    id: "1",
    title: "Airport Terminal Parking",
    address: "456 Airport Road, Terminal Area, Metro City",
    status: "PENDING",
    totalSlots: 2,
    host: {
      id: "h1",
      user: { firstName: "Maria", lastName: "Host", email: "host@test.com", phoneNumber: "+639987654321", profilePicture: null },
    },
    images: [{ id: "img1", imageUrl: "/placeholder-property.jpg", isPrimary: true }],
  },
  {
    id: "2",
    title: "University Campus Parking",
    address: "789 University Ave, Academic District, Metro City",
    status: "PENDING",
    totalSlots: 5,
    host: {
      id: "h2",
      user: { firstName: "Alex", lastName: "MultiRole", email: "both@test.com", phoneNumber: "+639111222333", profilePicture: null },
    },
    images: [{ id: "img2", imageUrl: "/placeholder-property.jpg", isPrimary: true }],
  },
  {
    id: "3",
    title: "Juan's Driveway Space",
    address: "3 STiram st, Pandaiang City, Davao City",
    status: "PENDING",
    totalSlots: 1,
    host: {
      id: "h3",
      user: { firstName: "Juan", lastName: "dela Cruz", email: "juan.cruz@gmail.com", phoneNumber: "(810) 356-7872", profilePicture: null },
    },
    images: [{ id: "img3", imageUrl: "/placeholder-property.jpg", isPrimary: true }],
  },
  {
    id: "4",
    title: "Pending Downtown Parking",
    address: "123 Mall Drive, Downtown District, Metro City",
    status: "PENDING",
    totalSlots: 10,
    host: {
      id: "h4",
      user: { firstName: "Sarah", lastName: "PendingHost", email: "pending-host@test.com", phoneNumber: "+639777888999", profilePicture: null },
    },
    images: [{ id: "img4", imageUrl: "/placeholder-property.jpg", isPrimary: true }],
  },
  {
    id: "5",
    title: "Secure Subdivision Garage",
    address: "Block 4 Lot 12, Suburbia Village, Metro City",
    status: "PENDING",
    totalSlots: 2,
    host: {
      id: "h5",
      user: { firstName: "Kimzie", lastName: "Torres", email: "kimzie@giver.com", phoneNumber: "+639223334444", profilePicture: null },
    },
    images: [{ id: "img5", imageUrl: "/placeholder-property.jpg", isPrimary: true }],
  },
  {
    id: "6",
    title: "Office Building Basement",
    address: "99 Corporate Center, Business Park, Metro City",
    status: "PENDING",
    totalSlots: 15,
    host: {
      id: "h6",
      user: { firstName: "Bob", lastName: "PendingDriver", email: "pending-driver@test.com", phoneNumber: "+639555444333", profilePicture: null },
    },
    images: [{ id: "img6", imageUrl: "/placeholder-property.jpg", isPrimary: true }],
  }
];

export default function PendingListings() {
  // State to track which listing is currently selected
  const [selectedListing, setSelectedListing] = useState<ParkingLocation | null>(null);

  // --- 1. DETAILED VIEW RENDER ---
  if (selectedListing) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen p-6 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedListing(null)}
              className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition"
              title="Back to Listings"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Listing Details - Pending Approval: {selectedListing.title}
            </h1>
          </div>
          <button
            onClick={() => setSelectedListing(null)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to List View
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Host Information */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Host Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {selectedListing.host.user.firstName} {selectedListing.host.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedListing.host.user.phoneNumber || "No Phone"}</p>
                    <p className="text-sm text-gray-600">{selectedListing.host.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Verification Status:</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Address</p>
                    <p className="text-sm text-gray-900">{selectedListing.address}</p>
                  </div>

                  {/* Map Placeholder */}
                  <div className="w-full h-48 bg-slate-50 rounded-lg flex items-center justify-center border border-gray-200">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Map View</p>
                      <p className="text-xs text-gray-400">Location Data</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Capacity</p>
                    <p className="text-sm text-gray-900">{selectedListing.totalSlots} Vehicle Slot(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Proof */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Property Proof</CardTitle>
                <button className="text-sm text-blue-600 hover:text-blue-800">Gallery</button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                    <Home className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                    <Car className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                    <FileCheck className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decision Action */}
            <Card className="shadow-sm border-gray-100">
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
                    <Button variant="destructive" className="w-full h-12 text-base font-semibold">
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

  // --- 2. MAIN LIST VIEW RENDER ---
  return (
    <div className="bg-[#F8F9FA] min-h-screen p-8 font-sans">
      <h1 className="text-2xl font-bold text-[#1a202c] mb-8">
        Listing Details - Pending Approval
      </h1>

      {/* Listing Cards Wrapper */}
      <div className="flex flex-col gap-4 max-w-5xl">
        {mockListings.map((listing) => (
          <div
            key={listing.id}
            onClick={() => setSelectedListing(listing)} // Triggers the detail view
            className="w-full bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Host Profile Picture */}
            <div className="flex flex-col items-center mr-6">
              <div className="w-14 h-14 bg-slate-50 border border-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            </div>

            {/* Host & Location Details */}
            <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {listing.host.user.firstName} {listing.host.user.lastName}
              </h2>
              <p className="text-sm text-gray-500 truncate max-w-[500px]">
                {listing.address}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="truncate">{listing.host.user.phoneNumber || "No Phone Number"}</span>
                <span className="truncate">{listing.host.user.email}</span>
              </div>
            </div>

            {/* Picture of the Property */}
            <div className="w-[120px] h-[75px] bg-slate-50 rounded-lg flex items-center justify-center flex-col shrink-0 ml-4 border border-gray-100">
               <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
               <span className="text-[10px] text-gray-500 text-center px-2">
                 Property Image
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}