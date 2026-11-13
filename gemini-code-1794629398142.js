import React, { useState } from 'react';

export default function GuideLinkRwandaApp() {
  const [currentRole, setCurrentRole] = useState('welcome'); // 'welcome' | 'graduate' | 'agency' | 'traveler'
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'bookings' | 'reviews' | 'profile' | 'dashboard' | 'tasks' | 'guides'
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCustomProfileModal, setShowCustomProfileModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('mtn');

  // Persistent App State
  const [graduateProfile, setGraduateProfile] = useState({
    name: 'RUTUNGURA Bonheur',
    title: 'Tourism Graduate & Consultant, RP Kitabi College',
    rating: '4.9',
    reviewsCount: 15,
    languages: ['English', 'French', 'Kinyarwanda'],
    skills: ['GDS Galileo & Sabre', 'City Tours', 'Wildlife Guiding', 'Trip Planning'],
    availableDates: ['16', '17', '18', '21', '22', '24', '25'],
    experience: [
      { title: 'Guide, Kigali walking tours', count: '10 tasks' },
      { title: 'Trip planner, group itineraries', count: '6 tasks' }
    ]
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
      status: 'offer_sent', // 'open' | 'applied' | 'offer_sent' | 'confirmed' | 'done'
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

  const resetData = () => {
    setCurrentRole('welcome');
    setActiveTab('jobs');
    setSelectedTask(null);
    setShowReviewModal(false);
    setShowPaymentModal(false);
  };

  const updateBookingStatus = (taskId, newStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleApply = (taskId) => {
    updateBookingStatus(taskId, 'applied');
    alert('Application submitted successfully to the agency!');
  };

  const handleAcceptOffer = (taskId) => {
    updateBookingStatus(taskId, 'confirmed');
    alert('Offer accepted! Booking confirmed.');
  };

  const handleCompleteTask = (taskId) => {
    updateBookingStatus(taskId, 'done');
    setTasks(tasks.map(t => t.id === taskId ? { ...t, paymentStatus: 'paid' } : t));
    setShowReviewModal(true);
  };

  // 1. WELCOME & ROLE SELECTOR SCREEN
  if (currentRole === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200">
        <div>
          {/* Top Banner Illustration */}
          <div className="bg-[#E2ECE9] p-6 text-center relative overflow-hidden">
            <div className="absolute top-4 right-6 w-14 h-14 bg-amber-400 rounded-full shadow-md"></div>
            <div className="h-28 flex items-end justify-center space-x-1">
              <div className="w-full h-16 bg-[#5A8F7B] rounded-t-full opacity-60"></div>
              <div className="absolute bottom-0 w-full h-12 bg-[#3B6E5B] rounded-t-full opacity-80"></div>
              <div className="absolute bottom-0 w-3/4 h-8 bg-[#234E40] rounded-t-full"></div>
            </div>
          </div>

          <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GuideLink Rwanda</h1>
            <p className="text-xl font-medium text-[#234E40] mt-1">Turn your tourism degree into paid work.</p>
            <p className="text-sm text-slate-600 mt-2">
              Freelance guiding and travel consulting, matched with agencies and travelers across Rwanda.
            </p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
              Developed & Copyright © 2026 RUTUNGURA Bonheur
            </p>

            <div className="mt-8 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Continue as</p>
              
              <button 
                onClick={() => { setCurrentRole('graduate'); setActiveTab('jobs'); }}
                className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#3B6E5B] transition flex justify-between items-center group"
              >
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-[#234E40]">Tourism graduate</h3>
                  <p className="text-xs text-slate-500">Find freelance guiding and consulting tasks</p>
                </div>
                <span className="text-slate-400 group-hover:text-[#234E40]">→</span>
              </button>

              <button 
                onClick={() => { setCurrentRole('agency'); setActiveTab('dashboard'); }}
                className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#3B6E5B] transition flex justify-between items-center group"
              >
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-[#234E40]">Travel agency</h3>
                  <p className="text-xs text-slate-500">Post tasks and hire qualified graduates</p>
                </div>
                <span className="text-slate-400 group-hover:text-[#234E40]">→</span>
              </button>

              <button 
                onClick={() => { setCurrentRole('traveler'); setActiveTab('jobs'); }}
                className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#3B6E5B] transition flex justify-between items-center group"
              >
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-[#234E40]">Traveler</h3>
                  <p className="text-xs text-slate-500">Book a trained local guide & pay securely</p>
                </div>
                <span className="text-slate-400 group-hover:text-[#234E40]">→</span>
              </button>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <span className="text-xs text-slate-400">RP Kitabi College Final Year Project</span>
              <button 
                onClick={() => setShowCustomProfileModal(true)}
                className="text-xs text-[#3B6E5B] font-semibold underline"
              >
                + Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Custom Profile Modal */}
        {showCustomProfileModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-bold text-lg text-slate-900 mb-2">Configure Profile</h3>
              <p className="text-xs text-slate-500 mb-4">Update your user details for the evaluation.</p>
              
              <label className="text-xs font-semibold text-slate-600">Full Name</label>
              <input 
                type="text" 
                value={graduateProfile.name} 
                onChange={(e) => setGraduateProfile({...graduateProfile, name: e.target.value})}
                className="w-full mt-1 mb-3 p-2 border border-slate-200 rounded-lg text-sm"
              />

              <label className="text-xs font-semibold text-slate-600">Title / Affiliation</label>
              <input 
                type="text" 
                value={graduateProfile.title} 
                onChange={(e) => setGraduateProfile({...graduateProfile, title: e.target.value})}
                className="w-full mt-1 mb-4 p-2 border border-slate-200 rounded-lg text-sm"
              />

              <button 
                onClick={() => setShowCustomProfileModal(false)}
                className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-semibold text-sm"
              >
                Save & Continue
              </button>
            </div>
          </div>
        )}

        <div className="p-4 text-center text-xs text-slate-400 border-t border-slate-100">
          GuideLink Rwanda PWA v1.0 • Owner: RUTUNGURA Bonheur
        </div>
      </div>
    );
  }

  // COMMON APP WRAPPER FOR ROLES
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-200 relative">
      
      {/* Top Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-30">
        <div>
          <h2 className="font-bold text-slate-900">
            {currentRole === 'graduate' && graduateProfile.name}
            {currentRole === 'agency' && 'Cheetah Safaris Desk'}
            {currentRole === 'traveler' && 'Rwanda Discovery'}
          </h2>
          <p className="text-xs text-slate-500 capitalize">Role: {currentRole}</p>
        </div>
        <button 
          onClick={resetData} 
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-full transition"
        >
          Switch Role
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20">
        
        {/* ================= GRADUATE VIEWS ================= */}
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

                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search guiding, language, place" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm pl-9 focus:outline-none focus:border-[#3B6E5B]"
                  />
                  <span className="absolute left-3 top-3 text-slate-400 text-sm">🔍</span>
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
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available tasks</p>
                  {tasks.filter(t => selectedFilter === 'All' || t.category === selectedFilter).map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
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
                        {task.status !== 'open' && (
                          <span className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg capitalize">
                            Status: {task.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-[#234E40] font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                          ✓ Schedule matches your availability
                        </span>
                        <div className="space-x-1">
                          {task.languages.map(l => (
                            <span key={l} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{l}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="p-4 space-y-4">
                <h3 className="font-bold text-lg text-slate-900">Bookings & Workflow Tracker</h3>
                
                {selectedTask ? (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {selectedTask.category} Task
                        </span>
                        <h4 className="font-bold text-xl text-slate-900 mt-1">{selectedTask.title}</h4>
                        <p className="text-sm text-slate-600">{selectedTask.agency}</p>
                      </div>
                      <span className="text-lg font-bold text-[#234E40]">{selectedTask.pay}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date & Time:</span>
                        <span className="font-semibold">{selectedTask.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Meeting Point:</span>
                        <span className="font-semibold">{selectedTask.meetingPoint}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Group Size:</span>
                        <span className="font-semibold">{selectedTask.groupSize}</span>
                      </div>
                    </div>

                    {/* 4-Step Booking Status Flow */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">4-Step Booking Status</p>
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-semibold">
                        <div className={`p-2 rounded-lg ${['applied', 'offer_sent', 'confirmed', 'done'].includes(selectedTask.status) ? 'bg-[#3B6E5B] text-white' : 'bg-slate-100 text-slate-400'}`}>1. Applied</div>
                        <div className={`p-2 rounded-lg ${['offer_sent', 'confirmed', 'done'].includes(selectedTask.status) ? 'bg-[#3B6E5B] text-white' : 'bg-slate-100 text-slate-400'}`}>2. Offer Sent</div>
                        <div className={`p-2 rounded-lg ${['confirmed', 'done'].includes(selectedTask.status) ? 'bg-[#3B6E5B] text-white' : 'bg-slate-100 text-slate-400'}`}>3. Confirmed</div>
                        <div className={`p-2 rounded-lg ${selectedTask.status === 'done' ? 'bg-[#3B6E5B] text-white' : 'bg-slate-100 text-slate-400'}`}>4. Done</div>
                      </div>
                    </div>

                    {selectedTask.status === 'open' && (
                      <button onClick={() => handleApply(selectedTask.id)} className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-sm shadow">
                        Apply for Task
                      </button>
                    )}

                    {selectedTask.status === 'offer_sent' && (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
                        <p className="text-xs text-[#234E40] font-medium">Agency sent an official contract offer. Accept to confirm booking.</p>
                        <div className="flex space-x-2">
                          <button onClick={() => updateBookingStatus(selectedTask.id, 'open')} className="flex-1 py-2.5 bg-white border text-slate-700 rounded-xl font-bold text-xs">Decline</button>
                          <button onClick={() => handleAcceptOffer(selectedTask.id)} className="flex-1 py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs">Accept Offer</button>
                        </div>
                      </div>
                    )}

                    {selectedTask.status === 'confirmed' && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800">Booking confirmed! Date locked on calendar.</div>
                        <button onClick={() => handleCompleteTask(selectedTask.id)} className="w-full py-3 bg-[#234E40] text-white rounded-xl font-bold text-sm">
                          Mark Task as Completed
                        </button>
                      </div>
                    )}

                    {/* Rwandan Payment Mode Integration */}
                    <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-400 block">Payment Mode & Status</span>
                        <span className="font-bold text-slate-800">MTN MoMo / Airtel / BK</span>
                      </div>
                      <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs uppercase"
                      >
                        {selectedTask.paymentStatus === 'paid' ? '✓ Paid' : 'Pay / Collect'}
                      </button>
                    </div>

                    <button onClick={() => setSelectedTask(null)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">
                      ← Back to Task List
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-500 mb-3">No active task selected in tracker.</p>
                    <button onClick={() => setActiveTab('jobs')} className="px-4 py-2 bg-[#3B6E5B] text-white rounded-xl text-xs font-bold">Browse Tasks</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="p-4 space-y-4">
                <h3 className="font-bold text-lg text-slate-900">Ratings & Reviews</h3>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-2">
                  <div className="text-3xl font-extrabold text-[#234E40]">{graduateProfile.rating}</div>
                  <p className="text-xs text-slate-500">Based on {graduateProfile.reviewsCount} completed assignments</p>
                  <div className="flex justify-center space-x-1 text-amber-400 text-sm">★★★★★</div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Cheetah Safaris</span>
                      <span className="text-amber-500">★★★★★</span>
                    </div>
                    <p className="text-slate-600">"Exceptional knowledge of Rwandan tourist sites and GDS ticketing proficiency."</p>
                    <span className="text-[10px] text-slate-400 block pt-1">Nov 2026</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="p-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-[#3B6E5B] text-white rounded-full flex items-center justify-center font-bold text-xl">
                      RB
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{graduateProfile.name}</h3>
                      <p className="text-xs text-slate-500">{graduateProfile.title}</p>
                      <p className="text-xs font-semibold text-[#234E40] mt-1">★ {graduateProfile.rating} ({graduateProfile.reviewsCount} reviews)</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Technical Skills & GDS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {graduateProfile.skills.map(s => (
                        <span key={s} className="bg-emerald-50 text-[#234E40] px-3 py-1 rounded-full text-xs font-semibold">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TRAVEL AGENCY VIEWS ================= */}
        {currentRole === 'agency' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Agency Dashboard</h3>
              <button onClick={() => setShowPostModal(true)} className="bg-[#3B6E5B] text-white text-xs font-bold px-3 py-2 rounded-xl shadow">
                + Post New Task
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-lg font-bold text-[#234E40]">{tasks.length}</span>
                <span className="text-[10px] text-slate-400 block">Active Tasks</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-lg font-bold text-[#234E40]">8</span>
                <span className="text-[10px] text-slate-400 block">Applicants</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-lg font-bold text-[#234E40]">4</span>
                <span className="text-[10px] text-slate-400 block">Confirmed</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Posted Guiding Assignments</p>
              {tasks.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 text-sm">{t.title}</h4>
                    <span className="font-bold text-[#234E40] text-xs">{t.pay}</span>
                  </div>
                  <p className="text-xs text-slate-500">{t.date}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                    <span className="text-amber-700 font-semibold capitalize">Status: {t.status.replace('_', ' ')}</span>
                    {t.status === 'applied' && (
                      <button onClick={() => { updateBookingStatus(t.id, 'offer_sent'); alert('Offer dispatched!'); }} className="bg-[#3B6E5B] text-white px-3 py-1.5 rounded-lg font-bold text-xs">
                        Send Offer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TRAVELER VIEWS ================= */}
        {currentRole === 'traveler' && (
          <div className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Book a Verified Guide</h3>
            <p className="text-xs text-slate-500">Hire certified tourism graduates for your trip in Rwanda.</p>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#3B6E5B] text-white rounded-full flex items-center justify-center font-bold">RB</div>
                <div>
                  <h4 className="font-bold text-slate-900">{graduateProfile.name}</h4>
                  <p className="text-xs text-slate-500">★ {graduateProfile.rating} ({graduateProfile.reviewsCount} reviews) • Kigali</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">Specializes in cultural heritage tours, wildlife excursions, and professional trip consulting.</p>
              <button onClick={() => setShowPaymentModal(true)} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs shadow">
                Book & Pay (RWF 35,000)
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Rwandan Payment Modal */}
      {showPaymentModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Rwandan Payment Gateway</h3>
            <p className="text-xs text-slate-500">Select preferred payment method for booking settlement:</p>
            
            <div className="space-y-2">
              <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer ${selectedPaymentMode === 'mtn' ? 'border-[#3B6E5B] bg-emerald-50' : 'border-slate-200'}`}>
                <div className="flex items-center space-x-2">
                  <input type="radio" name="paymode" checked={selectedPaymentMode === 'mtn'} onChange={() => setSelectedPaymentMode('mtn')} />
                  <span className="text-xs font-bold text-slate-800">MTN Mobile Money (MoMo)</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">Instant</span>
              </label>

              <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer ${selectedPaymentMode === 'airtel' ? 'border-[#3B6E5B] bg-emerald-50' : 'border-slate-200'}`}>
                <div className="flex items-center space-x-2">
                  <input type="radio" name="paymode" checked={selectedPaymentMode === 'airtel'} onChange={() => setSelectedPaymentMode('airtel')} />
                  <span className="text-xs font-bold text-slate-800">Airtel Money</span>
                </div>
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">Fast</span>
              </label>

              <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer ${selectedPaymentMode === 'bank' ? 'border-[#3B6E5B] bg-emerald-50' : 'border-slate-200'}`}>
                <div className="flex items-center space-x-2">
                  <input type="radio" name="paymode" checked={selectedPaymentMode === 'bank'} onChange={() => setSelectedPaymentMode('bank')} />
                  <span className="text-xs font-bold text-slate-800">Bank Transfer (BK / I&M)</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Secure</span>
              </label>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500">Phone / Account Number</label>
              <input type="text" placeholder="+250 78... / Account" defaultValue="+250 78" className="w-full mt-1 p-2.5 border rounded-xl text-xs" />
            </div>

            <button onClick={() => { setShowPaymentModal(false); alert('Payment processed successfully via Rwandan gateway!'); }} className="w-full py-3 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs shadow">
              Confirm & Authorize Payment
            </button>
            <button onClick={() => setShowPaymentModal(false)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Post Task Modal */}
      {showPostModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3 shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Post a New Task</h3>
            <input type="text" placeholder="Task Title (e.g. Akagera Safari Guide)" className="w-full p-2.5 border rounded-xl text-xs" />
            <input type="text" placeholder="Pay (e.g. RWF 40,000)" className="w-full p-2.5 border rounded-xl text-xs" />
            <input type="text" placeholder="Date & Time" className="w-full p-2.5 border rounded-xl text-xs" />
            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowPostModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={() => { setShowPostModal(false); alert('Task posted successfully!'); }} className="flex-1 py-2 bg-[#3B6E5B] text-white rounded-xl text-xs font-bold">Post Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Task Review Modal */}
      {showReviewModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900 text-center">Task Completed! 🎉</h3>
            <p className="text-xs text-slate-500 text-center">Leave feedback and rating for the completed assignment.</p>
            <div className="flex justify-center space-x-2 text-2xl text-amber-400">★ ★ ★ ★ ★</div>
            <textarea placeholder="Write a review..." className="w-full p-2.5 border rounded-xl text-xs h-20"></textarea>
            <button onClick={() => setShowReviewModal(false)} className="w-full py-2.5 bg-[#3B6E5B] text-white rounded-xl font-bold text-xs shadow">Submit Review</button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      {currentRole === 'graduate' && (
        <div className="bg-white border-t border-slate-200 py-2.5 px-6 flex justify-between items-center text-xs font-semibold text-slate-500 absolute bottom-0 w-full max-w-md z-20">
          <button onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center ${activeTab === 'jobs' ? 'text-[#3B6E5B]' : ''}`}><span>📋</span><span>Jobs</span></button>
          <button onClick={() => setActiveTab('bookings')} className={`flex flex-col items-center ${activeTab === 'bookings' ? 'text-[#3B6E5B]' : ''}`}><span>📅</span><span>Bookings</span></button>
          <button onClick={() => setActiveTab('reviews')} className={`flex flex-col items-center ${activeTab === 'reviews' ? 'text-[#3B6E5B]' : ''}`}><span>⭐</span><span>Reviews</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-[#3B6E5B]' : ''}`}><span>👤</span><span>Profile</span></button>
        </div>
      )}
    </div>
  );
}