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
// SUBSCRIPTION TIERS & DEFAULT CONFIG
// =========================================================================
const DEFAULT_SUBSCRIPTION_PLANS = [
  { id: 'monthly', name: 'Starter Monthly', badge: 'Monthly', durationLabel: '1 Month (30 Days)', days: 30, price: 15000, order: 1 },
  { id: 'three_months', name: 'Growth 3-Month', badge: '3 Months', durationLabel: '3 Months (90 Days)', days: 90, price: 20000, order: 2 },
  { id: 'quarter_6m', name: 'Quarter Subscription (6 Months)', badge: 'Quarter • 6 Months', durationLabel: '6 Months (180 Days)', days: 180, price: 60000, order: 3 },
  { id: 'gold_platinum_year', name: 'GOLD-PLATINUM', badge: 'GOLD-PLATINUM • 1 Year', durationLabel: '1 Year (365 Days)', days: 365, price: 100000, order: 4 }
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
// OPEN BOOKING & JOB ASSIGNMENT MARKETPLACE
// =========================================================================
function BookingMarketplace({ currentUser, currentRole }) {
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('open');
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
      status: 'open',
      applicants: [],
      approvedProvider: null,
      createdAt: Date.now()
    };

    setBookings([newBooking, ...bookings]);
    await saveBookingDoc(newId, newBooking);

    setFormData({ ...formData, title: '', startDate: '', budgetRwf: '', notes: '' });
    setShowForm(false);
    setFilter('open');
    setLoading(false);
    alert('✓ Booking request published live!');
  };

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
    setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, applicants: updatedApplicants } : b)));
    await saveBookingDoc(booking.id, { applicants: updatedApplicants });
    alert('✓ Request sent! Waiting for booking owner approval.');
  };

  const handleApproveProvider = async (booking, applicant) => {
    const ok = window.confirm(
      `Approve ${applicant.providerName} (${applicant.providerRole}) for "${booking.title}"? Once approved, this booking will be marked TAKEN and dismissed for everyone else.`
    );
    if (!ok) return;

    const approvedData = { ...applicant, approvedAt: new Date().toISOString() };
    setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, status: 'taken', approvedProvider: approvedData } : b)));
    await saveBookingDoc(booking.id, { status: 'taken', approvedProvider: approvedData });
    alert(`✓ ${applicant.providerName} is now granted for this job! Booking is locked and dismissed from open requests.`);
  };

  const grantedCount = bookings.filter((b) => b.approvedProvider?.providerId === activeUserId).length;

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

      {showForm && (
        <form onSubmit={handleCreateBooking} className="bg-white p-6 rounded-2xl border-2 border-[#3B6E5B] shadow-sm space-y-4 text-xs">
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
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-slate-100 rounded-xl font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold shadow">
              {loading ? 'Publishing...' : 'Publish Booking Request →'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1.5 rounded-2xl border text-[11px] md:text-xs font-bold text-center shadow-sm">
        <button type="button" onClick={() => setFilter('open')} className={`py-2.5 rounded-xl transition ${filter === 'open' ? 'bg-[#234E40] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          🟢 Open Bookings ({bookings.filter((b) => b.status === 'open').length})
        </button>
        <button type="button" onClick={() => setFilter('my_bookings')} className={`py-2.5 rounded-xl transition ${filter === 'my_bookings' ? 'bg-[#234E40] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          📋 My Submitted ({bookings.filter((b) => b.ownerId === activeUserId).length})
        </button>
        <button type="button" onClick={() => setFilter('granted')} className={`py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${filter === 'granted' ? 'bg-emerald-700 text-white' : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100'}`}>
          <span>🎉 Granted to Me</span>
          {grantedCount > 0 && <span className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white rounded-full">{grantedCount}</span>}
        </button>
        <button type="button" onClick={() => setFilter('taken')} className={`py-2.5 rounded-xl transition ${filter === 'taken' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          🔒 Taken / Dismissed ({bookings.filter((b) => b.status === 'taken').length})
        </button>
      </div>

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
            const alreadyApplied = (booking.applicants || []).some((a) => a.providerId === activeUserId);

            return (
              <div key={booking.id} className={`p-5 rounded-2xl border shadow-sm text-xs flex flex-col justify-between space-y-3 ${isGrantedToMe ? 'bg-emerald-50 border-emerald-500 border-2' : isTaken ? 'bg-slate-50 border-slate-200 opacity-90' : 'bg-white border-slate-200'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#3B6E5B] bg-emerald-50 px-2.5 py-0.5 rounded-full">📍 {booking.destination}</span>
                    {isGrantedToMe ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">✓ Granted for Job</span>
                    ) : isTaken ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">🔒 Taken & Dismissed</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">● Open</span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{booking.title}</h4>
                  <p className="text-[11px] text-slate-500">Posted by <strong>{booking.ownerName}</strong> • For: {booking.targetRole}</p>
                  <div className="bg-slate-100 p-2.5 rounded-xl grid grid-cols-3 gap-1 text-[11px]">
                    <div><span className="text-slate-400 block">Date</span><span className="font-bold text-slate-800">{booking.startDate}</span></div>
                    <div><span className="text-slate-400 block">Trip</span><span className="font-bold text-slate-800">{booking.durationDays}d • {booking.groupSize} pax</span></div>
                    <div><span className="text-slate-400 block">Budget</span><span className="font-bold text-[#234E40]">{booking.budgetRwf}</span></div>
                  </div>
                  {booking.notes && <p className="text-slate-600 italic">&quot;{booking.notes}&quot;</p>}
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  {isGrantedToMe && (
                    <div className="bg-[#234E40] text-white p-3 rounded-xl space-y-1">
                      <p className="font-bold">🎉 You have been approved &amp; granted for this job!</p>
                      <p className="text-[11px] text-emerald-100">Owner: <strong>{booking.ownerName}</strong> • Phone: <strong>{booking.ownerPhone}</strong></p>
                    </div>
                  )}

                  {isTaken && !isGrantedToMe && !isOwner && (
                    <div className="bg-slate-200 text-slate-700 p-2.5 rounded-xl text-center font-semibold">
                      🔒 This booking has already been taken by <strong>{booking.approvedProvider?.providerName}</strong> and is dismissed.
                    </div>
                  )}

                  {isOwner && (
                    <div className="space-y-2">
                      <p className="font-bold text-[11px] uppercase text-slate-700">
                        {isTaken ? `✓ Approved: ${booking.approvedProvider?.providerName}` : `All Applicants (${(booking.applicants || []).length}) - Approve Whom You Want:`}
                      </p>
                      {!isTaken && (booking.applicants || []).length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">Waiting for providers to apply...</p>
                      )}
                      {!isTaken && (booking.applicants || []).map((app, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 border p-2 rounded-xl">
                          <div>
                            <p className="font-bold text-slate-900">{app.providerName}</p>
                            <p className="text-[10px] text-slate-500">{app.providerRole} {app.providerPhone ? `• ${app.providerPhone}` : ''}</p>
                          </div>
                          <button type="button" onClick={() => handleApproveProvider(booking, app)} className="px-3 py-1.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-lg font-bold">
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isOwner && !isTaken && (
                    <div>
                      {isProvider ? (
                        alreadyApplied ? (
                          <button type="button" disabled className="w-full py-2.5 bg-slate-200 text-slate-600 rounded-xl font-bold cursor-not-allowed">
                            ✓ Request Sent — Awaiting Owner Approval
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleApplyForBooking(booking)} className="w-full py-2.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold transition">
                            Request / Accept Booking →
                          </button>
                        )
                      ) : (
                        <p className="text-[11px] text-slate-400 text-center">Open for verified Tour Companies, Agencies & Graduates to request.</p>
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

// =========================================================================
// MAIN APP COMPONENT
// =========================================================================
export default function GuideLinkRwandaApp() {
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
  const [activePopupAd, setActivePopupAd] = useState(null);

  const [appConfig, setAppConfig] = useState(DEFAULT_APP_SERVER_CONFIG);
  const [serverSubTab, setServerSubTab] = useState('branding');
  const [newDashboardForm, setNewDashboardForm] = useState({ name: '', icon: '🏨', badge: 'New Partner Hub', description: '', actionTitle: 'Submit Listing / Request', actionPlaceholder: 'Enter details...', showOnWelcome: true, items: [] });
  const [customDashPostInput, setCustomDashPostInput] = useState({ title: '', details: '', priceOrMeta: '' });
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({ title: '', body: '', targetRole: 'all' });
  const [newFeatureForm, setNewFeatureForm] = useState({ title: '', icon: '✨', featureType: 'action_form', targetRole: 'all', description: '' });

  const [newAdForm, setNewAdForm] = useState({
    advertiserId: '', advertiserName: '', advertiserRoleLabel: '', advertiserContact: '', headline: '', description: '', badge: 'Featured Partner', ctaLabel: 'Book / Inquire', imageUrl: '', targetAudience: 'all', adFeePaid: 0, active: true
  });

  const [subscriptionPlans, setSubscriptionPlans] = useState(DEFAULT_SUBSCRIPTION_PLANS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRoleFilter, setSearchRoleFilter] = useState('all');

  const [selectedManagedUserId, setSelectedManagedUserId] = useState('');
  const [ownerUserEditForm, setOwnerUserEditForm] = useState(null);

  const [directoryFilter, setDirectoryFilter] = useState('all');
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ dates: '', guests: '2', notes: '' });

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
    name: '', contact: '', password: '', confirmPassword: '', role: 'traveler', subscriptionPlanId: 'monthly', momoRef: ''
  });

  const [newTaskForm, setNewTaskForm] = useState({ title: '', date: '', rawPay: '', location: 'Kigali', category: 'Guiding Job' });
  const [tripRequests, setTripRequests] = useState([]);
  const [tasks, setTasks] = useState([
    { id: 'default-1', title: 'Half-day Kigali city tour & cultural heritage', agency: 'Cheetah Safaris / Partner Agency', location: 'Kigali', rawPay: 35000, pay: 'RWF 35,000', date: 'Sat 21 Nov, 09:00 to 13:00', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Guiding Job' },
    { id: 'default-2', title: 'Nyungwe Canopy Walk & Tea Plantation Escort', agency: 'Rwanda Eco Tours', location: 'Nyungwe / Rusizi', rawPay: 65000, pay: 'RWF 65,000', date: 'Mon 23 Nov, Full Day', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Consultant Job' }
  ]);

  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();
  const getPlanById = (planId) => subscriptionPlans.find((p) => p.id === planId) || subscriptionPlans[0] || DEFAULT_SUBSCRIPTION_PLANS[0];

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
    setActiveChatPeer({ id: resolvedId, name: peerName, role: peerRoleLabel });
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
      setExemptAccounts([...vipDocs].sort((a, b) => a.id.localeCompare(b.id)));
    }
    if (tasksDocs.length > 0) {
      setTasks([...tasksDocs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }
    if (tripsDocs.length > 0) {
      setTripRequests([...tripsDocs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }
    if (chatDocs.length > 0) {
      setChatMessages([...chatDocs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
    }
  };

  useEffect(() => {
    loadFirebaseData();
    const interval = setInterval(loadFirebaseData, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const visibleAds = (appConfig.ads || []).filter((ad) => ad.active !== false);
    if (visibleAds.length > 0 && !activePopupAd) {
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
    const confirmed = window.confirm(`⚠️ Are you sure you want to permanently DELETE "${userName}" from the system?`);
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
    await firestoreDeleteDoc('profiles', userId);
    alert(`🗑️ User "${userName}" has been permanently deleted.`);
  };

  const handleOwnerSaveManagedUser = async (e) => {
    e.preventDefault();
    if (!ownerUserEditForm) return;
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
    if (oldKey && oldKey !== newCleanKey) delete updatedProfiles[oldKey];
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
    alert(`✓ User info updated in Firebase!`);
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
      (acc) => acc.confirmed && (normalizeContact(acc.contact) === cleanInput || (acc.email && normalizeContact(acc.email) === cleanInput))
    );
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    const cleanInput = normalizeContact(signInContact);
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
      setActiveUser({ name: exemptMatch.name, contact: exemptMatch.contact, role: exemptMatch.role, tier: exemptMatch.tier, isVip: true });
      setCurrentRole(exemptMatch.role);
      setActiveTab('jobs');
      return;
    }

    const existingUser = registeredUsers.find((u) => normalizeContact(u.contact) === cleanInput);
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
        setRegisteredUsers(registeredUsers.map((u) => (u.id === existingUser.id ? { ...u, status: 'expired' } : u)));
        await firestoreSaveDoc('profiles', existingUser.id, { status: 'expired' });
      }
      setExpiredUserAccount(existingUser);
      setRenewalPlanId(existingUser.subscriptionPlanId || 'monthly');
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
    if (!regForm.name.trim() || !regForm.contact.trim() || !regForm.password.trim()) {
      alert('Please fill in your Name, Contact, and create a Password.');
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    const cleanInput = normalizeContact(regForm.contact);
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
      await firestoreSaveDoc('profiles', cleanInput, { ...freeTraveler, isAvailable: true });
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
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `${appConfig.appName}: ${isRenewal ? 'Subscription Renewal' : 'New Partner Subscription'} (${registrantData.name}) - ${registrantData.subscriptionPlanName}`,
          _template: 'table',
          Platform: appConfig.appName,
          Member_Name: registrantData.name,
          Account_Role: getRoleDisplayLabel(registrantData.role),
          Member_Contact: registrantData.contact,
          Subscription_Plan: registrantData.subscriptionPlanName,
          Amount_Paid: `${Number(registrantData.feePaid).toLocaleString()} RWF`,
          USSD_Dialed: ussdUsed,
          MoMo_Transaction_Ref: registrantData.momoRef
        })
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  const handleCompleteSubscriptionPayment = async () => {
    const selectedPlan = getPlanById(regForm.subscriptionPlanId);
    if (!regForm.momoRef.trim()) {
      alert(`Please enter your MoMo Transaction Reference / ID.`);
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
      momoRef: regForm.momoRef.trim(),
      status: 'pending_approval'
    };

    setRegisteredUsers([newRegistrant, ...registeredUsers]);
    await firestoreSaveDoc('profiles', cleanInput, { ...newRegistrant, isAvailable: true });
    const notified = await sendRealTimeOwnerEmailNotification(newRegistrant, false);
    setEmailNotificationSent(notified);
    setIsSubmittingPayment(false);
    setRegStep('pending_approval');
  };

  const handleCompleteRenewalPayment = async () => {
    if (!expiredUserAccount) return;
    const selectedPlan = getPlanById(renewalPlanId);
    if (!renewalMomoRef.trim()) {
      alert(`Please enter your MoMo Transaction Reference.`);
      return;
    }
    setIsSubmittingPayment(true);
    const newExpiresAt = Date.now() + selectedPlan.days * 24 * 60 * 60 * 1000;
    const renewedRecord = {
      ...expiredUserAccount,
      feePaid: Number(expiredUserAccount.feePaid || 0) + selectedPlan.price,
      subscriptionPlanId: selectedPlan.id,
      subscriptionPlanName: selectedPlan.name,
      subscriptionExpiresAt: newExpiresAt,
      momoRef: renewalMomoRef.trim(),
      status: 'pending_approval'
    };

    setRegisteredUsers(registeredUsers.map((u) => (u.id === expiredUserAccount.id ? renewedRecord : u)));
    await firestoreSaveDoc('profiles', expiredUserAccount.id, renewedRecord);
    await sendRealTimeOwnerEmailNotification({ ...renewedRecord, feePaid: selectedPlan.price }, true);
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
    setRegisteredUsers(registeredUsers.map((u) => (u.id === docId ? { ...u, status: nextStatus, subscriptionExpiresAt: updatedExpiry } : u)));
    await firestoreSaveDoc('profiles', docId, { status: nextStatus, subscriptionExpiresAt: updatedExpiry });
    alert(`✓ User access successfully updated!`);
  };

  const toggleVipTierAccess = async (slotId) => {
    const target = exemptAccounts.find((a) => a.id === slotId);
    if (!target) return;
    const newStatus = !target.confirmed;
    const updatedItem = { ...target, confirmed: newStatus };
    setExemptAccounts(exemptAccounts.map((acc) => (acc.id === slotId ? updatedItem : acc)));
    await firestoreSaveDoc('vipTiers', slotId, updatedItem);
  };

  const handleAcceptTask = async (taskId) => {
    const taskDocId = String(taskId);
    const existingTask = tasks.find((t) => String(t.id) === taskDocId);
    if (!existingTask) return;
    const updatedTask = { ...existingTask, status: 'accepted', assignedTo: activeUser?.name || 'Graduate' };
    setTasks(tasks.map((t) => (String(t.id) === taskDocId ? updatedTask : t)));
    await firestoreSaveDoc('tasks', taskDocId, updatedTask);
    alert('✓ Gig accepted!');
  };

  const handleConfirmTravelerRequest = async (reqId) => {
    const responderName = activeUser?.name || 'Verified Provider';
    const confirmedByLabel = `${responderName} (${getRoleDisplayLabel(currentRole)})`;
    setTripRequests(tripRequests.map((req) => (String(req.id) === String(reqId) ? { ...req, status: 'confirmed', confirmedBy: confirmedByLabel } : req)));
    await firestoreSaveDoc('tripRequests', String(reqId), { status: 'confirmed', confirmedBy: confirmedByLabel });
    alert(`✓ Traveler request confirmed!`);
  };

  const handlePostNewTask = async (e) => {
    e.preventDefault();
    const numericPay = Number(newTaskForm.rawPay);
    if (!newTaskForm.title.trim() || !numericPay) return;
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
    alert('✓ Assignment published!');
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
        id: 'prov-g1', contactId: 'prov-g1', type: 'graduate', categoryLabel: 'Tourism Graduate & Guide', name: 'Jean Bosco Habimana', headline: 'Certified Multilingual Safari & Cultural Guide', location: 'Kigali & Volcanoes NP', languages: 'English, French, Kinyarwanda', rate: 'RWF 40,000 / day', qualifications: ['Advanced Diploma in Tours & Travel (RP Kitabi)'], services: ['Gorilla Trekking Escort', 'Kigali Cultural Walks', 'Birding Tours'], experience: ['4+ Years Safari Guiding'], isAvailable: true
      },
      {
        id: 'prov-tc1', contactId: 'prov-tc1', type: 'tour_company', categoryLabel: 'Tour Company', name: 'Cheetah Safaris Rwanda', headline: '4x4 Safari Fleet, Gorilla Trekking & Akagera Wildlife Expeditions', location: 'Kigali & Musanze', languages: 'Full Safari Fleet & Permits', rate: 'All-Inclusive Safaris', qualifications: ['RDB Certified Tour Operator'], services: ['4x4 Land Cruiser Rental', 'Gorilla Permit Processing', 'Multi-Day Wildlife Safaris'], experience: ['10+ Years East Africa Safaris'], isAvailable: true
      }
    ];

    const dynamicProviders = [];
    exemptAccounts.forEach((acc) => {
      if (acc.confirmed && ['graduate', 'agency', 'tour_company'].includes(acc.role)) {
        const key = normalizeContact(acc.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `vip-${acc.id}`, contactId: key, type: acc.role, categoryLabel: `${getRoleDisplayLabel(acc.role)} (${acc.tier})`, name: prof.name || acc.name, headline: prof.headline || `${acc.tier}`, location: prof.location || 'Kigali, Rwanda', languages: (prof.skills || ['English', 'Kinyarwanda']).join(', '), rate: prof.rateInfo || 'Custom Packages', qualifications: prof.degrees || [], services: prof.servicesOffered || [], experience: prof.experiences || [], isAvailable: prof.isAvailable !== false, photo: prof.photo || ''
        });
      }
    });

    registeredUsers.forEach((u) => {
      if (u.status === 'approved' && !isUserSubscriptionExpired(u) && ['graduate', 'agency', 'tour_company'].includes(u.role)) {
        const key = normalizeContact(u.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `reg-${u.id}`, contactId: key, type: u.role, categoryLabel: `${getRoleDisplayLabel(u.role)} • ${u.subscriptionPlanName || 'Verified'}`, name: prof.name || u.name, headline: prof.headline || `Verified ${getRoleDisplayLabel(u.role)}`, location: prof.location || 'Rwanda', languages: (prof.skills || ['English', 'Kinyarwanda']).join(', '), rate: prof.rateInfo || (u.role === 'graduate' ? 'RWF 35,000 / day' : 'Custom Itineraries'), qualifications: prof.degrees || [], services: prof.servicesOffered || [], experience: prof.experiences || [], isAvailable: prof.isAvailable !== false, photo: prof.photo || ''
        });
      }
    });

    return [...dynamicProviders, ...defaultProviders];
  };

  const eligiblePaidAdvertisers = [
    ...registeredUsers.filter((u) => u.status === 'approved' && !isUserSubscriptionExpired(u) && ['graduate', 'agency', 'tour_company'].includes(u.role)).map((u) => {
      const key = normalizeContact(u.contact);
      const prof = userProfiles[key] || {};
      return { id: `reg-${u.id}`, name: prof.name || u.name, contact: u.contact, role: u.role, roleLabel: `${getRoleDisplayLabel(u.role)}`, headline: prof.headline || '', location: prof.location || 'Rwanda', photo: prof.photo || '' };
    })
  ];

  const renderPopupAdModal = () => {
    if (!activePopupAd) return null;
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-2 border-amber-400 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 text-xs animate-scale-up relative">
          <button type="button" onClick={() => setActivePopupAd(null)} className="absolute top-4 right-4 bg-slate-200 hover:bg-slate-300 text-slate-800 w-8 h-8 rounded-full font-extrabold flex items-center justify-center">✕</button>
          <div className="flex items-center space-x-3">
            {activePopupAd.imageUrl ? (
              <img src={activePopupAd.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl font-black shrink-0">📢</div>
            )}
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">{activePopupAd.badge || 'Sponsored Partner'}</span>
              <h3 className="font-extrabold text-base text-slate-900 mt-1 leading-snug">{activePopupAd.headline}</h3>
              <p className="text-xs font-bold text-[#234E40]">{activePopupAd.advertiserName}</p>
            </div>
          </div>
          {activePopupAd.description && <p className="text-slate-700 leading-relaxed text-sm bg-amber-100/50 p-3 rounded-xl border border-amber-200">{activePopupAd.description}</p>}
          <div className="flex space-x-2 pt-2">
            {activePopupAd.advertiserContact && (
              <button type="button" onClick={() => { const ad = activePopupAd; setActivePopupAd(null); openConfidentialChat(ad.advertiserContact, ad.advertiserName, ad.advertiserRoleLabel || 'Sponsored Partner'); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-xs shadow-sm transition">🔒 Private Chat</button>
            )}
            <button type="button" onClick={() => { const ad = activePopupAd; setActivePopupAd(null); setBookingTarget({ type: 'agency', categoryLabel: ad.advertiserRoleLabel || 'Featured Partner', name: ad.advertiserName, location: 'Rwanda' }); }} className="flex-1 py-3 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-extrabold text-xs shadow transition">{activePopupAd.ctaLabel || 'Book Now'} →</button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // WELCOME SCREEN
  // =========================================================================
  if (currentRole === 'welcome') {
    const welcomeAnnouncements = (appConfig.announcements || []).filter((a) => a.targetRole === 'all' || a.targetRole === 'welcome');
    const welcomeCustomDashboards = (appConfig.customDashboards || []).filter((d) => d.showOnWelcome !== false);

    return (
      <div className="min-h-screen w-screen bg-slate-50 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div className="w-full">
          <div className="bg-[#E2ECE9] w-full px-6 md:px-12 py-8 md:py-12 relative overflow-hidden">
            <div className="w-full relative">
              <div className="absolute -top-2 right-4 md:right-12 w-16 h-16 md:w-24 md:h-24 bg-amber-400 rounded-full shadow-md"></div>
              <div className="h-24 md:h-36 flex items-end justify-center space-x-1">
                <div className="w-full h-16 md:h-28 bg-[#5A8F7B] rounded-t-full opacity-60"></div>
                <div className="absolute bottom-0 w-full h-12 md:h-20 bg-[#3B6E5B] rounded-t-full opacity-80"></div>
                <div className="absolute bottom-0 w-4/5 h-8 md:h-12 rounded-t-full" style={{ backgroundColor: appConfig.primaryColor || '#234E40' }}></div>
              </div>
            </div>
          </div>

          <div className="w-full px-6 md:px-12 lg:px-16 py-8 md:py-12 space-y-6">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                <div>
                  <h1 className="text-3xl md:text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight">{appConfig.appName}</h1>
                  <p className="text-lg md:text-2xl xl:text-3xl font-semibold mt-2" style={{ color: appConfig.primaryColor || '#234E40' }}>{appConfig.tagline}</p>
                  <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed max-w-3xl">{appConfig.subtitle}</p>
                </div>
                {welcomeCustomDashboards.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">🌟 Specialized Platform Dashboards</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {welcomeCustomDashboards.map((cd) => (
                        <button key={cd.id} type="button" onClick={() => { setActiveCustomDashId(cd.id); setCurrentRole('custom_dashboard_view'); }} className="p-4 bg-white hover:bg-emerald-50 border border-slate-200 rounded-2xl text-left shadow-sm transition flex items-start space-x-3">
                          <span className="text-2xl">{cd.icon || '🏨'}</span>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">{cd.badge || 'Partner Hub'}</span>
                            <h4 className="font-bold text-sm text-slate-900">{cd.name}</h4>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
                  <button onClick={() => { setSignInContact(''); setSignInPassword(''); setCurrentRole('signin'); }} style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="w-full py-4 hover:opacity-95 text-white rounded-xl font-bold text-sm md:text-base shadow transition">
                    🔑 Sign In (Registered Members) →
                  </button>
                  {appConfig.allowNewSignups !== false && (
                    <button onClick={() => { setCurrentRole('signup'); }} className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 text-[#234E40] border border-[#3B6E5B]/30 rounded-xl font-bold text-sm md:text-base transition">
                      📝 Create Account (New Sign Up)
                    </button>
                  )}
                </div>
                <div>
                  <button onClick={() => { setOwnerPinInput(''); setShowOwnerPinModal(true); }} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs md:text-sm shadow-sm transition">
                    👑 C.E.O Login ({ownerProfile.name})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleOwnerLogin} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto text-lg">🔐</div>
                <h3 className="font-bold text-base text-slate-900">C.E.O Authentication</h3>
              </div>
              <input type="password" required autoFocus placeholder="••••••••" value={ownerPinInput} onChange={(e) => setOwnerPinInput(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-sm text-center font-bold tracking-wider" />
              <div className="flex space-x-2">
                <button type="button" onClick={() => setShowOwnerPinModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#234E40] text-white rounded-xl text-xs font-bold">Unlock</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // SIGN IN
  // =========================================================================
  if (currentRole === 'signin') {
    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div className="w-full bg-white px-6 md:px-12 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-base md:text-lg text-slate-900">Secure Member Sign In</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-4 py-2 rounded-full font-semibold">← Home</button>
        </div>
        <div className="w-full px-6 md:px-12 py-8 flex-1 flex justify-center items-center">
          <form onSubmit={handleSignInSubmit} className="w-full max-w-lg bg-white p-8 rounded-2xl border space-y-4 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Sign In</h3>
            <input type="text" required autoFocus placeholder="Phone Number or Email" value={signInContact} onChange={(e) => setSignInContact(e.target.value)} className="w-full p-3.5 border rounded-xl text-sm" />
            <input type="password" required placeholder="Password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="w-full p-3.5 border rounded-xl text-sm" />
            <button type="submit" className="w-full py-4 bg-[#234E40] text-white rounded-xl font-bold text-sm shadow">Unlock Dashboard →</button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SIGN UP
  // =========================================================================
  if (currentRole === 'signup') {
    const selectedPlan = getPlanById(regForm.subscriptionPlanId);
    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden">
        {renderPopupAdModal()}
        <div className="w-full bg-white px-6 md:px-12 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-base text-slate-900">Create New Account</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-4 py-2 rounded-full font-semibold">← Home</button>
        </div>
        <div className="w-full px-6 md:px-12 py-8 flex-1 flex justify-center items-center">
          <div className="w-full max-w-3xl">
            {regStep === 'details' && (
              <form onSubmit={handleSignUpSubmit} className="bg-white p-8 rounded-2xl border space-y-4 shadow-sm">
                <input type="text" required placeholder="Full Name or Business Name" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                <input type="text" required placeholder="Phone Number or Email" value={regForm.contact} onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                <input type="password" required placeholder="Password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                <input type="password" required placeholder="Confirm Password" value={regForm.confirmPassword} onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                <select value={regForm.role} onChange={(e) => setRegForm({ ...regForm, role: e.target.value })} className="w-full p-3 border rounded-xl text-sm bg-white font-semibold">
                  <option value="traveler">🧳 Traveler (FREE Instant Access)</option>
                  <option value="graduate">🎓 Tourism Graduate (Guide / Consultant)</option>
                  <option value="agency">🏢 Travel Agency</option>
                  <option value="tour_company">🚐 Tour Company (Safari Operator)</option>
                </select>
                <button type="submit" className="w-full py-4 bg-[#3B6E5B] text-white rounded-xl font-bold shadow">Continue →</button>
              </form>
            )}
            {regStep === 'pay_subscription' && (
              <div className="bg-white p-8 rounded-2xl border space-y-4 text-center shadow-sm">
                <h3 className="text-lg font-bold">Pay {Number(selectedPlan.price).toLocaleString()} RWF via MoMo</h3>
                <a href={buildUssdDialUri(selectedPlan.price)} onClick={() => setUssdTriggered(true)} className="block w-full py-4 bg-amber-400 text-slate-950 rounded-xl font-extrabold text-lg shadow">
                  📞 {buildUssdDisplay(selectedPlan.price)}
                </a>
                <input type="text" required placeholder="MoMo Transaction ID / SMS Ref" value={regForm.momoRef} onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })} className="w-full p-3.5 border rounded-xl text-xs" />
                <button type="button" disabled={isSubmittingPayment} onClick={handleCompleteSubscriptionPayment} className="w-full py-4 bg-[#234E40] text-white rounded-xl font-bold shadow">
                  {isSubmittingPayment ? 'Notifying C.E.O...' : '✓ Payment Completed — Notify C.E.O'}
                </button>
              </div>
            )}
            {regStep === 'pending_approval' && (
              <div className="bg-white p-8 rounded-2xl border text-center space-y-4 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Subscription Recorded & C.E.O Notified</h3>
                <button onClick={resetToWelcome} className="w-full py-3.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm">Return to Home Screen</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // C.E.O OWNER HQ (RESTORED FULL MANAGEMENT DASHBOARD)
  // =========================================================================
  if (currentRole === 'owner') {
    const pendingUsers = registeredUsers.filter((u) => u.status === 'pending_approval');
    const allActiveApprovedUsers = registeredUsers.filter((u) => u.status === 'approved');
    const expiredOrRevokedUsers = registeredUsers.filter((u) => u.status === 'expired' || u.status === 'revoked');

    return (
      <div className="min-h-screen w-screen bg-slate-100 flex flex-col font-sans overflow-x-hidden relative">
        <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="w-full text-white px-6 py-4 sticky top-0 z-30 shadow-sm flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black">👑</div>
            <div>
              <h2 className="font-bold text-sm md:text-base">{ownerProfile.name} <span className="bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">C.E.O HQ</span></h2>
              <p className="text-[11px] text-emerald-100">{ownerProfile.title}</p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-black/30 hover:bg-black/50 px-4 py-2 rounded-full font-semibold transition">Sign Out</button>
        </div>

        <div className="w-full px-6 md:px-12 py-3 bg-white border-b border-slate-200 flex space-x-2 overflow-x-auto text-xs font-bold text-slate-700">
          <button onClick={() => setOwnerTab('pending')} className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${ownerTab === 'pending' ? 'bg-[#234E40] text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            ⏳ Pending Payments ({pendingUsers.length})
          </button>
          <button onClick={() => setOwnerTab('users')} className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${ownerTab === 'users' ? 'bg-[#234E40] text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            👥 All Users &amp; Subscriptions ({registeredUsers.length})
          </button>
          <button onClick={() => setOwnerTab('vip')} className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${ownerTab === 'vip' ? 'bg-[#234E40] text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            ⭐ VIP Partner Tiers ({exemptAccounts.length})
          </button>
          <button onClick={() => setOwnerTab('server')} className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${ownerTab === 'server' ? 'bg-[#234E40] text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            ⚙️ App Server Studio
          </button>
        </div>

        <div className="w-full px-6 md:px-12 py-6 space-y-6 flex-1">
          {/* TAB 1: PENDING PAYMENTS */}
          {ownerTab === 'pending' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
                <h3 className="font-bold text-base text-slate-900">⏳ Pending Subscription Payments & Approvals</h3>
                <p className="text-xs text-slate-500">Review MoMo transaction references sent by new registered partners and activate their accounts.</p>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-500">
                  No pending subscription approvals right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="bg-white p-5 rounded-2xl border-2 border-amber-400 space-y-3 text-xs shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{getRoleDisplayLabel(u.role)}</span>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">{u.name}</h4>
                          <p className="text-slate-500">📞 {u.contact}</p>
                        </div>
                        <span className="font-extrabold text-[#234E40] bg-emerald-50 px-2.5 py-1 rounded-xl">RWF {Number(u.feePaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                        <p className="font-bold text-slate-700">Plan: {u.subscriptionPlanName || 'Standard'}</p>
                        <p className="font-bold text-slate-700">MoMo Ref: <span className="text-amber-800 font-mono bg-amber-50 px-2 py-0.5 rounded">{u.momoRef || 'No ref given'}</span></p>
                      </div>
                      <div className="flex space-x-2 pt-1">
                        <button type="button" onClick={() => toggleUserAccessStatus(u.id, u.contact, 'revoked')} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow">
                          ✓ Approve &amp; Activate Account
                        </button>
                        <button type="button" onClick={() => handleDeleteUserAccount(u.id, u.name)} className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL USERS & SUBSCRIPTIONS */}
          {ownerTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">👥 All Registered Users &amp; Subscription Database</h3>
                  <p className="text-xs text-slate-500">Manage all registered tourism graduates, travel agencies, tour companies, and travelers.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b">
                      <tr>
                        <th className="p-3">Name / Contact</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Subscription Plan</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registeredUsers.map((u) => {
                        const expired = isUserSubscriptionExpired(u);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{u.name}</p>
                              <p className="text-slate-500">{u.contact}</p>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">{getRoleDisplayLabel(u.role)}</td>
                            <td className="p-3">
                              <span className="font-bold text-[#234E40]">{u.subscriptionPlanName || 'Standard'}</span>
                              <span className="block text-[10px] text-slate-400">Paid: RWF {Number(u.feePaid || 0).toLocaleString()}</span>
                            </td>
                            <td className="p-3">
                              {expired ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full font-bold text-[10px]">Expired</span>
                              ) : u.status === 'approved' ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Active</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">{u.status}</span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button type="button" onClick={() => handleSelectUserForAdminEdit(u)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold">Edit</button>
                              <button type="button" onClick={() => toggleUserAccessStatus(u.id, u.contact, u.status)} className={`px-3 py-1.5 rounded-lg font-bold text-white ${u.status === 'approved' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                {u.status === 'approved' ? 'Revoke' : 'Activate'}
                              </button>
                              <button type="button" onClick={() => handleDeleteUserAccount(u.id, u.name)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {ownerUserEditForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                  <form onSubmit={handleOwnerSaveManagedUser} className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
                    <h3 className="font-bold text-base text-slate-900 border-b pb-2">✏️ Edit User Account &amp; Profile</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="font-bold text-slate-700">Full Name</label>
                        <input type="text" required value={ownerUserEditForm.name} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700">Phone / Contact</label>
                        <input type="text" required value={ownerUserEditForm.contact} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, contact: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700">Password</label>
                        <input type="text" required value={ownerUserEditForm.password} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, password: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-slate-700">Role</label>
                          <select value={ownerUserEditForm.role} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, role: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold">
                            <option value="graduate">Tourism Graduate</option>
                            <option value="agency">Travel Agency</option>
                            <option value="tour_company">Tour Company</option>
                            <option value="traveler">Traveler</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700">Subscription Plan</label>
                          <select value={ownerUserEditForm.subscriptionPlanId} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, subscriptionPlanId: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold">
                            {subscriptionPlans.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.price} RWF)</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700">Headline / Tagline</label>
                        <input type="text" value={ownerUserEditForm.headline} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, headline: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700">Rate Info</label>
                        <input type="text" value={ownerUserEditForm.rateInfo} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, rateInfo: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-3 border-t">
                      <button type="button" onClick={() => setOwnerUserEditForm(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Cancel</button>
                      <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-[#234E40] text-white rounded-xl font-bold">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VIP PARTNER TIERS */}
          {ownerTab === 'vip' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
                <h3 className="font-bold text-base text-slate-900">⭐ VIP Partner Tiers &amp; Exempt Accounts</h3>
                <p className="text-xs text-slate-500">Toggle confirmation for Platinum, Gold, and Silver VIP partners.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {exemptAccounts.map((acc) => (
                  <div key={acc.id} className={`p-5 rounded-2xl border-2 space-y-3 text-xs shadow-sm ${acc.confirmed ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{acc.tier}</span>
                    <h4 className="font-bold text-sm text-slate-900">{acc.name}</h4>
                    <p className="text-slate-500">📞 {acc.contact}</p>
                    <button type="button" onClick={() => toggleVipTierAccess(acc.id)} className={`w-full py-2.5 rounded-xl font-bold text-white transition ${acc.confirmed ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-slate-900 hover:bg-slate-800'}`}>
                      {acc.confirmed ? '✓ VIP Confirmed & Active' : 'Enable VIP Access'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: APP SERVER STUDIO */}
          {ownerTab === 'server' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">⚙️ No-Code App Server Studio</h3>
                  <p className="text-xs text-slate-500">Customize platform title, tagline, MoMo payment code, subscription plans, and features.</p>
                </div>
                <button type="button" disabled={isSaving} onClick={() => handleSaveAppServerConfig()} className="px-6 py-3 bg-[#234E40] hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow transition">
                  {isSaving ? 'Saving...' : '💾 Save All App Server Settings'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border space-y-3 text-xs shadow-sm">
                  <h4 className="font-bold text-sm text-[#234E40] border-b pb-2">🏷️ Branding &amp; MoMo Code</h4>
                  <div>
                    <label className="font-bold text-slate-700">Platform Name</label>
                    <input type="text" value={appConfig.appName} onChange={(e) => setAppConfig({ ...appConfig, appName: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Tagline</label>
                    <input type="text" value={appConfig.tagline} onChange={(e) => setAppConfig({ ...appConfig, tagline: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">MTN MoMo Payment Code</label>
                    <input type="text" value={appConfig.momoCode} onChange={(e) => setAppConfig({ ...appConfig, momoCode: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border space-y-3 text-xs shadow-sm">
                  <h4 className="font-bold text-sm text-[#234E40] border-b pb-2">💳 Subscription Tiers &amp; Pricing (RWF)</h4>
                  <div className="space-y-3">
                    {subscriptionPlans.map((plan, index) => (
                      <div key={plan.id} className="bg-slate-50 p-3 rounded-xl border space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700">Plan Name</label>
                            <input type="text" value={plan.name} onChange={(e) => { const updated = [...subscriptionPlans]; updated[index].name = e.target.value; setSubscriptionPlans(updated); }} className="w-full mt-1 p-2 border rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700">Price (RWF)</label>
                            <input type="number" value={plan.price} onChange={(e) => { const updated = [...subscriptionPlans]; updated[index].price = Number(e.target.value); setSubscriptionPlans(updated); }} className="w-full mt-1 p-2 border rounded-lg bg-white font-bold text-[#234E40]" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={handleSaveSubscriptionPlans} className="w-full py-3 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold shadow">
                      Save Subscription Plans
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // WORKSPACES & DASHBOARDS
  // =========================================================================
  const currentProf = getCurrentProfile();
  const isPartnerRole = ['graduate', 'agency', 'tour_company'].includes(currentRole);
  const providerDirectory = buildLiveProviderDirectory();

  const roleAnnouncements = (appConfig.announcements || []).filter((a) => a.targetRole === 'all' || a.targetRole === currentRole);
  const searchedProviders = providerDirectory.filter((item) => {
    const matchesRole = searchRoleFilter === 'all' || item.type === searchRoleFilter;
    if (!matchesRole) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.headline || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q) ||
      (item.categoryLabel || '').toLowerCase().includes(q) ||
      (item.services || []).some((s) => s.toLowerCase().includes(q))
    );
  });

  const matchingTravelerRequests = tripRequests.filter((req) => !req.preferredCategory || req.preferredCategory === currentRole);
  const myChatId = normalizeContact(activeUser?.contact || activeUser?.name || '');
  const activePeerId = normalizeContact(activeChatPeer.id);

  const myPrivateMessages = chatMessages.filter((msg) => {
    if (Array.isArray(msg.participants)) return msg.participants.includes(myChatId);
    return normalizeContact(msg.senderId) === myChatId || normalizeContact(msg.recipientId) === myChatId;
  });

  const hasUnreadChatNotification = myPrivateMessages.some((msg) => {
    const msgSender = normalizeContact(msg.senderId || msg.sender);
    return msgSender !== myChatId && normalizeContact(activeChatPeer.id) !== msgSender;
  });

  const activeRoomMessages = activePeerId ? myPrivateMessages.filter((msg) => {
    const msgSender = normalizeContact(msg.senderId || msg.sender);
    const msgRecipient = normalizeContact(msg.recipientId || msg.peer);
    return (msgSender === myChatId && msgRecipient === activePeerId) || (msgSender === activePeerId && msgRecipient === myChatId);
  }) : [];

  const myPrivateConversations = [];
  const seenPeers = new Set();
  myPrivateMessages.forEach((msg) => {
    const msgSender = normalizeContact(msg.senderId || msg.sender);
    const isMeSender = msgSender === myChatId;
    const partnerId = isMeSender ? normalizeContact(msg.recipientId || msg.peer) : msgSender;
    const partnerName = isMeSender ? (msg.recipientName || msg.peer) : msg.sender;
    if (partnerId && !seenPeers.has(partnerId)) {
      seenPeers.add(partnerId);
      myPrivateConversations.push({ id: partnerId, name: partnerName });
    }
  });

  return (
    <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden relative">
      {renderPopupAdModal()}

      {/* TOP HEADER - CLICK PROFILE PHOTO TO EDIT PROFILE */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm w-full">
        <div className="w-full px-6 md:px-12 py-3 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('profile')}
              title="Click photo to edit profile"
              className="group relative focus:outline-none"
            >
              {currentProf?.photo ? (
                <img src={currentProf.photo} alt="Profile" className="w-11 h-11 rounded-full object-cover border-2 border-[#234E40] shadow transition group-hover:scale-105" />
              ) : (
                <div style={{ backgroundColor: appConfig.secondaryColor || '#3B6E5B' }} className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold shadow transition group-hover:scale-105">
                  {(currentProf?.name || 'U').charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-[#234E40] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow">✏️ Edit</span>
            </button>
            <div>
              <h2 className="font-bold text-sm md:text-base leading-tight">{currentProf?.name}</h2>
              <p className="text-[11px] text-slate-500 capitalize">
                {getRoleDisplayLabel(currentRole)}
                {activeUser?.subscriptionPlanName && currentRole !== 'traveler' ? ` • ${activeUser.subscriptionPlanName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('search')}
              title="Explore All Service Providers"
              className={`p-2 rounded-full text-xs font-bold transition ${activeTab === 'search' ? 'bg-[#234E40] text-white shadow-sm' : 'bg-emerald-50 text-[#234E40] hover:bg-emerald-100'}`}
            >
              🔍
            </button>
            <button onClick={resetToWelcome} className="text-xs bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-full font-semibold transition">Sign Out</button>
          </div>
        </div>

        {/* 5 TABS NAVIGATION */}
        <div className="w-full px-6 md:px-12 py-1.5">
          <div className="w-full grid grid-cols-5 gap-2 bg-slate-50 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button onClick={() => setActiveTab('jobs')} className={`py-2.5 rounded-xl transition text-center ${activeTab === 'jobs' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}>
              {currentRole === 'traveler' ? '🏠 Explore' : '🏠 Work'}
            </button>
            <button onClick={() => setActiveTab('bookings')} className={`py-2.5 rounded-xl transition text-center ${activeTab === 'bookings' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}>
              📅 Bookings
            </button>
            <button onClick={() => setActiveTab('search')} className={`py-2.5 rounded-xl transition text-center ${activeTab === 'search' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}>
              🔍 Explore
            </button>
            <button onClick={() => setActiveTab('profile')} className={`py-2.5 rounded-xl transition text-center ${activeTab === 'profile' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}>
              👤 Profile
            </button>
            <button onClick={() => setActiveTab('chat')} className={`py-2.5 rounded-xl transition text-center relative flex items-center justify-center space-x-1 ${activeTab === 'chat' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}>
              <span>🔒 Chat</span>
              {hasUnreadChatNotification && <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-3"></span>}
            </button>
          </div>
        </div>
      </div>

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

        {/* BOOKINGS MARKETPLACE */}
        {activeTab === 'bookings' && <BookingMarketplace currentUser={activeUser} currentRole={currentRole} />}

        {/* EXPLORE ALL SERVICE PROVIDERS TAB */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div style={{ backgroundColor: appConfig.primaryColor || '#234E40' }} className="text-white p-6 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Explore All Service Providers & Offerings</span>
              <h3 className="font-bold text-base md:text-xl pt-1">🔍 Discover Verified Tour Companies, Agencies & Tourism Graduates</h3>
              <p className="text-xs text-emerald-100">Browse all offerings, packages, rates, languages, and qualifications across Rwanda.</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search provider name, city, or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-xl text-xs md:text-sm font-medium"
                  />
                  <span className="absolute left-3 top-3.5 text-sm">🔍</span>
                </div>
                <select
                  value={searchRoleFilter}
                  onChange={(e) => setSearchRoleFilter(e.target.value)}
                  className="p-3 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800"
                >
                  <option value="all">All Provider Types</option>
                  <option value="tour_company">Tour Companies</option>
                  <option value="agency">Travel Agencies</option>
                  <option value="graduate">Tourism Graduates / Guides</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchedProviders.map((prov) => (
                <div key={prov.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#3B6E5B] bg-emerald-50 px-2.5 py-0.5 rounded-full">{prov.categoryLabel}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">📍 {prov.location}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                    <p className="text-slate-700 font-medium italic">&quot;{prov.headline}&quot;</p>
                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-[11px]">
                      <div><span className="font-bold text-slate-700">Offerings / Services:</span><p className="text-slate-600">{(prov.services || []).join(', ') || 'Custom tourism services & bookings'}</p></div>
                      <div><span className="font-bold text-slate-700">Rate / Pricing:</span><p className="text-slate-900 font-extrabold text-[#234E40]">{prov.rate || 'Negotiable'}</p></div>
                      <div><span className="font-bold text-slate-700">Languages:</span><p className="text-slate-600">{prov.languages}</p></div>
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center space-x-1 shadow-sm"><span>🔒</span><span>Private Chat</span></button>
                    <button type="button" onClick={() => setBookingTarget(prov)} className="flex-1 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold shadow transition">📅 Book Now →</button>
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
                      <button onClick={() => openConfidentialChat(req.travelerContact || req.travelerName, req.travelerName, 'Traveler')} className="flex-1 py-2 bg-slate-100 rounded-xl font-bold text-xs">🔒 Private Chat</button>
                      {req.status !== 'confirmed' && (
                        <button onClick={() => handleConfirmTravelerRequest(req.id)} className="flex-1 py-2 bg-[#234E40] text-white rounded-xl font-bold text-xs">✓ Confirm Deal</button>
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
                        <button onClick={() => handleAcceptTask(task.id)} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold">Accept Assignment →</button>
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
                  {providerDirectory.filter(p => p.type === 'graduate').map((prov) => (
                    <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2 shadow-sm text-xs flex flex-col justify-between">
                      <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                      <button onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)} className="w-full py-2 bg-slate-100 rounded-xl font-bold">🔒 Private Chat</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-5">
                <form onSubmit={handlePostNewTask} className="bg-white p-6 rounded-2xl border space-y-3 shadow-sm text-xs">
                  <h3 className="font-bold text-sm text-slate-900">📢 Post Assignment</h3>
                  <input type="text" required placeholder="Title" value={newTaskForm.title} onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                  <input type="number" required placeholder="Fee in RWF" value={newTaskForm.rawPay} onChange={(e) => setNewTaskForm({ ...newTaskForm, rawPay: e.target.value })} className="w-full p-2.5 border rounded-xl" />
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
              {providerDirectory.map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2.5 shadow-sm text-xs flex flex-col justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                  <button onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)} className="w-full py-2 bg-slate-100 rounded-xl font-bold">🔒 Private Chat</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile & Qualifications Workspace */}
        {activeTab === 'profile' && currentProf && (
          <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-6 md:p-8 rounded-2xl border space-y-4 shadow-sm">
              <div className="flex items-center space-x-4">
                {currentProf.photo ? (
                  <img src={currentProf.photo} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-[#234E40]" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#234E40] text-white flex items-center justify-center font-bold text-xl">{(currentProf.name || 'U').charAt(0)}</div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Edit Your Profile & Offerings</h3>
                  <p className="text-xs text-slate-500">Update your name, photo, services offered, and pricing.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Full Name / Business Name</label>
                  <input type="text" value={currentProf.name} onChange={(e) => updateCurrentProfile({ name: e.target.value })} className="w-full mt-1 p-3 border rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Headline / Tagline</label>
                  <input type="text" value={currentProf.headline || ''} onChange={(e) => updateCurrentProfile({ headline: e.target.value })} className="w-full mt-1 p-3 border rounded-xl" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border text-xs">
                <span className="font-bold text-slate-700">Profile Photo:</span>
                <label className="cursor-pointer bg-[#234E40] text-white px-4 py-2 rounded-xl font-bold">
                  📷 Upload New Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (imgData) => updateCurrentProfile({ photo: imgData }))} />
                </label>
              </div>
              <button type="button" disabled={isSaving} onClick={() => handleSaveWithButton(currentProf)} className="w-full py-3.5 bg-[#234E40] text-white rounded-xl font-bold text-xs shadow">
                {isSaving ? '⏳ Saving...' : '💾 Save Profile & Offerings'}
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
                  <button key={conv.id} type="button" onClick={() => setActiveChatPeer({ id: conv.id, name: conv.name, role: '' })} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${activePeerId === conv.id ? 'bg-[#234E40] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
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
                        <div className={`px-3.5 py-2 rounded-2xl max-w-[80%] ${isMine ? 'bg-[#234E40] text-white' : 'bg-white border text-slate-800'}`}>{msg.text}</div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleSendChatMessage} className="p-3 border-t bg-white flex space-x-2">
                  <input type="text" placeholder="Type message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 p-2.5 border rounded-xl text-xs" />
                  <button type="submit" className="px-5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs">Send</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

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
