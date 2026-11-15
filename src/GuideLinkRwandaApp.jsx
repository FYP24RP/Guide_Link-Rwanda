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

  const [newTaskForm, setNewTaskForm] = useState({ title: '', date: '', rawPay: '', location: 'Kigali', category: 'Guiding Job' });
  const [tripRequests, setTripRequests] = useState([]);
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
      headline: 'Certified Tourism Professional',
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

  // Welcome View
  if (currentRole === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-700 p-6">
        <div className="text-center py-10 space-y-4">
          <h1 className="text-3xl font-bold">GuideLink Rwanda</h1>
          <p className="text-emerald-400 font-medium">Turn your tourism degree into paid work.</p>
          <p className="text-xs text-slate-400">C.E.O: {ownerProfile.name}</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => setCurrentRole('signin')}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition"
          >
            Sign In (Registered Members)
          </button>
          <button
            onClick={() => {
              setRegForm({ name: '', contact: '', password: '', confirmPassword: '', role: 'traveler', momoRef: '' });
              setRegStep('details');
              setCurrentRole('signup');
            }}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-bold text-sm transition"
          >
            Create Account (New Sign Up)
          </button>
          <button
            onClick={() => setShowOwnerPinModal(true)}
            className="w-full py-2.5 bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold transition"
          >
            👑 C.E.O Portal Login
          </button>
        </div>

        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleOwnerLogin} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
              <h3 className="font-bold text-base text-white text-center">C.E.O Authentication</h3>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter Password"
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl text-sm text-center font-bold"
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOwnerPinModal(false)}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
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
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-700 p-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="font-bold text-white">Sign In</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-slate-300">← Home</button>
        </div>
        <form onSubmit={handleSignInSubmit} className="space-y-4 my-auto">
          <div>
            <label className="text-xs font-bold text-slate-400">Phone Number or Email</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="+250..."
              value={signInContact}
              onChange={(e) => setSignInContact(e.target.value)}
              className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
            />
          </div>
          <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition">
            Unlock Dashboard →
          </button>
        </form>
        <div></div>
      </div>
    );
  }

  // Sign Up View
  if (currentRole === 'signup') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-700 p-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="font-bold text-white">Create Account</h2>
          <button onClick={resetToWelcome} className="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-slate-300">← Home</button>
        </div>
        
        {regStep === 'details' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5 my-auto">
            <div>
              <label className="text-xs font-bold text-slate-400">Full Name or Company Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Alice Uwase"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Phone Number or Email</label>
              <input
                type="text"
                required
                placeholder="+250..."
                value={regForm.contact}
                onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Create Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={regForm.confirmPassword}
                onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Account Role</label>
              <select
                value={regForm.role}
                onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
              >
                <option value="traveler">Traveler (Free)</option>
                <option value="graduate">Tourism Graduate / Guide (500 RWF Fee)</option>
                <option value="agency">Travel Agency (500 RWF Fee)</option>
                <option value="tour_company">Tour Company (500 RWF Fee)</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition">
              Continue →
            </button>
          </form>
        )}

        {regStep === 'pay_500' && (
          <div className="space-y-4 my-auto text-center">
            <h3 className="font-bold text-lg">Pay Verification Fee</h3>
            <p className="text-xs text-slate-300">
              Send 500 RWF via MoMo code <strong className="text-emerald-400">{MOMO_PAYMENT_CODE}</strong>, then enter your transaction reference below:
            </p>
            <input
              type="text"
              placeholder="MoMo Transaction Reference"
              value={regForm.momoRef}
              onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white text-center"
            />
            <button
              onClick={handleComplete500Payment}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm"
            >
              Submit Reference
            </button>
          </div>
        )}

        {regStep === 'pending_approval' && (
          <div className="space-y-4 my-auto text-center">
            <h3 className="font-bold text-lg text-amber-400">Pending Approval</h3>
            <p className="text-xs text-slate-300">Your registration has been submitted to the C.E.O for review.</p>
            <button onClick={resetToWelcome} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold">Return Home</button>
          </div>
        )}
        <div></div>
      </div>
    );
  }

  // Owner View
  if (currentRole === 'owner') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 max-w-xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="font-bold text-lg">👑 C.E.O
