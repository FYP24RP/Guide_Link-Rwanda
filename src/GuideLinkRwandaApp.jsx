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

      exemptAccounts.map((acc) => {

        if (acc.id === slotId) {

          const newStatus = !acc.confirmed;

          alert(`✓ ${acc.tier} access has been successfully ${newStatus ? 'GRANTED' : 'REVOKED'}!`);

          return { ...acc, confirmed: newStatus };

        }

        return acc;

      })

    );

  };



  const handleAcceptTask = (taskId) => {

    setTasks(

      tasks.map((t) =>

        t.id === taskId ? { ...t, status: 'accepted', assignedTo: activeUser?.name || 'Graduate' } : t

      )

    );

    alert('✓ Gig accepted!');

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

    alert(`✓ Task completed! Commission routed to MoMo Code ${MOMO_PAYMENT_CODE}.`);

  };



  const handleConfirmTravelerRequest = (reqId) => {

    const responderName = activeUser?.name || 'Verified Provider';

    const responderRoleLabel = getRoleDisplayLabel(currentRole);

    setTripRequests(

      tripRequests.map((req) =>

        req.id === reqId

          ? {

              ...req,

              status: 'confirmed',

              confirmedBy: `${responderName} (${responderRoleLabel})`

            }

          : req

      )

    );

    alert(`✓ Traveler request confirmed by ${responderName}!`);

  };



  const handlePostNewTask = (e) => {

    e.preventDefault();

    const numericPay = Number(newTaskForm.rawPay);

    if (!newTaskForm.title.trim() || !numericPay) {

      alert('Please enter a valid title and amount.');

      return;

    }

    const created = {

      id: Date.now(),

      title: newTaskForm.title.trim(),

      agency: `${activeUser?.name || 'Partner'} (${getRoleDisplayLabel(currentRole)})`,

      location: newTaskForm.location || 'Kigali',

      rawPay: numericPay,

      pay: `RWF ${numericPay.toLocaleString()}`,

      date: newTaskForm.date || 'Flexible Date',

      status: 'open',

      assignedTo: null,

      paymentStatus: 'pending',

      category: newTaskForm.category || 'Guiding Job'

    };

    setTasks([created, ...tasks]);

    setNewTaskForm({ title: '', date: '', rawPay: '', location: 'Kigali', category: 'Guiding Job' });

    alert('✓ Assignment/Opportunity published to Graduate Board!');

  };



  const handleCreateTripRequest = (e) => {

    e.preventDefault();

    const categoryLabel = getRoleDisplayLabel(tripRequestForm.preferredCategory);

    const req = {

      id: Date.now(),

      travelerName: activeUser?.name || 'Traveler',

      travelerContact: activeUser?.contact || '',

      preferredCategory: tripRequestForm.preferredCategory,

      targetProvider: `Any Available ${categoryLabel}`,

      destination: tripRequestForm.destination,

      dates: tripRequestForm.dates || 'Upcoming',

      guests: tripRequestForm.guests,

      notes: tripRequestForm.notes,

      status: 'pending_confirmation',

      confirmedBy: null

    };

    setTripRequests([req, ...tripRequests]);

    setTripRequestForm({

      preferredCategory: 'graduate',

      destination: 'Volcanoes National Park / Musanze',

      dates: '',

      guests: '2',

      notes: ''

    });

    alert(`✓ Request broadcasted to available ${categoryLabel}s!`);

  };



  const handleDirectProviderBooking = (e) => {

    e.preventDefault();

    if (!bookingTarget) return;

    const newBooking = {

      id: Date.now(),

      travelerName: activeUser?.name || 'Traveler',

      travelerContact: activeUser?.contact || '',

      preferredCategory: bookingTarget.type,

      targetProvider: `${bookingTarget.name} (${bookingTarget.categoryLabel})`,

      destination: bookingTarget.location,

      dates: bookingDetails.dates || 'Requested Dates',

      guests: bookingDetails.guests,

      notes: bookingDetails.notes,

      status: 'pending_confirmation',

      confirmedBy: null

    };

    setTripRequests([newBooking, ...tripRequests]);

    setBookingTarget(null);

    setBookingDetails({ dates: '', guests: '2', notes: '' });

    alert(`✓ Booking request sent to ${newBooking.targetProvider}!`);

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

      if (acc.confirmed && ['graduate', 'agency', 'tour_company'].includes(acc.role)) {

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
