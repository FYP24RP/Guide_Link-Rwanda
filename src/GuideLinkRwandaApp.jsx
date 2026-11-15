import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://gwwkdhgpfaandekxjsjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_w3I2_S57PjMC6NQlYYGWXw_mlP06djP';

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
    { id: 1, title: 'Half-day Kigali city tour & cultural heritage', agency: 'Cheetah Safaris / Partner Agency', location: 'Kigali', rawPay: 35000, pay: 'RWF 35,000', date: 'Sat 21 Nov, 09:00 to 13:00', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Guiding Job' },
    { id: 2, title: 'Nyungwe Canopy Walk & Tea Plantation Escort', agency: 'Rwanda Eco Tours', location: 'Nyungwe / Rusizi', rawPay: 65000, pay: 'RWF 65,000', date: 'Mon 23 Nov, Full Day', status: 'open', assignedTo: null, paymentStatus: 'pending', category: 'Consultant Job' }
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
    if (updates.name) {
      setActiveUser({ ...activeUser, name: updates.name });
    }

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
    alert('✓ Profile & updates successfully saved to cloud database!');
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

  const handleSignUpSubmit = (e) => {
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
      alert('Please enter your MoMo Transaction Reference.');
      return;
    }

    const newRegistrant = {
      id: Date.now(),
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      password: regForm.password,
      role: regForm.role,
      feePaid: 500,
      momoCodeUsed: MOMO_PAYMENT_CODE,
      momoRef: regForm.momoRef,
      status: 'pending_approval'
    };

    setRegisteredUsers([newRegistrant, ...registeredUsers]);
    setRegStep('pending_approval');

    await supabaseApi('profiles', 'POST', {
      name: newRegistrant.name,
      contact: newRegistrant.contact,
      password: newRegistrant.password,
      role: newRegistrant.role,
      fee_paid: 500,
      momo_ref: newRegistrant.momoRef,
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
      alert('Access Denied: Invalid Owner Password.');
      setOwnerPinInput('');
    }
  };

  const toggleUserAccessStatus = async (userId, userContact, currentStatus) => {
    const nextStatus = currentStatus === 'approved' ? 'revoked' : 'approved';
    setRegisteredUsers(
      registeredUsers.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );
    await supabaseApi('profiles', 'PATCH', { status: nextStatus }, `?contact=eq.${encodeURIComponent(userContact)}`);
    alert(`✓ User access has been successfully ${nextStatus === 'approved' ? 'GRANTED' : 'REVOKED'}!`);
  };

  const toggleVipTierAccess = (slotId) => {
    setExemptAccounts(
      exemptAccounts.map((acc) => (acc.id === slotId ? { ...acc, confirmed: !acc.confirmed } : acc))
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700">
        <header className="flex justify-between items-center border-b border-slate-700 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              GuideLink Rwanda
            </h1>
            <p className="text-sm text-slate-400">Advanced Tourism & Guide Placement Platform</p>
          </div>
          {currentRole !== 'welcome' && (
            <button
              onClick={resetToWelcome}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
            >
              Sign Out
            </button>
          )}
        </header>

        {currentRole === 'welcome' && (
          <div className="text-center py-12 space-y-6">
            <h2 className="text-3xl font-semibold">Welcome to GuideLink Rwanda</h2>
            <p className="text-slate-300 max-w-xl mx-auto">
              Connecting elite tourism graduates, licensed tour operators, agencies, and travelers across Rwanda.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setCurrentRole('signin')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentRole('signup')}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition"
              >
                Create Account (Sign Up)
              </button>
            </div>
            <div className="pt-6 border-t border-slate-700">
              <button
                onClick={() => setShowOwnerPinModal(true)}
                className="text-xs text-slate-400 hover:text-emerald-400 underline transition"
              >
                C.E.O / Administrator Portal Login
              </button>
            </div>
          </div>
        )}

        {currentRole === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="max-w-md mx-auto space-y-4">
            <h2 className="text-xl font-bold text-center">Sign In to Your Account</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Phone Number or Email</label>
              <input
                type="text"
                value={signInContact}
                onChange={(e) => setSignInContact(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                placeholder="e.g. +250780558555"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={resetToWelcome}
              className="w-full text-sm text-slate-400 hover:text-slate-200"
            >
              Back to Welcome
            </button>
          </form>
        )}

        {currentRole === 'signup' && regStep === 'details' && (
          <form onSubmit={handleSignUpSubmit} className="max-w-md mx-auto space-y-4">
            <h2 className="text-xl font-bold text-center">Create Account</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Phone Number or Email</label>
              <input
                type="text"
                value={regForm.contact}
                onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                placeholder="+250..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Password"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={regForm.confirmPassword}
                  onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Confirm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Account Role</label>
              <select
                value={regForm.role}
                onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="traveler">Traveler (Free)</option>
                <option value="graduate">Tourism Graduate / Guide (RWF 500 Reg Fee)</option>
                <option value="agency">Travel Agency (RWF 500 Reg Fee)</option>
                <option value="tour_company">Tour Company (RWF 500 Reg Fee)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={resetToWelcome}
              className="w-full text-sm text-slate-400 hover:text-slate-200"
            >
              Back to Welcome
            </button>
          </form>
        )}

        {currentRole === 'signup' && regStep === 'pay_500' && (
          <div className="max-w-md mx-auto space-y-4 text-center">
            <h2 className="text-xl font-bold">Complete Registration Fee</h2>
            <p className="text-sm text-slate-300">
              Professional accounts require a one-time verification fee of <b>RWF 500</b> sent via MTN/Airtel MoMo Code: <span className="text-emerald-400 font-bold">{MOMO_PAYMENT_CODE}</span>.
            </p>
            <div>
              <label className="block text-sm text-slate-400 mb-1 text-left">MoMo Transaction Reference ID</label>
              <input
                type="text"
                value={regForm.momoRef}
                onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                placeholder="Enter Transaction ID / SMS Ref"
              />
            </div>
            <button
              onClick={handleComplete500Payment}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
            >
              Submit Payment Reference
            </button>
          </div>
        )}

        {currentRole === 'signup' && regStep === 'pending_approval' && (
          <div className="max-w-md mx-auto text-center py-8 space-y-4">
            <h2 className="text-2xl font-bold text-amber-400">Registration Pending Approval</h2>
            <p className="text-slate-300">
              Your registration and MoMo payment reference have been sent to the C.E.O for verification. Once approved, you can sign in with your credentials.
            </p>
            <button
              onClick={resetToWelcome}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
            >
              Return to Welcome
            </button>
          </div>
        )}

        {currentRole === 'owner' && (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-slate-700 pb-3">
              <button
                onClick={() => setOwnerTab('pending')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${ownerTab === 'pending' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Pending Users ({registeredUsers.filter(u => u.status === 'pending_approval').length})
              </button>
              <button
                onClick={() => setOwnerTab('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${ownerTab === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                All Users ({registeredUsers.length})
              </button>
            </div>

            {ownerTab === 'pending' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pending Registrations</h3>
                {registeredUsers.filter(u => u.status === 'pending_approval').length === 0 ? (
                  <p className="text-slate-400">No pending registrations at this time.</p>
                ) : (
                  registeredUsers
                    .filter(u => u.status === 'pending_approval')
                    .map((user) => (
                      <div key={user.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                        <div>
                          <p className="font-bold">{user.name}</p>
                          <p className="text-sm text-slate-400">{user.contact} • Role: {getRoleDisplayLabel(user.role)}</p>
                          <p className="text-xs text-emerald-400 mt-1">MoMo Ref: {user.momoRef}</p>
                        </div>
                        <button
                          onClick={() => toggleUserAccessStatus(user.id, user.contact, 'pending_approval')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium transition"
                        >
                          Approve Account
                        </button>
                      </div>
                    ))
                )}
              </div>
            )}

            {ownerTab === 'all' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Registered Users Directory</h3>
                {registeredUsers.length === 0 ? (
                  <p className="text-slate-400">No registered users yet.</p>
                ) : (
                  registeredUsers.map((user) => (
                    <div key={user.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{user.name} <span className="text-xs text-slate-400">({getRoleDisplayLabel(user.role)})</span></p>
                        <p className="text-sm text-slate-400">{user.contact}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${user.status === 'approved' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}`}>
                          {user.status}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleUserAccessStatus(user.id, user.contact, user.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${user.status === 'approved' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                      >
                        {user.status === 'approved' ? 'Revoke' : 'Approve'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {currentRole !== 'welcome' && currentRole !== 'signin' && currentRole !== 'signup' && currentRole !== 'owner' && (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-slate-700 pb-3">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'jobs' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Jobs & Gigs
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === 'profile' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                My Profile
              </button>
            </div>

            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Tourism & Guiding Tasks</h3>
                {tasks.map((task) => (
                  <div key={task.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-cyan-400">{task.title}</h4>
                      <span className="text-sm font-semibold text-emerald-400">{task.pay}</span>
                    </div>
                    <p className="text-sm text-slate-300">Agency/Company: {task.agency}</p>
                    <p className="text-xs text-slate-400">Location: {task.location} • Date: {task.date}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-4 max-w-lg mx-auto">
                <h3 className="text-lg font-semibold">Manage Profile</h3>
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={getCurrentProfile().name}
                      onChange={(e) => updateCurrentProfile({ name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Headline / Title</label>
                    <input
                      type="text"
                      value={getCurrentProfile().headline}
                      onChange={(e) => updateCurrentProfile({ headline: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Bio / Overview</label>
                    <textarea
                      value={getCurrentProfile().bio}
                      onChange={(e) => updateCurrentProfile({ bio: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={() => handleSaveWithButton(getCurrentProfile())}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full space-y-4">
              <h3 className="text-lg font-bold">C.E.O / Administrator Authentication</h3>
              <p className="text-xs text-slate-400">Enter secure admin password to access management controls.</p>
              <form onSubmit={handleOwnerLogin} className="space-y-3">
                <input
                  type="password"
                  value={ownerPinInput}
                  onChange={(e) => setOwnerPinInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="Enter Password"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
                  >
                    Authorize
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOwnerPinModal(false)}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
