import React, { useState, useEffect } from 'react';

// =========================================================================
// FIREBASE CONFIGURATION & REST HELPERS
// =========================================================================
const FIREBASE_PROJECT_ID = 'guidelink-rwanda';
const FIREBASE_API_KEY = 'YOUR_FIREBASE_API_KEY';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Converts a JavaScript value into a Firestore REST API typed value object.
 * Supports primitives, arrays, maps, and null/undefined safely.
 */
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    Object.keys(val).forEach((k) => {
      if (val[k] !== undefined) {
        fields[k] = toFirestoreValue(val[k]);
      }
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Converts a Firestore REST API typed value back into a standard JavaScript value.
 */
function fromFirestoreValue(fsVal) {
  if (!fsVal || typeof fsVal !== 'object') return null;
  if ('stringValue' in fsVal) return fsVal.stringValue;
  if ('booleanValue' in fsVal) return fsVal.booleanValue;
  if ('integerValue' in fsVal) return Number(fsVal.integerValue);
  if ('doubleValue' in fsVal) return Number(fsVal.doubleValue);
  if ('nullValue' in fsVal) return null;
  if ('arrayValue' in fsVal) {
    const vals = fsVal.arrayValue?.values || [];
    return vals.map((v) => fromFirestoreValue(v));
  }
  if ('mapValue' in fsVal) {
    const mapFields = fsVal.mapValue?.fields || {};
    const obj = {};
    Object.keys(mapFields).forEach((k) => {
      obj[k] = fromFirestoreValue(mapFields[k]);
    });
    return obj;
  }
  return null;
}

/**
 * Parses a Firestore REST document resource into a flat object with its document ID.
 */
function parseFirestoreDoc(doc) {
  if (!doc || !doc.name) return null;
  const parts = doc.name.split('/');
  const id = parts[parts.length - 1];
  const fields = doc.fields || {};
  const data = { id };
  Object.keys(fields).forEach((k) => {
    data[k] = fromFirestoreValue(fields[k]);
  });
  return data;
}

/**
 * Fetches documents from a Firestore collection via REST with error resilience.
 */
async function firestoreGetCollection(collectionName) {
  try {
    const url = `${FIRESTORE_BASE}/${encodeURIComponent(collectionName)}?pageSize=200&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const docs = json.documents || [];
    return docs.map(parseFirestoreDoc).filter(Boolean);
  } catch (err) {
    console.warn(`Firestore read error (${collectionName}):`, err);
    return [];
  }
}

/**
 * Creates or updates a Firestore document using PATCH.
 */
async function firestoreSaveDoc(collectionName, docId, dataObj) {
  try {
    const cleanId = String(docId || `doc_${Date.now()}`);
    const payloadObj = { ...dataObj, id: cleanId };
    const fields = {};
    Object.keys(payloadObj).forEach((k) => {
      if (payloadObj[k] !== undefined) {
        fields[k] = toFirestoreValue(payloadObj[k]);
      }
    });
    const url = `${FIRESTORE_BASE}/${encodeURIComponent(collectionName)}/${encodeURIComponent(cleanId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (err) {
    console.warn(`Firestore write error (${collectionName}/${docId}):`, err);
    return false;
  }
}

/**
 * Deletes a document from Firestore via REST.
 */
async function firestoreDeleteDoc(collectionName, docId) {
  try {
    const url = `${FIRESTORE_BASE}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn(`Firestore delete error (${collectionName}/${docId}):`, err);
    return false;
  }
}

/**
 * Classifies a booking or job item into 'confirmed', 'active', or 'pending' movement buckets.
 */
function classifyBookingBucket(booking) {
  if (!booking) return 'pending';
  if (booking.status === 'taken' || booking.movementStage === 'confirmed') return 'confirmed';
  if (booking.movementStage === 'active') return 'active';
  if (Array.isArray(booking.applicants) && booking.applicants.length > 0) return 'active';
  return 'pending';
}

// =========================================================================
// DEFAULT CONFIG, PLANS & MULTI-LANGUAGE UI DICTIONARY
// =========================================================================
const DEFAULT_APP_SERVER_CONFIG = {
  appName: 'GuideLink Rwanda',
  welcomeNote: 'WELCOME TO GUIDE LINK RWANDA',
  tagline: 'Connecting Travelers, Guides, Consultants, Agencies, Tour Companies & Car Rentals Across Rwanda',
  heroBadgeText: 'Rwanda Tourism, Booking & Job Network',
  subtitle:
    'Discover verified tour packages, experienced guides & tourism consultants, tour operators, travel agencies, and car rental fleets across Kigali, Volcanoes, Nyungwe, Akagera, and Lake Kivu.',
  welcomeBannerText:
    'Live created bookings auto-scroll below • Partners are ready to serve • Fill out your Personal Info (PI) as a Traveler to unlock the full dashboard!',
  travelerFreeBadge: '🌍 Travelers: Free PI & Full Dashboard',
  primaryColor: '#234E40',
  accentColor: '#3B6E5B',
  momoCode: '*182*8*1*123456#',
  ownerPassword: 'FYP$2026',
  footerLocation: 'Kigali • Kitabi • Rusizi, Rwanda',
  footerLeadershipText:
    'RUTUNGURA Bonheur (C.E.O & Developer) • IRANZI Honorine (MD & Project Assistant)',
  roleCardsCustom: {
    graduate: {
      title: 'Tourism Graduates / Guides / Consultants',
      desc: 'Receive jobs automatically, showcase availability & credentials, and manage bookings.'
    },
    agency: {
      title: 'Travel Agencies',
      desc: 'Create bookings or post jobs to all graduates/guides/consultants and manage trips.'
    },
    tour_company: {
      title: 'Tour Companies',
      desc: 'Publish tour packages & bookings, hire guides/consultants, and coordinate tours.'
    },
    car_rental: {
      title: 'Car Rentals Companies',
      desc: 'List 4x4 & safari vehicles, accept bookings, and coordinate transport.'
    },
    traveler: {
      title: 'Traveler / Visitor',
      desc: 'Fill out Personal Info (PI) once to unlock the full dashboard, bookings & partners.'
    }
  },
  allowNewSignups: true,
  maintenanceMode: false,
  maintenanceMessage: 'GuideLink Rwanda is undergoing scheduled maintenance. Please check back shortly.',
  ownerProfile: {
    photoUrl: '',
    name: 'RUTUNGURA Bonheur',
    title: 'Founder & C.E.O., GuideLink Rwanda',
    contact: '+250780558555',
    email: 'rutungurab5@gmail.com',
    bio: 'Tourism & travel professional connecting Rwanda tourism graduates, consultants, agencies, tour companies, car rentals, and travelers.',
    servicesProvided: ['Platform Operations', 'Tourism Partnerships', 'Booking & Job Coordination'],
    experiences: [],
    qualifications: []
  },
  announcements: [],
  ads: [],
  welcomeCustomFeatures: [],
  appCustomFeatures: []
};

const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    id: 'weekly',
    name: 'Weekly Pass',
    durationLabel: '7 Days Access',
    days: 7,
    price: 5000,
    badge: 'Starter',
    order: 1
  },
  {
    id: 'monthly',
    name: 'Monthly Pro',
    durationLabel: '30 Days Full Access',
    days: 30,
    price: 15000,
    badge: 'Most Popular',
    order: 2
  },
  {
    id: 'quarterly',
    name: 'Quarterly Plan',
    durationLabel: '90 Days Access',
    days: 90,
    price: 38000,
    badge: 'Save 15%',
    order: 3
  },
  {
    id: 'annual',
    name: 'Annual Partner',
    durationLabel: '365 Days Access',
    days: 365,
    price: 120000,
    badge: 'Best Value',
    order: 4
  }
];

const UI_TRANSLATIONS = {
  ENG: {
    welcomeNoteTop: 'WELCOME TO GUIDE LINK RWANDA',
    heroBadge: 'Rwanda Tourism, Booking & Job Network',
    graduateTitle: 'Tourism Graduates / Guides / Consultants',
    graduateDesc: 'Receive jobs automatically, showcase availability & credentials, and manage bookings.',
    agencyTitle: 'Travel Agencies',
    agencyDesc: 'Create bookings or post jobs to all graduates/guides/consultants and manage trips.',
    tourCompanyTitle: 'Tour Companies',
    tourCompanyDesc: 'Publish tour packages & bookings, hire guides/consultants, and coordinate tours.',
    carRentalTitle: 'Car Rentals Companies',
    carRentalDesc: 'List 4x4 & safari vehicles, accept bookings, and coordinate transport.',
    travelerTitle: 'Traveler / Visitor',
    travelerDesc: 'Fill out Personal Info (PI) once to unlock the full dashboard, bookings & partners.',
    enterPortal: 'Enter Portal',
    switchPortal: 'Welcome Tab',
    ownerBtn: 'Owner',
    signOutBtn: 'Sign Out',
    createBookingsPostJobsBtn: 'Create Bookings / Post Jobs',
    piRequiredTitle: 'Complete Your Personal Information (PI) to Unlock Full Dashboard',
    piRequiredDesc:
      'Enter your details below. Once submitted, you will immediately access the full Traveler Dashboard with all created bookings, partners, and private chat.',
    savePiBtn: 'Submit PI & Unlock Dashboard',
    travelersOnWelcomeTitle: 'Travelers & Tourists Who Completed PI',
    travelersOnWelcomeSub: 'Visitors registered with Personal Information (PI) on the platform.'
  },
  KINY: {
    welcomeNoteTop: 'MURAKAZA NEZA KURI GUIDE LINK RWANDA',
    heroBadge: 'Urubuga rw’Ubukerarugendo, Gusaba Serivisi n’Imirimo mu Rwanda',
    graduateTitle: 'Abize Ubukerarugendo / Abayobora Ba Mukerarugendo / Abajyanama',
    graduateDesc: 'Kira imirimo yoherezwa ako kanya, agaragaza igihe ubonekera, kandi ucunge ubusabe.',
    agencyTitle: 'Amashyirahamwe / Ibigo by’Ingendo (Travel Agencies)',
    agencyDesc: 'Hanga ubusabe bwo gutembera cyangwa tanga akazi ku banyeshuri/abayobora/abajyanama bose.',
    tourCompanyTitle: 'Ibigo Bitwara Ba Mukerarugendo (Tour Companies)',
    tourCompanyDesc: 'Shyira hanze amateka y’ingendo, tanga akazi, kandi utunganye ingendo.',
    carRentalTitle: 'Ibigo Bikodesha Imodoka (Car Rentals)',
    carRentalDesc: 'Erekana imodoka za 4x4 n’iz’ubukerarugendo kandi wakire ubusabe.',
    travelerTitle: 'Mukerarugendo / Umugenzi',
    travelerDesc: 'Uzuza amakuru yawe bwite (PI) maze uhite ubona Dashboard yose y’ubukerarugendo.',
    enterPortal: 'Injira',
    switchPortal: 'Urubuga rwa Mariza',
    ownerBtn: 'Nyir’Urubuga',
    signOutBtn: 'Sohoka',
    createBookingsPostJobsBtn: 'Hanga Ubusabe / Tanga Akazi',
    piRequiredTitle: 'Uzuza Amakuru Yawe Bwite (PI) Kugira Ngo Ufungure Dashboard Yose',
    piRequiredDesc:
      'Uzuza umwirondoro wawe hasi. Nyuma yo kubyohereza, urahita ubona Dashboard yose irimo ubusabe bwose n’abafatanyabikorwa.',
    savePiBtn: 'Ohereza PI & Fungura Dashboard',
    travelersOnWelcomeTitle: 'Ba Mukerarugendo Bujuje PI',
    travelersOnWelcomeSub: 'Abashyitsi bujuje umwirondoro wabo (PI) ku rubuga.'
  },
  FRA: {
    welcomeNoteTop: 'BIENVENUE SUR GUIDE LINK RWANDA',
    heroBadge: 'Réseau Tourisme, Réservations & Emplois au Rwanda',
    graduateTitle: 'Diplômés Tourisme / Guides / Consultants',
    graduateDesc: 'Recevez des offres automatiquement, gérez votre disponibilité et vos réservations.',
    agencyTitle: 'Agences de Voyage',
    agencyDesc: 'Créez des réservations ou publiez des offres pour tous les diplômés/guides/consultants.',
    tourCompanyTitle: 'Entreprises d’Excursion (Tour Companies)',
    tourCompanyDesc: 'Publiez des circuits, recrutez des guides/consultants et gérez vos départs.',
    carRentalTitle: 'Location de Véhicules (Car Rentals)',
    carRentalDesc: 'Proposez vos 4x4 et véhicules safari et recevez des demandes de réservation.',
    travelerTitle: 'Voyageur / Visiteur',
    travelerDesc: 'Renseignez vos informations personnelles (PI) pour débloquer tout le tableau de bord.',
    enterPortal: 'Accéder',
    switchPortal: 'Accueil',
    ownerBtn: 'Propriétaire',
    signOutBtn: 'Déconnexion',
    createBookingsPostJobsBtn: 'Créer Réservation / Publier Offre',
    piRequiredTitle: 'Complétez Vos Informations Personnelles (PI) Pour Débloquer le Tableau de Bord',
    piRequiredDesc:
      'Remplissez vos informations ci-dessous pour accéder immédiatement au tableau de bord complet des voyageurs.',
    savePiBtn: 'Valider PI & Ouvrir le Tableau de Bord',
    travelersOnWelcomeTitle: 'Voyageurs Ayant Complété leur PI',
    travelersOnWelcomeSub: 'Visiteurs enregistrés avec leurs informations personnelles (PI).'
  },
  KISW: {
    welcomeNoteTop: 'KARIBU GUIDE LINK RWANDA',
    heroBadge: 'Mtandao wa Utalii, Uhifadhi na Kazi Rwanda',
    graduateTitle: 'Wahitimu wa Utalii / Waongoza Watalii / Washauri',
    graduateDesc: 'Pokea kazi moja kwa moja, onyesha upatikanaji wako, na dhibiti maombi.',
    agencyTitle: 'Wakala wa Usafiri (Travel Agencies)',
    agencyDesc: 'Unda nafasi za kuhifadhi au tangaza kazi kwa wahitimu, waongoza watalii na washauri wote.',
    tourCompanyTitle: 'Kampuni za Ziara (Tour Companies)',
    tourCompanyDesc: 'Chapisha vifurushi vya utalii, ajiri waongoza watalii, na panga safari.',
    carRentalTitle: 'Kampuni za Kukodisha Magari (Car Rentals)',
    carRentalDesc: 'Onyesha magari ya 4x4 na safari na upokee maombi ya kuhifadhi.',
    travelerTitle: 'Msafiri / Mgeni',
    travelerDesc: 'Jaza Taarifa Binafsi (PI) ili kufungua dashibodi kamili ya msafiri.',
    enterPortal: 'Ingia',
    switchPortal: 'Ukurasa wa Mwanzo',
    ownerBtn: 'Mmiliki',
    signOutBtn: 'Toka',
    createBookingsPostJobsBtn: 'Unda Uhifadhi / Tangaza Kazi',
    piRequiredTitle: 'Jaza Taarifa Zako Binafsi (PI) Kufungua Dashibodi Kamili',
    piRequiredDesc:
      'Jaza taarifa zako hapa chini ili kufungua dashibodi kamili yenye nafasi zote za kuhifadhi na washirika.',
    savePiBtn: 'Wasilisha PI & Fungua Dashibodi',
    travelersOnWelcomeTitle: 'Wasafiri Waliokamilisha PI',
    travelersOnWelcomeSub: 'Wageni walioweka taarifa zao binafsi (PI) kwenye mfumo.'
  }
};

// =========================================================================
// REUSABLE NON-BLOCKING STATUS BANNER COMPONENT
// =========================================================================
function StatusBanner({ banner, onDismiss }) {
  if (!banner) return null;
  const toneClasses =
    banner.type === 'error'
      ? 'bg-red-50 border-red-300 text-red-900'
      : banner.type === 'warning'
      ? 'bg-amber-50 border-amber-300 text-amber-950'
      : 'bg-emerald-50 border-emerald-300 text-emerald-950';

  return (
    <div
      role="status"
      className={`border rounded-2xl px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 shadow-sm ${toneClasses}`}
    >
      <span>{banner.message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/15 font-bold text-[11px] shrink-0"
        >
          Dismiss ✕
        </button>
      )}
    </div>
  );
}

// =========================================================================
// CUSTOM FEATURES DISPLAY FOR APP DASHBOARDS / ROLES
// =========================================================================
function RoleCustomFeaturesSection({ features = [], currentRole = 'all', onTriggerFeature }) {
  const matching = (features || []).filter(
    (f) => f && f.active !== false && (!f.targetRole || f.targetRole === 'all' || f.targetRole === currentRole)
  );
  if (matching.length === 0) return null;

  return (
    <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3 text-xs">
      <div className="border-b pb-2">
        <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
          ✨ Owner Added App Features
        </span>
        <h4 className="font-black text-sm text-slate-900">
          Custom Platform Features ({matching.length})
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {matching.map((feat) => (
          <div
            key={feat.id}
            className="p-4 rounded-2xl border bg-emerald-50/40 flex flex-col justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base">{feat.icon || '✨'}</span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2 py-0.5 rounded-full">
                  {feat.badge || 'New Feature'}
                </span>
              </div>
              <h5 className="font-extrabold text-sm text-slate-900">{feat.title}</h5>
              {feat.description && <p className="text-slate-600">{feat.description}</p>}
            </div>
            {feat.ctaLabel && (
              <button
                type="button"
                onClick={() => onTriggerFeature && onTriggerFeature(feat)}
                className="self-start px-3.5 py-1.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold transition"
              >
                {feat.ctaLabel} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// OWNER FEATURE BUILDER (WELCOMING PAGE FEATURES & APP FEATURES)
// =========================================================================
function OwnerCustomFeaturesManager({
  welcomeFeatures = [],
  appFeatures = [],
  onSaveFeatures,
  isSaving,
  onNotify
}) {
  const [scope, setScope] = useState('welcome'); // 'welcome' | 'app'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    icon: '✨',
    badge: 'New Feature',
    title: '',
    description: '',
    ctaLabel: 'Open Feature',
    actionType: 'role_traveler', // 'role_traveler' | 'role_graduate' | 'role_agency' | 'role_tour_company' | 'role_car_rental' | 'open_pi' | 'url'
    actionTarget: '',
    targetRole: 'all',
    active: true
  });

  const resetForm = (nextScope = scope) => {
    setEditingId(null);
    setForm({
      icon: '✨',
      badge: nextScope === 'welcome' ? 'Welcome Feature' : 'App Feature',
      title: '',
      description: '',
      ctaLabel: 'Open Feature',
      actionType: 'role_traveler',
      actionTarget: '',
      targetRole: 'all',
      active: true
    });
  };

  const currentList = scope === 'welcome' ? welcomeFeatures : appFeatures;

  const handleEdit = (feat, targetScope) => {
    setScope(targetScope);
    setEditingId(feat.id);
    setForm({
      icon: feat.icon || '✨',
      badge: feat.badge || 'Feature',
      title: feat.title || '',
      description: feat.description || '',
      ctaLabel: feat.ctaLabel || 'Open Feature',
      actionType: feat.actionType || 'role_traveler',
      actionTarget: feat.actionTarget || '',
      targetRole: feat.targetRole || 'all',
      active: feat.active !== false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      onNotify && onNotify('warning', 'Please enter a Feature Title.');
      return;
    }

    const featureObj = {
      id: editingId || `feat-${Date.now()}`,
      icon: form.icon.trim() || '✨',
      badge: form.badge.trim() || (scope === 'welcome' ? 'Welcome Feature' : 'App Feature'),
      title: form.title.trim(),
      description: form.description.trim(),
      ctaLabel: form.ctaLabel.trim() || 'Open',
      actionType: form.actionType,
      actionTarget: form.actionTarget.trim(),
      targetRole: scope === 'app' ? form.targetRole : 'all',
      active: Boolean(form.active),
      updatedAt: new Date().toISOString()
    };

    const nextWelcome =
      scope === 'welcome'
        ? editingId
          ? welcomeFeatures.map((f) => (f.id === editingId ? featureObj : f))
          : [featureObj, ...welcomeFeatures]
        : welcomeFeatures;

    const nextApp =
      scope === 'app'
        ? editingId
          ? appFeatures.map((f) => (f.id === editingId ? featureObj : f))
          : [featureObj, ...appFeatures]
        : appFeatures;

    await onSaveFeatures(nextWelcome, nextApp);
    resetForm(scope);
    onNotify &&
      onNotify(
        'success',
        `${editingId ? 'Updated' : 'Added'} ${
          scope === 'welcome' ? 'Welcoming Page' : 'App'
        } feature "${featureObj.title}".`
      );
  };

  const handleToggle = async (featId, targetScope) => {
    const nextWelcome =
      targetScope === 'welcome'
        ? welcomeFeatures.map((f) => (f.id === featId ? { ...f, active: f.active === false ? true : !f.active } : f))
        : welcomeFeatures;
    const nextApp =
      targetScope === 'app'
        ? appFeatures.map((f) => (f.id === featId ? { ...f, active: f.active === false ? true : !f.active } : f))
        : appFeatures;
    await onSaveFeatures(nextWelcome, nextApp);
  };

  const handleDelete = async (featId, targetScope) => {
    const nextWelcome =
      targetScope === 'welcome' ? welcomeFeatures.filter((f) => f.id !== featId) : welcomeFeatures;
    const nextApp =
      targetScope === 'app' ? appFeatures.filter((f) => f.id !== featId) : appFeatures;
    if (editingId === featId) resetForm(targetScope);
    await onSaveFeatures(nextWelcome, nextApp);
    onNotify && onNotify('success', 'Feature removed.');
  };

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
            🧩 Owner Feature Builder
          </span>
          <h3 className="font-bold text-base text-slate-900 mt-1">
            Add, Change &amp; Edit Features on Welcoming Page &amp; In the App
          </h3>
          <p className="text-slate-500">
            Create new feature cards or edit existing ones for the Welcoming Page or any App role dashboard.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl font-bold">
          <button
            type="button"
            onClick={() => {
              setScope('welcome');
              resetForm('welcome');
            }}
            className={`px-3.5 py-1.5 rounded-lg ${
              scope === 'welcome' ? 'bg-[#234E40] text-white' : 'text-slate-700'
            }`}
          >
            Welcoming Page ({welcomeFeatures.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('app');
              resetForm('app');
            }}
            className={`px-3.5 py-1.5 rounded-lg ${
              scope === 'app' ? 'bg-[#234E40] text-white' : 'text-slate-700'
            }`}
          >
            In the App ({appFeatures.length})
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-2xl border space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-sm text-slate-900">
            {editingId ? '✏️ Edit Feature' : '+ Add New Feature'} (
            {scope === 'welcome' ? 'Welcoming Page' : 'In the App'})
          </p>
          {editingId && (
            <button
              type="button"
              onClick={() => resetForm(scope)}
              className="text-slate-600 hover:underline font-bold"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="font-bold text-slate-700">Icon / Emoji</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="✨"
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">Badge Label</label>
            <input
              type="text"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              placeholder="New Feature"
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-bold text-slate-700">Feature Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Custom Safari & Guide Request"
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="font-bold text-slate-700">Feature Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what this feature offers..."
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">Button Text</label>
            <input
              type="text"
              value={form.ctaLabel}
              onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
              placeholder="Open Feature"
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-slate-700">When Clicked</label>
            <select
              value={form.actionType}
              onChange={(e) => setForm({ ...form, actionType: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
            >
              <option value="role_traveler">Open Traveler Dashboard</option>
              <option value="open_pi">Open Traveler PI Form</option>
              <option value="role_graduate">Open Graduates / Guides Portal</option>
              <option value="role_agency">Open Travel Agencies Portal</option>
              <option value="role_tour_company">Open Tour Companies Portal</option>
              <option value="role_car_rental">Open Car Rentals Portal</option>
              <option value="url">Open External Link (URL)</option>
            </select>
          </div>

          {form.actionType === 'url' ? (
            <div>
              <label className="font-bold text-slate-700">Destination URL</label>
              <input
                type="text"
                value={form.actionTarget}
                onChange={(e) => setForm({ ...form, actionTarget: e.target.value })}
                placeholder="https://example.com"
                className="w-full mt-1 p-2.5 border rounded-xl bg-white"
              />
            </div>
          ) : (
            <div>
              <label className="font-bold text-slate-700">Optional Note / Target</label>
              <input
                type="text"
                value={form.actionTarget}
                onChange={(e) => setForm({ ...form, actionTarget: e.target.value })}
                placeholder="Optional note or tag"
                className="w-full mt-1 p-2.5 border rounded-xl bg-white"
              />
            </div>
          )}

          {scope === 'app' ? (
            <div>
              <label className="font-bold text-slate-700">Visible To Role</label>
              <select
                value={form.targetRole}
                onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
              >
                <option value="all">All Roles</option>
                <option value="traveler">Traveler / Visitor</option>
                <option value="graduate">Tourism Graduates / Guides / Consultants</option>
                <option value="agency">Travel Agencies</option>
                <option value="tour_company">Tour Companies</option>
                <option value="car_rental">Car Rentals Companies</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.active)}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span>Active on Welcoming Page</span>
              </label>
            </div>
          )}
        </div>

        {scope === 'app' && (
          <div className="pt-1">
            <label className="inline-flex items-center gap-2 font-bold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.active)}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span>Active in App</span>
            </label>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
          >
            {isSaving ? 'Saving...' : editingId ? 'Save Feature Changes' : '+ Add Feature'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'welcome', label: 'Welcoming Page Features', list: welcomeFeatures },
          { key: 'app', label: 'In-App Features', list: appFeatures }
        ].map((group) => (
          <div key={group.key} className="space-y-2.5">
            <h4 className="font-extrabold text-sm text-slate-900">
              {group.label} ({group.list.length})
            </h4>
            {group.list.length === 0 ? (
              <p className="text-slate-400 italic">No custom features added yet.</p>
            ) : (
              group.list.map((feat) => (
                <div
                  key={feat.id}
                  className="p-3.5 rounded-2xl border bg-slate-50 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{feat.icon || '✨'}</span>
                      <span className="font-extrabold text-slate-900">{feat.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          feat.active !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {feat.active !== false ? 'Active' : 'Hidden'}
                      </span>
                      {group.key === 'app' && (
                        <span className="text-[10px] font-bold bg-white border px-2 py-0.5 rounded-full text-slate-600">
                          {feat.targetRole || 'all'}
                        </span>
                      )}
                    </div>
                    {feat.description && <p className="text-slate-600">{feat.description}</p>}
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(feat, group.key)}
                      className="px-2.5 py-1 bg-slate-800 text-white rounded-lg font-bold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(feat.id, group.key)}
                      className="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-bold"
                    >
                      {feat.active !== false ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(feat.id, group.key)}
                      className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// WELCOME TAB: AUTO-SCROLLING CREATED BOOKINGS FEED
// =========================================================================
function WelcomeAutoScrollingBookings({
  publishedPackages = [],
  allBookings = [],
  onSelectBookingOffer
}) {
  const [isPaused, setIsPaused] = useState(false);

  const packageCards = (publishedPackages || []).map((pkg) => ({
    id: pkg.id || pkg.title,
    kind: 'package',
    category: pkg.category || 'Booking Offer',
    title: pkg.title,
    destination: pkg.destination || 'Rwanda',
    priceLabel: pkg.priceLabel || 'Negotiable',
    providerName: pkg.providerName || 'Partner',
    durationDays: pkg.durationDays || 1,
    photoUrl: pkg.photoUrl || (Array.isArray(pkg.photos) && pkg.photos[0]) || '',
    rawItem: pkg
  }));

  const bookingCards = (allBookings || [])
    .filter((b) => !b.isJobPost)
    .map((b) => ({
      id: b.id,
      kind: 'booking',
      category: 'Created Booking',
      title: b.title,
      destination: b.destination || 'Rwanda',
      priceLabel: b.budgetRwf || 'Negotiable',
      providerName: b.ownerName || 'Member',
      durationDays: b.durationDays || 1,
      photoUrl: b.photoUrl || (Array.isArray(b.photos) && b.photos[0]) || '',
      rawItem: b
    }));

  const combinedItems = Array.from(
    new Map([...packageCards, ...bookingCards].map((item) => [item.id, item])).values()
  );

  const marqueeItems = combinedItems.length > 0 ? [...combinedItems, ...combinedItems] : [];

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 overflow-hidden">
      <style>{`
        @keyframes glMarqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .gl-marquee-track {
          display: flex;
          width: max-content;
          animation: glMarqueeScroll 28s linear infinite;
        }
        .gl-marquee-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
            🔄 Auto-Scrolling Live Feed • Welcome Tab
          </span>
          <h3 className="text-base md:text-lg font-black text-slate-900 mt-1">
            🧳 All Created Bookings ({combinedItems.length})
          </h3>
          <p className="text-xs text-slate-500">
            All created bookings scroll automatically here. Hover or click Pause to inspect, or click any booking to proceed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
        >
          {isPaused ? '▶ Resume Auto-Scroll' : '⏸ Pause Scroll'}
        </button>
      </div>

      {combinedItems.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">
          No created bookings yet. Once a booking is created, it automatically appears and scrolls on the Welcome tab.
        </p>
      ) : (
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className={`gl-marquee-track gap-4 ${isPaused ? 'paused' : ''}`}>
            {marqueeItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => onSelectBookingOffer && onSelectBookingOffer(item)}
                className="w-72 shrink-0 p-4 rounded-2xl border bg-slate-50 hover:bg-emerald-50/50 hover:border-[#234E40] cursor-pointer transition flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-2">
                  {item.photoUrl && (
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      className="w-full h-32 object-cover rounded-xl border"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2 py-0.5 rounded-full">
                      📍 {item.destination}
                    </span>
                    <span className="font-black text-[#234E40]">{item.priceLabel}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    By <strong>{item.providerName}</strong> • {item.durationDays} Day(s)
                  </p>
                </div>

                <span className="text-[11px] font-extrabold text-[#234E40]">
                  View / Book →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// WELCOME TAB: PARTNERS SHOWCASE
// =========================================================================
function WelcomePartnersShowcase({ subscribers = [], onSelectPartner }) {
  const partners = subscribers.filter((s) =>
    ['graduate', 'agency', 'tour_company', 'car_rental'].includes((s.role || '').toLowerCase())
  );

  const roleBadgeMap = {
    graduate: '🎓 Graduate / Guide / Consultant',
    agency: '✈️ Travel Agency',
    tour_company: '🚐 Tour Company',
    car_rental: '🚗 Car Rental'
  };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
            🤝 Verified Tourism Network
          </span>
          <h3 className="text-base md:text-lg font-black text-slate-900">
            Partners on GuideLink Rwanda ({partners.length})
          </h3>
          <p className="text-slate-500">
            Connect with tourism graduates, guides, consultants, travel agencies, tour companies, and car rental partners.
          </p>
        </div>
      </div>

      {partners.length === 0 ? (
        <p className="text-slate-400 italic">
          Partner profiles will appear here as guides, consultants, agencies, tour companies, and car rentals join.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {partner.photoUrl ? (
                    <img
                      src={partner.photoUrl}
                      alt={partner.name}
                      className="w-12 h-12 rounded-xl object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#234E40] font-black flex items-center justify-center text-base">
                      {(partner.name || 'P').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{partner.name}</h4>
                    <span className="inline-block text-[10px] font-bold text-[#3B6E5B]">
                      {roleBadgeMap[partner.role] || partner.role}
                    </span>
                  </div>
                </div>

                {partner.bio && <p className="text-slate-600 line-clamp-2">{partner.bio}</p>}

                <p className="text-[11px] font-semibold text-emerald-800">
                  {partner.availabilityStatus || '🟢 Available Now'}
                </p>
              </div>

              {onSelectPartner && (
                <button
                  type="button"
                  onClick={() => onSelectPartner(partner)}
                  className="w-full py-2 bg-[#3B6E5B] hover:bg-[#234E40] text-white font-bold rounded-xl transition"
                >
                  Book / Contact Partner →
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
// OWNER ALL BOOKINGS & JOBS MOVEMENT TRACKER (PENDING / ACTIVE / CONFIRMED)
// =========================================================================
function OwnerBookingsAndJobsTracker({
  allBookings = [],
  publishedPackages = [],
  onMoveBookingStage,
  onDeleteBooking,
  onDeletePackage,
  onOpenChatWithBookingParty
}) {
  const [stageFilter, setStageFilter] = useState('all');

  const pendingList = allBookings.filter((b) => classifyBookingBucket(b) === 'pending');
  const activeList = allBookings.filter((b) => classifyBookingBucket(b) === 'active');
  const confirmedList = allBookings.filter((b) => classifyBookingBucket(b) === 'confirmed');

  const visibleBookings = allBookings.filter((b) => {
    const stage = classifyBookingBucket(b);
    if (stageFilter === 'pending') return stage === 'pending';
    if (stageFilter === 'active') return stage === 'active';
    if (stageFilter === 'confirmed') return stage === 'confirmed';
    return true;
  });

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full">
              👑 Owner Full Visibility • Bookings &amp; Jobs Movement
            </span>
            <h3 className="text-base md:text-lg font-black text-slate-900 mt-1">
              All Bookings &amp; Job Movement Tracker ({allBookings.length})
            </h3>
            <p className="text-slate-500">
              Monitor every booking and job request across <strong>Pending</strong>,{' '}
              <strong>Active</strong>, and <strong>Confirmed</strong> stages and move any item between stages.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => setStageFilter(stageFilter === 'pending' ? 'all' : 'pending')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
              stageFilter === 'pending'
                ? 'bg-amber-50 border-amber-500'
                : 'bg-slate-50 border-amber-200 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase text-[10px] bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full">
                ⏳ Pending Movement
              </span>
              <span className="text-xl font-black text-amber-950">{pendingList.length}</span>
            </div>
            <p className="text-slate-600 mt-1">Awaiting provider or graduate response.</p>
          </div>

          <div
            onClick={() => setStageFilter(stageFilter === 'active' ? 'all' : 'active')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
              stageFilter === 'active'
                ? 'bg-sky-50 border-sky-600'
                : 'bg-slate-50 border-sky-200 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase text-[10px] bg-sky-100 text-sky-900 px-2.5 py-0.5 rounded-full">
                ⚡ Active Movement
              </span>
              <span className="text-xl font-black text-sky-900">{activeList.length}</span>
            </div>
            <p className="text-slate-600 mt-1">Graduates/partners responding or negotiating.</p>
          </div>

          <div
            onClick={() => setStageFilter(stageFilter === 'confirmed' ? 'all' : 'confirmed')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
              stageFilter === 'confirmed'
                ? 'bg-emerald-50 border-emerald-600'
                : 'bg-slate-50 border-emerald-200 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full">
                ✅ Confirmed
              </span>
              <span className="text-xl font-black text-emerald-900">{confirmedList.length}</span>
            </div>
            <p className="text-slate-600 mt-1">Confirmed and locked in with assigned partner.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 font-bold">
          {[
            { id: 'all', label: `All (${allBookings.length})` },
            { id: 'pending', label: `⏳ Pending (${pendingList.length})` },
            { id: 'active', label: `⚡ Active (${activeList.length})` },
            { id: 'confirmed', label: `✅ Confirmed (${confirmedList.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStageFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition ${
                stageFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {visibleBookings.length === 0 ? (
          <p className="text-slate-400 italic py-4">
            No bookings or job requests in this movement stage.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map((b) => {
              const stage = classifyBookingBucket(b);
              const applicantsCount = Array.isArray(b.applicants) ? b.applicants.length : 0;

              return (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border bg-slate-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          stage === 'confirmed'
                            ? 'bg-emerald-600 text-white'
                            : stage === 'active'
                            ? 'bg-sky-600 text-white'
                            : 'bg-amber-200 text-amber-950'
                        }`}
                      >
                        {stage === 'confirmed'
                          ? '✅ Confirmed'
                          : stage === 'active'
                          ? '⚡ Active'
                          : '⏳ Pending'}
                      </span>

                      {b.isJobPost && (
                        <span className="text-[10px] font-extrabold uppercase bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full">
                          🎓 Job for All Graduates / Guides / Consultants
                        </span>
                      )}

                      <span className="text-[10px] font-bold bg-white border px-2 py-0.5 rounded-full text-slate-700">
                        📍 {b.destination || 'Rwanda'}
                      </span>

                      <span className="text-[10px] font-bold text-[#234E40]">
                        {b.budgetRwf || 'Negotiable'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900">{b.title}</h4>

                    <p className="text-[11px] text-slate-600">
                      Posted / Requested by: <strong>{b.ownerName || 'Unknown'}</strong>{' '}
                      {b.ownerPhone ? `(${b.ownerPhone})` : ''} • Target:{' '}
                      <strong>{b.targetRole || 'Open'}</strong>
                    </p>

                    <p className="text-[11px] text-slate-500">
                      Date: <strong>{b.startDate || 'Flexible'}</strong> • Duration:{' '}
                      <strong>{b.durationDays || 1}d</strong> • Pax:{' '}
                      <strong>{b.groupSize || 1}</strong> • Responses:{' '}
                      <strong>{applicantsCount}</strong>
                      {b.approvedProvider?.providerName
                        ? ` • Assigned: ${b.approvedProvider.providerName}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveBookingStage && onMoveBookingStage(b, 'pending')}
                      className={`px-3 py-1.5 rounded-xl font-bold ${
                        stage === 'pending'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white border text-slate-700 hover:bg-amber-50'
                      }`}
                    >
                      ⏳ Pending
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveBookingStage && onMoveBookingStage(b, 'active')}
                      className={`px-3 py-1.5 rounded-xl font-bold ${
                        stage === 'active'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white border text-slate-700 hover:bg-sky-50'
                      }`}
                    >
                      ⚡ Active
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveBookingStage && onMoveBookingStage(b, 'confirmed')}
                      className={`px-3 py-1.5 rounded-xl font-bold ${
                        stage === 'confirmed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      ✅ Confirm
                    </button>

                    {onOpenChatWithBookingParty && (
                      <button
                        type="button"
                        onClick={() => onOpenChatWithBookingParty(b)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold"
                      >
                        💬 Chat
                      </button>
                    )}

                    {onDeleteBooking && (
                      <button
                        type="button"
                        onClick={() => onDeleteBooking(b.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <div className="border-b pb-3">
          <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
            Welcome Tab Showcase Listings
          </span>
          <h3 className="text-base font-black text-slate-900">
            🎒 All Created Bookable Packages ({publishedPackages.length})
          </h3>
        </div>

        {publishedPackages.length === 0 ? (
          <p className="text-slate-400 italic">No bookable packages created yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {publishedPackages.map((pkg) => {
              const coverPhoto =
                pkg.photoUrl || (Array.isArray(pkg.photos) && pkg.photos[0]) || '';
              return (
                <div
                  key={pkg.id}
                  className="p-3.5 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1.5">
                    {coverPhoto && (
                      <img
                        src={coverPhoto}
                        alt={pkg.title}
                        className="w-full h-28 object-cover rounded-xl border"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2 py-0.5 rounded-full">
                        {pkg.category || 'Package'} • {pkg.destination || 'Rwanda'}
                      </span>
                      <span className="font-black text-[#234E40]">{pkg.priceLabel}</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">{pkg.title}</h4>
                    <p className="text-[11px] text-slate-600">
                      Posted by <strong>{pkg.providerName}</strong> ({pkg.providerRole})
                    </p>
                  </div>

                  {onDeletePackage && (
                    <button
                      type="button"
                      onClick={() => onDeletePackage(pkg.id)}
                      className="self-end text-red-600 hover:underline font-bold"
                    >
                      Delete Listing
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// CREATE BOOKINGS OR POST JOBS PANEL (EXPLICIT CHOICE + AUTO-DISPATCH JOBS)
// =========================================================================
function CreateBookingsAndPostJobsPanel({
  profileData,
  label,
  publishedPackages = [],
  onPublishBooking,
  onPublishJobToAllGraduates,
  onRemovePublishedPackage,
  onClose,
  onNotify
}) {
  const [creationMode, setCreationMode] = useState('booking');

  const [formInput, setFormInput] = useState({
    category: 'Tour Package',
    title: '',
    destination: 'Kigali City',
    startDate: '',
    durationDays: 2,
    groupSize: 2,
    priceLabel: '',
    highlights: '',
    photos: []
  });
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePhotoFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (file.size > 900 * 1024) {
        onNotify &&
          onNotify(
            'warning',
            `"${file.name}" exceeds 900KB. Please choose a smaller photo or use a Photo URL.`
          );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormInput((prev) => ({
            ...prev,
            photos: [...(prev.photos || []), reader.result]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddPhotoUrl = () => {
    if (!photoUrlInput.trim()) return;
    setFormInput((prev) => ({
      ...prev,
      photos: [...(prev.photos || []), photoUrlInput.trim()]
    }));
    setPhotoUrlInput('');
  };

  const removeDraftPhoto = (idx) => {
    setFormInput((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== idx)
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formInput.title.trim()) {
      onNotify &&
        onNotify(
          'warning',
          creationMode === 'job'
            ? 'Please enter a Job Title.'
            : 'Please enter a Booking / Package Title.'
        );
      return;
    }

    setIsPublishing(true);

    if (creationMode === 'job') {
      const jobPayload = {
        id: `job-${Date.now()}`,
        isJobPost: true,
        jobCategory: formInput.category,
        title: `🎓 JOB: ${formInput.title.trim()}`,
        destination: formInput.destination,
        startDate: formInput.startDate || 'Immediate / Flexible',
        durationDays: Number(formInput.durationDays) || 1,
        groupSize: Number(formInput.groupSize) || 1,
        budgetRwf: formInput.priceLabel.trim() || 'Competitive Pay / Negotiable',
        targetRole: 'All Tourism Graduates / Guides / Consultants',
        targetAudienceRole: 'graduate',
        notes: formInput.highlights.trim(),
        photos: formInput.photos || [],
        photoUrl: (formInput.photos && formInput.photos[0]) || '',
        ownerName: profileData?.name || label || 'Partner Organization',
        ownerPhone: profileData?.contact || '',
        status: 'open',
        movementStage: 'pending',
        applicants: [],
        approvedProvider: null,
        createdAt: Date.now()
      };

      if (onPublishJobToAllGraduates) {
        await onPublishJobToAllGraduates(jobPayload);
      }
    } else {
      const bookingOfferItem = {
        id: `pkg-${Date.now()}`,
        category: formInput.category,
        title: formInput.title.trim(),
        destination: formInput.destination,
        startDate: formInput.startDate || 'Flexible',
        durationDays: Number(formInput.durationDays) || 1,
        groupSize: Number(formInput.groupSize) || 1,
        priceLabel: formInput.priceLabel.trim() || 'Negotiable',
        highlights: formInput.highlights.trim(),
        photos: formInput.photos || [],
        photoUrl: (formInput.photos && formInput.photos[0]) || '',
        providerId: profileData?.id || '',
        providerName: profileData?.name || label || 'Partner',
        providerRole: label || profileData?.role || 'Provider',
        providerContact: profileData?.contact || '',
        availabilityStatus: profileData?.availabilityStatus || 'Available Now',
        availableDates: profileData?.availableDates || 'Flexible',
        createdAt: Date.now()
      };

      if (onPublishBooking) {
        await onPublishBooking(bookingOfferItem);
      }
    }

    setFormInput({
      category: creationMode === 'job' ? 'Tour Guiding Assignment' : 'Tour Package',
      title: '',
      destination: 'Kigali City',
      startDate: '',
      durationDays: 2,
      groupSize: 2,
      priceLabel: '',
      highlights: '',
      photos: []
    });
    setPhotoUrlInput('');
    setIsPublishing(false);
  };

  const myPackages = (publishedPackages || []).filter((p) => {
    if (!profileData?.id && !profileData?.name) return true;
    return (
      (profileData?.id && p.providerId === profileData.id) ||
      (profileData?.name && p.providerName === profileData.name)
    );
  });

  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-[#234E40] shadow-md space-y-5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
            ➕ Create Bookings OR Post Jobs Studio
          </span>
          <h3 className="text-base md:text-lg font-black text-slate-900 mt-1">
            Choose What You Want to Create
          </h3>
          <p className="text-slate-500">
            Select either <strong>Create a Booking</strong> (appears live on the Welcome tab &amp; Traveler Dashboard) or <strong>Post a Job</strong> (automatically sent to all Graduates, Guides &amp; Consultants).
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
          >
            Close Panel ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setCreationMode('booking');
            setFormInput((prev) => ({ ...prev, category: 'Tour Package' }));
          }}
          className={`p-4 rounded-2xl border-2 text-left transition ${
            creationMode === 'booking'
              ? 'border-[#234E40] bg-emerald-50/80 shadow-sm'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">🧳</span>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                creationMode === 'booking'
                  ? 'bg-[#234E40] text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {creationMode === 'booking' ? '✓ Selected' : 'Choose'}
            </span>
          </div>
          <h4 className="font-black text-sm text-slate-900 mt-1.5">
            Option 1: Create a Booking / Package
          </h4>
          <p className="text-slate-600 mt-0.5">
            Publishes immediately to the <strong>Welcome Tab auto-scrolling feed</strong> and the{' '}
            <strong>Traveler Dashboard</strong> so visitors can book it right away.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setCreationMode('job');
            setFormInput((prev) => ({ ...prev, category: 'Tour Guiding Assignment' }));
          }}
          className={`p-4 rounded-2xl border-2 text-left transition ${
            creationMode === 'job'
              ? 'border-purple-700 bg-purple-50/80 shadow-sm'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">🎓</span>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                creationMode === 'job'
                  ? 'bg-purple-700 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {creationMode === 'job' ? '✓ Selected' : 'Choose'}
            </span>
          </div>
          <h4 className="font-black text-sm text-slate-900 mt-1.5">
            Option 2: Post a Job (Auto-Sent to All Graduates / Guides / Consultants)
          </h4>
          <p className="text-slate-600 mt-0.5">
            Automatically dispatches this job opening to <strong>every registered Tourism Graduate, Guide, and Consultant</strong> so they can apply or accept immediately.
          </p>
        </button>
      </div>

      <form
        onSubmit={handleCreateSubmit}
        className={`space-y-4 p-4 rounded-2xl border ${
          creationMode === 'job' ? 'bg-purple-50/40 border-purple-200' : 'bg-slate-50'
        }`}
      >
        {creationMode === 'job' && (
          <div className="bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-between gap-2">
            <span>
              🎓 Auto-Dispatch Enabled: This job will be sent automatically to ALL Tourism Graduates, Guides &amp; Consultants!
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="font-bold text-slate-700">
              {creationMode === 'job' ? 'Job Role / Type *' : 'Booking Category *'}
            </label>
            {creationMode === 'job' ? (
              <select
                value={formInput.category}
                onChange={(e) => setFormInput({ ...formInput, category: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
              >
                <option value="Tour Guiding Assignment">🧭 Tour Guiding Assignment</option>
                <option value="Tourism Consultant Role">📊 Tourism Consultant Role</option>
                <option value="Safari Driver-Guide Job">🚙 Safari Driver-Guide Job</option>
                <option value="Airport / Protocol Officer">✈️ Airport / Protocol Officer</option>
              </select>
            ) : (
              <select
                value={formInput.category}
                onChange={(e) => setFormInput({ ...formInput, category: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
              >
                <option value="Tour Package">🧳 Tour Package</option>
                <option value="Car Rental Booking">🚗 Car Rental Booking</option>
                <option value="Safari / Expedition">🦁 Safari / Expedition</option>
                <option value="Guided City / Cultural Tour">🏛️ Guided City / Cultural Tour</option>
              </select>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="font-bold text-slate-700">
              {creationMode === 'job' ? 'Job Title *' : 'Booking / Package Title *'}
            </label>
            <input
              type="text"
              required
              value={formInput.title}
              onChange={(e) => setFormInput({ ...formInput, title: e.target.value })}
              placeholder={
                creationMode === 'job'
                  ? 'e.g. French-Speaking Gorilla Trekking Guide Needed (3 Days)'
                  : 'e.g. 3-Day Volcanoes Gorilla & Twin Lakes Package'
              }
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">Destination *</label>
            <select
              value={formInput.destination}
              onChange={(e) => setFormInput({ ...formInput, destination: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            >
              <option value="Kigali City">Kigali City</option>
              <option value="Musanze / Volcanoes NP">Musanze / Volcanoes NP</option>
              <option value="Nyungwe / Kitabi">Nyungwe / Kitabi</option>
              <option value="Akagera National Park">Akagera National Park</option>
              <option value="Lake Kivu (Rubavu / Rusizi)">Lake Kivu (Rubavu / Rusizi)</option>
              <option value="Multi-Destination Rwanda">Multi-Destination Rwanda</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="font-bold text-slate-700">Start Date</label>
            <input
              type="date"
              value={formInput.startDate}
              onChange={(e) => setFormInput({ ...formInput, startDate: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">Duration (Days)</label>
            <input
              type="number"
              min="1"
              value={formInput.durationDays}
              onChange={(e) => setFormInput({ ...formInput, durationDays: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">
              {creationMode === 'job' ? 'Pay / Daily Rate *' : 'Booking Price / Rate *'}
            </label>
            <input
              type="text"
              value={formInput.priceLabel}
              onChange={(e) => setFormInput({ ...formInput, priceLabel: e.target.value })}
              placeholder={
                creationMode === 'job'
                  ? 'e.g. 50,000 RWF / day'
                  : 'e.g. 120,000 RWF or $150'
              }
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">
              {creationMode === 'job' ? 'Required Skills / Notes' : 'Package Highlights'}
            </label>
            <input
              type="text"
              value={formInput.highlights}
              onChange={(e) => setFormInput({ ...formInput, highlights: e.target.value })}
              placeholder={
                creationMode === 'job'
                  ? 'Languages, RDB license, experience...'
                  : 'Included transport, guide, meals...'
              }
              className="w-full mt-1 p-2.5 border rounded-xl bg-white"
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-dashed border-[#3B6E5B] space-y-3">
          <div>
            <p className="font-extrabold text-[#234E40]">
              📸 Photos ({(formInput.photos || []).length} added)
            </p>
            <p className="text-[11px] text-slate-500">
              Upload photos from your device or paste image URLs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700">Upload Photos from Device</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoFilesChange}
                className="w-full mt-1 p-2 border rounded-xl bg-slate-50"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Or Add Photo URL</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 p-2 border rounded-xl bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  className="px-4 py-2 bg-[#3B6E5B] hover:bg-[#234E40] text-white font-bold rounded-xl"
                >
                  + Add Photo
                </button>
              </div>
            </div>
          </div>

          {(formInput.photos || []).length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {(formInput.photos || []).map((src, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={src}
                    alt={`Draft ${idx + 1}`}
                    className="w-24 h-20 object-cover rounded-xl border shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeDraftPhoto(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white font-black text-[11px] shadow"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPublishing}
            className={`px-6 py-3 text-white font-extrabold rounded-xl shadow transition ${
              creationMode === 'job'
                ? 'bg-purple-700 hover:bg-purple-800'
                : 'bg-[#234E40] hover:bg-slate-900'
            }`}
          >
            {isPublishing
              ? 'Publishing...'
              : creationMode === 'job'
              ? '🎓 Post Job to All Graduates / Guides / Consultants →'
              : '🧳 Publish Booking to Welcome Tab & Traveler Dashboard →'}
          </button>
        </div>
      </form>

      <div className="space-y-2.5">
        <h4 className="font-extrabold text-sm text-slate-900">
          Your Created Bookings on Welcome Tab ({myPackages.length})
        </h4>
        {myPackages.length === 0 ? (
          <p className="text-slate-400 italic">
            No bookings created yet. Choose Option 1 above to publish a booking.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myPackages.map((pkg) => {
              const coverPhoto =
                pkg.photoUrl || (Array.isArray(pkg.photos) && pkg.photos[0]) || '';
              return (
                <div
                  key={pkg.id}
                  className="p-3.5 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-2">
                    {coverPhoto && (
                      <img
                        src={coverPhoto}
                        alt={pkg.title}
                        className="w-full h-32 object-cover rounded-xl border"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2 py-0.5 rounded-full">
                        {pkg.category || 'Booking'} • {pkg.destination}
                      </span>
                      <span className="font-black text-[#234E40]">{pkg.priceLabel}</span>
                    </div>
                    <h5 className="font-extrabold text-sm text-slate-900">{pkg.title}</h5>
                    {pkg.highlights && <p className="text-slate-600">{pkg.highlights}</p>}
                  </div>

                  {onRemovePublishedPackage && (
                    <button
                      type="button"
                      onClick={() => onRemovePublishedPackage(pkg.id)}
                      className="self-end text-red-600 hover:underline font-bold"
                    >
                      Remove Listing
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// PROFILE EDITOR & SUMMARY (Users, Car Rentals & Owner + Photo + Availability)
// =========================================================================
function UserAndOwnerProfileSection({
  profileData,
  label,
  onSave,
  isSaving,
  showProviderExtras = false,
  onNotify
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
        : []
    });
  }, [profileData?.id]);

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      onNotify &&
        onNotify('warning', 'Please choose an image under 900KB or paste a photo URL.');
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
              {label || 'Profile'} • Profile Details
            </span>
            <h3 className="text-base font-black text-slate-900">
              Edit Profile Photo, Availability, Experience &amp; Qualifications
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
            placeholder="e.g. Tourism Consultant, Tour Guide, Fleet Manager"
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

      {showProviderExtras && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
          <div>
            <label className="font-bold text-[#234E40]">Availability Status</label>
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

      <div className="space-y-2 pt-3 border-t">
        <h4 className="font-extrabold text-sm text-[#234E40]">
          What You Provide (Services / Fleet / Offerings)
        </h4>
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
  lang = 'ENG',
  onNotify
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
      onNotify &&
        onNotify('warning', 'Please enter your Full Name and Phone / WhatsApp number.');
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
          No travelers or tourists have submitted their Personal Information (PI) yet. Select &quot;Traveler / Visitor&quot; to submit your PI and unlock the full dashboard.
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
// TRAVELER / TOURIST DIRECTORY: PACKAGES/BOOKINGS WITH PHOTOS & AVAILABILITY
// =========================================================================
function TravelerAvailabilityAndPackages({
  subscribers,
  publishedPackages,
  currentUser,
  travelerPI,
  onRequirePI,
  onBookPackageOrProvider,
  externalBookingItem,
  onClearExternalBookingItem,
  onNotify
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

  const uniquePackages = Array.from(
    new Map((publishedPackages || []).map((item) => [item.id || item.title, item])).values()
  );

  const openBookingModal = (item, type) => {
    if (!travelerPI?.fullName || !travelerPI?.phone) {
      if (onRequirePI) {
        onRequirePI(item, type);
      } else {
        onNotify &&
          onNotify('warning', 'Please fill out your Personal Information (PI) first.');
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
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
              Bookable Packages &amp; Created Bookings
            </span>
            <h3 className="text-base font-black text-slate-900">
              🎒 All Created Bookings &amp; Tour Offers Available ({uniquePackages.length})
            </h3>
            <p className="text-slate-500">
              Browse all created bookings, tour packages, and car rental offers with photos and book directly.
            </p>
          </div>
        </div>

        {uniquePackages.length === 0 ? (
          <p className="text-slate-400 italic">
            No bookings or packages created yet. Providers can create bookings with photos using &quot;Create Bookings / Post Jobs&quot;.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniquePackages.map((pkg) => {
              const coverPhoto =
                pkg.photoUrl || (Array.isArray(pkg.photos) && pkg.photos[0]) || '';
              return (
                <div
                  key={pkg.id || pkg.title}
                  className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    {coverPhoto && (
                      <img
                        src={coverPhoto}
                        alt={pkg.title}
                        className="w-full h-36 object-cover rounded-xl border"
                      />
                    )}
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
                      By <strong>{pkg.providerName}</strong> • {pkg.durationDays || 1} Day(s)
                    </p>
                    {pkg.highlights && <p className="text-slate-600">{pkg.highlights}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => openBookingModal(pkg, 'package')}
                    className="w-full py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl transition"
                  >
                    Book This Offer →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
              Live Provider Directory
            </span>
            <h3 className="text-base font-black text-slate-900">
              🧭 Guides, Consultants, Tour Companies, Agencies &amp; Car Rentals ({filteredProviders.length})
            </h3>
          </div>

          <div className="flex flex-wrap gap-1.5 font-bold">
            {[
              { id: 'all', label: 'All Partners' },
              { id: 'graduate', label: 'Guides / Consultants' },
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
          <p className="text-slate-400 italic">No providers match this filter yet.</p>
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
                  : `Book Partner: ${selectedBookingItem.name}`}
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
// BOOKING & JOBS MANAGEMENT CONSOLE (AUTO-JOBS FOR GRADUATES/GUIDES/CONSULTANTS)
// =========================================================================
function BookingMarketplace({
  currentUser,
  currentRole,
  travelerPI,
  onOpenCreateBookingsPostJobs,
  externalChatTarget,
  onClearExternalChatTarget,
  onNotify
}) {
  const [bookings, setBookings] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [activeChatThread, setActiveChatThread] = useState(null);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [filter, setFilter] = useState('all_summary');
  const [confirmActionTarget, setConfirmActionTarget] = useState(null);

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
  const isGraduateGuideConsultant = activeUserRole === 'graduate';

  const [editingJobAppId, setEditingJobAppId] = useState(null);
  const [jobAppDraft, setJobAppDraft] = useState({
    applicantRoleType: 'Tourism Graduate',
    coverNote: '',
    proposedRate: '',
    availabilityNote: ''
  });

  const [editingBookingId, setEditingBookingId] = useState(null);
  const [bookingDraft, setBookingDraft] = useState({
    title: '',
    destination: '',
    startDate: '',
    durationDays: 1,
    groupSize: 1,
    budgetRwf: '',
    notes: '',
    companyName: '',
    companyRegistration: '',
    companyContact: '',
    companyServiceDetails: '',
    graduateCredentials: ''
  });

  const [companyInfoModalContext, setCompanyInfoModalContext] = useState(null);
  const [companyBookingForm, setCompanyBookingForm] = useState({
    organizationName: currentUser?.name || '',
    registrationOrLicense: currentUser?.license || '',
    contactPhoneOrEmail: currentUser?.contact || '',
    serviceOrFleetDetails: currentUser?.title || '',
    graduateSpecialization: currentUser?.institution || '',
    travelDate: '',
    groupSize: 2,
    notes: ''
  });

  useEffect(() => {
    setCompanyBookingForm((prev) => ({
      ...prev,
      organizationName: currentUser?.name || prev.organizationName || '',
      registrationOrLicense: currentUser?.license || prev.registrationOrLicense || '',
      contactPhoneOrEmail: currentUser?.contact || prev.contactPhoneOrEmail || '',
      serviceOrFleetDetails: currentUser?.title || prev.serviceOrFleetDetails || '',
      graduateSpecialization: currentUser?.institution || prev.graduateSpecialization || ''
    }));
  }, [currentUser]);

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
      onNotify && onNotify('warning', 'Unable to start private chat with yourself.');
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
      onNotify &&
        onNotify(
          'error',
          'Access denied: only the two private chat participants can send or view messages.'
        );
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
    if (booking.status === 'taken') return;
    const roleLabel =
      activeUserRole === 'graduate'
        ? 'Tourism Graduate / Guide / Consultant'
        : activeUserRole === 'agency'
        ? 'Travel Agency'
        : activeUserRole === 'car_rental'
        ? 'Car Rentals Company'
        : 'Tour Company';

    const newApplicant = {
      providerId: activeUserId,
      providerName: activeUserName,
      providerRole: roleLabel,
      applicantRoleType:
        activeUserRole === 'graduate' ? 'Tourism Graduate / Guide / Consultant' : roleLabel,
      providerPhone: currentUser?.contact || '',
      coverNote: booking.isJobPost
        ? `Interested in ${booking.title} as ${roleLabel}.`
        : '',
      proposedRate: booking.budgetRwf || '',
      availabilityNote: currentUser?.availabilityStatus || 'Available Now',
      appliedAt: new Date().toISOString()
    };

    const updatedApplicants = [...(booking.applicants || []), newApplicant];
    setBookings(
      bookings.map((b) =>
        b.id === booking.id
          ? { ...b, movementStage: 'active', applicants: updatedApplicants }
          : b
      )
    );
    await saveBookingDoc(booking.id, {
      movementStage: 'active',
      applicants: updatedApplicants
    });
    onNotify &&
      onNotify(
        'success',
        booking.isJobPost
          ? 'Job application sent — moved to Active! You can edit your application anytime.'
          : 'Response sent — booking moved to Active!'
      );
  };

  const startEditingJobApplication = (booking, existingApp) => {
    setEditingJobAppId(booking.id);
    setJobAppDraft({
      applicantRoleType: existingApp?.applicantRoleType || 'Tourism Graduate',
      coverNote: existingApp?.coverNote || '',
      proposedRate: existingApp?.proposedRate || booking.budgetRwf || '',
      availabilityNote: existingApp?.availabilityNote || 'Available Now'
    });
  };

  const handleSaveEditedJobApplication = async (e, booking) => {
    e.preventDefault();
    if (!isGraduateGuideConsultant) {
      onNotify &&
        onNotify(
          'warning',
          'Only Graduates, Consultants, or Guides can edit job applications.'
        );
      return;
    }

    const updatedApplicants = (booking.applicants || []).map((app) =>
      app.providerId === activeUserId
        ? {
            ...app,
            applicantRoleType: jobAppDraft.applicantRoleType,
            coverNote: jobAppDraft.coverNote.trim(),
            proposedRate: jobAppDraft.proposedRate.trim(),
            availabilityNote: jobAppDraft.availabilityNote.trim(),
            updatedAt: new Date().toISOString()
          }
        : app
    );

    setBookings(
      bookings.map((b) =>
        b.id === booking.id ? { ...b, applicants: updatedApplicants } : b
      )
    );
    await saveBookingDoc(booking.id, { applicants: updatedApplicants });
    setEditingJobAppId(null);
    onNotify && onNotify('success', 'Your job application details were updated.');
  };

  const canEditBookingItem = (booking) => {
    if (!booking || booking.isJobPost) return false;
    const isBookerById = booking.ownerId === activeUserId;
    const isBookerByName =
      booking.ownerName &&
      activeUserName &&
      normalize(booking.ownerName) === normalize(activeUserName);
    const allowedBookerRole = [
      'traveler',
      'graduate',
      'tour_company',
      'agency',
      'car_rental'
    ].includes(activeUserRole);
    return allowedBookerRole && (isBookerById || isBookerByName);
  };

  const startEditingBookingItem = (booking) => {
    if (activeUserRole === 'traveler' && (!travelerPI?.fullName || !travelerPI?.phone)) {
      onNotify &&
        onNotify(
          'warning',
          'Travelers must complete their Personal Information (PI) first before editing a booking.'
        );
      return;
    }
    setEditingBookingId(booking.id);
    setBookingDraft({
      title: booking.title || '',
      destination: booking.destination || 'Rwanda',
      startDate: booking.startDate || '',
      durationDays: booking.durationDays || 1,
      groupSize: booking.groupSize || 1,
      budgetRwf: booking.budgetRwf || '',
      notes: booking.notes || '',
      companyName: booking.companyBookingInfo?.organizationName || currentUser?.name || '',
      companyRegistration:
        booking.companyBookingInfo?.registrationOrLicense || currentUser?.license || '',
      companyContact:
        booking.companyBookingInfo?.contactPhoneOrEmail || currentUser?.contact || '',
      companyServiceDetails:
        booking.companyBookingInfo?.serviceOrFleetDetails || currentUser?.title || '',
      graduateCredentials:
        booking.companyBookingInfo?.graduateSpecialization || currentUser?.institution || ''
    });
  };

  const handleSaveEditedBookingItem = async (e, booking) => {
    e.preventDefault();
    if (!canEditBookingItem(booking)) {
      onNotify &&
        onNotify('warning', 'Only the booker of this booking can edit its details.');
      return;
    }
    if (activeUserRole === 'traveler' && (!travelerPI?.fullName || !travelerPI?.phone)) {
      onNotify &&
        onNotify(
          'warning',
          'Travelers must first fill out their Personal Information (PI).'
        );
      return;
    }

    const updatedCompanyInfo =
      ['agency', 'tour_company', 'car_rental', 'graduate'].includes(activeUserRole)
        ? {
            organizationName: bookingDraft.companyName.trim(),
            registrationOrLicense: bookingDraft.companyRegistration.trim(),
            contactPhoneOrEmail: bookingDraft.companyContact.trim(),
            serviceOrFleetDetails: bookingDraft.companyServiceDetails.trim(),
            graduateSpecialization: bookingDraft.graduateCredentials.trim()
          }
        : booking.companyBookingInfo || null;

    const patch = {
      title: bookingDraft.title.trim() || booking.title,
      destination: bookingDraft.destination.trim() || booking.destination,
      startDate: bookingDraft.startDate || booking.startDate,
      durationDays: Number(bookingDraft.durationDays) || 1,
      groupSize: Number(bookingDraft.groupSize) || 1,
      budgetRwf: bookingDraft.budgetRwf.trim() || booking.budgetRwf,
      notes: bookingDraft.notes.trim(),
      companyBookingInfo: updatedCompanyInfo,
      updatedAt: new Date().toISOString()
    };

    setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, ...patch } : b)));
    await saveBookingDoc(booking.id, patch);
    setEditingBookingId(null);
    onNotify && onNotify('success', 'Booking details updated successfully.');
  };

  const handleConfirmCompanyBookingModal = async (e) => {
    e.preventDefault();
    if (!companyInfoModalContext) return;

    const { item, bookingType } = companyInfoModalContext;
    const isPkg = bookingType === 'package';
    const isAd = bookingType === 'ad';
    const bookingId = `bk-${Date.now()}`;
    const targetName = isPkg
      ? item.providerName || item.title
      : isAd
      ? item.headline || item.name
      : item.name;
    const targetProviderId = isPkg
      ? normalize(item.providerContact || item.providerId || item.providerName)
      : normalize(item.contact || item.id || item.name);
    const targetContact = isPkg ? item.providerContact || '' : item.contact || '';

    const companyInfo = {
      role: activeUserRole,
      organizationName: companyBookingForm.organizationName.trim() || activeUserName,
      registrationOrLicense: companyBookingForm.registrationOrLicense.trim(),
      contactPhoneOrEmail:
        companyBookingForm.contactPhoneOrEmail.trim() || currentUser?.contact || '',
      serviceOrFleetDetails: companyBookingForm.serviceOrFleetDetails.trim(),
      graduateSpecialization: companyBookingForm.graduateSpecialization.trim()
    };

    const bookingDoc = {
      id: bookingId,
      title: isPkg
        ? `Booked Offer: ${item.title} (${targetName})`
        : isAd
        ? `Ad Booking: ${targetName}`
        : `Direct Booking: ${targetName}`,
      destination: item.destination || 'Multi-Destination Rwanda',
      startDate: companyBookingForm.travelDate || 'Flexible Date',
      durationDays: Number(item.durationDays) || 1,
      groupSize: Number(companyBookingForm.groupSize) || 1,
      budgetRwf: item.priceLabel || 'Negotiable',
      targetRole: targetName,
      targetProviderId,
      travelerPI: null,
      companyBookingInfo: companyInfo,
      notes: [
        companyBookingForm.notes.trim(),
        `${companyInfo.organizationName}${
          companyInfo.registrationOrLicense ? ` • Reg/Lic: ${companyInfo.registrationOrLicense}` : ''
        }${
          companyInfo.graduateSpecialization
            ? ` • Graduate Info: ${companyInfo.graduateSpecialization}`
            : ''
        }`,
        targetContact ? `Provider Contact: ${targetContact}` : ''
      ]
        .filter(Boolean)
        .join(' • '),
      ownerId: activeUserId,
      ownerName: companyInfo.organizationName,
      ownerPhone: companyInfo.contactPhoneOrEmail,
      status: 'open',
      movementStage: 'pending',
      applicants: [],
      approvedProvider: null,
      createdAt: Date.now()
    };

    setBookings((prev) => [bookingDoc, ...prev]);
    await firestoreSaveDoc('openBookings', bookingId, bookingDoc);
    setCompanyInfoModalContext(null);
    setCompanyBookingForm((prev) => ({ ...prev, travelDate: '', notes: '' }));
    onNotify &&
      onNotify(
        'success',
        `Booking submitted with ${
          activeUserRole === 'graduate' ? 'Graduate' : 'Company'
        } information.`
      );
  };

  const executeConfirmedAction = async () => {
    if (!confirmActionTarget) return;
    const target = confirmActionTarget;
    setConfirmActionTarget(null);

    if (target.type === 'owner_approve') {
      const { booking, applicant } = target;
      const patch = {
        status: 'taken',
        movementStage: 'confirmed',
        approvedProvider: applicant
      };
      setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, ...patch } : b)));
      await saveBookingDoc(booking.id, patch);
      onNotify &&
        onNotify(
          'success',
          `Confirmed ${applicant.providerName} for "${booking.title}".`
        );
    } else if (target.type === 'provider_direct') {
      const { booking } = target;
      const providerInfo = {
        providerId: activeUserId,
        providerName: activeUserName,
        providerRole: activeUserRole,
        approvedAt: new Date().toISOString()
      };
      const patch = {
        status: 'taken',
        movementStage: 'confirmed',
        approvedProvider: providerInfo
      };
      setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, ...patch } : b)));
      await saveBookingDoc(booking.id, patch);
      onNotify &&
        onNotify(
          'success',
          `Confirmed booking "${booking.title}" for ${booking.ownerName}.`
        );
    }
  };

  const roleLabelMap = {
    graduate: 'Graduate / Guide / Consultant',
    agency: 'Travel Agency',
    tour_company: 'Tour Company',
    car_rental: 'Car Rental',
    traveler: 'Traveler'
  };

  const autoJobsForGraduates = bookings.filter((b) => Boolean(b.isJobPost));
  const activeBookingsList = bookings.filter((b) => classifyBookingBucket(b) === 'active');
  const confirmedBookingsList = bookings.filter(
    (b) => classifyBookingBucket(b) === 'confirmed'
  );
  const pendingBookingsList = bookings.filter((b) => classifyBookingBucket(b) === 'pending');

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'jobs') return Boolean(b.isJobPost);
    if (filter === 'active') return classifyBookingBucket(b) === 'active';
    if (filter === 'confirmed') return classifyBookingBucket(b) === 'confirmed';
    if (filter === 'pending') return classifyBookingBucket(b) === 'pending';
    return true;
  });

  const myPrivateThreads = privateChats.filter((t) =>
    (t.participantIds || []).includes(activeUserId)
  );
  const liveActiveThread = activeChatThread
    ? privateChats.find((t) => t.id === activeChatThread.id) || activeChatThread
    : null;
  const canViewLiveThread =
    liveActiveThread && (liveActiveThread.participantIds || []).includes(activeUserId);

  return (
    <div className="space-y-4">
      <div className="bg-[#234E40] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
            📋 Bookings &amp; Auto-Dispatched Jobs
          </span>
          <h3 className="font-bold text-base md:text-xl pt-1">
            Booking &amp; Job Management Console
          </h3>
          <p className="text-xs text-emerald-100">
            Track <strong>Active</strong>, <strong>Confirmed</strong>, and{' '}
            <strong>Pending</strong> items plus jobs sent automatically to{' '}
            <strong>All Graduates / Guides / Consultants</strong>.
          </p>
        </div>
        {isProvider && onOpenCreateBookingsPostJobs && (
          <button
            type="button"
            onClick={onOpenCreateBookingsPostJobs}
            className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow shrink-0"
          >
            ➕ Create Bookings / Post Jobs
          </button>
        )}
      </div>

      {isGraduateGuideConsultant && autoJobsForGraduates.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-400 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase bg-purple-700 text-white px-2.5 py-0.5 rounded-full">
              🎓 Auto-Dispatched Jobs Feed
            </span>
            <p className="font-extrabold text-sm text-purple-950 mt-1">
              {autoJobsForGraduates.length} job posting(s) dispatched to all Tourism Graduates, Guides &amp; Consultants!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilter(filter === 'jobs' ? 'all_summary' : 'jobs')}
            className="px-4 py-2 bg-purple-700 text-white font-extrabold rounded-xl"
          >
            {filter === 'jobs' ? 'Show All' : `View Jobs (${autoJobsForGraduates.length})`}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div
          onClick={() => setFilter(filter === 'jobs' ? 'all_summary' : 'jobs')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition shadow-sm ${
            filter === 'jobs'
              ? 'bg-purple-50 border-purple-700'
              : 'bg-white border-purple-200 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase text-[10px] text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-full">
              🎓 Posted Jobs
            </span>
            <span className="text-xl font-black text-purple-900">
              {autoJobsForGraduates.length}
            </span>
          </div>
          <p className="text-slate-600 mt-1.5">
            Jobs sent automatically to all Tourism Graduates, Guides &amp; Consultants.
          </p>
        </div>

        <div
          onClick={() => setFilter(filter === 'active' ? 'all_summary' : 'active')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition shadow-sm ${
            filter === 'active'
              ? 'bg-sky-50 border-sky-600'
              : 'bg-white border-sky-200 hover:border-sky-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase text-[10px] text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
              ⚡ Active Bookings
            </span>
            <span className="text-xl font-black text-sky-900">{activeBookingsList.length}</span>
          </div>
          <p className="text-slate-600 mt-1.5">
            Bookings or jobs with active responses awaiting final confirmation.
          </p>
        </div>

        <div
          onClick={() => setFilter(filter === 'confirmed' ? 'all_summary' : 'confirmed')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition shadow-sm ${
            filter === 'confirmed'
              ? 'bg-emerald-50 border-emerald-600'
              : 'bg-white border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase text-[10px] text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              ✅ Confirmed
            </span>
            <span className="text-xl font-black text-emerald-900">
              {confirmedBookingsList.length}
            </span>
          </div>
          <p className="text-slate-600 mt-1.5">
            Approved and confirmed bookings locked in with assigned partner.
          </p>
        </div>

        <div
          onClick={() => setFilter(filter === 'pending' ? 'all_summary' : 'pending')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition shadow-sm ${
            filter === 'pending'
              ? 'bg-amber-50 border-amber-500'
              : 'bg-white border-amber-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase text-[10px] text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-full">
              ⏳ Pending
            </span>
            <span className="text-xl font-black text-amber-950">
              {pendingBookingsList.length}
            </span>
          </div>
          <p className="text-slate-600 mt-1.5">
            Newly submitted booking or job requests waiting for action.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-1.5 rounded-2xl border text-[11px] md:text-xs font-bold text-center shadow-sm">
        <button
          type="button"
          onClick={() => setFilter('all_summary')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'all_summary'
              ? 'bg-[#234E40] text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📋 All ({bookings.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('jobs')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'jobs'
              ? 'bg-purple-700 text-white'
              : 'text-purple-900 bg-purple-50 hover:bg-purple-100'
          }`}
        >
          🎓 Jobs ({autoJobsForGraduates.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'active'
              ? 'bg-sky-700 text-white'
              : 'text-sky-900 bg-sky-50 hover:bg-sky-100'
          }`}
        >
          ⚡ Active ({activeBookingsList.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('confirmed')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'confirmed'
              ? 'bg-emerald-700 text-white'
              : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          ✅ Confirmed ({confirmedBookingsList.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`py-2.5 rounded-xl transition ${
            filter === 'pending'
              ? 'bg-amber-500 text-slate-950'
              : 'text-amber-950 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          ⏳ Pending ({pendingBookingsList.length})
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
              🔒 Private 1-on-1 Messaging
            </span>
            <h4 className="font-black text-sm text-slate-900">
              Your Private Chats ({myPrivateThreads.length})
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
                  No messages yet. Send a private message to coordinate details.
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
                placeholder="Write a private message..."
                className="flex-1 p-2.5 border rounded-xl bg-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
              >
                Send →
              </button>
            </form>
          </div>
        ) : (
          myPrivateThreads.length === 0 && (
            <p className="text-slate-400 italic">
              No private conversations yet. Click &quot;Private Chat&quot; on any booking, job, or traveler to start chatting.
            </p>
          )
        )}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-500">
          No bookings or jobs match the selected filter right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => {
            const bucket = classifyBookingBucket(booking);
            const isOwner = booking.ownerId === activeUserId;
            const isConfirmed = bucket === 'confirmed';
            const isActive = bucket === 'active';
            const isJob = Boolean(booking.isJobPost);
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
                  isConfirmed
                    ? 'bg-emerald-50/70 border-emerald-400'
                    : isJob
                    ? 'bg-purple-50/50 border-purple-300'
                    : isActive
                    ? 'bg-sky-50/50 border-sky-300'
                    : 'bg-white border-amber-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#3B6E5B] bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      📍 {booking.destination}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isJob && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-700 text-white">
                          🎓 Job Post
                        </span>
                      )}

                      {isConfirmed ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                          ✅ Confirmed
                        </span>
                      ) : isActive ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-600 text-white">
                          ⚡ Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950">
                          ⏳ Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900">{booking.title}</h4>
                  <p className="text-[11px] text-slate-500">
                    {isJob ? 'Employer' : 'Booked by'}: <strong>{booking.ownerName}</strong> •{' '}
                    Target: <strong>{booking.targetRole}</strong>
                  </p>

                  {booking.travelerPI && (
                    <div className="bg-emerald-50/70 border border-emerald-200 p-2 rounded-xl text-[11px] text-slate-700">
                      <strong>🪪 Traveler PI:</strong> {booking.travelerPI.fullName} •{' '}
                      {booking.travelerPI.nationality || 'Rwanda'} • {booking.travelerPI.phone}
                    </div>
                  )}

                  {booking.companyBookingInfo && (
                    <div className="bg-sky-50/70 border border-sky-200 p-2 rounded-xl text-[11px] text-slate-700 space-y-0.5">
                      <div>
                        <strong>🏢 Company / Graduate Info:</strong>{' '}
                        {booking.companyBookingInfo.organizationName || booking.ownerName}
                        {booking.companyBookingInfo.registrationOrLicense
                          ? ` • Reg/Lic: ${booking.companyBookingInfo.registrationOrLicense}`
                          : ''}
                      </div>
                      {booking.companyBookingInfo.serviceOrFleetDetails && (
                        <div>
                          <strong>Booking Details:</strong>{' '}
                          {booking.companyBookingInfo.serviceOrFleetDetails}
                        </div>
                      )}
                      {booking.companyBookingInfo.graduateSpecialization && (
                        <div>
                          <strong>Graduate Credentials:</strong>{' '}
                          {booking.companyBookingInfo.graduateSpecialization}
                        </div>
                      )}
                    </div>
                  )}

                  {canEditBookingItem(booking) && editingBookingId !== booking.id && (
                    <button
                      type="button"
                      onClick={() => startEditingBookingItem(booking)}
                      className="w-full py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl font-extrabold text-[11px] transition"
                    >
                      ✏️ Edit Booking ({activeUserRole === 'traveler' ? 'Traveler' : roleLabelMap[activeUserRole] || activeUserRole})
                    </button>
                  )}

                  {editingBookingId === booking.id && (
                    <form
                      onSubmit={(e) => handleSaveEditedBookingItem(e, booking)}
                      className="p-3 rounded-xl border-2 border-amber-400 bg-amber-50/60 space-y-2 text-[11px]"
                    >
                      <p className="font-extrabold text-slate-900">Edit Your Booking</p>
                      <input
                        type="text"
                        required
                        value={bookingDraft.title}
                        onChange={(e) =>
                          setBookingDraft({ ...bookingDraft, title: e.target.value })
                        }
                        placeholder="Booking Title"
                        className="w-full p-2 border rounded-lg bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={bookingDraft.destination}
                          onChange={(e) =>
                            setBookingDraft({ ...bookingDraft, destination: e.target.value })
                          }
                          placeholder="Destination"
                          className="p-2 border rounded-lg bg-white"
                        />
                        <input
                          type="date"
                          value={bookingDraft.startDate}
                          onChange={(e) =>
                            setBookingDraft({ ...bookingDraft, startDate: e.target.value })
                          }
                          className="p-2 border rounded-lg bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min="1"
                          value={bookingDraft.durationDays}
                          onChange={(e) =>
                            setBookingDraft({ ...bookingDraft, durationDays: e.target.value })
                          }
                          placeholder="Days"
                          className="p-2 border rounded-lg bg-white"
                        />
                        <input
                          type="number"
                          min="1"
                          value={bookingDraft.groupSize}
                          onChange={(e) =>
                            setBookingDraft({ ...bookingDraft, groupSize: e.target.value })
                          }
                          placeholder="Pax"
                          className="p-2 border rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          value={bookingDraft.budgetRwf}
                          onChange={(e) =>
                            setBookingDraft({ ...bookingDraft, budgetRwf: e.target.value })
                          }
                          placeholder="Budget / Rate"
                          className="p-2 border rounded-lg bg-white"
                        />
                      </div>
                      {['agency', 'tour_company', 'car_rental', 'graduate'].includes(
                        activeUserRole
                      ) && (
                        <div className="space-y-1.5 pt-1 border-t border-amber-200">
                          <input
                            type="text"
                            value={bookingDraft.companyName}
                            onChange={(e) =>
                              setBookingDraft({ ...bookingDraft, companyName: e.target.value })
                            }
                            placeholder="Company / Graduate Name"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                          <input
                            type="text"
                            value={bookingDraft.companyRegistration}
                            onChange={(e) =>
                              setBookingDraft({
                                ...bookingDraft,
                                companyRegistration: e.target.value
                              })
                            }
                            placeholder="Company Reg / RDB License / Diploma"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                          <input
                            type="text"
                            value={bookingDraft.companyServiceDetails}
                            onChange={(e) =>
                              setBookingDraft({
                                ...bookingDraft,
                                companyServiceDetails: e.target.value
                              })
                            }
                            placeholder="Booking / Fleet / Tour Requirements"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                          {activeUserRole === 'graduate' && (
                            <input
                              type="text"
                              value={bookingDraft.graduateCredentials}
                              onChange={(e) =>
                                setBookingDraft({
                                  ...bookingDraft,
                                  graduateCredentials: e.target.value
                                })
                              }
                              placeholder="Graduate Specialization / Guiding Credentials"
                              className="w-full p-2 border rounded-lg bg-white"
                            />
                          )}
                        </div>
                      )}
                      <input
                        type="text"
                        value={bookingDraft.notes}
                        onChange={(e) =>
                          setBookingDraft({ ...bookingDraft, notes: e.target.value })
                        }
                        placeholder="Booking Notes"
                        className="w-full p-2 border rounded-lg bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBookingId(null)}
                          className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-[#234E40] text-white rounded-lg font-bold"
                        >
                          Save Booking
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="bg-slate-100 p-2.5 rounded-xl grid grid-cols-3 gap-1 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Date</span>
                      <span className="font-bold text-slate-800">{booking.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Duration</span>
                      <span className="font-bold text-slate-800">
                        {booking.durationDays}d • {booking.groupSize} pax
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Rate / Pay</span>
                      <span className="font-bold text-[#234E40]">{booking.budgetRwf}</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="text-slate-600 italic">&quot;{booking.notes}&quot;</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  {isConfirmed && (
                    <div className="bg-[#234E40] text-white p-3 rounded-xl space-y-1.5">
                      <p className="font-bold">
                        ✅ Confirmed with:{' '}
                        {booking.approvedProvider?.providerName || booking.targetRole}
                      </p>
                      <p className="text-[11px] text-emerald-100">
                        Contact: <strong>{booking.ownerName}</strong> • Phone:{' '}
                        <strong>{booking.ownerPhone}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openPrivateChat(
                            booking.id,
                            booking.title,
                            isGrantedToMe ? booking.ownerId : booking.targetProviderId,
                            isGrantedToMe ? booking.ownerName : booking.targetRole
                          )
                        }
                        className="mt-1 px-3 py-1.5 bg-amber-400 text-slate-950 rounded-lg font-extrabold text-[11px]"
                      >
                        💬 Private Chat
                      </button>
                    </div>
                  )}

                  {isOwner && !isConfirmed && (
                    <div className="space-y-2">
                      <p className="font-bold text-[11px] uppercase text-slate-700">
                        Applicants / Responses ({(booking.applicants || []).length}):
                      </p>

                      {(booking.applicants || []).length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">
                          {isJob
                            ? 'Sent to all Graduates / Guides / Consultants — awaiting applications...'
                            : 'Pending response from provider...'}
                        </p>
                      )}

                      {(booking.applicants || []).map((app, i) => (
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
                              💬 Chat
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmActionTarget({
                                  type: 'owner_approve',
                                  booking,
                                  applicant: app
                                })
                              }
                              className="px-3 py-1.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-lg font-bold"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isOwner && !isConfirmed && isProvider && (
                    <div className="space-y-1.5">
                      {isTargetedToMe && !isJob && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmActionTarget({
                              type: 'provider_direct',
                              booking
                            })
                          }
                          className="w-full py-2.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-extrabold transition"
                        >
                          ✓ Confirm Client Booking
                        </button>
                      )}

                      {(!isTargetedToMe || isJob) &&
                        (alreadyApplied ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              disabled
                              className="w-full py-2 bg-slate-200 text-slate-600 rounded-xl font-bold cursor-not-allowed"
                            >
                              ⚡ Active — Application Sent
                            </button>
                            {isJob && isGraduateGuideConsultant && editingJobAppId !== booking.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  const mine = (booking.applicants || []).find(
                                    (a) => a.providerId === activeUserId
                                  );
                                  startEditingJobApplication(booking, mine);
                                }}
                                className="w-full py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-xl font-extrabold text-[11px] transition"
                              >
                                ✏️ Edit My Job Application (Graduate / Consultant / Guide)
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyForBooking(booking)}
                            className={`w-full py-2.5 text-white rounded-xl font-bold transition ${
                              isJob
                                ? 'bg-purple-700 hover:bg-purple-800'
                                : 'bg-[#3B6E5B] hover:bg-[#234E40]'
                            }`}
                          >
                            {isJob
                              ? '🎓 Apply for This Job →'
                              : 'Respond to Move to Active →'}
                          </button>
                        ))}

                      {isJob && isGraduateGuideConsultant && editingJobAppId === booking.id && (
                        <form
                          onSubmit={(e) => handleSaveEditedJobApplication(e, booking)}
                          className="p-3 rounded-xl border-2 border-purple-400 bg-purple-50/70 space-y-2 text-[11px]"
                        >
                          <p className="font-extrabold text-purple-950">
                            Edit Your Job Application
                          </p>
                          <select
                            value={jobAppDraft.applicantRoleType}
                            onChange={(e) =>
                              setJobAppDraft({
                                ...jobAppDraft,
                                applicantRoleType: e.target.value
                              })
                            }
                            className="w-full p-2 border rounded-lg bg-white font-semibold"
                          >
                            <option value="Tourism Graduate">Tourism Graduate</option>
                            <option value="Tourism Consultant">Tourism Consultant</option>
                            <option value="Tour Guide">Tour Guide</option>
                          </select>
                          <input
                            type="text"
                            value={jobAppDraft.proposedRate}
                            onChange={(e) =>
                              setJobAppDraft({
                                ...jobAppDraft,
                                proposedRate: e.target.value
                              })
                            }
                            placeholder="Proposed Rate / Pay"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                          <input
                            type="text"
                            value={jobAppDraft.availabilityNote}
                            onChange={(e) =>
                              setJobAppDraft({
                                ...jobAppDraft,
                                availabilityNote: e.target.value
                              })
                            }
                            placeholder="Availability Dates / Notes"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                          <input
                            type="text"
                            value={jobAppDraft.coverNote}
                            onChange={(e) =>
                              setJobAppDraft({
                                ...jobAppDraft,
                                coverNote: e.target.value
                              })
                            }
                            placeholder="Application pitch / qualifications note"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingJobAppId(null)}
                              className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 bg-purple-700 text-white rounded-lg font-bold"
                            >
                              Save Application
                            </button>
                          </div>
                        </form>
                      )}

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

      {confirmActionTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <h4 className="font-black text-base text-slate-900">
              Confirm Booking Assignment
            </h4>
            <p className="text-slate-600">
              {confirmActionTarget.type === 'owner_approve'
                ? `Confirm ${confirmActionTarget.applicant?.providerName} (${confirmActionTarget.applicant?.providerRole}) for "${confirmActionTarget.booking?.title}"?`
                : `Confirm booking "${confirmActionTarget.booking?.title}" for ${confirmActionTarget.booking?.ownerName}?`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmActionTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className="px-5 py-2 bg-[#234E40] text-white rounded-xl font-bold"
              >
                Confirm →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// MAIN APPLICATION COMPONENT
// =========================================================================
export default function App() {
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
        .gl-welcome-caps-tnr,
        .gl-welcome-caps-tnr * {
          font-family: 'Times New Roman', Times, serif !important;
          text-transform: uppercase !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [language, setLanguage] = useState('ENG');
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.ENG;

  const [statusBanner, setStatusBanner] = useState(null);
  const notify = (type, message) => {
    setStatusBanner({ id: Date.now(), type, message });
  };

  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('bookings_jobs');
  const [allRolesFilter, setAllRolesFilter] = useState('all');
  const [showUserProfileEditor, setShowUserProfileEditor] = useState(false);
  const [showCreateBookingsPostJobsPanel, setShowCreateBookingsPostJobsPanel] = useState(false);
  const [showBookingManagementPanel, setShowBookingManagementPanel] = useState(true);
  const [showChangePasswordBox, setShowChangePasswordBox] = useState(false);
  const [showPiFormModal, setShowPiFormModal] = useState(false);
  const [pendingPiAction, setPendingPiAction] = useState(null);
  const [externalBookingItem, setExternalBookingItem] = useState(null);
  const [travelerPI, setTravelerPI] = useState(null);
  const [travelersDirectory, setTravelersDirectory] = useState([]);
  const [externalChatTarget, setExternalChatTarget] = useState(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState(null);

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
  const [allBookingsForOwner, setAllBookingsForOwner] = useState([]);

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

  const [newAnnouncementForm, setNewAnnouncementForm] = useState({
    title: '',
    body: '',
    targetRole: 'all'
  });

  const [newPlanForm, setNewPlanForm] = useState({
    id: '',
    name: '',
    durationLabel: '30 Days Access',
    days: 30,
    price: 15000,
    badge: 'Partner Plan'
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

  const handleSignOut = () => {
    setCurrentUser(null);
    setIsSubscribed(false);
    setTravelerPI(null);
    setShowUserProfileEditor(false);
    setShowCreateBookingsPostJobsPanel(false);
    setShowChangePasswordBox(false);
    setSelectedInspectedUser(null);
    setAuthPasswordInput('');
    setCurrentRole('welcome');
  };

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNowClock(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const syncFromFirebase = async () => {
    const [fbConfigs, fbPlans, fbSubs, fbPkgs, fbTravelers, fbBookings] = await Promise.all([
      firestoreGetCollection('appConfig'),
      firestoreGetCollection('subscriptionPlans'),
      firestoreGetCollection('subscribers'),
      firestoreGetCollection('publishedPackages'),
      firestoreGetCollection('travelersPI'),
      firestoreGetCollection('openBookings')
    ]);

    if (fbConfigs.length > 0) {
      const mainCfg = fbConfigs.find((c) => c.id === 'main') || fbConfigs[0];
      setAppConfig((prev) => ({
        ...prev,
        ...mainCfg,
        welcomeCustomFeatures: Array.isArray(mainCfg.welcomeCustomFeatures)
          ? mainCfg.welcomeCustomFeatures
          : prev.welcomeCustomFeatures || [],
        appCustomFeatures: Array.isArray(mainCfg.appCustomFeatures)
          ? mainCfg.appCustomFeatures
          : prev.appCustomFeatures || []
      }));
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
    if (fbBookings.length > 0) {
      setAllBookingsForOwner(
        [...fbBookings].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
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
    setCurrentRole('traveler');
    await firestoreSaveDoc('travelersPI', cleanId, record);

    if (pendingPiAction?.item) {
      setExternalBookingItem({
        ...pendingPiAction.item,
        bookingType: pendingPiAction.type || 'package'
      });
      setPendingPiAction(null);
    }
    notify('success', `Personal Information (PI) saved for ${record.fullName}. Full dashboard unlocked.`);
  };

  const handleSelectWelcomeBookingCard = (scrollCard) => {
    const bookingOffer =
      scrollCard.kind === 'package'
        ? { ...scrollCard.rawItem, bookingType: 'package' }
        : {
            id: scrollCard.id,
            title: scrollCard.title,
            destination: scrollCard.destination,
            priceLabel: scrollCard.priceLabel,
            providerName: scrollCard.providerName,
            durationDays: scrollCard.durationDays,
            bookingType: 'package'
          };

    if (!travelerPI?.fullName || !travelerPI?.phone) {
      setPendingPiAction({ item: bookingOffer, type: 'package' });
      setShowPiFormModal(true);
      return;
    }

    setCurrentRole('traveler');
    setExternalBookingItem(bookingOffer);
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

    setCurrentRole('traveler');
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

  const handleTriggerCustomFeature = (feat) => {
    if (!feat) return;
    if (feat.actionType === 'url' && feat.actionTarget) {
      window.open(feat.actionTarget, '_blank', 'noopener,noreferrer');
      return;
    }
    if (feat.actionType === 'open_pi') {
      setCurrentRole('traveler');
      setShowPiFormModal(true);
      return;
    }
    if (feat.actionType === 'role_traveler') {
      setCurrentRole('traveler');
      if (!isTravelerPiCompleted) setShowPiFormModal(true);
      return;
    }
    if (
      ['role_graduate', 'role_agency', 'role_tour_company', 'role_car_rental'].includes(
        feat.actionType
      )
    ) {
      const targetRole = feat.actionType.replace('role_', '');
      setSelectedRoleForAuth(targetRole);
      setCurrentRole('auth');
    }
  };

  const handleSaveOwnerProfile = async (updatedOwnerProfile) => {
    const nextConfig = {
      ...appConfig,
      ownerProfile: updatedOwnerProfile
    };
    await saveAppServerConfig(nextConfig);
    notify(
      'success',
      'Owner profile, photo, offerings, experience & qualifications saved.'
    );
  };

  const handleChangeOwnerPassword = async (e) => {
    e.preventDefault();
    const currentStoredOwnerPass = appConfig.ownerPassword || 'FYP$2026';
    if (ownerCurrentPassInput !== currentStoredOwnerPass) {
      notify('error', 'Current Owner password is incorrect.');
      return;
    }
    if (!ownerNewPassInput.trim() || ownerNewPassInput.trim().length < 4) {
      notify('warning', 'New Owner password must be at least 4 characters.');
      return;
    }
    if (ownerNewPassInput !== ownerConfirmPassInput) {
      notify('error', 'New Owner password and confirmation do not match.');
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
    notify('success', 'Owner password updated successfully.');
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
    notify('success', 'Profile, availability & qualifications saved.');
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
    notify('success', `Updated ${target.name}'s role to ${nextRole}.`);
  };

  const handleOwnerMoveBookingStage = async (booking, nextStage) => {
    const patch = {
      movementStage: nextStage,
      status: nextStage === 'confirmed' ? 'taken' : 'open',
      approvedProvider:
        nextStage === 'confirmed'
          ? booking.approvedProvider || {
              providerName: booking.targetRole || 'Assigned Partner',
              approvedAt: new Date().toISOString()
            }
          : nextStage === 'pending'
          ? null
          : booking.approvedProvider || null
    };

    setAllBookingsForOwner((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, ...patch } : b))
    );
    await firestoreSaveDoc('openBookings', booking.id, patch);
    setLastAutoUpdateAt(new Date());
    notify('success', `Moved "${booking.title}" to ${nextStage}.`);
  };

  const executePendingDelete = async () => {
    if (!pendingDeleteAction) return;
    const action = pendingDeleteAction;
    setPendingDeleteAction(null);

    if (action.type === 'booking') {
      setAllBookingsForOwner((prev) => prev.filter((b) => b.id !== action.id));
      await firestoreDeleteDoc('openBookings', action.id);
      setLastAutoUpdateAt(new Date());
      notify('success', 'Booking record deleted.');
    } else if (action.type === 'subscriber') {
      setSubscribers((prev) => prev.filter((s) => s.id !== action.id));
      if (selectedInspectedUser?.id === action.id) {
        setSelectedInspectedUser(null);
      }
      await firestoreDeleteDoc('subscribers', action.id);
      setLastAutoUpdateAt(new Date());
      notify('success', 'User account deleted.');
    } else if (action.type === 'ad') {
      const nextAds = (appConfig.ads || []).filter((a) => a.id !== action.id);
      await saveAppServerConfig({ ...appConfig, ads: nextAds });
      notify('success', 'Advertisement deleted.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      notify('warning', 'Please enter a new password (at least 4 characters).');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      notify('error', 'New password and confirmation do not match.');
      return;
    }

    if (currentUser?.password && currentPasswordInput !== currentUser.password) {
      notify('error', 'Your current password is incorrect.');
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
    notify('success', 'Your dashboard password has been updated.');
  };

  const handlePublishBookingOffer = async (pkgItem) => {
    const enrichedPkg = {
      ...pkgItem,
      providerId: pkgItem.providerId || currentUser?.id || '',
      providerName: pkgItem.providerName || currentUser?.name || 'Partner',
      providerContact: pkgItem.providerContact || currentUser?.contact || ''
    };

    setPublishedPackages((prev) => [enrichedPkg, ...prev]);
    await firestoreSaveDoc('publishedPackages', enrichedPkg.id, enrichedPkg);
    setLastAutoUpdateAt(new Date());
    notify(
      'success',
      'Booking created and published to the Welcome Tab auto-scrolling feed and Traveler Dashboard.'
    );
  };

  const handlePublishJobToAllGraduates = async (jobPayload) => {
    const employerId =
      normalizeContact(currentUser?.contact || currentUser?.id || currentUser?.name) ||
      `employer_${Date.now()}`;

    const fullJobDoc = {
      ...jobPayload,
      ownerId: employerId,
      ownerName: currentUser?.name || jobPayload.ownerName || 'Partner',
      ownerPhone: currentUser?.contact || jobPayload.ownerPhone || ''
    };

    setAllBookingsForOwner((prev) => [fullJobDoc, ...prev]);
    await firestoreSaveDoc('openBookings', fullJobDoc.id, fullJobDoc);
    setLastAutoUpdateAt(new Date());
    notify(
      'success',
      'Job posted and automatically dispatched to all Tourism Graduates, Guides & Consultants.'
    );
  };

  const handleRemovePublishedPackage = async (pkgId) => {
    setPublishedPackages((prev) => prev.filter((p) => p.id !== pkgId));
    await firestoreDeleteDoc('publishedPackages', pkgId);
    setLastAutoUpdateAt(new Date());
    notify('success', 'Package listing removed.');
  };

  const handleBookPackageOrProvider = async (item, bookingForm) => {
    const isCompanyOrGraduateBooker =
      Boolean(currentUser) &&
      ['graduate', 'agency', 'tour_company', 'car_rental'].includes(
        (currentRole || currentUser?.role || '').toLowerCase()
      );

    const activePI = bookingForm.travelerPI || travelerPI;
    if (!isCompanyOrGraduateBooker && (!activePI?.fullName || !activePI?.phone)) {
      setShowPiFormModal(true);
      notify(
        'warning',
        'Travelers must complete their Personal Information (PI) first before booking.'
      );
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

    const bookerDisplayName = isCompanyOrGraduateBooker
      ? bookingForm.organizationName || currentUser?.name || 'Partner Organization'
      : activePI.fullName;
    const bookerContact = isCompanyOrGraduateBooker
      ? bookingForm.contactPhoneOrEmail || currentUser?.contact || ''
      : activePI.phone;

    const companyBookingInfo = isCompanyOrGraduateBooker
      ? {
          role: currentRole || currentUser?.role,
          organizationName: bookingForm.organizationName || currentUser?.name || '',
          registrationOrLicense:
            bookingForm.registrationOrLicense || currentUser?.license || '',
          contactPhoneOrEmail:
            bookingForm.contactPhoneOrEmail || currentUser?.contact || '',
          serviceOrFleetDetails:
            bookingForm.serviceOrFleetDetails || currentUser?.title || '',
          graduateSpecialization:
            bookingForm.graduateSpecialization || currentUser?.institution || ''
        }
      : null;

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
      travelerPI: isCompanyOrGraduateBooker ? null : activePI,
      companyBookingInfo,
      notes: [
        bookingForm.notes,
        !isCompanyOrGraduateBooker && activePI
          ? `Traveler PI: ${activePI.fullName} (${activePI.nationality || 'Rwanda'})`
          : '',
        companyBookingInfo
          ? `${companyBookingInfo.organizationName}${
              companyBookingInfo.registrationOrLicense
                ? ` • Reg/Lic: ${companyBookingInfo.registrationOrLicense}`
                : ''
            }${
              companyBookingInfo.graduateSpecialization
                ? ` • Graduate Info: ${companyBookingInfo.graduateSpecialization}`
                : ''
            }`
          : '',
        targetContact ? `Provider Contact: ${targetContact}` : ''
      ]
        .filter(Boolean)
        .join(' • '),
      ownerId:
        normalizeContact(bookerContact || bookerDisplayName) ||
        `booker_${Date.now()}`,
      ownerName: bookerDisplayName,
      ownerPhone: bookerContact,
      status: 'open',
      movementStage: 'pending',
      applicants: [],
      approvedProvider: null,
      createdAt: Date.now()
    };

    setAllBookingsForOwner((prev) => [bookingDoc, ...prev]);
    await firestoreSaveDoc('openBookings', bookingId, bookingDoc);
    setLastAutoUpdateAt(new Date());
    notify(
      'success',
      `Booking request sent for "${isPkg ? item.title : targetName}". Added to Welcome feed and Pending Bookings.`
    );
  };

  const handleCreatePaidAd = async (e) => {
    e.preventDefault();
    if (!newAdForm.headline.trim() || !newAdForm.advertiserName.trim()) {
      notify('warning', 'Please enter the Paid Company name and Ad Headline.');
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
    notify('success', 'Paid company advertisement saved.');
  };

  const handleToggleAdActive = async (adId) => {
    const nextAds = (appConfig.ads || []).map((a) =>
      a.id === adId ? { ...a, active: !a.active } : a
    );
    await saveAppServerConfig({ ...appConfig, ads: nextAds });
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncementForm.title.trim() || !newAnnouncementForm.body.trim()) {
      notify('warning', 'Please enter both an announcement title and message.');
      return;
    }
    const createdAnn = {
      id: `ann-${Date.now()}`,
      title: newAnnouncementForm.title.trim(),
      body: newAnnouncementForm.body.trim(),
      targetRole: newAnnouncementForm.targetRole || 'all',
      createdAt: new Date().toISOString()
    };
    const nextConfig = {
      ...appConfig,
      announcements: [createdAnn, ...(appConfig.announcements || [])]
    };
    await saveAppServerConfig(nextConfig);
    setNewAnnouncementForm({ title: '', body: '', targetRole: 'all' });
    notify('success', 'Platform announcement published and saved to Firebase.');
  };

  const handleDeleteAnnouncement = async (annId) => {
    const nextConfig = {
      ...appConfig,
      announcements: (appConfig.announcements || []).filter((a) => a.id !== annId)
    };
    await saveAppServerConfig(nextConfig);
    notify('success', 'Announcement removed.');
  };

  const handleSaveSubscriptionPlan = async (e) => {
    e.preventDefault();
    if (!newPlanForm.name.trim()) {
      notify('warning', 'Please enter a subscription plan name.');
      return;
    }
    const planId =
      (newPlanForm.id && newPlanForm.id.trim()) ||
      newPlanForm.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString().slice(-4);
    const planDoc = {
      id: planId,
      name: newPlanForm.name.trim(),
      durationLabel: newPlanForm.durationLabel.trim() || `${Number(newPlanForm.days) || 30} Days Access`,
      days: Number(newPlanForm.days) || 30,
      price: Number(newPlanForm.price) || 0,
      badge: newPlanForm.badge.trim() || 'Partner Plan',
      order: subscriptionPlans.length + 1
    };
    setSubscriptionPlans((prev) => {
      const exists = prev.some((p) => p.id === planId);
      return exists ? prev.map((p) => (p.id === planId ? planDoc : p)) : [...prev, planDoc];
    });
    await firestoreSaveDoc('subscriptionPlans', planId, planDoc);
    setNewPlanForm({
      id: '',
      name: '',
      durationLabel: '30 Days Access',
      days: 30,
      price: 15000,
      badge: 'Partner Plan'
    });
    notify('success', `Subscription plan "${planDoc.name}" saved to Firebase.`);
  };

  const handleDeleteSubscriptionPlan = async (planId) => {
    setSubscriptionPlans((prev) => prev.filter((p) => p.id !== planId));
    await firestoreDeleteDoc('subscriptionPlans', planId);
    notify('success', 'Subscription plan deleted.');
  };

  const handleUpdateRoleCardCustom = (roleKey, field, val) => {
    setAppConfig((prev) => ({
      ...prev,
      roleCardsCustom: {
        ...(prev.roleCardsCustom || DEFAULT_APP_SERVER_CONFIG.roleCardsCustom),
        [roleKey]: {
          ...((prev.roleCardsCustom && prev.roleCardsCustom[roleKey]) ||
            DEFAULT_APP_SERVER_CONFIG.roleCardsCustom[roleKey]),
          [field]: val
        }
      }
    }));
  };

  const handleOwnerLogin = (e) => {
    e.preventDefault();
    const validOwnerPass = appConfig.ownerPassword || 'FYP$2026';
    if (ownerPinInput === validOwnerPass) {
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setLastAutoUpdateAt(new Date());
      setCurrentRole('owner');
      notify('success', 'Owner C.E.O. dashboard unlocked.');
    } else {
      notify('error', 'Invalid Owner password.');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const cleanContact = normalizeContact(authContactInput);
    if (!cleanContact) return;
    if (!authPasswordInput.trim()) {
      notify('warning', 'Please enter your password.');
      return;
    }

    if (authMode === 'login') {
      const existing = subscribers.find(
        (s) =>
          normalizeContact(s.contact) === cleanContact &&
          s.role === selectedRoleForAuth
      );
      if (!existing) {
        notify(
          'warning',
          'Account not found for this role. Please switch to "New Registration" first.'
        );
        return;
      }
      if (existing.password && existing.password !== authPasswordInput.trim()) {
        notify('error', 'Incorrect password. Please try again.');
        return;
      }
      setCurrentUser(existing);
      setIsSubscribed(checkSubscriptionActive(existing));
      setCurrentRole(existing.role);
      setLastAutoUpdateAt(new Date());
      setAuthPasswordInput('');
      notify('success', `Welcome back, ${existing.name}.`);
      return;
    }

    if (!appConfig.allowNewSignups) {
      notify(
        'warning',
        'New registrations are temporarily paused by the platform administrator.'
      );
      return;
    }
    if (!authNameInput.trim()) {
      notify('warning', 'Please enter your Full Name or Organization Name.');
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
    notify(
      'success',
      `Registration submitted. Pay ${Number(chosenPlan.price).toLocaleString()} RWF via MTN MoMo Code ${appConfig.momoCode} to activate ${chosenPlan.name}.`
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
    notify('success', `Granted access to ${sub.name}.`);
  };

  const handleRevokeSubscriber = async (sub) => {
    const updated = { ...sub, status: 'suspended' };
    setSubscribers(subscribers.map((s) => (s.id === sub.id ? updated : s)));
    await firestoreSaveDoc('subscribers', sub.id, updated);
    setLastAutoUpdateAt(new Date());
    notify('warning', `Revoked access for ${sub.name}.`);
  };

  const roleLabelMap = {
    graduate: t.graduateTitle,
    agency: t.agencyTitle,
    tour_company: t.tourCompanyTitle,
    car_rental: t.carRentalTitle,
    traveler: t.travelerTitle,
    owner: 'Platform Owner (C.E.O.)'
  };

  const isSignedInAccount =
    Boolean(currentUser) || Boolean(travelerPI) || currentRole === 'owner';
  const isLoggedInSession =
    Boolean(currentUser) || Boolean(travelerPI) || currentRole === 'owner';

  const visibleAnnouncements = (appConfig.announcements || []).filter(
    (ann) => ann.targetRole === 'all' || ann.targetRole === currentRole
  );

  const primaryTheme = appConfig.primaryColor || '#234E40';
  const accentTheme = appConfig.accentColor || '#3B6E5B';
  const customRoleCards =
    appConfig.roleCardsCustom || DEFAULT_APP_SERVER_CONFIG.roleCardsCustom;

  const pendingSignupsCount = subscribers.filter((s) => s.status === 'pending').length;

  const filteredRoleUsers = subscribers.filter((u) =>
    allRolesFilter === 'all' ? true : u.role === allRolesFilter
  );

  const isTravelerPiCompleted = Boolean(travelerPI?.fullName && travelerPI?.phone);

  const activeWelcomeFeatures = (appConfig.welcomeCustomFeatures || []).filter(
    (f) => f && f.active !== false
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

            {isTravelerPiCompleted && !currentUser && (
              <button
                type="button"
                onClick={() => setCurrentRole('traveler')}
                className="bg-emerald-500/30 hover:bg-emerald-500/40 px-3 py-1.5 rounded-full font-bold text-white"
              >
                🌍 {travelerPI.fullName} • Full Dashboard
              </button>
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

            {isSignedInAccount && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow flex items-center gap-1 transition"
              >
                <span>🚪</span>
                <span>{t.signOutBtn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        <StatusBanner
          banner={statusBanner}
          onDismiss={() => setStatusBanner(null)}
        />

        {currentRole === 'welcome' && (
          <div className="gl-welcome-caps-tnr space-y-8">
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

              {appConfig.welcomeBannerText && (
                <div className="max-w-3xl mx-auto bg-emerald-50/80 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#234E40]">
                  ✨ {appConfig.welcomeBannerText}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 text-left">
                {[
                  {
                    role: 'graduate',
                    icon: '🎓',
                    title: customRoleCards?.graduate?.title || t.graduateTitle,
                    desc: customRoleCards?.graduate?.desc || t.graduateDesc
                  },
                  {
                    role: 'agency',
                    icon: '✈️',
                    title: customRoleCards?.agency?.title || t.agencyTitle,
                    desc: customRoleCards?.agency?.desc || t.agencyDesc
                  },
                  {
                    role: 'tour_company',
                    icon: '🚐',
                    title: customRoleCards?.tour_company?.title || t.tourCompanyTitle,
                    desc: customRoleCards?.tour_company?.desc || t.tourCompanyDesc
                  },
                  {
                    role: 'car_rental',
                    icon: '🚗',
                    title: customRoleCards?.car_rental?.title || t.carRentalTitle,
                    desc: customRoleCards?.car_rental?.desc || t.carRentalDesc
                  },
                  {
                    role: 'traveler',
                    icon: '🌍',
                    title: customRoleCards?.traveler?.title || t.travelerTitle,
                    desc: customRoleCards?.traveler?.desc || t.travelerDesc
                  }
                ].map((card) => (
                  <div
                    key={card.role}
                    onClick={() => {
                      if (card.role === 'traveler') {
                        setCurrentRole('traveler');
                        if (!isTravelerPiCompleted) {
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

            {activeWelcomeFeatures.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 text-xs">
                <div className="border-b pb-3">
                  <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                    ✨ CUSTOM WELCOMING FEATURES
                  </span>
                  <h3 className="text-base md:text-lg font-black text-slate-900 mt-1">
                    FEATURED SERVICES &amp; TOOLS ({activeWelcomeFeatures.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeWelcomeFeatures.map((feat) => (
                    <div
                      key={feat.id}
                      className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xl">{feat.icon || '✨'}</span>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
                            {feat.badge || 'FEATURE'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900">{feat.title}</h4>
                        {feat.description && <p className="text-slate-600">{feat.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTriggerCustomFeature(feat)}
                        className="w-full py-2 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl transition"
                      >
                        {feat.ctaLabel || 'OPEN'} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <WelcomeAutoScrollingBookings
              publishedPackages={publishedPackages}
              allBookings={allBookingsForOwner}
              onSelectBookingOffer={handleSelectWelcomeBookingCard}
            />

            <WelcomePartnersShowcase
              subscribers={subscribers}
              onSelectPartner={(partner) => {
                const partnerTarget = {
                  ...partner,
                  bookingType: 'provider'
                };
                if (!isTravelerPiCompleted) {
                  setPendingPiAction({ item: partnerTarget, type: 'provider' });
                  setShowPiFormModal(true);
                  return;
                }
                setCurrentRole('traveler');
                setExternalBookingItem(partnerTarget);
              }}
            />

            <TravelersOnWelcomeDirectory
              travelersList={travelersDirectory}
              onStartPrivateChatWithTraveler={handleStartPrivateChatWithTraveler}
              lang={language}
            />
          </div>
        )}

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
                    {isTravelerPiCompleted
                      ? '🪪 Edit Personal Info (PI)'
                      : '🪪 Fill Out Personal Info (PI) *'}
                  </button>
                )}

                {currentRole !== 'traveler' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateBookingsPostJobsPanel(!showCreateBookingsPostJobsPanel);
                        if (!showCreateBookingsPostJobsPanel) {
                          setShowUserProfileEditor(false);
                        }
                      }}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl shadow flex items-center gap-1.5 transition ${
                        showCreateBookingsPostJobsPanel
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-100 text-[#234E40] hover:bg-emerald-200'
                      }`}
                    >
                      <span>➕</span>
                      <span>{t.createBookingsPostJobsBtn}</span>
                    </button>

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
                      <span>Booking &amp; Job Management</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserProfileEditor(!showUserProfileEditor);
                        if (!showUserProfileEditor) {
                          setShowCreateBookingsPostJobsPanel(false);
                        }
                      }}
                      className="px-4 py-2 bg-[#234E40] hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow"
                    >
                      {showUserProfileEditor ? 'Hide Profile Editor' : '👤 Edit Profile'}
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

            <RoleCustomFeaturesSection
              features={appConfig.appCustomFeatures || []}
              currentRole={currentRole}
              onTriggerFeature={handleTriggerCustomFeature}
            />

            {currentRole === 'traveler' && !isTravelerPiCompleted && (
              <TravelerPersonalInfoForm
                travelerPI={travelerPI}
                onSavePI={handleSaveTravelerPI}
                lang={language}
                onNotify={notify}
              />
            )}

            {showCreateBookingsPostJobsPanel && currentRole !== 'traveler' && (
              <CreateBookingsAndPostJobsPanel
                profileData={currentUser || { role: currentRole }}
                label={roleLabelMap[currentRole]}
                publishedPackages={publishedPackages}
                onPublishBooking={handlePublishBookingOffer}
                onPublishJobToAllGraduates={handlePublishJobToAllGraduates}
                onRemovePublishedPackage={handleRemovePublishedPackage}
                onClose={() => setShowCreateBookingsPostJobsPanel(false)}
                onNotify={notify}
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
                onNotify={notify}
              />
            )}

            {currentRole === 'traveler' && isTravelerPiCompleted && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase bg-[#234E40] text-white px-2.5 py-0.5 rounded-full">
                      ✓ Full Traveler Dashboard Unlocked
                    </span>
                    <p className="font-bold text-slate-900 mt-1">
                      PI Verified for <strong>{travelerPI.fullName}</strong> ({travelerPI.phone} •{' '}
                      {travelerPI.nationality}) — You now have full access to all created bookings, packages, partners, and private chat.
                    </p>
                  </div>
                </div>

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
                  onNotify={notify}
                />

                <BookingMarketplace
                  currentUser={currentUser}
                  currentRole={currentRole}
                  travelerPI={travelerPI}
                  onOpenCreateBookingsPostJobs={() =>
                    setShowCreateBookingsPostJobsPanel(true)
                  }
                  externalChatTarget={externalChatTarget}
                  onClearExternalChatTarget={() => setExternalChatTarget(null)}
                  onNotify={notify}
                />
              </div>
            )}

            {currentRole !== 'traveler' && showBookingManagementPanel && (
              <BookingMarketplace
                currentUser={currentUser}
                currentRole={currentRole}
                travelerPI={travelerPI}
                onOpenCreateBookingsPostJobs={() =>
                  setShowCreateBookingsPostJobsPanel(true)
                }
                externalChatTarget={externalChatTarget}
                onClearExternalChatTarget={() => setExternalChatTarget(null)}
                onNotify={notify}
              />
            )}
          </div>
        )}

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
                  onClick={() => setOwnerTab('bookings_jobs')}
                  className={`px-4 py-2 rounded-xl flex items-center gap-1.5 ${
                    ownerTab === 'bookings_jobs'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <span>📊 Bookings &amp; Jobs</span>
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/25">
                    {allBookingsForOwner.length}
                  </span>
                </button>
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
                  ⚙️ Features &amp; Server
                </button>
              </div>
            </div>

            {ownerTab === 'bookings_jobs' && (
              <OwnerBookingsAndJobsTracker
                allBookings={allBookingsForOwner}
                publishedPackages={publishedPackages}
                onMoveBookingStage={handleOwnerMoveBookingStage}
                onDeleteBooking={(bookingId) =>
                  setPendingDeleteAction({ type: 'booking', id: bookingId })
                }
                onDeletePackage={handleRemovePublishedPackage}
                onOpenChatWithBookingParty={(booking) => {
                  setExternalChatTarget({
                    contextId: booking.id,
                    contextTitle: booking.title,
                    otherUserId: booking.ownerId || booking.ownerPhone || booking.ownerName,
                    otherUserName: booking.ownerName || 'Traveler / Client'
                  });
                  setCurrentRole('welcome');
                }}
              />
            )}

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
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-[#234E40]">
                                {roleLabelMap[sub.role] || sub.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              📞 <strong>{sub.contact}</strong> • Plan:{' '}
                              <strong>{sub.planName || 'Starter'}</strong> (
                              {Number(sub.amountPaid || 0).toLocaleString()} RWF)
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              sub.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'suspended'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApproveSubscriber(sub)}
                            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                          >
                            ✓ Grant Access
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeSubscriber(sub)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold"
                          >
                            Revoke Access
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeleteAction({ type: 'subscriber', id: sub.id })
                            }
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

            {ownerTab === 'all_roles' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                      Role Directory &amp; Role Assignment
                    </span>
                    <h3 className="font-bold text-base text-slate-900">
                      🎭 All Users Across Every Role ({subscribers.length})
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-1.5 font-bold">
                    {[
                      { id: 'all', label: `All (${subscribers.length})` },
                      {
                        id: 'graduate',
                        label: `Graduates/Guides (${
                          subscribers.filter((u) => u.role === 'graduate').length
                        })`
                      },
                      {
                        id: 'agency',
                        label: `Agencies (${
                          subscribers.filter((u) => u.role === 'agency').length
                        })`
                      },
                      {
                        id: 'tour_company',
                        label: `Tour Cos (${
                          subscribers.filter((u) => u.role === 'tour_company').length
                        })`
                      },
                      {
                        id: 'car_rental',
                        label: `Car Rentals (${
                          subscribers.filter((u) => u.role === 'car_rental').length
                        })`
                      },
                      {
                        id: 'traveler',
                        label: `Travelers (${
                          subscribers.filter((u) => u.role === 'traveler').length
                        })`
                      }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAllRolesFilter(f.id)}
                        className={`px-3 py-1.5 rounded-xl ${
                          allRolesFilter === f.id
                            ? 'bg-[#234E40] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRoleUsers.length === 0 ? (
                  <p className="text-slate-500">No users found for this role filter.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredRoleUsers.map((usr) => (
                      <div
                        key={usr.id}
                        className="p-4 rounded-2xl border bg-slate-50 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {usr.photoUrl ? (
                              <img
                                src={usr.photoUrl}
                                alt={usr.name}
                                className="w-11 h-11 rounded-xl object-cover border"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-[#234E40] font-black flex items-center justify-center text-sm">
                                {(usr.name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-extrabold text-sm text-slate-900">
                                {usr.name}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                {usr.contact} {usr.email ? `• ${usr.email}` : ''}
                              </p>
                              {usr.title && (
                                <p className="text-[11px] text-[#3B6E5B] font-semibold">
                                  {usr.title}
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              usr.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : usr.status === 'suspended'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {usr.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Role:</span>
                            <select
                              value={usr.role || 'traveler'}
                              onChange={(e) =>
                                handleOwnerUpdateUserRole(usr.id, e.target.value)
                              }
                              className="p-1.5 border rounded-lg bg-white font-bold text-[11px]"
                            >
                              <option value="graduate">Graduate / Guide / Consultant</option>
                              <option value="agency">Travel Agency</option>
                              <option value="tour_company">Tour Company</option>
                              <option value="car_rental">Car Rental</option>
                              <option value="traveler">Traveler</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInspectedUser(usr);
                                setOwnerTab('pending');
                              }}
                              className="px-2.5 py-1 bg-slate-800 text-white rounded-lg font-bold"
                            >
                              Inspect CV
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDeleteAction({ type: 'subscriber', id: usr.id })
                              }
                              className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {ownerTab === 'pending' && (
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                  <h3 className="font-bold text-base">
                    All Registered Users ({subscribers.length})
                  </h3>
                  {subscribers.length === 0 ? (
                    <p className="text-slate-500">No users registered yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b text-slate-500">
                            <th className="py-2">Photo &amp; Name</th>
                            <th className="py-2">Role</th>
                            <th className="py-2">Contact</th>
                            <th className="py-2">Plan &amp; Amount</th>
                            <th className="py-2">Status</th>
                            <th className="py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {subscribers.map((sub) => (
                            <tr key={sub.id}>
                              <td className="py-3">
                                <div className="flex items-center gap-2.5">
                                  {sub.photoUrl ? (
                                    <img
                                      src={sub.photoUrl}
                                      alt={sub.name}
                                      className="w-9 h-9 rounded-lg object-cover border"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#234E40] font-black flex items-center justify-center text-xs">
                                      {(sub.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-slate-900">{sub.name}</p>
                                    <p className="text-[11px] text-slate-500">
                                      {sub.institution || sub.title || ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 capitalize">{sub.role}</td>
                              <td className="py-3 font-semibold">{sub.contact}</td>
                              <td className="py-3">
                                <span className="font-bold text-[#234E40]">
                                  {sub.planName || 'Monthly'}
                                </span>{' '}
                                • {Number(sub.amountPaid || 0).toLocaleString()} RWF
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                                  Inspect CV
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveSubscriber(sub)}
                                  className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold"
                                >
                                  Approve
                                </button>
                                {sub.status === 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeSubscriber(sub)}
                                    className="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-bold"
                                  >
                                    Revoke
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingDeleteAction({ type: 'subscriber', id: sub.id })
                                  }
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

                {selectedInspectedUser && (
                  <div className="bg-white p-6 rounded-2xl border-2 border-[#234E40] shadow-md space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-3">
                        {selectedInspectedUser.photoUrl && (
                          <img
                            src={selectedInspectedUser.photoUrl}
                            alt={selectedInspectedUser.name}
                            className="w-12 h-12 rounded-xl object-cover border"
                          />
                        )}
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                            Inspected User Profile &amp; CV
                          </span>
                          <h4 className="text-base font-black text-slate-900">
                            {selectedInspectedUser.name}
                          </h4>
                          <p className="text-slate-500">
                            {selectedInspectedUser.title || selectedInspectedUser.role} •{' '}
                            {selectedInspectedUser.contact}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedInspectedUser(null)}
                        className="px-3 py-1 bg-slate-100 rounded-lg font-bold text-slate-600"
                      >
                        Close ✕
                      </button>
                    </div>

                    {selectedInspectedUser.bio && (
                      <p className="text-slate-700">{selectedInspectedUser.bio}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1.5">
                        <p className="font-extrabold text-[#234E40]">Services Provided</p>
                        {(selectedInspectedUser.servicesProvided || []).length === 0 ? (
                          <p className="text-slate-400 italic">None added yet.</p>
                        ) : (
                          (selectedInspectedUser.servicesProvided || []).map((s, idx) => (
                            <p key={idx} className="font-semibold text-slate-800">
                              • {s}
                            </p>
                          ))
                        )}
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1.5">
                        <p className="font-extrabold text-[#234E40]">Experience</p>
                        {(selectedInspectedUser.experiences || []).length === 0 ? (
                          <p className="text-slate-400 italic">None added yet.</p>
                        ) : (
                          (selectedInspectedUser.experiences || []).map((exp) => (
                            <div key={exp.id} className="border-b last:border-b-0 pb-1.5">
                              <p className="font-bold text-slate-900">
                                {exp.role}{' '}
                                {exp.organization ? `— ${exp.organization}` : ''}
                              </p>
                              {exp.duration && (
                                <p className="text-[11px] text-[#3B6E5B]">{exp.duration}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1.5">
                        <p className="font-extrabold text-[#234E40]">Qualifications</p>
                        {(selectedInspectedUser.qualifications || []).length === 0 ? (
                          <p className="text-slate-400 italic">None added yet.</p>
                        ) : (
                          (selectedInspectedUser.qualifications || []).map((q) => (
                            <div key={q.id} className="border-b last:border-b-0 pb-1.5">
                              <p className="font-bold text-slate-900">🎓 {q.title}</p>
                              <p className="text-[11px] text-slate-600">
                                {[q.institution, q.year].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {ownerTab === 'ads' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                <form
                  onSubmit={handleCreatePaidAd}
                  className="bg-white p-6 rounded-2xl border shadow-sm space-y-3"
                >
                  <h3 className="font-bold text-base text-slate-900">
                    Create Paid Company Pop-Up Ad
                  </h3>
                  <p className="text-slate-500">
                    Paid company ads pop up for users and let travelers/clients book directly from the ad.
                  </p>
                  <div>
                    <label className="font-bold text-slate-700">Paid Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Volcanoes Gorilla Lodge / Rwanda 4x4 Fleet"
                      value={newAdForm.advertiserName}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, advertiserName: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700">Company Phone / Contact</label>
                      <input
                        type="text"
                        placeholder="+25078XXXXXXX"
                        value={newAdForm.advertiserContact}
                        onChange={(e) =>
                          setNewAdForm({
                            ...newAdForm,
                            advertiserContact: e.target.value
                          })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Ad Badge / Offer Tag</label>
                      <input
                        type="text"
                        placeholder="e.g. 20% Off Safari"
                        value={newAdForm.badge}
                        onChange={(e) =>
                          setNewAdForm({ ...newAdForm, badge: e.target.value })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Ad Headline *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Book 4x4 Safari Vehicles &amp; Guided Tours Today"
                      value={newAdForm.headline}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, headline: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Ad Details</label>
                    <input
                      type="text"
                      placeholder="Short promotion message..."
                      value={newAdForm.description}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, description: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700">Booking Button Text</label>
                      <input
                        type="text"
                        value={newAdForm.ctaLabel}
                        onChange={(e) =>
                          setNewAdForm({ ...newAdForm, ctaLabel: e.target.value })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Show To</label>
                      <select
                        value={newAdForm.targetAudience}
                        onChange={(e) =>
                          setNewAdForm({ ...newAdForm, targetAudience: e.target.value })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl bg-white"
                      >
                        <option value="all">All Visitors &amp; Users</option>
                        <option value="traveler">Travelers</option>
                        <option value="graduate">Graduates / Guides / Consultants</option>
                        <option value="agency">Travel Agencies</option>
                        <option value="tour_company">Tour Companies</option>
                        <option value="car_rental">Car Rentals</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 font-bold text-slate-700 pt-1">
                    <input
                      type="checkbox"
                      checked={newAdForm.active}
                      onChange={(e) =>
                        setNewAdForm({ ...newAdForm, active: e.target.checked })
                      }
                    />
                    <span>Active Pop-Up Ad</span>
                  </label>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#234E40] text-white font-bold rounded-xl"
                  >
                    + Publish Paid Company Ad
                  </button>
                </form>

                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-3">
                  <h3 className="font-bold text-base text-slate-900">
                    Active &amp; Saved Ads ({(appConfig.ads || []).length})
                  </h3>
                  {(appConfig.ads || []).length === 0 ? (
                    <p className="text-slate-400 italic">No paid ads created yet.</p>
                  ) : (
                    (appConfig.ads || []).map((ad) => (
                      <div
                        key={ad.id}
                        className="p-4 rounded-2xl border bg-slate-50 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                              {ad.badge || 'Paid Partner'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                ad.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {ad.active ? 'Pop-Up Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="font-extrabold text-sm text-slate-900">
                            {ad.headline}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Company: <strong>{ad.advertiserName}</strong>{' '}
                            {ad.advertiserContact ? `(${ad.advertiserContact})` : ''}
                          </p>
                          {ad.description && (
                            <p className="text-slate-600">{ad.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleAdActive(ad.id)}
                            className="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-bold"
                          >
                            {ad.active ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeleteAction({ type: 'ad', id: ad.id })
                            }
                            className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {ownerTab === 'owner_profile' && (
              <div className="space-y-6">
                <UserAndOwnerProfileSection
                  profileData={appConfig.ownerProfile}
                  label="Owner / C.E.O."
                  onSave={handleSaveOwnerProfile}
                  isSaving={isSaving}
                  showProviderExtras={false}
                  onNotify={notify}
                />

                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 text-xs">
                  <div className="border-b pb-3">
                    <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                      Owner Security
                    </span>
                    <h3 className="text-base font-black text-slate-900">
                      Change Owner Dashboard Password
                    </h3>
                    <p className="text-slate-500">
                      Update the password used to unlock the Owner C.E.O. dashboard.
                    </p>
                  </div>

                  <form
                    onSubmit={handleChangeOwnerPassword}
                    className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                  >
                    <div>
                      <label className="font-bold text-slate-700">Current Owner Password *</label>
                      <input
                        type="password"
                        required
                        value={ownerCurrentPassInput}
                        onChange={(e) => setOwnerCurrentPassInput(e.target.value)}
                        placeholder="Enter current password"
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
                        placeholder="New password (min 4 chars)"
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
                        placeholder="Confirm new password"
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white font-bold rounded-xl shadow"
                    >
                      {isSaving ? 'Saving...' : 'Update Owner Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {ownerTab === 'server' && (
              <div className="space-y-6 text-xs">
                <OwnerCustomFeaturesManager
                  welcomeFeatures={appConfig.welcomeCustomFeatures || []}
                  appFeatures={appConfig.appCustomFeatures || []}
                  onSaveFeatures={async (nextWelcome, nextApp) => {
                    await saveAppServerConfig({
                      ...appConfig,
                      welcomeCustomFeatures: nextWelcome,
                      appCustomFeatures: nextApp
                    });
                  }}
                  isSaving={isSaving}
                  onNotify={notify}
                />

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveAppServerConfig(appConfig);
                    notify(
                      'success',
                      'All Server & App configuration settings saved to Firebase.'
                    );
                  }}
                  className="bg-white p-6 rounded-2xl border shadow-sm space-y-5"
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        Global App &amp; Server Configuration
                      </h3>
                      <p className="text-slate-500">
                        Changes save to Firebase and update the platform across users.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-[#234E40] text-white font-bold rounded-xl shadow"
                    >
                      {isSaving ? 'Saving...' : 'Save All Server Settings'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <label className="font-bold text-slate-700">
                        Welcome Banner Top Note
                      </label>
                      <input
                        type="text"
                        value={appConfig.welcomeNote || ''}
                        onChange={(e) =>
                          setAppConfig({ ...appConfig, welcomeNote: e.target.value })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">
                        MTN MoMo Merchant / Code
                      </label>
                      <input
                        type="text"
                        value={appConfig.momoCode}
                        onChange={(e) =>
                          setAppConfig({ ...appConfig, momoCode: e.target.value })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700">Hero Tagline</label>
                      <input
                        type="text"
                        value={appConfig.tagline}
                        onChange={(e) =>
                          setAppConfig({ ...appConfig, tagline: e.target.value })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Traveler Badge Text</label>
                      <input
                        type="text"
                        value={appConfig.travelerFreeBadge}
                        onChange={(e) =>
                          setAppConfig({
                            ...appConfig,
                            travelerFreeBadge: e.target.value
                          })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Hero Subtitle</label>
                    <input
                      type="text"
                      value={appConfig.subtitle}
                      onChange={(e) =>
                        setAppConfig({ ...appConfig, subtitle: e.target.value })
                      }
                      className="w-full mt-1 p-2.5 border rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <label className="font-bold text-slate-700">
                        Primary Brand Color
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={primaryTheme}
                          onChange={(e) =>
                            setAppConfig({ ...appConfig, primaryColor: e.target.value })
                          }
                          className="h-10 w-14 rounded cursor-pointer border"
                        />
                        <input
                          type="text"
                          value={primaryTheme}
                          onChange={(e) =>
                            setAppConfig({ ...appConfig, primaryColor: e.target.value })
                          }
                          className="flex-1 p-2.5 border rounded-xl font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">
                        Accent / Secondary Color
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={accentTheme}
                          onChange={(e) =>
                            setAppConfig({ ...appConfig, accentColor: e.target.value })
                          }
                          className="h-10 w-14 rounded cursor-pointer border"
                        />
                        <input
                          type="text"
                          value={accentTheme}
                          onChange={(e) =>
                            setAppConfig({ ...appConfig, accentColor: e.target.value })
                          }
                          className="flex-1 p-2.5 border rounded-xl font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <h4 className="font-extrabold text-sm text-[#234E40]">
                      Customize Welcome Role Cards
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: 'graduate', label: 'Graduates / Guides / Consultants Card' },
                        { key: 'agency', label: 'Travel Agencies Card' },
                        { key: 'tour_company', label: 'Tour Companies Card' },
                        { key: 'car_rental', label: 'Car Rentals Card' },
                        { key: 'traveler', label: 'Traveler / Visitor Card' }
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="p-3 rounded-xl border bg-slate-50 space-y-2"
                        >
                          <p className="font-bold text-slate-800">{item.label}</p>
                          <input
                            type="text"
                            value={customRoleCards?.[item.key]?.title || ''}
                            onChange={(e) =>
                              handleUpdateRoleCardCustom(item.key, 'title', e.target.value)
                            }
                            placeholder="Card Title"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                          <input
                            type="text"
                            value={customRoleCards?.[item.key]?.desc || ''}
                            onChange={(e) =>
                              handleUpdateRoleCardCustom(item.key, 'desc', e.target.value)
                            }
                            placeholder="Card Description"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 pt-2 border-t">
                    <label className="flex items-center gap-2 font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={Boolean(appConfig.allowNewSignups)}
                        onChange={(e) =>
                          setAppConfig({
                            ...appConfig,
                            allowNewSignups: e.target.checked
                          })
                        }
                      />
                      <span>Allow New Partner Registrations</span>
                    </label>
                    <label className="flex items-center gap-2 font-bold text-red-700">
                      <input
                        type="checkbox"
                        checked={Boolean(appConfig.maintenanceMode)}
                        onChange={(e) =>
                          setAppConfig({
                            ...appConfig,
                            maintenanceMode: e.target.checked
                          })
                        }
                      />
                      <span>Enable Maintenance Mode</span>
                    </label>
                  </div>

                  {appConfig.maintenanceMode && (
                    <div>
                      <label className="font-bold text-slate-700">Maintenance Notice</label>
                      <input
                        type="text"
                        value={appConfig.maintenanceMessage}
                        onChange={(e) =>
                          setAppConfig({
                            ...appConfig,
                            maintenanceMessage: e.target.value
                          })
                        }
                        className="w-full mt-1 p-2.5 border rounded-xl"
                      />
                    </div>
                  )}
                </form>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                    <h3 className="font-bold text-base text-slate-900">
                      Subscription Plans Manager
                    </h3>
                    <form
                      onSubmit={handleSaveSubscriptionPlan}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-xl border"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Plan Name (e.g. Half-Year Pass)"
                        value={newPlanForm.name}
                        onChange={(e) =>
                          setNewPlanForm({ ...newPlanForm, name: e.target.value })
                        }
                        className="p-2 border rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Duration Label (e.g. 180 Days)"
                        value={newPlanForm.durationLabel}
                        onChange={(e) =>
                          setNewPlanForm({
                            ...newPlanForm,
                            durationLabel: e.target.value
                          })
                        }
                        className="p-2 border rounded-xl bg-white"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Days"
                        value={newPlanForm.days}
                        onChange={(e) =>
                          setNewPlanForm({ ...newPlanForm, days: e.target.value })
                        }
                        className="p-2 border rounded-xl bg-white"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Price (RWF)"
                        value={newPlanForm.price}
                        onChange={(e) =>
                          setNewPlanForm({ ...newPlanForm, price: e.target.value })
                        }
                        className="p-2 border rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Badge (e.g. Save 20%)"
                        value={newPlanForm.badge}
                        onChange={(e) =>
                          setNewPlanForm({ ...newPlanForm, badge: e.target.value })
                        }
                        className="p-2 border rounded-xl bg-white"
                      />
                      <button
                        type="submit"
                        className="p-2 bg-[#234E40] text-white font-bold rounded-xl"
                      >
                        + Save Plan
                      </button>
                    </form>

                    <div className="space-y-2">
                      {subscriptionPlans.map((pl) => (
                        <div
                          key={pl.id}
                          className="p-3 rounded-xl border flex items-center justify-between bg-slate-50"
                        >
                          <div>
                            <p className="font-bold text-slate-900">
                              {pl.name} •{' '}
                              <span className="text-[#234E40]">
                                {Number(pl.price).toLocaleString()} RWF
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {pl.durationLabel} ({pl.days} days) • {pl.badge}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscriptionPlan(pl.id)}
                            className="text-red-600 font-bold hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                    <h3 className="font-bold text-base text-slate-900">
                      Platform Announcements Banner
                    </h3>
                    <form
                      onSubmit={handleAddAnnouncement}
                      className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Announcement Title"
                        value={newAnnouncementForm.title}
                        onChange={(e) =>
                          setNewAnnouncementForm({
                            ...newAnnouncementForm,
                            title: e.target.value
                          })
                        }
                        className="w-full p-2 border rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Announcement Message..."
                        value={newAnnouncementForm.body}
                        onChange={(e) =>
                          setNewAnnouncementForm({
                            ...newAnnouncementForm,
                            body: e.target.value
                          })
                        }
                        className="w-full p-2 border rounded-xl bg-white"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newAnnouncementForm.targetRole}
                          onChange={(e) =>
                            setNewAnnouncementForm({
                              ...newAnnouncementForm,
                              targetRole: e.target.value
                            })
                          }
                          className="flex-1 p-2 border rounded-xl bg-white"
                        >
                          <option value="all">All Roles</option>
                          <option value="traveler">Travelers</option>
                          <option value="graduate">Graduates / Guides / Consultants</option>
                          <option value="agency">Travel Agencies</option>
                          <option value="tour_company">Tour Companies</option>
                          <option value="car_rental">Car Rentals</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#3B6E5B] text-white font-bold rounded-xl"
                        >
                          Publish Notice
                        </button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      {(appConfig.announcements || []).map((ann) => (
                        <div
                          key={ann.id}
                          className="p-3 rounded-xl border flex items-center justify-between bg-amber-50/50"
                        >
                          <div>
                            <p className="font-bold text-slate-900">
                              {ann.title}{' '}
                              <span className="text-[10px] uppercase text-[#3B6E5B]">
                                ({ann.targetRole})
                              </span>
                            </p>
                            <p className="text-slate-600">{ann.body}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="text-red-600 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showPiFormModal && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-auto">
            <TravelerPersonalInfoForm
              travelerPI={travelerPI}
              onSavePI={handleSaveTravelerPI}
              onCancel={() => {
                setShowPiFormModal(false);
                setPendingPiAction(null);
              }}
              lang={language}
              onNotify={notify}
            />
          </div>
        </div>
      )}

      {activePopupAd && currentRole !== 'owner' && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase">
                Sponsored • {activePopupAd.badge || 'Paid Partner'}
              </span>
              <button
                type="button"
                onClick={() => setActivePopupAd(null)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase text-[#3B6E5B]">
                {activePopupAd.advertiserName}
              </p>
              <h3 className="text-lg font-black text-slate-900">
                {activePopupAd.headline}
              </h3>
              {activePopupAd.description && (
                <p className="text-slate-600 text-xs">{activePopupAd.description}</p>
              )}
              {activePopupAd.advertiserContact && (
                <p className="text-[11px] text-slate-500">
                  Contact: <strong>{activePopupAd.advertiserContact}</strong>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setActivePopupAd(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={() => handleBookFromAd(activePopupAd)}
                className="px-5 py-2.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-extrabold shadow"
              >
                {activePopupAd.ctaLabel || 'Book Now'} →
              </button>
            </div>
          </div>
        </div>
      )}

      {showOwnerPinModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleOwnerLogin}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="border-b pb-2">
              <span className="text-[10px] font-extrabold uppercase text-[#3B6E5B]">
                Restricted C.E.O. Access
              </span>
              <h3 className="text-base font-black text-slate-900">
                Enter Owner Password
              </h3>
            </div>
            <div>
              <label className="font-bold text-slate-700">Owner Password</label>
              <input
                type="password"
                autoFocus
                placeholder="Enter Owner Password"
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOwnerPinModal(false);
                  setOwnerPinInput('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#234E40] text-white rounded-xl font-bold"
              >
                Unlock Dashboard →
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingDeleteAction && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <h4 className="font-black text-base text-slate-900">Confirm Deletion</h4>
            <p className="text-slate-600">
              Are you sure you want to permanently delete this{' '}
              {pendingDeleteAction.type === 'booking'
                ? 'booking record'
                : pendingDeleteAction.type === 'subscriber'
                ? 'user account'
                : 'advertisement'}
              ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteAction(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePendingDelete}
                className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-6 px-4 md:px-8 text-xs mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-white">{appConfig.appName}</strong> •{' '}
            {appConfig.footerLocation}
          </div>
          <div>{appConfig.footerLeadershipText}</div>
        </div>
      </footer>
    </div>
  );
}
