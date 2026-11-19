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
  if ('arrayValue' in obj) return (obj.arrayValue.values || []).map(fromFirestoreValue);
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
// DEFAULT CONFIGURATIONS
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
  commissionRatePercent: 10,
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
  customFields: [],
  customSections: [],
  customDashboards: [],
  customFeatures: []
};

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
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: #f4f6f5;
          color: #1a2421;
        }
        * { box-sizing: border-box; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Core Navigation & Auth State
  const [currentRole, setCurrentRole] = useState('welcome'); // 'welcome' | 'signup' | 'renew_sub' | 'owner' | 'graduate' | 'agency' | 'tour_company' | 'traveler' | customDashId
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [activeCustomDashId, setActiveCustomDashId] = useState('');
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // CMS & Server Config State
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_SERVER_CONFIG);
  const [serverSubTab, setServerSubTab] = useState('branding');
  const [newDestinationInput, setNewDestinationInput] = useState('');
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({ title: '', body: '', targetRole: 'all' });
  const [newCustomFieldForm, setNewCustomFieldForm] = useState({ label: '', placeholder: '', targetRole: 'all', required: false });
  const [newCustomSectionForm, setNewCustomSectionForm] = useState({ title: '', content: '', targetRole: 'all' });

  // Custom Dashboards & Features Builder State
  const [newDashboardForm, setNewDashboardForm] = useState({
    name: '', icon: '🏨', badge: 'New Partner Hub', description: '',
    actionTitle: 'Submit Listing / Request', actionPlaceholder: 'Enter details, pricing, or availability...',
    showOnWelcome: true, items: []
  });
  const [customDashPostInput, setCustomDashPostInput] = useState({ title: '', details: '', priceOrMeta: '' });

  const [newFeatureForm, setNewFeatureForm] = useState({
    title: '', icon: '✨', featureType: 'action_form', targetRole: 'all',
    description: '', buttonLabel: 'Submit Request', linkUrl: '', unitPriceRwf: 50000, checklistItemsText: ''
  });
  const [featureInputs, setFeatureInputs] = useState({});
  const [featureSubmissions, setFeatureSubmissions] = useState({});
  const [checkedItemsMap, setCheckedItemsMap] = useState({});
  const [calcQtyMap, setCalcQtyMap] = useState({});
  const [customFieldValues, setCustomFieldValues] = useState({});

  // Subscriptions & Directory State
  const [subscriptionPlans, setSubscriptionPlans] = useState(DEFAULT_SUBSCRIPTION_PLANS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRoleFilter, setSearchRoleFilter] = useState('all');

  // Admin User Editor State
  const [selectedManagedUserId, setSelectedManagedUserId] = useState('');
  const [ownerUserEditForm, setOwnerUserEditForm] = useState(null);
  const [ownerNewServiceInput, setOwnerNewServiceInput] = useState('');
  const [ownerNewDegreeInput, setOwnerNewDegreeInput] = useState('');
  const [ownerNewExpInput, setOwnerNewExpInput] = useState('');

  // Booking & Confidential Chat State
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ dates: '', guests: '2', notes: '' });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeChatPeer, setActiveChatPeer] = useState({ id: '', name: '', role: '' });

  // Mobile Money Payment & Renewal State
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

  // Profiles & Records
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

  // Auth Forms
  const [signInContact, setSignInContact] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [regStep, setRegStep] = useState('details'); // 'details' | 'payment' | 'submitted'
  const [regForm, setRegForm] = useState({
    name: '', contact: '', password: '', confirmPassword: '',
    role: 'traveler', subscriptionPlanId: 'monthly', momoRef: ''
  });

  // Profile Edit Helpers
  const [newDegreeInput, setNewDegreeInput] = useState('');
  const [newServiceInput, setNewServiceInput] = useState('');
  const [newExperienceInput, setNewExperienceInput] = useState('');

  // Marketplace Jobs & Trip Requests
  const [newTaskForm, setNewTaskForm] = useState({ title: '', date: '', rawPay: '', location: 'Kigali', category: 'Guiding Job' });
  const [tripRequestForm, setTripRequestForm] = useState({
    preferredCategory: 'graduate',
    destination: 'Volcanoes National Park / Musanze',
    dates: '', guests: '2', notes: ''
  });
  const [tripRequests, setTripRequests] = useState([]);
  const [tasks, setTasks] = useState([
    { id: 'default-1', title: 'Half-day Kigali city tour & cultural heritage', agency: 'Cheetah Safaris / Partner Agency', location: 'Kigali', rawPay: 35000, pay: 'RWF 35,000', date: 'Sat 21 Nov, 09:00 to 13:00', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Guiding Job' },
    { id: 'default-2', title: 'Nyungwe Canopy Walk & Tea Plantation Escort', agency: 'Rwanda Eco Tours', location: 'Nyungwe / Rusizi', rawPay: 65000, pay: 'RWF 65,000', date: 'Mon 23 Nov, Full Day', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Consultant Job' }
  ]);

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================
  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

  const getPlanById = (planId) =>
    subscriptionPlans.find((p) => p.id === planId) || subscriptionPlans[0] || DEFAULT_SUBSCRIPTION_PLANS[0];

  const isUserSubscriptionExpired = (user) => {
    if (!user || user.role === 'traveler' || user.role === 'owner' || user.isVip) return false;
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
    setActiveChatPeer({ id: resolvedId, name: peerName, role: peerRoleLabel });
    setActiveTab('chat');
  };

  const getRoleDisplayLabel = (role) => {
    if (role === 'graduate') return 'Tourism Graduate / Guide';
    if (role === 'agency') return 'Travel Agency';
    if (role === 'tour_company') return 'Tour Company';
    if (role === 'traveler') return 'Traveler';
    if (role === 'owner') return 'Platform C.E.O';
    const customDash = (appConfig.customDashboards || []).find((d) => d.id === role);
    if (customDash) return customDash.name;
    return role;
  };

  // =========================================================================
  // FIREBASE SYNC LOOP
  // =========================================================================
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
        return cloudMatch
          ? { ...defPlan, ...cloudMatch, price: Number(cloudMatch.price ?? defPlan.price), days: Number(cloudMatch.days ?? defPlan.days) }
          : defPlan;
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

  // =========================================================================
  // PROFILE & ADMIN ACTIONS
  // =========================================================================
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
      bio: updated.bio,
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
    alert(`✓ Login info, subscription & profile for ${cleanFields.name} updated in Firebase!`);
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

  // =========================================================================
  // AUTHENTICATION & REGISTRATION HANDLERS
  // =========================================================================
  const checkExemptUser = (contactInput) => {
    const cleanInput = normalizeContact(contactInput);
    if (cleanInput === normalizeContact(ownerProfile.contact) || normalizeContact(ownerProfile.email) === cleanInput) {
      return { id: 'owner', name: ownerProfile.name, contact: ownerProfile.contact, role: 'owner', tier: 'C.E.O & Administrator HQ', confirmed: true };
    }
    return exemptAccounts.find(
      (acc) =>
        acc.confirmed &&
        (normalizeContact(acc.contact) === cleanInput || (acc.email && normalizeContact(acc.email) === cleanInput))
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
        setRegisteredUsers(
          registeredUsers.map((u) => (u.id === existingUser.id ? { ...u, status: 'expired' } : u))
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

    const cleanContact = normalizeContact(regForm.contact);
    if (!regForm.name.trim() || !cleanContact || !regForm.password) {
      alert('Please fill in your Full Name, Phone/Email, and Password.');
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (registeredUsers.some((u) => normalizeContact(u.contact) === cleanContact)) {
      alert('An account with this phone number or email already exists. Please Sign In.');
      return;
    }

    // Travelers register for FREE immediately
    if (regForm.role === 'traveler') {
      setIsSaving(true);
      const newUserObj = {
        id: cleanContact,
        name: regForm.name.trim(),
        contact: regForm.contact.trim(),
        password: regForm.password,
        role: 'traveler',
        feePaid: 0,
        momoRef: 'FREE_TRAVELER',
        status: 'approved',
        subscriptionPlanId: 'free_traveler',
        subscriptionPlanName: 'Traveler Free Access',
        subscriptionExpiresAt: 0,
        customData: customFieldValues
      };

      await firestoreSaveDoc('profiles', cleanContact, {
        ...newUserObj,
        isAvailable: true,
        headline: 'Explorer & Verified Traveler',
        location: 'Kigali, Rwanda',
        rateInfo: 'Free Account',
        bio: '',
        photo: '',
        degrees: [],
        servicesOffered: [],
        experiences: [],
        skills: ['English', 'Kinyarwanda']
      });

      setRegisteredUsers([...registeredUsers, newUserObj]);
      setActiveUser(newUserObj);
      setIsSaving(false);
      setCurrentRole('traveler');
      setActiveTab('jobs');
      return;
    }

    // Paid Partner Roles proceed to Mobile Money Payment Step
    setUssdTriggered(false);
    setRegStep('payment');
  };

  const handleCompletePaidRegistration = async (e) => {
    e.preventDefault();
    if (!regForm.momoRef.trim()) {
      alert('Please enter your MTN MoMo Transaction ID / Reference after dialing the payment code.');
      return;
    }

    setIsSubmittingPayment(true);
    const cleanContact = normalizeContact(regForm.contact);
    const chosenPlan = getPlanById(regForm.subscriptionPlanId);

    const newPartnerObj = {
      id: cleanContact,
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      password: regForm.password,
      role: regForm.role,
      feePaid: chosenPlan.price,
      momoRef: regForm.momoRef.trim(),
      status: 'pending',
      subscriptionPlanId: chosenPlan.id,
      subscriptionPlanName: chosenPlan.name,
      subscriptionExpiresAt: 0,
      customData: customFieldValues
    };

    await firestoreSaveDoc('profiles', cleanContact, {
      ...newPartnerObj,
      isAvailable: true,
      headline: getRoleDisplayLabel(regForm.role),
      location: 'Kigali, Rwanda',
      rateInfo: 'Standard Rates',
      bio: '',
      photo: '',
      degrees: [],
      servicesOffered: [],
      experiences: [],
      skills: ['English', 'Kinyarwanda']
    });

    setRegisteredUsers([...registeredUsers, newPartnerObj]);
    setIsSubmittingPayment(false);
    setEmailNotificationSent(true);
    setRegStep('submitted');
  };

  const handleApproveUserPayment = async (user) => {
    setIsSaving(true);
    const plan = getPlanById(user.subscriptionPlanId);
    const durationMs = (Number(plan.days) || 30) * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + durationMs;

    setRegisteredUsers(
      registeredUsers.map((u) =>
        u.id === user.id ? { ...u, status: 'approved', subscriptionExpiresAt: expiresAt } : u
      )
    );
    await firestoreSaveDoc('profiles', user.id, {
      status: 'approved',
      subscriptionExpiresAt: expiresAt
    });
    setIsSaving(false);
    alert(`✓ Approved ${user.name}! Subscription active for ${plan.days} days.`);
  };

  const handleSubmitSubscriptionRenewal = async (e) => {
    e.preventDefault();
    if (!expiredUserAccount || !renewalMomoRef.trim()) {
      alert('Please enter your MoMo Transaction Reference.');
      return;
    }
    setIsSaving(true);
    const chosenPlan = getPlanById(renewalPlanId);
    await firestoreSaveDoc('profiles', expiredUserAccount.id, {
      status: 'pending',
      feePaid: chosenPlan.price,
      momoRef: `RENEW: ${renewalMomoRef.trim()}`,
      subscriptionPlanId: chosenPlan.id,
      subscriptionPlanName: chosenPlan.name
    });
    setRegisteredUsers(
      registeredUsers.map((u) =>
        u.id === expiredUserAccount.id
          ? {
              ...u,
              status: 'pending',
              feePaid: chosenPlan.price,
              momoRef: `RENEW: ${renewalMomoRef.trim()}`,
              subscriptionPlanId: chosenPlan.id,
              subscriptionPlanName: chosenPlan.name
            }
          : u
      )
    );
    setIsSaving(false);
    setRenewalSubmitted(true);
  };

  // =========================================================================
  // MARKETPLACE, BOOKING & CHAT HANDLERS
  // =========================================================================
  const handlePostNewJob = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim() || !newTaskForm.rawPay) return;
    const payNum = Number(newTaskForm.rawPay);
    const newId = `task_${Date.now()}`;
    const jobObj = {
      id: newId,
      title: newTaskForm.title.trim(),
      agency: activeUser ? activeUser.name : ownerProfile.name,
      agencyContact: activeUser ? activeUser.contact : ownerProfile.contact,
      location: newTaskForm.location || 'Kigali',
      rawPay: payNum,
      pay: `RWF ${payNum.toLocaleString()}`,
      date: newTaskForm.date || 'Flexible Dates',
      status: 'open',
      assignedTo: null,
      paymentStatus: 'pending',
      category: newTaskForm.category,
      createdAt: Date.now()
    };
    setTasks([jobObj, ...tasks]);
    setNewTaskForm({ title: '', date: '', rawPay: '', location: 'Kigali', category: 'Guiding Job' });
    await firestoreSaveDoc('tasks', newId, jobObj);
    alert('✓ Job published to the live marketplace!');
  };

  const handleAcceptJob = async (task) => {
    if (!activeUser) return;
    const updatedTask = {
      ...task,
      status: 'assigned',
      assignedTo: activeUser.name,
      assignedContact: activeUser.contact
    };
    setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));
    await firestoreSaveDoc('tasks', task.id, {
      status: 'assigned',
      assignedTo: activeUser.name,
      assignedContact: activeUser.contact
    });
    alert(`✓ You accepted "${task.title}"! Use Confidential Chat to coordinate details.`);
  };

  const handleSubmitTripRequest = async (e) => {
    e.preventDefault();
    const newId = `trip_${Date.now()}`;
    const reqObj = {
      id: newId,
      travelerName: activeUser ? activeUser.name : 'Guest Traveler',
      travelerContact: activeUser ? activeUser.contact : '',
      preferredCategory: tripRequestForm.preferredCategory,
      destination: tripRequestForm.destination,
      dates: tripRequestForm.dates || 'Flexible',
      guests: tripRequestForm.guests,
      notes: tripRequestForm.notes,
      status: 'open',
      acceptedBy: '',
      createdAt: Date.now()
    };
    setTripRequests([reqObj, ...tripRequests]);
    setTripRequestForm({ ...tripRequestForm, dates: '', notes: '' });
    await firestoreSaveDoc('tripRequests', newId, reqObj);
    alert('✓ Custom trip request broadcast to verified partners!');
  };

  const handleDirectBookPartner = async (e) => {
    e.preventDefault();
    if (!bookingTarget) return;
    const newId = `trip_${Date.now()}`;
    const reqObj = {
      id: newId,
      travelerName: activeUser ? activeUser.name : 'Traveler',
      travelerContact: activeUser ? activeUser.contact : '',
      preferredCategory: bookingTarget.role,
      targetPartnerName: bookingTarget.name,
      targetPartnerContact: bookingTarget.contact,
      destination: bookingTarget.location || 'Rwanda Tour',
      dates: bookingDetails.dates || 'Flexible',
      guests: bookingDetails.guests,
      notes: bookingDetails.notes,
      status: 'direct_booking',
      acceptedBy: bookingTarget.name,
      createdAt: Date.now()
    };
    setTripRequests([reqObj, ...tripRequests]);
    await firestoreSaveDoc('tripRequests', newId, reqObj);
    const peerToChat = bookingTarget;
    setBookingTarget(null);
    setBookingDetails({ dates: '', guests: '2', notes: '' });
    openConfidentialChat(peerToChat.contact, peerToChat.name, getRoleDisplayLabel(peerToChat.role));
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatPeer.id) return;
    const senderId = normalizeContact(activeUser ? activeUser.contact : ownerProfile.contact);
    const senderName = activeUser ? activeUser.name : ownerProfile.name;
    const roomId = getPrivateRoomId(senderId, activeChatPeer.id);
    const msgId = `msg_${Date.now()}`;
    const msgObj = {
      id: msgId,
      roomId,
      senderId,
      senderName,
      recipientId: activeChatPeer.id,
      recipientName: activeChatPeer.name,
      text: chatInput.trim(),
      createdAt: Date.now()
    };
    setChatMessages([...chatMessages, msgObj]);
    setChatInput('');
    await firestoreSaveDoc('chats', msgId, msgObj);
  };

  // =========================================================================
  // STYLING CONSTANTS
  // =========================================================================
  const primary = appConfig.primaryColor || '#234E40';
  const secondary = appConfig.secondaryColor || '#3B6E5B';

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '14px',
    padding: '22px',
    boxShadow: '0 4px 18px rgba(0,0,0,0.05)',
    border: '1px solid #e5ebe8',
    marginBottom: '18px'
  };

  const btnPrimary = {
    background: primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const btnSecondary = {
    background: '#eef3f1',
    color: primary,
    border: `1px solid ${primary}`,
    borderRadius: '8px',
    padding: '9px 16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5d1',
    fontSize: '14px',
    marginTop: '5px',
    marginBottom: '12px'
  };

  // =========================================================================
  // VIEW 1: WELCOME / SIGN IN LANDING PORTAL
  // =========================================================================
  if (currentRole === 'welcome') {
    const approvedPartners = registeredUsers.filter((u) => u.status === 'approved' && u.role !== 'traveler');
    const filteredDirectory = approvedPartners.filter((u) => {
      const prof = userProfiles[normalizeContact(u.contact)] || {};
      const matchesRole = searchRoleFilter === 'all' || u.role === searchRoleFilter;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (prof.headline || '').toLowerCase().includes(q) ||
        (prof.location || '').toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {appConfig.welcomeBannerText && (
          <div style={{ background: '#f59e0b', color: '#111', textAlign: 'center', padding: '8px 16px', fontWeight: '600', fontSize: '13px' }}>
            📢 {appConfig.welcomeBannerText}
          </div>
        )}

        {/* Top Navbar */}
        <header style={{ background: primary, color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '-0.3px' }}>🇷🇼 {appConfig.appName}</h1>
            <span style={{ fontSize: '12px', opacity: 0.85 }}>{appConfig.tagline}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ background: 'rgba(255,255,255,0.18)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
              {appConfig.travelerFreeBadge}
            </span>
            <button onClick={() => { setRegStep('details'); setCurrentRole('signup'); }} style={{ background: '#fff', color: primary, border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: '700', cursor: 'pointer' }}>
              Create Account
            </button>
          </div>
        </header>

        {/* Main Hero & Auth Grid */}
        <main style={{ maxWidth: '1200px', width: '100%', margin: '32px auto', padding: '0 20px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', alignItems: 'start' }}>
            {/* Left Value Proposition & Live Directory Preview */}
            <div>
              <h2 style={{ fontSize: '32px', color: primary, marginTop: 0, marginBottom: '12px', lineHeight: 1.2 }}>
                {appConfig.tagline}
              </h2>
              <p style={{ fontSize: '16px', color: '#4a5a54', lineHeight: 1.6, marginBottom: '24px' }}>
                {appConfig.subtitle}
              </p>

              {/* Featured Destinations Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                {(appConfig.destinations || []).map((dest, idx) => (
                  <span key={idx} style={{ background: '#e6efec', color: primary, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    📍 {dest}
                  </span>
                ))}
              </div>

              {/* Public Partner Search */}
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: primary }}>🔍 Explore Verified Guides, Agencies & Tour Companies</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <input
                    type="text"
                    placeholder="Search by name, city, or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ ...inputStyle, flex: 2, margin: 0 }}
                  />
                  <select
                    value={searchRoleFilter}
                    onChange={(e) => setSearchRoleFilter(e.target.value)}
                    style={{ ...inputStyle, flex: 1, margin: 0 }}
                  >
                    <option value="all">All Categories</option>
                    <option value="graduate">Tourism Graduates</option>
                    <option value="agency">Travel Agencies</option>
                    <option value="tour_company">Tour Companies</option>
                  </select>
                </div>

                {filteredDirectory.length === 0 ? (
                  <p style={{ color: '#6b7c75', fontSize: '14px' }}>No matching verified partners listed yet. Sign up to be featured!</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                    {filteredDirectory.map((partner) => {
                      const prof = userProfiles[normalizeContact(partner.contact)] || {};
                      return (
                        <div key={partner.id} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e1e8e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: primary }}>{partner.name}</div>
                            <div style={{ fontSize: '12px', color: '#52635d' }}>
                              {getRoleDisplayLabel(partner.role)} • 📍 {prof.location || 'Kigali, Rwanda'}
                            </div>
                          </div>
                          <button onClick={() => { setRegStep('details'); setCurrentRole('signup'); }} style={btnSecondary}>
                            Sign In to Connect
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sign In Box */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: primary, fontSize: '20px' }}>🔐 Sign In to Your Dashboard</h3>
              <form onSubmit={handleSignInSubmit}>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Phone Number or Email</label>
                <input
                  type="text"
                  placeholder="e.g. +250780000000 or name@email.com"
                  value={signInContact}
                  onChange={(e) => setSignInContact(e.target.value)}
                  style={inputStyle}
                  required
                />

                <label style={{ fontSize: '13px', fontWeight: '600' }}>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  style={inputStyle}
                  required
                />

                <button type="submit" style={{ ...btnPrimary, width: '100%', padding: '12px', fontSize: '15px' }}>
                  Sign In
                </button>
              </form>

              <hr style={{ border: 'none', borderTop: '1px solid #e5ebe8', margin: '20px 0' }} />

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#52635d', marginBottom: '10px' }}>New to {appConfig.appName}?</p>
                <button
                  onClick={() => { setRegStep('details'); setCurrentRole('signup'); }}
                  style={{ ...btnSecondary, width: '100%', padding: '11px' }}
                >
                  Create Account (New Sign Up)
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Owner PIN Fallback Modal */}
        {showOwnerPinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ ...cardStyle, maxWidth: '380px', width: '90%' }}>
              <h3 style={{ marginTop: 0, color: primary }}>🛡️ C.E.O Security Verification</h3>
              <p style={{ fontSize: '13px', color: '#52635d' }}>Enter your C.E.O Security PIN to access Administrator HQ.</p>
              <input
                type="password"
                placeholder="Enter PIN"
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowOwnerPinModal(false)} style={btnSecondary}>Cancel</button>
                <button
                  onClick={() => {
                    if (ownerPinInput === 'FYP$2026') {
                      setShowOwnerPinModal(false);
                      setOwnerPinInput('');
                      setOwnerTab('pending');
                      setCurrentRole('owner');
                    } else {
                      alert('Invalid C.E.O PIN.');
                    }
                  }}
                  style={btnPrimary}
                >
                  Verify & Enter
                </button>
              </div>
            </div>
          </div>
        )}

        <footer style={{ background: '#17352b', color: '#cbd5d1', textAlign: 'center', padding: '16px', fontSize: '13px' }}>
          © {new Date().getFullYear()} {appConfig.appName} • {appConfig.footerLocation} • Founded by {ownerProfile.name}
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: NEW USER REGISTRATION & MOBILE MONEY PAYMENT
  // =========================================================================
  if (currentRole === 'signup') {
    const selectedPlan = getPlanById(regForm.subscriptionPlanId);

    return (
      <div style={{ minHeight: '100vh', padding: '30px 20px', maxWidth: '640px', margin: '0 auto' }}>
        <button onClick={resetToWelcome} style={{ ...btnSecondary, marginBottom: '18px' }}>
          ← Back to Home
        </button>

        {regStep === 'details' && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: primary }}>Create Your {appConfig.appName} Account</h2>
            <form onSubmit={handleSignUpSubmit}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Select Account Category</label>
              <select
                value={regForm.role}
                onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                style={inputStyle}
              >
                <option value="traveler">Traveler / Tourist (FREE Access)</option>
                <option value="graduate">Tourism Graduate / Tour Guide</option>
                <option value="agency">Travel Agency</option>
                <option value="tour_company">Tour & Safari Company</option>
                {(appConfig.customDashboards || []).map((cd) => (
                  <option key={cd.id} value={cd.id}>{cd.name}</option>
                ))}
              </select>

              <label style={{ fontSize: '13px', fontWeight: '600' }}>Full Name or Company Name</label>
              <input
                type="text"
                placeholder="e.g. Jean Bosco / Volcanoes Safaris"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                style={inputStyle}
                required
              />

              <label style={{ fontSize: '13px', fontWeight: '600' }}>Phone Number (MTN/Airtel) or Email</label>
              <input
                type="text"
                placeholder="e.g. +250788000000"
                value={regForm.contact}
                onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                style={inputStyle}
                required
              />

              {regForm.role !== 'traveler' && (
                <>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Choose Partner Subscription Tier</label>
                  <select
                    value={regForm.subscriptionPlanId}
                    onChange={(e) => setRegForm({ ...regForm, subscriptionPlanId: e.target.value })}
                    style={inputStyle}
                  >
                    {subscriptionPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {plan.durationLabel} (RWF {Number(plan.price).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* Dynamic Custom Registration Fields from Owner CMS */}
              {(appConfig.customFields || [])
                .filter((cf) => cf.targetRole === 'all' || cf.targetRole === regForm.role)
                .map((cf, idx) => (
                  <div key={idx}>
                    <label style={{ fontSize: '13px', fontWeight: '600' }}>{cf.label}</label>
                    <input
                      type="text"
                      placeholder={cf.placeholder}
                      required={cf.required}
                      value={customFieldValues[cf.label] || ''}
                      onChange={(e) => setCustomFieldValues({ ...customFieldValues, [cf.label]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                ))}

              <label style={{ fontSize: '13px', fontWeight: '600' }}>Create Password</label>
              <input
                type="password"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                style={inputStyle}
                required
              />

              <label style={{ fontSize: '13px', fontWeight: '600' }}>Confirm Password</label>
              <input
                type="password"
                value={regForm.confirmPassword}
                onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                style={inputStyle}
                required
              />

              <button type="submit" disabled={isSaving} style={{ ...btnPrimary, width: '100%', padding: '12px' }}>
                {regForm.role === 'traveler' ? 'Complete Free Registration' : 'Proceed to Mobile Money Payment →'}
              </button>
            </form>
          </div>
        )}

        {regStep === 'payment' && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: primary }}>💳 Partner Subscription Payment</h2>
            <p style={{ fontSize: '14px', color: '#4a5a54' }}>
              Plan: <strong>{selectedPlan.name}</strong> ({selectedPlan.durationLabel})<br />
              Amount Due: <strong style={{ color: primary, fontSize: '18px' }}>RWF {Number(selectedPlan.price).toLocaleString()}</strong>
            </p>

            <div style={{ background: '#f0f7f4', padding: '16px', borderRadius: '10px', border: `1px solid ${secondary}`, marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Dial MTN MoMo Pay Code:</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: primary, letterSpacing: '0.5px', marginBottom: '10px' }}>
                {buildUssdDisplay(selectedPlan.price)}
              </div>
              <a
                href={buildUssdDialUri(selectedPlan.price)}
                onClick={() => setUssdTriggered(true)}
                style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none' }}
              >
                📞 Tap to Dial MoMo USSD Now
              </a>
              {ussdTriggered && (
                <div style={{ fontSize: '12px', color: '#15803d', marginTop: '8px', fontWeight: '600' }}>
                  ✓ Dialer opened. Complete the MoMo prompt on your phone, then enter your Transaction Reference below.
                </div>
              )}
            </div>

            <form onSubmit={handleCompletePaidRegistration}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>MTN MoMo Transaction ID / Reference</label>
              <input
                type="text"
                placeholder="e.g. MP261119.1420.C89123"
                value={regForm.momoRef}
                onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })}
                style={inputStyle}
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setRegStep('details')} style={btnSecondary}>← Back</button>
                <button type="submit" disabled={isSubmittingPayment} style={{ ...btnPrimary, flex: 1 }}>
                  {isSubmittingPayment ? 'Submitting...' : 'Submit Payment for C.E.O Verification'}
                </button>
              </div>
            </form>
          </div>
        )}

        {regStep === 'submitted' && (
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>✅</div>
            <h2 style={{ color: primary, marginTop: 0 }}>Payment Reference Submitted!</h2>
            <p style={{ fontSize: '14px', color: '#4a5a54', lineHeight: 1.6 }}>
              Thank you, <strong>{regForm.name}</strong>. Your payment reference (<code>{regForm.momoRef}</code>) has been logged in Firebase Cloud for C.E.O verification by <strong>{ownerProfile.name}</strong>.
            </p>
            {emailNotificationSent && (
              <p style={{ fontSize: '13px', color: '#15803d', fontWeight: '600' }}>
                Need urgent activation? Call or WhatsApp C.E.O HQ at {ownerProfile.contact}.
              </p>
            )}
            <button onClick={resetToWelcome} style={{ ...btnPrimary, marginTop: '12px' }}>
              Return to Sign In Screen
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: EXPIRED SUBSCRIPTION RENEWAL
  // =========================================================================
  if (currentRole === 'renew_sub' && expiredUserAccount) {
    const chosenRenewPlan = getPlanById(renewalPlanId);
    return (
      <div style={{ minHeight: '100vh', padding: '30px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={resetToWelcome} style={{ ...btnSecondary, marginBottom: '18px' }}>← Sign Out</button>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: '#b91c1c' }}>⏳ Subscription Expired</h2>
          <p style={{ fontSize: '14px', color: '#4a5a54' }}>
            Hello <strong>{expiredUserAccount.name}</strong>, your partner subscription has expired. Renew below to restore full dashboard access.
          </p>

          {renewalSubmitted ? (
            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #86efac' }}>
              <strong style={{ color: '#166534' }}>✓ Renewal Submitted!</strong>
              <p style={{ fontSize: '13px', margin: '8px 0 0' }}>
                Your renewal payment is awaiting C.E.O confirmation. Contact {ownerProfile.contact} for fast approval.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitSubscriptionRenewal}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Select Renewal Plan</label>
              <select value={renewalPlanId} onChange={(e) => setRenewalPlanId(e.target.value)} style={inputStyle}>
                {subscriptionPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.durationLabel} (RWF {Number(plan.price).toLocaleString()})
                  </option>
                ))}
              </select>

              <div style={{ background: '#f0f7f4', padding: '14px', borderRadius: '8px', marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', color: primary, marginBottom: '6px' }}>
                  Dial: {buildUssdDisplay(chosenRenewPlan.price)}
                </div>
                <a href={buildUssdDialUri(chosenRenewPlan.price)} style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', fontSize: '13px' }}>
                  📞 Dial MoMo USSD
                </a>
              </div>

              <label style={{ fontSize: '13px', fontWeight: '600' }}>MoMo Transaction Reference</label>
              <input
                type="text"
                placeholder="Enter transaction reference"
                value={renewalMomoRef}
                onChange={(e) => setRenewalMomoRef(e.target.value)}
                style={inputStyle}
                required
              />

              <button type="submit" disabled={isSaving} style={{ ...btnPrimary, width: '100%' }}>
                Submit Renewal Payment
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: C.E.O & ADMINISTRATOR HQ DASHBOARD
  // =========================================================================
  if (currentRole === 'owner') {
    const pendingUsers = registeredUsers.filter((u) => u.status === 'pending');

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: '#142e25', color: '#fff', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>🛡️ {appConfig.appName} — C.E.O & Administrator HQ</h2>
            <span style={{ fontSize: '12px', opacity: 0.85 }}>{ownerProfile.name} • {ownerProfile.title}</span>
          </div>
          <button onClick={resetToWelcome} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '600', cursor: 'pointer' }}>
            Sign Out
          </button>
        </header>

        {/* Owner Navigation Tabs */}
        <nav style={{ background: '#fff', borderBottom: '1px solid #dce4e0', padding: '10px 28px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { id: 'pending', label: `💳 Payment Approvals (${pendingUsers.length})` },
            { id: 'users', label: `👥 Manage Users (${registeredUsers.length})` },
            { id: 'plans', label: '💎 Subscription Plans' },
            { id: 'server', label: '⚙️ No-Code App Server CMS' },
            { id: 'marketplace', label: '📋 Live Jobs & Trips' },
            { id: 'profile', label: '👤 C.E.O Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setOwnerTab(tab.id)}
              style={{
                padding: '9px 15px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                background: ownerTab === tab.id ? primary : '#eef3f1',
                color: ownerTab === tab.id ? '#fff' : primary
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main style={{ maxWidth: '1200px', width: '100%', margin: '24px auto', padding: '0 20px', flex: 1 }}>
          {/* TAB: PENDING PAYMENT APPROVALS */}
          {ownerTab === 'pending' && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: primary }}>💳 Pending Partner Subscriptions & Renewals</h3>
              {pendingUsers.length === 0 ? (
                <p style={{ color: '#52635d' }}>No pending subscription payments awaiting verification.</p>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {pendingUsers.map((u) => (
                    <div key={u.id} style={{ padding: '16px', borderRadius: '10px', border: '1px solid #dce4e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px', color: primary }}>{u.name}</div>
                        <div style={{ fontSize: '13px', color: '#4a5a54' }}>
                          Role: <strong>{getRoleDisplayLabel(u.role)}</strong> • Contact: {u.contact}
                        </div>
                        <div style={{ fontSize: '13px', color: '#15803d', marginTop: '4px' }}>
                          Plan: <strong>{u.subscriptionPlanName}</strong> • Paid: <strong>RWF {Number(u.feePaid).toLocaleString()}</strong> • Ref: <code>{u.momoRef}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleApproveUserPayment(u)} style={btnPrimary}>
                          ✓ Approve & Activate
                        </button>
                        <button onClick={() => handleDeleteUserAccount(u.id, u.name)} style={{ ...btnSecondary, color: '#dc2626', borderColor: '#dc2626' }}>
                          Reject / Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: MANAGE ALL USERS */}
          {ownerTab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: primary }}>Registered Users Directory</h3>
                <div style={{ display: 'grid', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                  {registeredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUserForAdminEdit(u)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: selectedManagedUserId === u.id ? `2px solid ${primary}` : '1px solid #dce4e0',
                        cursor: 'pointer',
                        background: selectedManagedUserId === u.id ? '#f0f7f4' : '#fff'
                      }}
                    >
                      <div style={{ fontWeight: '700' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: '#52635d' }}>
                        {getRoleDisplayLabel(u.role)} • Status: <strong>{u.status.toUpperCase()}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {ownerUserEditForm && (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ marginTop: 0, color: primary }}>Edit Account: {ownerUserEditForm.name}</h3>
                    <button
                      type="button"
                      onClick={() => handleDeleteUserAccount(ownerUserEditForm.docId, ownerUserEditForm.name)}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Delete User
                    </button>
                  </div>

                  <form onSubmit={handleOwnerSaveManagedUser}>
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Full Name</label>
                    <input type="text" value={ownerUserEditForm.name} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, name: e.target.value })} style={inputStyle} />

                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Contact (Phone/Email)</label>
                    <input type="text" value={ownerUserEditForm.contact} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, contact: e.target.value })} style={inputStyle} />

                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Password</label>
                    <input type="text" value={ownerUserEditForm.password} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, password: e.target.value })} style={inputStyle} />

                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Account Status</label>
                    <select value={ownerUserEditForm.status} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, status: e.target.value })} style={inputStyle}>
                      <option value="approved">Approved (Active)</option>
                      <option value="pending">Pending Verification</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked / Suspended</option>
                    </select>

                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Subscription Plan</label>
                    <select value={ownerUserEditForm.subscriptionPlanId} onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, subscriptionPlanId: e.target.value })} style={inputStyle}>
                      {subscriptionPlans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (RWF {p.price})</option>
                      ))}
                    </select>

                    <button type="submit" disabled={isSaving} style={{ ...btnPrimary, width: '100%' }}>
                      {isSaving ? 'Saving...' : 'Save Changes to Firebase'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB: SUBSCRIPTION PLANS */}
          {ownerTab === 'plans' && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: primary }}>💎 Customize Subscription Tiers & Pricing (RWF)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                {subscriptionPlans.map((plan, index) => (
                  <div key={plan.id} style={{ padding: '16px', borderRadius: '10px', border: '1px solid #dce4e0' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Plan Title</label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => {
                        const updated = [...subscriptionPlans];
                        updated[index] = { ...plan, name: e.target.value };
                        setSubscriptionPlans(updated);
                      }}
                      style={inputStyle}
                    />
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Price (RWF)</label>
                    <input
                      type="number"
                      value={plan.price}
                      onChange={(e) => {
                        const updated = [...subscriptionPlans];
                        updated[index] = { ...plan, price: Number(e.target.value) };
                        setSubscriptionPlans(updated);
                      }}
                      style={inputStyle}
                    />
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>Duration (Days)</label>
                    <input
                      type="number"
                      value={plan.days}
                      onChange={(e) => {
                        const updated = [...subscriptionPlans];
                        updated[index] = { ...plan, days: Number(e.target.value) };
                        setSubscriptionPlans(updated);
                      }}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveSubscriptionPlans} disabled={isSaving} style={btnPrimary}>
                {isSaving ? 'Saving...' : 'Save Subscription Pricing to Cloud'}
              </button>
            </div>
          )}

          {/* TAB: NO-CODE APP SERVER CMS */}
          {ownerTab === 'server' && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: primary }}>⚙️ Live App Server & Branding Controls</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Platform Name</label>
                  <input type="text" value={appConfig.appName} onChange={(e) => setAppConfig({ ...appConfig, appName: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>MTN MoMo Merchant Code</label>
                  <input type="text" value={appConfig.momoCode} onChange={(e) => setAppConfig({ ...appConfig, momoCode: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Primary Brand Color</label>
                  <input type="color" value={appConfig.primaryColor} onChange={(e) => setAppConfig({ ...appConfig, primaryColor: e.target.value })} style={{ ...inputStyle, height: '42px', padding: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Global Announcement Banner</label>
                  <input type="text" placeholder="Leave empty to hide banner" value={appConfig.welcomeBannerText} onChange={(e) => setAppConfig({ ...appConfig, welcomeBannerText: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', margin: '12px 0 20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
                  <input type="checkbox" checked={appConfig.allowNewSignups} onChange={(e) => setAppConfig({ ...appConfig, allowNewSignups: e.target.checked })} />
                  Allow New User Registrations
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#b91c1c' }}>
                  <input type="checkbox" checked={appConfig.maintenanceMode} onChange={(e) => setAppConfig({ ...appConfig, maintenanceMode: e.target.checked })} />
                  Enable Maintenance Mode
                </label>
              </div>

              <button
                onClick={async () => {
                  await handleSaveAppServerConfig();
                  alert('✓ Live Server Configuration updated across all devices!');
                }}
                disabled={isSaving}
                style={btnPrimary}
              >
                {isSaving ? 'Publishing...' : 'Publish Live Server Config'}
              </button>
            </div>
          )}

          {/* TAB: MARKETPLACE OVERSIGHT */}
          {ownerTab === 'marketplace' && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: primary }}>📋 Active Jobs & Traveler Trip Requests</h3>
              <h4>Posted Guiding & Consultant Jobs ({tasks.length})</h4>
              {tasks.map((t) => (
                <div key={t.id} style={{ padding: '12px', borderBottom: '1px solid #e5ebe8', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{t.title}</strong> — {t.agency} ({t.pay}) • Status: <strong>{t.status.toUpperCase()}</strong>
                  </div>
                  <button
                    onClick={async () => {
                      setTasks(tasks.filter((item) => item.id !== t.id));
                      await firestoreDeleteDoc('tasks', t.id);
                    }}
                    style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB: C.E.O PROFILE */}
          {ownerTab === 'profile' && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: primary }}>👤 C.E.O & Founder Profile</h3>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Full Name</label>
              <input type="text" value={ownerProfile.name} onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })} style={inputStyle} />
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Official Title</label>
              <input type="text" value={ownerProfile.title} onChange={(e) => setOwnerProfile({ ...ownerProfile, title: e.target.value })} style={inputStyle} />
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Contact Phone</label>
              <input type="text" value={ownerProfile.contact} onChange={(e) => setOwnerProfile({ ...ownerProfile, contact: e.target.value })} style={inputStyle} />
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Email Address</label>
              <input type="email" value={ownerProfile.email} onChange={(e) => setOwnerProfile({ ...ownerProfile, email: e.target.value })} style={inputStyle} />
              <button onClick={() => handleSaveWithButton(ownerProfile)} disabled={isSaving} style={btnPrimary}>
                Save C.E.O Profile
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW 5: AUTHENTICATED USER DASHBOARDS (Graduate, Agency, Tour Co, Traveler)
  // =========================================================================
  const profile = getCurrentProfile();
  const myCleanId = normalizeContact(activeUser ? activeUser.contact : ownerProfile.contact);
  const currentRoomId = activeChatPeer.id ? getPrivateRoomId(myCleanId, activeChatPeer.id) : '';
  const activeConversation = chatMessages.filter((m) => m.roomId === currentRoomId);

  const verifiedDirectory = registeredUsers.filter((u) => u.status === 'approved' && u.id !== myCleanId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top User Bar */}
      <header style={{ background: primary, color: '#fff', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>🇷🇼 {appConfig.appName}</h2>
          <span style={{ fontSize: '12px', opacity: 0.9 }}>
            Welcome, <strong>{activeUser?.name}</strong> ({getRoleDisplayLabel(currentRole)})
          </span>
        </div>
        <button onClick={resetToWelcome} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', padding: '8px 14px', fontWeight: '600', cursor: 'pointer' }}>
          Sign Out
        </button>
      </header>

      {/* Dashboard Navigation */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #dce4e0', padding: '10px 28px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{ padding: '9px 15px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', background: activeTab === 'jobs' ? primary : '#eef3f1', color: activeTab === 'jobs' ? '#fff' : primary }}
        >
          {currentRole === 'traveler' ? '🗺️ Request a Trip' : '💼 Jobs & Trip Requests'}
        </button>
        <button
          onClick={() => setActiveTab('directory')}
          style={{ padding: '9px 15px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', background: activeTab === 'directory' ? primary : '#eef3f1', color: activeTab === 'directory' ? '#fff' : primary }}
        >
          🤝 Partner Directory
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          style={{ padding: '9px 15px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', background: activeTab === 'chat' ? primary : '#eef3f1', color: activeTab === 'chat' ? '#fff' : primary }}
        >
          🔒 Confidential Chat
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          style={{ padding: '9px 15px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', background: activeTab === 'profile' ? primary : '#eef3f1', color: activeTab === 'profile' ? '#fff' : primary }}
        >
          👤 My Profile & Credentials
        </button>
      </nav>

      <main style={{ maxWidth: '1150px', width: '100%', margin: '24px auto', padding: '0 20px', flex: 1 }}>
        {/* TAB 1: JOBS & TRIP MARKETPLACE */}
        {activeTab === 'jobs' && (
          <div>
            {/* Traveler Trip Request Form */}
            {currentRole === 'traveler' && (
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: primary }}>🗺️ Plan Your Custom Rwanda Experience</h3>
                <form onSubmit={handleSubmitTripRequest}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Destination</label>
                      <select
                        value={tripRequestForm.destination}
                        onChange={(e) => setTripRequestForm({ ...tripRequestForm, destination: e.target.value })}
                        style={inputStyle}
                      >
                        {(appConfig.destinations || []).map((d, i) => (
                          <option key={i} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Preferred Partner Type</label>
                      <select
                        value={tripRequestForm.preferredCategory}
                        onChange={(e) => setTripRequestForm({ ...tripRequestForm, preferredCategory: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="graduate">Certified Tourism Graduate / Guide</option>
                        <option value="tour_company">Tour & Safari Company</option>
                        <option value="agency">Travel Agency</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Travel Dates</label>
                      <input
                        type="text"
                        placeholder="e.g. Dec 15 - Dec 18"
                        value={tripRequestForm.dates}
                        onChange={(e) => setTripRequestForm({ ...tripRequestForm, dates: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Number of Guests</label>
                      <input
                        type="number"
                        min="1"
                        value={tripRequestForm.guests}
                        onChange={(e) => setTripRequestForm({ ...tripRequestForm, guests: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Itinerary Notes & Special Requests</label>
                  <textarea
                    rows="3"
                    placeholder="Tell us about your interests (gorilla trekking, cultural tours, transport needs)..."
                    value={tripRequestForm.notes}
                    onChange={(e) => setTripRequestForm({ ...tripRequestForm, notes: e.target.value })}
                    style={inputStyle}
                  />
                  <button type="submit" style={btnPrimary}>Broadcast Trip Request</button>
                </form>
              </div>
            )}

            {/* Agency / Tour Company Post Job Form */}
            {(currentRole === 'agency' || currentRole === 'tour_company') && (
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: primary }}>📢 Post a Guiding or Tourism Consultant Assignment</h3>
                <form onSubmit={handlePostNewJob}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Assignment Title</label>
                      <input
                        type="text"
                        placeholder="e.g. 3-Day Akagera Safari Bilingual Guide"
                        value={newTaskForm.title}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Compensation (RWF)</label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={newTaskForm.rawPay}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, rawPay: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Location</label>
                      <input
                        type="text"
                        value={newTaskForm.location}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, location: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Dates / Schedule</label>
                      <input
                        type="text"
                        placeholder="e.g. Sat 28 Nov, 08:00"
                        value={newTaskForm.date}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <button type="submit" style={btnPrimary}>Publish Assignment</button>
                </form>
              </div>
            )}

            {/* Live Jobs Feed */}
            {currentRole !== 'traveler' && (
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: primary }}>💼 Available Guiding & Tourism Assignments</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {tasks.map((task) => (
                    <div key={task.id} style={{ padding: '16px', borderRadius: '10px', border: '1px solid #dce4e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', background: '#e6efec', color: primary, padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                          {task.category}
                        </span>
                        <h4 style={{ margin: '6px 0 4px', color: primary }}>{task.title}</h4>
                        <div style={{ fontSize: '13px', color: '#4a5a54' }}>
                          Posted by: <strong>{task.agency}</strong> • 📍 {task.location} • 📅 {task.date}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#15803d', marginTop: '4px' }}>
                          {task.pay}
                        </div>
                      </div>
                      <div>
                        {task.status === 'open' && currentRole === 'graduate' ? (
                          <button onClick={() => handleAcceptJob(task)} style={btnPrimary}>
                            Accept Assignment
                          </button>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: task.status === 'open' ? '#15803d' : '#52635d' }}>
                            {task.status === 'open' ? 'Open for Graduates' : `Assigned to ${task.assignedTo}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Traveler Trip Requests Feed */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: primary }}>🌍 Live Traveler Trip Requests</h3>
              {tripRequests.length === 0 ? (
                <p style={{ color: '#52635d', fontSize: '14px' }}>No active traveler requests at the moment.</p>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {tripRequests.map((req) => (
                    <div key={req.id} style={{ padding: '14px', borderRadius: '10px', border: '1px solid #dce4e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: primary }}>📍 {req.destination} ({req.guests} Guests)</div>
                        <div style={{ fontSize: '13px', color: '#4a5a54' }}>
                          Traveler: <strong>{req.travelerName}</strong> • Dates: {req.dates}
                        </div>
                        {req.notes && <div style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '4px' }}>"{req.notes}"</div>}
                      </div>
                      {currentRole !== 'traveler' && req.travelerContact && (
                        <button
                          onClick={() => openConfidentialChat(req.travelerContact, req.travelerName, 'Traveler')}
                          style={btnPrimary}
                        >
                          Message Traveler
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PARTNER DIRECTORY */}
        {activeTab === 'directory' && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: primary }}>🤝 Verified Tourism Network Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {verifiedDirectory.map((member) => {
                const prof = userProfiles[normalizeContact(member.contact)] || {};
                return (
                  <div key={member.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #dce4e0' }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: primary }}>{member.name}</div>
                    <div style={{ fontSize: '12px', color: secondary, fontWeight: '600', marginBottom: '6px' }}>
                      {getRoleDisplayLabel(member.role)} • 📍 {prof.location || 'Kigali, Rwanda'}
                    </div>
                    <p style={{ fontSize: '13px', color: '#4a5a54', minHeight: '36px' }}>
                      {prof.headline || 'Verified GuideLink Rwanda Member'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => openConfidentialChat(member.contact, member.name, getRoleDisplayLabel(member.role))}
                        style={{ ...btnPrimary, flex: 1, fontSize: '13px' }}
                      >
                        💬 Direct Chat
                      </button>
                      {currentRole === 'traveler' && member.role !== 'traveler' && (
                        <button
                          onClick={() => setBookingTarget({ ...member, location: prof.location })}
                          style={{ ...btnSecondary, fontSize: '13px' }}
                        >
                          Book
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Booking Modal */}
            {bookingTarget && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ ...cardStyle, maxWidth: '420px', width: '90%' }}>
                  <h3 style={{ marginTop: 0, color: primary }}>Book {bookingTarget.name}</h3>
                  <form onSubmit={handleDirectBookPartner}>
                    <label style={{ fontSize: '13px', fontWeight: '600' }}>Preferred Dates</label>
                    <input type="text" placeholder="e.g. Jan 10 - Jan 12" value={bookingDetails.dates} onChange={(e) => setBookingDetails({ ...bookingDetails, dates: e.target.value })} style={inputStyle} required />
                    <label style={{ fontSize: '13px', fontWeight: '600' }}>Guests</label>
                    <input type="number" min="1" value={bookingDetails.guests} onChange={(e) => setBookingDetails({ ...bookingDetails, guests: e.target.value })} style={inputStyle} required />
                    <label style={{ fontSize: '13px', fontWeight: '600' }}>Trip Notes</label>
                    <textarea rows="3" value={bookingDetails.notes} onChange={(e) => setBookingDetails({ ...bookingDetails, notes: e.target.value })} style={inputStyle} />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setBookingTarget(null)} style={btnSecondary}>Cancel</button>
                      <button type="submit" style={btnPrimary}>Send Booking & Open Chat</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONFIDENTIAL 1-ON-1 CHAT */}
        {activeTab === 'chat' && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '18px' }}>
            <div style={cardStyle}>
              <h4 style={{ marginTop: 0, color: primary }}>Contacts</h4>
              {verifiedDirectory.map((member) => (
                <div
                  key={member.id}
                  onClick={() => openConfidentialChat(member.contact, member.name, getRoleDisplayLabel(member.role))}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '6px',
                    background: activeChatPeer.id === normalizeContact(member.contact) ? '#e6efec' : 'transparent',
                    fontWeight: activeChatPeer.id === normalizeContact(member.contact) ? '700' : '500'
                  }}
                >
                  <div>{member.name}</div>
                  <div style={{ fontSize: '11px', color: '#52635d' }}>{getRoleDisplayLabel(member.role)}</div>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '480px' }}>
              {!activeChatPeer.id ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#52635d' }}>
                  Select a contact on the left to start an end-to-end confidential conversation.
                </div>
              ) : (
                <>
                  <div style={{ borderBottom: '1px solid #e5ebe8', paddingBottom: '10px', marginBottom: '12px' }}>
                    <strong style={{ color: primary }}>🔒 {activeChatPeer.name}</strong>
                    <span style={{ fontSize: '12px', color: '#52635d', marginLeft: '8px' }}>{activeChatPeer.role}</span>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '6px' }}>
                    {activeConversation.map((msg) => {
                      const isMine = msg.senderId === myCleanId;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                            background: isMine ? primary : '#eef3f1',
                            color: isMine ? '#fff' : '#1a2421',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            maxWidth: '75%',
                            fontSize: '14px'
                          }}
                        >
                          <div>{msg.text}</div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Write a confidential message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      style={{ ...inputStyle, margin: 0, flex: 1 }}
                    />
                    <button type="submit" style={btnPrimary}>Send</button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MY PROFILE & CREDENTIALS */}
        {activeTab === 'profile' && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: primary }}>👤 My Professional Profile & Portfolio</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Display Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateCurrentProfile({ name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Professional Headline</label>
                <input
                  type="text"
                  value={profile.headline}
                  onChange={(e) => updateCurrentProfile({ headline: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Base Location / City</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => updateCurrentProfile({ location: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Standard Rate Info</label>
                <input
                  type="text"
                  value={profile.rateInfo}
                  onChange={(e) => updateCurrentProfile({ rateInfo: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={{ fontSize: '13px', fontWeight: '600' }}>Bio & Specialization</label>
            <textarea
              rows="3"
              value={profile.bio}
              onChange={(e) => updateCurrentProfile({ bio: e.target.value })}
              style={inputStyle}
            />

            {currentRole === 'graduate' && (
              <div style={{ marginTop: '10px', marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Academic Degrees & Certifications</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Advanced Diploma in Tours & Travel Management - RP Kitabi College"
                    value={newDegreeInput}
                    onChange={(e) => setNewDegreeInput(e.target.value)}
                    style={{ ...inputStyle, margin: 0, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newDegreeInput.trim()) return;
                      updateCurrentProfile({ degrees: [...(profile.degrees || []), newDegreeInput.trim()] });
                      setNewDegreeInput('');
                    }}
                    style={btnSecondary}
                  >
                    + Add
                  </button>
                </div>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  {(profile.degrees || []).map((deg, idx) => (
                    <li key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>{deg}</li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => handleSaveWithButton(profile)} disabled={isSaving} style={btnPrimary}>
              {isSaving ? 'Saving to Cloud...' : 'Save Profile Changes'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
