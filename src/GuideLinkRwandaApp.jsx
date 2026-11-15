import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://gwwkdhgpfaandekxjsjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_w3I2_S57PjMC6NQlYYGWXw_mlP06djP';

// Helper for direct REST requests to Supabase (No npm package needed!)
const supabaseApi = async (table, method = 'GET', data = null, query = '') => {
  try {
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, options);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

export default function GuideLinkRwandaApp() {
  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [directoryFilter, setDirectoryFilter] = useState('all');
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ dates: '', guests: '2', notes: '' });

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
    { id: 'owner', name: 'RUTUNGURA Bonheur (C.E.O)', contact: '+250780558555', email: 'rutungurab5@gmail.com', role: 'owner', tier: 'C.E.O & Administrator HQ', confirmed: true },
    { id: 'vip1', name: 'VIP Partner Tier 1 (Platinum)', contact: '+250781111111', role: 'graduate', tier: 'Tier 1 - Platinum Partner', confirmed: true },
    { id: 'vip2', name: 'VIP Partner Tier 2 (Gold)', contact: '+250782222222', role: 'agency', tier: 'Tier 2 - Gold Partner', confirmed: true },
    { id: 'vip3', name: 'VIP Partner Tier 3 (Silver)', contact: '+250783333333', role: 'tour_company', tier: 'Tier 3 - Silver Partner', confirmed: true }
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

  const [newTaskForm, setNewTaskForm] = useState({ title: '', date: '', rawPay: '', location: 'Kigali' });
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
    { id: 1, title: 'Half-day Kigali city tour & cultural heritage', agency: 'Cheetah Safaris / Partner Agency', location: 'Kigali', rawPay: 35000, pay: 'RWF 35,000', date: 'Sat 21 Nov, 09:00 to 13:00', status: 'open', assignedTo: null, paymentStatus: 'pending' },
    { id: 2, title: 'Nyungwe Canopy Walk & Tea Plantation Escort', agency: 'Rwanda Eco Tours', location: 'Nyungwe / Rusizi', rawPay: 65000, pay: 'RWF 65,000', date: 'Mon 23 Nov, Full Day', status: 'open', assignedTo: null, paymentStatus: 'pending' }
  ]);

  useEffect(() => {
    loadCloudData();
  }, []);

  const loadCloudData = async () => {
    const profiles = await supabaseApi('profiles', 'GET');
    if (profiles && profiles.length > 0) {
      const users = [];
      const profs = {};
      profiles.forEach(p => {
        if (p.role === 'owner') {
          setOwnerProfile({
            name: p.name,
            title: p.headline || ownerProfile.title,
            contact: p.contact,
            email: p.email || ownerProfile.email,
            bio: p.bio || ownerProfile.bio,
            photo: p.photo || ''
          });
        } else {
          users.push({
            id: p.id,
            name: p.name,
            contact: p.contact,
            password: p.password,
            role: p.role,
            feePaid: p.fee_paid || 500,
            momoRef: p.momo_ref || 'Cloud Reg',
            status: p.status || 'approved'
          });
          profs[normalizeContact(p.contact)] = {
            name: p.name,
            contact: p.contact,
            role: p.role,
            photo: p.photo || '',
            isAvailable: p.is_available !== false,
            headline: p.headline || '',
            location: p.location || 'Kigali, Rwanda',
            rateInfo: p.rate_info || '',
            bio: p.bio || '',
            degrees: p.degrees || [],
            servicesOffered: p.services || [],
            experiences: p.experiences || [],
            skills: p.skills || ['English', 'Kinyarwanda']
          };
        }
      });
      if (users.length > 0) setRegisteredUsers(users);
      if (Object.keys(profs).length > 0) setUserProfiles(profs);
    }
  };

  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

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
      headline: activeUser.role === 'graduate' ? 'Certified Tourism Graduate & Guide' : 'Verified Partner',
      location: 'Kigali, Rwanda',
      rateInfo: 'RWF 35,000 / day',
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
      await supabaseApi('profiles', 'POST', {
        contact: ownerProfile.contact,
        name: updatedOwner.name,
        role: 'owner',
        password: 'FYP$2026',
        headline: updatedOwner.title,
        email: updatedOwner.email,
        bio: updatedOwner.bio,
        photo: updatedOwner.photo
      }, '?on_conflict=contact');
      return;
    }

    const key = normalizeContact(activeUser.contact || activeUser.name);
    const existing = getCurrentProfile();
    const updated = { ...existing, ...updates };
    setUserProfiles({ ...userProfiles, [key]: updated });
    if (updates.name) setActiveUser({ ...activeUser, name: updates.name });

    await supabaseApi('profiles', 'POST', {
      contact: activeUser.contact,
      name: updated.name,
      role: activeUser.role,
      password: activeUser.password || '1234',
      is_available: updated.isAvailable,
      headline: updated.headline,
      location: updated.location,
      rate_info: updated.rateInfo,
      photo: updated.photo,
      degrees: updated.degrees,
      services: updated.servicesOffered,
      experiences: updated.experiences,
      skills: updated.skills
    }, '?on_conflict=contact');
  };

  const handleSaveWithButton = async (profileData) => {
    setIsSaving(true);
    await updateCurrentProfile(profileData);
    setIsSaving(false);
    alert('✓ Profile successfully saved to cloud database!');
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
    setSignInContact('');
    setSignInPassword('');
  };

  const checkExemptUser = (contactInput) => {
    const cleanInput = normalizeContact(contactInput);
    return exemptAccounts.find(
      (acc) => acc.confirmed && (normalizeContact(acc.contact) === cleanInput || (acc.email && normalizeContact(acc.email) === cleanInput))
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
      setActiveUser({ name: exemptMatch.name, contact: exemptMatch.contact, role: exemptMatch.role, tier: exemptMatch.tier, isVip: true });
      setCurrentRole(exemptMatch.role);
      setActiveTab('jobs');
      return;
    }

    const existingUser = registeredUsers.find((u) => normalizeContact(u.contact) === cleanInput);
    if (!existingUser) {
      alert('Account not found. Please sign up first.');
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

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.contact.trim() || !regForm.password.trim()) {
      alert('Please fill in your Name, Contact, and create a Password.');
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (regForm.role === 'traveler') {
      const freeTraveler = {
        id: Date.now(),
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
      supabaseApi('profiles', 'POST', {
        name: freeTraveler.name,
        contact: freeTraveler.contact,
        password: freeTraveler.password,
        role: 'traveler',
        status: 'approved'
      });
      return;
    }

    setRegStep('pay_500');
  };

  const handleComplete500Payment = async () => {
    if (!regForm.momoRef.trim()) {
      alert('Please enter your MoMo Reference.');
      return;
    }
    const newReg = {
      id: Date.now(),
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      password: regForm.password,
      role: regForm.role,
      feePaid: 500,
      momoRef: regForm.momoRef,
      status: 'pending_approval'
    };
    setRegisteredUsers([newReg, ...registeredUsers]);
    setRegStep('pending_approval');
    await supabaseApi('profiles', 'POST', {
      name: newReg.name,
      contact: newReg.contact,
      password: newReg.password,
      role: newReg.role,
      fee_paid: 500,
      momo_ref: newReg.momoRef,
      status: 'pending_approval'
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
      alert('Invalid Owner Password.');
      setOwnerPinInput('');
    }
  };

  const approveRegistrant = async (userId, userContact) => {
    setRegisteredUsers(registeredUsers.map((u) => (u.id === userId ? { ...u, status: 'approved' } : u)));
    await supabaseApi('profiles', 'PATCH', { status: 'approved' }, `?contact=eq.${encodeURIComponent(userContact)}`);
    alert('✓ User approved successfully in cloud database!');
  };

  const updateVipTierSlot = (slotId, field, value) => {
    setExemptAccounts(exemptAccounts.map((acc) => (acc.id === slotId ? { ...acc, [field]: value } : acc)));
  };

  const handleAcceptTask = (taskId) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: 'accepted', assignedTo: activeUser?.name || 'Graduate' } : t)));
    alert('✓ Gig accepted!');
  };

  const handleCompleteTask = (taskId) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: 'done', paymentStatus: 'paid' } : t)));
    alert(`✓ Task completed & settled via MoMo ${MOMO_PAYMENT_CODE}.`);
  };

  const handleConfirmTravelerRequest = (reqId) => {
    setTripRequests(tripRequests.map((req) => (req.id === reqId ? { ...req, status: 'confirmed', confirmedBy: activeUser?.name || 'Partner' } : req)));
    alert('✓ Traveler request confirmed!');
  };

  const handlePostNewTask = (e) => {
    e.preventDefault();
    const numericPay = Number(newTaskForm.rawPay);
    if (!newTaskForm.title.trim() || !numericPay) return;
    const created = {
      id: Date.now(),
      title: newTaskForm.title.trim(),
      agency: `${activeUser?.name || 'Partner'} (${getRoleDisplayLabel(currentRole)})`,
      location: newTaskForm.location || 'Kigali',
      rawPay: numericPay,
      pay: `RWF ${numericPay.toLocaleString()}`,
      date: newTaskForm.date || 'Flexible Date',
      status: 'open',
      paymentStatus: 'pending'
    };
    setTasks([created, ...tasks]);
    setNewTaskForm({ title: '', date: '', rawPay: '', location: 'Kigali' });
    alert('✓ Assignment published!');
  };

  const handleCreateTripRequest = (e) => {
    e.preventDefault();
    const req = {
      id: Date.now(),
      travelerName: activeUser?.name || 'Traveler',
      travelerContact: activeUser?.contact || '',
      preferredCategory: tripRequestForm.preferredCategory,
      destination: tripRequestForm.destination,
      dates: tripRequestForm.dates || 'Upcoming',
      guests: tripRequestForm.guests,
      notes: tripRequestForm.notes,
      status: 'pending_confirmation'
    };
    setTripRequests([req, ...tripRequests]);
    setTripRequestForm({ preferredCategory: 'graduate', destination: 'Volcanoes National Park / Musanze', dates: '', guests: '2', notes: '' });
    alert('✓ Request broadcasted!');
  };

  const handleDirectProviderBooking = (e) => {
    e.preventDefault();
    if (!bookingTarget) return;
    const req = {
      id: Date.now(),
      travelerName: activeUser?.name || 'Traveler',
      travelerContact: activeUser?.contact || '',
      preferredCategory: bookingTarget.type,
      targetProvider: `${bookingTarget.name} (${bookingTarget.categoryLabel})`,
      destination: bookingTarget.location,
      dates: bookingDetails.dates || 'Requested Dates',
      guests: bookingDetails.guests,
      notes: bookingDetails.notes,
      status: 'pending_confirmation'
    };
    setTripRequests([req, ...tripRequests]);
    setBookingTarget(null);
    setBookingDetails({ dates: '', guests: '2', notes: '' });
    alert('✓ Booking request sent!');
  };

  const buildLiveProviderDirectory = () => {
    const defaultProviders = [
      {
        id: 'prov-g1',
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
      if (acc.id !== 'owner' && acc.confirmed && ['graduate', 'agency', 'tour_company'].includes(acc.role)) {
        const key = normalizeContact(acc.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `vip-${acc.id}`,
          type: acc.role,
          categoryLabel: `${getRoleDisplayLabel(acc.role)} (${acc.tier})`,
          name: prof.name || acc.name,
          headline: prof.headline || `${acc.tier} • Verified Partner`,
          location: prof.location || 'Kigali, Rwanda',
          languages: (prof.skills || ['English', 'Kinyarwanda']).join(', '),
          rate: prof.rateInfo || 'Custom Packages',
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
              <p className="text-xs text-slate-600 mt-2">Connecting Tourism Graduates, Travel Agencies, Tour Companies, and Travelers across Rwanda.</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">C.E.O: {ownerProfile.name} ({ownerProfile.contact})</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <button onClick={() => { setSignInContact(''); setSignInPassword(''); setCurrentRole('signin'); }} className="w-full py-3.5 bg-[#234E40] hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow transition">
                🔑 Sign In (Registered Members) →
              </button>
              <button onClick={() => { setRegForm({ name: '', contact: '', password: '', confirmPassword: '', role: 'traveler', momoRef: '' }); setRegStep('details'); setCurrentRole('signup'); }} className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-[#234E40] border border-[#3B6E5B]/30 rounded-xl font-bold text-sm transition">
                📝 Create Account (New Sign Up)
              </button>
            </div>
            <div className="pt-1">
              <button onClick={() => { setOwnerPinInput(''); setShowOwnerPinModal(true); }} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition">
                👑 C.E.O Login ({ownerProfile.name})
              </button>
            </div>
          </div>
        </div>

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleOwnerLogin} className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto text-base">🔐</div>
                <h3 className="font-bold text-base text-slate-900">C.E.O Authentication</h3>
              </div>
              <input type="password" required autoFocus placeholder="••••••••" value={ownerPinInput} onChange={(e) => setOwnerPinInput(e.target.value)} className="w-full p-3 border rounded-xl text-sm text-center font-bold tracking-wider" />
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

  if (currentRole === 'signin') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Member Sign In</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold text-slate-600">← Home</button>
        </div>
        <div className="p-6 flex-1">
          <form onSubmit={handleSignInSubmit} className="bg-white p-5 rounded-2xl border space-y-4 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sign In to Your Dashboard</h3>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Phone Number or Email</label>
              <input type="text" required autoFocus value={signInContact} onChange={(e) => setSignInContact(e.target.value)} className="w-full mt-1 p-3 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Password</label>
              <input type="password" required value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="w-full mt-1 p-3 border rounded-xl text-sm" />
            </div>
            <button type="submit" className="w-full py-3.5 bg-[#234E40] text-white rounded-xl font-bold text-sm shadow">Unlock Dashboard →</button>
          </form>
        </div>
      </div>
    );
  }

  if (currentRole === 'signup') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Create Account</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold text-slate-600">← Home</button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {regStep === 'details' && (
            <form onSubmit={handleSignUpSubmit} className="bg-white p-5 rounded-2xl border space-y-3.5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Join GuideLink Rwanda</h3>
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name / Company Name</label>
                <input type="text" required value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Phone Number or Email</label>
                <input type="text" required value={regForm.contact} onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <input type="password" required value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                  <input type="password" required value={regForm.confirmPassword} onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Account Role</label>
                <select value={regForm.role} onChange={(e) => setRegForm({ ...regForm, role: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm bg-white">
                  <option value="traveler">🧳 Traveler (FREE Instant Access)</option>
                  <option value="graduate">🎓 Tourism Graduate (Guide)</option>
                  <option value="agency">🏢 Travel Agency</option>
                  <option value="tour_company">🚐 Tour Company</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow">
                {regForm.role === 'traveler' ? 'Complete Free Sign Up →' : 'Proceed to MoMo Verification →'}
              </button>
            </form>
          )}

          {regStep === 'pay_500' && (
            <div className="bg-white p-5 rounded-2xl border space-y-4 shadow-sm">
              <div className="bg-amber-50 border p-3.5 rounded-xl space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Pay 500 RWF via MoMo Code</h3>
                <p className="text-xs text-slate-700">Send <strong>500 RWF</strong> to MoMo Code: <strong className="text-[#234E40]">{MOMO_PAYMENT_CODE}</strong></p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">MoMo Transaction Reference</label>
                <input type="text" required value={regForm.momoRef} onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-xs" />
              </div>
              <button onClick={handleComplete500Payment} className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold text-sm shadow">Submit Payment</button>
            </div>
          )}

          {regStep === 'pending_approval' && (
            <div className="bg-white p-6 rounded-2xl border text-center space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Pending C.E.O Approval</h3>
              <button onClick={resetToWelcome} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs">Return Home</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentRole === 'owner') {
    const pendingCount = registeredUsers.filter((u) => u.status === 'pending_approval').length;
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border relative">
        <div className="bg-[#234E40] text-white px-5 py-4 flex justify-between items-center sticky top-0 z-30">
          <div>
            <h2 className="font-bold text-sm">{ownerProfile.name} <span className="text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-extrabold ml-1">C.E.O</span></h2>
            <p className="text-[11px] text-emerald-200">{ownerProfile.contact} • MoMo: {MOMO_PAYMENT_CODE}</p>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-emerald-900 px-3 py-1.5 rounded-full font-semibold">Log Out</button>
        </div>

        <div className="bg-white border-b px-2 py-2.5 grid grid-cols-5 gap-1 text-center sticky top-[76px] z-20 shadow-sm">
          <button onClick={() => setOwnerTab('pending')} className={`p-1.5 rounded-xl flex flex-col items-center relative ${ownerTab === 'pending' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}>
            <span className="text-base">⏳</span><span className="text-[9px]">Sign-Ups</span>
            {pendingCount > 0 && <span className="absolute top-1 right-2 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>}
          </button>
          <button onClick={() => setOwnerTab('overview')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'overview' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">📊</span><span className="text-[9px]">Revenue</span></button>
          <button onClick={() => setOwnerTab('vip')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'vip' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">⭐</span><span className="text-[9px]">VIP</span></button>
          <button onClick={() => setOwnerTab('deals')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'deals' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">🎛️</span><span className="text-[9px]">Roles</span></button>
          <button onClick={() => setOwnerTab('owner_profile')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'owner_profile' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">👤</span><span className="text-[9px]">Profile</span></button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-10">
          {ownerTab === 'pending' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">⏳ Member Sign-Ups & Approvals</h3>
              {registeredUsers.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border text-center text-xs text-slate-500">No sign-ups logged yet.</div>
              ) : (
                registeredUsers.map((user) => (
                  <div key={user.id} className="bg-white p-4 rounded-2xl border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <p className="font-bold text-sm">{user.name} <span className="text-slate-500 font-normal">({getRoleDisplayLabel(user.role)})</span></p>
                      <span className="font-bold text-[#234E40]">{user.feePaid === 0 ? 'FREE' : `${user.feePaid} RWF`}</span>
                    </div>
                    <p className="text-slate-500">{user.contact} • Ref: {user.momoRef}</p>
                    {user.status === 'approved' ? (
                      <span className="text-emerald-700 font-bold">✓ Active & Approved</span>
                    ) : (
                      <button onClick={() => approveRegistrant(user.id, user.contact)} className="w-full py-2 bg-[#3B6E5B] text-white rounded-xl font-bold">✓ Confirm Payment</button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {ownerTab === 'overview' && (
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-5 rounded-2xl text-center space-y-1">
              <span className="text-xs uppercase text-emerald-200 font-bold">Total Platform Revenue</span>
              <div className="text-3xl font-extrabold">RWF {(registeredUsers.reduce((s, u) => s + (u.feePaid || 0), 0)).toLocaleString()}</div>
            </div>
          )}

          {ownerTab === 'vip' && (
            <div className="bg-white p-4 rounded-2xl border space-y-3">
              <h3 className="font-bold text-sm text-slate-900">⭐ 3-Tier VIP Access</h3>
              {exemptAccounts.map((acc) => (
                <div key={acc.id} className="p-3 bg-slate-50 border rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#234E40]">{acc.tier}</span>
                    <label className="flex items-center space-x-1 font-semibold text-slate-700">
                      <input type="checkbox" checked={acc.confirmed} disabled={acc.id === 'owner'} onChange={(e) => updateVipTierSlot(acc.id, 'confirmed', e.target.checked)} />
                      <span>Free Access</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ownerTab === 'deals' && (
            <div className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs font-bold">
              <h3 className="font-bold text-sm text-slate-900">🎛️ Preview Dashboards</h3>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'graduate' }); setCurrentRole('graduate'); setActiveTab('jobs'); }} className="p-3 bg-emerald-50 text-[#234E40] border rounded-xl">🎓 Graduate</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'traveler' }); setCurrentRole('traveler'); setActiveTab('jobs'); }} className="p-3 bg-emerald-50 text-[#234E40] border rounded-xl">🧳 Traveler</button>
              </div>
            </div>
          )}

          {ownerTab === 'owner_profile' && (
            <div className="bg-white p-5 rounded-2xl border space-y-4">
              <h3 className="font-bold text-base text-slate-900">👑 C.E.O Profile</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Full Name</label>
                  <input type="text" value={ownerProfile.name} onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                <button type="button" onClick={() => handleSaveWithButton(ownerProfile)} className="w-full py-3.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm">Save Profile</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentProf = getCurrentProfile();
  const providerDirectory = buildLiveProviderDirectory();
  const filteredProviders = providerDirectory.filter((item) => directoryFilter === 'all' || item.type === directoryFilter);
  const matchingTravelerRequests = tripRequests.filter((req) => !req.preferredCategory || req.preferredCategory === currentRole);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border relative">
      <div className="bg-white px-5 py-3.5 border-b flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#3B6E5B] text-white flex items-center justify-center font-bold">{(currentProf?.name || 'U').charAt(0)}</div>
          <div>
            <h2 className="font-bold text-sm">{currentProf?.name}</h2>
            <p className="text-[11px] text-slate-500 capitalize">{getRoleDisplayLabel(currentRole)}</p>
          </div>
        </div>
        <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold">Sign Out</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4">
        {activeTab === 'jobs' && currentRole === 'graduate' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <h3 className="font-bold text-sm text-slate-900">🧳 Traveler Requests ({matchingTravelerRequests.length})</h3>
              {matchingTravelerRequests.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded-2xl border-2 border-amber-300 space-y-2 text-xs">
                  <h4 className="font-bold text-sm text-slate-900">{req.destination} ({req.guests} Guests)</h4>
                  <p className="text-slate-600">Traveler: {req.travelerName} ({req.travelerContact})</p>
                  {req.status !== 'confirmed' ? (
                    <button onClick={() => handleConfirmTravelerRequest(req.id)} className="w-full py-2 bg-[#234E40] text-white rounded-xl font-bold">Confirm Request</button>
                  ) : (
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl font-bold text-center">✓ Confirmed</div>
                  )}
                </div>
              ))}
            </div>

            {tasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs">
                <div className="flex justify-between font-bold text-sm">
                  <span>{task.title}</span>
                  <span className="text-[#234E40]">{task.pay}</span>
                </div>
                {task.status === 'open' && <button onClick={() => handleAcceptTask(task.id)} className="w-full py-2 bg-[#3B6E5B] text-white rounded-xl font-bold">Accept Assignment</button>}
                {task.status === 'accepted' && <button onClick={() => handleCompleteTask(task.id)} className="w-full py-2 bg-amber-500 text-slate-900 rounded-xl font-bold">Complete & Settle</button>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'jobs' && currentRole === 'traveler' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-4 rounded-2xl shadow-sm space-y-1">
              <h3 className="font-bold text-base">Choose Your Travel Partner</h3>
            </div>
            <div className="space-y-3">
              {filteredProviders.map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs">
                  <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                  <p className="text-slate-700">{prov.headline}</p>
                  <button onClick={() => setBookingTarget(prov)} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold">Book Partner</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && currentProf && (
          <div className="bg-white p-5 rounded-2xl border space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">My Profile</h3>
            <div>
              <label className="font-bold text-slate-700">Name</label>
              <input type="text" value={currentProf.name} onChange={(e) => updateCurrentProfile({ name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
            </div>
            <button type="button" onClick={() => handleSaveWithButton(currentProf)} className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold">Save Profile</button>
          </div>
        )}
      </div>

      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDirectProviderBooking} className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-3.5 text-xs">
            <h3 className="font-bold text-base text-slate-900">Book {bookingTarget.name}</h3>
            <input type="text" required placeholder="Travel Dates" value={bookingDetails.dates} onChange={(e) => setBookingDetails({ ...bookingDetails, dates: e.target.value })} className="w-full p-2.5 border rounded-xl" />
            <div className="flex space-x-2">
              <button type="button" onClick={() => setBookingTarget(null)} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-semibold">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-[#234E40] text-white rounded-xl font-bold">Confirm</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-t py-2.5 px-10 flex justify-around items-center text-xs font-bold text-slate-500 absolute bottom-0 w-full max-w-md z-20">
        <button onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center ${activeTab === 'jobs' ? 'text-[#234E40]' : ''}`}><span>🏠</span><span>Explore</span></button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-[#234E40]' : ''}`}><span>👤</span><span>Profile</span></button>
      </div>
    </div>
  );
}
