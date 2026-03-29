"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Star,
  Trash2,
  Loader2,
  AlertCircle,
  MessageSquare,
  MapPin,
  Car,
} from "lucide-react";
import api from "../../../src/lib/api";
import Image from "next/image";

// --- Types ---
interface ReviewReviewer {
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
  email: string;
}

interface ReviewLocation {
  title: string;
  address: string;
}

interface ReviewReservation {
  parkingSpace: {
    name: string | null;
    slotNumber: number;
    parkingLocation: ReviewLocation;
  };
  driver: {
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  } | null;
}

interface Review {
  id: string;
  reviewType: "DRIVER_TO_LOCATION" | "HOST_TO_DRIVER";
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: ReviewReviewer;
  reservation: ReviewReservation;
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
}

// --- Helpers ---
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-gray-700">{rating}</span>
    </div>
  );
}

function ReviewerCell({ reviewer }: { reviewer: ReviewReviewer }) {
  const name = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ") || "Unknown";
  return (
    <div className="flex items-center gap-3">
      {reviewer.profilePicture ? (
        <Image
          src={reviewer.profilePicture}
          alt={name}
          width={32}
          height={32}
          className="rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-semibold shrink-0">
          {name.charAt(0)}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-400">{reviewer.email}</p>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "DRIVER_TO_LOCATION" | "HOST_TO_DRIVER">("");
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 10;

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (typeFilter) params.append("type", typeFilter);
      if (search) params.append("search", search);

      const res = await api.get<ReviewsResponse>(`/reviews/admin/all?${params.toString()}`);
      setReviews(res.data.reviews);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async () => {
    if (!reviewToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/reviews/admin/${reviewToDelete.id}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setReviewToDelete(null);
    } catch {
      alert("Failed to delete review.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const locationReviewCount = reviews.filter((r) => r.reviewType === "DRIVER_TO_LOCATION").length;
  const driverReviewCount = reviews.filter((r) => r.reviewType === "HOST_TO_DRIVER").length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reviews & Ratings</h1>
        <p className="text-gray-500 text-sm mt-1">View and moderate all reviews submitted by drivers and hosts.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <MessageSquare size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total (this page)</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : total.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <MapPin size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Location Reviews</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : locationReviewCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
            <Car size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Driver Reviews</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : driverReviewCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
            <Star size={22} className="text-yellow-500 fill-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Avg Rating (this page)</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : avgRating}</p>
          </div>
        </div>
      </div>

      {/* Table container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="relative w-full sm:w-[380px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reviewer, comment, location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-gray-50 pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#005f56] focus:border-transparent outline-none text-sm text-gray-700"
            />
          </form>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1); }}
            className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="DRIVER_TO_LOCATION">Location Reviews (by Driver)</option>
            <option value="HOST_TO_DRIVER">Driver Reviews (by Host)</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Reviewer</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Comment</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading reviews...
                    </div>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const locationTitle = review.reservation.parkingSpace.parkingLocation.title;
                  const driverName = review.reservation.driver
                    ? [review.reservation.driver.user.firstName, review.reservation.driver.user.lastName]
                        .filter(Boolean).join(" ") || review.reservation.driver.user.email
                    : "—";
                  const isLocationReview = review.reviewType === "DRIVER_TO_LOCATION";

                  return (
                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Reviewer */}
                      <td className="px-6 py-4">
                        <ReviewerCell reviewer={review.reviewer} />
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4">
                        <StarRating rating={review.rating} />
                      </td>

                      {/* Comment */}
                      <td className="px-6 py-4 max-w-[240px]">
                        {review.comment ? (
                          <p className="text-gray-700 text-sm line-clamp-2" title={review.comment}>
                            {review.comment}
                          </p>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No comment</span>
                        )}
                      </td>

                      {/* Type badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isLocationReview
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {isLocationReview ? <MapPin size={11} /> : <Car size={11} />}
                          {isLocationReview ? "Location" : "Driver"}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="px-6 py-4">
                        {isLocationReview ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{locationTitle}</p>
                            <p className="text-xs text-gray-400">
                              {review.reservation.parkingSpace.name || `Slot ${review.reservation.parkingSpace.slotNumber}`}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{driverName}</p>
                            <p className="text-xs text-gray-400">{locationTitle}</p>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(review.createdAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Delete */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setReviewToDelete(review)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
          <span>
            {total === 0
              ? "No reviews"
              : `Showing ${((page - 1) * limit) + 1}–${Math.min(page * limit, total)} of ${total.toLocaleString()} reviews`}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={page * limit >= total || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Review</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            {/* Preview of the review being deleted */}
            <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {[reviewToDelete.reviewer.firstName, reviewToDelete.reviewer.lastName].filter(Boolean).join(" ") || reviewToDelete.reviewer.email}
                </span>
                <StarRating rating={reviewToDelete.rating} />
              </div>
              {reviewToDelete.comment && (
                <p className="text-sm text-gray-600 line-clamp-2">{reviewToDelete.comment}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReviewToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
