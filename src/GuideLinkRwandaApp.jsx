import React, { useState, useEffect } from 'react';

export default function GuideLinkRwandaApp() {
  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Traveler Directory Filter & Quick Booking Modal
  const [directoryFilter, setDirectoryFilter] = useState('all'); // 'all' | 'guides' | 'agencies'
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ dates: '', guests: '2', notes: '' });

  const MOMO_PAYMENT_CODE = '612771';

  // Persistent Owner Profile
  const [ownerProfile, setOwnerProfile] = useState(() => {
    const saved = localStorage.getItem('gl_owner_profile');
    return saved
      ? JSON.parse(saved)
      : {
          name: 'RUTUNGURA Bonheur',
          title: 'Founder & Platform Administrator • GuideLink Rwanda',
          contact: '+250780000000',
          bio: 'Tourism Management Specialist & Creator of GuideLink Rwanda.',
          photo: ''
        };
  });

  // 3-Tier VIP System Configuration
  const [exemptAccounts, setExemptAccounts] = useState(() => {
    const saved = localStorage.getItem('gl_exempt_users');
    return saved
      ? JSON.parse(saved)
      : [
          { id: 'owner', name: 'RUTUNGURA Bonheur (Owner)', contact: '+250780000000', role: 'owner', tier: 'Administrator HQ', confirmed: true },
          { id: 'vip1', name: 'VIP Partner Tier 1 (Platinum)', contact: '+250781111111', role: 'graduate', tier: 'Tier 1 - Platinum Partner', confirmed: true },
          { id: 'vip2', name: 'VIP Partner Tier 2 (Gold)', contact: '+250782222222', role: 'agency', tier: 'Tier 2 - Gold Partner', confirmed: true },
          { id: 'vip3', name: 'VIP Partner Tier 3 (Silver)', contact: '+250783333333', role: 'graduate', tier: 'Tier 3 - Silver Partner', confirmed: true }
        ];
  });

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('gl_registered_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [userProfiles, setUserProfiles] = useState(() => {
    const saved = localStorage.getItem('gl_user_profiles');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeUser, setActiveUser] = useState(null);
  const [regStep, setRegStep] = useState('details');
  const [regForm, setRegForm] = useState({
    name: '',
    contact: '',
    role: 'graduate',
    paymentMethod: 'mtn',
    momoRef: ''
  });

  // Graduate CV Inputs
  const [newDegreeInput, setNewDegreeInput] = useState('');

  // Agency Task Posting Form
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    date: '',
    rawPay: '',
    location: 'Kigali'
  });

  // Traveler Trip Request Form
  const [tripRequestForm, setTripRequestForm] = useState({
    destination: 'Volcanoes National Park / Musanze',
    dates: '',
    guests: '2',
    notes: ''
  });

  const [tripRequests, setTripRequests] = useState(() => {
    const saved = localStorage.getItem('gl_trip_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [platformSettings, setPlatformSettings] = useState(() => {
    const saved = localStorage.getItem('gl_platform_settings');
    return saved ? JSON.parse(saved) : { commissionRatePercent: 10 };
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('gl_tasks_data');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            title: 'Half-day Kigali city tour & cultural heritage',
            agency: 'Cheetah Safaris / Partner Agency',
            location: 'Kigali',
            rawPay: 35000,
            pay: 'RWF 35,000',
            date: 'Sat 21 Nov, 09:00 to 13:00',
            status: 'open',
            assignedTo: null,
            paymentStatus: 'pending'
          },
          {
            id: 2,
            title: 'Nyungwe Canopy Walk & Tea Plantation Escort',
            agency: 'Rwanda Eco Tours',
            location: 'Nyungwe / Rusizi',
            rawPay: 65000,
            pay: 'RWF 65,000',
            date: 'Mon 23 Nov, Full Day',
            status: 'open',
            assignedTo: null,
            paymentStatus: 'pending'
          }
        ];
  });

  useEffect(() => { localStorage.setItem('gl_owner_profile', JSON.stringify(ownerProfile)); }, [ownerProfile]);
  useEffect(() => { localStorage.setItem('gl_exempt_users', JSON.stringify(exemptAccounts)); }, [exemptAccounts]);
  useEffect(() => { localStorage.setItem('gl_registered_users', JSON.stringify(registeredUsers)); }, [registeredUsers]);
  useEffect(() => { localStorage.setItem('gl_user_profiles', JSON.stringify(userProfiles)); }, [userProfiles]);
  useEffect(() => { localStorage.setItem('gl_platform_settings', JSON.stringify(platformSettings)); }, [platformSettings]);
  useEffect(() => { localStorage.setItem('gl_tasks_data', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('gl_trip_requests', JSON.stringify(tripRequests)); }, [tripRequests]);

  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

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
      availabilityNote: 'Available for immediate booking',
      headline:
        activeUser.role === 'graduate'
          ? 'Certified Tourism Graduate & Guide'
          : activeUser.role === 'agency'
          ? 'Licensed Tour Operator & Travel Agency'
          : 'Explorer & Verified Traveler',
      location: 'Kigali, Rwanda',
      bio: '',
      degrees: [],
      skills: ['English', 'Kinyarwanda']
    };
  };

  const updateCurrentProfile = (updates) => {
    if (!activeUser) {
      setOwnerProfile({ ...ownerProfile, ...updates });
      return;
    }
    const key = normalizeContact(activeUser.contact || activeUser.name);
    const existing = getCurrentProfile();
    const updated = { ...existing, ...updates };
    setUserProfiles({ ...userProfiles, [key]: updated });
    if (updates.name) {
      setActiveUser({ ...activeUser, name: updates.name });
    }
  };

  const handleSaveWithButton = (profileData) => {
    setIsSaving(true);
    setTimeout(() => {
      if (!activeUser) {
        localStorage.setItem('gl_owner_profile', JSON.stringify(profileData));
      } else {
        const key = normalizeContact(activeUser.contact || activeUser.name);
        setUserProfiles({ ...userProfiles, [key]: profileData });
      }
      setIsSaving(false);
      alert('✓ Profile & availability successfully saved!');
    }, 300);
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
  };

  const checkExemptUser = (contactInput) => {
    const cleanInput = normalizeContact(contactInput);
    return exemptAccounts.find(
      (acc) => acc.confirmed && normalizeContact(acc.contact) === cleanInput
    );
  };

  // Registration & Sign-In Handler (Travelers = FREE instant entry)
  const handleProceedRegistration = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.contact.trim()) {
      alert('Please enter your Full Name and Contact.');
      return;
    }

    const cleanInput = normalizeContact(regForm.contact);

    // 1. Check Owner or VIP Tiers
    const exemptMatch = checkExemptUser(regForm.contact);
    if (exemptMatch) {
      if (exemptMatch.id === 'owner') {
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

    // 2. Check if already registered & approved
    const existingUser = registeredUsers.find(
      (u) => normalizeContact(u.contact) === cleanInput
    );
    if (existingUser) {
      if (existingUser.status === 'approved') {
        setActiveUser(existingUser);
        setCurrentRole(existingUser.role);
        setActiveTab('jobs');
        return;
      } else {
        setRegStep('pending_approval');
        return;
      }
    }

    // 3. Travelers sign up & sign in completely FREE without MoMo fee
    if (regForm.role === 'traveler') {
      const freeTraveler = {
        id: Date.now(),
        name: regForm.name.trim(),
        contact: regForm.contact.trim(),
        role: 'traveler',
        feePaid: 0,
        momoCodeUsed: 'FREE_TRAVELER',
        momoRef: 'Free Traveler Access',
        status: 'approved',
        createdAt: new Date().toLocaleDateString()
      };
      setRegisteredUsers([freeTraveler, ...registeredUsers]);
      setActiveUser(freeTraveler);
      setCurrentRole('traveler');
      setActiveTab('jobs');
      return;
    }

    // 4. Graduates & Agencies proceed to 500 RWF MoMo Code payment
    setRegStep('pay_500');
  };

  const handleComplete500Payment = () => {
    if (!regForm.momoRef.trim()) {
      alert('Please enter your MoMo Transaction Reference.');
      return;
    }

    const newRegistrant = {
      id: Date.now(),
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      role: regForm.role,
      feePaid: 500,
      momoCodeUsed: MOMO_PAYMENT_CODE,
      momoRef: regForm.momoRef,
      status: 'pending_approval',
      createdAt: new Date().toLocaleDateString()
    };

    setRegisteredUsers([newRegistrant, ...registeredUsers]);
    setRegStep('pending_approval');
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

  const approveRegistrant = (userId) => {
    setRegisteredUsers(
      registeredUsers.map((u) => (u.id === userId ? { ...u, status: 'approved' } : u))
    );
  };

  const updateVipTierSlot = (slotId, field, value) => {
    setExemptAccounts(
      exemptAccounts.map((acc) => (acc.id === slotId ? { ...acc, [field]: value } : acc))
    );
  };

  // Graduate Actions
  const handleAcceptTask = (taskId) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'accepted', assignedTo: activeUser?.name || 'Graduate' } : t
      )
    );
    alert('✓ Gig accepted! Check My Active Gigs to complete and settle via MoMo.');
  };

  const handleCompleteTask = (taskId) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === taskId) {
          const commission = Math.round((t.rawPay * platformSettings.commissionRatePercent) / 100);
          return {
            ...t,
            status: 'done',
            paymentStatus: 'paid',
            ownerCommission: commission,
            netGuidePayout: t.rawPay - commission
          };
        }
        return t;
      })
    );
    alert(`✓ Task completed! ${platformSettings.commissionRatePercent}% commission routed to MoMo Code ${MOMO_PAYMENT_CODE}.`);
  };

  // Agency Action: Post New Task
  const handlePostNewTask = (e) => {
    e.preventDefault();
    const numericPay = Number(newTaskForm.rawPay);
    if (!newTaskForm.title.trim() || !numericPay) {
      alert('Please enter a valid task title and RWF amount.');
      return;
    }
    const created = {
      id: Date.now(),
      title: newTaskForm.title.trim(),
      agency: activeUser?.name || 'Partner Agency',
      location: newTaskForm.location || 'Kigali',
      rawPay: numericPay,
      pay: `RWF ${numericPay.toLocaleString()}`,
      date: newTaskForm.date || 'Flexible Date',
      status: 'open',
      assignedTo: null,
      paymentStatus: 'pending'
    };
    setTasks([created, ...tasks]);
    setNewTaskForm({ title: '', date: '', rawPay: '', location: 'Kigali' });
    alert('✓ Guiding assignment published to Graduate Board!');
  };

  // Traveler Action: Post Custom Trip Request
  const handleCreateTripRequest = (e) => {
    e.preventDefault();
    const req = {
      id: Date.now(),
      travelerName: activeUser?.name || 'Traveler',
      travelerContact: activeUser?.contact || '',
      targetProvider: 'Open to All Verified Guides & Agencies',
      destination: tripRequestForm.destination,
      dates: tripRequestForm.dates || 'Upcoming',
      guests: tripRequestForm.guests,
      notes: tripRequestForm.notes,
      status: 'open'
    };
    setTripRequests([req, ...tripRequests]);
    setTripRequestForm({ destination: 'Volcanoes National Park / Musanze', dates: '', guests: '2', notes: '' });
    alert('✓ Trip request posted! Verified guides and agencies can now respond.');
  };

  // Traveler Direct Provider Booking Handler
  const handleDirectProviderBooking = (e) => {
    e.preventDefault();
    if (!bookingTarget) return;
    const newBooking = {
      id: Date.now(),
      travelerName: activeUser?.name || 'Traveler',
      travelerContact: activeUser?.contact || '',
      targetProvider: `${bookingTarget.name} (${bookingTarget.categoryLabel})`,
      destination: bookingTarget.location,
      dates: bookingDetails.dates || 'Requested Immediate Dates',
      guests: bookingDetails.guests,
      notes: bookingDetails.notes,
      status: 'requested'
    };
    setTripRequests([newBooking, ...tripRequests]);
    setBookingTarget(null);
    setBookingDetails({ dates: '', guests: '2', notes: '' });
    alert(`✓ Direct booking request sent to ${newBooking.targetProvider}!`);
  };

  // Build Live Directory of Available Guides, Consultants & Tour Agencies for Travelers
  const buildLiveProviderDirectory = () => {
    const defaultProviders = [
      {
        id: 'prov-g1',
        type: 'guide',
        categoryLabel: 'Tour Guide & Travel Consultant',
        name: 'Jean Bosco Habimana',
        headline: 'Certified Multilingual Safari & Cultural Guide (RP Kitabi)',
        location: 'Kigali & Volcanoes NP',
        languages: 'English, French, Kinyarwanda',
        rate: 'RWF 40,000 / day',
        isAvailable: true,
        badge: 'Verified Graduate'
      },
      {
        id: 'prov-g2',
        type: 'guide',
        categoryLabel: 'Destination & Travel Consultant',
        name: 'Claudine Mukamana',
        headline: 'Itinerary Planner, Airline Ticketing & Nyungwe Specialist',
        location: 'Rusizi & Nyungwe Forest',
        languages: 'English, Swahili, Kinyarwanda',
        rate: 'RWF 35,000 / day',
        isAvailable: true,
        badge: 'Travel Consultant'
      },
      {
        id: 'prov-a1',
        type: 'agency',
        categoryLabel: 'Tour Company & Safari Operator',
        name: 'Cheetah Safaris Rwanda',
        headline: 'Gorilla Trekking, Akagera Wildlife & Custom 4x4 Expeditions',
        location: 'Kigali City',
        languages: 'Full Safari Fleet & Permits',
        rate: 'Custom Packages',
        isAvailable: true,
        badge: 'Licensed Tour Operator'
      },
      {
        id: 'prov-a2',
        type: 'agency',
        categoryLabel: 'Travel Agency & DMC',
        name: 'Amahoro Heritage & Eco Tours',
        headline: 'Community Cultural Experiences, Musanze & Lake Kivu Tours',
        location: 'Musanze / Northern Province',
        languages: 'RDB Licensed Operator',
        rate: 'Group & Private Tours',
        isAvailable: true,
        badge: 'Tour Company'
      }
    ];

    // Merge live registered/approved Graduates & Agencies + VIP Partners
    const dynamicProviders = [];

    // From VIP Slots
    exemptAccounts.forEach((acc) => {
      if (acc.id !== 'owner' && acc.confirmed && (acc.role === 'graduate' || acc.role === 'agency')) {
        const key = normalizeContact(acc.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `vip-${acc.id}`,
          type: acc.role === 'graduate' ? 'guide' : 'agency',
          categoryLabel: acc.role === 'graduate' ? 'VIP Guide & Consultant' : 'VIP Tour Company / Agency',
          name: prof.name || acc.name,
          headline: prof.headline || `${acc.tier} • Verified Partner`,
          location: prof.location || 'Kigali, Rwanda',
          languages: (prof.skills || ['English', 'Kinyarwanda']).join(', '),
          rate: acc.role === 'graduate' ? 'RWF 45,000 / day' : 'Custom Safari Packages',
          isAvailable: prof.isAvailable !== false,
          photo: prof.photo || '',
          badge: acc.tier
        });
      }
    });

    // From Approved Registered Graduates & Agencies
    registeredUsers.forEach((u) => {
      if (u.status === 'approved' && (u.role === 'graduate' || u.role === 'agency')) {
        const key = normalizeContact(u.contact);
        const prof = userProfiles[key] || {};
        dynamicProviders.push({
          id: `reg-${u.id}`,
          type: u.role === 'graduate' ? 'guide' : 'agency',
          categoryLabel: u.role === 'graduate' ? 'Tourism Graduate & Guide' : 'Travel Agency / Tour Company',
          name: prof.name || u.name,
          headline: prof.headline || (u.role === 'graduate' ? 'Certified Guide & Travel Consultant' : 'Licensed Travel Agency'),
          location: prof.location || 'Rwanda',
          languages: (prof.skills || ['English', 'Kinyarwanda']).join(', '),
          rate: u.role === 'graduate' ? 'RWF 35,000 / day' : 'Custom Itineraries',
          isAvailable: prof.isAvailable !== false,
          photo: prof.photo || '',
          badge: u.role === 'graduate' ? 'Verified Guide' : 'Verified Agency'
        });
      }
    });

    return [...dynamicProviders, ...defaultProviders];
  };

  // ---------------- WELCOME VIEW ----------------
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

          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GuideLink Rwanda</h1>
              <p className="text-lg font-medium text-[#234E40] mt-1">Turn your tourism degree into paid work.</p>
              <p className="text-xs text-slate-600 mt-2">
                Freelance guiding and travel consulting, matched with agencies and travelers across Rwanda.
              </p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                Developed & Copyright © 2026 {ownerProfile.name}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#234E40] uppercase tracking-wider">Member Portal</span>
                <span className="text-[11px] font-bold bg-emerald-100 text-[#234E40] px-2.5 py-0.5 rounded-full">
                  Travelers: FREE • MoMo: {MOMO_PAYMENT_CODE}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Travelers</strong> sign up free to browse available guides, consultants, and tour companies. Graduates & Agencies register via MoMo Code <strong>{MOMO_PAYMENT_CODE}</strong>.
              </p>
              <button
                onClick={() => {
                  setRegStep('details');
                  setCurrentRole('register');
                }}
                className="w-full py-3.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center space-x-2"
              >
                <span>📝</span>
                <span>Sign Up / Member Sign In →</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setOwnerPinInput('');
                  setShowOwnerPinModal(true);
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2"
              >
                <span>🔐</span>
                <span>Owner Login ({ownerProfile.name})</span>
              </button>
            </div>
          </div>
        </div>

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleOwnerLogin} className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto text-base">
                  🔐
                </div>
                <h3 className="font-bold text-base text-slate-900">Owner Authentication</h3>
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

  // ---------------- REGISTRATION / SIGN-IN VIEW ----------------
  if (currentRole === 'register') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Member Sign Up / Sign In</h2>
          <button
            onClick={resetToWelcome}
            className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold text-slate-600"
          >
            ← Home
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {regStep === 'details' && (
            <form onSubmit={handleProceedRegistration} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Account Verification</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>Travelers</strong> & VIP Partners enter <strong>free immediately</strong>. Graduates & Agencies pay 500 RWF one-time verification.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name</label>
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
              <div>
                <label className="text-xs font-bold text-slate-700">Select Account Role</label>
                <select
                  value={regForm.role}
                  onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="traveler">Traveler (FREE Instant Access)</option>
                  <option value="graduate">Tourism Graduate (Guide / Consultant)</option>
                  <option value="agency">Travel Agency (Tour Operator)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow"
              >
                {regForm.role === 'traveler' ? 'Enter Traveler Dashboard Free →' : 'Continue →'}
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
              <button
                onClick={handleComplete500Payment}
                className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold text-sm shadow"
              >
                Submit Payment & Notify Owner
              </button>
            </div>
          )}

          {regStep === 'pending_approval' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Payment Pending Owner Approval</h3>
              <p className="text-xs text-slate-600">
                Your payment to MoMo Code <strong>{MOMO_PAYMENT_CODE}</strong> has been logged. Once confirmed, sign in with your phone/email.
              </p>
              <button
                onClick={resetToWelcome}
                className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs"
              >
                Return to Home Screen
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------- OWNER HQ VIEW ----------------
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
              <img src={ownerProfile.photo} alt="Owner" className="w-10 h-10 rounded-full object-cover border-2 border-amber-400" />
            ) : (
              <div className="w-10 h-10 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">👑</div>
            )}
            <div>
              <h2 className="font-bold text-sm">{ownerProfile.name}</h2>
              <p className="text-[11px] text-emerald-200">MoMo Code: {MOMO_PAYMENT_CODE}</p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-emerald-900 px-3 py-1.5 rounded-full font-semibold">Log Out</button>
        </div>

        {/* 5 OWNER ICONIC TABS */}
        <div className="bg-white border-b border-slate-200 px-2 py-2.5 grid grid-cols-5 gap-1 text-center sticky top-[72px] z-20 shadow-sm">
          <button onClick={() => setOwnerTab('pending')} className={`p-1.5 rounded-xl flex flex-col items-center relative ${ownerTab === 'pending' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}>
            <span className="text-base">⏳</span><span className="text-[9px]">Sign-Ups</span>
            {pendingCount > 0 && <span className="absolute top-1 right-2 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>}
          </button>
          <button onClick={() => setOwnerTab('overview')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'overview' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">📊</span><span className="text-[9px]">Revenue</span></button>
          <button onClick={() => setOwnerTab('vip')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'vip' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">⭐</span><span className="text-[9px]">3-Tier VIP</span></button>
          <button onClick={() => setOwnerTab('deals')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'deals' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">🎛️</span><span className="text-[9px]">Roles</span></button>
          <button onClick={() => setOwnerTab('owner_profile')} className={`p-1.5 rounded-xl flex flex-col items-center ${ownerTab === 'owner_profile' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'}`}><span className="text-base">👤</span><span className="text-[9px]">My Profile</span></button>
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
                      <p className="font-bold text-sm">{user.name} <span className="capitalize text-slate-500 font-normal">({user.role})</span></p>
                      <span className="font-bold text-[#234E40]">{user.feePaid === 0 ? 'FREE' : `${user.feePaid} RWF`}</span>
                    </div>
                    <p className="text-slate-500">{user.contact} • Ref: {user.momoRef}</p>
                    {user.status === 'approved' ? (
                      <span className="text-emerald-700 font-bold">✓ Active & Approved</span>
                    ) : (
                      <button onClick={() => approveRegistrant(user.id)} className="w-full py-2 bg-[#3B6E5B] text-white rounded-xl font-bold">
                        ✓ Confirm Payment & Grant Access
                      </button>
                    )}
                  </div>
                ))
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
              <div className="bg-white p-4 rounded-2xl border space-y-2 text-xs">
                <label className="font-bold text-slate-700">Platform Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={platformSettings.commissionRatePercent}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, commissionRatePercent: Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl font-bold"
                />
              </div>
            </div>
          )}

          {ownerTab === 'vip' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">⭐ 3-Tier VIP & Free Sign-Up Access</h3>
              <div className="space-y-3 pt-1">
                {exemptAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#234E40]">{acc.tier}</span>
                      <label className="flex items-center space-x-1 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={acc.confirmed}
                          disabled={acc.id === 'owner'}
                          onChange={(e) => updateVipTierSlot(acc.id, 'confirmed', e.target.checked)}
                        />
                        <span>Free Access</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={acc.name}
                      onChange={(e) => updateVipTierSlot(acc.id, 'name', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={acc.contact}
                      onChange={(e) => updateVipTierSlot(acc.id, 'contact', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {ownerTab === 'deals' && (
            <div className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs font-bold">
              <h3 className="font-bold text-sm text-slate-900">🎛️ Preview User Dashboards</h3>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'graduate' }); setCurrentRole('graduate'); setActiveTab('jobs'); }} className="p-2.5 bg-emerald-50 text-[#234E40] border rounded-xl">🎓 Graduate</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'agency' }); setCurrentRole('agency'); setActiveTab('jobs'); }} className="p-2.5 bg-emerald-50 text-[#234E40] border rounded-xl">🏢 Agency</button>
                <button onClick={() => { setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'traveler' }); setCurrentRole('traveler'); setActiveTab('jobs'); }} className="p-2.5 bg-emerald-50 text-[#234E40] border rounded-xl">🧳 Traveler</button>
              </div>
            </div>
          )}

          {ownerTab === 'owner_profile' && (
            <div className="bg-white p-5 rounded-2xl border space-y-4">
              <h3 className="font-bold text-base text-slate-900">👑 Owner Profile & Photo</h3>
              <div className="flex flex-col items-center space-y-2">
                {ownerProfile.photo ? (
                  <img src={ownerProfile.photo} alt="Owner" className="w-24 h-24 rounded-full object-cover border-4 border-[#3B6E5B]" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl">👑</div>
                )}
                <label className="cursor-pointer bg-emerald-50 text-[#234E40] border px-3 py-1.5 rounded-xl text-xs font-bold">
                  📷 Upload Owner Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (imgData) => setOwnerProfile({ ...ownerProfile, photo: imgData }))} />
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <input type="text" value={ownerProfile.name} onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <input type="text" value={ownerProfile.title} onChange={(e) => setOwnerProfile({ ...ownerProfile, title: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <input type="text" value={ownerProfile.contact} onChange={(e) => setOwnerProfile({ ...ownerProfile, contact: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <textarea rows="3" value={ownerProfile.bio} onChange={(e) => setOwnerProfile({ ...ownerProfile, bio: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveWithButton(ownerProfile)}
                  className="w-full py-3.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow transition"
                >
                  {isSaving ? '⏳ Saving...' : '💾 Save Owner Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------- ROLE-SPECIFIC USER DASHBOARDS ----------------
  const currentProf = getCurrentProfile();
  const providerDirectory = buildLiveProviderDirectory();
  const filteredProviders = providerDirectory.filter((item) => {
    if (directoryFilter === 'guides') return item.type === 'guide';
    if (directoryFilter === 'agencies') return item.type === 'agency';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200 relative">
      {/* Top Bar */}
      <div className="bg-white px-5 py-3.5 border-b flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          {currentProf?.photo ? (
            <img src={currentProf.photo} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-[#3B6E5B]" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#3B6E5B] text-white flex items-center justify-center font-bold">
              {(currentProf?.name || 'U').charAt(0)}
            </div>
          )}
          <div>
            <h2 className="font-bold text-sm">{currentProf?.name}</h2>
            <p className="text-[11px] text-slate-500 capitalize">
              {currentRole === 'graduate' ? '🎓 Tourism Graduate' : currentRole === 'agency' ? '🏢 Travel Agency' : '🧳 Traveler (Free Access)'}
            </p>
          </div>
        </div>
        <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold">Sign Out</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4">
        
        {/* LIVE AVAILABILITY STATUS BAR FOR GUIDES & AGENCIES */}
        {(currentRole === 'graduate' || currentRole === 'agency') && currentProf && (
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-900">
                {currentProf.isAvailable !== false ? '🟢 Available for Travelers & Bookings' : '🔴 Currently Busy / Unavailable'}
              </p>
              <p className="text-[11px] text-slate-500">Visible in Traveler Live Availability Directory</p>
            </div>
            <button
              onClick={() => updateCurrentProfile({ isAvailable: currentProf.isAvailable === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                currentProf.isAvailable !== false
                  ? 'bg-emerald-100 text-[#234E40]'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {currentProf.isAvailable !== false ? 'Active' : 'Offline'}
            </button>
          </div>
        )}

        {/* 1. TOURISM GRADUATE DASHBOARD */}
        {activeTab === 'jobs' && currentRole === 'graduate' && (
          <div className="space-y-4">
            <div className="bg-[#234E40] text-white p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-200">Graduate Gig Board</span>
              <h3 className="font-bold text-base">Available Guiding & Consulting Tasks</h3>
              <p className="text-xs text-emerald-100">Accept tours, complete assignments, and settle via MoMo Code {MOMO_PAYMENT_CODE}.</p>
            </div>

            {tasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
                <div className="flex justify-between items-start font-bold text-sm">
                  <span className="text-slate-900">{task.title}</span>
                  <span className="text-[#234E40] bg-emerald-50 px-2.5 py-0.5 rounded-lg shrink-0">{task.pay}</span>
                </div>
                <p className="text-xs text-slate-500">🏢 {task.agency} • 📍 {task.location} • 📅 {task.date}</p>
                
                {task.status === 'open' && (
                  <button
                    onClick={() => handleAcceptTask(task.id)}
                    className="w-full py-2.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl text-xs font-bold transition"
                  >
                    Accept Guiding Assignment →
                  </button>
                )}

                {task.status === 'accepted' && (
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-bold transition"
                  >
                    ✓ Mark Completed & Settle ({platformSettings.commissionRatePercent}% MoMo {MOMO_PAYMENT_CODE})
                  </button>
                )}

                {task.status === 'done' && (
                  <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl text-xs font-bold text-center">
                    ✓ Completed & Settled (Net Payout: RWF {task.netGuidePayout?.toLocaleString()})
                  </div>
                )}
              </div>
            ))}

            {tripRequests.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs uppercase text-slate-500">🧳 Direct Traveler Bookings & Requests</h4>
                {tripRequests.map((req) => (
                  <div key={req.id} className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-1 text-xs">
                    <p className="font-bold text-slate-900">{req.destination} ({req.guests} Guests)</p>
                    <p className="text-[#234E40] font-semibold">Target: {req.targetProvider}</p>
                    <p className="text-slate-600">Traveler: {req.travelerName} ({req.travelerContact}) • {req.dates}</p>
                    {req.notes && <p className="text-slate-500 italic">"{req.notes}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. TRAVEL AGENCY DASHBOARD */}
        {activeTab === 'jobs' && currentRole === 'agency' && (
          <div className="space-y-4">
            <form onSubmit={handlePostNewTask} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900">📢 Post New Guiding Assignment</h3>
              <input
                type="text"
                required
                placeholder="Tour Title (e.g. Akagera 2-Day Safari Guide)"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Location (e.g. Musanze)"
                  value={newTaskForm.location}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, location: e.target.value })}
                  className="p-2.5 border rounded-xl text-xs"
                />
                <input
                  type="number"
                  required
                  placeholder="Fee in RWF (e.g. 50000)"
                  value={newTaskForm.rawPay}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, rawPay: e.target.value })}
                  className="p-2.5 border rounded-xl text-xs"
                />
              </div>
              <input
                type="text"
                placeholder="Date & Duration (e.g. Fri 27 Nov, Full Day)"
                value={newTaskForm.date}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
              <button type="submit" className="w-full py-2.5 bg-[#234E40] text-white rounded-xl font-bold text-xs shadow">
                + Publish Task to Certified Guides
              </button>
            </form>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-500">📋 Your Active Agency Tasks</h4>
              {tasks.map((t) => (
                <div key={t.id} className="bg-white p-3.5 rounded-2xl border text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{t.title}</span>
                    <span className="text-[#234E40]">{t.pay}</span>
                  </div>
                  <p className="text-slate-500">Status: <strong className="uppercase">{t.status}</strong> {t.assignedTo ? `• Guide: ${t.assignedTo}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. TRAVELER DASHBOARD (LIVE GUIDES, CONSULTANTS & TOUR COMPANIES AVAILABILITY) */}
        {activeTab === 'jobs' && currentRole === 'traveler' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">Free Traveler Account</span>
              <h3 className="font-bold text-base pt-1">Available Guides, Consultants & Tour Companies</h3>
              <p className="text-xs text-emerald-100">Check live availability and book certified guides or licensed tour operators across Rwanda.</p>
            </div>

            {/* Directory Category Filter Buttons */}
            <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setDirectoryFilter('all')}
                className={`py-2 rounded-xl transition ${directoryFilter === 'all' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
              >
                All ({providerDirectory.length})
              </button>
              <button
                onClick={() => setDirectoryFilter('guides')}
                className={`py-2 rounded-xl transition ${directoryFilter === 'guides' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
              >
                🎓 Guides & Consultants
              </button>
              <button
                onClick={() => setDirectoryFilter('agencies')}
                className={`py-2 rounded-xl transition ${directoryFilter === 'agencies' ? 'bg-[#234E40] text-white' : 'text-slate-600'}`}
              >
                🏢 Agencies & Tours
              </button>
            </div>

            {/* Live Provider Availability Cards */}
            <div className="space-y-3">
              {filteredProviders.map((prov) => (
                <div key={prov.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      {prov.photo ? (
                        <img src={prov.photo} alt={prov.name} className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#234E40] flex items-center justify-center font-bold text-sm">
                          {prov.type === 'guide' ? '🎓' : '🏢'}
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">{prov.categoryLabel}</span>
                        <h4 className="font-bold text-sm text-slate-900">{prov.name}</h4>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      prov.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {prov.isAvailable ? '🟢 Available Now' : '🟡 Busy'}
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed">{prov.headline}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                    <span>📍 {prov.location}</span>
                    <span>•</span>
                    <span>🗣️ {prov.languages}</span>
                    <span>•</span>
                    <span className="font-bold text-[#234E40]">{prov.rate}</span>
                  </div>

                  <button
                    onClick={() => setBookingTarget(prov)}
                    className="w-full py-2.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-xs transition shadow-sm"
                  >
                    Book / Check Dates with {prov.name} →
                  </button>
                </div>
              ))}
            </div>

            {/* General Custom Trip Request Form */}
            <form onSubmit={handleCreateTripRequest} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <h4 className="font-bold text-sm text-slate-900">🗺️ Post Open Custom Trip Request (Free)</h4>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Destination / Park</label>
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
                <input
                  type="text"
                  placeholder="Preferred Dates"
                  value={tripRequestForm.dates}
                  onChange={(e) => setTripRequestForm({ ...tripRequestForm, dates: e.target.value })}
                  className="p-2.5 border rounded-xl text-xs"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Guests"
                  value={tripRequestForm.guests}
                  onChange={(e) => setTripRequestForm({ ...tripRequestForm, guests: e.target.value })}
                  className="p-2.5 border rounded-xl text-xs"
                />
              </div>
              <textarea
                rows="2"
                placeholder="Special requests (language, vehicle, itinerary notes)..."
                value={tripRequestForm.notes}
                onChange={(e) => setTripRequestForm({ ...tripRequestForm, notes: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow">
                Broadcast Request to All Guides & Agencies →
              </button>
            </form>
          </div>
        )}

        {/* PROFILE & CV TAB (SHARED ACROSS USER ROLES) */}
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
                  <label className="font-bold text-slate-700">Full Name / Company Name</label>
                  <input type="text" value={currentProf.name} onChange={(e) => updateCurrentProfile({ name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Headline / Services Offered</label>
                  <input type="text" value={currentProf.headline} onChange={(e) => updateCurrentProfile({ headline: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Operating Location</label>
                  <input type="text" value={currentProf.location || 'Kigali, Rwanda'} onChange={(e) => updateCurrentProfile({ location: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl" />
                </div>

                {currentRole === 'graduate' && (
                  <div className="space-y-2 pt-2 border-t">
                    <label className="font-bold text-slate-700">🎓 Degrees & Qualifications</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. Advanced Diploma in Tours & Travel"
                        value={newDegreeInput}
                        onChange={(e) => setNewDegreeInput(e.target.value)}
                        className="flex-1 p-2 border rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newDegreeInput.trim()) return;
                          updateCurrentProfile({ degrees: [...(currentProf.degrees || []), newDegreeInput.trim()] });
                          setNewDegreeInput('');
                        }}
                        className="px-3 bg-[#3B6E5B] text-white rounded-xl font-bold"
                      >
                        + Add
                      </button>
                    </div>
                    {(currentProf.degrees || []).map((deg, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-emerald-50 p-2 rounded-xl">
                        <span>📜 {deg}</span>
                        <button
                          type="button"
                          onClick={() => updateCurrentProfile({ degrees: currentProf.degrees.filter((_, i) => i !== idx) })}
                          className="text-red-500 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveWithButton(currentProf)}
                  className="w-full py-3.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow transition"
                >
                  {isSaving ? '⏳ Saving...' : '💾 Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Direct Provider Booking Modal for Travelers */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDirectProviderBooking} className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-3.5 shadow-xl text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#3B6E5B]">{bookingTarget.categoryLabel}</span>
              <h3 className="font-bold text-base text-slate-900">Book {bookingTarget.name}</h3>
              <p className="text-slate-500 mt-0.5">📍 {bookingTarget.location} • {bookingTarget.rate}</p>
            </div>

            <div>
              <label className="font-bold text-slate-700">Travel Dates</label>
              <input
                type="text"
                required
                placeholder="e.g. 12 Dec - 15 Dec 2026"
                value={bookingDetails.dates}
                onChange={(e) => setBookingDetails({ ...bookingDetails, dates: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Number of Travelers</label>
              <input
                type="number"
                min="1"
                required
                value={bookingDetails.guests}
                onChange={(e) => setBookingDetails({ ...bookingDetails, guests: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Trip Details / Notes</label>
              <textarea
                rows="2"
                placeholder="Itinerary preferences, pickup point, etc."
                value={bookingDetails.notes}
                onChange={(e) => setBookingDetails({ ...bookingDetails, notes: e.target.value })}
                className="w-full mt-1 p-2.5 border rounded-xl"
              />
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setBookingTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#234E40] text-white rounded-xl font-bold"
              >
                Confirm Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="bg-white border-t py-2.5 px-10 flex justify-around items-center text-xs font-bold text-slate-500 absolute bottom-0 w-full max-w-md z-20">
        <button onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center ${activeTab === 'jobs' ? 'text-[#234E40]' : ''}`}>
          <span className="text-base">🏠</span>
          <span>{currentRole === 'traveler' ? 'Guides & Tours' : 'Workspace'}</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-[#234E40]' : ''}`}>
          <span className="text-base">👤</span>
          <span>My Profile</span>
        </button>
      </div>
    </div>
  );
}
