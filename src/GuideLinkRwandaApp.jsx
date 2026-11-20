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
// PROFILE EDITOR & SUMMARY (Added for Owner & All Users + Profile Photo)
// =========================================================================
function UserAndOwnerProfileSection({ profileData, label, onSave, isSaving }) {
  const [form, setForm] = useState({
    photoUrl: '',
    name: '',
    title: '',
    contact: '',
    email: '',
    bio: '',
    servicesProvided: [],
    experiences: [],
    qualifications: []
  });

  const [serviceInput, setServiceInput] = useState('');
  const [expInput, setExpInput] = useState({
    role: '',
    organization: '',
    duration: '',
    notes: ''
  });
  const [qualInput, setQualInput] = useState({
    title: '',
    institution: '',
    year: ''
  });

  useEffect(() => {
    setForm({
      photoUrl: profileData?.photoUrl || '',
      name: profileData?.name || '',
      title: profileData?.title || '',
      contact: profileData?.contact || '',
      email: profileData?.email || '',
      bio: profileData?.bio || '',
      servicesProvided: Array.isArray(profileData?.servicesProvided)
        ? profileData.servicesProvided
        : [],
      experiences: Array.isArray(profileData?.experiences)
        ? profileData.experiences
        : [],
      qualifications: Array.isArray(profileData?.qualifications)
        ? profileData.qualifications
        : []
    });
  }, [profileData]);

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      alert('Please choose an image under 900KB or paste a photo URL.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, photoUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const addService = () => {
    if (!serviceInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      servicesProvided: [...prev.servicesProvided, serviceInput.trim()]
    }));
    setServiceInput('');
  };

  const removeService = (index) => {
    setForm((prev) => ({
      ...prev,
      servicesProvided: prev.servicesProvided.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    if (!expInput.role.trim() && !expInput.organization.trim()) return;
    const item = {
      id: `exp-${Date.now()}`,
      role: expInput.role.trim(),
      organization: expInput.organization.trim(),
      duration: expInput.duration.trim(),
      notes: expInput.notes.trim()
    };
    setForm((prev) => ({
      ...prev,
      experiences: [item, ...prev.experiences]
    }));
    setExpInput({ role: '', organization: '', duration: '', notes: '' });
  };

  const removeExperience = (id) => {
    setForm((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((e) => e.id !== id)
    }));
  };

  const addQualification = () => {
    if (!qualInput.title.trim()) return;
    const item = {
      id: `qual-${Date.now()}`,
      title: qualInput.title.trim(),
      institution: qualInput.institution.trim(),
      year: qualInput.year.trim()
    };
    setForm((prev) => ({
      ...prev,
      qualifications: [item, ...prev.qualifications]
    }));
    setQualInput({ title: '', institution: '', year: '' });
  };

  const removeQualification = (id) => {
    setForm((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((q) => q.id !== id)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await onSave({
      ...profileData,
      ...form
    });
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white p-6 rounded-2xl border shadow-sm space-y-5 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-3">
          {form.photoUrl ? (
            <img
              src={form.photoUrl}
              alt="Profile"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-[#234E40]"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border flex items-center justify-center text-xl font-black text-[#234E40]">
              {(form.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
              {label || 'Profile'}
            </span>
            <h3 className="text-base font-black text-slate-900">
              Edit Profile Photo, What You Provide, Experience &amp; Qualifications
            </h3>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
        >
          {isSaving ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </div>

      {/* Profile Photo Upload & URL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border">
        <div>
          <label className="font-bold text-slate-700">Upload Profile Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoFileChange}
            className="w-full mt-1 p-2 border rounded-xl bg-white"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700">Or Paste Profile Photo URL</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              placeholder="https://example.com/photo.jpg"
              className="flex-1 p-2.5 border rounded-xl bg-white"
            />
            {form.photoUrl && (
              <button
                type="button"
                onClick={() => setForm({ ...form, photoUrl: '' })}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-xl font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Basic Profile Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="font-bold text-slate-700">Name / Organization</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name or organization"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700">Title / Role</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. C.E.O., Tour Guide, Agency"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700">Phone / WhatsApp</label>
          <input
            type="text"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="+25078XXXXXXX"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@example.com"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>
      </div>

      <div>
        <label className="font-bold text-slate-700">Bio / Summary</label>
        <input
          type="text"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Short summary about yourself or your organization..."
          className="w-full mt-1 p-2.5 border rounded-xl"
        />
      </div>

      {/* What You Provide */}
      <div className="space-y-2 pt-3 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">What You Provide (Services / Offerings)</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            placeholder="e.g. Guided Tours, Airport Transfers, Safari Packages"
            className="flex-1 p-2.5 border rounded-xl"
          />
          <button
            type="button"
            onClick={addService}
            className="px-4 py-2.5 bg-[#3B6E5B] text-white font-bold rounded-xl"
          >
            + Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {form.servicesProvided.map((srv, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 bg-emerald-50 text-[#234E40] px-3 py-1 rounded-full font-bold"
            >
              <span>• {srv}</span>
              <button
                type="button"
                onClick={() => removeService(idx)}
                className="text-red-600 font-black"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div className="space-y-2 pt-3 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">Experience</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border">
          <input
            type="text"
            value={expInput.role}
            onChange={(e) => setExpInput({ ...expInput, role: e.target.value })}
            placeholder="Role / Position"
            className="p-2 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={expInput.organization}
            onChange={(e) => setExpInput({ ...expInput, organization: e.target.value })}
            placeholder="Organization / Company"
            className="p-2 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={expInput.duration}
            onChange={(e) => setExpInput({ ...expInput, duration: e.target.value })}
            placeholder="Duration (e.g. 2025 - 1 yr)"
            className="p-2 border rounded-xl bg-white"
          />
          <button
            type="button"
            onClick={addExperience}
            className="px-4 py-2 bg-[#234E40] text-white font-bold rounded-xl"
          >
            + Add Experience
          </button>
          <input
            type="text"
            value={expInput.notes}
            onChange={(e) => setExpInput({ ...expInput, notes: e.target.value })}
            placeholder="Details / responsibilities (optional)"
            className="md:col-span-4 p-2 border rounded-xl bg-white"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          {form.experiences.map((exp) => (
            <div
              key={exp.id}
              className="p-3 rounded-xl border bg-slate-50 flex justify-between items-start gap-2"
            >
              <div>
                <p className="font-bold text-slate-900">
                  {exp.role} {exp.organization ? `— ${exp.organization}` : ''}
                </p>
                {exp.duration && (
                  <p className="text-[11px] text-[#3B6E5B] font-semibold">{exp.duration}</p>
                )}
                {exp.notes && <p className="text-slate-600">{exp.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeExperience(exp.id)}
                className="text-red-600 font-bold"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Qualifications */}
      <div className="space-y-2 pt-3 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">Qualifications</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border">
          <input
            type="text"
            value={qualInput.title}
            onChange={(e) => setQualInput({ ...qualInput, title: e.target.value })}
            placeholder="Degree / Diploma / Certificate"
            className="p-2 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={qualInput.institution}
            onChange={(e) => setQualInput({ ...qualInput, institution: e.target.value })}
            placeholder="Institution / Issuer"
            className="p-2 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={qualInput.year}
            onChange={(e) => setQualInput({ ...qualInput, year: e.target.value })}
            placeholder="Year / Status"
            className="p-2 border rounded-xl bg-white"
          />
          <button
            type="button"
            onClick={addQualification}
            className="px-4 py-2 bg-[#234E40] text-white font-bold rounded-xl"
          >
            + Add Qualification
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          {form.qualifications.map((qual) => (
            <div
              key={qual.id}
              className="p-3 rounded-xl border bg-slate-50 flex justify-between items-start gap-2"
            >
              <div>
                <p className="font-bold text-slate-900">🎓 {qual.title}</p>
                <p className="text-[11px] text-slate-600">
                  {[qual.institution, qual.year].filter(Boolean).join(' • ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeQualification(qual.id)}
                className="text-red-600 font-bold"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}

// =========================================================================
// OPEN BOOKING & JOB ASSIGNMENT MARKETPLACE (Isolated `openBookings` Node)
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
      <div className="bg-[#234E40] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
            Open Access Booking Board
          </span>
          <h3 className="font-bold text-base md:text-xl pt-1">
            📅 Live Bookings &amp; Job Assignments
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
              <label className="font-bold text-slate-700">Trip Requirements &amp; Notes</label>
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
                        🔒 Taken &amp; Dismissed
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

                <div className="pt-2 border-t border-slate-200 space-y-2">
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

                  {isTaken && !isGrantedToMe && !isOwner && (
                    <div className="bg-slate-200 text-slate-700 p-2.5 rounded-xl text-center font-semibold">
                      🔒 This booking has already been taken by{' '}
                      <strong>{booking.approvedProvider?.providerName}</strong> and is dismissed.
                    </div>
                  )}

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
                          Open for verified Tour Companies, Agencies &amp; Graduates to request.
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
  const [showUserProfileEditor, setShowUserProfileEditor] = useState(false);
  const [selectedInspectedUser, setSelectedInspectedUser] = useState(null);
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activePopupAd, setActivePopupAd] = useState(null);

  const [newAdForm, setNewAdForm] = useState({
    advertiserName: '',
    advertiserContact: '',
    headline: '',
    description: '',
    badge: 'Paid Partner',
    ctaLabel: 'Learn More',
    targetAudience: 'all',
    active: true
  });

  const [appConfig, setAppConfig] = useState(DEFAULT_APP_SERVER_CONFIG);
  const [subscriptionPlans, setSubscriptionPlans] = useState(DEFAULT_SUBSCRIPTION_PLANS);
  const [subscribers, setSubscribers] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [authMode, setAuthMode] = useState('login');
  const [selectedRoleForAuth, setSelectedRoleForAuth] = useState('');
  const [authContactInput, setAuthContactInput] = useState('');
  const [authNameInput, setAuthNameInput] = useState('');
  const [authInstitutionInput, setAuthInstitutionInput] = useState('');
  const [authLicenseInput, setAuthLicenseInput] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');

  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

  const checkSubscriptionActive = (sub) => {
    if (!sub || sub.status !== 'approved') return false;
    if (!sub.expiresAt) return true;
    return new Date(sub.expiresAt).getTime() > Date.now();
  };

  useEffect(() => {
    const syncFromFirebase = async () => {
      const [fbConfigs, fbPlans, fbSubs] = await Promise.all([
        firestoreGetCollection('appConfig'),
        firestoreGetCollection('subscriptionPlans'),
        firestoreGetCollection('subscribers')
      ]);

      if (fbConfigs.length > 0) {
        const mainCfg = fbConfigs.find((c) => c.id === 'main') || fbConfigs[0];
        setAppConfig((prev) => ({ ...prev, ...mainCfg }));
      }

      if (fbPlans.length > 0) {
        const sortedPlans = [...fbPlans].sort((a, b) => (a.order || 99) - (b.order || 99));
        setSubscriptionPlans(sortedPlans);
      }

      if (fbSubs.length > 0) setSubscribers(fbSubs);
    };

    syncFromFirebase();
    const interval = setInterval(syncFromFirebase, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser && subscribers.length > 0) {
      const fresh = subscribers.find((s) => s.id === currentUser.id);
      if (fresh) {
        setCurrentUser(fresh);
        setIsSubscribed(checkSubscriptionActive(fresh));
      }
    }
  }, [subscribers]);

  useEffect(() => {
    const activeAds = (appConfig.ads || []).filter((ad) => ad.active);
    if (activeAds.length === 0 || currentRole === 'owner') return;

    const showRandomPopup = () => {
      const relevantAds = activeAds.filter(
        (ad) =>
          ad.targetAudience === 'all' ||
          ad.targetAudience === currentRole ||
          currentRole === 'welcome'
      );
      if (relevantAds.length > 0) {
        const chosen = relevantAds[Math.floor(Math.random() * relevantAds.length)];
        setActivePopupAd(chosen);
      }
    };

    const initialTimer = setTimeout(showRandomPopup, 2500);
    const repeatTimer = setInterval(showRandomPopup, 45000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(repeatTimer);
    };
  }, [appConfig.ads, currentRole]);

  const saveAppServerConfig = async (updatedConfig) => {
    setIsSaving(true);
    setAppConfig(updatedConfig);
    await firestoreSaveDoc('appConfig', 'main', updatedConfig);
    setIsSaving(false);
  };

  const handleSaveOwnerProfile = async (updatedOwnerProfile) => {
    const nextConfig = {
      ...appConfig,
      ownerProfile: updatedOwnerProfile
    };
    await saveAppServerConfig(nextConfig);
    alert('✓ Owner profile, photo, offerings, experience & qualifications saved!');
  };

  const handleSaveUserProfile = async (updatedProfile) => {
    setIsSaving(true);
    if (currentUser?.id) {
      const nextUser = {
        ...currentUser,
        ...updatedProfile,
        updatedAt: new Date().toISOString()
      };
      setCurrentUser(nextUser);
      setSubscribers((prev) => prev.map((s) => (s.id === nextUser.id ? nextUser : s)));
      await firestoreSaveDoc('subscribers', nextUser.id, nextUser);
    } else {
      const guestProfile = {
        id: `guest-${Date.now()}`,
        role: currentRole,
        ...currentUser,
        ...updatedProfile,
        updatedAt: new Date().toISOString()
      };
      setCurrentUser(guestProfile);
    }
    setIsSaving(false);
    alert('✓ Profile, photo, offerings, experience & qualifications saved!');
  };

  const handleCreatePaidAd = async (e) => {
    e.preventDefault();
    if (!newAdForm.headline.trim() || !newAdForm.advertiserName.trim()) {
      alert('Please enter the Paid Company name and Ad Headline.');
      return;
    }
    const createdAd = {
      id: `ad-${Date.now()}`,
      advertiserName: newAdForm.advertiserName.trim(),
      advertiserContact: newAdForm.advertiserContact.trim(),
      headline: newAdForm.headline.trim(),
      description: newAdForm.description.trim(),
      badge: newAdForm.badge.trim() || 'Paid Partner',
      ctaLabel: newAdForm.ctaLabel.trim() || 'Learn More',
      targetAudience: newAdForm.targetAudience || 'all',
      active: Boolean(newAdForm.active),
      createdAt: new Date().toISOString()
    };

    const nextConfig = {
      ...appConfig,
      ads: [createdAd, ...(appConfig.ads || [])]
    };
    await saveAppServerConfig(nextConfig);
    setNewAdForm({
      advertiserName: '',
      advertiserContact: '',
      headline: '',
      description: '',
      badge: 'Paid Partner',
      ctaLabel: 'Learn More',
      targetAudience: 'all',
      active: true
    });
    alert('✓ Paid company advertisement saved!');
  };

  const handleToggleAdActive = async (adId) => {
    const nextAds = (appConfig.ads || []).map((a) =>
      a.id === adId ? { ...a, active: !a.active } : a
    );
    await saveAppServerConfig({ ...appConfig, ads: nextAds });
  };

  const handleDeleteAd = async (adId) => {
    if (!window.confirm('Delete this advertisement?')) return;
    const nextAds = (appConfig.ads || []).filter((a) => a.id !== adId);
    await saveAppServerConfig({ ...appConfig, ads: nextAds });
  };

  const handleOwnerLogin = (e) => {
    e.preventDefault();
    if (ownerPinInput === 'FYP$2026') {
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setCurrentRole('owner');
    } else {
      alert('Invalid Owner password.');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const cleanContact = normalizeContact(authContactInput);
    if (!cleanContact) return;

    if (authMode === 'login') {
      const existing = subscribers.find(
        (s) =>
          normalizeContact(s.contact) === cleanContact &&
          s.role === selectedRoleForAuth
      );
      if (!existing) {
        alert('Account not found for this role. Please switch to "New Registration" first.');
        return;
      }
      setCurrentUser(existing);
      setIsSubscribed(checkSubscriptionActive(existing));
      setCurrentRole(existing.role);
      return;
    }

    if (!appConfig.allowNewSignups) {
      alert('New registrations are temporarily paused by the platform administrator.');
      return;
    }
    if (!authNameInput.trim()) {
      alert('Please enter your Full Name or Organization Name.');
      return;
    }

    const chosenPlan =
      subscriptionPlans.find((p) => p.id === selectedPlanId) || subscriptionPlans[0];

    const newSub = {
      id: `sub-${Date.now()}`,
      name: authNameInput.trim(),
      contact: authContactInput.trim(),
      role: selectedRoleForAuth,
      institution: authInstitutionInput.trim(),
      license: authLicenseInput.trim(),
      photoUrl: '',
      servicesProvided: [],
      experiences: [],
      qualifications: [],
      planId: chosenPlan.id,
      planName: chosenPlan.name,
      planDays: chosenPlan.days,
      amountPaid: chosenPlan.price,
      status: 'pending',
      registeredAt: new Date().toISOString(),
      expiresAt: null
    };

    setIsSaving(true);
    setSubscribers([newSub, ...subscribers]);
    await firestoreSaveDoc('subscribers', newSub.id, newSub);
    setIsSaving(false);

    setCurrentUser(newSub);
    setIsSubscribed(false);
    setCurrentRole(newSub.role);
    alert(
      `✓ Registration submitted! Pay ${chosenPlan.price.toLocaleString()} RWF via MTN MoMo Code ${appConfig.momoCode} to activate your ${chosenPlan.name} plan.`
    );
  };

  const handleApproveSubscriber = async (sub) => {
    const days = sub.planDays || 30;
    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const updated = {
      ...sub,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      expiresAt: expiryDate
    };
    setSubscribers(subscribers.map((s) => (s.id === sub.id ? updated : s)));
    await firestoreSaveDoc('subscribers', sub.id, updated);
  };

  const handleRevokeSubscriber = async (sub) => {
    const updated = { ...sub, status: 'suspended' };
    setSubscribers(subscribers.map((s) => (s.id === sub.id ? updated : s)));
    await firestoreSaveDoc('subscribers', sub.id, updated);
  };

  const handleDeleteSubscriber = async (subId) => {
    if (!window.confirm('Permanently delete this user account from Firebase?')) return;
    setSubscribers(subscribers.filter((s) => s.id !== subId));
    if (selectedInspectedUser?.id === subId) {
      setSelectedInspectedUser(null);
    }
    await firestoreDeleteDoc('subscribers', subId);
  };

  const roleLabelMap = {
    graduate: 'Tourism Graduate / Guide',
    agency: 'Travel Agency',
    tour_company: 'Tour Company',
    traveler: 'Traveler / Visitor',
    owner: 'Platform Owner (C.E.O.)'
  };

  const visibleAnnouncements = (appConfig.announcements || []).filter(
    (ann) => ann.targetRole === 'all' || ann.targetRole === currentRole
  );

  const pendingSignupsCount = subscribers.filter((s) => s.status === 'pending').length;

  if (appConfig.maintenanceMode && currentRole !== 'owner') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-5xl">🛠️</div>
        <h1 className="text-2xl font-extrabold">{appConfig.appName}</h1>
        <p className="text-slate-300 max-w-md text-sm">{appConfig.maintenanceMessage}</p>
        <button
          type="button"
          onClick={() => setShowOwnerPinModal(true)}
          className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold"
        >
          Admin / Owner Access
        </button>

        {showOwnerPinModal && (
          <form
            onSubmit={handleOwnerLogin}
            className="bg-white text-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-xs space-y-3"
          >
            <h3 className="font-bold text-sm">Enter Owner Password</h3>
            <input
              type="password"
              placeholder="Enter Owner Password"
              value={ownerPinInput}
              onChange={(e) => setOwnerPinInput(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOwnerPinModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#234E40] text-white rounded-xl text-xs font-bold"
              >
                Unlock
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* TOP NAVIGATION BAR */}
      <header
        style={{ backgroundColor: appConfig.primaryColor || '#234E40' }}
        className="text-white px-4 md:px-8 py-4 shadow-md sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div
            onClick={() => setCurrentRole('welcome')}
            className="cursor-pointer flex items-center space-x-3"
          >
            {currentRole === 'owner' && appConfig.ownerProfile?.photoUrl ? (
              <img
                src={appConfig.ownerProfile.photoUrl}
                alt="Owner"
                className="w-10 h-10 rounded-xl object-cover border-2 border-amber-400 shadow"
              />
            ) : currentUser?.photoUrl ? (
              <img
                src={currentUser.photoUrl}
                alt="User"
                className="w-10 h-10 rounded-xl object-cover border-2 border-amber-400 shadow"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg shadow">
                GL
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-base md:text-lg leading-tight">
                {appConfig.appName}
              </h1>
              <p className="text-[11px] text-emerald-100 hidden sm:block">
                {appConfig.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="bg-white/15 px-3 py-1.5 rounded-full font-bold text-amber-300">
              {appConfig.travelerFreeBadge}
            </span>

            {currentUser && (
              <span className="bg-black/25 px-3 py-1.5 rounded-full font-semibold">
                👤 {currentUser.name} ({isSubscribed ? '✓ Active' : '⏳ Pending'})
              </span>
            )}

            {currentRole !== 'welcome' && (
              <button
                type="button"
                onClick={() => setCurrentRole('welcome')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl font-bold transition"
              >
                ← Switch Portal
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                currentRole === 'owner'
                  ? setCurrentRole('owner')
                  : setShowOwnerPinModal(true)
              }
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-extrabold shadow transition"
            >
              👑 Owner C.E.O.
            </button>
          </div>
        </div>
      </header>

      {/* LIVE ANNOUNCEMENTS BANNER */}
      {visibleAnnouncements.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-950">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {visibleAnnouncements.map((ann, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="font-extrabold uppercase bg-amber-400 px-2 py-0.5 rounded text-[10px]">
                  Notice
                </span>
                <strong>{ann.title}:</strong>
                <span>{ann.body}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* ===============================================================
            1. WELCOME PORTAL & ROLE SELECTOR
           =============================================================== */}
        {currentRole === 'welcome' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 md:p-10 border shadow-sm text-center space-y-4">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-[#234E40]">
                🇷🇼 Rwanda&apos;s Official Tourism Talent &amp; Booking Network
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900">
                {appConfig.tagline}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-sm md:text-base">
                {appConfig.subtitle}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-left">
                {[
                  {
                    role: 'graduate',
                    icon: '🎓',
                    title: 'Tourism Graduate / Guide',
                    desc: 'Find paid guiding jobs, bid on open tours, and connect with agencies.'
                  },
                  {
                    role: 'agency',
                    icon: '✈️',
                    title: 'Travel Agency',
                    desc: 'Post job openings, hire certified graduates, and manage tour bookings.'
                  },
                  {
                    role: 'tour_company',
                    icon: '🚐',
                    title: 'Tour Company',
                    desc: 'Source field guides, fulfill custom safari requests, and scale operations.'
                  },
                  {
                    role: 'traveler',
                    icon: '🌍',
                    title: 'Traveler / Visitor (FREE)',
                    desc: 'Request custom Rwanda trips, compare quotes, and hire verified guides.'
                  }
                ].map((card) => (
                  <div
                    key={card.role}
                    onClick={() => {
                      if (card.role === 'traveler') {
                        setCurrentRole('traveler');
                      } else {
                        setSelectedRoleForAuth(card.role);
                        setCurrentRole('auth');
                      }
                    }}
                    className="p-5 rounded-2xl border-2 border-slate-100 hover:border-[#234E40] bg-slate-50/60 hover:bg-white cursor-pointer transition shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="text-3xl">{card.icon}</div>
                      <h3 className="font-extrabold text-base text-slate-900">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-600">{card.desc}</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#234E40]">
                      Enter Portal →
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <BookingMarketplace currentUser={currentUser} currentRole={currentRole} />
          </div>
        )}

        {/* ===============================================================
            2. AUTHENTICATION & SUBSCRIPTION REGISTRATION
           =============================================================== */}
        {currentRole === 'auth' && (
          <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">
                  {roleLabelMap[selectedRoleForAuth]}
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {authMode === 'login' ? 'Sign In to Your Account' : 'Create Partner Account'}
                </h2>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`px-3 py-1.5 rounded-lg ${
                    authMode === 'login' ? 'bg-[#234E40] text-white' : 'text-slate-600'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`px-3 py-1.5 rounded-lg ${
                    authMode === 'register' ? 'bg-[#234E40] text-white' : 'text-slate-600'
                  }`}
                >
                  New Registration
                </button>
              </div>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="font-bold text-slate-700">
                      Full Name or Registered Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RUTUNGURA Bonheur / Echo Travels Ltd"
                      value={authNameInput}
                      onChange={(e) => setAuthNameInput(e.target.value)}
                      className="w-full mt-1 p-3 border rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700">
                        Institution / RDB Registration Info
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. RP Kitabi College / RDB Code"
                        value={authInstitutionInput}
                        onChange={(e) => setAuthInstitutionInput(e.target.value)}
                        className="w-full mt-1 p-3 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">
                        License / Diploma Number
                      </label>
                      <input
                        type="text"
                        placeholder="Optional verification ID"
                        value={authLicenseInput}
                        onChange={(e) => setAuthLicenseInput(e.target.value)}
                        className="w-full mt-1 p-3 border rounded-xl"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="font-bold text-slate-700">
                  Phone Number (WhatsApp) or Email *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+250780558555"
                  value={authContactInput}
                  onChange={(e) => setAuthContactInput(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-xl"
                />
              </div>

              {authMode === 'register' && (
                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-700 block">
                    Select Subscription Tier (MTN MoMo Code: {appConfig.momoCode})
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {subscriptionPlans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                          selectedPlanId === plan.id
                            ? 'border-[#234E40] bg-emerald-50/60'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                            {plan.badge}
                          </span>
                          <span className="font-black text-sm text-[#234E40]">
                            {Number(plan.price).toLocaleString()} RWF
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 mt-1">{plan.name}</p>
                        <p className="text-[11px] text-slate-500">{plan.durationLabel}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-[#234E40] hover:bg-slate-900 text-white font-extrabold rounded-xl shadow transition"
              >
                {isSaving
                  ? 'Connecting to Firebase...'
                  : authMode === 'login'
                  ? 'Access Dashboard →'
                  : 'Submit Registration & Proceed →'}
              </button>
            </form>
          </div>
        )}

        {/* ===============================================================
            3. MEMBER & TRAVELER DASHBOARDS
           =============================================================== */}
        {['graduate', 'agency', 'tour_company', 'traveler'].includes(currentRole) && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {currentUser?.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name || 'User'}
                    className="w-12 h-12 rounded-2xl object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center font-black text-[#234E40] text-lg">
                    {(currentUser?.name || 'G').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">
                    {roleLabelMap[currentRole]}
                  </span>
                  <h2 className="text-xl font-black text-slate-900">
                    Welcome, {currentUser?.name || 'Guest Traveler'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserProfileEditor(!showUserProfileEditor)}
                  className="px-4 py-2 bg-[#234E40] hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow"
                >
                  {showUserProfileEditor ? 'Hide Profile Editor' : '✏️ Edit My Profile & CV'}
                </button>

                {currentRole !== 'traveler' && !isSubscribed && (
                  <div className="bg-amber-50 border border-amber-300 px-4 py-2.5 rounded-xl text-xs text-amber-950">
                    <strong>⏳ Pending Activation:</strong> Pay via MTN MoMo Code{' '}
                    <strong className="underline">{appConfig.momoCode}</strong>. Owner C.E.O. (+250780558555) will approve shortly.
                  </div>
                )}
              </div>
            </div>

            {showUserProfileEditor && (
              <UserAndOwnerProfileSection
                profileData={currentUser || { role: currentRole }}
                label={roleLabelMap[currentRole]}
                onSave={handleSaveUserProfile}
                isSaving={isSaving}
              />
            )}

            <BookingMarketplace currentUser={currentUser} currentRole={currentRole} />
          </div>
        )}

        {/* ===============================================================
            4. OWNER / C.E.O. MANAGEMENT CONSOLE
           =============================================================== */}
        {currentRole === 'owner' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {appConfig.ownerProfile?.photoUrl ? (
                  <img
                    src={appConfig.ownerProfile.photoUrl}
                    alt="Owner"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xl">
                    RB
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                    C.E.O. Control Center
                  </span>
                  <h2 className="text-xl md:text-2xl font-black mt-1">
                    {appConfig.ownerProfile?.name || 'RUTUNGURA Bonheur'} — Platform Owner Dashboard
                  </h2>
                  <p className="text-xs text-slate-300">
                    Contact: {appConfig.ownerProfile?.contact || '+250780558555'} • Email:{' '}
                    {appConfig.ownerProfile?.email || 'rutungurab5@gmail.com'} • MoMo Code:{' '}
                    {appConfig.momoCode}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setOwnerTab('signups')}
                  className={`px-4 py-2 rounded-xl flex items-center gap-1.5 ${
                    ownerTab === 'signups'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <span>📝 Signups</span>
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/25">
                    {pendingSignupsCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('pending')}
                  className={`px-4 py-2 rounded-xl ${
                    ownerTab === 'pending'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  👥 All Users ({subscribers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('ads')}
                  className={`px-4 py-2 rounded-xl ${
                    ownerTab === 'ads'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  📢 Ads ({(appConfig.ads || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('owner_profile')}
                  className={`px-4 py-2 rounded-xl ${
                    ownerTab === 'owner_profile'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  🪪 Owner Profile &amp; CV
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('server')}
                  className={`px-4 py-2 rounded-xl ${
                    ownerTab === 'server'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  ⚙️ Server Settings
                </button>
              </div>
            </div>

            {/* SIGNUPS TAB: VIEW ALL NEW SIGNUPS & APPROVE (ACCESS) / REVOKE / DELETE */}
            {ownerTab === 'signups' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      📝 New Signups &amp; Access Control
                    </h3>
                    <p className="text-slate-500">
                      Review new registrations and grant access, revoke access, or delete accounts.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-bold">
                    Pending Signups: {pendingSignupsCount}
                  </span>
                </div>

                {subscribers.length === 0 ? (
                  <p className="text-slate-500">No signups recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {subscribers.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl border bg-slate-50 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {sub.photoUrl ? (
                            <img
                              src={sub.photoUrl}
                              alt={sub.name}
                              className="w-11 h-11 rounded-xl object-cover border"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-[#234E40] font-black flex items-center justify-center text-sm">
                              {(sub.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-sm text-slate-900">{sub.name}</p>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  sub.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sub.status === 'suspended'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sub.status || 'pending'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              Role: <strong>{roleLabelMap[sub.role] || sub.role}</strong> • Contact:{' '}
                              <strong>{sub.contact}</strong> • Plan:{' '}
                              <strong>{sub.planName || 'Starter'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveSubscriber(sub)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                          >
                            ✓ Grant Access
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeSubscriber(sub)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold"
                          >
                            ⛔ Revoke Access
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscriber(sub.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ALL USERS TAB: FULL OWNER ACCESS TO INSPECT & MANAGE ANY USER */}
            {ownerTab === 'pending' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      All Registered Users — Full Owner Access
                    </h3>
                    <p className="text-slate-500">
                      Click &quot;Inspect User&quot; to view or manage any user&apos;s full profile, services, experience &amp; qualifications.
                    </p>
                  </div>
                </div>

                {subscribers.length === 0 ? (
                  <p className="text-slate-500">No subscribers registered yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b text-slate-500 uppercase text-[10px]">
                          <th className="py-2.5">User</th>
                          <th className="py-2.5">Role</th>
                          <th className="py-2.5">Contact</th>
                          <th className="py-2.5">Plan</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {subscribers.map((sub) => (
                          <tr key={sub.id}>
                            <td className="py-3 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                {sub.photoUrl && (
                                  <img
                                    src={sub.photoUrl}
                                    alt={sub.name}
                                    className="w-8 h-8 rounded-lg object-cover border"
                                  />
                                )}
                                <span>{sub.name}</span>
                              </div>
                            </td>
                            <td className="py-3">{sub.role}</td>
                            <td className="py-3">{sub.contact}</td>
                            <td className="py-3">
                              {sub.planName} ({Number(sub.amountPaid || 0).toLocaleString()} RWF)
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                  sub.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sub.status === 'suspended'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-3 text-right space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedInspectedUser(sub)}
                                className="px-2.5 py-1 bg-slate-800 text-white rounded-lg font-bold"
                              >
                                Inspect User
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveSubscriber(sub)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold"
                              >
                                Access
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeSubscriber(sub)}
                                className="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-bold"
                              >
                                Revoke
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubscriber(sub.id)}
                                className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedInspectedUser && (
                  <div className="p-5 rounded-2xl border-2 border-[#234E40] bg-emerald-50/40 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-3">
                        {selectedInspectedUser.photoUrl && (
                          <img
                            src={selectedInspectedUser.photoUrl}
                            alt={selectedInspectedUser.name}
                            className="w-12 h-12 rounded-xl object-cover border"
                          />
                        )}
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {selectedInspectedUser.name} ({selectedInspectedUser.role})
                          </h4>
                          <p className="text-[11px] text-slate-600">
                            Contact: {selectedInspectedUser.contact} • Email:{' '}
                            {selectedInspectedUser.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedInspectedUser(null)}
                        className="px-3 py-1 bg-slate-200 rounded-lg font-bold"
                      >
                        Close
                      </button>
                    </div>

                    {selectedInspectedUser.bio && (
                      <p className="text-slate-700">{selectedInspectedUser.bio}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-xl border">
                        <p className="font-bold text-[#234E40] mb-1">Services Provided</p>
                        {(selectedInspectedUser.servicesProvided || []).length === 0 ? (
                          <p className="text-slate-400 italic">None listed</p>
                        ) : (
                          <ul className="space-y-1">
                            {(selectedInspectedUser.servicesProvided || []).map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="bg-white p-3 rounded-xl border">
                        <p className="font-bold text-[#234E40] mb-1">Experience</p>
                        {(selectedInspectedUser.experiences || []).length === 0 ? (
                          <p className="text-slate-400 italic">None listed</p>
                        ) : (
                          <ul className="space-y-1">
                            {(selectedInspectedUser.experiences || []).map((exp, i) => (
                              <li key={exp.id || i}>
                                <strong>{exp.role}</strong>
                                {exp.organization ? ` @ ${exp.organization}` : ''}
                                {exp.duration ? ` (${exp.duration})` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="bg-white p-3 rounded-xl border">
                        <p className="font-bold text-[#234E40] mb-1">Qualifications</p>
                        {(selectedInspectedUser.qualifications || []).length === 0 ? (
                          <p className="text-slate-400 italic">None listed</p>
                        ) : (
                          <ul className="space-y-1">
                            {(selectedInspectedUser.qualifications || []).map((q, i) => (
                              <li key={q.id || i}>
                                🎓 <strong>{q.title}</strong>
                                {q.institution ? ` — ${q.institution}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ADS TAB: SET ADVERTISING FOR PAID COMPANIES */}
            {ownerTab === 'ads' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6 text-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    📢 Set Advertising for Paid Companies
                  </h3>
                  <p className="text-slate-500">
                    Create and toggle pop-up advertisements for paid partner companies.
                  </p>
                </div>

                <form
                  onSubmit={handleCreatePaidAd}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border"
                >
                  <div>
                    <label className="font-bold text-slate-700">Paid Company Name *</label>
                    <input
                      type="text"
                      required
                      value={newAdForm.advertiserName}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, advertiserName: e.target.value })
                      }
                      placeholder="e.g. Echo Travels Ltd"
                      className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Company Contact</label>
                    <input
                      type="text"
                      value={newAdForm.advertiserContact}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, advertiserContact: e.target.value })
                      }
                      placeholder="+250780558555"
                      className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Target Audience</label>
                    <select
                      value={newAdForm.targetAudience}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, targetAudience: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                    >
                      <option value="all">All Users &amp; Visitors</option>
                      <option value="traveler">Travelers</option>
                      <option value="graduate">Tourism Graduates / Guides</option>
                      <option value="agency">Travel Agencies</option>
                      <option value="tour_company">Tour Companies</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Ad Headline *</label>
                    <input
                      type="text"
                      required
                      value={newAdForm.headline}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, headline: e.target.value })
                      }
                      placeholder="e.g. Discounted Volcanoes & Kivu Packages"
                      className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Badge Label</label>
                    <input
                      type="text"
                      value={newAdForm.badge}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, badge: e.target.value })
                      }
                      placeholder="Paid Partner"
                      className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Button / CTA Label</label>
                    <input
                      type="text"
                      value={newAdForm.ctaLabel}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, ctaLabel: e.target.value })
                      }
                      placeholder="Book Now"
                      className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="font-bold text-slate-700">Ad Description</label>
                    <input
                      type="text"
                      value={newAdForm.description}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, description: e.target.value })
                      }
                      placeholder="Describe the company's offer or promotion..."
                      className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                    />
                  </div>

                  <div className="md:col-span-3 flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newAdForm.active}
                        onChange={(e) =>
                          setNewAdForm({ ...newAdForm, active: e.target.checked })
                        }
                      />
                      <span>Active (Show in pop-up rotation)</span>
                    </label>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
                    >
                      {isSaving ? 'Saving...' : '+ Publish Paid Company Ad'}
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-sm text-slate-800">
                    Configured Company Ads ({(appConfig.ads || []).length})
                  </h4>
                  {(appConfig.ads || []).length === 0 ? (
                    <p className="text-slate-400 italic">No ads created yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(appConfig.ads || []).map((ad) => (
                        <div
                          key={ad.id}
                          className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-extrabold uppercase bg-amber-300 text-slate-950 px-2 py-0.5 rounded-full">
                                {ad.badge || 'Paid Partner'}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  ad.active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {ad.active ? '● Active' : '○ Paused'}
                              </span>
                            </div>
                            <h5 className="font-extrabold text-sm text-slate-900 mt-1.5">
                              {ad.headline}
                            </h5>
                            <p className="text-[11px] text-slate-600">
                              Company: <strong>{ad.advertiserName}</strong> • Audience:{' '}
                              {ad.targetAudience}
                            </p>
                            {ad.description && (
                              <p className="text-slate-600 mt-1">{ad.description}</p>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                              type="button"
                              onClick={() => handleToggleAdActive(ad.id)}
                              className="px-3 py-1 bg-slate-800 text-white rounded-lg font-bold"
                            >
                              {ad.active ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAd(ad.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {ownerTab === 'owner_profile' && (
              <UserAndOwnerProfileSection
                profileData={appConfig.ownerProfile || {}}
                label="Platform Owner (C.E.O.)"
                onSave={handleSaveOwnerProfile}
                isSaving={isSaving}
              />
            )}

            {ownerTab === 'server' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                <h3 className="font-bold text-base text-slate-900">
                  Live Firebase App Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700">Platform Name</label>
                    <input
                      type="text"
                      value={appConfig.appName}
                      onChange={(e) =>
                        setAppConfig({ ...appConfig, appName: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">MTN MoMo Payment Code</label>
                    <input
                      type="text"
                      value={appConfig.momoCode}
                      onChange={(e) =>
                        setAppConfig({ ...appConfig, momoCode: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-700">Tagline</label>
                    <input
                      type="text"
                      value={appConfig.tagline}
                      onChange={(e) =>
                        setAppConfig({ ...appConfig, tagline: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveAppServerConfig(appConfig)}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#234E40] text-white rounded-xl font-bold shadow"
                >
                  {isSaving ? 'Saving...' : 'Save Server Config to Firebase'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* POP-UP SPONSORED AD MODAL */}
      {activePopupAd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setActivePopupAd(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-xs"
            >
              ✕
            </button>
            <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
              {activePopupAd.badge || 'Sponsored Partner'}
            </span>
            <h3 className="text-lg font-black text-slate-900">
              {activePopupAd.headline}
            </h3>
            <p className="text-xs text-slate-600">{activePopupAd.description}</p>
            <div className="flex justify-between items-center pt-2 border-t text-xs">
              <span className="font-bold text-slate-700">
                {activePopupAd.advertiserName}
              </span>
              <button
                type="button"
                onClick={() => setActivePopupAd(null)}
                className="px-4 py-2 bg-[#234E40] text-white rounded-xl font-bold"
              >
                {activePopupAd.ctaLabel || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OWNER PIN MODAL */}
      {showOwnerPinModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleOwnerLogin}
            className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-xs space-y-4"
          >
            <h3 className="font-extrabold text-base text-slate-900">
              👑 C.E.O. Owner Verification
            </h3>
            <p className="text-xs text-slate-500">
              Enter your Owner password to manage subscribers, approvals, and live Firebase settings.
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Enter Owner Password"
              value={ownerPinInput}
              onChange={(e) => setOwnerPinInput(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm"
            />
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowOwnerPinModal(false)}
                className="px-4 py-2 text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#234E40] text-white rounded-xl"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t py-4 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {appConfig.appName} • {appConfig.footerLocation} • Powered by Firebase
      </footer>
    </div>
  );
}
