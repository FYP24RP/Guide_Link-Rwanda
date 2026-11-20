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
// MULTI-LANGUAGE TRANSLATIONS (KINY, FRA, ENG, KISW)
// =========================================================================
const UI_TRANSLATIONS = {
  ENG: {
    welcomeNoteTop: 'WELCOME TO GUIDE LINK RWANDA',
    heroBadge: "Rwanda's Official Tourism Talent, Car Rental & Booking Network",
    switchPortal: 'Switch Portal',
    ownerBtn: 'Owner C.E.O.',
    graduateTitle: 'Tourism Graduate / Guide',
    graduateDesc: 'Publish guiding jobs/packages on your profile, manage bookings & connect with travelers.',
    agencyTitle: 'Travel Agency',
    agencyDesc: 'Publish tour packages on your profile, hire graduates & manage bookings.',
    tourCompanyTitle: 'Tour Company',
    tourCompanyDesc: 'Publish safari packages on your profile, source guides & manage bookings.',
    carRentalTitle: 'Car Rentals Company',
    carRentalDesc: 'Publish rental vehicles/packages on your profile, 4x4 safari cars & manage bookings.',
    travelerTitle: 'Traveler / Visitor (FREE)',
    travelerDesc: 'Submit Personal Info (PI), book profile jobs/packages, rent cars & hire guides.',
    enterPortal: 'Enter Portal',
    piRequiredTitle: 'Traveler / Tourist Personal Information (PI) Required',
    piRequiredDesc: 'Submit your Personal Information before booking a package, car, or guide so providers know whom they are serving.',
    savePiBtn: 'Save Personal Information (PI) & Continue',
    travelersOnWelcomeTitle: 'Travelers & Tourists Directory',
    travelersOnWelcomeSub: 'View travelers and tourists who have submitted their Personal Information (PI) and start a private chat.'
  },
  KINY: {
    welcomeNoteTop: 'MURAKAZA NEZA KURI GUIDE LINK RWANDA',
    heroBadge: 'Urubuga Nyarwanda rw’Ubukerarugendo, Gutwara Abagenzi n’Imishinga',
    switchPortal: 'Hindura Urubuga',
    ownerBtn: 'Nyir’Urubuga (C.E.O.)',
    graduateTitle: 'Uwize Ubukerarugendo / Umuyobozi',
    graduateDesc: 'Shyira akazi/gahunda ku mwirondoro wawe kandi utunganye ama-booking.',
    agencyTitle: 'Ikigo cy’Ingendo (Travel Agency)',
    agencyDesc: 'Shyira ingendo ku mwirondoro wawe, akoresha abize ubukerarugendo kandi utunganye booking.',
    tourCompanyTitle: 'Sosiyete y’Ubukerarugendo',
    tourCompanyDesc: 'Shyira safari ku mwirondoro wawe, bona abayobozi kandi utunganye booking.',
    carRentalTitle: 'Sosiyete ikodesha Imodoka',
    carRentalDesc: 'Shyira imodoka/gahunda ku mwirondoro wawe kandi utunganye booking.',
    travelerTitle: 'Umugenzi / Mukerarugendo (UBUNTU)',
    travelerDesc: 'Tanga Amakuru Yawe Bwite (PI), saba gahunda ziri ku mwirondoro, kodesha imodoka cyangwa umuyobozi.',
    enterPortal: 'Injira',
    piRequiredTitle: 'Amakuru Bwite y’Umugenzi / Mukerarugendo (PI) Arakenewe',
    piRequiredDesc: 'Tanga Amakuru Yawe Bwite mbere yo gukora booking kugira ngo abakwakira bamenye uwo bavugana.',
    savePiBtn: 'Bika Amakuru Bwite (PI) Ukomeze',
    travelersOnWelcomeTitle: 'Abagenzi n’Ba Mukerarugendo Batanze Amakuru (PI)',
    travelersOnWelcomeSub: 'Reba abagenzi n’ba mukerarugendo batanze Amakuru yabo Bwite (PI) kandi muvugane mu ibanga.'
  },
  FRA: {
    welcomeNoteTop: 'BIENVENUE SUR GUIDE LINK RWANDA',
    heroBadge: 'Réseau Officiel du Tourisme, de la Location de Voitures et des Réservations au Rwanda',
    switchPortal: 'Changer de Portail',
    ownerBtn: 'Propriétaire C.E.O.',
    graduateTitle: 'Diplômé Tourisme / Guide',
    graduateDesc: 'Publiez vos offres/forfaits sur votre profil et gérez les réservations.',
    agencyTitle: 'Agence de Voyage',
    agencyDesc: 'Publiez vos forfaits sur votre profil, recrutez des guides et gérez les réservations.',
    tourCompanyTitle: 'Entreprise de Circuits',
    tourCompanyDesc: 'Publiez vos safaris sur votre profil, trouvez des guides et gérez les réservations.',
    carRentalTitle: 'Société de Location de Voitures',
    carRentalDesc: 'Publiez vos véhicules/offres sur votre profil et gérez les réservations.',
    travelerTitle: 'Voyageur / Touriste (GRATUIT)',
    travelerDesc: 'Soumettez vos Infos Personnelles (PI), réservez des offres du profil, voitures ou guides.',
    enterPortal: 'Accéder',
    piRequiredTitle: 'Informations Personnelles (PI) du Voyageur / Touriste Requises',
    piRequiredDesc: 'Veuillez renseigner vos Informations Personnelles (PI) avant de réserver.',
    savePiBtn: 'Enregistrer les Infos Personnelles (PI) & Continuer',
    travelersOnWelcomeTitle: 'Répertoire des Voyageurs & Touristes',
    travelersOnWelcomeSub: 'Consultez les voyageurs et touristes ayant soumis leurs Infos Personnelles (PI) et démarrez un chat privé.'
  },
  KISW: {
    welcomeNoteTop: 'KARIBU GUIDE LINK RWANDA',
    heroBadge: 'Mtandao Rasmi wa Utalii, Kukodisha Magari na Uhifadhi Rwanda',
    switchPortal: 'Badili Lango',
    ownerBtn: 'Mmiliki C.E.O.',
    graduateTitle: 'Mhitimu wa Utalii / Mwongoza Watalii',
    graduateDesc: 'Chapisha kazi/vifurushi kwenye wasifu wako na simamia uhifadhi.',
    agencyTitle: 'Wakala wa Usafiri',
    agencyDesc: 'Chapisha vifurushi kwenye wasifu wako, ajiri waongozaji na simamia uhifadhi.',
    tourCompanyTitle: 'Kampuni ya Utalii',
    tourCompanyDesc: 'Chapisha safari kwenye wasifu wako, pata waongozaji na simamia uhifadhi.',
    carRentalTitle: 'Kampuni ya Kukodisha Magari',
    carRentalDesc: 'Chapisha magari/vifurushi kwenye wasifu wako na simamia uhifadhi.',
    travelerTitle: 'Msafiri / Mtali (BURE)',
    travelerDesc: 'Wasilisha Taarifa Binafsi (PI), weka nafasi za vifurushi vya wasifu, magari au waongozaji.',
    enterPortal: 'Ingia',
    piRequiredTitle: 'Taarifa Binafsi za Msafiri / Mtali (PI) Zinahitajika',
    piRequiredDesc: 'Wasilisha Taarifa zako Binafsi (PI) kabla ya kuweka nafasi.',
    savePiBtn: 'Hifadhi Taarifa Binafsi (PI) & Endelea',
    travelersOnWelcomeTitle: 'Orodha ya Wasafiri na Watalii',
    travelersOnWelcomeSub: 'Tazama wasafiri na watalii waliowasilisha Taarifa Binafsi (PI) na anza mazungumzo ya faragha.'
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
  welcomeNote: 'WELCOME TO GUIDE LINK RWANDA',
  tagline: 'Turn your tourism degree into paid work.',
  subtitle:
    'Connecting Tourism Graduates, Travel Agencies, Tour Companies, Car Rentals Companies, and Travelers across Rwanda.',
  footerLocation: 'Kigali, Rwanda',
  momoCode: '612771',
  ownerPassword: 'FYP$2026',
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
// PROFILE EDITOR & SUMMARY (Users, Car Rentals & Owner + Photo + Availability + Jobs/Packages)
// =========================================================================
function UserAndOwnerProfileSection({
  profileData,
  label,
  onSave,
  isSaving,
  showProviderExtras = false,
  onPublishPackage,
  onRemovePublishedPackage
}) {
  const [form, setForm] = useState({
    photoUrl: '',
    name: '',
    title: '',
    contact: '',
    email: '',
    bio: '',
    availabilityStatus: 'Available Now',
    availableDates: '',
    servicesProvided: [],
    experiences: [],
    qualifications: [],
    publishedPackages: []
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
  const [pkgInput, setPkgInput] = useState({
    title: '',
    destination: 'Kigali City',
    durationDays: 2,
    priceLabel: '',
    highlights: ''
  });

  useEffect(() => {
    setForm({
      photoUrl: profileData?.photoUrl || '',
      name: profileData?.name || '',
      title: profileData?.title || '',
      contact: profileData?.contact || '',
      email: profileData?.email || '',
      bio: profileData?.bio || '',
      availabilityStatus: profileData?.availabilityStatus || 'Available Now',
      availableDates: profileData?.availableDates || '',
      servicesProvided: Array.isArray(profileData?.servicesProvided)
        ? profileData.servicesProvided
        : [],
      experiences: Array.isArray(profileData?.experiences)
        ? profileData.experiences
        : [],
      qualifications: Array.isArray(profileData?.qualifications)
        ? profileData.qualifications
        : [],
      publishedPackages: Array.isArray(profileData?.publishedPackages)
        ? profileData.publishedPackages
        : []
    });
  }, [profileData?.id]);

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

  const handleAddPackage = async () => {
    if (!pkgInput.title.trim()) {
      alert('Please enter a Job / Package title to add to your profile.');
      return;
    }
    const pkgItem = {
      id: `pkg-${Date.now()}`,
      title: pkgInput.title.trim(),
      destination: pkgInput.destination,
      durationDays: Number(pkgInput.durationDays) || 1,
      priceLabel: pkgInput.priceLabel.trim() || 'Negotiable',
      highlights: pkgInput.highlights.trim(),
      providerId: profileData?.id || '',
      providerName: form.name || profileData?.name || label || 'Partner',
      providerRole: label || profileData?.role || 'Provider',
      providerContact: form.contact || profileData?.contact || '',
      availabilityStatus: form.availabilityStatus || 'Available Now',
      availableDates: form.availableDates || 'Flexible',
      createdAt: Date.now()
    };

    const nextPackages = [pkgItem, ...(form.publishedPackages || [])];
    setForm((prev) => ({ ...prev, publishedPackages: nextPackages }));
    setPkgInput({
      title: '',
      destination: 'Kigali City',
      durationDays: 2,
      priceLabel: '',
      highlights: ''
    });

    if (onPublishPackage) {
      await onPublishPackage(pkgItem, { ...form, publishedPackages: nextPackages });
    }
  };

  const removePackage = async (pkg) => {
    const nextPackages = (form.publishedPackages || []).filter((p) => p.id !== pkg.id);
    setForm((prev) => ({ ...prev, publishedPackages: nextPackages }));
    if (onRemovePublishedPackage) {
      await onRemovePublishedPackage(pkg.id, { ...form, publishedPackages: nextPackages });
    }
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
              {label || 'Profile'} • Profile Jobs &amp; Packages
            </span>
            <h3 className="text-base font-black text-slate-900">
              Edit Profile Photo, Availability, Jobs/Packages to Be Booked, Experience &amp; Qualifications
            </h3>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
        >
          {isSaving ? 'Saving...' : 'Save All Profile Changes'}
        </button>
      </div>

      {/* Profile Photo Upload & URL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border">
        <div>
          <label className="font-bold text-slate-700">Upload Profile / Company Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoFileChange}
            className="w-full mt-1 p-2 border rounded-xl bg-white"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700">Or Paste Photo URL</label>
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
            placeholder="Your name or company name"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700">Title / Role</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. C.E.O., Car Rental Fleet, Tour Guide"
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

      {/* Availability for Providers */}
      {showProviderExtras && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
          <div>
            <label className="font-bold text-[#234E40]">Availability Status (Visible on Welcome &amp; Booking)</label>
            <select
              value={form.availabilityStatus}
              onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
            >
              <option value="Available Now">🟢 Available Now</option>
              <option value="Available for Custom Bookings">🟡 Available for Custom Bookings</option>
              <option value="Booked / Limited Dates">🔴 Booked / Limited Dates</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-[#234E40]">Available Dates &amp; Regions</label>
            <input
              type="text"
              value={form.availableDates}
              onChange={(e) => setForm({ ...form, availableDates: e.target.value })}
              placeholder="e.g. Nov 22 - Dec 15 • Kigali, Musanze, Nyungwe"
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>
        </div>
      )}

      <div>
        <label className="font-bold text-slate-700">Bio / Summary</label>
        <input
          type="text"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Short summary about yourself, fleet, or organization..."
          className="w-full mt-1 p-2.5 border rounded-xl"
        />
      </div>

      {/* JOBS / PACKAGES TO BE BOOKED (ADDED DIRECTLY ON USER PROFILE) */}
      {showProviderExtras && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm text-[#234E40]">
                🎒 Jobs / Packages to Be Booked (Saved on Your Profile)
              </h4>
              <p className="text-[11px] text-slate-500">
                Add tour packages, guiding jobs, or car rental offers directly on your profile so travelers can book them.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#234E40] font-bold text-[11px]">
              {(form.publishedPackages || []).length} Added
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border">
            <input
              type="text"
              value={pkgInput.title}
              onChange={(e) => setPkgInput({ ...pkgInput, title: e.target.value })}
              placeholder="Job / Package Title (e.g. 2-Day Kigali & Akagera Tour)"
              className="p-2 border rounded-xl bg-white"
            />
            <select
              value={pkgInput.destination}
              onChange={(e) => setPkgInput({ ...pkgInput, destination: e.target.value })}
              className="p-2 border rounded-xl bg-white"
            >
              <option value="Kigali City">Kigali City</option>
              <option value="Musanze / Volcanoes NP">Musanze / Volcanoes NP</option>
              <option value="Nyungwe / Kitabi">Nyungwe / Kitabi</option>
              <option value="Akagera National Park">Akagera National Park</option>
              <option value="Lake Kivu (Rubavu / Rusizi)">Lake Kivu (Rubavu / Rusizi)</option>
              <option value="Multi-Destination Rwanda">Multi-Destination Rwanda</option>
            </select>
            <input
              type="text"
              value={pkgInput.priceLabel}
              onChange={(e) => setPkgInput({ ...pkgInput, priceLabel: e.target.value })}
              placeholder="Rate / Price (e.g. 85,000 RWF or $110)"
              className="p-2 border rounded-xl bg-white"
            />
            <button
              type="button"
              onClick={handleAddPackage}
              className="px-4 py-2 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl"
            >
              + Add to Profile
            </button>
            <input
              type="number"
              min="1"
              value={pkgInput.durationDays}
              onChange={(e) => setPkgInput({ ...pkgInput, durationDays: e.target.value })}
              placeholder="Days"
              className="p-2 border rounded-xl bg-white"
            />
            <input
              type="text"
              value={pkgInput.highlights}
              onChange={(e) => setPkgInput({ ...pkgInput, highlights: e.target.value })}
              placeholder="Included services, guiding languages, vehicle specs, or job scope..."
              className="md:col-span-3 p-2 border rounded-xl bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {(form.publishedPackages || []).map((pkg) => (
              <div
                key={pkg.id}
                className="p-3 rounded-xl border bg-emerald-50/40 flex justify-between items-start gap-2"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    🎒 {pkg.title} ({pkg.durationDays}d)
                  </p>
                  <p className="text-[11px] text-[#234E40] font-semibold">
                    📍 {pkg.destination} • 💰 {pkg.priceLabel}
                  </p>
                  {pkg.highlights && <p className="text-slate-600 mt-0.5">{pkg.highlights}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removePackage(pkg)}
                  className="text-red-600 font-bold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What You Provide */}
      <div className="space-y-2 pt-3 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">What You Provide (Services / Fleet / Offerings)</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            placeholder="e.g. 4x4 Land Cruiser Rental, Airport Transfers, Guided Tours"
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
            placeholder="Degree / Diploma / Certificate / Fleet License"
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
// TRAVELER PERSONAL INFORMATION (PI) FORM MODAL / PANEL
// =========================================================================
function TravelerPersonalInfoForm({
  travelerPI,
  onSavePI,
  onCancel,
  lang = 'ENG'
}) {
  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.ENG;
  const [piForm, setPiForm] = useState({
    fullName: travelerPI?.fullName || '',
    phone: travelerPI?.phone || '',
    email: travelerPI?.email || '',
    nationality: travelerPI?.nationality || 'Rwanda',
    idOrPassport: travelerPI?.idOrPassport || ''
  });

  useEffect(() => {
    setPiForm({
      fullName: travelerPI?.fullName || '',
      phone: travelerPI?.phone || '',
      email: travelerPI?.email || '',
      nationality: travelerPI?.nationality || 'Rwanda',
      idOrPassport: travelerPI?.idOrPassport || ''
    });
  }, [travelerPI]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!piForm.fullName.trim() || !piForm.phone.trim()) {
      alert('Please enter your Full Name and Phone / WhatsApp number.');
      return;
    }
    await onSavePI({
      fullName: piForm.fullName.trim(),
      phone: piForm.phone.trim(),
      email: piForm.email.trim(),
      nationality: piForm.nationality.trim() || 'Rwanda',
      idOrPassport: piForm.idOrPassport.trim(),
      submittedAt: new Date().toISOString()
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-3xl border-2 border-[#234E40] shadow-lg space-y-4 text-xs"
    >
      <div className="flex items-start justify-between gap-2 border-b pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase bg-amber-300 text-slate-950 px-2.5 py-0.5 rounded-full">
            🪪 Personal Information (PI)
          </span>
          <h3 className="text-base font-black text-slate-900 mt-1">
            {t.piRequiredTitle}
          </h3>
          <p className="text-slate-600 mt-0.5">{t.piRequiredDesc}</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-slate-100 rounded-lg font-bold text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="font-bold text-slate-700">Full Name *</label>
          <input
            type="text"
            required
            value={piForm.fullName}
            onChange={(e) => setPiForm({ ...piForm, fullName: e.target.value })}
            placeholder="e.g. Uwimana Claire / John Doe"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700">Phone / WhatsApp *</label>
          <input
            type="text"
            required
            value={piForm.phone}
            onChange={(e) => setPiForm({ ...piForm, phone: e.target.value })}
            placeholder="+25078XXXXXXX"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700">Email Address</label>
          <input
            type="email"
            value={piForm.email}
            onChange={(e) => setPiForm({ ...piForm, email: e.target.value })}
            placeholder="traveler@example.com"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700">Nationality / Country *</label>
          <input
            type="text"
            required
            value={piForm.nationality}
            onChange={(e) => setPiForm({ ...piForm, nationality: e.target.value })}
            placeholder="e.g. Rwanda, Kenya, USA, France"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>

        <div className="md:col-span-2">
          <label className="font-bold text-slate-700">Passport / National ID Number (Optional)</label>
          <input
            type="text"
            value={piForm.idOrPassport}
            onChange={(e) => setPiForm({ ...piForm, idOrPassport: e.target.value })}
            placeholder="e.g. PC123456 or ID number"
            className="w-full mt-1 p-2.5 border rounded-xl"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-extrabold rounded-xl shadow"
        >
          {t.savePiBtn} →
        </button>
      </div>
    </form>
  );
}

// =========================================================================
// TRAVELERS & TOURISTS DIRECTORY ON WELCOME PAGE
// =========================================================================
function TravelersOnWelcomeDirectory({
  travelersList = [],
  onStartPrivateChatWithTraveler,
  lang = 'ENG'
}) {
  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.ENG;

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
            🪪 Verified Traveler Personal Info (PI)
          </span>
          <h3 className="text-base font-black text-slate-900">
            🌍 {t.travelersOnWelcomeTitle} ({travelersList.length})
          </h3>
          <p className="text-slate-500">{t.travelersOnWelcomeSub}</p>
        </div>
      </div>

      {travelersList.length === 0 ? (
        <p className="text-slate-400 italic">
          No travelers or tourists have submitted their Personal Information (PI) yet. Select &quot;Traveler / Visitor&quot; to submit your PI and appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {travelersList.map((trv) => (
            <div
              key={trv.id}
              className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-slate-900">{trv.fullName}</h4>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
                    🌍 {trv.nationality || 'Traveler'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  📞 <strong>{trv.phone}</strong>
                  {trv.email ? ` • ✉️ ${trv.email}` : ''}
                </p>
                {trv.idOrPassport && (
                  <p className="text-[10px] text-slate-500">
                    🪪 ID / Passport: <strong>{trv.idOrPassport}</strong>
                  </p>
                )}
              </div>

              {onStartPrivateChatWithTraveler && (
                <button
                  type="button"
                  onClick={() => onStartPrivateChatWithTraveler(trv)}
                  className="w-full py-2 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl transition"
                >
                  💬 Private Chat with {trv.fullName}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// TRAVELER / TOURIST DIRECTORY: PROFILE JOBS/PACKAGES & AVAILABILITY + BOOKING
// =========================================================================
function TravelerAvailabilityAndPackages({
  subscribers,
  publishedPackages,
  currentUser,
  travelerPI,
  onRequirePI,
  onBookPackageOrProvider,
  externalBookingItem,
  onClearExternalBookingItem
}) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedBookingItem, setSelectedBookingItem] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    travelerName: travelerPI?.fullName || currentUser?.name || '',
    travelerPhone: travelerPI?.phone || currentUser?.contact || '',
    travelDate: '',
    groupSize: 2,
    notes: ''
  });

  useEffect(() => {
    setBookingForm((prev) => ({
      ...prev,
      travelerName: travelerPI?.fullName || prev.travelerName || currentUser?.name || '',
      travelerPhone: travelerPI?.phone || prev.travelerPhone || currentUser?.contact || ''
    }));
  }, [travelerPI, currentUser]);

  useEffect(() => {
    if (externalBookingItem) {
      setBookingForm((prev) => ({
        ...prev,
        travelerName: travelerPI?.fullName || prev.travelerName || currentUser?.name || '',
        travelerPhone: travelerPI?.phone || prev.travelerPhone || currentUser?.contact || '',
        notes: externalBookingItem.notes || prev.notes
      }));
      setSelectedBookingItem(externalBookingItem);
      if (onClearExternalBookingItem) {
        onClearExternalBookingItem();
      }
    }
  }, [externalBookingItem]);

  const providers = subscribers.filter((s) =>
    ['graduate', 'agency', 'tour_company', 'car_rental'].includes((s.role || '').toLowerCase())
  );

  const filteredProviders = providers.filter((p) =>
    roleFilter === 'all' ? true : p.role === roleFilter
  );

  const allPackages = [
    ...(publishedPackages || []),
    ...providers.flatMap((p) =>
      (p.publishedPackages || []).map((pkg) => ({
        ...pkg,
        providerId: pkg.providerId || p.id,
        providerName: pkg.providerName || p.name,
        providerRole: pkg.providerRole || p.role,
        providerContact: pkg.providerContact || p.contact,
        availabilityStatus: pkg.availabilityStatus || p.availabilityStatus || 'Available Now'
      }))
    )
  ];

  const uniquePackages = Array.from(
    new Map(allPackages.map((item) => [item.id || item.title, item])).values()
  );

  const openBookingModal = (item, type) => {
    if (!travelerPI?.fullName || !travelerPI?.phone) {
      if (onRequirePI) {
        onRequirePI(item, type);
      } else {
        alert('Please submit your Personal Information (PI) before booking.');
      }
      return;
    }
    setBookingForm((prev) => ({
      ...prev,
      travelerName: travelerPI.fullName,
      travelerPhone: travelerPI.phone
    }));
    setSelectedBookingItem({ ...item, bookingType: type });
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedBookingItem) return;
    await onBookPackageOrProvider(selectedBookingItem, {
      ...bookingForm,
      travelerPI
    });
    setSelectedBookingItem(null);
    setBookingForm((prev) => ({ ...prev, travelDate: '', notes: '' }));
  };

  return (
    <div className="space-y-6">
      {/* PROFILE JOBS / PACKAGES TO BE BOOKED */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
              Added on Provider Profiles
            </span>
            <h3 className="text-base font-black text-slate-900">
              🎒 Jobs / Packages to Be Booked ({uniquePackages.length})
            </h3>
            <p className="text-slate-500">
              Browse tour packages, guiding jobs, and car rental offers published directly on provider profiles.
            </p>
          </div>
        </div>

        {uniquePackages.length === 0 ? (
          <p className="text-slate-400 italic">
            No profile jobs or packages published yet. Providers can add Jobs / Packages directly from their profile editor.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniquePackages.map((pkg) => (
              <div
                key={pkg.id || pkg.title}
                className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
                      📍 {pkg.destination || 'Rwanda'}
                    </span>
                    <span className="font-black text-sm text-[#234E40]">
                      {pkg.priceLabel || 'Negotiable'}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">{pkg.title}</h4>
                  <p className="text-[11px] text-slate-600">
                    On Profile of <strong>{pkg.providerName}</strong> • {pkg.durationDays || 1} Day(s)
                  </p>
                  {pkg.highlights && (
                    <p className="text-slate-600">{pkg.highlights}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openBookingModal(pkg, 'package')}
                  className="w-full py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl transition"
                >
                  Book This Job / Package →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PROVIDER AVAILABILITY (GUIDES, AGENCIES, TOUR COMPANIES, CAR RENTALS) */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
              Live Provider Directory
            </span>
            <h3 className="text-base font-black text-slate-900">
              🧭 Guides, Tour Companies, Travel Agencies &amp; Car Rentals ({filteredProviders.length})
            </h3>
          </div>

          <div className="flex flex-wrap gap-1.5 font-bold">
            {[
              { id: 'all', label: 'All Providers' },
              { id: 'graduate', label: 'Guides / Graduates' },
              { id: 'tour_company', label: 'Tour Companies' },
              { id: 'agency', label: 'Travel Agencies' },
              { id: 'car_rental', label: 'Car Rentals' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl ${
                  roleFilter === tab.id
                    ? 'bg-[#234E40] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredProviders.length === 0 ? (
          <p className="text-slate-400 italic">
            No providers match this filter yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((prov) => (
              <div
                key={prov.id}
                className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {prov.photoUrl ? (
                      <img
                        src={prov.photoUrl}
                        alt={prov.name}
                        className="w-12 h-12 rounded-xl object-cover border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#234E40] font-black flex items-center justify-center text-base">
                        {(prov.name || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{prov.name}</h4>
                      <p className="text-[11px] text-[#3B6E5B] font-semibold">
                        {prov.title || prov.role}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                        {prov.availabilityStatus || 'Available Now'}
                      </span>
                    </div>
                  </div>

                  {prov.availableDates && (
                    <p className="text-[11px] text-slate-700 font-semibold">
                      📅 {prov.availableDates}
                    </p>
                  )}

                  {prov.bio && <p className="text-slate-600">{prov.bio}</p>}

                  {(prov.publishedPackages || []).length > 0 && (
                    <div className="bg-white p-2.5 rounded-xl border space-y-1">
                      <p className="text-[10px] font-extrabold uppercase text-[#234E40]">
                        🎒 Profile Jobs / Packages ({prov.publishedPackages.length}):
                      </p>
                      {(prov.publishedPackages || []).slice(0, 2).map((pItem) => (
                        <p key={pItem.id} className="text-[11px] text-slate-700 truncate">
                          • <strong>{pItem.title}</strong> ({pItem.priceLabel})
                        </p>
                      ))}
                    </div>
                  )}

                  {(prov.servicesProvided || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(prov.servicesProvided || []).map((srv, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-white border px-2 py-0.5 rounded-full text-slate-700 font-semibold"
                        >
                          • {srv}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openBookingModal(prov, 'provider')}
                  className="w-full py-2.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white font-bold rounded-xl transition"
                >
                  Book {prov.name} →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOOKING MODAL FOR TRAVELERS / ADS */}
      {selectedBookingItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmBooking}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="border-b pb-2">
              <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                Direct Booking Form
              </span>
              <h3 className="text-base font-black text-slate-900">
                {selectedBookingItem.bookingType === 'ad'
                  ? `Book Ad Offer: ${selectedBookingItem.headline || selectedBookingItem.name}`
                  : selectedBookingItem.bookingType === 'package'
                  ? `Book Offer: ${selectedBookingItem.title}`
                  : `Book Provider: ${selectedBookingItem.name}`}
              </h3>
            </div>

            {travelerPI?.fullName && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-[11px] text-slate-700">
                <strong>Your PI on file:</strong> {travelerPI.fullName} • {travelerPI.phone} •{' '}
                {travelerPI.nationality || 'Rwanda'}
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700">Your Name *</label>
              <input
                type="text"
                required
                value={bookingForm.travelerName}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, travelerName: e.target.value })
                }
                placeholder="Your full name"
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Your Phone / WhatsApp *</label>
              <input
                type="text"
                required
                value={bookingForm.travelerPhone}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, travelerPhone: e.target.value })
                }
                placeholder="+25078XXXXXXX"
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700">Preferred Date *</label>
                <input
                  type="date"
                  required
                  value={bookingForm.travelDate}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, travelDate: e.target.value })
                  }
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Travelers / Seats</label>
                <input
                  type="number"
                  min="1"
                  value={bookingForm.groupSize}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, groupSize: e.target.value })
                  }
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700">Trip / Rental Notes</label>
              <input
                type="text"
                value={bookingForm.notes}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, notes: e.target.value })
                }
                placeholder="Pickup location, vehicle type, language, special requests..."
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#234E40] text-white rounded-xl font-bold"
              >
                Confirm Booking Request →
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// BOOKING MANAGEMENT CONSOLE & PRIVATE 1-ON-1 CHAT
// =========================================================================
function BookingMarketplace({
  currentUser,
  currentRole,
  travelerPI,
  onOpenProfilePackages,
  externalChatTarget,
  onClearExternalChatTarget
}) {
  const [bookings, setBookings] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [activeChatThread, setActiveChatThread] = useState(null);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [filter, setFilter] = useState('open');

  const [guestId] = useState(() => {
    let id = localStorage.getItem('gl_guest_owner_id');
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('gl_guest_owner_id', id);
    }
    return id;
  });

  const normalize = (s) => (s || '').replace(/\s+/g, '').toLowerCase();
  const activeUserId =
    normalize(
      travelerPI?.phone ||
        currentUser?.contact ||
        currentUser?.id ||
        travelerPI?.fullName ||
        currentUser?.name
    ) || guestId;

  const activeUserName =
    travelerPI?.fullName || currentUser?.name || 'Member / Traveler';
  const activeUserRole = (currentRole || currentUser?.role || 'traveler').toLowerCase();

  const isProvider = ['graduate', 'agency', 'tour_company', 'car_rental'].includes(
    activeUserRole
  );

  const fetchOpenBookingsAndChats = async () => {
    const [fbBookings, fbChats] = await Promise.all([
      firestoreGetCollection('openBookings'),
      firestoreGetCollection('privateChats')
    ]);

    if (fbBookings.length > 0) {
      const sorted = [...fbBookings].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBookings(sorted);
    }

    if (fbChats.length > 0) {
      setPrivateChats(fbChats);
    }
  };

  useEffect(() => {
    fetchOpenBookingsAndChats();
    const timer = setInterval(fetchOpenBookingsAndChats, 12000);
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

  const buildThreadId = (contextId, userA, userB) => {
    const pair = [normalize(userA), normalize(userB)].sort().join('__');
    return `chat_${contextId}_${pair}`;
  };

  const openPrivateChat = async (contextId, contextTitle, otherUserId, otherUserName) => {
    const cleanOtherId = normalize(otherUserId);
    if (!cleanOtherId || cleanOtherId === activeUserId) {
      alert('Unable to start private chat with yourself.');
      return;
    }

    const threadId = buildThreadId(contextId, activeUserId, cleanOtherId);
    const existingThread = privateChats.find((t) => t.id === threadId);

    if (existingThread) {
      setActiveChatThread(existingThread);
      return;
    }

    const newThread = {
      id: threadId,
      bookingId: contextId,
      bookingTitle: contextTitle || 'Private Booking Chat',
      participantIds: [activeUserId, cleanOtherId],
      participantNames: {
        [activeUserId]: activeUserName,
        [cleanOtherId]: otherUserName || 'Booking Partner'
      },
      messages: [],
      updatedAt: Date.now()
    };

    setPrivateChats((prev) => [newThread, ...prev]);
    setActiveChatThread(newThread);
    await firestoreSaveDoc('privateChats', threadId, newThread);
  };

  useEffect(() => {
    if (externalChatTarget) {
      openPrivateChat(
        externalChatTarget.contextId || 'direct',
        externalChatTarget.contextTitle || 'Private Conversation',
        externalChatTarget.otherUserId,
        externalChatTarget.otherUserName
      );
      if (onClearExternalChatTarget) {
        onClearExternalChatTarget();
      }
    }
  }, [externalChatTarget]);

  const handleSendPrivateMessage = async (e) => {
    e.preventDefault();
    if (!activeChatThread || !chatMessageInput.trim()) return;

    const currentThread =
      privateChats.find((t) => t.id === activeChatThread.id) || activeChatThread;

    const participants = currentThread.participantIds || [];
    if (!participants.includes(activeUserId)) {
      alert('Access denied: only the two private chat participants can send or view messages.');
      return;
    }

    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: activeUserId,
      senderName: activeUserName,
      text: chatMessageInput.trim(),
      sentAt: new Date().toISOString()
    };

    const updatedMessages = [...(currentThread.messages || []), newMsg];
    const updatedThread = {
      ...currentThread,
      messages: updatedMessages,
      updatedAt: Date.now()
    };

    setPrivateChats((prev) =>
      prev.map((t) => (t.id === updatedThread.id ? updatedThread : t))
    );
    setActiveChatThread(updatedThread);
    setChatMessageInput('');
    await firestoreSaveDoc('privateChats', updatedThread.id, updatedThread);
  };

  const handleApplyForBooking = async (booking) => {
    if (booking.status !== 'open') return;
    const roleLabel =
      activeUserRole === 'graduate'
        ? 'Tourism Graduate / Guide'
        : activeUserRole === 'agency'
        ? 'Travel Agency'
        : activeUserRole === 'car_rental'
        ? 'Car Rentals Company'
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
    alert('✓ Booking confirmation / acceptance sent!');
  };

  const handleConfirmProviderDirectBooking = async (booking) => {
    const ok = window.confirm(
      `Confirm and accept booking "${booking.title}" from ${booking.ownerName}?`
    );
    if (!ok) return;

    const approvedData = {
      providerId: activeUserId,
      providerName: activeUserName,
      providerRole: activeUserRole,
      providerPhone: currentUser?.contact || '',
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
    alert(`✓ Booking "${booking.title}" confirmed!`);
  };

  const handleApproveProvider = async (booking, applicant) => {
    if (booking.ownerId !== activeUserId) {
      alert('Only the user who created this booking can approve an applicant.');
      return;
    }

    const ok = window.confirm(
      `Approve ${applicant.providerName} (${applicant.providerRole}) for "${booking.title}"?`
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
    alert(`✓ ${applicant.providerName} has been confirmed for this booking!`);
  };

  const myPrivateThreads = privateChats.filter((t) =>
    (t.participantIds || []).includes(activeUserId)
  );

  const liveActiveThread = activeChatThread
    ? privateChats.find((t) => t.id === activeChatThread.id) || activeChatThread
    : null;

  const canViewLiveThread =
    liveActiveThread && (liveActiveThread.participantIds || []).includes(activeUserId);

  const grantedCount = bookings.filter(
    (b) => b.approvedProvider?.providerId === activeUserId
  ).length;

  const filteredBookings = bookings.filter((b) => {
    const isOwner = b.ownerId === activeUserId;
    const isGrantedToMe = b.approvedProvider?.providerId === activeUserId;
    const isTargetedToMe =
      isProvider &&
      (normalize(b.targetProviderId) === activeUserId ||
        normalize(b.targetRole) === normalize(activeUserName));

    if (filter === 'open') return b.status === 'open';
    if (filter === 'my_bookings') return isOwner || isTargetedToMe;
    if (filter === 'granted') return isGrantedToMe;
    if (filter === 'taken') return b.status === 'taken';
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="bg-[#234E40] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
            📋 Booking Management &amp; Private Messaging
          </span>
          <h3 className="font-bold text-base md:text-xl pt-1">
            📋 Booking Management Console
          </h3>
          <p className="text-xs md:text-sm text-emerald-100">
            {isProvider
              ? 'Manage incoming client bookings for your profile Jobs & Packages, confirm reservations, and chat privately with travelers.'
              : 'Track your booked packages, review confirmations, and chat privately with your provider.'}
          </p>
        </div>

        {isProvider && onOpenProfilePackages && (
          <button
            type="button"
            onClick={onOpenProfilePackages}
            className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs md:text-sm rounded-xl shadow shrink-0 transition"
          >
            + Add Jobs / Packages on Profile
          </button>
        )}
      </div>

      {/* PRIVATE 1-ON-1 CHAT CONVERSATIONS (VISIBLE ONLY TO PARTICIPANTS) */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
              🔒 Private 1-on-1 Messaging
            </span>
            <h4 className="font-black text-sm text-slate-900">
              Your Private Booking Chats ({myPrivateThreads.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Strictly private: only the two participants in a thread can read or reply.
          </span>
        </div>

        {myPrivateThreads.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {myPrivateThreads.map((thread) => {
              const otherId = (thread.participantIds || []).find((id) => id !== activeUserId);
              const otherName =
                (thread.participantNames && otherId && thread.participantNames[otherId]) ||
                'Partner';
              const isSelected = canViewLiveThread && liveActiveThread.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveChatThread(thread)}
                  className={`px-3.5 py-2 rounded-xl border font-bold text-left transition ${
                    isSelected
                      ? 'bg-[#234E40] text-white border-[#234E40]'
                      : 'bg-slate-50 text-slate-800 hover:bg-emerald-50'
                  }`}
                >
                  💬 Chat with {otherName} •{' '}
                  <span className="font-normal opacity-80">{thread.bookingTitle}</span>
                </button>
              );
            })}
          </div>
        )}

        {canViewLiveThread ? (
          <div className="border rounded-2xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-extrabold text-sm text-slate-900">
                  🔒 Private Chat — {liveActiveThread.bookingTitle}
                </p>
                <p className="text-[11px] text-slate-500">
                  Participants:{' '}
                  {(liveActiveThread.participantIds || [])
                    .map(
                      (pid) =>
                        (liveActiveThread.participantNames &&
                          liveActiveThread.participantNames[pid]) ||
                        pid
                    )
                    .join(' & ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveChatThread(null)}
                className="px-3 py-1 bg-white border rounded-lg font-bold text-slate-700"
              >
                Close Chat
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {(liveActiveThread.messages || []).length === 0 ? (
                <p className="text-slate-400 italic text-center py-4">
                  No messages yet. Send a private message to coordinate booking details.
                </p>
              ) : (
                (liveActiveThread.messages || []).map((msg) => {
                  const mine = msg.senderId === activeUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl max-w-md ${
                        mine
                          ? 'ml-auto bg-[#234E40] text-white'
                          : 'mr-auto bg-white border text-slate-800'
                      }`}
                    >
                      <p className="text-[10px] font-bold opacity-80">
                        {msg.senderName} •{' '}
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : ''}
                      </p>
                      <p className="mt-0.5">{msg.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendPrivateMessage} className="flex gap-2 pt-1">
              <input
                type="text"
                value={chatMessageInput}
                onChange={(e) => setChatMessageInput(e.target.value)}
                placeholder="Write a private message (only visible to you and your chat partner)..."
                className="flex-1 p-2.5 border rounded-xl bg-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
              >
                Send Private Message →
              </button>
            </form>
          </div>
        ) : (
          myPrivateThreads.length === 0 && (
            <p className="text-slate-400 italic">
              No private conversations yet. Click &quot;Private Chat&quot; on any booking or traveler to start a private conversation.
            </p>
          )
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1.5 rounded-2xl border text-[11px] md:text-xs font-bold text-center shadow-sm">
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'open' ? 'bg-[#234E40] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🟢 Active / Pending Bookings ({bookings.filter((b) => b.status === 'open').length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('my_bookings')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'my_bookings' ? 'bg-[#234E40] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📋 {isProvider ? 'My Incoming Bookings' : 'My Bookings'}
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
          <span>🎉 Confirmed by Me</span>
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
          🔒 Completed / Confirmed ({bookings.filter((b) => b.status === 'taken').length})
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-500">
          No bookings in this view right now. Travelers can book published Jobs &amp; Packages directly from your profile!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => {
            const isOwner = booking.ownerId === activeUserId;
            const isTaken = booking.status === 'taken';
            const isGrantedToMe = booking.approvedProvider?.providerId === activeUserId;
            const isTargetedToMe =
              isProvider &&
              (normalize(booking.targetProviderId) === activeUserId ||
                normalize(booking.targetRole) === normalize(activeUserName));
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
                        ✓ Confirmed Booking
                      </span>
                    ) : isTaken ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        🔒 Confirmed &amp; Locked
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        ● Pending Confirmation
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900">{booking.title}</h4>
                  <p className="text-[11px] text-slate-500">
                    Booked by <strong>{booking.ownerName}</strong> • Provider: {booking.targetRole}
                  </p>

                  {booking.travelerPI && (
                    <div className="bg-emerald-50/70 border border-emerald-200 p-2 rounded-xl text-[11px] text-slate-700">
                      <strong>🪪 Traveler PI:</strong> {booking.travelerPI.fullName} •{' '}
                      {booking.travelerPI.nationality || 'Rwanda'} • {booking.travelerPI.phone}
                    </div>
                  )}

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
                      <span className="text-slate-400 block">Rate / Budget</span>
                      <span className="font-bold text-[#234E40]">{booking.budgetRwf}</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="text-slate-600 italic">&quot;{booking.notes}&quot;</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  {isGrantedToMe && (
                    <div className="bg-[#234E40] text-white p-3 rounded-xl space-y-1.5">
                      <p className="font-bold">
                        🎉 You confirmed this booking!
                      </p>
                      <p className="text-[11px] text-emerald-100">
                        Client: <strong>{booking.ownerName}</strong> • Phone:{' '}
                        <strong>{booking.ownerPhone}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openPrivateChat(
                            booking.id,
                            booking.title,
                            booking.ownerId,
                            booking.ownerName
                          )
                        }
                        className="mt-1 px-3 py-1.5 bg-amber-400 text-slate-950 rounded-lg font-extrabold text-[11px]"
                      >
                        💬 Private Chat with Client
                      </button>
                    </div>
                  )}

                  {isTaken && !isGrantedToMe && !isOwner && (
                    <div className="bg-slate-200 text-slate-700 p-2.5 rounded-xl text-center font-semibold">
                      🔒 Confirmed with{' '}
                      <strong>{booking.approvedProvider?.providerName}</strong>.
                    </div>
                  )}

                  {isOwner && (
                    <div className="space-y-2">
                      <p className="font-bold text-[11px] uppercase text-slate-700">
                        {isTaken
                          ? `✓ Confirmed Provider: ${booking.approvedProvider?.providerName}`
                          : `Responses (${(booking.applicants || []).length}):`}
                      </p>

                      {!isTaken && (booking.applicants || []).length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">
                          Awaiting confirmation from provider...
                        </p>
                      )}

                      {!isTaken &&
                        (booking.applicants || []).map((app, i) => (
                          <div
                            key={i}
                            className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border p-2 rounded-xl"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{app.providerName}</p>
                              <p className="text-[10px] text-slate-500">
                                {app.providerRole} {app.providerPhone ? `• ${app.providerPhone}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openPrivateChat(
                                    booking.id,
                                    booking.title,
                                    app.providerId,
                                    app.providerName
                                  )
                                }
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold"
                              >
                                💬 Private Chat
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveProvider(booking, app)}
                                className="px-3 py-1.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-lg font-bold"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {!isOwner && !isTaken && isProvider && (
                    <div className="space-y-1.5">
                      {isTargetedToMe && (
                        <button
                          type="button"
                          onClick={() => handleConfirmProviderDirectBooking(booking)}
                          className="w-full py-2.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-extrabold transition"
                        >
                          ✓ Accept &amp; Confirm Client Booking
                        </button>
                      )}

                      {!isTargetedToMe &&
                        (alreadyApplied ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 bg-slate-200 text-slate-600 rounded-xl font-bold cursor-not-allowed"
                          >
                            ✓ Response Sent — Awaiting Confirmation
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyForBooking(booking)}
                            className="w-full py-2.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold transition"
                          >
                            Accept / Respond to Booking →
                          </button>
                        ))}

                      <button
                        type="button"
                        onClick={() =>
                          openPrivateChat(
                            booking.id,
                            booking.title,
                            booking.ownerId,
                            booking.ownerName
                          )
                        }
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition"
                      >
                        💬 Private Chat with {booking.ownerName}
                      </button>
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
// MAIN APPLICATION COMPONENT
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

  const [language, setLanguage] = useState('ENG');
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.ENG;

  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [allRolesFilter, setAllRolesFilter] = useState('all');
  const [showUserProfileEditor, setShowUserProfileEditor] = useState(false);
  const [showBookingManagementPanel, setShowBookingManagementPanel] = useState(true);
  const [showChangePasswordBox, setShowChangePasswordBox] = useState(false);
  const [showPiFormModal, setShowPiFormModal] = useState(false);
  const [pendingPiAction, setPendingPiAction] = useState(null);
  const [externalBookingItem, setExternalBookingItem] = useState(null);
  const [travelerPI, setTravelerPI] = useState(null);
  const [travelersDirectory, setTravelersDirectory] = useState([]);
  const [externalChatTarget, setExternalChatTarget] = useState(null);

  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');

  const [ownerCurrentPassInput, setOwnerCurrentPassInput] = useState('');
  const [ownerNewPassInput, setOwnerNewPassInput] = useState('');
  const [ownerConfirmPassInput, setOwnerConfirmPassInput] = useState('');

  const [selectedInspectedUser, setSelectedInspectedUser] = useState(null);
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activePopupAd, setActivePopupAd] = useState(null);
  const [publishedPackages, setPublishedPackages] = useState([]);

  const [nowClock, setNowClock] = useState(() => new Date());
  const [lastAutoUpdateAt, setLastAutoUpdateAt] = useState(() => new Date());

  const [newAdForm, setNewAdForm] = useState({
    advertiserName: '',
    advertiserContact: '',
    headline: '',
    description: '',
    badge: 'Paid Partner',
    ctaLabel: 'Book Now',
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
  const [authPasswordInput, setAuthPasswordInput] = useState('');
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
    const clockTimer = setInterval(() => {
      setNowClock(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const syncFromFirebase = async () => {
    const [fbConfigs, fbPlans, fbSubs, fbPkgs, fbTravelers] = await Promise.all([
      firestoreGetCollection('appConfig'),
      firestoreGetCollection('subscriptionPlans'),
      firestoreGetCollection('subscribers'),
      firestoreGetCollection('publishedPackages'),
      firestoreGetCollection('travelersPI')
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
    if (fbPkgs.length > 0) {
      setPublishedPackages(
        [...fbPkgs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      );
    }
    if (fbTravelers.length > 0) {
      setTravelersDirectory(
        [...fbTravelers].sort(
          (a, b) =>
            new Date(b.submittedAt || 0).getTime() -
            new Date(a.submittedAt || 0).getTime()
        )
      );
    }
    setLastAutoUpdateAt(new Date());
  };

  useEffect(() => {
    syncFromFirebase();
    const interval = setInterval(syncFromFirebase, 30000);
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

  const handleSaveTravelerPI = async (piData) => {
    const cleanId =
      normalizeContact(piData.phone || piData.fullName) || `trv-${Date.now()}`;
    const record = {
      id: cleanId,
      ...piData
    };
    setTravelerPI(record);
    setTravelersDirectory((prev) => {
      const filtered = prev.filter((item) => item.id !== record.id);
      return [record, ...filtered];
    });
    setShowPiFormModal(false);
    await firestoreSaveDoc('travelersPI', cleanId, record);

    if (pendingPiAction?.item) {
      setExternalBookingItem({
        ...pendingPiAction.item,
        bookingType: pendingPiAction.type || 'ad'
      });
      setPendingPiAction(null);
    } else {
      alert('✓ Your Personal Information (PI) is saved! You can now book Jobs & Packages.');
    }
  };

  const handleBookFromAd = (ad) => {
    setActivePopupAd(null);
    const adBookingTarget = {
      id: ad.id,
      name: ad.advertiserName || ad.headline,
      headline: ad.headline,
      destination: 'Multi-Destination Rwanda',
      priceLabel: ad.badge || 'Partner Offer',
      notes: `Ad Booking: ${ad.advertiserName} — ${ad.headline}${
        ad.description ? ` (${ad.description})` : ''
      }`,
      bookingType: 'ad'
    };

    if (!travelerPI?.fullName || !travelerPI?.phone) {
      setPendingPiAction({ item: adBookingTarget, type: 'ad' });
      setShowPiFormModal(true);
      return;
    }

    setExternalBookingItem(adBookingTarget);
  };

  const handleStartPrivateChatWithTraveler = (trv) => {
    setExternalChatTarget({
      contextId: `traveler_${trv.id}`,
      contextTitle: `Trip Inquiry with Traveler: ${trv.fullName}`,
      otherUserId: trv.phone || trv.id || trv.fullName,
      otherUserName: trv.fullName
    });
    setCurrentRole('welcome');
  };

  const saveAppServerConfig = async (updatedConfig) => {
    setIsSaving(true);
    setAppConfig(updatedConfig);
    await firestoreSaveDoc('appConfig', 'main', updatedConfig);
    setLastAutoUpdateAt(new Date());
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

  const handleChangeOwnerPassword = async (e) => {
    e.preventDefault();
    const currentStoredOwnerPass = appConfig.ownerPassword || 'FYP$2026';
    if (ownerCurrentPassInput !== currentStoredOwnerPass) {
      alert('Current Owner password is incorrect.');
      return;
    }
    if (!ownerNewPassInput.trim() || ownerNewPassInput.trim().length < 4) {
      alert('New Owner password must be at least 4 characters.');
      return;
    }
    if (ownerNewPassInput !== ownerConfirmPassInput) {
      alert('New Owner password and confirmation do not match.');
      return;
    }

    const nextConfig = {
      ...appConfig,
      ownerPassword: ownerNewPassInput.trim()
    };
    await saveAppServerConfig(nextConfig);
    setOwnerCurrentPassInput('');
    setOwnerNewPassInput('');
    setOwnerConfirmPassInput('');
    alert('✓ Owner password updated successfully!');
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
    setLastAutoUpdateAt(new Date());
    setIsSaving(false);
    alert('✓ Profile, Jobs/Packages to be booked, availability & qualifications saved!');
  };

  const handleOwnerUpdateUserRole = async (userId, nextRole) => {
    const target = subscribers.find((s) => s.id === userId);
    if (!target) return;
    const updated = {
      ...target,
      role: nextRole,
      updatedAt: new Date().toISOString()
    };
    setSubscribers((prev) => prev.map((s) => (s.id === userId ? updated : s)));
    if (selectedInspectedUser?.id === userId) {
      setSelectedInspectedUser(updated);
    }
    if (currentUser?.id === userId) {
      setCurrentUser(updated);
    }
    await firestoreSaveDoc('subscribers', userId, updated);
    setLastAutoUpdateAt(new Date());
    alert(`✓ Updated ${target.name}'s role to ${nextRole}.`);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      alert('Please enter a new password (at least 4 characters).');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      alert('New password and confirmation do not match.');
      return;
    }

    if (currentUser?.password && currentPasswordInput !== currentUser.password) {
      alert('Your current password is incorrect.');
      return;
    }

    setIsSaving(true);
    const updatedUser = {
      ...currentUser,
      role: currentUser?.role || currentRole,
      password: newPasswordInput.trim(),
      updatedAt: new Date().toISOString()
    };

    setCurrentUser(updatedUser);
    if (updatedUser.id) {
      setSubscribers((prev) => {
        const exists = prev.some((s) => s.id === updatedUser.id);
        return exists
          ? prev.map((s) => (s.id === updatedUser.id ? updatedUser : s))
          : [updatedUser, ...prev];
      });
      await firestoreSaveDoc('subscribers', updatedUser.id, updatedUser);
    }
    setIsSaving(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');
    setShowChangePasswordBox(false);
    alert('✓ Your dashboard password has been updated!');
  };

  const handlePublishProviderPackage = async (pkgItem, updatedProfileFields) => {
    const enrichedPkg = {
      ...pkgItem,
      providerId: pkgItem.providerId || currentUser?.id || '',
      providerName: pkgItem.providerName || currentUser?.name || 'Partner',
      providerContact: pkgItem.providerContact || currentUser?.contact || ''
    };

    setPublishedPackages((prev) => [enrichedPkg, ...prev]);
    await firestoreSaveDoc('publishedPackages', enrichedPkg.id, enrichedPkg);

    if (currentUser?.id && updatedProfileFields) {
      const nextUser = {
        ...currentUser,
        ...updatedProfileFields,
        updatedAt: new Date().toISOString()
      };
      setCurrentUser(nextUser);
      setSubscribers((prev) => prev.map((s) => (s.id === nextUser.id ? nextUser : s)));
      await firestoreSaveDoc('subscribers', nextUser.id, nextUser);
    }
    alert('✓ Job / Package published to your profile and live booking board!');
  };

  const handleRemovePublishedPackage = async (pkgId, updatedProfileFields) => {
    setPublishedPackages((prev) => prev.filter((p) => p.id !== pkgId));
    await firestoreDeleteDoc('publishedPackages', pkgId);

    if (currentUser?.id && updatedProfileFields) {
      const nextUser = {
        ...currentUser,
        ...updatedProfileFields,
        updatedAt: new Date().toISOString()
      };
      setCurrentUser(nextUser);
      setSubscribers((prev) => prev.map((s) => (s.id === nextUser.id ? nextUser : s)));
      await firestoreSaveDoc('subscribers', nextUser.id, nextUser);
    }
  };

  const handleBookPackageOrProvider = async (item, bookingForm) => {
    const activePI = bookingForm.travelerPI || travelerPI;
    if (!activePI?.fullName || !activePI?.phone) {
      setShowPiFormModal(true);
      return;
    }

    const isPkg = item.bookingType === 'package';
    const isAd = item.bookingType === 'ad';
    const bookingId = `bk-${Date.now()}`;
    const targetName = isPkg
      ? item.providerName || item.title
      : isAd
      ? item.headline || item.name
      : item.name;
    const targetProviderId = isPkg
      ? normalizeContact(item.providerContact || item.providerId || item.providerName)
      : normalizeContact(item.contact || item.id || item.name);
    const targetContact = isPkg ? item.providerContact || '' : item.contact || '';

    const bookingDoc = {
      id: bookingId,
      title: isPkg
        ? `Booked Offer: ${item.title} (${targetName})`
        : isAd
        ? `Ad Booking: ${targetName}`
        : `Direct Booking: ${targetName}`,
      destination: item.destination || 'Multi-Destination Rwanda',
      startDate: bookingForm.travelDate || 'Flexible Date',
      durationDays: Number(item.durationDays || bookingForm.durationDays) || 1,
      groupSize: Number(bookingForm.groupSize) || 1,
      budgetRwf: item.priceLabel || 'Negotiable',
      targetRole: targetName,
      targetProviderId,
      travelerPI: activePI,
      notes: [
        bookingForm.notes,
        `Traveler PI: ${activePI.fullName} (${activePI.nationality || 'Rwanda'})`,
        targetContact ? `Provider Contact: ${targetContact}` : ''
      ]
        .filter(Boolean)
        .join(' • '),
      ownerId:
        normalizeContact(activePI.phone || activePI.fullName) ||
        `traveler_${Date.now()}`,
      ownerName: activePI.fullName,
      ownerPhone: activePI.phone,
      status: 'open',
      applicants: [],
      approvedProvider: null,
      createdAt: Date.now()
    };

    await firestoreSaveDoc('openBookings', bookingId, bookingDoc);
    alert(
      `✓ Booking request sent for "${isPkg ? item.title : targetName}"! The provider can now manage and confirm it in their Booking Management dashboard.`
    );
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
      ctaLabel: newAdForm.ctaLabel.trim() || 'Book Now',
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
      ctaLabel: 'Book Now',
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
    const validOwnerPass = appConfig.ownerPassword || 'FYP$2026';
    if (ownerPinInput === validOwnerPass) {
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setLastAutoUpdateAt(new Date());
      setCurrentRole('owner');
    } else {
      alert('Invalid Owner password.');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const cleanContact = normalizeContact(authContactInput);
    if (!cleanContact) return;
    if (!authPasswordInput.trim()) {
      alert('Please enter your password.');
      return;
    }

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
      if (existing.password && existing.password !== authPasswordInput.trim()) {
        alert('Incorrect password. Please try again.');
        return;
      }
      setCurrentUser(existing);
      setIsSubscribed(checkSubscriptionActive(existing));
      setCurrentRole(existing.role);
      setLastAutoUpdateAt(new Date());
      setAuthPasswordInput('');
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
      password: authPasswordInput.trim(),
      role: selectedRoleForAuth,
      institution: authInstitutionInput.trim(),
      license: authLicenseInput.trim(),
      photoUrl: '',
      availabilityStatus: 'Available Now',
      availableDates: '',
      servicesProvided: [],
      experiences: [],
      qualifications: [],
      publishedPackages: [],
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
    setLastAutoUpdateAt(new Date());
    setIsSaving(false);

    setCurrentUser(newSub);
    setIsSubscribed(false);
    setCurrentRole(newSub.role);
    setAuthPasswordInput('');
    alert(
      `✓ Registration submitted with your password! Pay ${chosenPlan.price.toLocaleString()} RWF via MTN MoMo Code ${appConfig.momoCode} to activate your ${chosenPlan.name} plan.`
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
    setLastAutoUpdateAt(new Date());
  };

  const handleRevokeSubscriber = async (sub) => {
    const updated = { ...sub, status: 'suspended' };
    setSubscribers(subscribers.map((s) => (s.id === sub.id ? updated : s)));
    await firestoreSaveDoc('subscribers', sub.id, updated);
    setLastAutoUpdateAt(new Date());
  };

  const handleDeleteSubscriber = async (subId) => {
    if (!window.confirm('Permanently delete this user account from Firebase?')) return;
    setSubscribers(subscribers.filter((s) => s.id !== subId));
    if (selectedInspectedUser?.id === subId) {
      setSelectedInspectedUser(null);
    }
    await firestoreDeleteDoc('subscribers', subId);
    setLastAutoUpdateAt(new Date());
  };

  const roleLabelMap = {
    graduate: t.graduateTitle,
    agency: t.agencyTitle,
    tour_company: t.tourCompanyTitle,
    car_rental: t.carRentalTitle,
    traveler: t.travelerTitle,
    owner: 'Platform Owner (C.E.O.)'
  };

  const isLoggedInSession = Boolean(currentUser) || currentRole === 'owner';

  const visibleAnnouncements = (appConfig.announcements || []).filter(
    (ann) => ann.targetRole === 'all' || ann.targetRole === currentRole
  );

  const pendingSignupsCount = subscribers.filter((s) => s.status === 'pending').length;

  const filteredRoleUsers = subscribers.filter((u) =>
    allRolesFilter === 'all' ? true : u.role === allRolesFilter
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
            {/* LANGUAGE SWITCHER ICON: KINY, FRA, ENG, KISW */}
            <div
              title="Change Language"
              className="inline-flex items-center bg-black/25 p-1 rounded-xl gap-1"
            >
              <span className="px-1.5 font-extrabold text-amber-300">🌐</span>
              {['KINY', 'FRA', 'ENG', 'KISW'].map((langCode) => (
                <button
                  key={langCode}
                  type="button"
                  onClick={() => setLanguage(langCode)}
                  className={`px-2 py-1 rounded-lg font-extrabold text-[10px] transition ${
                    language === langCode
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-white/85 hover:bg-white/10'
                  }`}
                >
                  {langCode}
                </button>
              ))}
            </div>

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
                ← {t.switchPortal}
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
              👑 {t.ownerBtn}
            </button>
          </div>
        </div>
      </header>

      {/* AUTOMATIC LIVE DATE & TIME BAR (APPEARS ONCE LOGGED IN) */}
      {isLoggedInSession && (
        <div className="bg-slate-900 text-emerald-100 border-b border-emerald-800 px-4 md:px-8 py-2 text-[11px]">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                🕒 Live Date &amp; Time:{' '}
                <strong className="text-white">
                  {nowClock.toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}{' '}
                  • {nowClock.toLocaleTimeString()}
                </strong>
              </span>
            </div>
            <span className="text-emerald-300">
              🔄 Auto-sync active • Last updated: {lastAutoUpdateAt.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

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
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#234E40] text-amber-300 font-black text-xs md:text-sm tracking-widest uppercase shadow-sm">
                🇷🇼 {appConfig.welcomeNote || t.welcomeNoteTop}
              </div>

              <h2 className="text-2xl md:text-4xl font-black text-slate-900">
                {appConfig.tagline}
              </h2>

              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-[#234E40]">
                {t.heroBadge}
              </span>

              <p className="text-slate-600 max-w-2xl mx-auto text-sm md:text-base">
                {appConfig.subtitle}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 text-left">
                {[
                  {
                    role: 'graduate',
                    icon: '🎓',
                    title: t.graduateTitle,
                    desc: t.graduateDesc
                  },
                  {
                    role: 'agency',
                    icon: '✈️',
                    title: t.agencyTitle,
                    desc: t.agencyDesc
                  },
                  {
                    role: 'tour_company',
                    icon: '🚐',
                    title: t.tourCompanyTitle,
                    desc: t.tourCompanyDesc
                  },
                  {
                    role: 'car_rental',
                    icon: '🚗',
                    title: t.carRentalTitle,
                    desc: t.carRentalDesc
                  },
                  {
                    role: 'traveler',
                    icon: '🌍',
                    title: t.travelerTitle,
                    desc: t.travelerDesc
                  }
                ].map((card) => (
                  <div
                    key={card.role}
                    onClick={() => {
                      if (card.role === 'traveler') {
                        setCurrentRole('traveler');
                        if (!travelerPI?.fullName || !travelerPI?.phone) {
                          setShowPiFormModal(true);
                        }
                      } else {
                        setSelectedRoleForAuth(card.role);
                        setCurrentRole('auth');
                      }
                    }}
                    className="p-5 rounded-2xl border-2 border-slate-100 hover:border-[#234E40] bg-slate-50/60 hover:bg-white cursor-pointer transition shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="text-3xl">{card.icon}</div>
                      <h3 className="font-extrabold text-sm md:text-base text-slate-900">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-600">{card.desc}</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#234E40]">
                      {t.enterPortal} →
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <TravelersOnWelcomeDirectory
              travelersList={travelersDirectory}
              onStartPrivateChatWithTraveler={handleStartPrivateChatWithTraveler}
              lang={language}
            />

            <TravelerAvailabilityAndPackages
              subscribers={subscribers}
              publishedPackages={publishedPackages}
              currentUser={currentUser}
              travelerPI={travelerPI}
              onRequirePI={(item, type) => {
                if (item) setPendingPiAction({ item, type });
                setShowPiFormModal(true);
              }}
              onBookPackageOrProvider={handleBookPackageOrProvider}
              externalBookingItem={externalBookingItem}
              onClearExternalBookingItem={() => setExternalBookingItem(null)}
            />

            <BookingMarketplace
              currentUser={currentUser}
              currentRole={currentRole}
              travelerPI={travelerPI}
              onOpenProfilePackages={() => setShowUserProfileEditor(true)}
              externalChatTarget={externalChatTarget}
              onClearExternalChatTarget={() => setExternalChatTarget(null)}
            />
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
                      placeholder="e.g. RUTUNGURA Bonheur / Kigali 4x4 Rentals Ltd"
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
                        License / Diploma / Fleet Number
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                <div>
                  <label className="font-bold text-slate-700">
                    {authMode === 'login' ? 'Your Dashboard Password *' : 'Set Your Password *'}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder={
                      authMode === 'login'
                        ? 'Enter your password'
                        : 'Create a password to log in'
                    }
                    value={authPasswordInput}
                    onChange={(e) => setAuthPasswordInput(e.target.value)}
                    className="w-full mt-1 p-3 border rounded-xl"
                  />
                </div>
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
        {['graduate', 'agency', 'tour_company', 'car_rental', 'traveler'].includes(
          currentRole
        ) && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {currentUser?.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name || travelerPI?.fullName || 'User'}
                    className="w-12 h-12 rounded-2xl object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center font-black text-[#234E40] text-lg">
                    {(travelerPI?.fullName || currentUser?.name || 'G')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">
                    {roleLabelMap[currentRole]}
                  </span>
                  <h2 className="text-xl font-black text-slate-900">
                    Welcome, {travelerPI?.fullName || currentUser?.name || 'Guest Traveler'}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentRole === 'traveler' && (
                  <button
                    type="button"
                    onClick={() => setShowPiFormModal(true)}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-extrabold rounded-xl shadow"
                  >
                    {travelerPI?.fullName
                      ? '🪪 Update Personal Info (PI)'
                      : '🪪 Submit Personal Info (PI) *'}
                  </button>
                )}

                {currentRole !== 'traveler' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowBookingManagementPanel(!showBookingManagementPanel)}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl shadow flex items-center gap-1.5 ${
                        showBookingManagementPanel
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-amber-100 text-amber-950 hover:bg-amber-200'
                      }`}
                    >
                      <span>📋</span>
                      <span>Booking Management</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUserProfileEditor(!showUserProfileEditor)}
                      className="px-4 py-2 bg-[#234E40] hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow"
                    >
                      {showUserProfileEditor
                        ? 'Hide Profile & Offers'
                        : '🎒 Profile & Jobs/Packages to Be Booked'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowChangePasswordBox(!showChangePasswordBox)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow"
                    >
                      {showChangePasswordBox ? 'Hide Password Form' : '🔑 Change Password'}
                    </button>
                  </>
                )}

                {currentRole !== 'traveler' && !isSubscribed && (
                  <div className="bg-amber-50 border border-amber-300 px-4 py-2.5 rounded-xl text-xs text-amber-950">
                    <strong>⏳ Pending Activation:</strong> Pay via MTN MoMo Code{' '}
                    <strong className="underline">{appConfig.momoCode}</strong>. Owner C.E.O. (+250780558555) will approve shortly.
                  </div>
                )}
              </div>
            </div>

            {currentRole === 'traveler' && (!travelerPI?.fullName || !travelerPI?.phone) && (
              <TravelerPersonalInfoForm
                travelerPI={travelerPI}
                onSavePI={handleSaveTravelerPI}
                lang={language}
              />
            )}

            {showChangePasswordBox && (
              <form
                onSubmit={handleChangePassword}
                className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs"
              >
                <div className="border-b pb-2">
                  <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                    Account Security
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Change Your Dashboard Password
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentUser?.password && (
                    <div>
                      <label className="font-bold text-slate-700">Current Password *</label>
                      <input
                        type="password"
                        required
                        value={currentPasswordInput}
                        onChange={(e) => setCurrentPasswordInput(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700">New Password *</label>
                    <input
                      type="password"
                      required
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordBox(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold shadow"
                  >
                    {isSaving ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}

            {showUserProfileEditor && (
              <UserAndOwnerProfileSection
                profileData={currentUser || { role: currentRole }}
                label={roleLabelMap[currentRole]}
                onSave={handleSaveUserProfile}
                isSaving={isSaving}
                showProviderExtras={[
                  'graduate',
                  'agency',
                  'tour_company',
                  'car_rental'
                ].includes(currentRole)}
                onPublishPackage={handlePublishProviderPackage}
                onRemovePublishedPackage={handleRemovePublishedPackage}
              />
            )}

            {currentRole === 'traveler' && (
              <TravelerAvailabilityAndPackages
                subscribers={subscribers}
                publishedPackages={publishedPackages}
                currentUser={currentUser}
                travelerPI={travelerPI}
                onRequirePI={(item, type) => {
                  if (item) setPendingPiAction({ item, type });
                  setShowPiFormModal(true);
                }}
                onBookPackageOrProvider={handleBookPackageOrProvider}
                externalBookingItem={externalBookingItem}
                onClearExternalBookingItem={() => setExternalBookingItem(null)}
              />
            )}

            {(currentRole === 'traveler' || showBookingManagementPanel) && (
              <BookingMarketplace
                currentUser={currentUser}
                currentRole={currentRole}
                travelerPI={travelerPI}
                onOpenProfilePackages={() => setShowUserProfileEditor(true)}
                externalChatTarget={externalChatTarget}
                onClearExternalChatTarget={() => setExternalChatTarget(null)}
              />
            )}
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
                  onClick={() => setOwnerTab('all_roles')}
                  className={`px-4 py-2 rounded-xl ${
                    ownerTab === 'all_roles'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  🎭 All Roles ({subscribers.length})
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
                  👥 Users ({subscribers.length})
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
                  ⚙️ Server &amp; Password
                </button>
              </div>
            </div>

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

            {/* ALL ROLES MANAGEMENT TAB WITH DIRECT ROLE EDITING */}
            {ownerTab === 'all_roles' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      🎭 All Roles Management &amp; Role Editor
                    </h3>
                    <p className="text-slate-500">
                      Filter across every platform role and edit any user&apos;s role or profile immediately.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 font-bold">
                    {[
                      { id: 'all', label: `All (${subscribers.length})` },
                      { id: 'graduate', label: 'Guides' },
                      { id: 'agency', label: 'Agencies' },
                      { id: 'tour_company', label: 'Tour Cos.' },
                      { id: 'car_rental', label: 'Car Rentals' },
                      { id: 'traveler', label: 'Travelers' }
                    ].map((rt) => (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setAllRolesFilter(rt.id)}
                        className={`px-3 py-1.5 rounded-xl ${
                          allRolesFilter === rt.id
                            ? 'bg-[#234E40] text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRoleUsers.length === 0 ? (
                  <p className="text-slate-400 italic">No accounts in this role category.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredRoleUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 rounded-2xl border bg-slate-50 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-600">
                            {u.contact} • Current Role:{' '}
                            <strong>{roleLabelMap[u.role] || u.role}</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={u.role || 'graduate'}
                            onChange={(e) => handleOwnerUpdateUserRole(u.id, e.target.value)}
                            className="p-2 border rounded-xl bg-white font-bold text-slate-800"
                          >
                            <option value="graduate">Tourism Graduate / Guide</option>
                            <option value="agency">Travel Agency</option>
                            <option value="tour_company">Tour Company</option>
                            <option value="car_rental">Car Rentals Company</option>
                            <option value="traveler">Traveler / Visitor</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInspectedUser(u);
                              setOwnerTab('pending');
                            }}
                            className="px-3 py-2 bg-slate-800 text-white rounded-xl font-bold"
                          >
                            Inspect / Edit Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {ownerTab === 'pending' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      All Registered Users — Full Owner Access
                    </h3>
                    <p className="text-slate-500">
                      Click &quot;Inspect User&quot; to view or manage any user&apos;s full profile, Jobs/Packages to be booked, availability, experience &amp; qualifications.
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
                            <td className="py-3">
                              <select
                                value={sub.role || 'graduate'}
                                onChange={(e) =>
                                  handleOwnerUpdateUserRole(sub.id, e.target.value)
                                }
                                className="p-1.5 border rounded-lg bg-slate-50 font-semibold text-xs"
                              >
                                <option value="graduate">graduate</option>
                                <option value="agency">agency</option>
                                <option value="tour_company">tour_company</option>
                                <option value="car_rental">car_rental</option>
                                <option value="traveler">traveler</option>
                              </select>
                            </td>
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
                  <div className="p-5 rounded-2xl border-2 border-[#234E40] bg-emerald-50/40 space-y-4">
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
                            {selectedInspectedUser.email || 'N/A'} • Availability:{' '}
                            {selectedInspectedUser.availabilityStatus || 'Available Now'}
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

                    <UserAndOwnerProfileSection
                      profileData={selectedInspectedUser}
                      label={`Owner Editing: ${selectedInspectedUser.name}`}
                      isSaving={isSaving}
                      showProviderExtras={[
                        'graduate',
                        'agency',
                        'tour_company',
                        'car_rental'
                      ].includes(selectedInspectedUser.role)}
                      onSave={async (updatedUserProfile) => {
                        setIsSaving(true);
                        const merged = {
                          ...selectedInspectedUser,
                          ...updatedUserProfile,
                          updatedAt: new Date().toISOString()
                        };
                        setSelectedInspectedUser(merged);
                        setSubscribers((prev) =>
                          prev.map((item) => (item.id === merged.id ? merged : item))
                        );
                        await firestoreSaveDoc('subscribers', merged.id, merged);
                        setLastAutoUpdateAt(new Date());
                        setIsSaving(false);
                        alert(`✓ Saved changes for ${merged.name}!`);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {ownerTab === 'ads' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6 text-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    📢 Set Advertising for Paid Companies
                  </h3>
                  <p className="text-slate-500">
                    Create and toggle pop-up advertisements for paid partner companies. Clicking the ad CTA opens the booking form directly.
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
                      <option value="car_rental">Car Rentals Companies</option>
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
                showProviderExtras={false}
              />
            )}

            {ownerTab === 'server' && (
              <div className="space-y-6">
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
                    <div>
                      <label className="font-bold text-slate-700">Top Welcome Note</label>
                      <input
                        type="text"
                        value={appConfig.welcomeNote || 'WELCOME TO GUIDE LINK RWANDA'}
                        onChange={(e) =>
                          setAppConfig({ ...appConfig, welcomeNote: e.target.value })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
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

                {/* CHANGE OWNER PASSWORD ANYTIME */}
                <form
                  onSubmit={handleChangeOwnerPassword}
                  className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs"
                >
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                      Owner Security
                    </span>
                    <h3 className="font-bold text-base text-slate-900">
                      🔑 Change Owner Password Anytime
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700">Current Owner Password *</label>
                      <input
                        type="password"
                        required
                        value={ownerCurrentPassInput}
                        onChange={(e) => setOwnerCurrentPassInput(e.target.value)}
                        placeholder="Enter current owner password"
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">New Owner Password *</label>
                      <input
                        type="password"
                        required
                        value={ownerNewPassInput}
                        onChange={(e) => setOwnerNewPassInput(e.target.value)}
                        placeholder="Enter new owner password"
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Confirm New Password *</label>
                      <input
                        type="password"
                        required
                        value={ownerConfirmPassInput}
                        onChange={(e) => setOwnerConfirmPassInput(e.target.value)}
                        placeholder="Re-enter new owner password"
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-[#234E40] text-white rounded-xl font-bold shadow"
                  >
                    {isSaving ? 'Updating Password...' : 'Update Owner Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* TRAVELER PERSONAL INFO (PI) MODAL */}
      {showPiFormModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-auto">
            <TravelerPersonalInfoForm
              travelerPI={travelerPI}
              onSavePI={handleSaveTravelerPI}
              onCancel={() => {
                setPendingPiAction(null);
                setShowPiFormModal(false);
              }}
              lang={language}
            />
          </div>
        </div>
      )}

      {/* POP-UP SPONSORED AD MODAL (CLICKS DIRECTLY TO BOOKING FORM) */}
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
                onClick={() => handleBookFromAd(activePopupAd)}
                className="px-4 py-2 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold shadow"
              >
                {activePopupAd.ctaLabel || 'Book Now'} →
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
