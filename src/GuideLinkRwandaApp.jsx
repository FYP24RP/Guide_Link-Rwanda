import React, { useState, useEffect } from 'react';

export default function GuideLinkRwandaApp() {
  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
          { id: 'vip3', name: 'VIP Partner Tier 3 (Silver)', contact: '+250783333333', role: 'traveler', tier: 'Tier 3 - Silver Partner', confirmed: true }
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
            status: 'confirmed'
          }
        ];
  });

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
      headline:
        activeUser.role === 'graduate'
          ? 'Certified Tourism Graduate & Guide'
          : activeUser.role === 'agency'
          ? 'Licensed Tour Operator'
          : 'Verified Traveler',
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
      alert('✓ Profile successfully saved and updated!');
    }, 400);
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

  const handleProceedRegistration = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.contact.trim()) {
      alert('Please enter your Full Name and Contact.');
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
        tier: exemptMatch.tier,
        isVip: true
      });
      setCurrentRole(exemptMatch.role);
      setActiveTab('jobs');
      return;
    }

    const existingUser = registeredUsers.find(
      (u) => normalizeContact(u.contact) === normalizeContact(regForm.contact)
    );
    if (existingUser && existingUser.status === 'approved') {
      setActiveUser(existingUser);
      setCurrentRole(existingUser.role);
      setActiveTab('jobs');
      return;
    }

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
      alert('Access Denied: Invalid Owner Password (`FYP$2026`).');
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
                Freelance guiding and travel consulting, matched across Rwanda.
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
                <p className="text-xs text-slate-500">Enter password (`FYP$2026`) to unlock HQ.</p>
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

  if (currentRole === 'register') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Member Sign Up</h2>
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
                  Owner & VIP Tiers sign up / sign in for free. Standard accounts pay 500 RWF.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
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
                  value={regForm.contact}
                  onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Role</label>
                <select
                  value={regForm.role}
                  onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="graduate">Tourism Graduate</option>
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
                Your payment to MoMo Code <strong>{MOMO_PAYMENT_CODE}</strong> has been logged.
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

  if (currentRole === 'owner') {
    const totalRegFees = registeredUsers.reduce((sum, u) => sum + (u.feePaid || 0), 0);
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

        {/* RESTORED ALL 5 OWNER ICONIC TABS */}
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
              <h3 className="font-bold text-sm text-slate-900">⏳ Payment Notifications & Sign-Ups</h3>
              {registeredUsers.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border text-center text-xs text-slate-500">No pending payments.</div>
              ) : (
                registeredUsers.map((user) => (
                  <div key={user.id} className="bg-white p-4 rounded-2xl border space-y-2 text-xs">
                    <p className="font-bold text-sm">{user.name} ({user.role})</p>
                    <p className="text-slate-500">{user.contact} • Ref: {user.momoRef}</p>
                    {user.status === 'approved' ? (
                      <span className="text-emerald-700 font-bold">✓ Approved</span>
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
                <div className="text-3xl font-extrabold">RWF {totalRegFees.toLocaleString()}</div>
                <p className="text-[11px] text-emerald-100">MoMo Code: {MOMO_PAYMENT_CODE}</p>
              </div>
            </div>
          )}

          {ownerTab === 'vip' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">⭐ 3-Tier VIP & Free Sign-Up Access</h3>
              <p className="text-xs text-slate-500">Manage VIP tiers with free access privileges across the platform.</p>
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
                        <span>Active Free Access</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={acc.name}
                      onChange={(e) => updateVipTierSlot(acc.id, 'name', e.target.value)}
                      placeholder="Partner Name"
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={acc.contact}
                      onChange={(e) => updateVipTierSlot(acc.id, 'contact', e.target.value)}
                      placeholder="Partner Phone / Contact"
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {ownerTab === 'deals' && (
            <div className="bg-white p-4 rounded-2xl border space-y-2.5 text-xs font-bold">
              <h3 className="font-bold text-sm text-slate-900">🎛️ Role Preview Controls</h3>
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

  const currentProf = getCurrentProfile();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200 relative">
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
            <p className="text-[11px] text-slate-500 capitalize">Role: {currentRole} {activeUser?.tier ? `• ${activeUser.tier}` : ''}</p>
          </div>
        </div>
        <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold">Sign Out</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4">
        {activeTab === 'jobs' && (
          <div className="space-y-3">
            <h3 className="font-bold text-base text-slate-900">Available Tasks</h3>
            {tasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-2xl border space-y-2">
                <div className="flex justify-between font-bold text-sm">
                  <span>{task.title}</span><span className="text-[#234E40]">{task.pay}</span>
                </div>
                <p className="text-xs text-slate-500">MoMo Code: {MOMO_PAYMENT_CODE}</p>
              </div>
            ))}
          </div>
        )}

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
                <input type="text" value={currentProf.name} onChange={(e) => updateCurrentProfile({ name: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <input type="text" value={currentProf.headline} onChange={(e) => updateCurrentProfile({ headline: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                
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

      <div className="bg-white border-t py-2.5 px-10 flex justify-around items-center text-xs font-bold text-slate-500 absolute bottom-0 w-full max-w-md z-20">
        <button onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center ${activeTab === 'jobs' ? 'text-[#234E40]' : ''}`}>🏠 Workspace</button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-[#234E40]' : ''}`}>👤 My Profile</button>
      </div>
    </div>
  );
}
