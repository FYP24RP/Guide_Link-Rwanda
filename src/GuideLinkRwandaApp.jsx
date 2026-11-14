import React, { useState, useEffect } from 'react';

export default function GuideLinkRwandaApp() {
  const [currentRole, setCurrentRole] = useState('welcome');
  const [ownerTab, setOwnerTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('jobs');
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const MOMO_PAYMENT_CODE = '612771';

  const [ownerProfile, setOwnerProfile] = useState(() => {
    const saved = localStorage.getItem('gl_owner_profile');
    return saved ? JSON.parse(saved) : {
      name: 'RUTUNGURA Bonheur',
      title: 'Founder & Platform Administrator • GuideLink Rwanda',
      contact: '+250780000000',
      bio: 'Tourism Management Specialist & Creator of GuideLink Rwanda.',
      photo: ''
    };
  });

  const [exemptAccounts, setExemptAccounts] = useState(() => {
    const saved = localStorage.getItem('gl_exempt_users');
    return saved ? JSON.parse(saved) : [
      { id: 'owner', name: 'RUTUNGURA Bonheur (Owner)', contact: '+250780000000', role: 'owner', confirmed: true },
      { id: 'vip1', name: 'VIP Partner 1', contact: '+250781111111', role: 'graduate', confirmed: true },
      { id: 'vip2', name: 'VIP Partner 2', contact: '+250782222222', role: 'agency', confirmed: true }
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
  const [regForm, setRegForm] = useState({ name: '', contact: '', role: 'graduate', momoRef: '' });
  const [newDegreeInput, setNewDegreeInput] = useState('');

  useEffect(() => { localStorage.setItem('gl_owner_profile', JSON.stringify(ownerProfile)); }, [ownerProfile]);
  useEffect(() => { localStorage.setItem('gl_exempt_users', JSON.stringify(exemptAccounts)); }, [exemptAccounts]);
  useEffect(() => { localStorage.setItem('gl_registered_users', JSON.stringify(registeredUsers)); }, [registeredUsers]);
  useEffect(() => { localStorage.setItem('gl_user_profiles', JSON.stringify(userProfiles)); }, [userProfiles]);

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
      headline: activeUser.role === 'graduate' ? 'Certified Tourism Graduate & Guide' : 'Verified User',
      location: 'Kigali, Rwanda',
      degrees: []
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
    if (updates.name) setActiveUser({ ...activeUser, name: updates.name });
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

  const handleProceedRegistration = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.contact.trim()) {
      alert('Please enter your Full Name and Contact.');
      return;
    }
    const cleanInput = normalizeContact(regForm.contact);
    const exemptMatch = exemptAccounts.find(acc => acc.confirmed && normalizeContact(acc.contact) === cleanInput);
    
    if (exemptMatch) {
      if (exemptMatch.id === 'owner') {
        setShowOwnerPinModal(true);
        return;
      }
      setActiveUser({ name: exemptMatch.name, contact: exemptMatch.contact, role: exemptMatch.role });
      setCurrentRole(exemptMatch.role);
      setActiveTab('jobs');
      return;
    }

    const existingUser = registeredUsers.find(u => normalizeContact(u.contact) === cleanInput);
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
      alert('Please enter your MoMo Reference.');
      return;
    }
    const newReg = {
      id: Date.now(),
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      role: regForm.role,
      feePaid: 500,
      momoCodeUsed: MOMO_PAYMENT_CODE,
      momoRef: regForm.momoRef,
      status: 'pending_approval'
    };
    setRegisteredUsers([newReg, ...registeredUsers]);
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
      alert('Invalid Owner Password.');
      setOwnerPinInput('');
    }
  };

  if (currentRole === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="p-6 space-y-6">
          <div className="bg-[#E2ECE9] p-6 text-center rounded-2xl">
            <h1 className="text-3xl font-bold text-slate-900">GuideLink Rwanda</h1>
            <p className="text-sm text-[#234E40] mt-1">Tourism & Guiding Professional Platform</p>
            <p className="text-[11px] font-semibold text-slate-500 uppercase mt-2">Owner: {ownerProfile.name}</p>
          </div>
          <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-xs font-bold text-[#234E40]">
              <span>Member Portal</span>
              <span className="bg-emerald-100 px-2.5 py-0.5 rounded-full">MoMo: {MOMO_PAYMENT_CODE}</span>
            </div>
            <button
              onClick={() => { setRegStep('details'); setCurrentRole('register'); }}
              className="w-full py-3.5 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow"
            >
              Sign Up / Member Sign In →
            </button>
          </div>
          <button
            onClick={() => { setOwnerPinInput(''); setShowOwnerPinModal(true); }}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs shadow"
          >
            🔐 Owner Login ({ownerProfile.name})
          </button>
        </div>

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleOwnerLogin} className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
              <h3 className="font-bold text-base text-slate-900 text-center">Owner Authentication</h3>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                className="w-full p-3 border rounded-xl text-center font-bold"
              />
              <div className="flex space-x-2">
                <button type="button" onClick={() => setShowOwnerPinModal(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#234E40] text-white rounded-xl text-xs font-bold">Unlock</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (currentRole === 'register') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border">
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Member Sign Up</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold">← Home</button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {regStep === 'details' && (
            <form onSubmit={handleProceedRegistration} className="bg-white p-5 rounded-2xl border space-y-4 shadow-sm">
              <h3 className="text-lg font-bold">Account Verification</h3>
              <div>
                <label className="text-xs font-bold">Full Name</label>
                <input type="text" required value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">Phone Number (MoMo) or Email</label>
                <input type="text" required value={regForm.contact} onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold">Role</label>
                <select value={regForm.role} onChange={(e) => setRegForm({ ...regForm, role: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-sm bg-white">
                  <option value="graduate">Tourism Graduate</option>
                  <option value="agency">Travel Agency</option>
                  <option value="traveler">Traveler</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm">Continue →</button>
            </form>
          )}

          {regStep === 'pay_500' && (
            <div className="bg-white p-5 rounded-2xl border space-y-4 shadow-sm">
              <div className="bg-amber-50 border p-3.5 rounded-xl space-y-1">
                <h3 className="text-lg font-bold">Pay 500 RWF via MoMo Code</h3>
                <p className="text-xs text-slate-700">Send 500 RWF to MoMo Code: <strong className="text-[#234E40]">{MOMO_PAYMENT_CODE}</strong></p>
              </div>
              <div>
                <label className="text-xs font-bold">MoMo Transaction Reference</label>
                <input type="text" required value={regForm.momoRef} onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })} className="w-full mt-1 p-2.5 border rounded-xl text-xs" />
              </div>
              <button onClick={handleComplete500Payment} className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold text-sm">Submit Payment</button>
            </div>
          )}

          {regStep === 'pending_approval' && (
            <div className="bg-white p-6 rounded-2xl border text-center space-y-4 shadow-sm">
              <h3 className="text-lg font-bold">Pending Owner Approval</h3>
              <p className="text-xs text-slate-600">Your payment has been sent to owner {ownerProfile.name}.</p>
              <button onClick={resetToWelcome} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs">Return Home</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentRole === 'owner') {
    const pendingCount = registeredUsers.filter(u => u.status === 'pending_approval').length;
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border relative">
        <div className="bg-[#234E40] text-white px-5 py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            {ownerProfile.photo ? <img src={ownerProfile.photo} alt="Owner" className="w-10 h-10 rounded-full object-cover border-2 border-amber-400" /> : <div className="w-10 h-10 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-bold">👑</div>}
            <div>
              <h2 className="font-bold text-sm">{ownerProfile.name}</h2>
              <p className="text-[11px] text-emerald-200">MoMo Code: {MOMO_PAYMENT_CODE}</p>
            </div>
          </div>
          <button onClick={resetToWelcome} className="text-xs bg-emerald-900 px-3 py-1.5 rounded-full font-semibold">Log Out</button>
        </div>

        <div className="bg-white border-b px-4 py-2 flex justify-around text-xs font-bold sticky top-[72px] z-20">
          <button onClick={() => setOwnerTab('pending')} className={`p-2 ${ownerTab === 'pending' ? 'text-[#234E40] border-b-2 border-[#234E40]' : 'text-slate-500'}`}>Sign-Ups ({pendingCount})</button>
          <button onClick={() => setOwnerTab('owner_profile')} className={`p-2 ${ownerTab === 'owner_profile' ? 'text-[#234E40] border-b-2 border-[#234E40]' : 'text-slate-500'}`}>My Profile</button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-10">
          {ownerTab === 'pending' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm">Payment Approvals</h3>
              {registeredUsers.map(user => (
                <div key={user.id} className="bg-white p-4 rounded-2xl border space-y-2 text-xs">
                  <p className="font-bold text-sm">{user.name} ({user.role})</p>
                  <p className="text-slate-500">{user.contact} • Ref: {user.momoRef}</p>
                  {user.status === 'approved' ? <span className="text-emerald-700 font-bold">✓ Approved</span> : (
                    <button onClick={() => setRegisteredUsers(registeredUsers.map(u => u.id === user.id ? { ...u, status: 'approved' } : u))} className="w-full py-2 bg-[#3B6E5B] text-white rounded-xl font-bold">Approve Access</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {ownerTab === 'owner_profile' && (
            <div className="bg-white p-5 rounded-2xl border space-y-4">
              <h3 className="font-bold text-base">Owner Profile & Photo</h3>
              <div className="flex flex-col items-center space-y-2">
                {ownerProfile.photo ? <img src={ownerProfile.photo} alt="Owner" className="w-24 h-24 rounded-full object-cover border-4 border-[#3B6E5B]" /> : <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl">👑</div>}
                <label className="cursor-pointer bg-emerald-50 text-[#234E40] border px-3 py-1.5 rounded-xl text-xs font-bold">
                  Upload Owner Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (imgData) => setOwnerProfile({ ...ownerProfile, photo: imgData }))} />
                </label>
              </div>
              <div className="space-y-3 text-xs">
                <input type="text" value={ownerProfile.name} onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <input type="text" value={ownerProfile.title} onChange={(e) => setOwnerProfile({ ...ownerProfile, title: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <input type="text" value={ownerProfile.contact} onChange={(e) => setOwnerProfile({ ...ownerProfile, contact: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <button onClick={() => alert('Owner profile updated successfully!')} className="w-full py-3.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow">💾 Save Changes</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentProf = getCurrentProfile();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border relative">
      <div className="bg-white px-5 py-3.5 border-b flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          {currentProf?.photo ? <img src={currentProf.photo} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-[#3B6E5B]" /> : <div className="w-10 h-10 rounded-full bg-[#3B6E5B] text-white flex items-center justify-center font-bold">{(currentProf?.name || 'U').charAt(0)}</div>}
          <div>
            <h2 className="font-bold text-sm">{currentProf?.name}</h2>
            <p className="text-[11px] text-slate-500 capitalize">Role: {currentRole}</p>
          </div>
        </div>
        <button onClick={resetToWelcome} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold">Sign Out</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4">
        {activeTab === 'jobs' && (
          <div className="space-y-3">
            <h3 className="font-bold text-base">Available Tasks</h3>
            <div className="bg-white p-4 rounded-2xl border space-y-2">
              <div className="flex justify-between font-bold text-sm"><span>Kigali Heritage Tour</span><span className="text-[#234E40]">RWF 35,000</span></div>
              <p className="text-xs text-slate-500">MoMo Code: {MOMO_PAYMENT_CODE}</p>
            </div>
          </div>
        )}

        {activeTab === 'profile' && currentProf && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border space-y-4 shadow-sm">
              <div className="flex flex-col items-center space-y-2">
                {currentProf.photo ? <img src={currentProf.photo} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-[#3B6E5B]" /> : <div className="w-24 h-24 rounded-full bg-emerald-100 text-[#234E40] flex items-center justify-center font-bold text-2xl">{currentProf.name.charAt(0)}</div>}
                <label className="cursor-pointer bg-[#3B6E5B] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold">
                  Upload Profile Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (imgData) => updateCurrentProfile({ photo: imgData }))} />
                </label>
              </div>
              <div className="space-y-3 text-xs">
                <input type="text" value={currentProf.name} onChange={(e) => updateCurrentProfile({ name: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <input type="text" value={currentProf.headline} onChange={(e) => updateCurrentProfile({ headline: e.target.value })} className="w-full p-2.5 border rounded-xl" />
                <button onClick={() => alert('Profile saved successfully!')} className="w-full py-3.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow">💾 Save Profile Changes</button>
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
