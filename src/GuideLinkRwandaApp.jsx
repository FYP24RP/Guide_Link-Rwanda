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
// DEFAULT SUBSCRIPTION TIERS CONFIGURATION (Synced with Firebase)
// =========================================================================
const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Starter Monthly',
    badge: 'Monthly',
    durationLabel: '1 Month (30 Days)',
    days: 30,
    price: 15000,
    order: 1
  },
  {
    id: 'three_months',
    name: 'Growth 3-Month',
    badge: '3 Months',
    durationLabel: '3 Months (90 Days)',
    days: 90,
    price: 20000,
    order: 2
  },
  {
    id: 'quarter_6m',
    name: 'Quarter Subscription (6 Months)',
    badge: 'Quarter • 6 Months',
    durationLabel: '6 Months (180 Days)',
    days: 180,
    price: 60000,
    order: 3
  },
  {
    id: 'gold_platinum_year',
    name: 'GOLD-PLATINUM',
    badge: 'GOLD-PLATINUM • 1 Year',
    durationLabel: '1 Year (365 Days)',
    days: 365,
    price: 100000,
    order: 4
  }
];

const DEFAULT_APP_SERVER_CONFIG = {
  appName: 'GuideLink Rwanda',
  tagline: 'Turn your tourism degree into paid work.',
  subtitle: 'Connecting Tourism Graduates, Travel Agencies, Tour Companies, and Travelers across Rwanda.',
  footerLocation: 'Kigali, Rwanda',
  momoCode: '612771',
  primaryColor: '#234E40',
  secondaryColor: '#3B6E5B',
  travelerFreeBadge: 'Travelers: FREE',
  allowNewSignups: true,
  maintenanceMode: false,
  maintenanceMessage: 'Platform maintenance in progress. Please check back shortly.',
  welcomeBannerText: '',
  destinations: [
    'Volcanoes National Park / Musanze',
    'Nyungwe Forest & Lake Kivu (Rusizi / Karongi)',
    'Akagera National Park Safari',
    'Kigali City & Cultural Heritage Tour'
  ],
  announcements: [],
  ads: [],
  customFields: [],
  customSections: [],
  customDashboards: [],
  customFeatures: []
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

  const saveBookingDoc = async (docId, dataObj) => {
    const fields = {};
    Object.keys(dataObj).forEach((k) => {
      fields[k] = toFirestoreValue(dataObj[k]);
    });
    const maskParams = Object.keys(dataObj)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');
    const url = `${FIRESTORE_BASE}/openBookings/${encodeURIComponent(docId)}?${maskParams}&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  };

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
    await saveBookingDoc(newId, newBooking);

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
    await saveBookingDoc(booking.id, { applicants: updatedApplicants });
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
    await saveBookingDoc(booking.id, {
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
            Everyone can submit a booking request. Deal owners can view all applicants and APPROVE WHOM THEY WANT. Once approved, the booking is marked taken and dismissed for others.
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
                    <div className="bg-slate-200 text-slate-700 p-2.5 rounded-xl text-center font-semibold">
                      🔒 This booking has already been taken by{' '}
                      <strong>{booking.approvedProvider?.providerName}</strong> and is dismissed.
                    </div>
                  )}

                  {/* 3. Owner Approval Controls - View all applicants and APPROVE WHOM THEY WANT */}
                  {isOwner && (
                    <div className="space-y-2">
                      <p className="font-bold text-[11px] uppercase text-slate-700">
                        {isTaken
                          ? `✓ Approved: ${booking.approvedProvider?.providerName}`
                          : `All Applicants (${(booking.applicants || []).length}) - Approve Whom You Want:`}
                      </p>

                      {!isTaken && (booking.applicants || []).length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">
                          Waiting for providers to apply...
                        </p>
                      )}

                      {!isTaken &&
                        (booking.applicants || []).map((app, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-slate-50 border p-2 rounded-xl"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{app.providerName}</p>
                              <p className="text-[10px] text-slate-500">
                                {app.providerRole} {app.providerPhone ? `• ${app.providerPhone}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApproveProvider(booking, app)}
                              className="px-3 py-1.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-lg font-bold"
                            >
                              Approve
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* 4. Provider Request Button on Open Bookings */}
                  {!isOwner && !isTaken && (
                    <div>
                      {isProvider ? (
                        alreadyApplied ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 bg-slate-200 text-slate-600 rounded-xl font-bold cursor-not-allowed"
                          >
                            ✓ Request Sent — Awaiting Owner Approval
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyForBooking(booking)}
                            className="w-full py-2.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold transition"
                          >
                            Request / Accept Booking →
                          </button>
                        )
                      ) : (
                        <p className="text-[11px] text-slate-400 text-center">
                          Open for verified Tour Companies, Agencies & Graduates to request.
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

export default function GuideLinkRwandaApp() {
  // Force full-bleed widescreen viewport
  useEffect(() => {
    const styleId = 'guidelink-fullscreen-override';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        html, body, #root {
          width: 100% !important;
          max-width: 100% !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          overflow-x: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [activeCustomDashId, setActiveCustomDashId] = useState('');
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pop-up Ad State (Ads pop up instead of staying permanently)
  const [activePopupAd, setActivePopupAd] = useState(null);

  // No-Code App Server CMS State
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_SERVER_CONFIG);
  const [serverSubTab, setServerSubTab] = useState('branding');
  const [newDestinationInput, setNewDestinationInput] = useState('');
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({ title: '', body: '', targetRole: 'all' });
  const [newCustomFieldForm, setNewCustomFieldForm] = useState({ label: '', placeholder: '', targetRole: 'all', required: false });
  const [newCustomSectionForm, setNewCustomSectionForm] = useState({ title: '', content: '', targetRole: 'all' });

  // Owner Sponsored Ads Generator State
  const [newAdForm, setNewAdForm] = useState({
    advertiserId: '',
    advertiserName: '',
    advertiserRoleLabel: '',
    advertiserContact: '',
    headline: '',
    description: '',
    badge: 'Featured Partner',
    ctaLabel: 'Book / Inquire',
    imageUrl: '',
    targetAudience: 'all',
    adFeePaid: 0,
    active: true
  });

  // No-Code New Dashboard Builder State
  const [newDashboardForm, setNewDashboardForm] = useState({
    name: '',
    icon: '🏨',
    badge: 'New Partner Hub',
    description: '',
    actionTitle: 'Submit Listing / Request',
    actionPlaceholder: 'Enter details, pricing, or availability...',
    showOnWelcome: true,
    items: []
  });
  const [customDashPostInput, setCustomDashPostInput] = useState({ title: '', details: '', priceOrMeta: '' });

  // No-Code New App Feature Builder State
  const [newFeatureForm, setNewFeatureForm] = useState({
    title: '',
    icon: '✨',
    featureType: 'action_form',
    targetRole: 'all',
    description: '',
    buttonLabel: 'Submit Request',
    linkUrl: '',
    unitPriceRwf: 50000,
    checklistItemsText: ''
  });
  const [featureInputs, setFeatureInputs] = useState({});
  const [featureSubmissions, setFeatureSubmissions] = useState({});
  const [checkedItemsMap, setCheckedItemsMap] = useState({});
  const [calcQtyMap, setCalcQtyMap] = useState({});

  const [customFieldValues, setCustomFieldValues] = useState({});
  const [subscriptionPlans, setSubscriptionPlans] = useState(DEFAULT_SUBSCRIPTION_PLANS);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchRoleFilter, setSearchRoleFilter] = useState('all');

  const [selectedManagedUserId, setSelectedManagedUserId] = useState('');
  const [ownerUserEditForm, setOwnerUserEditForm] = useState(null);
  const [ownerNewServiceInput, setOwnerNewServiceInput] = useState('');
  const [ownerNewDegreeInput, setOwnerNewDegreeInput] = useState('');
  const [ownerNewExpInput, setOwnerNewExpInput] = useState('');

  const [directoryFilter, setDirectoryFilter] = useState('all');
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ dates: '', guests: '2', notes: '' });

  // Confidential 1-on-1 Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeChatPeer, setActiveChatPeer] = useState({ id: '', name: '', role: '' });

  const MOMO_PAYMENT_CODE = appConfig.momoCode || '612771';
  const buildUssdDisplay = (amount) => `*182*8*1*${MOMO_PAYMENT_CODE}*${amount}#`;
  const buildUssdDialUri = (amount) => `tel:*182*8*1*${MOMO_PAYMENT_CODE}*${amount}%23`;

  const [ussdTriggered, setUssdTriggered] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [emailNotificationSent, setEmailNotificationSent] = useState(false);

  const [expiredUserAccount, setExpiredUserAccount] = useState(null);
  const [renewalPlanId, setRenewalPlanId] = useState('monthly');
  const [renewalMomoRef, setRenewalMomoRef] = useState('');
  const [renewalSubmitted, setRenewalSubmitted] = useState(false);

  const [ownerProfile, setOwnerProfile] = useState({
    name: 'RUTUNGURA Bonheur',
    title: 'C.E.O, Founder & Platform Administrator • GuideLink Rwanda',
    contact: '+250780558555',
    email: 'rutungurab5@gmail.com',
    bio: 'C.E.O & Tourism Management Specialist • Creator of GuideLink Rwanda.',
    photo: ''
  });

  const [exemptAccounts, setExemptAccounts] = useState([
    { id: 'vip1', name: 'VIP Partner Tier 1 (Platinum)', contact: '+250781111111', role: 'graduate', tier: 'Tier 1 - Platinum Partner', confirmed: false },
    { id: 'vip2', name: 'VIP Partner Tier 2 (Gold)', contact: '+250782222222', role: 'agency', tier: 'Tier 2 - Gold Partner', confirmed: false },
    { id: 'vip3', name: 'VIP Partner Tier 3 (Silver)', contact: '+250783333333', role: 'tour_company', tier: 'Tier 3 - Silver Partner', confirmed: false }
  ]);

  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [activeUser, setActiveUser] = useState(null);

  const [signInContact, setSignInContact] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [regStep, setRegStep] = useState('details');
  const [regForm, setRegForm] = useState({
    name: '',
    contact: '',
    password: '',
    confirmPassword: '',
    role: 'traveler',
    subscriptionPlanId: 'monthly',
    momoRef: ''
  });

  const [newDegreeInput, setNewDegreeInput] = useState('');
  const [newServiceInput, setNewServiceInput] = useState('');
  const [newExperienceInput, setNewExperienceInput] = useState('');

  const [newTaskForm, setNewTaskForm] = useState({ title: '', date: '', rawPay: '', location: 'Kigali', category: 'Guiding Job' });
  const [tripRequestForm, setTripRequestForm] = useState({
    preferredCategory: 'graduate',
    destination: 'Volcanoes National Park / Musanze',
    dates: '',
    guests: '2',
    notes: ''
  });

  const [tripRequests, setTripRequests] = useState([]);
  const [tasks, setTasks] = useState([
    { id: 'default-1', title: 'Half-day Kigali city tour & cultural heritage', agency: 'Cheetah Safaris / Partner Agency', location: 'Kigali', rawPay: 35000, pay: 'RWF 35,000', date: 'Sat 21 Nov, 09:00 to 13:00', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Guiding Job' },
    { id: 'default-2', title: 'Nyungwe Canopy Walk & Tea Plantation Escort', agency: 'Rwanda Eco Tours', location: 'Nyungwe / Rusizi', rawPay: 65000, pay: 'RWF 65,000', date: 'Mon 23 Nov, Full Day', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Consultant Job' }
  ]);

  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

  const getPlanById = (planId) =>
    subscriptionPlans.find((p) => p.id === planId) || subscriptionPlans[0] || DEFAULT_SUBSCRIPTION_PLANS[0];

  const isUserSubscriptionExpired = (user) => {
    if (!user || user.role === 'traveler' || user.role === 'owner') return false;
    if (user.status === 'expired') return true;
    if (user.subscriptionExpiresAt && Number(user.subscriptionExpiresAt) > 0) {
      return Date.now() > Number(user.subscriptionExpiresAt);
    }
    return false;
  };

  const openConfidentialChat = (peerId, peerName, peerRoleLabel = '') => {
    const resolvedId = normalizeContact(peerId || peerName);
    setActiveChatPeer({
      id: resolvedId,
      name: peerName,
      role: peerRoleLabel
    });
    setActiveTab('chat');
  };

  const loadFirebaseData = async () => {
    const [profilesDocs, vipDocs, tasksDocs, tripsDocs, chatDocs, plansDocs, configDocs] = await Promise.all([
      firestoreGetCollection('profiles'),
      firestoreGetCollection('vipTiers'),
      firestoreGetCollection('tasks'),
      firestoreGetCollection('tripRequests'),
      firestoreGetCollection('chats'),
      firestoreGetCollection('subscriptionPlans'),
      firestoreGetCollection('appConfig')
    ]);

    if (configDocs.length > 0) {
      const mainCfg = configDocs.find((d) => d.id === 'main') || configDocs[0];
      if (mainCfg) {
        setAppConfig((prev) => ({
          ...prev,
          ...mainCfg,
          destinations: Array.isArray(mainCfg.destinations) && mainCfg.destinations.length > 0 ? mainCfg.destinations : prev.destinations,
          announcements: Array.isArray(mainCfg.announcements) ? mainCfg.announcements : [],
          ads: Array.isArray(mainCfg.ads) ? mainCfg.ads : [],
          customFields: Array.isArray(mainCfg.customFields) ? mainCfg.customFields : [],
          customSections: Array.isArray(mainCfg.customSections) ? mainCfg.customSections : [],
          customDashboards: Array.isArray(mainCfg.customDashboards) ? mainCfg.customDashboards : [],
          customFeatures: Array.isArray(mainCfg.customFeatures) ? mainCfg.customFeatures : []
        }));
      }
    }

    if (plansDocs.length > 0) {
      const mergedPlans = DEFAULT_SUBSCRIPTION_PLANS.map((defPlan) => {
        const cloudMatch = plansDocs.find((c) => c.id === defPlan.id);
        return cloudMatch ? { ...defPlan, ...cloudMatch, price: Number(cloudMatch.price ?? defPlan.price), days: Number(cloudMatch.days ?? defPlan.days) } : defPlan;
      }).sort((a, b) => (a.order || 0) - (b.order || 0));
      setSubscriptionPlans(mergedPlans);
    }

    if (profilesDocs.length > 0) {
      const users = [];
      const profs = {};
      profilesDocs.forEach((p) => {
        if (p.role === 'owner') {
          setOwnerProfile((prev) => ({
            name: p.name || prev.name,
            title: p.headline || prev.title,
            contact: p.contact || prev.contact,
            email: p.email || prev.email,
            bio: p.bio || prev.bio,
            photo: p.photo || ''
          }));
        } else {
          const cleanKey = normalizeContact(p.contact || p.id);
          users.push({
            id: p.id,
            name: p.name,
            contact: p.contact,
            password: p.password,
            role: p.role,
            feePaid: p.feePaid ?? 0,
            momoRef: p.momoRef || 'Cloud Reg',
            status: p.status || 'approved',
            subscriptionPlanId: p.subscriptionPlanId || 'monthly',
            subscriptionPlanName: p.subscriptionPlanName || 'Starter Monthly',
            subscriptionExpiresAt: p.subscriptionExpiresAt || 0
          });
          profs[cleanKey] = {
            name: p.name,
            contact: p.contact,
            role: p.role,
            photo: p.photo || '',
            isAvailable: p.isAvailable !== false,
            headline: p.headline || '',
            location: p.location || 'Kigali, Rwanda',
            rateInfo: p.rateInfo || '',
            bio: p.bio || '',
            degrees: p.degrees || [],
            servicesOffered: p.servicesOffered || [],
            experiences: p.experiences || [],
            skills: p.skills || ['English', 'Kinyarwanda'],
            customData: p.customData || {}
          };
        }
      });
      setRegisteredUsers(users);
      setUserProfiles(profs);
    }

    if (vipDocs.length > 0) {
      const sortedVips = [...vipDocs].sort((a, b) => a.id.localeCompare(b.id));
      setExemptAccounts(sortedVips);
    }

    if (tasksDocs.length > 0) {
      const sortedTasks = [...tasksDocs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setTasks(sortedTasks);
    }

    if (tripsDocs.length > 0) {
      const sortedTrips = [...tripsDocs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setTripRequests(sortedTrips);
    }

    if (chatDocs.length > 0) {
      const sortedChats = [...chatDocs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setChatMessages(sortedChats);
    }
  };

  useEffect(() => {
    loadFirebaseData();
    const interval = setInterval(loadFirebaseData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Trigger Pop-up Ad when entering views or randomly
  useEffect(() => {
    const visibleAds = (appConfig.ads || []).filter((ad) => ad.active !== false);
    if (visibleAds.length > 0 && !activePopupAd) {
      // Pick a random ad to pop up after 2 seconds
      const timer = setTimeout(() => {
        const randomAd = visibleAds[Math.floor(Math.random() * visibleAds.length)];
        setActivePopupAd(randomAd);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [appConfig.ads, currentRole]);

  const getRoleDisplayLabel = (role) => {
    if (role === 'graduate') return 'Tourism Graduate / Guide';
    if (role === 'agency') return 'Travel Agency';
    if (role === 'tour_company') return 'Tour Company';
    if (role === 'traveler') return 'Traveler';
    const customDash = (appConfig.customDashboards || []).find((d) => d.id === role);
    if (customDash) return customDash.name;
    return role;
  };

  const getCurrentProfile = () => {
    if (!activeUser) return ownerProfile;
    const key = normalizeContact(activeUser.contact || activeUser.name);
    if (userProfiles[key]) return userProfiles[key];
    return {
      name: activeUser.name,
      contact: activeUser.contact || '',
      role: activeUser.role,
      photo: '',
      isAvailable: true,
      headline:
        activeUser.role === 'graduate'
          ? 'Certified Tourism Graduate & Guide'
          : activeUser.role === 'agency'
          ? 'Licensed Travel Agency'
          : activeUser.role === 'tour_company'
          ? 'Licensed Safari & Tour Company'
          : 'Explorer & Verified Traveler',
      location: 'Kigali, Rwanda',
      rateInfo: activeUser.role === 'graduate' ? 'RWF 35,000 / day' : 'Custom Packages',
      bio: '',
      degrees: [],
      servicesOffered: [],
      experiences: [],
      skills: ['English', 'Kinyarwanda'],
      customData: {}
    };
  };

  const updateCurrentProfile = async (updates) => {
    if (!activeUser) {
      const updatedOwner = { ...ownerProfile, ...updates };
      setOwnerProfile(updatedOwner);
      const ownerDocId = normalizeContact(ownerProfile.contact);
      await firestoreSaveDoc('profiles', ownerDocId, {
        contact: ownerProfile.contact,
        name: updatedOwner.name,
        role: 'owner',
        headline: updatedOwner.title,
        email: updatedOwner.email,
        bio: updatedOwner.bio,
        photo: updatedOwner.photo
      });
      return;
    }

    const key = normalizeContact(activeUser.contact || activeUser.name);
    const existing = getCurrentProfile();
    const updated = { ...existing, ...updates };
    setUserProfiles({ ...userProfiles, [key]: updated });
    if (updates.name) {
      setActiveUser({ ...activeUser, name: updates.name });
    }

    await firestoreSaveDoc('profiles', key, {
      contact: activeUser.contact,
      name: updated.name,
      role: activeUser.role,
      password: activeUser.password || '1234',
      isAvailable: updated.isAvailable,
      headline: updated.headline,
      location: updated.location,
      rateInfo: updated.rateInfo,
      photo: updated.photo,
      degrees: updated.degrees,
      servicesOffered: updated.servicesOffered,
      experiences: updated.experiences,
      skills: updated.skills,
      customData: updated.customData || {}
    });
  };

  const handleSaveWithButton = async (profileData) => {
    setIsSaving(true);
    await updateCurrentProfile(profileData);
    setIsSaving(false);
    alert('✓ Profile & updates successfully saved to Firebase Cloud!');
  };

  const handleSaveAppServerConfig = async (customOverride = null) => {
    setIsSaving(true);
    const payload = customOverride || appConfig;
    await firestoreSaveDoc('appConfig', 'main', {
      appName: payload.appName || 'GuideLink Rwanda',
      tagline: payload.tagline || '',
      subtitle: payload.subtitle || '',
      footerLocation: payload.footerLocation || 'Kigali, Rwanda',
      momoCode: payload.momoCode || '612771',
      primaryColor: payload.primaryColor || '#234E40',
      secondaryColor: payload.secondaryColor || '#3B6E5B',
      travelerFreeBadge: payload.travelerFreeBadge || 'Travelers: FREE',
      allowNewSignups: payload.allowNewSignups !== false,
      maintenanceMode: Boolean(payload.maintenanceMode),
      maintenanceMessage: payload.maintenanceMessage || '',
      welcomeBannerText: payload.welcomeBannerText || '',
      destinations: payload.destinations || [],
      announcements: payload.announcements || [],
      ads: payload.ads || [],
      customFields: payload.customFields || [],
      customSections: payload.customSections || [],
      customDashboards: payload.customDashboards || [],
      customFeatures: payload.customFeatures || []
    });
    setIsSaving(false);
  };

  const handleSaveSubscriptionPlans = async () => {
    setIsSaving(true);
    for (const plan of subscriptionPlans) {
      await firestoreSaveDoc('subscriptionPlans', plan.id, {
        id: plan.id,
        name: plan.name.trim() || 'Subscription Plan',
        badge: plan.badge.trim() || plan.name.trim(),
        durationLabel: plan.durationLabel,
        days: Number(plan.days) || 30,
        price: Number(plan.price) || 15000,
        order: plan.order || 1
      });
    }
    setIsSaving(false);
    alert('✓ Subscription plan names & costs saved to Firebase Cloud!');
  };

  const handleSelectUserForAdminEdit = (user) => {
    const cleanKey = normalizeContact(user.contact || user.id);
    const existingProf = userProfiles[cleanKey] || {};
    setSelectedManagedUserId(user.id);
    setOwnerNewServiceInput('');
    setOwnerNewDegreeInput('');
    setOwnerNewExpInput('');
    setOwnerUserEditForm({
      docId: user.id,
      oldKey: cleanKey,
      name: user.name || '',
      contact: user.contact || '',
      password: user.password || '',
      role: user.role || 'traveler',
      status: user.status || 'approved',
      subscriptionPlanId: user.subscriptionPlanId || 'monthly',
      subscriptionExpiresAt: user.subscriptionExpiresAt || 0,
      isAvailable: existingProf.isAvailable !== false,
      headline: existingProf.headline || '',
      location: existingProf.location || 'Kigali, Rwanda',
      rateInfo: existingProf.rateInfo || '',
      bio: existingProf.bio || '',
      photo: existingProf.photo || '',
      degrees: existingProf.degrees || [],
      servicesOffered: existingProf.servicesOffered || [],
      experiences: existingProf.experiences || [],
      skills: existingProf.skills || ['English', 'Kinyarwanda']
    });
  };

  const handleDeleteUserAccount = async (userId, userName) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to permanently DELETE "${userName}" from the system? This action cannot be undone.`
    );
    if (!confirmed) return;

    const targetUser = registeredUsers.find((u) => u.id === userId);
    const updatedList = registeredUsers.filter((u) => u.id !== userId);
    setRegisteredUsers(updatedList);

    if (targetUser) {
      const cleanKey = normalizeContact(targetUser.contact || targetUser.id);
      const updatedProfs = { ...userProfiles };
      delete updatedProfs[cleanKey];
      setUserProfiles(updatedProfs);
    }

    if (selectedManagedUserId === userId) {
      if (updatedList.length > 0) {
        handleSelectUserForAdminEdit(updatedList[0]);
      } else {
        setSelectedManagedUserId('');
        setOwnerUserEditForm(null);
      }
    }

    await firestoreDeleteDoc('profiles', userId);
    alert(`🗑️ User "${userName}" has been permanently deleted.`);
  };

  const handleOwnerSaveManagedUser = async (e) => {
    e.preventDefault();
    if (!ownerUserEditForm) return;
    if (!ownerUserEditForm.name.trim() || !ownerUserEditForm.contact.trim() || !ownerUserEditForm.password.trim()) {
      alert('Name, Contact, and Password cannot be empty.');
      return;
    }

    setIsSaving(true);
    const { docId, oldKey, ...cleanFields } = ownerUserEditForm;
    const newCleanKey = normalizeContact(cleanFields.contact);
    const chosenPlan = getPlanById(cleanFields.subscriptionPlanId);

    setRegisteredUsers(
      registeredUsers.map((u) =>
        u.id === docId
          ? {
              ...u,
              name: cleanFields.name.trim(),
              contact: cleanFields.contact.trim(),
              password: cleanFields.password,
              role: cleanFields.role,
              status: cleanFields.status,
              subscriptionPlanId: chosenPlan.id,
              subscriptionPlanName: chosenPlan.name,
              subscriptionExpiresAt: cleanFields.subscriptionExpiresAt
            }
          : u
      )
    );

    const updatedProfiles = { ...userProfiles };
    if (oldKey && oldKey !== newCleanKey) {
      delete updatedProfiles[oldKey];
    }
    updatedProfiles[newCleanKey] = {
      name: cleanFields.name.trim(),
      contact: cleanFields.contact.trim(),
      role: cleanFields.role,
      photo: cleanFields.photo,
      isAvailable: cleanFields.isAvailable,
      headline: cleanFields.headline,
      location: cleanFields.location,
      rateInfo: cleanFields.rateInfo,
      bio: cleanFields.bio,
      degrees: cleanFields.degrees,
      servicesOffered: cleanFields.servicesOffered,
      experiences: cleanFields.experiences,
      skills: cleanFields.skills
    };
    setUserProfiles(updatedProfiles);

    await firestoreSaveDoc('profiles', docId, {
      name: cleanFields.name.trim(),
      contact: cleanFields.contact.trim(),
      password: cleanFields.password,
      role: cleanFields.role,
      status: cleanFields.status,
      subscriptionPlanId: chosenPlan.id,
      subscriptionPlanName: chosenPlan.name,
      subscriptionExpiresAt: cleanFields.subscriptionExpiresAt,
      isAvailable: cleanFields.isAvailable,
      headline: cleanFields.headline,
      location: cleanFields.location,
      rateInfo: cleanFields.rateInfo,
      bio: cleanFields.bio,
      photo: cleanFields.photo,
      degrees: cleanFields.degrees,
      servicesOffered: cleanFields.servicesOffered,
      experiences: cleanFields.experiences,
      skills: cleanFields.skills
    });

    setIsSaving(false);
    alert(`✓ Login info, subscription & all dashboard elements for ${cleanFields.name} updated in Firebase!`);
  };

  const handleImageUpload = (e, onSuccess) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onSuccess(reader.result);
    reader.readAsDataURL(file);
  };

  const resetToWelcome = () => {
    setCurrentRole('welcome');
    setActiveTab('jobs');
    setActiveCustomDashId('');
    setSearchQuery('');
    setSearchRoleFilter('all');
    setRegStep('details');
    setUssdTriggered(false);
    setEmailNotificationSent(false);
    setExpiredUserAccount(null);
    setRenewalSubmitted(false);
    setActiveUser(null);
    setActiveChatPeer({ id: '', name: '', role: '' });
    setSignInContact('');
    setSignInPassword('');
  };

  const checkExemptUser = (contactInput) => {
    const cleanInput = normalizeContact(contactInput);
    if (cleanInput === normalizeContact(ownerProfile.contact) || normalizeContact(ownerProfile.email) === cleanInput) {
      return { id: 'owner', name: ownerProfile.name, contact: ownerProfile.contact, role: 'owner', tier: 'C.E.O & Administrator HQ', confirmed: true };
    }
    return exemptAccounts.find(
      (acc) =>
        acc.confirmed &&
        (normalizeContact(acc.contact) === cleanInput ||
          (acc.email && normalizeContact(acc.email) === cleanInput))
    );
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    const cleanInput = normalizeContact(signInContact);
    if (!cleanInput || !signInPassword) {
      alert('Please enter your Phone/Email and Password.');
      return;
    }

    const exemptMatch = checkExemptUser(signInContact);
    if (exemptMatch) {
      if (exemptMatch.id === 'owner') {
        if (signInPassword === 'FYP$2026') {
          setOwnerTab('pending');
          setCurrentRole('owner');
          setSignInContact('');
          setSignInPassword('');
          return;
        }
        setShowOwnerPinModal(true);
        return;
      }
      if (appConfig.maintenanceMode) {
        alert(`⚠️ ${appConfig.maintenanceMessage}`);
        return;
      }
      setActiveUser({
        name: exemptMatch.name,
        contact: exemptMatch.contact,
        role: exemptMatch.role,
        tier: exemptMatch.tier,
        isVip: true
      });
      setCurrentRole(exemptMatch.role);
      setActiveTab('jobs');
      return;
    }

    if (appConfig.maintenanceMode) {
      alert(`⚠️ ${appConfig.maintenanceMessage}`);
      return;
    }

    const existingUser = registeredUsers.find(
      (u) => normalizeContact(u.contact) === cleanInput
    );

    if (!existingUser) {
      alert('Account not found. Please click "Create Account (New Sign Up)".');
      return;
    }

    if (existingUser.password && existingUser.password !== signInPassword) {
      alert('Access Denied: Incorrect password.');
      return;
    }

    if (isUserSubscriptionExpired(existingUser)) {
      if (existingUser.status === 'approved') {
        setRegisteredUsers(
          registeredUsers.map((u) =>
            u.id === existingUser.id ? { ...u, status: 'expired' } : u
          )
        );
        await firestoreSaveDoc('profiles', existingUser.id, { status: 'expired' });
      }
      setExpiredUserAccount(existingUser);
      setRenewalPlanId(existingUser.subscriptionPlanId || 'monthly');
      setRenewalMomoRef('');
      setRenewalSubmitted(false);
      setUssdTriggered(false);
      setCurrentRole('renew_sub');
      return;
    }

    if (existingUser.status !== 'approved') {
      alert('Access Denied: Your account access is revoked or awaiting C.E.O payment confirmation.');
      return;
    }

    setActiveUser(existingUser);
    setCurrentRole(existingUser.role);
    setActiveTab('jobs');
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!appConfig.allowNewSignups) {
      alert('New registrations are temporarily paused by the Administrator.');
      return;
    }
    if (!regForm.name.trim() || !regForm.contact.trim() || !regForm.password.trim()) {
      alert('Please fill in your Name, Contact, and create a Password.');
      return;
    }

    if (regForm.password.length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    if (regForm.password !== regForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    const cleanInput = normalizeContact(regForm.contact);
    const existingUser = registeredUsers.find(
      (u) => normalizeContact(u.contact) === cleanInput
    );
    const exemptMatch = checkExemptUser(regForm.contact);

    if (existingUser || exemptMatch) {
      alert('This contact is already registered! Please use "Sign In".');
      setSignInContact(regForm.contact);
      setSignInPassword('');
      setCurrentRole('signin');
      return;
    }

    if (regForm.role === 'traveler') {
      const freeTraveler = {
        id: cleanInput,
        name: regForm.name.trim(),
        contact: regForm.contact.trim(),
        password: regForm.password,
        role: 'traveler',
        feePaid: 0,
        status: 'approved',
        subscriptionPlanId: 'free_traveler',
        subscriptionPlanName: 'Free Traveler Access',
        subscriptionExpiresAt: 0
      };
      setRegisteredUsers([freeTraveler, ...registeredUsers]);
      setActiveUser(freeTraveler);
      setCurrentRole('traveler');
      setActiveTab('jobs');

      await firestoreSaveDoc('profiles', cleanInput, {
        ...freeTraveler,
        isAvailable: true
      });
      return;
    }

    setUssdTriggered(false);
    setRegStep('pay_subscription');
  };

  const sendRealTimeOwnerEmailNotification = async (registrantData, isRenewal = false) => {
    const targetOwnerEmail = ownerProfile.email || 'rutungurab5@gmail.com';
    const ussdUsed = buildUssdDisplay(registrantData.feePaid);
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetOwnerEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          _subject: `${appConfig.appName}: ${isRenewal ? 'Subscription Renewal' : 'New Partner Subscription'} (${registrantData.name}) - ${registrantData.subscriptionPlanName}`,
          _template: 'table',
          Platform: appConfig.appName,
          Transaction_Type: isRenewal ? 'Subscription Renewal' : 'New Account Subscription',
          Member_Name: registrantData.name,
          Account_Role: getRoleDisplayLabel(registrantData.role),
          Member_Contact: registrantData.contact,
          Subscription_Plan: registrantData.subscriptionPlanName,
          Amount_Paid: `${Number(registrantData.feePaid).toLocaleString()} RWF`,
          USSD_Dialed: ussdUsed,
          MoMo_Transaction_Ref: registrantData.momoRef,
          Submitted_At: new Date().toLocaleString()
        })
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  const handleCompleteSubscriptionPayment = async () => {
    const selectedPlan = getPlanById(regForm.subscriptionPlanId);
    const ussdCode = buildUssdDisplay(selectedPlan.price);

    if (!regForm.momoRef.trim()) {
      alert(`Please enter your MoMo Transaction Reference / ID after dialing ${ussdCode}.`);
      return;
    }

    setIsSubmittingPayment(true);
    const cleanInput = normalizeContact(regForm.contact);
    const expiresAt = Date.now() + selectedPlan.days * 24 * 60 * 60 * 1000;

    const newRegistrant = {
      id: cleanInput,
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      password: regForm.password,
      role: regForm.role,
      feePaid: selectedPlan.price,
      subscriptionPlanId: selectedPlan.id,
      subscriptionPlanName: selectedPlan.name,
      subscriptionExpiresAt: expiresAt,
      momoCodeUsed: ussdCode,
      momoRef: regForm.momoRef.trim(),
      status: 'pending_approval'
    };

    setRegisteredUsers([newRegistrant, ...registeredUsers]);

    await firestoreSaveDoc('profiles', cleanInput, {
      ...newRegistrant,
      isAvailable: true
    });

    const notified = await sendRealTimeOwnerEmailNotification(newRegistrant, false);
    setEmailNotificationSent(notified);
    setIsSubmittingPayment(false);
    setRegStep('pending_approval');
  };

  const handleCompleteRenewalPayment = async () => {
    if (!expiredUserAccount) return;
    const selectedPlan = getPlanById(renewalPlanId);
    const ussdCode = buildUssdDisplay(selectedPlan.price);

    if (!renewalMomoRef.trim()) {
      alert(`Please enter your MoMo Transaction Reference / ID after dialing ${ussdCode}.`);
      return;
    }

    setIsSubmittingPayment(true);
    const newExpiresAt = Date.now() + selectedPlan.days * 24 * 60 * 60 * 1000;
    const updatedFeePaid = Number(expiredUserAccount.feePaid || 0) + selectedPlan.price;

    const renewedRecord = {
      ...expiredUserAccount,
      feePaid: updatedFeePaid,
      subscriptionPlanId: selectedPlan.id,
      subscriptionPlanName: selectedPlan.name,
      subscriptionExpiresAt: newExpiresAt,
      momoRef: renewalMomoRef.trim(),
      status: 'pending_approval'
    };

    setRegisteredUsers(
      registeredUsers.map((u) => (u.id === expiredUserAccount.id ? renewedRecord : u))
    );

    await firestoreSaveDoc('profiles', expiredUserAccount.id, {
      feePaid: updatedFeePaid,
      subscriptionPlanId: selectedPlan.id,
      subscriptionPlanName: selectedPlan.name,
      subscriptionExpiresAt: newExpiresAt,
      momoRef: renewalMomoRef.trim(),
      status: 'pending_approval'
    });

    await sendRealTimeOwnerEmailNotification(
      { ...renewedRecord, feePaid: selectedPlan.price },
      true
    );
    setIsSubmittingPayment(false);
    setRenewalSubmitted(true);
  };

  const handleOwnerLogin = (e) => {
    if (e) e.preventDefault();
    if (ownerPinInput === 'FYP$2026') {
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setOwnerTab('pending');
      setCurrentRole('owner');
    } else {
      alert('Access Denied: Invalid Owner Password.');
      setOwnerPinInput('');
    }
  };

  const toggleUserAccessStatus = async (userId, userContact, currentStatus) => {
    const nextStatus = currentStatus === 'approved' ? 'revoked' : 'approved';
    const docId = userId || normalizeContact(userContact);
    const targetUser = registeredUsers.find((u) => u.id === docId);

    let updatedExpiry = targetUser?.subscriptionExpiresAt || 0;
    if (nextStatus === 'approved' && targetUser && targetUser.role !== 'traveler') {
      const plan = getPlanById(targetUser.subscriptionPlanId);
      if (!updatedExpiry || Date.now() > Number(updatedExpiry)) {
        updatedExpiry = Date.now() + plan.days * 24 * 60 * 60 * 1000;
      }
    }

    setRegisteredUsers(
      registeredUsers.map((u) =>
        u.id === docId
          ? { ...u, status: nextStatus, subscriptionExpiresAt: updatedExpiry }
          : u
      )
    );
    await firestoreSaveDoc('profiles', docId, {
      status: nextStatus,
      subscriptionExpiresAt: updatedExpiry
    });
    alert(`✓ User access has been successfully ${nextStatus === 'approved' ? 'GRANTED' : 'REVOKED'} in Firebase!`);
  };

  const toggleVipTierAccess = async (slotId) => {
    const target = exemptAccounts.find((a) => a.id === slotId);
    if (!target) return;
    const newStatus = !target.confirmed;
    const updatedItem = { ...target, confirmed: newStatus };

    setExemptAccounts(
      exemptAccounts.map((acc) => (acc.id === slotId ? updatedItem : acc))
    );
    await firestoreSaveDoc('vipTiers', slotId, updatedItem);
    alert(`✓ ${target.tier} access has been successfully ${newStatus ? 'GRANTED' : 'REVOKED'}!`);
  };

  const handleSaveVipEdits = async (acc) => {
    await firestoreSaveDoc('vipTiers', acc.id, acc);
  };

  const handleAcceptTask = async (taskId) => {
    const taskDocId = String(taskId);
    const existingTask = tasks.find((t) => String(t.id) === taskDocId);
    if (!existingTask) return;

    const updatedTask = {
      ...existingTask,
      status: 'accepted',
      assignedTo: activeUser?.name || 'Graduate',
      createdAt: existingTask.createdAt || Date.now()
    };

    setTasks(tasks.map((t) => (String(t.id) === taskDocId ? updatedTask : t)));
    await firestoreSaveDoc('tasks', taskDocId, updatedTask);
    alert('✓ Gig accepted and synced to Firebase!');
  };

  const handleCompleteTask = async (taskId) => {
    const taskDocId = String(taskId);
    const existingTask = tasks.find((t) => String(t.id) === taskDocId);
    if (!existingTask) return;

    const updatedTask = {
      ...existingTask,
      status: 'done',
      paymentStatus: 'paid',
      ownerCommission: 0,
      netGuidePayout: existingTask.rawPay,
      createdAt: existingTask.createdAt || Date.now()
    };

    setTasks(tasks.map((t) => (String(t.id) === taskDocId ? updatedTask : t)));
    await firestoreSaveDoc('tasks', taskDocId, updatedTask);
    alert(`✓ Task completed! 100% payout (RWF ${Number(existingTask.rawPay).toLocaleString()}) settled with zero commission fees.`);
  };

  const handleConfirmTravelerRequest = async (reqId) => {
    const responderName = activeUser?.name || 'Verified Provider';
    const responderRoleLabel = getRoleDisplayLabel(currentRole);
    const confirmedByLabel = `${responderName} (${responderRoleLabel})`;

    setTripRequests(
      tripRequests.map((req) =>
        String(req.id) === String(reqId)
          ? { ...req, status: 'confirmed', confirmedBy: confirmedByLabel }
          : req
      )
    );
    await firestoreSaveDoc('tripRequests', String(reqId), {
      status: 'confirmed',
      confirmedBy: confirmedByLabel
    });
    alert(`✓ Traveler request confirmed by ${responderName}!`);
  };

  const handlePostNewTask = async (e) => {
    e.preventDefault();
    const numericPay = Number(newTaskForm.rawPay);
    if (!newTaskForm.title.trim() || !numericPay) {
      alert('Please enter a valid title and amount.');
      return;
    }
    const newId = `task-${Date.now()}`;
    const newTask = {
      id: newId,
      title: newTaskForm.title.trim(),
      agency: `${activeUser?.name || 'Partner'} (${getRoleDisplayLabel(currentRole)})`,
      location: newTaskForm.location || 'Kigali',
      rawPay: numericPay,
      pay: `RWF ${numericPay.toLocaleString()}`,
      date: newTaskForm.date || 'Flexible Date',
      status: 'open',
      assignedTo: null,
      paymentStatus: 'pending',
      category: newTaskForm.category || 'Guiding Job',
      createdAt: Date.now()
    };

    setTasks([newTask, ...tasks]);
    setNewTaskForm({ title: '', date: '', rawPay: '', location: 'Kigali', category: 'Guiding Job' });
    await firestoreSaveDoc('tasks', newId, newTask);
    alert('✓ Assignment/Opportunity published to Firebase!');
  };

  const handleCreateTripRequest = async (e) => {
    e.preventDefault();
    const categoryLabel = getRoleDisplayLabel(tripRequestForm.preferredCategory);
    const newId = `trip-${Date.now()}`;
    const newTrip = {
      id: newId,
      travelerName: activeUser?.name || 'Traveler',
      travelerContact: activeUser?.contact || '',
      preferredCategory: tripRequestForm.preferredCategory,
      targetProvider: `Any Available ${categoryLabel}`,
      destination: tripRequestForm.destination || appConfig.destinations[0],
      dates: tripRequestForm.dates || 'Upcoming',
      guests: tripRequestForm.guests,
      notes: tripRequestForm.notes,
      status: 'pending_confirmation',
      confirmedBy: null,
      createdAt: Date.now()
    };

    setTripRequests([newTrip, ...tripRequests]);
    setTripRequestForm({
      preferredCategory: 'graduate',
      destination: appConfig.destinations[0] || 'Volcanoes National Park / Musanze',
      dates: '',
      guests: '2',
      notes: ''
    });
    await firestoreSaveDoc('tripRequests', newId, newTrip);
    alert(`✓ Request broadcasted to available ${categoryLabel}s!`);
  };

  const handleDirectProviderBooking = async (e) => {
    e.preventDefault();
    if (!bookingTarget) return;
    const newId = `trip-${Date.now()}`;
    const newBooking = {
      id: newId,
      travelerName: activeUser?.name || 'Member',
      travelerContact: activeUser?.contact || '',
      preferredCategory: bookingTarget.type,
      targetProvider: `${bookingTarget.name} (${bookingTarget.categoryLabel})`,
      destination: bookingTarget.location,
      dates: bookingDetails.dates || 'Requested Dates',
      guests: bookingDetails.guests,
      notes: bookingDetails.notes,
      status: 'pending_confirmation',
      confirmedBy: null,
      createdAt: Date.now()
    };

    setTripRequests([newBooking, ...tripRequests]);
    setBookingTarget(null);
    setBookingDetails({ dates: '', guests: '2', notes: '' });
    await firestoreSaveDoc('tripRequests', newId, newBooking);
    alert(`✓ Booking request sent to ${newBooking.targetProvider}!`);
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatPeer.id) return;

    const myId = normalizeContact(activeUser?.contact || activeUser?.name || 'user');
    const recipientId = normalizeContact(activeChatPeer.id);
    const roomId = [myId, recipientId].sort().join('__');

    const msgId = `chat-${Date.now()}`;
    const newMsg = {
      id: msgId,
      roomId,
      senderId: myId,
      sender: activeUser?.name || 'User',
      role: getRoleDisplayLabel(currentRole),
      recipientId,
      recipientName: activeChatPeer.name,
      participants: [myId, recipientId],
      peer: activeChatPeer.name,
      text: chatInput.trim(),
      createdAt: Date.now()
    };

    setChatMessages([...chatMessages, newMsg]);
    setChatInput('');
    await firestoreSaveDoc('chats', msgId, newMsg);
  };

  const buildLiveProviderDirectory = () => {
    const defaultProviders = [
      {
        id: 'prov-g1',
        contactId: 'prov-g1',
        type: 'graduate',
        categoryLabel: 'Tourism Graduate & Guide',
        name: 'Jean Bosco Habimana',
        headline: 'Certified Multilingual Safari & Cultural Guide',
        location: 'Kigali & Volcanoes NP',
        languages: 'English, French, Kinyarwanda',
        rate: 'RWF 40,000 / day',
        qualifications: ['Advanced Diploma in Tours & Travel (RP Kitabi)'],
        services: ['Gorilla Trekking Escort', 'Kigali Cultural Walks', 'Birding Tours'],
        experience: ['4+ Years Safari Guiding in Northern Province'],
        isAvailable: true
      },
      {
        id: 'prov-tc1',
        contactId: 'prov-tc1',
        type: 'tour_company',
        categoryLabel: 'Tour Company',
        name: 'Cheetah Safaris Rwanda',
        headline: '4x4 Safari Fleet, Gorilla Trekking & Akagera Wildlife Expeditions',
        location: 'Kigali & Musanze',
        languages: 'Full Safari Fleet & Permits',
        rate: 'All-Inclusive Safaris',
        qualifications: ['RDB Certified Tour Operator', 'AUTO Member'],
        services: ['4x4 Land Cruiser Rental', 'Gorilla Permit Processing', 'Multi-Day Wildlife Safaris'],
        experience: ['10+ Years East Africa Safari Operations'],
        isAvailable: true
      }
    ];

    const dynamicProviders = [];

    exemptAccounts.forEach((acc) => {
      if (acc.confirmed && ['graduate', 'agency', 'tour_company'].includes(acc.role)) {
        const key = normalizeContact(acc.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `vip-${acc.id}`,
          contactId: key,
          type: acc.role,
          categoryLabel: `${getRoleDisplayLabel(acc.role)} (${acc.tier})`,
          name: prof.name || acc.name,
          headline: prof.headline || `${acc.tier} • Verified Partner`,
          location: prof.location || 'Kigali, Rwanda',
          languages: (prof.skills || ['English', 'Kinyarwanda']).join(', '),
          rate: prof.rateInfo || (acc.role === 'graduate' ? 'RWF 45,000 / day' : 'Custom Packages'),
          qualifications: prof.degrees || [],
          services: prof.servicesOffered || [],
          experience: prof.experiences || [],
          isAvailable: prof.isAvailable !== false,
          photo: prof.photo || ''
        });
      }
    });

    registeredUsers.forEach((u) => {
      if (
        u.status === 'approved' &&
        !isUserSubscriptionExpired(u) &&
        ['graduate', 'agency', 'tour_company'].includes(u.role)
      ) {
        const key = normalizeContact(u.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `reg-${u.id}`,
          contactId: key,
          type: u.role,
          categoryLabel: `${getRoleDisplayLabel(u.role)} • ${u.subscriptionPlanName || 'Verified'}`,
          name: prof.name || u.name,
          headline: prof.headline || `Verified ${getRoleDisplayLabel(u.role)}`,
          location: prof.location || 'Rwanda',
          languages: (prof.skills || ['English', 'Kinyarwanda']).join(', '),
          rate: prof.rateInfo || (u.role === 'graduate' ? 'RWF 35,000 / day' : 'Custom Itineraries'),
          qualifications: prof.degrees || [],
          services: prof.servicesOffered || [],
          experience: prof.experiences || [],
          isAvailable: prof.isAvailable !== false,
          photo: prof.photo || ''
        });
      }
    });

    return [...dynamicProviders, ...defaultProviders];
  };

  const eligiblePaidAdvertisers = [
    ...registeredUsers
      .filter(
        (u) =>
          u.status === 'approved' &&
          !isUserSubscriptionExpired(u) &&
          ['graduate', 'agency', 'tour_company'].includes(u.role)
      )
      .map((u) => {
        const key = normalizeContact(u.contact);
        const prof = userProfiles[key] || {};
        return {
          id: `reg-${u.id}`,
          name: prof.name || u.name,
          contact: u.contact,
          role: u.role,
          roleLabel: `${getRoleDisplayLabel(u.role)} • ${u.subscriptionPlanName || 'Paid Plan'}`,
          headline: prof.headline || '',
          location: prof.location || 'Rwanda',
          photo: prof.photo || ''
        };
      }),
    ...exemptAccounts
      .filter((acc) => acc.confirmed && ['graduate', 'agency', 'tour_company'].includes(acc.role))
      .map((acc) => {
        const key = normalizeContact(acc.contact);
        const prof = userProfiles[key] || {};
        return {
          id: `vip-${acc.id}`,
          name: prof.name || acc.name,
          contact: acc.contact,
          role: acc.role,
          roleLabel: `${getRoleDisplayLabel(acc.role)} • ${acc.tier}`,
          headline: prof.headline || '',
          location: prof.location || 'Rwanda',
          photo: prof.photo || ''
        };
      })
  ];

  // =========================================================================
  // POP-UP SPONSORED AD MODAL COMPONENT (Replaces permanent banner with popup)
  // =========================================================================
  const renderPopupAdModal = () => {
    if (!activePopupAd) return null;
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-2 border-amber-400 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 text-xs animate-scale-up relative">
          <button
            type="button"
            onClick={() => setActivePopupAd(null)}
            className="absolute top-4 right-4 bg-slate-200 hover:bg-slate-300 text-slate-800 w-8 h-8 rounded-full font-extrabold flex items-center justify-center"
          >
            ✕
          </button>

          <div className="flex items-center space-x-3">
            {activePopupAd.imageUrl ? (
              <img src={activePopupAd.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl font-black shrink-0">
                📢
              </div>
            )}
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                {activePopupAd.badge || 'Sponsored Partner'}
              </span>
              <h3 className="font-extrabold text-base text-slate-900 mt-1 leading-snug">
                {activePopupAd.headline}
              </h3>
              <p className="text-xs font-bold text-[#234E40]">
                {activePopupAd.advertiserName} {activePopupAd.advertiserRoleLabel ? `• ${activePopupAd.advertiserRoleLabel}` : ''}
              </p>
            </div>
          </div>

          {activePopupAd.description && (
            <p className="text-slate-700 leading-relaxed text-sm bg-amber-100/50 p-3 rounded-xl border border-amber-200">
              {activePopupAd.description}
            </p>
          )}

          <div className="flex space-x-2 pt-2">
            {activePopupAd.advertiserContact && (
              <button
                type="button"
                onClick={() => {
                  const ad = activePopupAd;
                  setActivePopupAd(null);
                  openConfidentialChat(ad.advertiserContact, ad.advertiserName, ad.advertiserRoleLabel || 'Sponsored Partner');
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-xs shadow-sm transition"
              >
                🔒 Private Chat
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const ad = activePopupAd;
                setActivePopupAd(null);
                setBookingTarget({
                  type: 'agency',
                  categoryLabel: ad.advertiserRoleLabel || 'Featured Partner',
                  name: ad.advertiserName,
                  location: 'Rwanda'
                });
              }}
              className="flex-1 py-3 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-extrabold text-xs shadow transition"
            >
              {activePopupAd.ctaLabel || 'Book Now'} →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 1. FULL-BLEED WIDESCREEN WELCOME VIEW
  // =========================================================================
  if (currentRole === 'welcome') {
    const welcomeAnnouncements = (appConfig.announcements || []).filter(
      (a) => a.targetRole === 'all' || a.targetRole === 'welcome'
    );
    const welcomeCustomDashboards = (appConfig.customDashboards || []).filter(
      (d) => d.showOnWelcome !== false
    );

    return (
      <div className="min-h-screen w-screen bg-slate-50 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div className="w-full">
          {/* Full-Bleed Widescreen Hero Banner */}
          <div className="bg-[#E2ECE9] w-full px-6 md:px-12 py-8 md:py-12 relative overflow-hidden">
            <div className="w-full relative">
              <div className="absolute -top-2 right-4 md:right-12 w-16 h-16 md:w-24 md:h-24 bg-amber-400 rounded-full shadow-md"></div>
              <div className="h-24 md:h-36 flex items-end justify-center space-x-1">
                <div className="w-full h-16 md:h-28 bg-[#5A8F7B] rounded-t-full opacity-60"></div>
                <div className="absolute bottom-0 w-full h-12 md:h-20 bg-[#3B6E5B] rounded-t-full opacity-80"></div>
                <div
                  className="absolute bottom-0 w-4/5 h-8 md:h-12 rounded-t-full"
                  style={{ backgroundColor: appConfig.primaryColor || '#234E40' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Edge-to-Edge Widescreen Grid */}
          <div className="w-full px-6 md:px-12 lg:px-16 py-8 md:py-12 space-y-6">
            {appConfig.maintenanceMode && (
              <div className="w-full bg-red-50 border border-red-300 p-4 rounded-2xl text-xs md:text-sm text-red-900 font-semibold">
                🚧 {appConfig.maintenanceMessage}
              </div>
            )}

            {appConfig.welcomeBannerText && (
              <div className="w-full bg-amber-50 border border-amber-300 p-4 rounded-2xl text-xs md:text-sm text-amber-950 font-semibold">
                📢 {appConfig.welcomeBannerText}
              </div>
            )}

            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Widescreen Column: Brand Hero, Announcements & Custom Dashboards */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                <div>
                  <h1 className="text-3xl md:text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight">
                    {appConfig.appName}
                  </h1>
                  <p className="text-lg md:text-2xl xl:text-3xl font-semibold mt-2" style={{ color: appConfig.primaryColor || '#234E40' }}>
                    {appConfig.tagline}
                  </p>
                  <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed max-w-3xl">
                    {appConfig.subtitle}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">
                    C.E.O: {ownerProfile.name} ({ownerProfile.contact})
                  </p>
                </div>

                {welcomeAnnouncements.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {welcomeAnnouncements.map((ann) => (
                      <div key={ann.id} className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl text-xs md:text-sm">
                        <p className="font-bold text-[#234E40]">📌 {ann.title}</p>
                        <p className="text-slate-700 mt-1">{ann.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {welcomeCustomDashboards.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      🌟 Specialized Platform Dashboards
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {welcomeCustomDashboards.map((cd) => (
                        <button
                          key={cd.id}
                          type="button"
                          onClick={() => {
                            setActiveCustomDashId(cd.id);
                            setCurrentRole('custom_dashboard_view');
                          }}
                          className="p-4 bg-white hover:bg-emerald-50 border border-slate-200 rounded-2xl text-left shadow-sm transition flex items-start space-x-3"
                        >
                          <span className="text-2xl">{cd.icon || '📊'}</span>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">{cd.badge || 'Partner Hub'}</span>
                            <h4 className="font-bold text-sm text-slate-900">{cd.name}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{cd.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Widescreen Column: Access Portal */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: appConfig.primaryColor || '#234E40' }}>
                      Member Access
                    </span>
                    <span className="text-xs font-bold bg-emerald-100 text-[#234E40] px-3 py-1 rounded-full">
                      {appConfig.travelerFreeBadge || 'Travelers: FREE'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSignInContact('');
                      setSignInPassword('');
                      setCurrentRole('signin');
                    }}
                    style={{ backgroundColor: appConfig.primaryColor || '#234E40' }}
                    className="w-full py-4 hover:opacity-95 text-white rounded-xl font-bold text-sm md:text-base shadow transition flex items-center justify-center space-x-2"
                  >
                    <span>🔑</span>
                    <span>Sign In (Registered Members) →</span>
                  </button>

                  {appConfig.allowNewSignups !== false && (
                    <button
                      onClick={() => {
                        setRegForm({
                          name: '',
                          contact: '',
                          password: '',
                          confirmPassword: '',
                          role: 'traveler',
                          subscriptionPlanId: 'monthly',
                          momoRef: ''
                        });
                        setRegStep('details');
                        setUssdTriggered(false);
                        setEmailNotificationSent(false);
                        setCurrentRole('signup');
                      }}
                      className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 text-[#234E40] border border-[#3B6E5B]/30 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center space-x-2"
                    >
                      <span>📝</span>
                      <span>Create Account (New Sign Up)</span>
                    </button>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => {
                      setOwnerPinInput('');
                      setShowOwnerPinModal(true);
                    }}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs md:text-sm shadow-sm transition flex items-center justify-center space-x-2"
                  >
                    <span>👑</span>
                    <span>C.E.O Login ({ownerProfile.name})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edge-to-Edge Copyright Footer */}
        <footer className="w-full px-6 md:px-12 py-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2">
          <p className="text-xs font-medium text-slate-500">
            &copy; {new Date().getFullYear()} <strong className="text-slate-700">{ownerProfile.name}</strong>. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            {appConfig.appName} • {appConfig.footerLocation || 'Kigali, Rwanda'}
          </p>
        </footer>

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleOwnerLogin} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto text-lg">
                  🔐
                </div>
                <h3 className="font-bold text-base text-slate-900">C.E.O Authentication</h3>
                <p className="text-xs text-slate-500">Enter private password to unlock Owner HQ & App Server.</p>
              </div>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm text-center font-bold tracking-wider"
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOwnerPinModal(false);
                    setOwnerPinInput('');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#234E40] text-white rounded-xl text-xs font-bold"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 1B. FULL-BLEED CUSTOM DASHBOARD VIEW
  // =========================================================================
  if (currentRole === 'custom_dashboard_view') {
    const customDash = (appConfig.customDashboards || []).find((d) => d.id === activeCustomDashId);
    if (!customDash) {
      resetToWelcome();
      return null;
    }

    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="w-full text-white px-6 md:px-12 py-4 sticky top-0 z-30 shadow-sm flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{customDash.icon || '📊'}</span>
            <div>
              <h2 className="font-bold text-base md:text-lg">{customDash.name}</h2>
              <p className="text-xs text-emerald-200">{customDash.badge || appConfig.appName}</p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-black/30 hover:bg-black/40 px-4 py-2 rounded-full font-semibold">
            ← Back to Home
          </button>
        </div>

        <div className="w-full px-6 md:px-12 py-6 flex-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase text-[#3B6E5B]">{customDash.badge}</span>
            <h3 className="text-xl font-bold text-slate-900">{customDash.name}</h3>
            <p className="text-sm text-slate-600">{customDash.description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!customDashPostInput.title.trim()) return;
                  const newEntry = {
                    id: `item-${Date.now()}`,
                    title: customDashPostInput.title.trim(),
                    details: customDashPostInput.details.trim(),
                    priceOrMeta: customDashPostInput.priceOrMeta.trim(),
                    author: activeUser?.name || 'Member / Guest',
                    createdAt: Date.now()
                  };
                  const updatedDashboards = (appConfig.customDashboards || []).map((d) =>
                    d.id === customDash.id ? { ...d, items: [newEntry, ...(d.items || [])] } : d
                  );
                  const updatedCfg = { ...appConfig, customDashboards: updatedDashboards };
                  setAppConfig(updatedCfg);
                  setCustomDashPostInput({ title: '', details: '', priceOrMeta: '' });
                  await handleSaveAppServerConfig(updatedCfg);
                  alert('✓ Entry published to this dashboard!');
                }}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs"
              >
                <h4 className="font-bold text-sm text-[#234E40]">{customDash.actionTitle || 'Add New Entry'}</h4>
                <input
                  type="text"
                  required
                  placeholder="Title / Name"
                  value={customDashPostInput.title}
                  onChange={(e) => setCustomDashPostInput({ ...customDashPostInput, title: e.target.value })}
                  className="w-full p-3 border rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Rate / Contact / Location (Optional)"
                  value={customDashPostInput.priceOrMeta}
                  onChange={(e) => setCustomDashPostInput({ ...customDashPostInput, priceOrMeta: e.target.value })}
                  className="w-full p-3 border rounded-xl"
                />
                <textarea
                  rows="3"
                  placeholder={customDash.actionPlaceholder || 'Enter details...'}
                  value={customDashPostInput.details}
                  onChange={(e) => setCustomDashPostInput({ ...customDashPostInput, details: e.target.value })}
                  className="w-full p-3 border rounded-xl"
                />
                <button type="submit" style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="w-full py-3 text-white rounded-xl font-bold text-sm shadow">
                  + Publish Entry
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 space-y-3">
              <h4 className="font-bold text-sm text-slate-900">📋 Live Entries ({(customDash.items || []).length})</h4>
              {(customDash.items || []).length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-500">
                  No entries posted in {customDash.name} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(customDash.items || []).map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-1.5">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-sm text-slate-900">{item.title}</h5>
                        {item.priceOrMeta && (
                          <span className="bg-emerald-50 text-[#234E40] font-bold px-2 py-0.5 rounded-lg">{item.priceOrMeta}</span>
                        )}
                      </div>
                      {item.details && <p className="text-slate-600">{item.details}</p>}
                      <p className="text-[10px] text-slate-400">Posted by {item.author}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. FULL-BLEED WIDESCREEN SIGN IN VIEW
  // =========================================================================
  if (currentRole === 'signin') {
    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div className="w-full bg-white px-6 md:px-12 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-base md:text-lg text-slate-900">{appConfig.appName} — Secure Member Sign In</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full font-semibold text-slate-700">
            ← Home
          </button>
        </div>

        <div className="w-full px-6 md:px-12 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="hidden lg:block lg:col-span-6 space-y-4 pr-8">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-[#234E40]">
              Rwanda&apos;s Tourism Ecosystem
            </span>
            <h1 className="text-4xl font-extrabold text-slate-900 leading-tight">
              Welcome back to {appConfig.appName}
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              Sign in to manage bookings, respond to travelers, apply for guiding assignments, and collaborate securely across Rwanda.
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <form onSubmit={handleSignInSubmit} className="w-full max-w-lg bg-white p-6 md:p-8 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">Password Protected</span>
                <h3 className="text-xl font-bold text-slate-900">Sign In to Your Dashboard</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your registered Phone or Email and your password.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Phone Number or Email</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. +250780558555"
                  value={signInContact}
                  onChange={(e) => setSignInContact(e.target.value)}
                  className="w-full mt-1 p-3.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full mt-1 p-3.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <button type="submit" style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="w-full py-4 hover:opacity-95 text-white rounded-xl font-bold text-sm md:text-base shadow transition">
                Unlock Dashboard →
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. EXPIRED SUBSCRIPTION RENEWAL LOCKOUT VIEW
  // =========================================================================
  if (currentRole === 'renew_sub' && expiredUserAccount) {
    const selectedRenewalPlan = getPlanById(renewalPlanId);
    const renewalUssdDisplay = buildUssdDisplay(selectedRenewalPlan.price);
    const renewalUssdDialUri = buildUssdDialUri(selectedRenewalPlan.price);

    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div className="w-full bg-red-700 text-white px-6 md:px-12 py-4 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm md:text-base">🔒 Subscription Expired — Access Locked</h2>
            <p className="text-xs text-red-100">{expiredUserAccount.name} ({getRoleDisplayLabel(expiredUserAccount.role)})</p>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-red-900 px-4 py-2 rounded-full font-semibold">
            ← Home
          </button>
        </div>

        <div className="w-full px-6 md:px-12 py-8 flex-1 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            {!renewalSubmitted ? (
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs md:text-sm space-y-1">
                  <p className="font-bold text-red-900">Your previous subscription plan has ended.</p>
                  <p className="text-red-800">
                    Account access is revoked until you subscribe to a new plan via MTN MoMo below.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">Choose New Subscription Plan:</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subscriptionPlans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setRenewalPlanId(plan.id);
                          setUssdTriggered(false);
                        }}
                        className={`p-3.5 rounded-xl border-2 text-left flex justify-between items-center transition ${
                          renewalPlanId === plan.id
                            ? 'border-[#234E40] bg-emerald-50/70'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            plan.id === 'gold_platinum_year' ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {plan.badge}
                          </span>
                          <p className="font-bold text-xs text-slate-900 mt-1">{plan.name}</p>
                          <p className="text-[11px] text-slate-500">{plan.durationLabel}</p>
                        </div>
                        <span className="font-extrabold text-sm text-[#234E40]">
                          {Number(plan.price).toLocaleString()} RWF
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-2 text-center">
                  <p className="text-xs font-bold text-slate-700">
                    Tap to pay <strong>{Number(selectedRenewalPlan.price).toLocaleString()} RWF</strong> automatically:
                  </p>
                  <a
                    href={renewalUssdDialUri}
                    onClick={() => setUssdTriggered(true)}
                    className="block w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-extrabold text-sm tracking-wide shadow border-2 border-amber-500"
                  >
                    📞 {renewalUssdDisplay}
                  </a>
                  {ussdTriggered && (
                    <p className="text-xs font-bold text-emerald-800 bg-emerald-100 py-1.5 px-2.5 rounded-lg">
                      ✓ Dialer launched! Enter MoMo PIN on your phone, then enter reference below.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">MoMo Transaction ID / Confirmation SMS Ref</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MP261116.2051.B98765"
                    value={renewalMomoRef}
                    onChange={(e) => setRenewalMomoRef(e.target.value)}
                    className="w-full mt-1 p-3.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSubmittingPayment}
                  onClick={handleCompleteRenewalPayment}
                  className="w-full py-4 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition"
                >
                  {isSubmittingPayment ? '⏳ Notifying C.E.O...' : '✓ Renewal Paid — Notify C.E.O to Unlock'}
                </button>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl border text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 bg-emerald-100 text-[#234E40] rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900">Renewal Payment Submitted</h3>
                <p className="text-sm text-slate-600">
                  Your renewal for <strong>{selectedRenewalPlan.name}</strong> ({Number(selectedRenewalPlan.price).toLocaleString()} RWF) has been sent to C.E.O <strong>{ownerProfile.name}</strong> ({ownerProfile.email}). Once confirmed, sign in to access your dashboard.
                </p>
                <button onClick={resetToWelcome} className="w-full py-3.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm">
                  Return to Home Screen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. FULL-BLEED WIDESCREEN SIGN UP VIEW
  // =========================================================================
  if (currentRole === 'signup') {
    const selectedPlan = getPlanById(regForm.subscriptionPlanId);
    const activeUssdDisplay = buildUssdDisplay(selectedPlan.price);
    const activeUssdDialUri = buildUssdDialUri(selectedPlan.price);

    const manualMailtoHref = `mailto:${encodeURIComponent(
      ownerProfile.email || 'rutungurab5@gmail.com'
    )}?subject=${encodeURIComponent(
      `${appConfig.appName} Subscription Alert: ${regForm.name} (${selectedPlan.name})`
    )}&body=${encodeURIComponent(
      `Hello C.E.O ${ownerProfile.name},\n\nI have completed my ${Number(selectedPlan.price).toLocaleString()} RWF subscription payment via USSD ${activeUssdDisplay}.\n\n- Name: ${regForm.name}\n- Role: ${getRoleDisplayLabel(regForm.role)}\n- Plan: ${selectedPlan.name} (${selectedPlan.durationLabel})\n- Contact: ${regForm.contact}\n- MoMo Reference: ${regForm.momoRef}\n\nPlease approve my ${appConfig.appName} account.`
    )}`;

    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div className="w-full bg-white px-6 md:px-12 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-base md:text-lg text-slate-900">{appConfig.appName} — Create New Account</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full font-semibold text-slate-700">
            ← Home
          </button>
        </div>

        <div className="w-full px-6 md:px-12 py-8 flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            {regStep === 'details' && (
              <form onSubmit={handleSignUpSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">New Registration</span>
                  <h3 className="text-xl font-bold text-slate-900">Join {appConfig.appName}</h3>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">
                    Travelers join <strong>FREE</strong>. Tourism Graduates, Travel Agencies & Tour Companies select a subscription plan.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Full Name or Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alice Uwase"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Phone Number or Email</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +250788000000"
                      value={regForm.contact}
                      onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Create Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••"
                      value={regForm.confirmPassword}
                      onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Select Account Role</label>
                    <select
                      value={regForm.role}
                      onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm bg-white font-semibold"
                    >
                      <option value="traveler">🧳 Traveler (FREE Instant Access)</option>
                      <option value="graduate">🎓 Tourism Graduate (Guide / Consultant)</option>
                      <option value="agency">🏢 Travel Agency</option>
                      <option value="tour_company">🚐 Tour Company (Safari Operator)</option>
                      {(appConfig.customDashboards || []).map((cd) => (
                        <option key={cd.id} value={cd.id}>{cd.icon || '📊'} {cd.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {regForm.role !== 'traveler' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-[#234E40] block">
                      💳 Choose Your Subscription Plan:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subscriptionPlans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setRegForm({ ...regForm, subscriptionPlanId: plan.id })}
                          className={`p-3.5 rounded-xl border-2 text-left flex justify-between items-center transition ${
                            regForm.subscriptionPlanId === plan.id
                              ? 'border-[#234E40] bg-emerald-50/80 shadow-sm'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                plan.id === 'gold_platinum_year'
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {plan.badge}
                            </span>
                            <p className="font-bold text-xs text-slate-900 mt-1">{plan.name}</p>
                            <p className="text-[11px] text-slate-500">{plan.durationLabel}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-[#234E40]">
                              {Number(plan.price).toLocaleString()} RWF
                            </span>
                            {regForm.subscriptionPlanId === plan.id && (
                              <p className="text-[10px] font-bold text-emerald-700">✓ Selected</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" style={{ backgroundColor: appConfig.secondaryColor || '#3B6E5B' }} className="w-full py-4 text-white rounded-xl font-bold text-sm md:text-base shadow">
                  {regForm.role === 'traveler'
                    ? 'Complete Free Sign Up →'
                    : `Proceed to Pay ${Number(selectedPlan.price).toLocaleString()} RWF (${selectedPlan.name}) →`}
                </button>
              </form>
            )}

            {regStep === 'pay_subscription' && (
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 space-y-5 shadow-sm max-w-2xl mx-auto">
                <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl space-y-2.5 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full">
                    {selectedPlan.name} • {selectedPlan.durationLabel}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Tap Below to Pay {Number(selectedPlan.price).toLocaleString()} RWF Automatically
                  </h3>
                  <p className="text-xs text-slate-600">
                    Clicking the code below automatically launches your phone dialer to complete your subscription payment:
                  </p>

                  <a
                    href={activeUssdDialUri}
                    onClick={() => setUssdTriggered(true)}
                    className="block w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-500 active:scale-[0.99] text-slate-950 rounded-xl font-extrabold text-base tracking-wide shadow-md transition border-2 border-amber-500"
                  >
                    📞 {activeUssdDisplay}
                  </a>

                  <div className="flex justify-center space-x-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(activeUssdDisplay);
                          alert(`✓ Copied ${activeUssdDisplay} to clipboard!`);
                        }
                      }}
                      className="text-xs font-bold text-[#234E40] bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      📋 Copy USSD Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegStep('details')}
                      className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      ↺ Change Plan
                    </button>
                  </div>

                  {ussdTriggered && (
                    <p className="text-xs font-bold text-emerald-800 bg-emerald-100 py-1.5 px-2.5 rounded-lg">
                      ✓ Phone dialer launched! Enter your MoMo PIN on your phone, then confirm below.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">MoMo Transaction ID / Confirmation SMS Ref</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MP261116.2051.A12345"
                    value={regForm.momoRef}
                    onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })}
                    className="w-full mt-1 p-3.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSubmittingPayment}
                  onClick={handleCompleteSubscriptionPayment}
                  className="w-full py-4 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition"
                >
                  {isSubmittingPayment
                    ? '⏳ Sending Real-Time Notification to C.E.O...'
                    : '✓ Payment Completed — Notify C.E.O Email'}
                </button>
              </div>
            )}

            {regStep === 'pending_approval' && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm max-w-xl mx-auto">
                <div className="w-14 h-14 bg-emerald-100 text-[#234E40] rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900">Subscription Recorded & C.E.O Notified</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your <strong>{selectedPlan.name}</strong> ({Number(selectedPlan.price).toLocaleString()} RWF) payment via <strong>{activeUssdDisplay}</strong> (Ref: <strong>{regForm.momoRef}</strong>) is saved.
                  {emailNotificationSent
                    ? ` A real-time email notification has been sent to C.E.O ${ownerProfile.name} (${ownerProfile.email}).`
                    : ` C.E.O ${ownerProfile.name} (${ownerProfile.email}) has been alerted in Owner HQ.`}
                </p>

                <a
                  href={manualMailtoHref}
                  className="block w-full py-3 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl font-bold text-xs border border-amber-300 transition"
                >
                  📧 Send Direct Email Copy to {ownerProfile.email}
                </a>

                <button onClick={resetToWelcome} className="w-full py-3.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow">
                  Return to Home Screen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. FULL-BLEED WIDESCREEN C.E.O OWNER HQ VIEW
  // =========================================================================
  if (currentRole === 'owner') {
    const totalRegFees = registeredUsers.reduce((sum, u) => sum + (u.feePaid || 0), 0);
    const totalAdRevenue = (appConfig.ads || []).reduce((sum, ad) => sum + (Number(ad.adFeePaid) || 0), 0);
    const grandTotalRevenue = totalRegFees + totalAdRevenue;
    const pendingCount = registeredUsers.filter((u) => u.status === 'pending_approval').length;

    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden relative">
        {renderPopupAdModal()}
        <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="w-full text-white px-6 md:px-12 py-4 sticky top-0 z-30 shadow-sm flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {ownerProfile.photo ? (
              <img src={ownerProfile.photo} alt="C.E.O" className="w-11 h-11 rounded-full object-cover border-2 border-amber-400" />
            ) : (
              <div className="w-11 h-11 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">👑</div>
            )}
            <div>
              <h2 className="font-bold text-sm md:text-base">{ownerProfile.name} <span className="text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-extrabold ml-1">C.E.O</span></h2>
              <p className="text-[11px] text-emerald-200">{ownerProfile.contact} • MoMo: {MOMO_PAYMENT_CODE}</p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-black/30 hover:bg-black/40 px-4 py-2 rounded-full font-semibold">Log Out</button>
        </div>

        {/* Full-Width 9-Tab Navigation Bar */}
        <div className="w-full bg-white border-b border-slate-200 sticky top-[76px] z-20 shadow-sm px-3 md:px-12 py-2">
          <div className="w-full grid grid-cols-9 gap-1 text-center">
            <button onClick={() => setOwnerTab('pending')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center relative ${ownerTab === 'pending' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}>
              <span className="text-sm">⏳</span><span className="text-[9px] md:text-xs">SignUps</span>
              {pendingCount > 0 && <span className="bg-red-600 text-white text-[8px] px-1.5 rounded-full">{pendingCount}</span>}
            </button>
            <button
              onClick={() => {
                setOwnerTab('users_mgmt');
                if (registeredUsers.length > 0 && !selectedManagedUserId) {
                  handleSelectUserForAdminEdit(registeredUsers[0]);
                }
              }}
              className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center ${ownerTab === 'users_mgmt' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}
            >
              <span className="text-sm">👥</span><span className="text-[9px] md:text-xs">Users</span>
            </button>
            <button onClick={() => setOwnerTab('advertising')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center relative ${ownerTab === 'advertising' ? 'bg-amber-100 text-amber-950 font-bold' : 'text-slate-500'}`}>
              <span className="text-sm">📢</span><span className="text-[9px] md:text-xs">Ads</span>
              {(appConfig.ads || []).length > 0 && (
                <span className="bg-[#234E40] text-white text-[8px] px-1.5 rounded-full">{(appConfig.ads || []).length}</span>
              )}
            </button>
            <button onClick={() => setOwnerTab('app_server')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center ${ownerTab === 'app_server' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}>
              <span className="text-sm">🖥️</span><span className="text-[9px] md:text-xs">Server</span>
            </button>
            <button onClick={() => setOwnerTab('plans_mgmt')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center ${ownerTab === 'plans_mgmt' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}>
              <span className="text-sm">💳</span><span className="text-[9px] md:text-xs">Plans</span>
            </button>
            <button onClick={() => setOwnerTab('overview')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center ${ownerTab === 'overview' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">📊</span><span className="text-[9px] md:text-xs">Money</span></button>
            <button onClick={() => setOwnerTab('vip')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center ${ownerTab === 'vip' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">⭐</span><span className="text-[9px] md:text-xs">VIP</span></button>
            <button onClick={() => setOwnerTab('deals')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center ${ownerTab === 'deals' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">🎛️</span><span className="text-[9px] md:text-xs">Roles</span></button>
            <button onClick={() => setOwnerTab('owner_profile')} className={`p-2 rounded-xl flex flex-col md:flex-row md:justify-center md:space-x-1 items-center ${ownerTab === 'owner_profile' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">👤</span><span className="text-[9px] md:text-xs">Me</span></button>
          </div>
        </div>

        {/* Full-Width Content Body */}
        <div className="w-full px-6 md:px-12 py-6 space-y-5 flex-1 pb-12">
          {ownerTab === 'advertising' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-[#234E40] text-slate-950 p-6 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] uppercase font-extrabold bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-full">
                  C.E.O Advertising Studio
                </span>
                <h3 className="font-extrabold text-lg md:text-xl pt-1 text-slate-950">
                  📢 Sponsored Popup Ads Generator
                </h3>
                <p className="text-xs md:text-sm text-slate-900 font-medium">
                  Generate spotlight pop-up ads for subscribed partners that appear dynamically across the platform.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newAdForm.advertiserName.trim() || !newAdForm.headline.trim()) {
                      alert('Please select or enter the Company/Guide Name and Ad Headline.');
                      return;
                    }
                    const createdAd = {
                      id: `ad-${Date.now()}`,
                      advertiserId: newAdForm.advertiserId || '',
                      advertiserName: newAdForm.advertiserName.trim(),
                      advertiserRoleLabel: newAdForm.advertiserRoleLabel.trim(),
                      advertiserContact: newAdForm.advertiserContact.trim(),
                      headline: newAdForm.headline.trim(),
                      description: newAdForm.description.trim(),
                      badge: newAdForm.badge.trim() || 'Featured Partner',
                      ctaLabel: newAdForm.ctaLabel.trim() || 'Book / Inquire',
                      imageUrl: newAdForm.imageUrl || '',
                      targetAudience: newAdForm.targetAudience || 'all',
                      adFeePaid: Number(newAdForm.adFeePaid) || 0,
                      active: true,
                      createdAt: Date.now()
                    };
                    const updatedCfg = {
                      ...appConfig,
                      ads: [createdAd, ...(appConfig.ads || [])]
                    };
                    setAppConfig(updatedCfg);
                    setNewAdForm({
                      advertiserId: '',
                      advertiserName: '',
                      advertiserRoleLabel: '',
                      advertiserContact: '',
                      headline: '',
                      description: '',
                      badge: 'Featured Partner',
                      ctaLabel: 'Book / Inquire',
                      imageUrl: '',
                      targetAudience: 'all',
                      adFeePaid: 0,
                      active: true
                    });
                    await handleSaveAppServerConfig(updatedCfg);
                    alert(`✓ Sponsored Pop-up Ad for "${createdAd.advertiserName}" published live!`);
                  }}
                  className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3.5"
                >
                  <h4 className="font-bold text-sm text-[#234E40] border-b pb-2">✨ Generate New Pop-up Ad</h4>

                  <div>
                    <label className="font-bold text-slate-700 block">
                      1. Select Paid Company or Guide ({eligiblePaidAdvertisers.length} Active)
                    </label>
                    <select
                      value={newAdForm.advertiserId}
                      onChange={(e) => {
                        const chosenId = e.target.value;
                        const found = eligiblePaidAdvertisers.find((item) => item.id === chosenId);
                        if (found) {
                          setNewAdForm({
                            ...newAdForm,
                            advertiserId: found.id,
                            advertiserName: found.name,
                            advertiserRoleLabel: found.roleLabel,
                            advertiserContact: found.contact,
                            headline: found.headline || `${found.name} — Verified Rwanda Tours & Guiding`,
                            imageUrl: found.photo || newAdForm.imageUrl
                          });
                        } else {
                          setNewAdForm({ ...newAdForm, advertiserId: '' });
                        }
                      }}
                      className="w-full mt-1 p-2.5 border rounded-xl bg-amber-50/50 font-semibold text-slate-900"
                    >
                      <option value="">-- Choose a Subscribed Company / Guide --</option>
                      {eligiblePaidAdvertisers.map((adv) => (
                        <option key={adv.id} value={adv.id}>
                          {adv.name} ({adv.roleLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-slate-700">Advertiser Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Echo Travels Ltd."
                        value={newAdForm.advertiserName}
                        onChange={(e) => setNewAdForm({ ...newAdForm, advertiserName: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Contact / Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. +250780558555"
                        value={newAdForm.advertiserContact}
                        onChange={(e) => setNewAdForm({ ...newAdForm, advertiserContact: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">2. Ad Headline / Promo Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 20% Off Nyungwe Canopy & Gorilla Safaris!"
                      value={newAdForm.headline}
                      onChange={(e) => setNewAdForm({ ...newAdForm, headline: e.target.value })}
                      className="w-full mt-1 p-2.5 border rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Short Ad Description</label>
                    <textarea
                      rows="2"
                      placeholder="Highlight packages, 4x4 fleet, languages spoken..."
                      value={newAdForm.description}
                      onChange={(e) => setNewAdForm({ ...newAdForm, description: e.target.value })}
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1.5">
                    <label className="font-extrabold text-[#234E40] block">
                      🎯 3. Target Audience Control
                    </label>
                    <select
                      value={newAdForm.targetAudience}
                      onChange={(e) => setNewAdForm({ ...newAdForm, targetAudience: e.target.value })}
                      className="w-full p-2.5 border border-emerald-300 rounded-xl bg-white font-bold text-slate-900"
                    >
                      <option value="all">🌍 Everyone</option>
                      <option value="welcome">🏠 Welcome Home Screen Only</option>
                      <option value="traveler">🧳 Travelers Only</option>
                      <option value="partners">🏢 Agencies & Tour Companies Only</option>
                      <option value="graduate">🎓 Tourism Graduates Only</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-bold text-slate-700">Badge Tag</label>
                      <input
                        type="text"
                        placeholder="Sponsored"
                        value={newAdForm.badge}
                        onChange={(e) => setNewAdForm({ ...newAdForm, badge: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Button Text</label>
                      <input
                        type="text"
                        placeholder="Book Now"
                        value={newAdForm.ctaLabel}
                        onChange={(e) => setNewAdForm({ ...newAdForm, ctaLabel: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Ad Fee (RWF)</label>
                      <input
                        type="number"
                        min="0"
                        value={newAdForm.adFeePaid}
                        onChange={(e) => setNewAdForm({ ...newAdForm, adFeePaid: Number(e.target.value) })}
                        className="w-full mt-1 p-2.5 border rounded-xl font-bold text-[#234E40]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border">
                    <span className="font-bold text-slate-700">Ad Image:</span>
                    <label className="cursor-pointer bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold">
                      📷 {newAdForm.imageUrl ? 'Change Image' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, (imgData) => setNewAdForm({ ...newAdForm, imageUrl: imgData }))}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition"
                  >
                    {isSaving ? '⏳ Publishing Ad...' : '🚀 Publish Pop-up Ad Live'}
                  </button>
                </form>

                <div className="lg:col-span-7 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-slate-900">
                      📋 Active Pop-up Ads ({(appConfig.ads || []).length})
                    </h4>
                    <span className="text-[11px] font-bold text-[#234E40]">
                      Ad Revenue: RWF {totalAdRevenue.toLocaleString()}
                    </span>
                  </div>

                  {(appConfig.ads || []).length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border text-center text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 text-sm">No Ads Published Yet</p>
                      <p>Use the generator on the left to create pop-up ads.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(appConfig.ads || []).map((ad) => (
                        <div
                          key={ad.id}
                          className={`bg-white p-4 rounded-2xl border-2 space-y-2.5 shadow-sm flex flex-col justify-between ${
                            ad.active !== false ? 'border-amber-300' : 'border-slate-200 opacity-75'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center space-x-2.5">
                                {ad.imageUrl ? (
                                  <img src={ad.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover border" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                                    📢
                                  </div>
                                )}
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                                    {ad.badge}
                                  </span>
                                  <h5 className="font-bold text-sm text-slate-900 mt-0.5">{ad.headline}</h5>
                                  <p className="text-[11px] font-semibold text-[#234E40]">{ad.advertiserName}</p>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  ad.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {ad.active !== false ? '🟢 Live' : '⏸️ Paused'}
                              </span>
                            </div>

                            {ad.description && <p className="text-slate-600">{ad.description}</p>}
                          </div>

                          <div className="flex space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const updatedAds = appConfig.ads.map((item) =>
                                  item.id === ad.id ? { ...item, active: item.active === false } : item
                                );
                                const updatedCfg = { ...appConfig, ads: updatedAds };
                                setAppConfig(updatedCfg);
                                await handleSaveAppServerConfig(updatedCfg);
                              }}
                              className={`flex-1 py-2 rounded-xl font-bold ${
                                ad.active !== false
                                  ? 'bg-amber-100 text-amber-950 hover:bg-amber-200'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {ad.active !== false ? '⏸️ Pause Ad' : '▶️ Resume Live'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const updatedAds = appConfig.ads.filter((item) => item.id !== ad.id);
                                const updatedCfg = { ...appConfig, ads: updatedAds };
                                setAppConfig(updatedCfg);
                                await handleSaveAppServerConfig(updatedCfg);
                              }}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {ownerTab === 'app_server' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-950 via-[#234E40] to-[#3B6E5B] text-white p-6 rounded-2xl shadow-sm space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                    No-Code App Server & Builder
                  </span>
                  <span className="text-xs font-bold text-emerald-300">🟢 Cloud Synced</span>
                </div>
                <h3 className="font-bold text-lg md:text-xl pt-1">🖥️ Live Web App Studio, Dashboards & Features Builder</h3>
              </div>

              <div className="grid grid-cols-5 gap-2 bg-white p-2 rounded-2xl border text-[10px] md:text-xs font-bold text-center shadow-sm">
                <button
                  type="button"
                  onClick={() => setServerSubTab('branding')}
                  className={`py-2.5 rounded-xl ${serverSubTab === 'branding' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
                >
                  🎨 Branding
                </button>
                <button
                  type="button"
                  onClick={() => setServerSubTab('dashboards')}
                  className={`py-2.5 rounded-xl ${serverSubTab === 'dashboards' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
                >
                  📊 Dashboards
                </button>
                <button
                  type="button"
                  onClick={() => setServerSubTab('features')}
                  className={`py-2.5 rounded-xl ${serverSubTab === 'features' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
                >
                  ✨ Features
                </button>
                <button
                  type="button"
                  onClick={() => setServerSubTab('content')}
                  className={`py-2.5 rounded-xl ${serverSubTab === 'content' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
                >
                  📢 Content
                </button>
                <button
                  type="button"
                  onClick={() => setServerSubTab('controls')}
                  className={`py-2.5 rounded-xl ${serverSubTab === 'controls' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
                >
                  ⚙️ Server
                </button>
              </div>

              {serverSubTab === 'branding' && (
                <div className="bg-white p-6 rounded-2xl border space-y-4 text-xs shadow-sm w-full">
                  <h4 className="font-bold text-sm text-[#234E40] border-b pb-2">🎨 App Identity, Colors & USSD Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700">Platform / App Name</label>
                      <input
                        type="text"
                        value={appConfig.appName}
                        onChange={(e) => setAppConfig({ ...appConfig, appName: e.target.value })}
                        className="w-full mt-1 p-3 border rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Main Hero Tagline</label>
                      <input
                        type="text"
                        value={appConfig.tagline}
                        onChange={(e) => setAppConfig({ ...appConfig, tagline: e.target.value })}
                        className="w-full mt-1 p-3 border rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Platform Subtitle / Description</label>
                    <textarea
                      rows="2"
                      value={appConfig.subtitle}
                      onChange={(e) => setAppConfig({ ...appConfig, subtitle: e.target.value })}
                      className="w-full mt-1 p-3 border rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700">MTN MoMo Merchant Code</label>
                      <input
                        type="text"
                        value={appConfig.momoCode}
                        onChange={(e) => setAppConfig({ ...appConfig, momoCode: e.target.value })}
                        className="w-full mt-1 p-3 border rounded-xl font-mono font-bold text-[#234E40]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Primary Theme Color</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          value={appConfig.primaryColor || '#234E40'}
                          onChange={(e) => setAppConfig({ ...appConfig, primaryColor: e.target.value })}
                          className="w-11 h-11 rounded border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={appConfig.primaryColor || '#234E40'}
                          onChange={(e) => setAppConfig({ ...appConfig, primaryColor: e.target.value })}
                          className="flex-1 p-3 border rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      await handleSaveAppServerConfig();
                      alert('✓ App branding, theme & USSD settings published live!');
                    }}
                    className="w-full py-3.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition"
                  >
                    {isSaving ? '⏳ Publishing...' : '🚀 Publish Live App Changes'}
                  </button>
                </div>
              )}

              {serverSubTab === 'dashboards' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl border space-y-3 shadow-sm">
                    <h4 className="font-bold text-sm text-[#234E40]">📊 Create a New Dashboard / Partner Hub</h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="font-bold text-slate-700">Icon</label>
                        <input
                          type="text"
                          value={newDashboardForm.icon}
                          onChange={(e) => setNewDashboardForm({ ...newDashboardForm, icon: e.target.value })}
                          className="w-full mt-1 p-2.5 border rounded-xl text-center text-base"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="font-bold text-slate-700">New Dashboard Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Hotels & Eco-Lodges Hub"
                          value={newDashboardForm.name}
                          onChange={(e) => setNewDashboardForm({ ...newDashboardForm, name: e.target.value })}
                          className="w-full mt-1 p-2.5 border rounded-xl font-bold"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newDashboardForm.name.trim()) {
                          alert('Please enter a name for the new dashboard.');
                          return;
                        }
                        const createdDash = {
                          id: `dash_${Date.now()}`,
                          name: newDashboardForm.name.trim(),
                          icon: newDashboardForm.icon || '📊',
                          badge: newDashboardForm.badge.trim() || 'Partner Hub',
                          description: newDashboardForm.description.trim(),
                          actionTitle: newDashboardForm.actionTitle.trim() || 'Add New Listing',
                          actionPlaceholder: 'Enter full details, pricing, and contact...',
                          showOnWelcome: newDashboardForm.showOnWelcome !== false,
                          items: []
                        };
                        const updated = {
                          ...appConfig,
                          customDashboards: [...(appConfig.customDashboards || []), createdDash]
                        };
                        setAppConfig(updated);
                        setNewDashboardForm({
                          name: '',
                          icon: '🏨',
                          badge: 'New Partner Hub',
                          description: '',
                          actionTitle: 'Submit Listing / Request',
                          actionPlaceholder: 'Enter details...',
                          showOnWelcome: true,
                          items: []
                        });
                        await handleSaveAppServerConfig(updated);
                        alert(`✓ New Dashboard "${createdDash.name}" created and published live!`);
                      }}
                      className="w-full py-3 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow"
                    >
                      + Create & Launch New Dashboard
                    </button>
                  </div>

                  <div className="lg:col-span-6 space-y-3">
                    <h4 className="font-bold text-sm text-slate-900">🗂️ Active Custom Dashboards ({(appConfig.customDashboards || []).length})</h4>
                    {(appConfig.customDashboards || []).map((cd) => (
                      <div key={cd.id} className="bg-white p-4 rounded-2xl border space-y-2 shadow-sm flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">{cd.badge}</span>
                          <h5 className="font-bold text-sm text-slate-900">{cd.icon} {cd.name}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const updated = {
                              ...appConfig,
                              customDashboards: appConfig.customDashboards.filter((d) => d.id !== cd.id)
                            };
                            setAppConfig(updated);
                            await handleSaveAppServerConfig(updated);
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl font-bold"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {serverSubTab === 'features' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl border space-y-3 shadow-sm">
                    <h4 className="font-bold text-sm text-[#234E40]">✨ Add New Interactive App Feature</h4>
                    <input
                      type="text"
                      placeholder="Feature Title (e.g. Calculator)"
                      value={newFeatureForm.title}
                      onChange={(e) => setNewFeatureForm({ ...newFeatureForm, title: e.target.value })}
                      className="w-full p-2.5 border rounded-xl font-bold"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newFeatureForm.title.trim()) return;
                        const createdFeat = {
                          id: `feat-${Date.now()}`,
                          title: newFeatureForm.title.trim(),
                          icon: newFeatureForm.icon || '✨',
                          featureType: newFeatureForm.featureType,
                          targetRole: newFeatureForm.targetRole,
                          description: newFeatureForm.description.trim(),
                          buttonLabel: 'Submit',
                          linkUrl: '',
                          unitPriceRwf: 50000,
                          checklistItems: ['Step 1']
                        };
                        const updated = {
                          ...appConfig,
                          customFeatures: [...(appConfig.customFeatures || []), createdFeat]
                        };
                        setAppConfig(updated);
                        await handleSaveAppServerConfig(updated);
                        alert('✓ Feature added live!');
                      }}
                      className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold shadow"
                    >
                      + Publish Feature
                    </button>
                  </div>
                </div>
              )}

              {serverSubTab === 'content' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl border space-y-3 shadow-sm">
                    <h4 className="font-bold text-sm text-[#234E40]">📢 Publish Announcements</h4>
                    <input
                      type="text"
                      placeholder="Title"
                      value={newAnnouncementForm.title}
                      onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, title: e.target.value })}
                      className="w-full p-2.5 border rounded-xl"
                    />
                    <textarea
                      rows="2"
                      placeholder="Body..."
                      value={newAnnouncementForm.body}
                      onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, body: e.target.value })}
                      className="w-full p-2.5 border rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newAnnouncementForm.title.trim()) return;
                        const updated = {
                          ...appConfig,
                          announcements: [
                            {
                              id: `ann-${Date.now()}`,
                              title: newAnnouncementForm.title.trim(),
                              body: newAnnouncementForm.body.trim(),
                              targetRole: newAnnouncementForm.targetRole
                            },
                            ...(appConfig.announcements || [])
                          ]
                        };
                        setAppConfig(updated);
                        await handleSaveAppServerConfig(updated);
                        alert('✓ Announcement published!');
                      }}
                      className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold"
                    >
                      + Post Announcement
                    </button>
                  </div>
                </div>
              )}

              {serverSubTab === 'controls' && (
                <div className="bg-white p-6 rounded-2xl border space-y-4 text-xs shadow-sm w-full">
                  <h4 className="font-bold text-sm text-[#234E40] border-b pb-1.5">⚙️ Server Switches & Database Controls</h4>
                  <button
                    type="button"
                    onClick={async () => {
                      await loadFirebaseData();
                      alert('✓ Live Firebase data refreshed!');
                    }}
                    className="py-3 px-4 bg-emerald-50 border text-[#234E40] rounded-xl font-bold"
                  >
                    🔄 Sync Cloud Now
                  </button>
                </div>
              )}
            </div>
          )}

          {ownerTab === 'pending' && (
            <div className="space-y-3">
              <h3 className="font-bold text-base text-slate-900">⏳ Member Sign-Ups & Subscriptions</h3>
              {registeredUsers.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border text-center text-xs text-slate-500">No sign-ups logged yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {registeredUsers.map((user) => {
                    const expired = isUserSubscriptionExpired(user);
                    return (
                      <div key={user.id} className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs shadow-sm flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-sm">{user.name} <span className="text-slate-500 font-normal">({getRoleDisplayLabel(user.role)})</span></p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              expired
                                ? 'bg-amber-100 text-amber-800'
                                : user.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {expired ? '⚠️ Expired' : user.status === 'approved' ? '🟢 Active' : '🔒 Revoked'}
                            </span>
                          </div>
                          <p className="text-slate-500">{user.contact} • Paid: {Number(user.feePaid || 0).toLocaleString()} RWF</p>
                        </div>
                        
                        <div className="flex space-x-1.5 pt-2">
                          {user.status !== 'approved' || expired ? (
                            <button onClick={() => toggleUserAccessStatus(user.id, user.contact, 'revoked')} className="flex-1 py-2 bg-[#3B6E5B] text-white rounded-xl font-bold">
                              ✓ Grant
                            </button>
                          ) : (
                            <button onClick={() => toggleUserAccessStatus(user.id, user.contact, user.status)} className="flex-1 py-2 bg-amber-600 text-white rounded-xl font-bold">
                              ✕ Revoke
                            </button>
                          )}
                          <button onClick={() => { handleSelectUserForAdminEdit(user); setOwnerTab('users_mgmt'); }} className="px-3 py-2 bg-slate-100 rounded-xl font-bold">✏️</button>
                          <button onClick={() => handleDeleteUserAccount(user.id, user.name)} className="px-3 py-2 bg-red-600 text-white rounded-xl font-bold">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {ownerTab === 'plans_mgmt' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full">Pricing Control</span>
                <h3 className="font-bold text-base md:text-lg pt-1">💳 Edit Subscription Names & Costs</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {subscriptionPlans.map((plan, index) => (
                  <div key={plan.id} className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs shadow-sm">
                    <span className="font-extrabold text-[#234E40]">Tier #{index + 1}</span>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubscriptionPlans(subscriptionPlans.map((p) => (p.id === plan.id ? { ...p, name: val } : p)));
                      }}
                      className="w-full p-2.5 border rounded-xl font-semibold"
                    />
                    <input
                      type="number"
                      min="0"
                      value={plan.price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSubscriptionPlans(subscriptionPlans.map((p) => (p.id === plan.id ? { ...p, price: val } : p)));
                      }}
                      className="w-full p-2.5 border rounded-xl font-extrabold text-[#234E40]"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSubscriptionPlans}
                className="w-full py-3.5 bg-[#234E40] text-white rounded-xl font-bold text-sm shadow"
              >
                💾 Save Plans
              </button>
            </div>
          )}

          {ownerTab === 'users_mgmt' && (
            <div className="space-y-4">
              {registeredUsers.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border text-center text-xs text-slate-500">No users found.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 bg-white p-5 rounded-2xl border space-y-3 text-xs h-fit">
                    <select
                      value={selectedManagedUserId}
                      onChange={(e) => {
                        const found = registeredUsers.find((u) => u.id === e.target.value);
                        if (found) handleSelectUserForAdminEdit(found);
                      }}
                      className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold"
                    >
                      <option value="">-- Choose member --</option>
                      {registeredUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.contact})</option>
                      ))}
                    </select>
                  </div>

                  {ownerUserEditForm && (
                    <form onSubmit={handleOwnerSaveManagedUser} className="lg:col-span-8 bg-white p-6 rounded-2xl border space-y-4 text-xs">
                      <input
                        type="text"
                        value={ownerUserEditForm.name}
                        onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, name: e.target.value })}
                        className="w-full p-2.5 border rounded-xl"
                      />
                      <button type="submit" className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold">💾 Save User</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {ownerTab === 'overview' && (
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-8 rounded-2xl text-center space-y-1">
              <span className="text-xs uppercase text-emerald-200 font-bold">Total Platform Revenue</span>
              <div className="text-4xl font-extrabold">RWF {grandTotalRevenue.toLocaleString()}</div>
            </div>
          )}

          {ownerTab === 'vip' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">⭐ VIP Access Control</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {exemptAccounts.map((acc) => (
                  <div key={acc.id} className="bg-white p-5 rounded-2xl border space-y-2 text-xs">
                    <p className="font-bold text-[#234E40]">{acc.tier}</p>
                    <button onClick={() => toggleVipTierAccess(acc.id)} className={`w-full py-2.5 rounded-xl font-bold ${acc.confirmed ? 'bg-red-600 text-white' : 'bg-[#3B6E5B] text-white'}`}>
                      {acc.confirmed ? 'Revoke' : 'Grant'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ownerTab === 'deals' && (
            <div className="bg-white p-6 rounded-2xl border space-y-3 text-xs font-bold">
              <h3 className="font-bold text-sm text-slate-900">🎛️ Preview Dashboards</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'graduate' }); setCurrentRole('graduate'); setActiveTab('jobs'); }} className="p-4 bg-emerald-50 text-[#234E40] border rounded-xl">🎓 Graduate</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'agency' }); setCurrentRole('agency'); setActiveTab('jobs'); }} className="p-4 bg-emerald-50 text-[#234E40] border rounded-xl">🏢 Agency</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'tour_company' }); setCurrentRole('tour_company'); setActiveTab('jobs'); }} className="p-4 bg-emerald-50 text-[#234E40] border rounded-xl">🚐 Tour Co.</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'traveler' }); setCurrentRole('traveler'); setActiveTab('jobs'); }} className="p-4 bg-emerald-50 text-[#234E40] border rounded-xl">🧳 Traveler</button>
              </div>
            </div>
          )}

          {ownerTab === 'owner_profile' && (
            <div className="bg-white p-6 rounded-2xl border space-y-4 max-w-3xl">
              <input type="text" value={ownerProfile.name} onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })} className="w-full p-3 border rounded-xl text-xs" />
              <button type="button" onClick={() => handleSaveWithButton(ownerProfile)} className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs">💾 Save C.E.O Profile</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. FULL-BLEED WIDESCREEN ROLE DASHBOARDS & WORKSPACES
  // =========================================================================
  const currentProf = getCurrentProfile();
  const isPartnerRole = ['graduate', 'agency', 'tour_company'].includes(currentRole);
  const providerDirectory = buildLiveProviderDirectory();
  const filteredProviders = providerDirectory.filter((item) => {
    if (directoryFilter === 'all') return true;
    return item.type === directoryFilter;
  });

  const roleAnnouncements = (appConfig.announcements || []).filter(
    (a) => a.targetRole === 'all' || a.targetRole === currentRole
  );
  const roleCustomFeatures = (appConfig.customFeatures || []).filter(
    (f) => f.targetRole === 'all' || f.targetRole === currentRole
  );
  const roleCustomSections = (appConfig.customSections || []).filter(
    (s) => s.targetRole === 'all' || s.targetRole === currentRole
  );
  const roleCustomFields = (appConfig.customFields || []).filter(
    (f) => f.targetRole === 'all' || f.targetRole === currentRole
  );

  const searchedProviders = providerDirectory.filter((item) => {
    const matchesRole = searchRoleFilter === 'all' || item.type === searchRoleFilter;
    if (!matchesRole) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.headline || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q) ||
      (item.categoryLabel || '').toLowerCase().includes(q)
    );
  });

  const matchingTravelerRequests = tripRequests.filter(
    (req) => !req.preferredCategory || req.preferredCategory === currentRole
  );

  const myChatId = normalizeContact(activeUser?.contact || activeUser?.name || '');
  const activePeerId = normalizeContact(activeChatPeer.id);

  const myPrivateMessages = chatMessages.filter((msg) => {
    if (Array.isArray(msg.participants)) {
      return msg.participants.includes(myChatId);
    }
    return normalizeContact(msg.senderId) === myChatId || normalizeContact(msg.recipientId) === myChatId;
  });

  // Check if there are any unread incoming messages from other peers
  const hasUnreadChatNotification = myPrivateMessages.some((msg) => {
    const msgSender = normalizeContact(msg.senderId || msg.sender);
    return msgSender !== myChatId && normalizeContact(activeChatPeer.id) !== msgSender;
  });

  const activeRoomMessages = activePeerId
    ? myPrivateMessages.filter((msg) => {
        const msgSender = normalizeContact(msg.senderId || msg.sender);
        const msgRecipient = normalizeContact(msg.recipientId || msg.peer);
        return (
          (msgSender === myChatId && msgRecipient === activePeerId) ||
          (msgSender === activePeerId && msgRecipient === myChatId)
        );
      })
    : [];

  const myPrivateConversations = [];
  const seenPeers = new Set();
  myPrivateMessages.forEach((msg) => {
    const msgSender = normalizeContact(msg.senderId || msg.sender);
    const isMeSender = msgSender === myChatId;
    const partnerId = isMeSender
      ? normalizeContact(msg.recipientId || msg.peer)
      : msgSender;
    const partnerName = isMeSender ? (msg.recipientName || msg.peer) : msg.sender;
    if (partnerId && !seenPeers.has(partnerId)) {
      seenPeers.add(partnerId);
      myPrivateConversations.push({ id: partnerId, name: partnerName });
    }
  });

  return (
    <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden relative">
      {renderPopupAdModal()}

      {/* FULL-BLEED WIDESCREEN TOP HEADER & NAVIGATION BAR */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm w-full">
        <div className="w-full px-6 md:px-12 py-3 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center space-x-3">
            {currentProf?.photo ? (
              <img src={currentProf.photo} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-[#3B6E5B]" />
            ) : (
              <div style={{ backgroundColor: appConfig.secondaryColor || '#3B6E5B' }} className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold">
                {(currentProf?.name || 'U').charAt(0)}
              </div>
            )}
            <div>
              <h2 className="font-bold text-sm md:text-base leading-tight">{currentProf?.name}</h2>
              <p className="text-[11px] text-slate-500 capitalize">
                {getRoleDisplayLabel(currentRole)}
                {activeUser?.subscriptionPlanName && currentRole !== 'traveler'
                  ? ` • ${activeUser.subscriptionPlanName}`
                  : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {(appConfig.customDashboards || []).map((cd) => (
              <button
                key={cd.id}
                onClick={() => {
                  setActiveCustomDashId(cd.id);
                  setCurrentRole('custom_dashboard_view');
                }}
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-full text-xs font-bold"
              >
                <span>{cd.icon}</span>
                <span>{cd.name}</span>
              </button>
            ))}
            <button
              onClick={() => setActiveTab('search')}
              title="Search"
              className={`p-2 rounded-full text-xs font-bold transition ${
                activeTab === 'search'
                  ? 'bg-[#234E40] text-white shadow-sm'
                  : 'bg-emerald-50 text-[#234E40] hover:bg-emerald-100'
              }`}
            >
              🔍
            </button>
            <button onClick={resetToWelcome} className="text-xs bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-full font-semibold transition">Sign Out</button>
          </div>
        </div>

        {/* FULL-BLEED 5 TABS NAVIGATION (Includes Chat Notification Badge) */}
        <div className="w-full px-6 md:px-12 py-1.5">
          <div className="w-full grid grid-cols-5 gap-2 bg-slate-50 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-2.5 rounded-xl transition text-center ${activeTab === 'jobs' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}
            >
              {currentRole === 'traveler' ? '🏠 Explore' : '🏠 Work'}
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-2.5 rounded-xl transition text-center ${activeTab === 'bookings' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}
            >
              📅 Bookings
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-2.5 rounded-xl transition text-center ${activeTab === 'search' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2.5 rounded-xl transition text-center ${activeTab === 'profile' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}
            >
              👤 Profile
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2.5 rounded-xl transition text-center relative flex items-center justify-center space-x-1 ${
                activeTab === 'chat' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'
              }`}
            >
              <span>🔒 Chat</span>
              {hasUnreadChatNotification && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping absolute top-2 right-3"></span>
              )}
              {hasUnreadChatNotification && (
                <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-3"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* EDGE-TO-EDGE WIDESCREEN CONTENT BODY */}
      <div className="w-full flex-1 px-6 md:px-12 py-6 space-y-5 pb-12">
        {roleAnnouncements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleAnnouncements.map((ann) => (
              <div key={ann.id} className="bg-amber-50 border border-amber-300 p-4 rounded-2xl text-xs shadow-sm">
                <p className="font-bold text-amber-950">📢 {ann.title}</p>
                <p className="text-amber-900 mt-0.5">{ann.body}</p>
              </div>
            ))}
          </div>
        )}

        {isPartnerRole && currentProf && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-900">
                {currentProf.isAvailable !== false ? '🟢 Available for Bookings' : '🔴 Currently Busy'}
              </p>
            </div>
            <button
              onClick={() => updateCurrentProfile({ isAvailable: currentProf.isAvailable === false })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentProf.isAvailable !== false ? 'bg-emerald-100 text-[#234E40]' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {currentProf.isAvailable !== false ? 'Active' : 'Offline'}
            </button>
          </div>
        )}

        {/* BOOKINGS MARKETPLACE TAB */}
        {activeTab === 'bookings' && (
          <BookingMarketplace currentUser={activeUser} currentRole={currentRole} />
        )}

        {/* UNIVERSAL SEARCH DIRECTORY TAB */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="text-white p-6 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Global Partner Directory</span>
              <h3 className="font-bold text-base md:text-xl pt-1">🔍 Search Agencies, Tour Companies & Graduates</h3>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search name or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-3 border border-slate-300 rounded-xl text-xs md:text-sm font-medium"
                />
                <span className="absolute left-3 top-3 text-sm">🔍</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchedProviders.map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-3 shadow-sm text-xs flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                    <p className="text-slate-700 font-medium">{prov.headline}</p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center space-x-1"
                    >
                      <span>🔒</span>
                      <span>Private Chat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingTarget(prov)}
                      className="flex-1 py-2 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold shadow-sm"
                    >
                      📅 Book Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graduate Workspace */}
        {activeTab === 'jobs' && currentRole === 'graduate' && (
          <div className="space-y-5">
            <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="text-white p-6 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Graduate Opportunity Hub • 0% Commission</span>
              <h3 className="font-bold text-base md:text-xl pt-1">Guiding Jobs, Consultant Roles & Freelance Travelers</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-3">
                <h3 className="font-bold text-sm text-slate-900">🧳 Freelance Traveler Requests ({matchingTravelerRequests.length})</h3>
                {matchingTravelerRequests.map((req) => (
                  <div key={req.id} className="bg-white p-4 rounded-2xl border-2 border-amber-300 space-y-2 shadow-sm text-xs">
                    <h4 className="font-bold text-sm text-slate-900">{req.destination} ({req.guests} Guests)</h4>
                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => openConfidentialChat(req.travelerContact || req.travelerName, req.travelerName, 'Traveler')}
                        className="flex-1 py-2 bg-slate-100 rounded-xl font-bold text-xs"
                      >
                        🔒 Private Chat
                      </button>
                      {req.status !== 'confirmed' && (
                        <button
                          onClick={() => handleConfirmTravelerRequest(req.id)}
                          className="flex-1 py-2 bg-[#234E40] text-white rounded-xl font-bold text-xs"
                        >
                          ✓ Confirm Deal
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-7 space-y-3">
                <h3 className="font-bold text-sm text-slate-900">📋 Available Guiding & Consultant Jobs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-white p-4 rounded-2xl border space-y-2.5 shadow-sm text-xs flex flex-col justify-between">
                      <h4 className="text-slate-900 font-bold">{task.title}</h4>
                      {task.status === 'open' && (
                        <button onClick={() => handleAcceptTask(task.id)} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold">
                          Accept Assignment →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Travel Agency Workspace */}
        {activeTab === 'jobs' && currentRole === 'agency' && (
          <div className="space-y-5">
            <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="text-white p-6 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Travel Agency Hub</span>
              <h3 className="font-bold text-base md:text-xl pt-1">Explore Travel Consultants, Guides & Tourists</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <h3 className="font-bold text-sm text-slate-900">👥 Available Consultants & Guides</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProviders.filter(p => p.type === 'graduate').map((prov) => (
                    <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2 shadow-sm text-xs flex flex-col justify-between">
                      <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                      <button
                        onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)}
                        className="w-full py-2 bg-slate-100 rounded-xl font-bold"
                      >
                        🔒 Private Chat
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <form onSubmit={handlePostNewTask} className="bg-white p-6 rounded-2xl border space-y-3 shadow-sm text-xs">
                  <h3 className="font-bold text-sm text-slate-900">📢 Post Assignment</h3>
                  <input
                    type="text"
                    required
                    placeholder="Title"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Fee in RWF"
                    value={newTaskForm.rawPay}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, rawPay: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                  <button type="submit" className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold shadow">+ Publish</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tour Company Workspace */}
        {activeTab === 'jobs' && currentRole === 'tour_company' && (
          <div className="space-y-5">
            <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="text-white p-6 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Tour Company Hub</span>
              <h3 className="font-bold text-base md:text-xl pt-1">Explore Tour Consultants & Guides</h3>
            </div>
          </div>
        )}

        {/* Traveler Dashboard */}
        {activeTab === 'jobs' && currentRole === 'traveler' && (
          <div className="space-y-5">
            <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="text-white p-6 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Free Traveler Account</span>
              <h3 className="font-bold text-base md:text-xl pt-1">Choose Your Travel Partner in Rwanda</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProviders.map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2.5 shadow-sm text-xs flex flex-col justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                  <button
                    onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)}
                    className="w-full py-2 bg-slate-100 rounded-xl font-bold"
                  >
                    🔒 Private Chat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile & Qualifications Workspace */}
        {activeTab === 'profile' && currentProf && (
          <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-6 md:p-8 rounded-2xl border space-y-4 shadow-sm">
              <input type="text" value={currentProf.name} onChange={(e) => updateCurrentProfile({ name: e.target.value })} className="w-full p-3 border rounded-xl text-xs" />
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveWithButton(currentProf)}
                className="w-full py-3.5 bg-[#234E40] text-white rounded-xl font-bold text-xs shadow"
              >
                💾 Save Profile
              </button>
            </div>
          </div>
        )}

        {/* CONFIDENTIAL 1-ON-1 PRIVATE CHAT */}
        {activeTab === 'chat' && (
          <div className="w-full max-w-4xl mx-auto space-y-3">
            <div className="bg-slate-900 text-white p-4 rounded-2xl text-xs flex items-center space-x-2.5 shadow-sm">
              <span className="text-base">🔒</span>
              <div>
                <p className="font-bold">Confidential 1-on-1 Direct Messaging</p>
                <p className="text-[11px] text-slate-300">Private end-to-end conversations visible ONLY to you and your chosen recipient.</p>
              </div>
            </div>

            {myPrivateConversations.length > 0 && (
              <div className="flex space-x-1.5 overflow-x-auto pb-1">
                {myPrivateConversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveChatPeer({ id: conv.id, name: conv.name, role: '' })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                      activePeerId === conv.id
                        ? 'bg-[#234E40] text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    💬 {conv.name}
                  </button>
                ))}
              </div>
            )}

            {!activePeerId ? (
              <div className="bg-white p-8 rounded-2xl border text-center space-y-2.5 shadow-sm">
                <h4 className="font-bold text-sm text-slate-900">No Active Private Chat Selected</h4>
                <p className="text-xs text-slate-500">Tap <strong>&quot;🔒 Private Chat&quot;</strong> on any member or request to start messaging.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border flex flex-col h-[500px] overflow-hidden shadow-sm">
                <div className="p-3.5 bg-[#234E40] text-white flex justify-between items-center">
                  <h4 className="font-bold text-sm">💬 {activeChatPeer.name}</h4>
                  <button onClick={() => setActiveChatPeer({ id: '', name: '', role: '' })} className="text-[11px] bg-black/25 px-3 py-1 rounded-full">Close</button>
                </div>

                <div className="flex-1 p-4 space-y-2.5 overflow-y-auto text-xs bg-slate-50">
                  {activeRoomMessages.map((msg) => {
                    const isMine = normalizeContact(msg.senderId || msg.sender) === myChatId;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2 rounded-2xl max-w-[80%] ${isMine ? 'bg-[#234E40] text-white' : 'bg-white border text-slate-800'}`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendChatMessage} className="p-3 border-t bg-white flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 p-2.5 border rounded-xl text-xs"
                  />
                  <button type="submit" className="px-5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs">Send</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Direct Booking Modal */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDirectProviderBooking} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 text-xs shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Book {bookingTarget.name}</h3>
            <input type="text" required placeholder="Travel Dates" value={bookingDetails.dates} onChange={(e) => setBookingDetails({ ...bookingDetails, dates: e.target.value })} className="w-full p-2.5 border rounded-xl" />
            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setBookingTarget(null)} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-[#234E40] text-white rounded-xl font-bold">Confirm Booking</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
