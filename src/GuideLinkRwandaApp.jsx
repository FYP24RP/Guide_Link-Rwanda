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

const DEFAULT_OWNER_PROFILE = {
  name: 'RUTUNGURA Bonheur',
  title: 'C.E.O.',
  contact: '+250780558555',
  email: 'rutungurab5@gmail.com',
  location: 'Kigali / Kitabi / Rusizi, Rwanda',
  bio: 'Founder & C.E.O. of GuideLink Rwanda, connecting tourism graduates, travel agencies, tour companies, and travelers across Rwanda.',
  servicesProvided: [
    'GuideLink Rwanda Platform Leadership & Partnerships',
    'Tourism Talent & Agency Matching',
    'Custom Rwanda Tour & Hospitality Advisory'
  ],
  experiences: [
    {
      id: 'exp-default-1',
      role: 'F&B Cost Controller',
      organization: 'AFRIPOT Cuisine Ltd',
      period: 'Apr 2026 – Sep 2026 (5 Months)',
      details: 'Managed food and beverage cost control, inventory tracking, and operational margins.'
    },
    {
      id: 'exp-default-2',
      role: 'Bartender & Service Attendant',
      organization: 'Nyungwe Top View Hill Hotel',
      period: '2025 (1 Year)',
      details: 'Delivered guest service, beverage preparation, and hospitality operations in Nyungwe.'
    }
  ],
  qualifications: [
    {
      id: 'qual-default-1',
      title: 'Advanced Diploma in Tours and Travel Management',
      issuer: 'RP Kitabi College',
      year: 'Expected May 2027',
      credentialId: ''
    }
  ]
};

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
  ownerProfile: DEFAULT_OWNER_PROFILE,
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
// REUSABLE PROFILE EDITOR (FOR BOTH OWNER & ALL USERS)
// =========================================================================
function ProfileEditorPanel({
  profileData,
  roleLabel,
  onSaveProfile,
  isSaving
}) {
  const [form, setForm] = useState({
    name: '',
    title: '',
    contact: '',
    email: '',
    location: '',
    institution: '',
    license: '',
    bio: '',
    servicesProvided: [],
    experiences: [],
    qualifications: []
  });

  const [newService, setNewService] = useState('');
  const [newExp, setNewExp] = useState({
    role: '',
    organization: '',
    period: '',
    details: ''
  });
  const [newQual, setNewQual] = useState({
    title: '',
    issuer: '',
    year: '',
    credentialId: ''
  });

  useEffect(() => {
    setForm({
      name: profileData?.name || '',
      title: profileData?.title || '',
      contact: profileData?.contact || '',
      email: profileData?.email || '',
      location: profileData?.location || '',
      institution: profileData?.institution || '',
      license: profileData?.license || '',
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

  const handleAddService = (e) => {
    e.preventDefault();
    const trimmed = newService.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      servicesProvided: [...prev.servicesProvided, trimmed]
    }));
    setNewService('');
  };

  const handleRemoveService = (idx) => {
    setForm((prev) => ({
      ...prev,
      servicesProvided: prev.servicesProvided.filter((_, i) => i !== idx)
    }));
  };

  const handleAddExperience = (e) => {
    e.preventDefault();
    if (!newExp.role.trim() && !newExp.organization.trim()) return;
    const item = {
      id: `exp-${Date.now()}`,
      role: newExp.role.trim(),
      organization: newExp.organization.trim(),
      period: newExp.period.trim(),
      details: newExp.details.trim()
    };
    setForm((prev) => ({
      ...prev,
      experiences: [item, ...prev.experiences]
    }));
    setNewExp({ role: '', organization: '', period: '', details: '' });
  };

  const handleRemoveExperience = (id) => {
    setForm((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((x) => x.id !== id)
    }));
  };

  const handleAddQualification = (e) => {
    e.preventDefault();
    if (!newQual.title.trim()) return;
    const item = {
      id: `qual-${Date.now()}`,
      title: newQual.title.trim(),
      issuer: newQual.issuer.trim(),
      year: newQual.year.trim(),
      credentialId: newQual.credentialId.trim()
    };
    setForm((prev) => ({
      ...prev,
      qualifications: [item, ...prev.qualifications]
    }));
    setNewQual({ title: '', issuer: '', year: '', credentialId: '' });
  };

  const handleRemoveQualification = (id) => {
    setForm((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((x) => x.id !== id)
    }));
  };

  const handleSubmitAll = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please provide a Name / Organization Name.');
      return;
    }
    await onSaveProfile({
      ...profileData,
      ...form,
      name: form.name.trim(),
      title: form.title.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      institution: form.institution.trim(),
      license: form.license.trim(),
      bio: form.bio.trim()
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
            {roleLabel || 'Profile Manager'}
          </span>
          <h3 className="text-lg font-black text-slate-900">
            Edit Profile, What You Provide, Experience &amp; Qualifications
          </h3>
          <p className="text-slate-500">
            Keep your offerings, work history, and credentials up to date across GuideLink Rwanda.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={isSaving}
          className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-extrabold rounded-xl shadow transition"
        >
          {isSaving ? 'Saving...' : 'Save Full Profile →'}
        </button>
      </div>

      {/* 1. BASIC PROFILE DETAILS */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-sm text-[#234E40]">1. Basic Profile Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-slate-700">Full Name / Company Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl"
              placeholder="Your name or organization"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Role / Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl"
              placeholder="e.g. C.E.O., Tour Guide, Managing Director"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Phone / WhatsApp</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl"
              placeholder="+25078XXXXXXX"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Location / Base</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl"
              placeholder="e.g. Kigali, Musanze, Nyungwe"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Institution / License / RDB Code</label>
            <input
              type="text"
              value={form.institution || form.license}
              onChange={(e) =>
                setForm({
                  ...form,
                  institution: e.target.value,
                  license: e.target.value
                })
              }
              className="w-full mt-1 p-2.5 border rounded-xl"
              placeholder="College, guide license, or RDB number"
            />
          </div>
        </div>
        <div>
          <label className="font-bold text-slate-700">About / Bio Summary</label>
          <textarea
            rows={2}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full mt-1 p-2.5 border rounded-xl"
            placeholder="Summarize your specialties, languages, tour style, or services..."
          />
        </div>
      </div>

      {/* 2. WHAT YOU PROVIDE (SERVICES / OFFERINGS) */}
      <div className="space-y-3 pt-4 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">
          2. What You Provide (Services, Tours &amp; Offerings)
        </h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            placeholder="e.g. Volcanoes Gorilla Trekking Guiding, Airport Transfers, Custom Safaris"
            className="flex-1 p-2.5 border rounded-xl"
          />
          <button
            type="button"
            onClick={handleAddService}
            className="px-4 py-2.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white font-bold rounded-xl"
          >
            + Add Offering
          </button>
        </div>

        {form.servicesProvided.length === 0 ? (
          <p className="text-slate-400 italic">No services or offerings added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {form.servicesProvided.map((srv, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 bg-emerald-50 text-[#234E40] border border-emerald-200 px-3 py-1.5 rounded-full font-bold"
              >
                <span>✓ {srv}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveService(idx)}
                  className="text-red-600 hover:text-red-800 font-black"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. EXPERIENCE */}
      <div className="space-y-3 pt-4 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">3. Experience</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border">
          <input
            type="text"
            value={newExp.role}
            onChange={(e) => setNewExp({ ...newExp, role: e.target.value })}
            placeholder="Role / Position (e.g. Tour Guide, F&B Controller)"
            className="p-2.5 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={newExp.organization}
            onChange={(e) => setNewExp({ ...newExp, organization: e.target.value })}
            placeholder="Organization / Hotel / Agency"
            className="p-2.5 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={newExp.period}
            onChange={(e) => setNewExp({ ...newExp, period: e.target.value })}
            placeholder="Duration / Dates (e.g. 2025 – 1 Year)"
            className="p-2.5 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={newExp.details}
            onChange={(e) => setNewExp({ ...newExp, details: e.target.value })}
            placeholder="Key responsibilities or highlights..."
            className="md:col-span-2 p-2.5 border rounded-xl bg-white"
          />
          <button
            type="button"
            onClick={handleAddExperience}
            className="px-4 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl"
          >
            + Add Experience
          </button>
        </div>

        {form.experiences.length === 0 ? (
          <p className="text-slate-400 italic">No experience entries added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {form.experiences.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 rounded-2xl border bg-white flex justify-between items-start gap-2"
              >
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-900">
                    {exp.role || 'Experience'}
                    {exp.organization ? ` • ${exp.organization}` : ''}
                  </p>
                  {exp.period && (
                    <p className="text-[11px] font-bold text-[#3B6E5B]">{exp.period}</p>
                  )}
                  {exp.details && <p className="text-slate-600">{exp.details}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExperience(exp.id)}
                  className="text-xs font-bold text-red-600 hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. QUALIFICATIONS */}
      <div className="space-y-3 pt-4 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">
          4. Qualifications (Degrees, Diplomas, Certificates &amp; Licenses)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border">
          <input
            type="text"
            value={newQual.title}
            onChange={(e) => setNewQual({ ...newQual, title: e.target.value })}
            placeholder="Qualification / Diploma / Certificate *"
            className="p-2.5 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={newQual.issuer}
            onChange={(e) => setNewQual({ ...newQual, issuer: e.target.value })}
            placeholder="Institution / Issuing Body"
            className="p-2.5 border rounded-xl bg-white"
          />
          <input
            type="text"
            value={newQual.year}
            onChange={(e) => setNewQual({ ...newQual, year: e.target.value })}
            placeholder="Year / Status (e.g. May 2027)"
            className="p-2.5 border rounded-xl bg-white"
          />
          <button
            type="button"
            onClick={handleAddQualification}
            className="px-4 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl"
          >
            + Add Qualification
          </button>
        </div>

        {form.qualifications.length === 0 ? (
          <p className="text-slate-400 italic">No qualifications added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {form.qualifications.map((qual) => (
              <div
                key={qual.id}
                className="p-3.5 rounded-2xl border bg-white flex justify-between items-start gap-2"
              >
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-900">🎓 {qual.title}</p>
                  <p className="text-[11px] text-slate-600">
                    {[qual.issuer, qual.year].filter(Boolean).join(' • ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveQualification(qual.id)}
                  className="text-xs font-bold text-red-600 hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-3 border-t">
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={isSaving}
          className="px-6 py-3 bg-[#234E40] hover:bg-slate-900 text-white font-extrabold rounded-xl shadow transition"
        >
          {isSaving ? 'Saving...' : 'Save Full Profile →'}
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// PROFILE SUMMARY CARD (SHOWS WHAT USER PROVIDES, EXPERIENCE & QUALIFICATIONS)
// =========================================================================
function ProfileSummaryCard({ profile, roleLabel, onEditClick }) {
  if (!profile) return null;
  const services = profile.servicesProvided || [];
  const experiences = profile.experiences || [];
  const qualifications = profile.qualifications || [];

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-[#234E40] px-2.5 py-0.5 rounded-full">
            {roleLabel || 'Profile'}
          </span>
          <h3 className="text-lg font-black text-slate-900">
            {profile.name}{' '}
            {profile.title ? (
              <span className="text-sm font-bold text-[#3B6E5B]">— {profile.title}</span>
            ) : null}
          </h3>
          <p className="text-slate-500">
            {[profile.contact, profile.email, profile.location].filter(Boolean).join(' • ')}
          </p>
          {profile.bio && <p className="text-slate-700 pt-1">{profile.bio}</p>}
        </div>

        {onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="px-4 py-2 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
          <h4 className="font-extrabold text-[#234E40]">What Provided ({services.length})</h4>
          {services.length === 0 ? (
            <p className="text-slate-400 italic">None listed yet.</p>
          ) : (
            <ul className="space-y-1 text-slate-700">
              {services.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
          <h4 className="font-extrabold text-[#234E40]">Experience ({experiences.length})</h4>
          {experiences.length === 0 ? (
            <p className="text-slate-400 italic">None listed yet.</p>
          ) : (
            <ul className="space-y-2 text-slate-700">
              {experiences.map((exp) => (
                <li key={exp.id}>
                  <p className="font-bold text-slate-900">{exp.role}</p>
                  <p className="text-[11px] text-slate-500">
                    {[exp.organization, exp.period].filter(Boolean).join(' • ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
          <h4 className="font-extrabold text-[#234E40]">
            Qualifications ({qualifications.length})
          </h4>
          {qualifications.length === 0 ? (
            <p className="text-slate-400 italic">None listed yet.</p>
          ) : (
            <ul className="space-y-2 text-slate-700">
              {qualifications.map((q) => (
                <li key={q.id}>
                  <p className="font-bold text-slate-900">{q.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {[q.issuer, q.year].filter(Boolean).join(' • ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
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
  const [userSection, setUserSection] = useState('bookings'); // 'bookings' | 'profile' | 'edit_profile'
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activePopupAd, setActivePopupAd] = useState(null);

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
        setAppConfig((prev) => ({
          ...prev,
          ...mainCfg,
          ownerProfile: {
            ...DEFAULT_OWNER_PROFILE,
            ...(mainCfg.ownerProfile || {})
          }
        }));
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

  // Save Owner Profile (C.E.O. offerings, experience & qualifications)
  const handleSaveOwnerProfile = async (updatedOwnerProfile) => {
    const nextConfig = {
      ...appConfig,
      ownerProfile: updatedOwnerProfile
    };
    await saveAppServerConfig(nextConfig);
    alert('✓ Owner profile, offerings, experience & qualifications saved to Firebase!');
  };

  // Save Any User Profile (registered subscriber or free traveler)
  const handleSaveUserProfile = async (updatedFields) => {
    setIsSaving(true);
    if (currentUser && currentUser.id) {
      const mergedUser = {
        ...currentUser,
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };
      setCurrentUser(mergedUser);
      setSubscribers((prev) =>
        prev.map((s) => (s.id === mergedUser.id ? mergedUser : s))
      );
      await firestoreSaveDoc('subscribers', mergedUser.id, mergedUser);
    } else {
      // Traveler / Guest profile saved locally and under travelers collection if desired
      const travelerId =
        currentUser?.id ||
        `traveler-${normalizeContact(updatedFields.contact || updatedFields.name) || Date.now()}`;
      const mergedTraveler = {
        id: travelerId,
        role: 'traveler',
        ...currentUser,
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };
      setCurrentUser(mergedTraveler);
      await firestoreSaveDoc('travelers', travelerId, mergedTraveler);
    }
    setIsSaving(false);
    setUserSection('profile');
    alert('✓ Your profile, offerings, experience & qualifications have been saved!');
  };

  const handleOwnerLogin = (e) => {
    e.preventDefault();
    if (ownerPinInput === '2026' || ownerPinInput === 'admin') {
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setCurrentRole('owner');
      setOwnerTab('pending');
    } else {
      alert('Invalid Owner PIN. Default PIN is 2026.');
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
      setUserSection('bookings');
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
      title: roleLabelMap[selectedRoleForAuth] || '',
      contact: authContactInput.trim(),
      email: '',
      location: 'Rwanda',
      bio: '',
      servicesProvided: [],
      experiences: [],
      qualifications: [],
      role: selectedRoleForAuth,
      institution: authInstitutionInput.trim(),
      license: authLicenseInput.trim(),
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
    setUserSection('edit_profile');
    alert(
      `✓ Registration submitted! Pay ${chosenPlan.price.toLocaleString()} RWF via MTN MoMo Code ${appConfig.momoCode} to activate your ${chosenPlan.name} plan. You can also complete your profile, experience & qualifications right now.`
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

  const handleSuspendSubscriber = async (sub) => {
    const updated = { ...sub, status: 'suspended' };
    setSubscribers(subscribers.map((s) => (s.id === sub.id ? updated : s)));
    await firestoreSaveDoc('subscribers', sub.id, updated);
  };

  const handleDeleteSubscriber = async (subId) => {
    if (!window.confirm('Permanently delete this user account from Firebase?')) return;
    setSubscribers(subscribers.filter((s) => s.id !== subId));
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
            <h3 className="font-bold text-sm">Enter Owner PIN</h3>
            <input
              type="password"
              placeholder="PIN (2026)"
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
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg shadow">
              GL
            </div>
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
              <button
                type="button"
                onClick={() => {
                  if (currentRole === 'welcome' || currentRole === 'auth') {
                    setCurrentRole(currentUser.role || 'traveler');
                  }
                  setUserSection('edit_profile');
                }}
                className="bg-black/25 hover:bg-black/40 px-3 py-1.5 rounded-full font-semibold transition"
              >
                👤 {currentUser.name} • Edit Profile
              </button>
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
                    desc: 'Showcase qualifications & experience, offer guiding services, and take bookings.'
                  },
                  {
                    role: 'agency',
                    icon: '✈️',
                    title: 'Travel Agency',
                    desc: 'List agency services, hire certified graduates, and manage tour bookings.'
                  },
                  {
                    role: 'tour_company',
                    icon: '🚐',
                    title: 'Tour Company',
                    desc: 'Publish tour packages, source field guides, and fulfill custom trips.'
                  },
                  {
                    role: 'traveler',
                    icon: '🌍',
                    title: 'Traveler / Visitor (FREE)',
                    desc: 'Set your profile & travel preferences, request trips, and hire providers.'
                  }
                ].map((card) => (
                  <div
                    key={card.role}
                    onClick={() => {
                      if (card.role === 'traveler') {
                        setCurrentRole('traveler');
                        setUserSection('bookings');
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
            3. MEMBER & TRAVELER DASHBOARDS (WITH FULL PROFILE EDITOR)
           =============================================================== */}
        {['graduate', 'agency', 'tour_company', 'traveler'].includes(currentRole) && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">
                  {roleLabelMap[currentRole]}
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Welcome, {currentUser?.name || 'Guest Traveler'}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setUserSection('bookings')}
                  className={`px-4 py-2 rounded-xl ${
                    userSection === 'bookings'
                      ? 'bg-[#234E40] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📅 Bookings Board
                </button>
                <button
                  type="button"
                  onClick={() => setUserSection('profile')}
                  className={`px-4 py-2 rounded-xl ${
                    userSection === 'profile'
                      ? 'bg-[#234E40] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🪪 My Profile Card
                </button>
                <button
                  type="button"
                  onClick={() => setUserSection('edit_profile')}
                  className={`px-4 py-2 rounded-xl ${
                    userSection === 'edit_profile'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-50 text-[#234E40] hover:bg-emerald-100'
                  }`}
                >
                  ✏️ Edit Profile, Offerings, Experience &amp; Qualifications
                </button>
              </div>
            </div>

            {currentRole !== 'traveler' && !isSubscribed && (
              <div className="bg-amber-50 border border-amber-300 px-4 py-3 rounded-xl text-xs text-amber-950">
                <strong>⏳ Pending Activation:</strong> Pay via MTN MoMo Code{' '}
                <strong className="underline">{appConfig.momoCode}</strong>. Owner C.E.O. (
                {appConfig.ownerProfile?.contact || '+250780558555'}) will approve shortly.
              </div>
            )}

            {userSection === 'bookings' && (
              <BookingMarketplace currentUser={currentUser} currentRole={currentRole} />
            )}

            {userSection === 'profile' && (
              <ProfileSummaryCard
                profile={
                  currentUser || {
                    name: 'Guest Traveler',
                    title: roleLabelMap[currentRole],
                    servicesProvided: [],
                    experiences: [],
                    qualifications: []
                  }
                }
                roleLabel={roleLabelMap[currentRole]}
                onEditClick={() => setUserSection('edit_profile')}
              />
            )}

            {userSection === 'edit_profile' && (
              <ProfileEditorPanel
                profileData={
                  currentUser || {
                    name: '',
                    title: roleLabelMap[currentRole] || '',
                    contact: '',
                    email: '',
                    location: 'Rwanda',
                    bio: '',
                    servicesProvided: [],
                    experiences: [],
                    qualifications: []
                  }
                }
                roleLabel={roleLabelMap[currentRole]}
                onSaveProfile={handleSaveUserProfile}
                isSaving={isSaving}
              />
            )}
          </div>
        )}

        {/* ===============================================================
            4. OWNER / C.E.O. MANAGEMENT CONSOLE (WITH FULL OWNER PROFILE)
           =============================================================== */}
        {currentRole === 'owner' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-4">
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

              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setOwnerTab('pending')}
                  className={`px-4 py-2 rounded-xl ${
                    ownerTab === 'pending'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  Subscribers ({subscribers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('profile')}
                  className={`px-4 py-2 rounded-xl ${
                    ownerTab === 'profile'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  👑 Owner Profile, Experience &amp; Qualifications
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
                  App Server Settings
                </button>
              </div>
            </div>

            {ownerTab === 'pending' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                <h3 className="font-bold text-base text-slate-900">
                  Registered Subscribers &amp; Payment Approvals
                </h3>

                {subscribers.length === 0 ? (
                  <p className="text-slate-500">No subscribers registered yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b text-slate-500 uppercase text-[10px]">
                          <th className="py-2.5">Name / Entity</th>
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
                            <td className="py-3 font-bold text-slate-900">{sub.name}</td>
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
                                onClick={() => handleApproveSubscriber(sub)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSuspendSubscriber(sub)}
                                className="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-bold"
                              >
                                Suspend
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
              </div>
            )}

            {ownerTab === 'profile' && (
              <div className="space-y-6">
                <ProfileSummaryCard
                  profile={appConfig.ownerProfile}
                  roleLabel="Platform Owner (C.E.O.)"
                />
                <ProfileEditorPanel
                  profileData={appConfig.ownerProfile}
                  roleLabel="Platform Owner (C.E.O.)"
                  onSaveProfile={handleSaveOwnerProfile}
                  isSaving={isSaving}
                />
              </div>
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
              Enter your Owner PIN to manage subscribers, approvals, and live Firebase settings.
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Enter PIN (2026)"
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
