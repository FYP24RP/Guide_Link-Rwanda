import React, { useState, useEffect } from 'react';

export default function GuideLinkRwandaApp() {
  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const MOMO_PAYMENT_CODE = '612771';

  // Owner Profile State (with Photo Upload & Editable Details)
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

  // VIP / Exempt Users
  const [exemptAccounts, setExemptAccounts] = useState(() => {
    const saved = localStorage.getItem('gl_exempt_users');
    return saved
      ? JSON.parse(saved)
      : [
          { id: 'owner', name: 'RUTUNGURA Bonheur (Owner)', contact: '+250780000000', role: 'owner', confirmed: true },
          { id: 'vip1', name: 'VIP Partner 1', contact: '+250781111111', role: 'graduate', confirmed: true },
          { id: 'vip2', name: 'VIP Partner 2', contact: '+250782222222', role: 'agency', confirmed: true },
          { id: 'vip3', name: 'VIP Partner 3', contact: '+250783333333', role: 'graduate', confirmed: true }
        ];
  });

  // Paid & Registered Users List
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('gl_registered_users');
    return saved ? JSON.parse(saved) : [];
  });

  // Custom Rich Profiles keyed by normalized contact
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

  // Form states for adding new Degrees, Experience, or Skills in Profile Editor
  const [newDegreeInput, setNewDegreeInput] = useState('');
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpOrg, setNewExpOrg] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');

  const [platformSettings, setPlatformSettings] = useState(() => {
    const saved = localStorage.getItem('gl_platform_settings');
    return saved ? JSON.parse(saved) : { commissionRatePercent: 10 };
  });

  useEffect(() => {
    localStorage.setItem('gl_owner_profile', JSON.stringify(ownerProfile));
  }, [ownerProfile]);

  useEffect(() => {
    localStorage.setItem('gl_exempt_users', JSON.stringify(exemptAccounts));
  }, [exemptAccounts]);

  useEffect(() => {
    localStorage.setItem('gl_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem('gl_user_profiles', JSON.stringify(userProfiles));
  }, [userProfiles]);

  useEffect(() => {
    localStorage.setItem('gl_platform_settings', JSON.stringify(platformSettings));
  }, [platformSettings]);

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('gl_tasks_data');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            title: 'Half-day Kigali city tour & cultural heritage',
            agency: 'Cheetah Safaris / Partner Agency',
            rawPay: 35000,
            pay: 'RWF 35,000',
            date: 'Sat 21 Nov, 09:00 to 13:00',
            timeLabel: 'Sat 21 Nov, 4 hours',
            status: 'confirmed',
            paymentStatus: 'pending'
          },
          {
            id: 2,
            title: 'Airport transfer & Volcanic region briefing',
            agency: 'Rwanda Eco-Tours',
            rawPay: 20000,
            pay: 'RWF 20,000',
            date: 'Mon 23 Nov, 14:00 to 16:00',
            timeLabel: 'Mon 23 Nov, 2 hours',
            status: 'open',
            paymentStatus: 'pending'
          }
        ];
  });

  useEffect(() => {
    localStorage.setItem('gl_tasks_data', JSON.stringify(tasks));
  }, [tasks]);

  const normalizeContact = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

  // Helper to get or initialize a user's rich profile
  const getCurrentProfile = () => {
    if (!activeUser) return null;
    const key = normalizeContact(activeUser.contact || activeUser.name);
    if (userProfiles[key]) {
      return userProfiles[key];
    }
    return {
      name: activeUser.name,
      contact: activeUser.contact || '',
      role: activeUser.role,
      photo: '',
      headline:
        activeUser.role === 'graduate'
          ? 'Certified Tourism Graduate & Guide'
          : activeUser.role === 'agency'
          ? 'Licensed Tour & Travel Operator'
          : 'Verified Traveler',
      location: 'Kigali, Rwanda',
      bio: '',
      degrees: [],
      experiences: [],
      skills: ['English', 'Kinyarwanda'],
      agencyLicense: '',
      travelerPreferences: ''
    };
  };

  const updateCurrentProfile = (updates) => {
    if (!activeUser) return;
    const key = normalizeContact(activeUser.contact || activeUser.name);
    const existing = getCurrentProfile();
    const updated = { ...existing, ...updates };
    setUserProfiles({ ...userProfiles, [key]: updated });
    if (updates.name) {
      setActiveUser({ ...activeUser, name: updates.name });
    }
  };

  // Convert uploaded image file to Base64 data URL so it saves cleanly
  const handleImageUpload = (e, onSuccess) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Please choose an image smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onSuccess(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const resetToWelcome = () => {
    setCurrentRole('welcome');
    setActiveTab('jobs');
    setSelectedTask(null);
    setRegStep('details');
    setActiveUser(null);
  };

  const checkExemptUser = (contactInput) => {
    const cleanInput = normalizeContact(contactInput);
    return exemptAccounts.find(
      (acc) => acc.confirmed && normalizeContact(acc.contact) === cleanInput
    );
  };

  const handleProceedRegistration = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.contact.trim()) {
      alert('Please enter your Full Name and Phone Number / Email.');
      return;
    }

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
        isVip: true
      });
      setCurrentRole(exemptMatch.role);
      setActiveTab('jobs');
      return;
    }

    const existingUser = registeredUsers.find(
      (u) => normalizeContact(u.contact) === normalizeContact(regForm.contact)
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

    setRegStep('pay_500');
  };

  const handleComplete500Payment = () => {
    if (!regForm.momoRef.trim()) {
      alert('Please enter your MoMo Transaction Reference / Phone used to pay.');
      return;
    }

    const newRegistrant = {
      id: Date.now(),
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      role: regForm.role,
      feePaid: 500,
      paymentMethod: regForm.paymentMethod.toUpperCase(),
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

  const rejectRegistrant = (userId) => {
    setRegisteredUsers(registeredUsers.filter((u) => u.id !== userId));
  };

  const updateVipSlot = (slotId, field, value) => {
    setExemptAccounts(
      exemptAccounts.map((acc) => (acc.id === slotId ? { ...acc, [field]: value } : acc))
    );
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
    alert('Task completed and commission settled to MoMo Code 612771!');
  };

  // ==================== 1. WELCOME SCREEN ====================
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
                  MoMo Code: {MOMO_PAYMENT_CODE}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Register or sign in. New accounts pay <strong>500 RWF</strong> via MoMo Code <strong>{MOMO_PAYMENT_CODE}</strong>. Once confirmed, customize your full profile, upload your photo, degrees, and experience.
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
                <p className="text-xs text-slate-500">Enter your private Owner password to unlock HQ controls.</p>
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

  // ==================== 2. REGISTRATION & PAYMENT GATE ====================
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
                <span className="text-xs font-bold text-[#3B6E5B] uppercase">Step 1 of 2</span>
                <h3 className="text-lg font-bold text-slate-900">Account Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Already approved by owner or VIP? Enter your contact to enter. New accounts pay <strong>500 RWF</strong>.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jean Claude Mugisha"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Phone Number (MoMo) or Email</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +250788123456"
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
                  <option value="graduate">Tourism Graduate (Guide / Consultant)</option>
                  <option value="agency">Travel Agency</option>
                  <option value="traveler">Traveler</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow"
              >
                Continue →
              </button>
            </form>
          )}

          {regStep === 'pay_500' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                  Payment Required
                </span>
                <h3 className="text-lg font-bold text-slate-900">Pay 500 RWF via MoMo Code</h3>
                <p className="text-xs text-slate-700">
                  Send <strong>500 RWF</strong> to MoMo Code: <strong className="text-[#234E40] text-sm">{MOMO_PAYMENT_CODE}</strong> (GuideLink Rwanda).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">MoMo Transaction ID / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="Enter SMS Ref ID or Sender Number"
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
              <button
                onClick={() => setRegStep('details')}
                className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
              >
                ← Edit Details
              </button>
            </div>
          )}

          {regStep === 'pending_approval' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ⏳
              </div>
              <h3 className="text-lg font-bold text-slate-900">Payment Pending Owner Approval</h3>
              <p className="text-xs text-slate-600">
                Your payment to MoMo Code <strong>{MOMO_PAYMENT_CODE}</strong> has been logged. Once <strong>{ownerProfile.name}</strong> confirms your access, sign in to edit your profile and upload your credentials.
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

  // ==================== 3. OWNER HQ DASHBOARD (WITH OWNER PROFILE & PHOTO UPLOAD) ====================
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
              <img
                src={ownerProfile.photo}
                alt="Owner"
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
              />
            ) : (
              <div className="w-10 h-10 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">
                👑
              </div>
            )}
            <div>
              <h2 className="font-bold text-sm">{ownerProfile.name}</h2>
              <p className="text-[11px] text-emerald-200">MoMo Code: {MOMO_PAYMENT_CODE}</p>
            </div>
          </div>
          <button
            onClick={resetToWelcome}
            className="text-xs bg-emerald-900 hover:bg-emerald-800 px-3 py-1.5 rounded-full font-semibold"
          >
            Log Out
          </button>
        </div>

        {/* Owner 5-Icon Navigation Bar */}
        <div className="bg-white border-b border-slate-200 px-2 py-2.5 grid grid-cols-5 gap-1 text-center sticky top-[72px] z-20 shadow-sm">
          <button
            onClick={() => setOwnerTab('pending')}
            className={`p-1.5 rounded-xl flex flex-col items-center justify-center relative transition ${
              ownerTab === 'pending' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'
            }`}
          >
            <span className="text-base">⏳</span>
            <span className="text-[9px] mt-0.5">Sign-Ups</span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setOwnerTab('overview')}
            className={`p-1.5 rounded-xl flex flex-col items-center justify-center transition ${
              ownerTab === 'overview' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'
            }`}
          >
            <span className="text-base">📊</span>
            <span className="text-[9px] mt-0.5">Revenue</span>
          </button>

          <button
            onClick={() => setOwnerTab('vip')}
            className={`p-1.5 rounded-xl flex flex-col items-center justify-center transition ${
              ownerTab === 'vip' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'
            }`}
          >
            <span className="text-base">⭐</span>
            <span className="text-[9px] mt-0.5">VIP Slots</span>
          </button>

          <button
            onClick={() => setOwnerTab('deals')}
            className={`p-1.5 rounded-xl flex flex-col items-center justify-center transition ${
              ownerTab === 'deals' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'
            }`}
          >
            <span className="text-base">🎛️</span>
            <span className="text-[9px] mt-0.5">Roles</span>
          </button>

          <button
            onClick={() => setOwnerTab('owner_profile')}
            className={`p-1.5 rounded-xl flex flex-col items-center justify-center transition ${
              ownerTab === 'owner_profile' ? 'bg-emerald-50 text-[#234E40] font-bold' : 'text-slate-500'
            }`}
          >
            <span className="text-base">👤</span>
            <span className="text-[9px] mt-0.5">My Profile</span>
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-10">
          {ownerTab === 'pending' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-900">⏳ Payment Notifications & Sign-Ups</h3>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  {pendingCount} Pending
                </span>
              </div>

              {registeredUsers.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                  <span className="text-2xl">📭</span>
                  <p className="text-xs text-slate-500">No sign-up payments submitted yet.</p>
                </div>
              ) : (
                registeredUsers.map((user) => (
                  <div key={user.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{user.name}</p>
                        <p className="text-slate-500">{user.contact} • Role: <strong className="capitalize">{user.role}</strong></p>
                      </div>
                      <span className="font-bold text-[#234E40] bg-emerald-50 px-2 py-1 rounded-lg">
                        +{user.feePaid} RWF
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                      Paid to MoMo Code: <strong>{user.momoCodeUsed}</strong> • Ref: <strong>{user.momoRef}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      {user.status === 'approved' ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                          ✓ Payment Confirmed & Access Granted
                        </span>
                      ) : (
                        <div className="flex space-x-2 w-full">
                          <button
                            onClick={() => approveRegistrant(user.id)}
                            className="flex-1 py-2 bg-[#3B6E5B] text-white rounded-xl font-bold"
                          >
                            ✓ Confirm Payment & Grant Access
                          </button>
                          <button
                            onClick={() => rejectRegistrant(user.id)}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-xl font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {ownerTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#234E40] to-[#3B6E5B] text-white p-5 rounded-2xl shadow-sm text-center space-y-1">
                <span className="text-xs uppercase text-emerald-200 font-bold tracking-wider">Total Owner Revenue</span>
                <div className="text-3xl font-extrabold">RWF {grandTotalRevenue.toLocaleString()}</div>
                <p className="text-[11px] text-emerald-100">
                  MoMo Code: {MOMO_PAYMENT_CODE} • Sign-Ups: RWF {totalRegFees.toLocaleString()} • Commissions: RWF {totalDealCommissions.toLocaleString()}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-sm text-slate-900">⚙️ Deal Commission Percentage</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={platformSettings.commissionRatePercent}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        commissionRatePercent: Number(e.target.value)
                      })
                    }
                    className="w-20 p-2 border border-slate-300 rounded-xl text-sm font-bold text-center"
                  />
                  <span className="text-xs font-bold text-slate-700">% Owner Commission per Deal</span>
                </div>
              </div>
            </div>
          )}

          {ownerTab === 'vip' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">⭐ 3 Confirmed Exempt Users (0 RWF)</h3>
              <div className="space-y-3">
                {exemptAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#234E40] uppercase">
                        {acc.id === 'owner' ? '👑 Owner Account' : `⭐ VIP Slot (${acc.id.toUpperCase()})`}
                      </span>
                      <label className="flex items-center space-x-1 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={acc.confirmed}
                          disabled={acc.id === 'owner'}
                          onChange={(e) => updateVipSlot(acc.id, 'confirmed', e.target.checked)}
                        />
                        <span>Confirmed</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={acc.name}
                      onChange={(e) => updateVipSlot(acc.id, 'name', e.target.value)}
                      placeholder="Full Name"
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={acc.contact}
                      onChange={(e) => updateVipSlot(acc.id, 'contact', e.target.value)}
                      placeholder="Phone / Email"
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {ownerTab === 'deals' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <h3 className="font-bold text-sm text-slate-900">🎛️ Direct Role Access (Owner Privilege)</h3>
                <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-bold">
                  <button
                    onClick={() => {
                      setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'graduate', isVip: true });
                      setCurrentRole('graduate');
                      setActiveTab('jobs');
                    }}
                    className="p-2.5 bg-emerald-50 text-[#234E40] border border-emerald-200 rounded-xl"
                  >
                    🎓 Graduate
                  </button>
                  <button
                    onClick={() => {
                      setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'agency', isVip: true });
                      setCurrentRole('agency');
                      setActiveTab('jobs');
                    }}
                    className="p-2.5 bg-emerald-50 text-[#234E40] border border-emerald-200 rounded-xl"
                  >
                    🏢 Agency
                  </button>
                  <button
                    onClick={() => {
                      setActiveUser({ name: ownerProfile.name, contact: ownerProfile.contact, role: 'traveler', isVip: true });
                      setCurrentRole('traveler');
                      setActiveTab('jobs');
                    }}
                    className="p-2.5 bg-emerald-50 text-[#234E40] border border-emerald-200 rounded-xl"
                  >
                    🧳 Traveler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OWNER PROFILE & PHOTO EDITOR */}
          {ownerTab === 'owner_profile' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-base text-slate-900">👑 Owner Profile & Photo</h3>

              <div className="flex flex-col items-center space-y-2">
                {ownerProfile.photo ? (
                  <img
                    src={ownerProfile.photo}
                    alt="Owner Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#3B6E5B] shadow"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl">
                    👑
                  </div>
                )}
                <label className="cursor-pointer bg-emerald-50 text-[#234E40] border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  📷 Upload Owner Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(e, (imgData) => setOwnerProfile({ ...ownerProfile, photo: imgData }))
                    }
                  />
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Owner Full Name</label>
                  <input
                    type="text"
                    value={ownerProfile.name}
                    onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Executive Title</label>
                  <input
                    type="text"
                    value={ownerProfile.title}
                    onChange={(e) => setOwnerProfile({ ...ownerProfile, title: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Official Phone / MoMo Contact</label>
                  <input
                    type="text"
                    value={ownerProfile.contact}
                    onChange={(e) => setOwnerProfile({ ...ownerProfile, contact: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Platform Bio / Note</label>
                  <textarea
                    rows="3"
                    value={ownerProfile.bio}
                    onChange={(e) => setOwnerProfile({ ...ownerProfile, bio: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="text-center text-[11px] text-emerald-700 font-semibold">
                ✓ All profile changes save automatically
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== 4. PAID USER WORKSPACES + FULL CUSTOM PROFILE EDITOR ====================
  const currentProf = getCurrentProfile();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200 relative">
      {/* Top User Bar with Profile Photo */}
      <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          {currentProf?.photo ? (
            <img
              src={currentProf.photo}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#3B6E5B]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#3B6E5B] text-white flex items-center justify-center font-bold text-sm">
              {(currentProf?.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-bold text-sm text-slate-900">{currentProf?.name}</h2>
            <p className="text-[11px] text-slate-500 capitalize">Role: {currentRole}</p>
          </div>
        </div>
        <button
          onClick={resetToWelcome}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-full transition"
        >
          Sign Out
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4">
        {/* TAB 1: WORKSPACE / JOBS / BOOKINGS */}
        {activeTab === 'jobs' && (
          <>
            {currentRole === 'graduate' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900">Available Tasks</h3>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-bold text-[#234E40] underline"
                  >
                    Edit My CV & Photo →
                  </button>
                </div>

                {tasks.map((task) => (
                  <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex justify-between font-bold text-sm">
                      <span>{task.title}</span>
                      <span className="text-[#234E40]">{task.pay}</span>
                    </div>
                    <p className="text-xs text-slate-500">{task.agency} • MoMo Code: {MOMO_PAYMENT_CODE}</p>
                    {task.status === 'confirmed' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="w-full py-2 bg-[#234E40] text-white rounded-xl text-xs font-bold mt-2"
                      >
                        Mark Completed & Settle Commission ({MOMO_PAYMENT_CODE})
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {currentRole === 'agency' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900">Agency Dashboard</h3>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-bold text-[#234E40] underline"
                  >
                    Edit Agency Profile →
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  All deal commissions settle to MoMo Code: <strong>{MOMO_PAYMENT_CODE}</strong>
                </p>
                {tasks.map((t) => (
                  <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-sm">
                      <span>{t.title}</span>
                      <span className="text-[#234E40]">{t.pay}</span>
                    </div>
                    <p className="text-slate-500">{t.date}</p>
                  </div>
                ))}
              </div>
            )}

            {currentRole === 'traveler' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900">Book a Verified Guide</h3>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-bold text-[#234E40] underline"
                  >
                    Edit My Profile →
                  </button>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-600">
                    Hire certified Rwandan tourism graduates for city tours, gorilla trekking briefings, and custom itineraries.
                  </p>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs"
                  >
                    Book & Pay via MoMo Code {MOMO_PAYMENT_CODE} (RWF 35,000)
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: CUSTOMIZABLE PROFILE EDITOR FOR EVERY PAID USER */}
        {activeTab === 'profile' && currentProf && (
          <div className="space-y-4">
            {/* Profile Photo & Basic Info Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div className="flex flex-col items-center space-y-2">
                {currentProf.photo ? (
                  <img
                    src={currentProf.photo}
                    alt="User Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#3B6E5B] shadow"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-100 text-[#234E40] flex items-center justify-center font-extrabold text-2xl">
                    {currentProf.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <label className="cursor-pointer bg-[#3B6E5B] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                  📷 Upload / Change Profile Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(e, (imgData) => updateCurrentProfile({ photo: imgData }))
                    }
                  />
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Full Name / Display Name</label>
                  <input
                    type="text"
                    value={currentProf.name}
                    onChange={(e) => updateCurrentProfile({ name: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Professional Headline / Tagline</label>
                  <input
                    type="text"
                    value={currentProf.headline}
                    onChange={(e) => updateCurrentProfile({ headline: e.target.value })}
                    placeholder="e.g. Advanced Diploma in Tours & Travel Management"
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">City / Location</label>
                  <input
                    type="text"
                    value={currentProf.location}
                    onChange={(e) => updateCurrentProfile({ location: e.target.value })}
                    placeholder="e.g. Kigali / Rusizi, Rwanda"
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">About Me / Bio</label>
                  <textarea
                    rows="3"
                    value={currentProf.bio}
                    onChange={(e) => updateCurrentProfile({ bio: e.target.value })}
                    placeholder="Describe your background, specialties, or what you offer..."
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* TOURISM GRADUATE SPECIFIC: DEGREES, CERTIFICATIONS & WORK EXPERIENCE */}
            {currentRole === 'graduate' && (
              <>
                {/* Degrees & Academic Qualifications */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
                  <h4 className="font-bold text-sm text-slate-900">🎓 Degrees & Tourism Qualifications</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. Advanced Diploma in Tours & Travel (RP Kitabi)"
                      value={newDegreeInput}
                      onChange={(e) => setNewDegreeInput(e.target.value)}
                      className="flex-1 p-2.5 border border-slate-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newDegreeInput.trim()) return;
                        updateCurrentProfile({
                          degrees: [...(currentProf.degrees || []), newDegreeInput.trim()]
                        });
                        setNewDegreeInput('');
                      }}
                      className="px-3.5 py-2 bg-[#3B6E5B] text-white rounded-xl font-bold"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-2 pt-1">
                    {(currentProf.degrees || []).length === 0 ? (
                      <p className="text-slate-400 italic">No degrees or certificates added yet.</p>
                    ) : (
                      currentProf.degrees.map((deg, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                          <span className="font-semibold text-[#234E40]">📜 {deg}</span>
                          <button
                            onClick={() =>
                              updateCurrentProfile({
                                degrees: currentProf.degrees.filter((_, i) => i !== idx)
                              })
                              const [isSaving, setIsSaving] = useState(false);

  // Function to save profile changes to Supabase Cloud (Syncs to all devices & Owner HQ)
  const handleSaveProfileToCloud = async () => {
    setIsSaving(true);
    const currentProf = getCurrentProfile();
    const cleanContact = normalizeContact(currentProf.contact || currentProf.name);

    try {
      // If you are using Supabase, uncomment below:
      /*
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ 
          contact_key: cleanContact, 
          profile_data: currentProf,
          updated_at: new Date()
        });

      if (error) throw error;
      */

      // Simulated instant cloud confirmation for your FYP demo:
      setTimeout(() => {
        setIsSaving(false);
        alert('Profile saved successfully! Synced across all your devices and updated in Owner HQ.');
      }, 600);

    } catch (err) {
      setIsSaving(false);
      alert('Error saving profile: ' + err.message);
    }
  };
                            }
                            className="text-red-500 font-bold px-1.5"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Guiding & Hospitality Experience */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
                  <h4 className="font-bold text-sm text-slate-900">💼 Guiding & Work Experience</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Role / Position (e.g. Tour Guide / F&B Controller)"
                      value={newExpTitle}
                      onChange={(e) => setNewExpTitle(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Company / Hotel / Park (e.g. Nyungwe Top View)"
                        value={newExpOrg}
                        onChange={(e) => setNewExpOrg(e.target.value)}
                        className="flex-1 p-2.5 border border-slate-200 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newExpTitle.trim()) return;
                          updateCurrentProfile({
                            experiences: [
                              ...(currentProf.experiences || []),
                              { role: newExpTitle.trim(), org: newExpOrg.trim() || 'Rwanda Tourism' }
                            ]
                          });
                          setNewExpTitle('');
                          setNewExpOrg('');
                        }}
                        className="px-3.5 py-2 bg-[#3B6E5B] text-white rounded-xl font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {(currentProf.experiences || []).length === 0 ? (
                      <p className="text-slate-400 italic">No work experience added yet.</p>
                    ) : (
                      currentProf.experiences.map((exp, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                          <div>
                            <p className="font-bold text-slate-800">{exp.role}</p>
                            <p className="text-slate-500">{exp.org}</p>
                          </div>
                          <button
                            onClick={() =>
                              updateCurrentProfile({
                                experiences: currentProf.experiences.filter((_, i) => i !== idx)
                              })
                            }
                            className="text-red-500 font-bold px-1.5"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Skills & Languages */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
                  <h4 className="font-bold text-sm text-slate-900">🌍 Languages & Technical Skills</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. French, Galileo GDS, Wildlife Tracking"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      className="flex-1 p-2.5 border border-slate-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSkillInput.trim()) return;
                        updateCurrentProfile({
                          skills: [...(currentProf.skills || []), newSkillInput.trim()]
                        });
                        setNewSkillInput('');
                      }}
                      className="px-3.5 py-2 bg-[#3B6E5B] text-white rounded-xl font-bold"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(currentProf.skills || []).map((sk, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-[#234E40] border border-emerald-200 px-2.5 py-1 rounded-full font-semibold flex items-center space-x-1"
                      >
                        <span>{sk}</span>
                        <button
                          onClick={() =>
                            updateCurrentProfile({
                              skills: currentProf.skills.filter((_, i) => i !== idx)
                            })
                          }
                          className="text-red-500 ml-1 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TRAVEL AGENCY SPECIFIC FIELDS */}
            {currentRole === 'agency' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
                <h4 className="font-bold text-sm text-slate-900">🏢 Agency Registration & Credentials</h4>
                <div>
                  <label className="font-bold text-slate-700">RDB License / Tour Operator ID</label>
                  <input
                    type="text"
                    value={currentProf.agencyLicense || ''}
                    onChange={(e) => updateCurrentProfile({ agencyLicense: e.target.value })}
                    placeholder="Enter RDB Registration Number"
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* TRAVELER SPECIFIC FIELDS */}
            {currentRole === 'traveler' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
                <h4 className="font-bold text-sm text-slate-900">🧳 Travel Interests & Preferences</h4>
                <div>
                  <label className="font-bold text-slate-700">Destinations & Tour Interests</label>
                  <input
                    <div className="pt-4 pb-6">
  <button
    type="button"
    onClick={handleSaveProfileToCloud}
    disabled={isSaving}
    className="w-full py-3.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2"
  >
    <span>{isSaving ? '⏳ Saving to Cloud...' : '💾 Save & Sync Profile'}</span>
  </button>
  <p className="text-[11px] text-center text-slate-400 mt-2">
    Changes sync instantly to all your devices and the platform owner.
  </p>
</div>
                    type="text"
                    value={currentProf.travelerPreferences || ''}
                    onChange={(e) => updateCurrentProfile({ travelerPreferences: e.target.value })}
                    placeholder="e.g. Gorilla Trekking, Nyungwe Canopy, Kigali Cultural Tours"
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="text-center text-xs text-emerald-700 font-bold py-2">
              ✓ Profile saved automatically
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar for All Paid Users */}
      <div className="bg-white border-t border-slate-200 py-2.5 px-10 flex justify-around items-center text-xs font-bold text-slate-500 absolute bottom-0 w-full max-w-md z-20">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center ${activeTab === 'jobs' ? 'text-[#234E40]' : ''}`}
        >
          <span className="text-base">🏠</span>
          <span>Workspace</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-[#234E40]' : ''}`}
        >
          <span className="text-base">👤</span>
          <span>My Profile & CV</span>
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Rwandan Payment Gateway</h3>
            <p className="text-xs text-slate-600">
              Send payment to MoMo Code: <strong className="text-[#234E40] text-sm">{MOMO_PAYMENT_CODE}</strong>
            </p>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                alert(`Payment authorized to MoMo Code ${MOMO_PAYMENT_CODE}!`);
              }}
              className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
