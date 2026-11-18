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

  const getRoleDisplayLabel = (role) => {
    if (role === 'graduate') return 'Tourism Graduate / Guide';
    if (role === 'agency') return 'Travel Agency';
    if (role === 'tour_company') return 'Tour Company';
    if (role === 'traveler') return 'Traveler';
    const customDash = (appConfig.customDashboards || []).find((d) => d.id === role);
    if (customDash) return customDash.name;
    return role;
  };

  const getAudienceDisplayLabel = (aud) => {
    if (aud === 'all') return 'Everyone (Welcome + All Dashboards)';
    if (aud === 'welcome') return 'Welcome Home Screen Only';
    if (aud === 'traveler') return 'Travelers Only';
    if (aud === 'partners') return 'Agencies & Tour Companies Only';
    if (aud === 'graduate') return 'Tourism Graduates / Guides Only';
    if (aud === 'logged_in') return 'All Logged-In Members';
    return aud;
  };

  const getVisibleAdsForContext = (contextRole) => {
    return (appConfig.ads || []).filter((ad) => {
      if (ad.active === false) return false;
      if (!ad.targetAudience || ad.targetAudience === 'all') return true;
      if (contextRole === 'welcome') return ad.targetAudience === 'welcome';
      if (ad.targetAudience === 'logged_in') return true;
      if (ad.targetAudience === 'partners') {
        return ['agency', 'tour_company'].includes(contextRole);
      }
      return ad.targetAudience === contextRole;
    });
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
    const roomId = getPrivateRoomId(myId, recipientId);

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

  const renderTargetedAdsStrip = (contextRole, isPublicWelcome = false) => {
    const visibleAds = getVisibleAdsForContext(contextRole);
    if (visibleAds.length === 0) return null;

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center space-x-1.5">
            <span>📢</span>
            <span>Sponsored Partner Spotlights</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-400">Verified on {appConfig.appName}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleAds.map((ad) => (
            <div
              key={ad.id}
              className="bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/60 border border-amber-300/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 text-xs"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    {ad.imageUrl ? (
                      <img
                        src={ad.imageUrl}
                        alt={ad.advertiserName}
                        className="w-11 h-11 rounded-xl object-cover border border-amber-300 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-amber-400/30 text-amber-950 flex items-center justify-center font-extrabold text-base shrink-0">
                        📢
                      </div>
                    )}
                    <div>
                      <span className="inline-block text-[9px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                        {ad.badge || 'Sponsored'}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-0.5 leading-snug">
                        {ad.headline}
                      </h4>
                      <p className="text-[11px] font-bold text-[#234E40]">
                        {ad.advertiserName} {ad.advertiserRoleLabel ? `• ${ad.advertiserRoleLabel}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
                {ad.description && (
                  <p className="text-slate-700 leading-relaxed text-xs">{ad.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-200/70 gap-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  {ad.advertiserContact ? `📞 ${ad.advertiserContact}` : 'Verified Member'}
                </span>
                {isPublicWelcome ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSignInContact('');
                      setSignInPassword('');
                      setCurrentRole('signin');
                    }}
                    className="px-3 py-1.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] shrink-0 transition"
                  >
                    {ad.ctaLabel || 'Connect'} →
                  </button>
                ) : (
                  <div className="flex space-x-1.5 shrink-0">
                    {ad.advertiserContact && (
                      <button
                        type="button"
                        onClick={() =>
                          openConfidentialChat(
                            ad.advertiserContact,
                            ad.advertiserName,
                            ad.advertiserRoleLabel || 'Sponsored Partner'
                          )
                        }
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-[11px]"
                      >
                        🔒 Chat
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setBookingTarget({
                          type: 'agency',
                          categoryLabel: ad.advertiserRoleLabel || 'Featured Partner',
                          name: ad.advertiserName,
                          location: 'Rwanda'
                        })
                      }
                      className="px-3 py-1.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-[11px]"
                    >
                      {ad.ctaLabel || 'Book Now'} →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER VIEWS
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
        <div className="w-full">
          {/* Visual Showcase (Added Integration) */}
          <div className="bg-[#E2ECE9] w-full px-6 md:px-12 py-6 flex flex-col items-center justify-center space-y-4">
            <h2 className="text-xl md:text-2xl font-extrabold text-[#234E40] text-center">
              Discover Rwanda’s Premier Tourism & Travel Ecosystem
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-emerald-200 text-center space-y-2">
                <Image src="image_generation_content/9742948583575022247" alt="GuideLink Rwanda Promotional Flyer" />
                <span className="text-xs font-bold text-[#234E40] block pb-1">Professional Platform Overview</span>
              </div>
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-emerald-200 text-center space-y-2">
                <Image src="image_generation_content/14122219837812446398" alt="GuideLink Rwanda Hero Banner" />
                <span className="text-xs font-bold text-[#234E40] block pb-1">Volcanoes & National Parks Expeditions</span>
              </div>
            </div>
          </div>

          <div className="w-full px-6 md:px-12 lg:px-16 py-8 space-y-6">
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

            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                <div>
                  <h1 className="text-3xl md:text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight">
                    {appConfig.appName}
                  </h1>
                  <p className="text-lg md:text-2xl font-semibold mt-2" style={{ color: appConfig.primaryColor || '#234E40' }}>
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

            {renderTargetedAdsStrip('welcome', true)}
          </div>
        </div>

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

  // Fallback for other standard workspaces when user is signed in
  return (
    <div className="min-h-screen w-screen bg-slate-100 flex flex-col justify-between font-sans overflow-x-hidden relative">
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
              </p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-full font-semibold transition">Sign Out</button>
        </div>
      </div>
      <div className="w-full p-12 text-center text-slate-600">
        <h2 className="text-2xl font-bold mb-2">Welcome to {appConfig.appName}, {currentProf?.name}!</h2>
        <p className="text-sm">Your session is active and securely synced with Firebase Cloud.</p>
      </div>
    </div>
  );
}
