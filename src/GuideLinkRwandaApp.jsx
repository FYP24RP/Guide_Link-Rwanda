import React, { useState, useEffect } from 'react';

export default function GuideLinkRwandaApp() {
  // Navigation & Modal States
  const [currentRole, setCurrentRole] = useState('welcome'); // 'welcome' | 'register' | 'graduate' | 'agency' | 'traveler' | 'owner'
  const [ownerTab, setOwnerTab] = useState('pending'); // 'overview' | 'pending' | 'vip' | 'deals'
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('mtn');

  // Owner Security Password Modal
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');

  // VIP / Exempt Users (Owner + 3 confirmed users skip 500 RWF fee)
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

  // Platform Commission Settings
  const [platformSettings, setPlatformSettings] = useState(() => {
    const saved = localStorage.getItem('gl_platform_settings');
    return saved ? JSON.parse(saved) : { commissionRatePercent: 10 };
  });

  useEffect(() => {
    localStorage.setItem('gl_exempt_users', JSON.stringify(exemptAccounts));
  }, [exemptAccounts]);

  useEffect(() => {
    localStorage.setItem('gl_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem('gl_platform_settings', JSON.stringify(platformSettings));
  }, [platformSettings]);

  const [graduateProfile, setGraduateProfile] = useState({
    name: 'RUTUNGURA Bonheur',
    title: 'Tourism Graduate & Consultant',
    rating: '4.9',
    reviewsCount: 15,
    languages: ['English', 'French', 'Kinyarwanda'],
    skills: ['GDS Galileo & Sabre', 'City Tours', 'Wildlife Guiding', 'Trip Planning']
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('gl_tasks_data');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        title: 'Half-day Kigali city tour & cultural heritage',
        agency: 'Cheetah Safaris / Partner Agency',
        rawPay: 35000,
        pay: 'RWF 35,000',
        date: 'Sat 21 Nov, 09:00 to 13:00',
        timeLabel: 'Sat 21 Nov, 4 hours',
        meetingPoint: 'Kigali City Centre',
        groupSize: '6 travelers',
        languages: ['English', 'French', 'Kinyarwanda'],
        category: 'Guiding',
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
        rawPay: 45000,
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
    ];
  });

  useEffect(() => {
    localStorage.setItem('gl_tasks_data', JSON.stringify(tasks));
  }, [tasks]);

  const resetToWelcome = () => {
    setCurrentRole('welcome');
    setActiveTab('jobs');
    setSelectedTask(null);
    setRegStep('details');
    setActiveUser(null);
  };

  const normalizeContact = (str) => str.replace(/\s+/g, '').toLowerCase();

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

    // 1. Check Owner or 3 VIP Exempt Users
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
      return;
    }

    // 2. Check existing registered user status
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

    // 3. New user must pay 500 RWF before completing registration
    setRegStep('pay_500');
  };

  const handleComplete500Payment = () => {
    const newRegistrant = {
      id: Date.now(),
      name: regForm.name.trim(),
      contact: regForm.contact.trim(),
      role: regForm.role,
      feePaid: 500,
      paymentMethod: regForm.paymentMethod.toUpperCase(),
      momoRef: regForm.momoRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending_approval',
      createdAt: new Date().toLocaleDateString()
    };

    setRegisteredUsers([newRegistrant, ...registeredUsers]);
    setRegStep('pending_approval');
  };

  // Private Owner Password Check (No hint shown)
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

  const updateBookingStatus = (taskId, newStatus) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  const handleCompleteTask = (taskId) => {
    setTasks(tasks.map((t) => {
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
    }));
    setShowReviewModal(true);
  };

  // ==================== 1. GATED WELCOME SCREEN (ONLY SIGN UP & OWNER LOGIN) ====================
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
                Developed & Copyright © 2026 RUTUNGURA Bonheur
              </p>
            </div>

            {/* Only Entry Point for Users: Sign Up / Sign In (500 RWF Fee) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#234E40] uppercase tracking-wider">Member Portal</span>
                <span className="text-[11px] font-bold bg-emerald-100 text-[#234E40] px
