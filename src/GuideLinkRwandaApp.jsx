import React, { useState, useEffect } from 'react';

// =========================================================================
// FIREBASE CONFIGURATION
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

export default function GuideLinkRwandaApp() {
  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending'); // 'pending' | 'users_mgmt' | 'overview' | 'vip' | 'deals' | 'owner_profile'
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'profile' | 'chat'
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const MOMO_PAYMENT_CODE = '612771';

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
  const [platformSettings] = useState({ commissionRatePercent: 10 });
  const [tasks, setTasks] = useState([
    { id: 'default-1', title: 'Half-day Kigali city tour & cultural heritage', agency: 'Cheetah Safaris / Partner Agency', location: 'Kigali', rawPay: 35000, pay: 'RWF 35,000', date: 'Sat 21 Nov, 09:00 to 13:00', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Guiding Job' },
    { id: 'default-2', title: 'Nyungwe Canopy Walk & Tea Plantation Escort', agency: 'Rwanda Eco Tours', location: 'Nyungwe / Rusizi', rawPay: 65000, pay: 'RWF 65,000', date: 'Mon 23 Nov, Full Day', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Consultant Job' }
  ]);

  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

  // Generates a unique, symmetric room ID between two specific participants
  const getPrivateRoomId = (idA, idB) => {
    const cleanA = normalizeContact(idA);
    const cleanB = normalizeContact(idB);
    return [cleanA, cleanB].sort().join('__');
  };

  // Opens a confidential 1-on-1 chat with a specific person/provider
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
    const [profilesDocs, vipDocs, tasksDocs, tripsDocs, chatDocs] = await Promise.all([
      firestoreGetCollection('profiles'),
      firestoreGetCollection('vipTiers'),
      firestoreGetCollection('tasks'),
      firestoreGetCollection('tripRequests'),
      firestoreGetCollection('chats')
    ]);

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
            feePaid: p.feePaid ?? 500,
            momoRef: p.momoRef || 'Cloud Reg',
            status: p.status || 'approved'
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
            skills: p.skills || ['English', 'Kinyarwanda']
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
      skills: ['English', 'Kinyarwanda']
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
      skills: updated.skills
    });
  };

  const handleSaveWithButton = async (profileData) => {
    setIsSaving(true);
    await updateCurrentProfile(profileData);
    setIsSaving(false);
    alert('✓ Profile & updates successfully saved to Firebase Cloud!');
  };

  // Select a user in C.E.O Users Management to edit login info & all dashboard elements
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

  // Save C.E.O edits to user's login credentials and all dashboard fields in Firebase
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

    // Update registeredUsers state
    setRegisteredUsers(
      registeredUsers.map((u) =>
        u.id === docId
          ? {
              ...u,
              name: cleanFields.name.trim(),
              contact: cleanFields.contact.trim(),
              password: cleanFields.password,
              role: cleanFields.role,
              status: cleanFields.status
            }
          : u
      )
    );

    // Update userProfiles state (supporting contact change without losing data)
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

    // Persist all login + dashboard fields to Firestore without erasing unedited metadata
    await firestoreSaveDoc('profiles', docId, {
      name: cleanFields.name.trim(),
      contact: cleanFields.contact.trim(),
      password: cleanFields.password,
      role: cleanFields.role,
      status: cleanFields.status,
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
    alert(`✓ Login info & all dashboard elements for ${cleanFields.name} updated in Firebase!`);
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
    setRegStep('details');
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

  const handleSignInSubmit = (e) => {
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

    const existingUser = registeredUsers.find(
      (u) => normalizeContact(u.contact) === cleanInput
    );

    if (!existingUser) {
      alert('Account not found. Please click "Create Account (Sign Up)".');
      return;
    }

    if (existingUser.status !== 'approved') {
      alert('Access Denied: Your account access has been revoked or is pending C.E.O approval.');
      return;
    }

    if (existingUser.password && existingUser.password !== signInPassword) {
      alert('Access Denied: Incorrect password.');
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
        status: 'approved'
      };
      setRegisteredUsers([freeTraveler, ...registeredUsers]);
      setActiveUser(freeTraveler);
      setCurrentRole('traveler');
      setActiveTab('jobs');

      await firestoreSaveDoc('profiles', cleanInput, {
        name: freeTraveler.name,
        contact: freeTraveler.contact,
        password: freeTraveler.password,
        role: 'traveler',
        feePaid: 0,
        status: 'approved',
        isAvailable: true
      });
      return;
    }

    setRegStep('pay_500');
  };

  const handleComplete500Payment = async () => {
    if (!regForm.momoRef.trim()) {
      alert('Please enter your MoMo Transaction Reference.');
      return;
    }

    const cleanInput = normalizeContact(regForm.contact);
    const newRegistrant = {
      id: cleanInput,
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      password: regForm.password,
      role: regForm.role,
      feePaid: 500,
      momoCodeUsed: MOMO_PAYMENT_CODE,
      momoRef: regForm.momoRef.trim(),
      status: 'pending_approval'
    };

    setRegisteredUsers([newRegistrant, ...registeredUsers]);
    setRegStep('pending_approval');

    await firestoreSaveDoc('profiles', cleanInput, {
      ...newRegistrant,
      isAvailable: true
    });
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
    setRegisteredUsers(
      registeredUsers.map((u) => (u.id === docId ? { ...u, status: nextStatus } : u))
    );
    await firestoreSaveDoc('profiles', docId, { status: nextStatus });
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

    const commission = Math.round((existingTask.rawPay * platformSettings.commissionRatePercent) / 100);
    const updatedTask = {
      ...existingTask,
      status: 'done',
      paymentStatus: 'paid',
      ownerCommission: commission,
      netGuidePayout: existingTask.rawPay - commission,
      createdAt: existingTask.createdAt || Date.now()
    };

    setTasks(tasks.map((t) => (String(t.id) === taskDocId ? updatedTask : t)));
    await firestoreSaveDoc('tasks', taskDocId, updatedTask);
    alert(`✓ Task completed! Commission routed to MoMo Code ${MOMO_PAYMENT_CODE}.`);
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
      destination: tripRequestForm.destination,
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
      destination: 'Volcanoes National Park / Musanze',
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
      travelerName: activeUser?.name || 'Traveler',
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

  // Sends strictly confidential 1-on-1 message visible ONLY to sender & recipient
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
      if (u.status === 'approved' && ['graduate', 'agency', 'tour_company'].includes(u.role)) {
        const key = normalizeContact(u.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `reg-${u.id}`,
          contactId: key,
          type: u.role,
          categoryLabel: getRoleDisplayLabel(u.role),
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

  // Welcome View
  if (currentRole === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200">
        <div>
          <div className="bg-[#E2ECE9] p-6 text-center relative overflow-hidden">
            <div className="absolute top-4 right-6 w-14 h-14 bg-amber-400 rounded-full shadow-md"></div>
            <div className="h-28 flex items-end justify-center space-x-1">
              <div className="w-full h-16 bg-[#5A8F7B] rounded-t-full opacity-60"></div>
              <div className="absolute bottom-0 w-full h-12 bg-[#3B6E5B] rounded-t-full opacity-80"></div>
              <div className="absolute bottom-0 w-3/4 h-8 bg-[#234E40] rounded-t-full"></div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GuideLink Rwanda</h1>
              <p className="text-lg font-medium text-[#234E40] mt-1">Turn your tourism degree into paid work.</p>
              <p className="text-xs text-slate-600 mt-2">
                Connecting Tourism Graduates, Travel Agencies, Tour Companies, and Travelers across Rwanda.
              </p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                C.E.O: {ownerProfile.name} ({ownerProfile.contact})
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#234E40] uppercase tracking-wider">Member Access</span>
                <span className="text-[11px] font-bold bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
                  Travelers: FREE
                </span>
              </div>

              <button
                onClick={() => {
                  setSignInContact('');
                  setSignInPassword('');
                  setCurrentRole('signin');
                }}
                className="w-full py-3.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center space-x-2"
              >
                <span>🔑</span>
                <span>Sign In (Registered Members) →</span>
              </button>

              <button
                onClick={() => {
                  setRegForm({ name: '', contact: '', password: '', confirmPassword: '', role: 'traveler', momoRef: '' });
                  setRegStep('details');
                  setCurrentRole('signup');
                }}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-[#234E40] border border-[#3B6E5B]/30 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2"
              >
                <span>📝</span>
                <span>Create Account (New Sign Up)</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                onClick={() => {
                  setOwnerPinInput('');
                  setShowOwnerPinModal(true);
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2"
              >
                <span>👑</span>
                <span>C.E.O Login ({ownerProfile.name})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Copyright Footer at the Bottom of Welcome Page */}
        <footer className="px-6 py-4 bg-white border-t border-slate-200 text-center">
          <p className="text-[11px] font-medium text-slate-500">
            &copy; {new Date().getFullYear()} <strong className="text-slate-700">{ownerProfile.name}</strong>. All rights reserved.
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            GuideLink Rwanda • Kigali, Rwanda
          </p>
        </footer>

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleOwnerLogin} className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto text-base">
                  🔐
                </div>
                <h3 className="font-bold text-base text-slate-900">C.E.O Authentication</h3>
                <p className="text-xs text-slate-500">Enter private password to unlock Owner HQ.</p>
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

  // Sign In View
  if (currentRole === 'signin') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Secure Member Sign In</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold text-slate-600">
            ← Home
          </button>
        </div>

        <div className="p-6 flex-1">
          <form onSubmit={handleSignInSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <div>
              <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">Password Protected</span>
              <h3 className="text-lg font-bold text-slate-900">Sign In to Your Dashboard</h3>
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
                className="w-full mt-1 p-3 border border-slate-300 rounded-xl text-sm"
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
                className="w-full mt-1 p-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <button type="submit" className="w-full py-3.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition">
              Unlock Dashboard →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Sign Up View
  if (currentRole === 'signup') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Create New Account</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold text-slate-600">
            ← Home
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {regStep === 'details' && (
            <form onSubmit={handleSignUpSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3.5 shadow-sm">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#3B6E5B]">New Registration</span>
                <h3 className="text-lg font-bold text-slate-900">Join GuideLink Rwanda</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Travelers are <strong>FREE</strong>. Partners register via MoMo Code <strong>{MOMO_PAYMENT_CODE}</strong> (500 RWF).
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name or Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alice Uwase"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
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
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Create Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
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
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Select Account Role</label>
                <select
                  value={regForm.role}
                  onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="traveler">🧳 Traveler (FREE Instant Access)</option>
                  <option value="graduate">🎓 Tourism Graduate (Guide / Consultant)</option>
                  <option value="agency">🏢 Travel Agency</option>
                  <option value="tour_company">🚐 Tour Company (Safari Operator)</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow">
                {regForm.role === 'traveler' ? 'Complete Free Sign Up →' : 'Proceed to MoMo Verification →'}
              </button>
            </form>
          )}

          {regStep === 'pay_500' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Pay 500 RWF via MoMo Code</h3>
                <p className="text-xs text-slate-700">
                  Send <strong>500 RWF</strong> to MoMo Code: <strong className="text-[#234E40] text-sm">{MOMO_PAYMENT_CODE}</strong>
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">MoMo Transaction ID / Reference</label>
                <input
                  type="text"
                  required
                  value={regForm.momoRef}
                  onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <button onClick={handleComplete500Payment} className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold text-sm shadow">
                Submit Payment & Notify C.E.O
              </button>
            </div>
          )}

          {regStep === 'pending_approval' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Payment Pending C.E.O Approval</h3>
              <p className="text-xs text-slate-600">
                Payment logged for MoMo Code <strong>{MOMO_PAYMENT_CODE}</strong>. Once confirmed by C.E.O RUTUNGURA Bonheur, sign in with your password.
              </p>
              <button onClick={resetToWelcome} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs">
                Return to Home Screen
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // C.E.O Owner HQ View
  if (currentRole === 'owner') {
    const totalRegFees = registeredUsers.reduce((sum, u) => sum + (u.feePaid || 0), 0);
    const totalDealCommissions = tasks
      .filter((t) => t.paymentStatus === 'paid')
      .reduce((sum, t) => sum + (t.ownerCommission || 0), 0);
    const grandTotalRevenue = totalRegFees + totalDealCommissions;
    const pendingCount = registeredUsers.filter((u) => u.status === 'pending_approval').length;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200 relative">
        <div className="bg-[#234E40] text-white px-5 py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            {ownerProfile.photo ? (
              <img src={ownerProfile.photo} alt="C.E.O" className="w-11 h-11 rounded-full object-cover border-2 border-amber-400" />
            ) : (
              <div className="w-11 h-11 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">👑</div>
            )}
            <div>
              <h2 className="font-bold text-sm">{ownerProfile.name} <span className="text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-extrabold ml-1">C.E.O</span></h2>
              <p className="text-[11px] text-emerald-200">{ownerProfile.contact} • MoMo: {MOMO_PAYMENT_CODE}</p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-emerald-900 px-3 py-1.5 rounded-full font-semibold">Log Out</button>
        </div>

        {/* 6 Owner Iconic Tabs (Including Users Management) */}
        <div className="bg-white border-b border-slate-200 px-1.5 py-2.5 grid grid-cols-6 gap-0.5 text-center sticky top-[76px] z-20 shadow-sm">
          <button onClick={() => setOwnerTab('pending')} className={`p-1.5 rounded-xl flex flex-col items-center relative ${ownerTab === 'pending' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}>
            <span className="text-sm">⏳</span><span className="text-[8px]">Sign-Ups</span>
            {pendingCount > 0 && <span className="absolute top-0.5 right-1 bg-red-600 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">{pendingCount}</span>}
          </button>
          <button
            onClick={() => {
              setOwnerTab('users_mgmt');
              if (registeredUsers.length > 0 && !selectedManagedUserId) {
                handleSelectUserForAdminEdit(registeredUsers[0]);
              }
            }}
            className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'users_mgmt' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}
          >
            <span className="text-sm">👥</span><span className="text-[8px]">Users Mgmt</span>
          </button>
          <button onClick={() => setOwnerTab('overview')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'overview' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">📊</span><span className="text-[8px]">Revenue</span></button>
          <button onClick={() => setOwnerTab('vip')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'vip' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">⭐</span><span className="text-[8px]">3-Tier VIP</span></button>
          <button onClick={() => setOwnerTab('deals')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'deals' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">🎛️</span><span className="text-[8px]">Roles</span></button>
          <button onClick={() => setOwnerTab('owner_profile')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'owner_profile' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-sm">👤</span><span className="text-[8px]">My Profile</span></button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-10">
          {ownerTab === 'pending' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">⏳ Member Sign-Ups, Approvals & Access Control</h3>
              <p className="text-[11px] text-slate-500">Grant or revoke access for any user who complies or fails to comply with requirements.</p>
              {registeredUsers.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border text-center text-xs text-slate-500">No sign-ups logged yet.</div>
              ) : (
                registeredUsers.map((user) => (
                  <div key={user.id} className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs shadow-sm">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-sm">{user.name} <span className="text-slate-500 font-normal">({getRoleDisplayLabel(user.role)})</span></p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status === 'approved' ? '🟢 Active Access' : '🔒 Revoked / Pending'}
                      </span>
                    </div>
                    <p className="text-slate-500">{user.contact} • Ref: {user.momoRef} • Fee: {user.feePaid} RWF</p>
                    
                    <div className="flex space-x-2 pt-1">
                      {user.status !== 'approved' ? (
                        <button onClick={() => toggleUserAccessStatus(user.id, user.contact, user.status)} className="flex-1 py-2 bg-[#3B6E5B] text-white rounded-xl font-bold">
                          ✓ Grant Access
                        </button>
                      ) : (
                        <button onClick={() => toggleUserAccessStatus(user.id, user.contact, user.status)} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                          ✕ Revoke Access
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleSelectUserForAdminEdit(user);
                          setOwnerTab('users_mgmt');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* C.E.O Users Management: Edit Login Info & All Dashboard Elements */}
          {ownerTab === 'users_mgmt' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-900 to-[#234E40] text-white p-4 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full">C.E.O Master Control</span>
                <h3 className="font-bold text-base pt-1">👥 Users Management & Dashboard Editor</h3>
                <p className="text-xs text-emerald-100">Edit any user&apos;s login credentials, role, availability, services, degrees, or experience on their behalf.</p>
              </div>

              {registeredUsers.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border text-center text-xs text-slate-500">
                  No registered users found yet.
                </div>
              ) : (
                <>
                  {/* Select User to Manage */}
                  <div className="bg-white p-4 rounded-2xl border space-y-2 shadow-sm text-xs">
                    <label className="font-bold text-slate-700 block">Select User Account ({registeredUsers.length} Total)</label>
                    <select
                      value={selectedManagedUserId}
                      onChange={(e) => {
                        const found = registeredUsers.find((u) => u.id === e.target.value);
                        if (found) handleSelectUserForAdminEdit(found);
                      }}
                      className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold text-slate-900"
                    >
                      <option value="">-- Choose a member to edit --</option>
                      {registeredUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({getRoleDisplayLabel(u.role)}) • {u.contact}
                        </option>
                      ))}
                    </select>
                  </div>

                  {ownerUserEditForm && (
                    <form onSubmit={handleOwnerSaveManagedUser} className="bg-white p-4 rounded-2xl border space-y-4 shadow-sm text-xs">
                      <div className="border-b pb-2 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-[#234E40]">🔑 Login & Account Credentials</h4>
                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          ID: {ownerUserEditForm.docId}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="font-bold text-slate-700">Full Name / Company Name</label>
                          <input
                            type="text"
                            required
                            value={ownerUserEditForm.name}
                            onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, name: e.target.value })}
                            className="w-full mt-1 p-2.5 border rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700">Login Phone / Email</label>
                            <input
                              type="text"
                              required
                              value={ownerUserEditForm.contact}
                              onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, contact: e.target.value })}
                              className="w-full mt-1 p-2.5 border rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700">Login Password</label>
                            <input
                              type="text"
                              required
                              value={ownerUserEditForm.password}
                              onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, password: e.target.value })}
                              className="w-full mt-1 p-2.5 border rounded-xl font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700">Account Role</label>
                            <select
                              value={ownerUserEditForm.role}
                              onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, role: e.target.value })}
                              className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
                            >
                              <option value="traveler">🧳 Traveler</option>
                              <option value="graduate">🎓 Tourism Graduate / Guide</option>
                              <option value="agency">🏢 Travel Agency</option>
                              <option value="tour_company">🚐 Tour Company</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700">Account Access Status</label>
                            <select
                              value={ownerUserEditForm.status}
                              onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, status: e.target.value })}
                              className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
                            >
                              <option value="approved">🟢 Approved (Active)</option>
                              <option value="pending_approval">⏳ Pending Approval</option>
                              <option value="revoked">🔒 Revoked (Blocked)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Dashboard Elements Section */}
                      <div className="border-t pt-3 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-sm text-[#234E40]">🎛️ Dashboard Elements & Public Listing</h4>
                          <button
                            type="button"
                            onClick={() => setOwnerUserEditForm({ ...ownerUserEditForm, isAvailable: !ownerUserEditForm.isAvailable })}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              ownerUserEditForm.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ownerUserEditForm.isAvailable ? '🟢 Available' : '🟡 Busy'}
                          </button>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700">Dashboard Headline / Tagline</label>
                          <input
                            type="text"
                            placeholder="e.g. Certified Multilingual Safari Guide"
                            value={ownerUserEditForm.headline}
                            onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, headline: e.target.value })}
                            className="w-full mt-1 p-2.5 border rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700">Location</label>
                            <input
                              type="text"
                              value={ownerUserEditForm.location}
                              onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, location: e.target.value })}
                              className="w-full mt-1 p-2.5 border rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700">Standard Rate / Pricing</label>
                            <input
                              type="text"
                              placeholder="e.g. RWF 40,000 / day"
                              value={ownerUserEditForm.rateInfo}
                              onChange={(e) => setOwnerUserEditForm({ ...ownerUserEditForm, rateInfo: e.target.value })}
                              className="w-full mt-1 p-2.5 border rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Services Offered Editor */}
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                          <label className="font-bold text-[#234E40] block">🛠️ Services Offered</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Add service..."
                              value={ownerNewServiceInput}
                              onChange={(e) => setOwnerNewServiceInput(e.target.value)}
                              className="flex-1 p-2 border rounded-xl bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!ownerNewServiceInput.trim()) return;
                                setOwnerUserEditForm({
                                  ...ownerUserEditForm,
                                  servicesOffered: [...(ownerUserEditForm.servicesOffered || []), ownerNewServiceInput.trim()]
                                });
                                setOwnerNewServiceInput('');
                              }}
                              className="px-3 bg-[#234E40] text-white rounded-xl font-bold"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(ownerUserEditForm.servicesOffered || []).map((srv, idx) => (
                              <span key={idx} className="inline-flex items-center space-x-1 bg-white border text-[#234E40] px-2 py-1 rounded-lg">
                                <span>✓ {srv}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOwnerUserEditForm({
                                      ...ownerUserEditForm,
                                      servicesOffered: ownerUserEditForm.servicesOffered.filter((_, i) => i !== idx)
                                    })
                                  }
                                  className="text-red-500 font-bold ml-1"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Qualifications & Degrees Editor */}
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                          <label className="font-bold text-[#234E40] block">🎓 Qualifications & Degrees</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Add degree/certificate..."
                              value={ownerNewDegreeInput}
                              onChange={(e) => setOwnerNewDegreeInput(e.target.value)}
                              className="flex-1 p-2 border rounded-xl bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!ownerNewDegreeInput.trim()) return;
                                setOwnerUserEditForm({
                                  ...ownerUserEditForm,
                                  degrees: [...(ownerUserEditForm.degrees || []), ownerNewDegreeInput.trim()]
                                });
                                setOwnerNewDegreeInput('');
                              }}
                              className="px-3 bg-[#3B6E5B] text-white rounded-xl font-bold"
                            >
                              + Add
                            </button>
                          </div>
                          {(ownerUserEditForm.degrees || []).map((deg, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded-xl mt-1">
                              <span>🎓 {deg}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setOwnerUserEditForm({
                                    ...ownerUserEditForm,
                                    degrees: ownerUserEditForm.degrees.filter((_, i) => i !== idx)
                                  })
                                }
                                className="text-red-500 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Experience Editor */}
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                          <label className="font-bold text-[#234E40] block">💼 Experience</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Add experience..."
                              value={ownerNewExpInput}
                              onChange={(e) => setOwnerNewExpInput(e.target.value)}
                              className="flex-1 p-2 border rounded-xl bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!ownerNewExpInput.trim()) return;
                                setOwnerUserEditForm({
                                  ...ownerUserEditForm,
                                  experiences: [...(ownerUserEditForm.experiences || []), ownerNewExpInput.trim()]
                                });
                                setOwnerNewExpInput('');
                              }}
                              className="px-3 bg-[#3B6E5B] text-white rounded-xl font-bold"
                            >
                              + Add
                            </button>
                          </div>
                          {(ownerUserEditForm.experiences || []).map((exp, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded-xl mt-1">
                              <span>💼 {exp}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setOwnerUserEditForm({
                                    ...ownerUserEditForm,
                                    experiences: ownerUserEditForm.experiences.filter((_, i) => i !== idx)
                                  })
                                }
                                className="text-red-500 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-3.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition"
                      >
                        {isSaving ? '⏳ Syncing to Cloud...' : '💾 Save All Changes to Firebase Cloud'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {ownerTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-5 rounded-2xl text-center space-y-1">
                <span className="text-xs uppercase text-emerald-200 font-bold">Total Platform Revenue</span>
                <div className="text-3xl font-extrabold">RWF {grandTotalRevenue.toLocaleString()}</div>
                <p className="text-[11px] text-emerald-100">
                  MoMo Code: {MOMO_PAYMENT_CODE} • Sign-Ups: RWF {totalRegFees.toLocaleString()} • Commissions: RWF {totalDealCommissions.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {ownerTab === 'vip' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900">🔒 Confidential C.E.O Area</span>
                <p className="text-amber-800">These 3 tiers are hidden from regular users. Revoking access instantly removes the user from the traveler directory.</p>
              </div>
              <h3 className="font-bold text-sm text-slate-900">⭐ 3-Tier VIP Access Control</h3>
              
              {exemptAccounts.map((acc) => (
                <div key={acc.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#234E40] text-sm">{acc.tier}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${acc.confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {acc.confirmed ? '🟢 Access Granted' : '🔒 Access Revoked'}
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Partner Name / Title</label>
                    <input
                      type="text"
                      value={acc.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExemptAccounts(exemptAccounts.map(a => a.id === acc.id ? { ...a, name: val } : a));
                      }}
                      onBlur={() => handleSaveVipEdits(acc)}
                      className="w-full mt-0.5 p-2 border rounded-xl bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Contact / Phone</label>
                    <input
                      type="text"
                      value={acc.contact}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExemptAccounts(exemptAccounts.map(a => a.id === acc.id ? { ...a, contact: val } : a));
                      }}
                      onBlur={() => handleSaveVipEdits(acc)}
                      className="w-full mt-0.5 p-2 border rounded-xl bg-slate-50 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => toggleVipTierAccess(acc.id)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow transition ${
                      acc.confirmed ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#3B6E5B] hover:bg-[#234E40] text-white'
                    }`}
                  >
                    {acc.confirmed ? `Revoke Access for ${acc.tier}` : `✓ Grant Access for ${acc.tier}`}
                  </button>
                </div>
              ))}
            </div>
          )}

          {ownerTab === 'deals' && (
            <div className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs font-bold">
              <h3 className="font-bold text-sm text-slate-900">🎛️ Preview Dashboards</h3>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'graduate' }); setCurrentRole('graduate'); setActiveTab('jobs'); }} className="p-3 bg-emerald-50 text-[#234E40] border rounded-xl">🎓 Graduate</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'agency' }); setCurrentRole('agency'); setActiveTab('jobs'); }} className="p-3 bg-emerald-50 text-[#234E40] border rounded-xl">🏢 Agency</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'tour_company' }); setCurrentRole('tour_company'); setActiveTab('jobs'); }} className="p-3 bg-emerald-50 text-[#234E40] border rounded-xl">🚐 Tour Co.</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'traveler' }); setCurrentRole('traveler'); setActiveTab('jobs'); }} className="p-3 bg-emerald-50 text-[#234E40] border rounded-xl">🧳 Traveler</button>
              </div>
            </div>
          )}

          {ownerTab === 'owner_profile' && (
            <div className="bg-white p-5 rounded-2xl border space-y-4">
              <h3 className="font-bold text-base text-slate-900">👑 C.E.O Profile & Photo</h3>
              <div className="flex flex-col items-center space-y-2">
                {ownerProfile.photo ? (
                  <img src={ownerProfile.photo} alt="C.E.O" className="w-28 h-28 rounded-full object-cover border-4 border-[#3B6E5B] shadow-md" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-slate-200 flex items-center justify-center text-3xl">👑</div>
                )}
                <label className="cursor-pointer bg-[#234E40] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-800 transition">
                  📷 Upload C.E.O Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (imgData) => setOwnerProfile({ ...ownerProfile, photo: imgData }))} />
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Full Name</label>
                  <input type="text" value={ownerProfile.name} onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Executive Title</label>
                  <input type="text" value={ownerProfile.title} onChange={(e) => setOwnerProfile({ ...ownerProfile, title: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700">Phone Number</label>
                    <input type="text" value={ownerProfile.contact} onChange={(e) => setOwnerProfile({ ...ownerProfile, contact: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Email Address</label>
                    <input type="email" value={ownerProfile.email} onChange={(e) => setOwnerProfile({ ...ownerProfile, email: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Executive Bio</label>
                  <textarea rows="3" value={ownerProfile.bio} onChange={(e) => setOwnerProfile({ ...ownerProfile, bio: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveWithButton(ownerProfile)}
                  className="w-full py-3.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow transition"
                >
                  {isSaving ? '⏳ Saving...' : '💾 Save C.E.O Profile & Photo'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Role Dashboards & Workspaces
  const currentProf = getCurrentProfile();
  const isPartnerRole = ['graduate', 'agency', 'tour_company'].includes(currentRole);
  const providerDirectory = buildLiveProviderDirectory();
  const filteredProviders = providerDirectory.filter((item) => {
    if (directoryFilter === 'all') return true;
    return item.type === directoryFilter;
  });

  const matchingTravelerRequests = tripRequests.filter(
    (req) => !req.preferredCategory || req.preferredCategory === currentRole
  );

  // Confidential 1-on-1 Chat Filtering (Strict Privacy Isolation)
  const myChatId = normalizeContact(activeUser?.contact || activeUser?.name || '');
  const activePeerId = normalizeContact(activeChatPeer.id);

  // Only messages where THIS logged-in user is strictly one of the two participants
  const myPrivateMessages = chatMessages.filter((msg) => {
    if (Array.isArray(msg.participants)) {
      return msg.participants.includes(myChatId);
    }
    return normalizeContact(msg.senderId) === myChatId || normalizeContact(msg.recipientId) === myChatId;
  });

  // Active 1-on-1 room messages between me and activeChatPeer ONLY
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

  // Build list of unique private threads this user is part of (never leaks other users' chats)
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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200 relative">
      
      {/* TOP HEADER & NAVIGATION BAR */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="px-5 py-3 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center space-x-3">
            {currentProf?.photo ? (
              <img src={currentProf.photo} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-[#3B6E5B]" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#3B6E5B] text-white flex items-center justify-center font-bold">
                {(currentProf?.name || 'U').charAt(0)}
              </div>
            )}
            <div>
              <h2 className="font-bold text-sm leading-tight">{currentProf?.name}</h2>
              <p className="text-[11px] text-slate-500 capitalize">{getRoleDisplayLabel(currentRole)}</p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full font-semibold transition">Sign Out</button>
        </div>

        {/* TOP TABS NAVIGATION */}
        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-2 rounded-xl transition text-center ${activeTab === 'jobs' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}
          >
            {currentRole === 'traveler' ? '🏠 Explore & Book' : '🏠 Workspace'}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 rounded-xl transition text-center ${activeTab === 'profile' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}
          >
            👤 Profile & Services
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2 rounded-xl transition text-center relative ${activeTab === 'chat' ? 'bg-[#234E40] text-white shadow-sm' : 'hover:bg-slate-200'}`}
          >
            🔒 Private Chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
        {isPartnerRole && currentProf && (
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-900">
                {currentProf.isAvailable !== false ? '🟢 Available for Bookings' : '🔴 Currently Busy'}
              </p>
              <p className="text-[11px] text-slate-500">Live status visible across platform</p>
            </div>
            <button
              onClick={() => updateCurrentProfile({ isAvailable: currentProf.isAvailable === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                currentProf.isAvailable !== false ? 'bg-emerald-100 text-[#234E40]' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {currentProf.isAvailable !== false ? 'Active' : 'Offline'}
            </button>
          </div>
        )}

        {/* Graduate Workspace: See Guiding Jobs, Consultant Jobs, Freelance Traveler Requests */}
        {activeTab === 'jobs' && currentRole === 'graduate' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Graduate Opportunity Hub</span>
              <h3 className="font-bold text-base pt-1">Guiding Jobs, Consultant Roles & Freelance Travelers</h3>
              <p className="text-xs text-emerald-100">Review qualifications, tour schedules, and accept assignments suited for tourism professionals.</p>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-900">🧳 Freelance Traveler Requests ({matchingTravelerRequests.length})</h3>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Action Needed</span>
              </div>

              {matchingTravelerRequests.length === 0 ? (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-500 text-center">
                  No direct freelance traveler requests right now.
                </div>
              ) : (
                matchingTravelerRequests.map((req) => (
                  <div key={req.id} className="bg-white p-4 rounded-2xl border-2 border-amber-300 space-y-2 shadow-sm text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-amber-700">Traveler Expectation / Request</span>
                        <h4 className="font-bold text-sm text-slate-900">{req.destination} ({req.guests} Guests)</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                      </span>
                    </div>
                    <p className="text-slate-600">👤 Traveler: <strong>{req.travelerName}</strong> ({req.travelerContact})</p>
                    <p className="text-slate-500">📅 Dates: {req.dates}</p>
                    {req.notes && <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg">&quot;{req.notes}&quot;</p>}

                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => openConfidentialChat(req.travelerContact || req.travelerName, req.travelerName, 'Traveler')}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
                      >
                        🔒 Private Chat
                      </button>
                      {req.status !== 'confirmed' && (
                        <button
                          onClick={() => handleConfirmTravelerRequest(req.id)}
                          className="flex-1 py-2 bg-[#234E40] text-white rounded-xl font-bold text-xs shadow transition"
                        >
                          ✓ Confirm Deal
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm text-slate-900">📋 Available Guiding & Consultant Jobs</h3>
              {tasks.map((task) => (
                <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm text-xs">
                  <div className="flex justify-between items-start font-bold text-sm">
                    <div>
                      <span className="text-[10px] font-semibold text-[#3B6E5B] uppercase">{task.category || 'Guiding Job'}</span>
                      <h4 className="text-slate-900">{task.title}</h4>
                    </div>
                    <span className="text-[#234E40] bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">{task.pay}</span>
                  </div>
                  <p className="text-slate-500">🏢 {task.agency} • 📍 {task.location} • 📅 {task.date}</p>
                  
                  {task.status === 'open' && (
                    <button onClick={() => handleAcceptTask(task.id)} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold">
                      Accept Assignment →
                    </button>
                  )}
                  {task.status === 'accepted' && (
                    <button onClick={() => handleCompleteTask(task.id)} className="w-full py-2.5 bg-amber-500 text-slate-900 rounded-xl font-bold">
                      ✓ Complete & Settle (MoMo {MOMO_PAYMENT_CODE})
                    </button>
                  )}
                  {task.status === 'done' && (
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl font-bold text-center">
                      ✓ Settled (Net Payout: RWF {task.netGuidePayout?.toLocaleString()})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Travel Agency Workspace */}
        {activeTab === 'jobs' && currentRole === 'agency' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Travel Agency Hub</span>
              <h3 className="font-bold text-base pt-1">Explore Travel Consultants, Guides & Tourists</h3>
              <p className="text-xs text-emerald-100">Review availability, qualifications, and post consultant/guiding assignments.</p>
            </div>

            {matchingTravelerRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900">🧳 Direct Traveler Expectations & Bookings</h3>
                {matchingTravelerRequests.map((req) => (
                  <div key={req.id} className="bg-white p-4 rounded-2xl border-2 border-amber-300 space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{req.destination} ({req.guests} Guests)</span>
                      <span>{req.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}</span>
                    </div>
                    <p className="text-slate-600">Traveler: {req.travelerName} ({req.travelerContact}) • {req.dates}</p>
                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => openConfidentialChat(req.travelerContact || req.travelerName, req.travelerName, 'Traveler')}
                        className="flex-1 py-2 bg-slate-100 rounded-xl font-bold"
                      >
                        🔒 Private Chat
                      </button>
                      {req.status !== 'confirmed' && (
                        <button onClick={() => handleConfirmTravelerRequest(req.id)} className="flex-1 py-2 bg-[#234E40] text-white rounded-xl font-bold">
                          ✓ Confirm Deal
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">👥 Available Consultants, Guides & Partners</h3>
              {filteredProviders.filter(p => p.type === 'graduate').map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2 shadow-sm text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#234E40] flex items-center justify-center font-bold text-sm">🎓</div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">Travel / Tour Consultant & Guide</span>
                        <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prov.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {prov.isAvailable ? '🟢 Available' : '🟡 Busy'}
                    </span>
                  </div>
                  <p className="text-slate-700">{prov.headline}</p>
                  <p className="text-slate-500">📍 {prov.location} • 💰 {prov.rate}</p>
                  <button
                    onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold"
                  >
                    🔒 Private Chat with {prov.name}
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handlePostNewTask} className="bg-white p-4 rounded-2xl border space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-sm text-slate-900">📢 Post Consultant or Guiding Assignment</h3>
              <div>
                <label className="font-bold text-slate-700">Job Category</label>
                <select
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
                >
                  <option value="Consultant Job">Consultant Job</option>
                  <option value="Guiding Job">Guiding Job</option>
                  <option value="Tourism Service">Tourism Service</option>
                </select>
              </div>
              <input
                type="text"
                required
                placeholder="Title (e.g. Senior Itinerary Consultant)"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Location"
                  value={newTaskForm.location}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, location: e.target.value })}
                  className="p-2.5 border rounded-xl"
                />
                <input
                  type="number"
                  required
                  placeholder="Fee in RWF"
                  value={newTaskForm.rawPay}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, rawPay: e.target.value })}
                  className="p-2.5 border rounded-xl"
                />
              </div>
              <input
                type="text"
                placeholder="Date & Duration"
                value={newTaskForm.date}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <button type="submit" className="w-full py-2.5 bg-[#234E40] text-white rounded-xl font-bold shadow">
                + Publish Opportunity
              </button>
            </form>
          </div>
        )}

        {/* Tour Company Workspace */}
        {activeTab === 'jobs' && currentRole === 'tour_company' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Tour Company Hub</span>
              <h3 className="font-bold text-base pt-1">Explore Tour Consultants, Guides, Tourists & Graduates</h3>
              <p className="text-xs text-emerald-100">Review live availability, safari qualifications, and publish expedition gigs.</p>
            </div>

            {matchingTravelerRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900">🧳 Direct Traveler Expectations & Requests</h3>
                {matchingTravelerRequests.map((req) => (
                  <div key={req.id} className="bg-white p-4 rounded-2xl border-2 border-amber-300 space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{req.destination} ({req.guests} Guests)</span>
                      <span>{req.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}</span>
                    </div>
                    <p className="text-slate-600">Traveler: {req.travelerName} ({req.travelerContact}) • {req.dates}</p>
                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => openConfidentialChat(req.travelerContact || req.travelerName, req.travelerName, 'Traveler')}
                        className="flex-1 py-2 bg-slate-100 rounded-xl font-bold"
                      >
                        🔒 Private Chat
                      </button>
                      {req.status !== 'confirmed' && (
                        <button onClick={() => handleConfirmTravelerRequest(req.id)} className="flex-1 py-2 bg-[#234E40] text-white rounded-xl font-bold">
                          ✓ Confirm Deal
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">🚐 Available Tour Consultants, Guides & Graduates</h3>
              {filteredProviders.filter(p => p.type === 'graduate' || p.type === 'tour_company').map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2 shadow-sm text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#234E40] flex items-center justify-center font-bold text-sm">🚐</div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">Tour Consultant & Safari Guide</span>
                        <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prov.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {prov.isAvailable ? '🟢 Available' : '🟡 Busy'}
                    </span>
                  </div>
                  <p className="text-slate-700">{prov.headline}</p>
                  <p className="text-slate-500">📍 {prov.location} • 💰 {prov.rate}</p>
                  <button
                    onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold"
                  >
                    🔒 Private Chat with {prov.name}
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handlePostNewTask} className="bg-white p-4 rounded-2xl border space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-sm text-slate-900">📢 Post Tour Expedition or Guiding Job</h3>
              <div>
                <label className="font-bold text-slate-700">Job Category</label>
                <select
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl bg-white font-semibold"
                >
                  <option value="Guiding Job">Guiding Job</option>
                  <option value="Consultant Job">Tour Consultant Job</option>
                  <option value="Safari Expedition">Safari Expedition</option>
                </select>
              </div>
              <input
                type="text"
                required
                placeholder="Title (e.g. Akagera 3-Day Safari Escort)"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Location"
                  value={newTaskForm.location}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, location: e.target.value })}
                  className="p-2.5 border rounded-xl"
                />
                <input
                  type="number"
                  required
                  placeholder="Fee in RWF"
                  value={newTaskForm.rawPay}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, rawPay: e.target.value })}
                  className="p-2.5 border rounded-xl"
                />
              </div>
              <input
                type="text"
                placeholder="Date & Duration"
                value={newTaskForm.date}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <button type="submit" className="w-full py-2.5 bg-[#234E40] text-white rounded-xl font-bold shadow">
                + Publish Assignment
              </button>
            </form>
          </div>
        )}

        {/* Traveler Dashboard */}
        {activeTab === 'jobs' && currentRole === 'traveler' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Free Traveler Account</span>
              <h3 className="font-bold text-base pt-1">Choose Your Travel Partner in Rwanda</h3>
              <p className="text-xs text-emerald-100">Browse live availability, graduate qualifications, and travel agency expectations.</p>
            </div>

            <div className="grid grid-cols-4 gap-1 bg-white p-1.5 rounded-2xl border text-[10px] font-bold text-center">
              <button onClick={() => setDirectoryFilter('all')} className={`py-2 rounded-xl ${directoryFilter === 'all' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}>All</button>
              <button onClick={() => setDirectoryFilter('graduate')} className={`py-2 rounded-xl ${directoryFilter === 'graduate' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}>Graduates</button>
              <button onClick={() => setDirectoryFilter('agency')} className={`py-2 rounded-xl ${directoryFilter === 'agency' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}>Agencies</button>
              <button onClick={() => setDirectoryFilter('tour_company')} className={`py-2 rounded-xl ${directoryFilter === 'tour_company' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}>Tour Co.</button>
            </div>

            <div className="space-y-3">
              {filteredProviders.map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2.5 shadow-sm text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      {prov.photo ? (
                        <img src={prov.photo} alt={prov.name} className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#234E40] flex items-center justify-center font-bold text-sm">
                          {prov.type === 'graduate' ? '🎓' : prov.type === 'agency' ? '🏢' : '🚐'}
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">{prov.categoryLabel}</span>
                        <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prov.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {prov.isAvailable ? '🟢 Available' : '🟡 Busy'}
                    </span>
                  </div>

                  <p className="text-slate-700 font-medium">{prov.headline}</p>

                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => openConfidentialChat(prov.contactId, prov.name, prov.categoryLabel)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center space-x-1"
                    >
                      <span>🔒</span>
                      <span>Private Chat</span>
                    </button>
                    <button
                      onClick={() => setBookingTarget(prov)}
                      className="flex-1 py-2 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold"
                    >
                      Book Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateTripRequest} className="bg-white p-4 rounded-2xl border space-y-3 shadow-sm">
              <h4 className="font-bold text-sm text-slate-900">🗺️ Request Custom Trip</h4>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Partner Category</label>
                <select
                  value={tripRequestForm.preferredCategory}
                  onChange={(e) => setTripRequestForm({ ...tripRequestForm, preferredCategory: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl text-xs bg-white font-semibold text-[#234E40]"
                >
                  <option value="graduate">🎓 Tourism Graduate (Guide / Consultant)</option>
                  <option value="agency">🏢 Travel Agency</option>
                  <option value="tour_company">🚐 Tour Company (Safari Operator)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Destination</label>
                <select
                  value={tripRequestForm.destination}
                  onChange={(e) => setTripRequestForm({ ...tripRequestForm, destination: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl text-xs bg-white"
                >
                  <option>Volcanoes National Park / Musanze</option>
                  <option>Nyungwe Forest & Lake Kivu (Rusizi / Karongi)</option>
                  <option>Akagera National Park Safari</option>
                  <option>Kigali City & Cultural Heritage Tour</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Dates" value={tripRequestForm.dates} onChange={(e) => setTripRequestForm({ ...tripRequestForm, dates: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
                <input type="number" min="1" placeholder="Guests" value={tripRequestForm.guests} onChange={(e) => setTripRequestForm({ ...tripRequestForm, guests: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              </div>
              <textarea rows="2" placeholder="Notes..." value={tripRequestForm.notes} onChange={(e) => setTripRequestForm({ ...tripRequestForm, notes: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs">
                Broadcast Request →
              </button>
            </form>
          </div>
        )}

        {/* Profile & Qualifications Workspace */}
        {activeTab === 'profile' && currentProf && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border space-y-4 shadow-sm">
              <div className="flex flex-col items-center space-y-2">
                {currentProf.photo ? (
                  <img src={currentProf.photo} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-[#3B6E5B]" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-100 text-[#234E40] flex items-center justify-center font-bold text-2xl">
                    {currentProf.name.charAt(0)}
                  </div>
                )}
                <label className="cursor-pointer bg-[#3B6E5B] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold">
                  📷 Upload Profile Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (imgData) => updateCurrentProfile({ photo: imgData }))} />
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Name / Company Name</label>
                  <input type="text" value={currentProf.name} onChange={(e) => updateCurrentProfile({ name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Headline / Tagline</label>
                  <input type="text" value={currentProf.headline} onChange={(e) => updateCurrentProfile({ headline: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Location</label>
                  <input type="text" value={currentProf.location} onChange={(e) => updateCurrentProfile({ location: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>

                {isPartnerRole && (
                  <div className="space-y-4 pt-3 border-t">
                    <div>
                      <label className="font-bold text-slate-700">💰 Standard Rate / Pricing</label>
                      <input type="text" value={currentProf.rateInfo || ''} onChange={(e) => updateCurrentProfile({ rateInfo: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                    </div>

                    {/* Services Offered */}
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                      <label className="font-bold text-[#234E40] block">🛠️ Services Offered</label>
                      <div className="flex space-x-2">
                        <input type="text" placeholder="e.g. Gorilla Trekking Escort" value={newServiceInput} onChange={(e) => setNewServiceInput(e.target.value)} className="flex-1 p-2 border rounded-xl bg-white" />
                        <button type="button" onClick={() => { if (!newServiceInput.trim()) return; updateCurrentProfile({ servicesOffered: [...(currentProf.servicesOffered || []), newServiceInput.trim()] }); setNewServiceInput(''); }} className="px-3 bg-[#234E40] text-white rounded-xl font-bold">+ Add</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(currentProf.servicesOffered || []).map((srv, idx) => (
                          <span key={idx} className="inline-flex items-center space-x-1 bg-white border text-[#234E40] px-2 py-1 rounded-lg">
                            <span>✓ {srv}</span>
                            <button type="button" onClick={() => updateCurrentProfile({ servicesOffered: currentProf.servicesOffered.filter((_, i) => i !== idx) })} className="text-red-500 font-bold ml-1">✕</button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Qualifications & Degrees */}
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                      <label className="font-bold text-[#234E40] block">🎓 Qualifications & Degrees</label>
                      <div className="flex space-x-2">
                        <input type="text" placeholder="e.g. Advanced Diploma in Tours & Travel (RP Kitabi)" value={newDegreeInput} onChange={(e) => setNewDegreeInput(e.target.value)} className="flex-1 p-2 border rounded-xl bg-white" />
                        <button type="button" onClick={() => { if (!newDegreeInput.trim()) return; updateCurrentProfile({ degrees: [...(currentProf.degrees || []), newDegreeInput.trim()] }); setNewDegreeInput(''); }} className="px-3 bg-[#3B6E5B] text-white rounded-xl font-bold">+ Add</button>
                      </div>
                      {(currentProf.degrees || []).map((deg, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded-xl mt-1">
                          <span>🎓 {deg}</span>
                          <button type="button" onClick={() => updateCurrentProfile({ degrees: currentProf.degrees.filter((_, i) => i !== idx) })} className="text-red-500 font-bold">✕</button>
                        </div>
                      ))}
                    </div>

                    {/* Experience */}
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                      <label className="font-bold text-[#234E40] block">💼 Experience</label>
                      <div className="flex space-x-2">
                        <input type="text" placeholder="e.g. 4 Years Safari Guiding" value={newExperienceInput} onChange={(e) => setNewExperienceInput(e.target.value)} className="flex-1 p-2 border rounded-xl bg-white" />
                        <button type="button" onClick={() => { if (!newExperienceInput.trim()) return; updateCurrentProfile({ experiences: [...(currentProf.experiences || []), newExperienceInput.trim()] }); setNewExperienceInput(''); }} className="px-3 bg-[#3B6E5B] text-white rounded-xl font-bold">+ Add</button>
                      </div>
                      {(currentProf.experiences || []).map((exp, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded-xl mt-1">
                          <span>💼 {exp}</span>
                          <button type="button" onClick={() => updateCurrentProfile({ experiences: currentProf.experiences.filter((_, i) => i !== idx) })} className="text-red-500 font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button type="button" disabled={isSaving} onClick={() => handleSaveWithButton(currentProf)} className="w-full py-3.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow transition">
                  {isSaving ? '⏳ Saving...' : '💾 Save Profile to Firebase'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Strictly Confidential 1-on-1 Private Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white p-4 rounded-2xl border space-y-3 shadow-sm flex flex-col h-[440px]">
            <div className="border-b pb-2.5 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">🔒 Confidential 1-on-1 Chat</h3>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    End-to-end role privacy: Only you and your chat partner see this thread.
                  </p>
                </div>
              </div>

              {/* Switch between active private threads */}
              {myPrivateConversations.length > 0 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">My Chats:</span>
                  {myPrivateConversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => openConfidentialChat(conv.id, conv.name)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition ${
                        activePeerId === conv.id
                          ? 'bg-[#234E40] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {conv.name}
                    </button>
                  ))}
                </div>
              )}

              {activeChatPeer.name && (
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex justify-between items-center text-[11px]">
                  <span>
                    Private Room with: <strong className="text-[#234E40]">{activeChatPeer.name}</strong>
                    {activeChatPeer.role ? ` (${activeChatPeer.role})` : ''}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800">🔐 Private</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-slate-50 rounded-xl text-xs">
              {!activeChatPeer.id ? (
                <div className="text-center text-slate-500 py-10 space-y-2 px-4">
                  <p className="font-bold text-slate-700">No Private Room Selected</p>
                  <p className="text-[11px]">
                    Click <strong>&quot;🔒 Private Chat&quot;</strong> on any Guide, Travel Agency, Tour Company, or Traveler card to start a confidential 1-on-1 conversation.
                  </p>
                </div>
              ) : activeRoomMessages.length === 0 ? (
                <div className="text-center text-slate-400 py-10 space-y-1">
                  <p className="font-semibold text-slate-600">Private conversation with {activeChatPeer.name}</p>
                  <p className="text-[11px]">Third parties (such as agencies or other guides) cannot view this chat.</p>
                </div>
              ) : (
                activeRoomMessages.map((msg) => {
                  const isMine = normalizeContact(msg.senderId) === myChatId;
                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl max-w-[85%] ${
                        isMine ? 'bg-[#234E40] text-white ml-auto' : 'bg-white border text-slate-800'
                      }`}
                    >
                      <div className="flex justify-between text-[9px] opacity-75 mb-1 font-semibold space-x-2">
                        <span>{msg.sender} ({msg.role})</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs">{msg.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            {activeChatPeer.id && (
              <form onSubmit={handleSendChatMessage} className="flex space-x-2 pt-1">
                <input
                  type="text"
                  required
                  placeholder={`Message ${activeChatPeer.name} privately...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 p-2.5 border rounded-xl text-xs"
                />
                <button type="submit" className="px-4 py-2.5 bg-[#234E40] text-white rounded-xl font-bold text-xs">
                  Send
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDirectProviderBooking} className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-3.5 shadow-xl text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">{bookingTarget.categoryLabel}</span>
              <h3 className="font-bold text-base text-slate-900">Book {bookingTarget.name}</h3>
            </div>
            <div>
              <label className="font-bold text-slate-700">Travel Dates</label>
              <input type="text" required placeholder="e.g. 12 Dec - 15 Dec 2026" value={bookingDetails.dates} onChange={(e) => setBookingDetails({ ...bookingDetails, dates: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold text-slate-700">Number of Travelers</label>
              <input type="number" min="1" required value={bookingDetails.guests} onChange={(e) => setBookingDetails({ ...bookingDetails, guests: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="font-bold text-slate-700">Notes</label>
              <textarea rows="2" value={bookingDetails.notes} onChange={(e) => setBookingDetails({ ...bookingDetails, notes: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
            </div>
            <div className="flex space-x-2 pt-1">
              <button type="button" onClick={() => setBookingTarget(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-[#234E40] text-white rounded-xl font-bold">Confirm Request</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
