import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

/**
 * Open Booking & Job Assignment Marketplace
 * - Uses an isolated `bookings` collection (does NOT touch existing data)
 * - Allows ALL users to submit booking requests
 * - Allows Tour Companies, Agencies, and Graduates to apply
 * - Owner approves one provider -> status becomes "taken", granted provider sees confirmation, others see "Taken / Dismissed"
 */
export default function BookingMarketplace({ db, currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("open"); // "open" | "my_bookings" | "granted" | "taken"
  const [loading, setLoading] = useState(false);

  // New Booking Form State
  const [formData, setFormData] = useState({
    title: "",
    destination: "Kigali",
    startDate: "",
    durationDays: 1,
    groupSize: 2,
    budgetRwf: "",
    targetRole: "Any (Agency, Tour Company, or Graduate)",
    notes: "",
    ownerName: currentUser?.name || currentUser?.displayName || "",
    ownerEmail: currentUser?.email || "",
    ownerPhone: currentUser?.phone || "",
  });

  // Track unique browser/user identity even for guest users
  const [guestId] = useState(() => {
    let id = localStorage.getItem("gl_guest_owner_id");
    if (!id) {
      id = "guest_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("gl_guest_owner_id", id);
    }
    return id;
  });

  const activeUserId = currentUser?.uid || currentUser?.id || guestId;
  const activeUserName =
    currentUser?.name || currentUser?.companyName || currentUser?.displayName || "Traveler / User";
  const activeUserRole = (currentUser?.role || "traveler").toLowerCase();

  // Check if current user is a service provider (Tour Company, Agency, or Graduate/Guide)
  const isProvider = [
    "guide",
    "graduate",
    "agency",
    "travel_agency",
    "tour_company",
    "company",
    "operator",
  ].some((r) => activeUserRole.includes(r));

  // Real-time listener on the isolated `bookings` collection
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setBookings(list);
    });
    return () => unsubscribe();
  }, [db]);

  // Submit a new booking (Available to ALL users)
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "bookings"), {
        title: formData.title.trim(),
        destination: formData.destination,
        startDate: formData.startDate,
        durationDays: Number(formData.durationDays) || 1,
        groupSize: Number(formData.groupSize) || 1,
        budgetRwf: formData.budgetRwf.trim() || "Negotiable",
        targetRole: formData.targetRole,
        notes: formData.notes.trim(),
        ownerId: activeUserId,
        ownerName: formData.ownerName.trim() || activeUserName,
        ownerEmail: formData.ownerEmail.trim(),
        ownerPhone: formData.ownerPhone.trim(),
        status: "open", // "open" | "taken"
        applicants: [], // Array of providers requesting the job
        approvedProvider: null, // { providerId, providerName, providerRole, providerPhone, providerEmail, approvedAt }
        createdAt: serverTimestamp(),
      });

      setFormData({
        ...formData,
        title: "",
        startDate: "",
        budgetRwf: "",
        notes: "",
      });
      setShowForm(false);
      setFilter("open");
    } catch (err) {
      console.error("Error creating booking:", err);
      alert("Could not submit booking. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Provider requests / applies for an open booking
  const handleApplyForBooking = async (booking) => {
    if (!db || booking.status !== "open") return;
    try {
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        applicants: arrayUnion({
          providerId: activeUserId,
          providerName: activeUserName,
          providerRole: currentUser?.role || "Service Provider",
          providerPhone: currentUser?.phone || "",
          providerEmail: currentUser?.email || "",
          appliedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("Error applying for booking:", err);
      alert("Failed to submit request.");
    }
  };

  // Booking Owner approves a provider -> locks booking & dismisses it from open queue
  const handleApproveProvider = async (booking, applicant) => {
    if (!db) return;
    const confirmApprove = window.confirm(
      `Approve ${applicant.providerName} (${applicant.providerRole}) for "${booking.title}"? This will mark the booking as taken for everyone else.`
    );
    if (!confirmApprove) return;

    try {
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        status: "taken",
        approvedProvider: {
          ...applicant,
          approvedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("Error approving provider:", err);
      alert("Could not approve provider.");
    }
  };

  // Filter logic
  const filteredBookings = bookings.filter((b) => {
    const isOwner = b.ownerId === activeUserId;
    const isGrantedToMe = b.approvedProvider?.providerId === activeUserId;

    if (filter === "open") return b.status === "open";
    if (filter === "my_bookings") return isOwner;
    if (filter === "granted") return isGrantedToMe;
    if (filter === "taken") return b.status === "taken";
    return true;
  });

  const grantedCount = bookings.filter(
    (b) => b.approvedProvider?.providerId === activeUserId
  ).length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full mb-2">
            Open B2B & B2C Booking Board
          </span>
          <h2 className="text-2xl font-bold text-slate-900">
            Live Trip Requests & Bookings
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Anyone can submit a booking request. Verified Tour Companies, Travel Agencies, and Graduates can apply—once approved by the owner, the job is locked and dismissed from open listings.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition shrink-0"
        >
          {showForm ? "✕ Close Form" : "+ Submit New Booking"}
        </button>
      </div>

      {/* Submit New Booking Form (Open to Everyone) */}
      {showForm && (
        <form
          onSubmit={handleCreateBooking}
          className="bg-white rounded-2xl shadow-md border border-emerald-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
            Post a New Booking Request
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Trip / Booking Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 3-Day Nyungwe Canopy & Lake Kivu Tour"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Destination Hub *
              </label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="Kigali">Kigali City</option>
                <option value="Musanze / Volcanoes NP">Musanze / Volcanoes National Park</option>
                <option value="Nyungwe / Kitabi">Nyungwe National Park / Kitabi</option>
                <option value="Akagera National Park">Akagera National Park</option>
                <option value="Lake Kivu (Rubavu / Rusizi)">Lake Kivu (Rubavu / Rusizi)</option>
                <option value="Multi-Destination Rwanda">Multi-Destination Rwanda</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Days *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Travelers *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.groupSize}
                  onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preferred Provider Type
              </label>
              <select
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="Any (Agency, Tour Company, or Graduate)">
                  Any (Tour Company, Agency, or Graduate)
                </option>
                <option value="Tour Company">Tour Company</option>
                <option value="Travel Agency">Travel Agency</option>
                <option value="Tourism Graduate / Guide">Tourism Graduate / Guide</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimated Budget (RWF or USD)
              </label>
              <input
                type="text"
                placeholder="e.g., 150,000 RWF or Negotiable"
                value={formData.budgetRwf}
                onChange={(e) => setFormData({ ...formData, budgetRwf: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your Name / Organization *
              </label>
              <input
                type="text"
                required
                placeholder="Full name or agency name"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Phone / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="+250 78X XXX XXX"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Trip Details & Requirements
            </label>
            <textarea
              rows="3"
              placeholder="Specify language requirements (English/French/Kinyarwanda), transport needs, or itinerary expectations..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
            >
              {loading ? "Publishing..." : "Publish Booking Request"}
            </button>
          </div>
        </form>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter("open")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === "open"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Open Bookings ({bookings.filter((b) => b.status === "open").length})
        </button>

        <button
          onClick={() => setFilter("my_bookings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === "my_bookings"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          My Posted Bookings ({bookings.filter((b) => b.ownerId === activeUserId).length})
        </button>

        <button
          onClick={() => setFilter("granted")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
            filter === "granted"
              ? "bg-emerald-700 text-white"
              : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
          }`}
        >
          <span>Granted Jobs</span>
          {grantedCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-emerald-600 text-white rounded-full">
              {grantedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilter("taken")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === "taken"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Taken / Dismissed ({bookings.filter((b) => b.status === "taken").length})
        </button>
      </div>

      {/* Bookings Grid */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          No bookings found in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBookings.map((booking) => {
            const isOwner = booking.ownerId === activeUserId;
            const isTaken = booking.status === "taken";
            const isGrantedToMe = booking.approvedProvider?.providerId === activeUserId;
            const alreadyApplied = booking.applicants?.some(
              (a) => a.providerId === activeUserId
            );

            return (
              <div
                key={booking.id}
                className={`rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between ${
                  isGrantedToMe
                    ? "bg-emerald-50/70 border-emerald-400"
                    : isTaken
                    ? "bg-slate-50 border-slate-200 opacity-90"
                    : "bg-white border-slate-200"
                }`}
              >
                <div>
                  {/* Status Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                      {booking.destination}
                    </span>

                    {isGrantedToMe ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-600 text-white">
                        ✓ You Are Granted for This Job
                      </span>
                    ) : isTaken ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                        🔒 Booking Taken (Dismissed)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        ● Open for Booking
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{booking.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Posted by <span className="font-semibold">{booking.ownerName}</span> • Target:{" "}
                    {booking.targetRole}
                  </p>

                  {/* Key Trip Specs */}
                  <div className="grid grid-cols-3 gap-2 my-4 bg-slate-100/80 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-500 block">Date</span>
                      <span className="font-semibold text-slate-800">{booking.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Duration / Pax</span>
                      <span className="font-semibold text-slate-800">
                        {booking.durationDays}d • {booking.groupSize} pax
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Budget</span>
                      <span className="font-semibold text-emerald-700">{booking.budgetRwf}</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="text-sm text-slate-700 mb-4">{booking.notes}</p>
                  )}
                </div>

                {/* Role-Based Action Footer */}
                <div className="pt-3 border-t border-slate-200">
                  {/* 1. GRANTED PROVIDER VIEW */}
                  {isGrantedToMe && (
                    <div className="bg-emerald-600 text-white rounded-xl p-3 text-sm space-y-1">
                      <p className="font-bold">
                        Congratulations! The booking owner approved you for this job.
                      </p>
                      <p className="text-xs text-emerald-100">
                        Client Contact: <strong>{booking.ownerName}</strong> | Phone:{" "}
                        <strong>{booking.ownerPhone}</strong>
                        {booking.ownerEmail ? ` | Email: ${booking.ownerEmail}` : ""}
                      </p>
                    </div>
                  )}

                  {/* 2. TAKEN NOTICE FOR ALL OTHER USERS */}
                  {isTaken && !isGrantedToMe && !isOwner && (
                    <div className="bg-slate-200/80 text-slate-700 rounded-xl p-3 text-xs font-medium text-center">
                      This booking has already been taken by{" "}
                      <strong>{booking.approvedProvider?.providerName}</strong> and is closed.
                    </div>
                  )}

                  {/* 3. BOOKING OWNER APPROVAL PANEL */}
                  {isOwner && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 uppercase">
                        {isTaken
                          ? `Approved Provider: ${booking.approvedProvider?.providerName}`
                          : `Requests Received (${booking.applicants?.length || 0})`}
                      </p>

                      {!isTaken && (!booking.applicants || booking.applicants.length === 0) && (
                        <p className="text-xs text-slate-500 italic">
                          Waiting for Tour Companies, Agencies, or Graduates to request this booking...
                        </p>
                      )}

                      {!isTaken &&
                        booking.applicants?.map((app, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{app.providerName}</p>
                              <p className="text-slate-500 capitalize">
                                {app.providerRole} {app.providerPhone ? `• ${app.providerPhone}` : ""}
                              </p>
                            </div>
                            <button
                              onClick={() => handleApproveProvider(booking, app)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                            >
                              Approve & Assign
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* 4. OPEN BOOKING ACTION FOR PROVIDERS (TOUR COMPANY / AGENCY / GRADUATE) */}
                  {!isOwner && !isTaken && (
                    <div>
                      {isProvider ? (
                        alreadyApplied ? (
                          <button
                            disabled
                            className="w-full py-2.5 bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl cursor-not-allowed"
                          >
                            ✓ Request Sent — Waiting for Owner Approval
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApplyForBooking(booking)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
                          >
                            Accept / Request This Booking
                          </button>
                        )
                      ) : (
                        <p className="text-xs text-slate-500 text-center">
                          Open for verified Tour Companies, Agencies & Graduates to accept.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
