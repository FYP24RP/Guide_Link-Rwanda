import React, { useState, useEffect } from 'react';

// =========================================================================
// FIREBASE CONFIGURATION (Existing Project & Collections Intact)
// =========================================================================
const FIREBASE_PROJECT_ID = 'guidelink-rwanda';
const FIREBASE_API_KEY = 'AIzaSyDbSIDCFXNgPKifhV126frr-bl0tytXEA';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    Object.keys(val).forEach((k) => {
      fields[k] = toFirestoreValue(val[k]);
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
};

const fromFirestoreValue = (obj) => {
  if (!obj) return null;
  if ('stringValue' in obj) return obj.stringValue;
  if ('integerValue' in obj) return Number(obj.integerValue);
  if ('doubleValue' in obj) return Number(obj.doubleValue);
  if ('booleanValue' in obj) return obj.booleanValue;
  if ('nullValue' in obj) return null;
  if ('arrayValue' in obj) {
    return (obj.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in obj) {
    const res = {};
    const fields = obj.mapValue.fields || {};
    Object.keys(fields).forEach((k) => {
      res[k] = fromFirestoreValue(fields[k]);
    });
    return res;
  }
  return null;
};

const parseFirestoreDoc = (doc) => {
  const parts = doc.name.split('/');
  const id = parts[parts.length - 1];
  const data = {};
  if (doc.fields) {
    Object.keys(doc.fields).forEach((k) => {
      data[k] = fromFirestoreValue(doc.fields[k]);
    });
  }
  return { id, ...data };
};

const firestoreGetCollection = async (collectionName) => {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/${collectionName}?key=${FIREBASE_API_KEY}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map(parseFirestoreDoc);
  } catch (e) {
    return [];
  }
};

const firestoreSaveDoc = async (collectionName, docId, dataObj) => {
  try {
    const fields = {};
    Object.keys(dataObj).forEach((k) => {
      fields[k] = toFirestoreValue(dataObj[k]);
    });
    const maskParams = Object.keys(dataObj)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');
    const url = `${FIRESTORE_BASE}/${collectionName}/${encodeURIComponent(docId)}?${maskParams}&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

const firestoreDeleteDoc = async (collectionName, docId) => {
  try {
    const url = `${FIRESTORE_BASE}/${collectionName}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    return false;
  }
};

// =========================================================================
// OPEN BOOKING & JOB ASSIGNMENT MARKETPLACE (Isolated `openBookings` Node)
// =========================================================================
function BookingMarketplace({ currentUser, currentRole }) {
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('open'); // 'open' | 'my_bookings' | 'granted' | 'taken'
  const [loading, setLoading] = useState(false);

  const [guestId] = useState(() => {
    let id = localStorage.getItem('gl_guest_owner_id');
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('gl_guest_owner_id', id);
    }
    return id;
  });

  const normalize = (s) => (s || '').replace(/\s+/g, '').toLowerCase();
  const activeUserId = normalize(currentUser?.contact || currentUser?.id || currentUser?.name) || guestId;
  const activeUserName = currentUser?.name || 'Member / Traveler';
  const activeUserRole = (currentRole || currentUser?.role || 'traveler').toLowerCase();

  // Tour Companies, Travel Agencies, and Graduates/Guides can apply for bookings
  const isProvider = ['graduate', 'agency', 'tour_company'].includes(activeUserRole);

  const [formData, setFormData] = useState({
    title: '',
    destination: 'Kigali City',
    startDate: '',
    durationDays: 1,
    groupSize: 2,
    budgetRwf: '',
    targetRole: 'Any (Tour Company, Agency, or Graduate)',
    notes: '',
    ownerName: currentUser?.name || '',
    ownerPhone: currentUser?.contact || ''
  });

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        ownerName: prev.ownerName || currentUser.name || '',
        ownerPhone: prev.ownerPhone || currentUser.contact || ''
      }));
    }
  }, [currentUser]);

  const fetchOpenBookings = async () => {
    const docs = await firestoreGetCollection('openBookings');
    if (docs.length > 0) {
      const sorted = [...docs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBookings(sorted);
    }
  };

  useEffect(() => {
    fetchOpenBookings();
    const timer = setInterval(fetchOpenBookings, 5000);
    return () => clearInterval(timer);
  }, []);

  // Everyone is allowed to submit a booking request
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setLoading(true);
    const newId = `bk-${Date.now()}`;
    const newBooking = {
      id: newId,
      title: formData.title.trim(),
      destination: formData.destination,
      startDate: formData.startDate || 'Flexible Date',
      durationDays: Number(formData.durationDays) || 1,
      groupSize: Number(formData.groupSize) || 1,
      budgetRwf: formData.budgetRwf.trim() || 'Negotiable',
      targetRole: formData.targetRole,
      notes: formData.notes.trim(),
      ownerId: activeUserId,
      ownerName: formData.ownerName.trim() || activeUserName,
      ownerPhone: formData.ownerPhone.trim(),
      status: 'open', // 'open' | 'taken'
      applicants: [],
      approvedProvider: null,
      createdAt: Date.now()
    };

    setBookings([newBooking, ...bookings]);
    await firestoreSaveDoc('openBookings', newId, newBooking);

    setFormData({
      ...formData,
      title: '',
      startDate: '',
      budgetRwf: '',
      notes: ''
    });
    setShowForm(false);
    setFilter('open');
    setLoading(false);
    alert('✓ Booking request published live!');
  };

  // Tour Company, Agency, or Graduate requests to take the open booking
  const handleApplyForBooking = async (booking) => {
    if (booking.status !== 'open') return;
    const roleLabel =
      activeUserRole === 'graduate'
        ? 'Tourism Graduate / Guide'
        : activeUserRole === 'agency'
        ? 'Travel Agency'
        : 'Tour Company';

    const newApplicant = {
      providerId: activeUserId,
      providerName: activeUserName,
      providerRole: roleLabel,
      providerPhone: currentUser?.contact || '',
      appliedAt: new Date().toISOString()
    };

    const updatedApplicants = [...(booking.applicants || []), newApplicant];
    setBookings(
      bookings.map((b) =>
        b.id === booking.id ? { ...b, applicants: updatedApplicants } : b
      )
    );
    await firestoreSaveDoc('openBookings', booking.id, { applicants: updatedApplicants });
    alert('✓ Request sent! Waiting for booking owner approval.');
  };

  // Booking Owner approves one provider -> marks booking 'taken' & dismisses from open list
  const handleApproveProvider = async (booking, applicant) => {
    const ok = window.confirm(
      `Approve ${applicant.providerName} (${applicant.providerRole}) for "${booking.title}"? Once approved, this booking will be marked TAKEN and dismissed for everyone else.`
    );
    if (!ok) return;

    const approvedData = {
      ...applicant,
      approvedAt: new Date().toISOString()
    };

    setBookings(
      bookings.map((b) =>
        b.id === booking.id
          ? { ...b, status: 'taken', approvedProvider: approvedData }
          : b
      )
    );
    await firestoreSaveDoc('openBookings', booking.id, {
      status: 'taken',
      approvedProvider: approvedData
    });
    alert(`✓ ${applicant.providerName} is now granted for this job! Booking is locked and dismissed from open requests.`);
  };

  const grantedCount = bookings.filter(
    (b) => b.approvedProvider?.providerId === activeUserId
  ).length;

  const filteredBookings = bookings.filter((b) => {
    const isOwner = b.ownerId === activeUserId;
    const isGrantedToMe = b.approvedProvider?.providerId === activeUserId;
    if (filter === 'open') return b.status === 'open';
    if (filter === 'my_bookings') return isOwner;
    if (filter === 'granted') return isGrantedToMe;
    if (filter === 'taken') return b.status === 'taken';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-[#234E40] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
            Open Access Booking Board
          </span>
          <h3 className="font-bold text-base md:text-xl pt-1">
            📅 Live Bookings & Job Assignments
          </h3>
          <p className="text-xs md:text-sm text-emerald-100">
            Everyone can submit a booking request. Once approved by the booking owner, the chosen Tour Company, Agency, or Graduate sees they are granted for the job, and the booking is dismissed as taken for others.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs md:text-sm rounded-xl shadow shrink-0 transition"
        >
          {showForm ? '✕ Close Form' : '+ Submit New Booking'}
        </button>
      </div>

      {/* Submit Booking Form (Open to Everyone) */}
      {showForm && (
        <form
          onSubmit={handleCreateBooking}
          className="bg-white p-6 rounded-2xl border-2 border-[#3B6E5B] shadow-sm space-y-4 text-xs"
        >
          <h4 className="font-bold text-sm text-[#234E40] border-b pb-2">
            📝 Submit a New Booking Request (Open to All Users)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700">Trip / Booking Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. 3-Day Nyungwe & Lake Kivu Tour"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Destination *</label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl bg-white"
              >
                <option value="Kigali City">Kigali City</option>
                <option value="Musanze / Volcanoes NP">Musanze / Volcanoes National Park</option>
                <option value="Nyungwe / Kitabi">Nyungwe National Park / Kitabi</option>
                <option value="Akagera National Park">Akagera National Park</option>
                <option value="Lake Kivu (Rubavu / Rusizi)">Lake Kivu (Rubavu / Rusizi)</option>
                <option value="Multi-Destination Rwanda">Multi-Destination Rwanda</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700">Preferred Provider</label>
              <select
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
              >
                <option value="Any (Tour Company, Agency, or Graduate)">Any (Tour Company, Agency, or Graduate)</option>
                <option value="Tour Company">Tour Company</option>
                <option value="Travel Agency">Travel Agency</option>
                <option value="Tourism Graduate / Guide">Tourism Graduate / Guide</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700">Travel Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700">Days</label>
                <input
                  type="number"
                  min="1"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Travelers</label>
                <input
                  type="number"
                  min="1"
                  value={formData.groupSize}
                  onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700">Budget (RWF / USD)</label>
              <input
                type="text"
                placeholder="e.g. 150,000 RWF or Negotiable"
                value={formData.budgetRwf}
                onChange={(e) => setFormData({ ...formData, budgetRwf: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Your Name / Organization *</label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Your Contact Phone / WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="+25078XXXXXXX"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Trip Requirements & Notes</label>
              <input
                type="text"
                placeholder="Languages, vehicle, or itinerary notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-slate-100 rounded-xl font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold shadow"
            >
              {loading ? 'Publishing...' : 'Publish Booking Request →'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1.5 rounded-2xl border text-[11px] md:text-xs font-bold text-center shadow-sm">
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'open' ? 'bg-[#234E40] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🟢 Open Bookings ({bookings.filter((b) => b.status === 'open').length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('my_bookings')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'my_bookings' ? 'bg-[#234E40] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📋 My Submitted ({bookings.filter((b) => b.ownerId === activeUserId).length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('granted')}
          className={`py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
            filter === 'granted'
              ? 'bg-emerald-700 text-white'
              : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <span>🎉 Granted to Me</span>
          {grantedCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white rounded-full">
              {grantedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter('taken')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'taken' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔒 Taken / Dismissed ({bookings.filter((b) => b.status === 'taken').length})
        </button>
      </div>

      {/* Bookings Cards Grid */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-500">
          No bookings in this view right now. Click <strong>&quot;+ Submit New Booking&quot;</strong> to post one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => {
            const isOwner = booking.ownerId === activeUserId;
            const isTaken = booking.status === 'taken';
            const isGrantedToMe = booking.approvedProvider?.providerId === activeUserId;
            const alreadyApplied = (booking.applicants || []).some(
              (a) => a.providerId === activeUserId
            );

            return (
              <div
                key={booking.id}
                className={`p-5 rounded-2xl border shadow-sm text-xs flex flex-col justify-between space-y-3 ${
                  isGrantedToMe
                    ? 'bg-emerald-50 border-emerald-500 border-2'
                    : isTaken
                    ? 'bg-slate-50 border-slate-200 opacity-90'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#3B6E5B] bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      📍 {booking.destination}
                    </span>

                    {isGrantedToMe ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                        ✓ Granted for Job
                      </span>
                    ) : isTaken ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        🔒 Taken & Dismissed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        ● Open
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900">{booking.title}</h4>
                  <p className="text-[11px] text-slate-500">
                    Posted by <strong>{booking.ownerName}</strong> • For: {booking.targetRole}
                  </p>

                  <div className="bg-slate-100 p-2.5 rounded-xl grid grid-cols-3 gap-1 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Date</span>
                      <span className="font-bold text-slate-800">{booking.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Trip</span>
                      <span className="font-bold text-slate-800">
                        {booking.durationDays}d • {booking.groupSize} pax
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Budget</span>
                      <span className="font-bold text-[#234E40]">{booking.budgetRwf}</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="text-slate-600 italic">&quot;{booking.notes}&quot;</p>
                  )}
                </div>

                {/* Action Footer */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  {/* 1. Granted Provider View */}
                  {isGrantedToMe && (
                    <div className="bg-[#234E40] text-white p-3 rounded-xl space-y-1">
                      <p className="font-bold">
                        🎉 You have been approved &amp; granted for this job!
                      </p>
                      <p className="text-[11px] text-emerald-100">
                        Owner: <strong>{booking.ownerName}</strong> • Phone:{' '}
                        <strong>{booking.ownerPhone}</strong>
                      </p>
                    </div>
                  )}

                  {/* 2. Taken Notification for Other Users */}
                  {isTaken && !isGrantedToMe && !isOwner && (
                    <div className="
