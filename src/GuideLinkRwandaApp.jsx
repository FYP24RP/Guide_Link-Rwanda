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
  commissionRatePercent: 10,
  primaryColor: '#234E40',
  secondaryColor: '#3B6E5B',
  travelerFreeBadge: 'Travelers: FREE',
  allowNewSignups: true,
  maintenanceMode: false,
  maintenanceMessage: 'Platform maintenance in progress. Please check back shortly.',
  welcomeBannerText: '',
  adPopupEnabled: false,
  adPopupTitle: 'Featured Partner Spotlight',
  adPopupMessage: '',
  destinations: [
    'Volcanoes National Park / Musanze',
    'Nyungwe Forest & Lake Kivu (Rusizi / Karongi)',
    'Akagera National Park Safari',
    'Kigali City & Cultural Heritage Tour'
  ],
  announcements: [],
  customFields: [],
  customSections: [],
  customDashboards: [],
  customFeatures: []
};

// =========================================================================
// LANGUAGE LABELS (KINY, ENG, FRA)
// =========================================================================
const LANGUAGE_LABELS = {
  KINY: {
    signIn: 'Injira',
    createAccount: 'Fungura Konti Nshya',
    signOut: 'Sohoka',
    allCategories: 'Ibyiciro byose',
    graduate: 'Uwize Ubukerarugendo / Guide',
    agency: 'Agence y’Ingendo',
    tourCompany: 'Sosiyete y’Ubukerarugendo',
    carRental: 'CAR RENTALS COMPANY',
    traveler: 'Umukerarugendo',
    owner: 'C.E.O & Administrator HQ'
  },
  ENG: {
    signIn: 'Sign In',
    createAccount: 'Create Account (New Sign Up)',
    signOut: 'Sign Out',
    allCategories: 'All Categories',
    graduate: 'Tourism Graduate / Guide',
    agency: 'Travel Agency',
    tourCompany: 'Tour Company',
    carRental: 'CAR RENTALS COMPANY',
    traveler: 'Traveler',
    owner: 'C.E.O & Administrator HQ'
  },
  FRA: {
    signIn: 'Se connecter',
    createAccount: 'Créer un compte (Nouvelle inscription)',
    signOut: 'Déconnexion',
    allCategories: 'Toutes les catégories',
    graduate: 'Diplômé en tourisme / Guide',
    agency: 'Agence de voyage',
    tourCompany: 'Entreprise de circuits',
    carRental: 'CAR RENTALS COMPANY',
    traveler: 'Voyageur',
    owner: 'C.E.O & Administrator HQ'
  }
};

export default function GuideLinkRwandaApp() {
  // Force full-bleed widescreen viewport (overrides Vite/CRA default #root portrait constraints)
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

  // Language state (KINY, ENG, FRA)
  const [language, setLanguage] = useState('ENG');
  const langText = LANGUAGE_LABELS[language] || LANGUAGE_LABELS.ENG;

  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [activeCustomDashId, setActiveCustomDashId] = useState('');
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // No-Code App Server CMS State (Live Cloud Config)
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_SERVER_CONFIG);
  const [serverSubTab, setServerSubTab] = useState('branding'); // 'branding' | 'content' | 'dashboards' | 'features' | 'controls'
  const [newDestinationInput, setNewDestinationInput] = useState('');
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({ title: '', body: '', targetRole: 'all' });
  const [newCustomFieldForm, setNewCustomFieldForm] = useState({ label: '', placeholder: '', targetRole: 'all', required: false });
  const [newCustomSectionForm, setNewCustomSectionForm] = useState({ title: '', content: '', targetRole: 'all' });

  // 1-minute Ad Pop-up State when enabled by owner
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [activeAdIndex, setActiveAdIndex] = useState(0);

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
    featureType: 'action_form', // 'action_form' | 'checklist' | 'resource_link' | 'calculator'
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

  // Dynamic Subscription Plans State (Editable by Owner)
  const [subscriptionPlans, setSubscriptionPlans] = useState(DEFAULT_SUBSCRIPTION_PLANS);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRoleFilter, setSearchRoleFilter] = useState('all');

  // Owner Users Management State
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

  // Dynamic USSD & Payment Constants
  const MOMO_PAYMENT_CODE = appConfig.momoCode || '612771';
  const buildUssdDisplay = (amount) => `*182*8*1*${MOMO_PAYMENT_CODE}*${amount}#`;
  const buildUssdDialUri = (amount) => `tel:*182*8*1*${MOMO_PAYMENT_CODE}*${amount}%23`;

  const [ussdTriggered, setUssdTriggered] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [emailNotificationSent, setEmailNotificationSent] = useState(false);

  // Expired Subscription Renewal State
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

  const [registeredUsers, setRegisteredUsers] = useState([
    {
      id: 'car-rentals-company',
      name: 'CAR RENTALS COMPANY',
      contact: '+250788558555',
      password: '',
      role: 'car_rental',
      feePaid: 0,
      momoRef: 'CAR-RENTALS-DEFAULT',
      status: 'approved',
      subscriptionPlanId: 'gold_platinum_year',
      subscriptionPlanName: 'GOLD-PLATINUM',
      subscriptionExpiresAt: 0
    }
  ]);

  const [userProfiles, setUserProfiles] = useState({
    '+250788558555': {
      name: 'CAR RENTALS COMPANY',
      contact: '+250788558555',
      role: 'car_rental',
      photo: '',
      isAvailable: true,
      headline: 'CAR RENTALS COMPANY & Tourism Fleet Services in Rwanda',
      location: 'Kigali, Rwanda',
      rateInfo: 'Custom Rental Rates',
      bio: 'CAR RENTALS COMPANY providing vehicles for travel, tours, and transfers across Rwanda.',
      degrees: [],
      servicesOffered: [],
      experiences: [],
      skills: ['English', 'Kinyarwanda'],
      customData: {}
    }
  });

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

  const getPrivateRoomId = (idA, idB) => {
    const cleanA = normalizeContact(idA);
    const cleanB = normalizeContact(idB);
    return [cleanA, cleanB].sort().join('__');
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

  // Every 1 minute (60,000 ms), pop up ad if owner enabled ads
  useEffect(() => {
    const hasAdContent =
      Boolean(appConfig.adPopupEnabled) &&
      (Boolean((appConfig.adPopupMessage || '').trim()) ||
        (Array.isArray(appConfig.announcements) && appConfig.announcements.length > 0));

    if (!hasAdContent) {
      setShowAdPopup(false);
      return;
    }

    const adInterval = setInterval(() => {
      if (Array.isArray(appConfig.announcements) && appConfig.announcements.length > 0) {
        setActiveAdIndex((prev) => (prev + 1) % appConfig.announcements.length);
      }
      setShowAdPopup(true);
    }, 60000);

    return () => clearInterval(adInterval);
  }, [appConfig.adPopupEnabled, appConfig.adPopupMessage, appConfig.announcements]);

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
          commissionRatePercent: Number(mainCfg.commissionRatePercent ?? prev.commissionRatePercent),
          destinations: Array.isArray(mainCfg.destinations) && mainCfg.destinations.length > 0 ? mainCfg.destinations : prev.destinations,
          announcements: Array.isArray(mainCfg.announcements) ? mainCfg.announcements : [],
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
      setRegisteredUsers((prev) => {
        const merged = [...users];
        prev.forEach((localUser) => {
          if (!merged.some((u) => normalizeContact(u.contact) === normalizeContact(localUser.contact))) {
            merged.push(localUser);
          }
        });
        return merged;
      });
      setUserProfiles((prev) => ({
        ...prev,
        ...profs
      }));
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

  const getRoleDisplayLabel = (role) => {
    if (role === 'graduate') return langText.graduate;
    if (role === 'agency') return langText.agency;
    if (role === 'tour_company') return langText.tourCompany;
    if (role === 'car_rental') return langText.carRental;
    if (role === 'traveler') return langText.traveler;
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
          : activeUser.role === 'car_rental'
          ? 'CAR RENTALS COMPANY & Fleet Services'
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
      commissionRatePercent: Number(payload.commissionRatePercent) || 10,
      primaryColor: payload.primaryColor || '#234E40',
      secondaryColor: payload.secondaryColor || '#3B6E5B',
      travelerFreeBadge: payload.travelerFreeBadge || 'Travelers: FREE',
      allowNewSignups: payload.allowNewSignups !== false,
      maintenanceMode: Boolean(payload.maintenanceMode),
      maintenanceMessage: payload.maintenanceMessage || '',
      welcomeBannerText: payload.welcomeBannerText || '',
      adPopupEnabled: Boolean(payload.adPopupEnabled),
      adPopupTitle: payload.adPopupTitle || 'Featured Partner Spotlight',
      adPopupMessage: payload.adPopupMessage || '',
      destinations: payload.destinations || [],
      announcements: payload.announcements || [],
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

  const activeAnnouncement =
    Array.isArray(appConfig.announcements) && appConfig.announcements.length > 0
      ? appConfig.announcements[activeAdIndex % appConfig.announcements.length]
      : null;

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      {/* Welcome Tab Top Bar with Language Switcher (KINY, ENG, FRA) */}
      {currentRole === 'welcome' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>{appConfig.appName}</strong> — <span>{appConfig.tagline}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} role="group" aria-label="Language Switcher">
            {['KINY', 'ENG', 'FRA'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5d1',
                  background: language === code ? (appConfig.primaryColor || '#234E40') : '#ffffff',
                  color: language === code ? '#ffffff' : (appConfig.primaryColor || '#234E40'),
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1-Minute Timed Ad Pop-up when enabled by Owner */}
      {showAdPopup && Boolean(appConfig.adPopupEnabled) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', padding: '22px', borderRadius: '12px', maxWidth: '440px', width: '92%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>{activeAnnouncement?.title || appConfig.adPopupTitle || 'Sponsored Ad'}</strong>
              <button type="button" onClick={() => setShowAdPopup(false)}>✕</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: 1.5 }}>
              {activeAnnouncement?.body || appConfig.adPopupMessage}
            </p>
            <button type="button" onClick={() => setShowAdPopup(false)}>Close</button>
          </div>
        </div>
      )}

      {currentRole === 'welcome' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <form onSubmit={handleSignInSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Phone / Email"
              value={signInContact}
              onChange={(e) => setSignInContact(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
            />
            <button type="submit">{langText.signIn}</button>
            <button type="button" onClick={() => { setRegStep('details'); setCurrentRole('signup'); }}>
              {langText.createAccount}
            </button>
          </form>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={searchRoleFilter} onChange={(e) => setSearchRoleFilter(e.target.value)}>
              <option value="all">{langText.allCategories}</option>
              <option value="graduate">{langText.graduate}</option>
              <option value="agency">{langText.agency}</option>
              <option value="tour_company">{langText.tourCompany}</option>
              <option value="car_rental">{langText.carRental}</option>
            </select>
          </div>

          {registeredUsers
            .filter((u) => searchRoleFilter === 'all' || u.role === searchRoleFilter)
            .filter((u) => !searchQuery.trim() || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((user) => (
              <div key={user.id} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '8px' }}>
                <strong>{user.name}</strong> — <span>{getRoleDisplayLabel(user.role)}</span>
              </div>
            ))}
        </div>
      )}

      {currentRole === 'signup' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3>{langText.createAccount}</h3>
          <label>Role</label>
          <select value={regForm.role} onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}>
            <option value="traveler">{langText.traveler}</option>
            <option value="graduate">{langText.graduate}</option>
            <option value="agency">{langText.agency}</option>
            <option value="tour_company">{langText.tourCompany}</option>
            <option value="car_rental">{langText.carRental}</option>
          </select>
        </div>
      )}

      {showOwnerPinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px' }}>
            <h4>{langText.owner} PIN</h4>
            <input type="password" value={ownerPinInput} onChange={(e) => setOwnerPinInput(e.target.value)} />
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  if (ownerPinInput === 'FYP$2026') {
                    setShowOwnerPinModal(false);
                    setOwnerPinInput('');
                    setOwnerTab('pending');
                    setCurrentRole('owner');
                  } else {
                    alert('Invalid PIN');
                  }
                }}
              >
                {langText.signIn}
              </button>
              <button type="button" onClick={() => setShowOwnerPinModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
