import React, { useState, useEffect } from 'react';

export default function GuideLinkRwandaApp() {
  // Navigation & Modal States
  const [currentRole, setCurrentRole] = useState('welcome'); // 'welcome' | 'register' | 'graduate' | 'agency' | 'traveler' | 'owner'
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('mtn');

  // Owner Security PIN Modal
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');

  // STEP 1: VIP / Exempt Users (Owner + 3 confirmed users who skip the 500 RWF charge)
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

  // Registered Users List (Tracks 500 RWF sign-ups & Owner Approvals)
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('gl_registered_users');
    return saved ? JSON.parse(saved) : [];
  });

  // Active Logged-in User
  const [activeUser, setActiveUser] = useState(null);

  // Registration Form State
  const [regStep, setRegStep] = useState('details'); // 'details' | 'pay_500' | 'pending_approval'
  const [regForm, setRegForm] = useState({
    name: '',
    contact: '',
    role: 'graduate',
    paymentMethod: 'mtn',
    momoRef: ''
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('gl_exempt_users', JSON.stringify(exemptAccounts));
  }, [exemptAccounts]);

  useEffect(() => {
    localStorage.setItem('gl_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Default Profile & Tasks State
  const [graduateProfile, setGraduateProfile] = useState({
    name: 'RUTUNGURA Bonheur',
    title: 'Tourism Graduate & Consultant',
    rating: '4.9',
    reviewsCount: 15,
    languages: ['English', 'French', 'Kinyarwanda'],
    skills: ['GDS Galileo & Sabre', 'City Tours', 'Wildlife Guiding', 'Trip Planning']
  });

  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Half-day Kigali city tour & cultural heritage',
      agency: 'Cheetah Safaris / Partner Agency',
      pay: 'RWF 35,000',
      date: 'Sat 21 Nov, 09:00 to 13:00',
      timeLabel: 'Sat 21 Nov, 4 hours',
      meetingPoint: 'Kigali City Centre',
      groupSize: '6 travelers',
      languages: ['English', 'French', 'Kinyarwanda'],
      category: 'Guiding',
      status: 'offer_sent',
      paymentStatus: 'pending'
    },
    {
      id: 2,
      title: 'Airport transfer & Volcanic region briefing',
      agency: 'Rwanda Eco-Tours',
      pay: 'RWF 20,000',
      date: 'Mon 23 Nov, 14:00 to 16:00',
      timeLabel: 'Mon 23 Nov, 2 hours',
      meetingPoint: 'Kigali International Airport',
      groupSize: '2 travelers',
      languages: ['English'],
      category: 'Guiding',
      status: 'open',
      paymentStatus: 'pending'
    },
    {
      id: 3,
      title: 'Custom 5-day Nyungwe & Volcanoes itinerary consultation',
      agency: 'Kitabi Travel Desk',
      pay: 'RWF 45,000',
      date: 'Remote, due Wed 25 Nov',
      timeLabel: 'Remote, due Wed 25 Nov',
      meetingPoint: 'Online / Remote',
      groupSize: '1 client',
      languages: ['English', 'Kinyarwanda'],
      category: 'Consulting',
      status: 'open',
      paymentStatus: 'pending'
    }
  ]);

  const resetToWelcome = () => {
    setCurrentRole('welcome');
    setActiveTab('jobs');
    setSelectedTask(null);
    setRegStep('details');
  };

  // Normalize phone/contact for matching
  const normalizeContact = (str) => str.replace(/\s+/g, '').toLowerCase();

  // Check if user is Owner or one of the 3 confirmed VIP users
  const checkExemptUser = (contactInput) => {
    const cleanInput = normalizeContact(contactInput);
    return exemptAccounts.find(
      (acc) => acc.confirmed && normalizeContact(acc.contact) === cleanInput
    );
  };

  // Handle Step 1 of Registration (Check Exemption vs 500 RWF Gate)
  const handleProceedRegistration = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.contact.trim()) {
      alert('Please enter your Full Name and Phone Number / Email.');
      return;
    }

    // 1. Check if Owner or one of the 3 VIP Exempt Users
    const exemptMatch = checkExemptUser(regForm.contact);
    if (exemptMatch) {
      if (exemptMatch.id === 'owner') {
        setShowOwnerPinModal(true);
        return;
      }
      setActiveUser({ name: exemptMatch.name, contact: exemptMatch.contact, role: exemptMatch.role, isVip: true });
      setGraduateProfile((prev) => ({ ...prev, name: exemptMatch.name }));
      setCurrentRole(exemptMatch.role);
      setActiveTab(exemptMatch.role === 'agency' ? 'dashboard' : 'jobs');
      alert(`Welcome back, ${exemptMatch.name}! VIP Exemption verified (0 RWF fee).`);
      return;
    }

    // 2. Check if already registered & approved by Owner
    const existingUser = registeredUsers.find(
      (u) => normalizeContact(u.contact) === normalizeContact(regForm.contact)
    );
    if (existingUser) {
      if (existingUser.status === 'approved') {
        setActiveUser(existingUser);
        setGraduateProfile((prev) => ({ ...prev, name: existingUser.name }));
        setCurrentRole(existingUser.role);
        setActiveTab(existingUser.role === 'agency' ? 'dashboard' : 'jobs');
        return;
      } else {
        setRegStep('pending_approval');
        return;
      }
    }

    // 3. Otherwise, require mandatory 500 RWF payment before finishing sign-up
    setRegStep('pay_500');
  };

  // Complete 500 RWF Registration Payment
  const handleComplete500Payment = () => {
    const newRegistrant = {
      id: Date.now(),
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      role: regForm.role,
      feePaid: 500,
      paymentMethod: regForm.paymentMethod.toUpperCase(),
      momoRef: regForm.momoRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending_approval', // Owner confirms in Step 2
      createdAt: new Date().toLocaleDateString()
    };

    setRegisteredUsers([newRegistrant, ...registeredUsers]);
    setRegStep('pending_approval');
  };

  // Owner Actions
  const handleOwnerLogin = () => {
    if (ownerPinInput === '2026') {
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setCurrentRole('owner');
    } else {
      alert('Incorrect Owner PIN. Default PIN is 2026.');
    }
  };

  const approveRegistrant = (userId) => {
    setRegisteredUsers(
      registeredUsers.map((u) => (u.id === userId ? { ...u, status: 'approved' } : u))
    );
  };

  const updateVipSlot = (slotId, field, value) => {
    setExemptAccounts(
      exemptAccounts.map((acc) => (acc.id === slotId ? { ...acc, [field]: value } : acc))
    );
  };

  const updateBookingStatus = (taskId, newStatus) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  // ==================== 1. WELCOME SCREEN ====================
  if (currentRole === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200">
        <div>
          {/* Top Banner */}
          <div className="bg-[#E2ECE9] p-6 text-center relative overflow-hidden">
            <div className="absolute top-4 right-6 w-14 h-14 bg-amber-400 rounded-full shadow-md"></div>
            <div className="h-24 flex items-end justify-center space-x-1">
              <div className="w-full h-14 bg-[#5A8F7B] rounded-t-full opacity-60"></div>
              <div className="absolute bottom-0 w-full h-10 bg-[#3B6E5B] rounded-t-full opacity-80"></div>
              <div className="absolute bottom-0 w-3/4 h-7 bg-[#234E40] rounded-t-full"></div>
            </div>
          </div>

          <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GuideLink Rwanda</h1>
            <p className="text-lg font-medium text-[#234E40] mt-1">Turn your tourism degree into paid work.</p>
            <p className="text-xs text-slate-600 mt-2">
              Freelance guiding and travel consulting, matched with agencies and travelers across Rwanda.
            </p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
              Developed & Copyright © 2026 RUTUNGURA Bonheur
            </p>

            {/* Primary Sign In / Registration CTA with 500 RWF Notice */}
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#234E40] uppercase">Member Sign In / Sign Up</span>
                <span className="text-[11px] font-bold bg-[#3B6E5B] text-white px-2.5 py-0.5 rounded-full">
                  500 RWF Reg. Fee
                </span>
              </div>
              <p className="text-xs text-slate-600">
                New users pay a one-time <strong>500 RWF</strong> registration fee via MoMo/Airtel before completing sign-in (Owner & 3 confirmed VIP users exempt).
              </p>
              <button
                onClick={() => {
                  setRegStep('details');
                  setCurrentRole('register');
                }}
                className="w-full py-3 bg-[#3B6E5B] hover:bg-[#234E40] text-white rounded-xl font-bold text-sm shadow transition"
              >
                Sign In / Register Now →
              </button>
            </div>

            {/* Quick Demo / Role Preview */}
            <div className="mt-6 space-y-2.5">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Role Access</p>
                <button
                  onClick={() => setShowOwnerPinModal(true)}
                  className="text-xs font-bold text-[#234E40] underline"
                >
                  🔐 Owner HQ
                </button>
              </div>

              <button
                onClick={() => {
                  setCurrentRole('graduate');
                  setActiveTab('jobs');
                }}
                className="w-full text-left p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#3B6E5B] transition flex justify-between items-center"
              >
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tourism graduate</h3>
                  <p className="text-xs text-slate-500">Find freelance guiding and consulting tasks</p>
                </div>
                <span className="text-slate-400">→</span>
              </button>

              <button
                onClick={() => {
                  setCurrentRole('agency');
                  setActiveTab('dashboard');
                }}
                className="w-full text-left p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#3B6E5B] transition flex justify-between items-center"
              >
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Travel agency</h3>
                  <p className="text-xs text-slate-500">Post tasks and hire qualified graduates</p>
                </div>
                <span className="text-slate-400">→</span>
              </button>

              <button
                onClick={() => {
                  setCurrentRole('traveler');
                  setActiveTab('jobs');
                }}
                className="w-full text-left p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#3B6E5B] transition flex justify-between items-center"
              >
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Traveler</h3>
                  <p className="text-xs text-slate-500">Book a trained local guide & pay securely</p>
                </div>
                <span className="text-slate-400">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Owner PIN Modal */}
        {showOwnerPinModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
              <h3 className="font-bold text-base text-slate-900">Owner HQ Verification</h3>
              <p className="text-xs text-slate-500">Enter Owner PIN to manage VIP users, approvals, and fees (Default: 2026).</p>
              <input
                type="password"
                placeholder="Enter PIN"
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm text-center tracking-widest font-bold"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowOwnerPinModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOwnerLogin}
                  className="flex-1 py-2 bg-[#234E40] text-white rounded-xl text-xs font-bold"
                >
                  Unlock HQ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 2. REGISTRATION & 500 RWF PAYMENT GATE ====================
  if (currentRole === 'register') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Member Registration</h2>
          <button
            onClick={resetToWelcome}
            className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold text-slate-600"
          >
            ← Back
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {regStep === 'details' && (
            <form onSubmit={handleProceedRegistration} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div>
                <span className="text-xs font-bold text-[#3B6E5B] uppercase">Step 1 of 2</span>
                <h3 className="text-lg font-bold text-slate-900">Account Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard registration requires <strong>500 RWF</strong>. Owner & 3 confirmed VIP users bypass payment automatically.
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
                Continue to Payment Gate →
              </button>
            </form>
          )}

          {regStep === 'pay_500' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                  Payment Required
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Pay 500 RWF Registration Fee</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Complete your <strong>500 RWF</strong> payment to finalize sign-up for <strong>{regForm.name}</strong> ({regForm.contact}).
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Choose Mobile Money Provider</label>
                <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer ${regForm.paymentMethod === 'mtn' ? 'border-[#3B6E5B] bg-emerald-50' : 'border-slate-200'}`}>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={regForm.paymentMethod === 'mtn'}
                      onChange={() => setRegForm({ ...regForm, paymentMethod: 'mtn' })}
                    />
                    <span className="text-xs font-bold text-slate-800">MTN Mobile Money (500 RWF)</span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">MoMo</span>
                </label>

                <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer ${regForm.paymentMethod === 'airtel' ? 'border-[#3B6E5B] bg-emerald-50' : 'border-slate-200'}`}>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={regForm.paymentMethod === 'airtel'}
                      onChange={() => setRegForm({ ...regForm, paymentMethod: 'airtel' })}
                    />
                    <span className="text-xs font-bold text-slate-800">Airtel Money (500 RWF)</span>
                  </div>
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">Airtel</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Transaction Reference / MoMo Number</label>
                <input
                  type="text"
                  placeholder="Enter MoMo Transaction ID or Phone"
                  value={regForm.momoRef}
                  onChange={(e) => setRegForm({ ...regForm, momoRef: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                onClick={handleComplete500Payment}
                className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold text-sm shadow"
              >
                Confirm 500 RWF Payment & Finish Sign Up
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
              <div className="w-12 h-12 bg-emerald-100 text-[#234E40] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-900">500 RWF Payment Submitted!</h3>
              <p className="text-xs text-slate-600">
                Your registration payment of <strong>500 RWF</strong> has been recorded and sent to the Owner (<strong>RUTUNGURA Bonheur</strong>) for final account confirmation.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-500">
                Status: <span className="font-bold text-amber-700">Awaiting Owner Confirmation</span>
              </div>
              <button
                onClick={resetToWelcome}
                className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl text-xs font-bold"
              >
                Return to Home Screen
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== 3. OWNER HQ DASHBOARD (APPROVALS & 3 VIP SLOTS) ====================
  if (currentRole === 'owner') {
    const totalRegFees = registeredUsers.reduce((sum, u) => sum + (u.feePaid || 0), 0);

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl border border-slate-200">
        <div className="bg-[#234E40] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-30">
          <div>
            <h2 className="font-bold text-base">Owner HQ • RUTUNGURA Bonheur</h2>
            <p className="text-[11px] text-emerald-200">VIP Exemptions & 500 RWF Approvals</p>
          </div>
          <button
            onClick={resetToWelcome}
            className="text-xs bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded-full font-semibold"
          >
            Exit HQ
          </button>
        </div>

        <div className="p-4 space-y-5 flex-1 overflow-y-auto">
          {/* Revenue Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-xl font-extrabold text-[#234E40]">RWF {totalRegFees.toLocaleString()}</span>
              <span className="text-[11px] text-slate-400 block mt-1">500 RWF Sign-Up Fees</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-xl font-extrabold text-[#3B6E5B]">{registeredUsers.length}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Paid Registrants</span>
            </div>
          </div>

          {/* Manage Owner + 3 Exempt VIP Users */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Exempt Users (0 RWF Fee)</h3>
              <p className="text-xs text-slate-500">You (Owner) + 3 VIP users you confirm can sign in without paying 500 RWF.</p>
            </div>

            <div className="space-y-3">
              {exemptAccounts.map((acc) => (
                <div key={acc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#234E40] uppercase">
                      {acc.id === 'owner' ? '👑 Owner Account' : `⭐ Exempt Slot (${acc.id.toUpperCase()})`}
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
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={acc.contact}
                      onChange={(e) => updateVipSlot(acc.id, 'contact', e.target.value)}
                      placeholder="Phone / Email"
                      className="flex-1 p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    />
                    <select
                      value={acc.role}
                      onChange={(e) => updateVipSlot(acc.id, 'role', e.target.value)}
                      disabled={acc.id === 'owner'}
                      className="p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    >
                      <option value="owner">Owner</option>
                      <option value="graduate">Graduate</option>
                      <option value="agency">Agency</option>
                      <option value="traveler">Traveler</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paid 500 RWF Registrations Awaiting Confirmation */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-slate-900">500 RWF Paid Registrations</h3>
            {registeredUsers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No paid registrations yet.</p>
            ) : (
              registeredUsers.map((user) => (
                <div key={user.id} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="text-slate-600">{user.contact} • Role: {user.role}</p>
                    <p className="text-[11px] text-[#234E40] font-semibold">
                      Paid: {user.feePaid} RWF ({user.paymentMethod} • Ref: {user.momoRef})
                    </p>
                  </div>
                  {user.status === 'approved' ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                      ✓ Confirmed
                    </span>
                  ) : (
                    <button
                      onClick={() => approveRegistrant(user.id)}
                      className="px-3 py-1.5 bg-[#3B6E5B] text-white rounded-lg font-bold"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 4. GRADUATE / AGENCY / TRAVELER VIEWS ====================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200 relative">
      {/* Top Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-30">
        <div>
          <h2 className="font-bold text-slate-900">
            {activeUser ? activeUser.name : currentRole === 'graduate' ? graduateProfile.name : currentRole === 'agency' ? 'Cheetah Safaris Desk' : 'Rwanda Discovery'}
          </h2>
          <p className="text-xs text-slate-500 capitalize">
            Role: {currentRole} {activeUser?.isVip && '• ⭐ VIP Exempt'}
          </p>
        </div>
        <button
          onClick={resetToWelcome}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-full transition"
        >
          Switch Role
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {currentRole === 'graduate' && (
          <div>
            {activeTab === 'jobs' && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-900">Open tasks</h3>
                  <span className="text-xs bg-emerald-100 text-[#234E40] font-semibold px-2.5 py-1 rounded-full">
                    Rwanda Region
                  </span>
                </div>

                <div className="flex space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
                  {['All', 'Guiding', 'Consulting'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedFilter(cat)}
                      className={`px-4 py-1.5 rounded-full whitespace-nowrap transition ${selectedFilter === cat ? 'bg-[#3B6E5B] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {tasks
                    .filter((t) => selectedFilter === 'All' || t.category === selectedFilter)
                    .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setActiveTab('bookings');
                        }}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#3B6E5B] transition cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{task.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{task.agency}</p>
                          </div>
                          <span className="font-bold text-[#234E40] text-sm">{task.pay}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 items-center text-xs text-slate-600">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg">📅 {task.timeLabel}</span>
                          <span className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg capitalize">
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="p-4 space-y-4">
                <h3 className="font-bold text-lg text-slate-900">Bookings & Workflow</h3>
                {selectedTask ? (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-slate-900">{selectedTask.title}</h4>
                        <p className="text-xs text-slate-600">{selectedTask.agency}</p>
                      </div>
                      <span className="text-base font-bold text-[#234E40]">{selectedTask.pay}</span>
                    </div>

                    {selectedTask.status === 'open' && (
                      <button
                        onClick={() => {
                          updateBookingStatus(selectedTask.id, 'applied');
                          alert('Applied!');
                        }}
                        className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm"
                      >
                        Apply for Task
                      </button>
                    )}

                    {selectedTask.status === 'offer_sent' && (
                      <button
                        onClick={() => {
                          updateBookingStatus(selectedTask.id, 'confirmed');
                          alert('Offer accepted!');
                        }}
                        className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm"
                      >
                        Accept Offer
                      </button>
                    )}

                    {selectedTask.status === 'confirmed' && (
                      <button
                        onClick={() => {
                          updateBookingStatus(selectedTask.id, 'done');
                          setShowReviewModal(true);
                        }}
                        className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold text-sm"
                      >
                        Mark Task Completed
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                    >
                      ← Back to Tasks
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-500 mb-3">Select a task from Jobs to manage it.</p>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="px-4 py-2 bg-[#3B6E5B] text-white rounded-xl text-xs font-bold"
                    >
                      Browse Jobs
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="p-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-bold text-lg text-slate-900">{activeUser ? activeUser.name : graduateProfile.name}</h3>
                  <p className="text-xs text-slate-500">{graduateProfile.title}</p>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {graduateProfile.skills.map((s) => (
                      <span key={s} className="bg-emerald-50 text-[#234E40] px-3 py-1 rounded-full text-xs font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentRole === 'agency' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Agency Dashboard</h3>
              <button
                onClick={() => setShowPostModal(true)}
                className="bg-[#3B6E5B] text-white text-xs font-bold px-3 py-2 rounded-xl"
              >
                + Post Task
              </button>
            </div>
            {tasks.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-sm">
                  <span>{t.title}</span>
                  <span className="text-[#234E40]">{t.pay}</span>
                </div>
                <p className="text-xs text-slate-500">{t.date}</p>
              </div>
            ))}
          </div>
        )}

        {currentRole === 'traveler' && (
          <div className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Book a Verified Guide</h3>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900">{graduateProfile.name}</h4>
              <p className="text-xs text-slate-600">Cultural heritage tours, wildlife excursions, and trip consulting.</p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs"
              >
                Book & Pay (RWF 35,000)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Traveler Booking Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Rwandan Payment Gateway</h3>
            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2 p-2.5 border rounded-xl">
                <input type="radio" checked={selectedPaymentMode === 'mtn'} onChange={() => setSelectedPaymentMode('mtn')} />
                <span className="font-bold">MTN Mobile Money (MoMo)</span>
              </label>
              <label className="flex items-center space-x-2 p-2.5 border rounded-xl">
                <input type="radio" checked={selectedPaymentMode === 'airtel'} onChange={() => setSelectedPaymentMode('airtel')} />
                <span className="font-bold">Airtel Money</span>
              </label>
            </div>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                alert('Booking payment authorized!');
              }}
              className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav for Graduate */}
      {currentRole === 'graduate' && (
        <div className="bg-white border-t border-slate-200 py-2.5 px-8 flex justify-between items-center text-xs font-semibold text-slate-500 absolute bottom-0 w-full max-w-md z-20">
          <button onClick={() => setActiveTab('jobs')} className={activeTab === 'jobs' ? 'text-[#3B6E5B]' : ''}>📋 Jobs</button>
          <button onClick={() => setActiveTab('bookings')} className={activeTab === 'bookings' ? 'text-[#3B6E5B]' : ''}>📅 Bookings</button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-[#3B6E5B]' : ''}>👤 Profile</button>
        </div>
      )}
    </div>
  );
}
