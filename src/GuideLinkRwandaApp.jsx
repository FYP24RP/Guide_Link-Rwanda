import React, { useState } from 'react';

export default function GuideLinkRwandaApp() {
  const [activeTab, setActiveTab] = useState('vip');
  const [ownerData, setOwnerData] = useState({
    name: 'RUTUNGURA Bonheur',
    title: 'C.E.O, Founder & Platform Administrator • GuideLink Rwanda',
    phone: '+250780558555',
    bio: 'Tourism Management Specialist & Creator of GuideLink Rwanda.',
    momoCode: '612771',
    isUnlocked: true
  });
  
  // VIP Access Management state (3 distinct access tiers)
  const [vipUsers, setVipUsers] = useState([
    { id: 1, name: 'Jean Bosco', tier: 'Tier 1 - Gold Access', status: 'Active' },
    { id: 2, name: 'Alice Uwase', tier: 'Tier 2 - Silver Access', status: 'Active' },
    { id: 3, name: 'David Mugisha', tier: 'Tier 3 - Platinum Access', status: 'Pending' }
  ]);
  
  const [selectedTier, setSelectedTier] = useState('Tier 1 - Gold Access');
  const [newVipName, setNewVipName] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const handleAddVip = (e) => {
    e.preventDefault();
    if (!newVipName) return;
    const newEntry = {
      id: vipUsers.length + 1,
      name: newVipName,
      tier: selectedTier,
      status: 'Active'
    };
    setVipUsers([...vipUsers, newEntry]);
    setNewVipName('');
    setSavedMessage('VIP user successfully granted access!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleSaveProfile = (e) => {
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
        
        {/* VIP MODULE WITH 3 ACCESS TIERS */}
        {activeTab === 'vip' && (
          <div>
            <h3 style={{ color: '#1b4332', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⭐ VIP Access Management (3 Tiers Control)
            </h3>
            <p style={{ fontSize: '14px', color: '#555' }}>
              Assign and manage permissions across the 3 VIP access levels for GuideLink Rwanda users.
            </p>

            {savedMessage && (
              <div style={{ padding: '10px', backgroundColor: '#d8f3dc', color: '#081c15', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '14px' }}>
                {savedMessage}
              </div>
            )}

            <form onSubmit={handleAddVip} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '15px', backgroundColor: '#f9fbf9', borderRadius: '10px', border: '1px solid #d8f3dc' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#2d6a4f', fontSize: '14px' }}>Grant Access to New User</h4>
              <input 
                type="text" 
                placeholder="User Full Name" 
                value={newVipName}
                onChange={(e) => setNewVipName(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <select 
                value={selectedTier} 
                onChange={(e) => setSelectedTier(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}
              >
                <option value="Tier 1 - Gold Access">Tier 1 - Gold Access</option>
                <option value="Tier 2 - Silver Access">Tier 2 - Silver Access</option>
                <option value="Tier 3 - Platinum Access">Tier 3 - Platinum Access</option>
              </select>
              <button 
                type="submit" 
                style={{ backgroundColor: '#2d6a4f', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Grant VIP Access
              </button>
            </form>

            <h4 style={{ color: '#1b4332', marginBottom: '10px' }}>Current VIP Tier Assignments</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {vipUsers.map((user) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f4f9f5', borderRadius: '8px', border: '1px solid #e2ece3' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#1b4332' }}>{user.name}</strong>
                    <span style={{ fontSize: '12px', color: '#52b788', fontWeight: '500' }}>{user.tier}</span>
                  </div>
                  <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#d8f3dc', color: '#1b4332', borderRadius: '4px', fontWeight: 'bold' }}>
                    {user.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE MODULE */}
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

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                value={ownerData.name} 
                onChange={(e) => setOwnerData({...ownerData, name: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
              />
              <input 
                type="text" 
                value={ownerData.title} 
                onChange={(e) => setOwnerData({...ownerData, title: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
              />
              <input 
                type="text" 
                value={ownerData.phone} 
                onChange={(e) => setOwnerData({...ownerData, phone: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
              />
              <textarea 
                rows="4" 
                value={ownerData.bio} 
                onChange={(e) => setOwnerData({...ownerData, bio: e.target.value})}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px', fontFamily: 'inherit' }}
              />
              <button 
                type="submit" 
                style={{ backgroundColor: '#2d6a4f', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                💾 Save Owner Profile
              </button>
            </form>
          </div>
        )}

        {/* OTHER MODULES */}
        {activeTab !== 'vip' && activeTab !== 'profile' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#4f772d' }}>
            <h3>Module: {activeTab.toUpperCase()}</h3>
            <p>Iconic administrator privileges fully unlocked for this section.</p>
          </div>
        )}

      </div>
    </div>
  );
}
