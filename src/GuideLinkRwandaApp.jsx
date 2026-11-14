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
