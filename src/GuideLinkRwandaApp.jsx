import React, { useState } from 'react';

export default function GuideLinkRwandaApp() {
  const [activeTab, setActiveTab] = useState('profile');
  const [ownerData, setOwnerData] = useState({
    name: 'RUTUNGURA Bonheur',
    title: 'C.E.O, Founder & Platform Administrator • GuideLink Rwanda',
    phone: '+250780558555',
    bio: 'Tourism Management Specialist & Creator of GuideLink Rwanda.',
    momoCode: '612771',
    isUnlocked: true
  });
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage('Owner profile and iconic permissions successfully updated!');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f1', fontFamily: 'Inter, sans-serif', padding: '20px' }}>
      {/* Top Navigation / Status Header */}
      <div style={{ maxWidth: '600px', margin: '0 auto 20px auto', background: '#1b4332', color: '#fff', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>{ownerData.name}</h2>
          <span style={{ fontSize: '13px', color: '#95d5b2' }}>MoMo Code: {ownerData.momoCode} (Master Access)</span>
        </div>
        <button 
          onClick={() => alert('Session secured.')}
          style={{ backgroundColor: '#2d6a4f', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Log Out
        </button>
      </div>

      {/* Admin Module Tabs */}
      <div style={{ maxWidth: '600px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-around', background: '#fff', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button 
          onClick={() => setActiveTab('signups')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'signups' ? 'bold' : 'normal', color: activeTab === 'signups' ? '#1b4332' : '#666' }}
        >
          ⏳ Sign-Ups
        </button>
        <button 
          onClick={() => setActiveTab('revenue')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'revenue' ? 'bold' : 'normal', color: activeTab === 'revenue' ? '#1b4332' : '#666' }}
        >
          📊 Revenue
        </button>
        <button 
          onClick={() => setActiveTab('vip')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'vip' ? 'bold' : 'normal', color: activeTab === 'vip' ? '#1b4332' : '#666' }}
        >
          ⭐ VIP
        </button>
        <button 
          onClick={() => setActiveTab('roles')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'roles' ? 'bold' : 'normal', color: activeTab === 'roles' ? '#1b4332' : '#666' }}
        >
          🎛️ Roles
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'profile' ? 'bold' : 'normal', color: activeTab === 'profile' ? '#1b4332' : '#666' }}
        >
          👑 My Profile
        </button>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        
        {activeTab === 'profile' && (
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1b4332', marginTop: 0 }}>
              👑 Owner Profile & Photo (Iconic Mode Active)
            </h3>

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#1b4332', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '28px', border: '3px solid #52b788' }}>
                RB
              </div>
              <button style={{ backgroundColor: '#e9f5ed', color: '#2d6a4f', border: '1px solid #b7e4c7', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                📷 Upload Owner Photo
              </button>
            </div>

            {savedMessage && (
              <div style={{ padding: '10px', backgroundColor: '#d8f3dc', color: '#081c15', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '14px' }}>
                {savedMessage}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                value={ownerData.name} 
                onChange={(e) => setOwnerData({...ownerData, name: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
                placeholder="Full Name"
              />
              <input 
                type="text" 
                value={ownerData.title} 
                onChange={(e) => setOwnerData({...ownerData, title: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
                placeholder="Title & Affiliation"
              />
              <input 
                type="text" 
                value={ownerData.phone} 
                onChange={(e) => setOwnerData({...ownerData, phone: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
                placeholder="Phone Number"
              />
              <textarea 
                rows="4" 
                value={ownerData.bio} 
                onChange={(e) => setOwnerData({...ownerData, bio: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px', fontFamily: 'inherit' }}
                placeholder="Biography"
              />
              <button 
                type="submit" 
                style={{ backgroundColor: '#2d6a4f', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                💾 Save Owner Profile
              </button>
            </form>
          </div>
        )}

        {activeTab !== 'profile' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#4f772d' }}>
            <h3>Module: {activeTab.toUpperCase()}</h3>
            <p>Iconic administrator privileges fully unlocked for this section.</p>
          </div>
        )}

      </div>
    </div>
  );
}
