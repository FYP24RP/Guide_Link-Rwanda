/**
 * GuideLink Rwanda - Full Vanilla JavaScript Application
 * Built from GuideLinkRwandaApp.jsx with:
 * - Firestore REST sync (guidelink-rwanda)
 * - Subscription tiers, USSD MoMo (*182*8*1*...) & email alerts
 * - C.E.O Owner HQ, No-Code App Server, Custom Dashboards & User Management
 * - Role Dashboards (Traveler, Graduate, Agency, Tour Company, Car Rental)
 * - Confidential 1-on-1 Chat, Language Switcher (EN / RW / FR), & 3-Min Popup Ads
 */

const FIREBASE_PROJECT_ID = "guidelink-rwanda";
const FIREBASE_API_KEY = "AIzaSyDbSIDCFXNgPKifhV126frr-bl0tytXEA";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    Object.keys(val).forEach((k) => {
      fields[k] = toFirestoreValue(val[k]);
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
};

const fromFirestoreValue = (obj) => {
  if (!obj) return null;
  if ("stringValue" in obj) return obj.stringValue;
  if ("integerValue" in obj) return Number(obj.integerValue);
  if ("doubleValue" in obj) return Number(obj.doubleValue);
  if ("booleanValue" in obj) return obj.booleanValue;
  if ("nullValue" in obj) return null;
  if ("arrayValue" in obj) {
    return (obj.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ("mapValue" in obj) {
    const res = {};
    const fields = obj.mapValue.fields || {};
    Object.keys(fields).forEach((k) => {
      res[k] = fromFirestoreValue(fields[k]);
    });
    return res;
  }
  return null;
};

const parseFirestoreDoc = (doc) => {
  const parts = doc.name.split("/");
  const id = parts[parts.length - 1];
  const data = {};
  if (doc.fields) {
    Object.keys(doc.fields).forEach((k) => {
      data[k] = fromFirestoreValue(doc.fields[k]);
    });
  }
  return { id, ...data };
};

const firestoreGetCollection = async (collectionName) => {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/${collectionName}?key=${FIREBASE_API_KEY}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map(parseFirestoreDoc);
  } catch (e) {
    return [];
  }
};

const firestoreSaveDoc = async (collectionName, docId, dataObj) => {
  try {
    const fields = {};
    Object.keys(dataObj).forEach((k) => {
      fields[k] = toFirestoreValue(dataObj[k]);
    });
    const maskParams = Object.keys(dataObj)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const url = `${FIRESTORE_BASE}/${collectionName}/${encodeURIComponent(docId)}?${maskParams}&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

const firestoreDeleteDoc = async (collectionName, docId) => {
  try {
    const url = `${FIRESTORE_BASE}/${collectionName}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { method: "DELETE" });
    return res.ok;
  } catch (e) {
    return false;
  }
};

const DEFAULT_SUBSCRIPTION_PLANS = [
  { id: "monthly", name: "Starter Monthly", badge: "Monthly", durationLabel: "1 Month (30 Days)", days: 30, price: 15000, order: 1 },
  { id: "three_months", name: "Growth 3-Month", badge: "3 Months", durationLabel: "3 Months (90 Days)", days: 90, price: 20000, order: 2 },
  { id: "quarter_6m", name: "Quarter Subscription (6 Months)", badge: "Quarter • 6 Months", durationLabel: "6 Months (180 Days)", days: 180, price: 60000, order: 3 },
  { id: "gold_platinum_year", name: "GOLD-PLATINUM", badge: "GOLD-PLATINUM • 1 Year", durationLabel: "1 Year (365 Days)", days: 365, price: 100000, order: 4 }
];

const DEFAULT_APP_SERVER_CONFIG = {
  appName: "GuideLink Rwanda",
  tagline: "Turn your tourism degree into paid work.",
  subtitle: "Connecting Tourism Graduates, Travel Agencies, Tour Companies, Car Rentals, and Travelers across Rwanda.",
  footerLocation: "Kigali, Rwanda",
  momoCode: "612771",
  commissionRatePercent: 10,
  primaryColor: "#234E40",
  secondaryColor: "#3B6E5B",
  travelerFreeBadge: "Travelers: FREE",
  allowNewSignups: true,
  maintenanceMode: false,
  maintenanceMessage: "Platform maintenance in progress. Please check back shortly.",
  welcomeBannerText: "",
  destinations: [
    "Volcanoes National Park / Musanze",
    "Nyungwe Forest & Lake Kivu (Rusizi / Karongi)",
    "Akagera National Park Safari",
    "Kigali City & Cultural Heritage Tour"
  ],
  announcements: [],
  customFields: [],
  customSections: [],
  customDashboards: [],
  customFeatures: []
};

class GuideLinkRwandaJSApp {
  constructor(rootId = "app") {
    this.root = document.getElementById(rootId) || document.body;

    // Navigation & UI State
    this.currentRole = "welcome";
    this.ownerTab = "pending";
    this.serverSubTab = "branding";
    this.activeTab = "jobs";
    this.activeCustomDashId = "";
    this.showOwnerPinModal = false;
    this.ownerPinInput = "";
    this.isSaving = false;

    // Language State (EN / RW / FR)
    this.currentLanguage = localStorage.getItem("guidelink_lang") || "en";
    this.translations = {
      en: {
        signIn: "Sign In (Registered Members) →",
        createAccount: "Create Account (New Sign Up)",
        ceoLogin: "C.E.O Login",
        signOut: "Sign Out",
        home: "← Home",
        closeAd: "Close Ad",
        languageSwitched: "Language switched to English."
      },
      rw: {
        signIn: "Injira (Abanyamuryango Banditswe) →",
        createAccount: "Fungura Konti (Kwiyandikisha)",
        ceoLogin: "Kwinjira kwa C.E.O",
        signOut: "Sohoka",
        home: "← Ahabanza",
        closeAd: "Funga Itangazo",
        languageSwitched: "Ururimi rwahinduwe rwashyirwa mu Kinyarwanda."
      },
      fr: {
        signIn: "Connexion (Membres Inscrits) →",
        createAccount: "Créer un Compte (Nouvelle Inscription)",
        ceoLogin: "Connexion C.E.O",
        signOut: "Déconnexion",
        home: "← Accueil",
        closeAd: "Fermer la pub",
        languageSwitched: "La langue a été changée en français."
      }
    };

    // 3-Minute Popup Ads State (180,000 ms)
    this.adDelayMs = 3 * 60 * 1000;
    this.adTimer = null;
    this.currentAdIndex = 0;
    this.popupAds = [
      {
        badge: "CAR RENTALS RWANDA",
        title: "Rent Verified 4x4 SUVs, RAV4s & Safari Vehicles",
        description: "Compare car rental companies across Kigali, Musanze, and Rubavu with transparent daily rates.",
        ctaText: "Register Car Rental →",
        action: "car_rental"
      },
      {
        badge: "TOURISM CAREERS",
        title: "Connect with Certified Tourism Graduates & Guides",
        description: "Hire trained Rwandan guides and travel consultants for cultural tours and national park safaris.",
        ctaText: "Explore Directory →",
        action: "search"
      },
      {
        badge: "INSTANT USSD PAYMENT",
        title: "Pay Subscriptions & Deals via MTN MoMo",
        description: "Fast mobile money checkout across Rwanda with instant C.E.O verification.",
        ctaText: "Sign Up / Pay →",
        action: "signup"
      }
    ];

    // App Server, Plans & Users State
    this.appConfig = { ...DEFAULT_APP_SERVER_CONFIG };
    this.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
    this.registeredUsers = [];
    this.userProfiles = {};
    this.activeUser = null;
    this.selectedManagedUserId = "";
    this.ownerUserEditForm = null;

    this.ownerProfile = {
      name: "RUTUNGURA Bonheur",
      title: "C.E.O, Founder & Platform Administrator • GuideLink Rwanda",
      contact: "+250780558555",
      email: "rutungurab5@gmail.com",
      bio: "C.E.O & Tourism Management Specialist • Creator of GuideLink Rwanda.",
      photo: ""
    };

    this.exemptAccounts = [
      { id: "vip1", name: "VIP Partner Tier 1 (Platinum)", contact: "+250781111111", role: "graduate", tier: "Tier 1 - Platinum Partner", confirmed: false },
      { id: "vip2", name: "VIP Partner Tier 2 (Gold)", contact: "+250782222222", role: "agency", tier: "Tier 2 - Gold Partner", confirmed: false },
      { id: "vip3", name: "VIP Partner Tier 3 (Silver)", contact: "+250783333333", role: "tour_company", tier: "Tier 3 - Silver Partner", confirmed: false }
    ];

    // Forms & Interactive State
    this.signInContact = "";
    this.signInPassword = "";
    this.regStep = "details";
    this.regForm = {
      name: "",
      contact: "",
      password: "",
      confirmPassword: "",
      role: "traveler",
      subscriptionPlanId: "monthly",
      momoRef: ""
    };
    this.ussdTriggered = false;
    this.isSubmittingPayment = false;
    this.emailNotificationSent = false;

    this.expiredUserAccount = null;
    this.renewalPlanId = "monthly";
    this.renewalMomoRef = "";
    this.renewalSubmitted = false;

    this.searchQuery = "";
    this.searchRoleFilter = "all";
    this.directoryFilter = "all";
    this.bookingTarget = null;
    this.bookingDetails = { dates: "", guests: "2", notes: "" };

    this.chatMessages = [];
    this.chatInput = "";
    this.activeChatPeer = { id: "", name: "", role: "" };

    this.newTaskForm = { title: "", date: "", rawPay: "", location: "Kigali", category: "Guiding Job" };
    this.tripRequestForm = {
      preferredCategory: "graduate",
      destination: "Volcanoes National Park / Musanze",
      dates: "",
      guests: "2",
      notes: ""
    };
    this.tripRequests = [];
    this.tasks = [
      { id: "default-1", title: "Half-day Kigali city tour & cultural heritage", agency: "Cheetah Safaris / Partner Agency", location: "Kigali", rawPay: 35000, pay: "RWF 35,000", date: "Sat 21 Nov, 09:00 to 13:00", status: "open", assignedTo: null, paymentStatus: "pending", category: "Guiding Job" },
      { id: "default-2", title: "Nyungwe Canopy Walk & Tea Plantation Escort", agency: "Rwanda Eco Tours", location: "Nyungwe / Rusizi", rawPay: 65000, pay: "RWF 65,000", date: "Mon 23 Nov, Full Day", status: "open", assignedTo: null, paymentStatus: "pending", category: "Consultant Job" }
    ];

    // Builder sub-forms
    this.newDashboardForm = { name: "", icon: "🚗", badge: "Car Rental Hub", description: "", actionTitle: "Add Vehicle Listing", showOnWelcome: true };
    this.newFeatureForm = { title: "", icon: "✨", featureType: "action_form", targetRole: "all", description: "", buttonLabel: "Submit Request", linkUrl: "", unitPriceRwf: 50000, checklistItemsText: "" };
    this.newAnnouncementForm = { title: "", body: "", targetRole: "all" };
    this.newDestinationInput = "";
  }

  t(key) {
    return (this.translations[this.currentLanguage] && this.translations[this.currentLanguage][key]) || this.translations.en[key] || key;
  }

  setLanguage(langCode, showAlert = true) {
    if (!this.translations[langCode]) return;
    this.currentLanguage = langCode;
    localStorage.setItem("guidelink_lang", langCode);
    document.documentElement.lang = langCode;
    if (showAlert) alert(this.t("languageSwitched"));
    this.render();
  }

  startPopupAdTimer(delayMs = this.adDelayMs) {
    if (this.adTimer) clearTimeout(this.adTimer);
    this.adTimer = setTimeout(() => this.showPopupAd(), delayMs);
  }

  showPopupAd() {
    if (document.getElementById("guidelink-popup-ad")) return;
    const ad = this.popupAds[this.currentAdIndex % this.popupAds.length];
    this.currentAdIndex += 1;

    const overlay = document.createElement("div");
    overlay.id = "guidelink-popup-ad";
    overlay.className = "fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4";
    overlay.innerHTML = `
      <div class="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex justify-between items-center">
          <span class="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full">${ad.badge}</span>
          <button id="ad-close-x" type="button" class="text-slate-500 font-bold px-2">✕</button>
        </div>
        <h3 class="text-lg font-extrabold text-slate-900">${ad.title}</h3>
        <p class="text-xs text-slate-600 leading-relaxed">${ad.description}</p>
        <div class="flex space-x-2">
          <button id="ad-cta" type="button" style="background-color:${this.appConfig.primaryColor || "#234E40"}" class="flex-1 py-2.5 text-white rounded-xl text-xs font-bold">${ad.ctaText}</button>
          <button id="ad-dismiss" type="button" class="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold">${this.t("closeAd")}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      this.startPopupAdTimer(this.adDelayMs);
    };
    overlay.querySelector("#ad-close-x").onclick = close;
    overlay.querySelector("#ad-dismiss").onclick = close;
    overlay.querySelector("#ad-cta").onclick = () => {
      close();
      if (ad.action === "car_rental") {
        this.openCarRentalSignUp();
      } else if (ad.action === "search") {
        if (this.currentRole === "welcome") {
          this.currentRole = "traveler";
          this.activeUser = { name: "Guest Explorer", contact: "guest", role: "traveler" };
        }
        this.activeTab = "search";
        this.render();
      } else if (ad.action === "signup") {
        this.currentRole = "signup";
        this.regStep = "details";
        this.render();
      }
    };
  }

  openCarRentalSignUp() {
    this.regForm = {
      name: "",
      contact: "",
      password: "",
      confirmPassword: "",
      role: "car_rental",
      subscriptionPlanId: "monthly",
      momoRef: ""
    };
    this.regStep = "details";
    this.ussdTriggered = false;
    this.emailNotificationSent = false;
    this.currentRole = "signup";
    this.render();
  }

  normalizeContact(str) {
    return (str || "").replace(/\s+/g, "").toLowerCase();
  }

  getPlanById(planId) {
    return this.subscriptionPlans.find((p) => p.id === planId) || this.subscriptionPlans[0] || DEFAULT_SUBSCRIPTION_PLANS[0];
  }

  isUserSubscriptionExpired(user) {
    if (!user || user.role === "traveler" || user.role === "owner") return false;
    if (user.status === "expired") return true;
    if (user.subscriptionExpiresAt && Number(user.subscriptionExpiresAt) > 0) {
      return Date.now() > Number(user.subscriptionExpiresAt);
    }
    return false;
  }

  getRoleDisplayLabel(role) {
    if (role === "graduate") return "Tourism Graduate / Guide";
    if (role === "agency") return "Travel Agency";
    if (role === "tour_company") return "Tour Company";
    if (role === "car_rental") return "Car Rentals Company";
    if (role === "traveler") return "Traveler";
    const customDash = (this.appConfig.customDashboards || []).find((d) => d.id === role);
    return customDash ? customDash.name : role;
  }

  buildUssdDisplay(amount) {
    return `*182*8*1*${this.appConfig.momoCode || "612771"}*${amount}#`;
  }

  buildUssdDialUri(amount) {
    return `tel:*182*8*1*${this.appConfig.momoCode || "612771"}*${amount}%23`;
  }

  async loadFirebaseData() {
    const [profilesDocs, vipDocs, tasksDocs, tripsDocs, chatDocs, plansDocs, configDocs] = await Promise.all([
      firestoreGetCollection("profiles"),
      firestoreGetCollection("vipTiers"),
      firestoreGetCollection("tasks"),
      firestoreGetCollection("tripRequests"),
      firestoreGetCollection("chats"),
      firestoreGetCollection("subscriptionPlans"),
      firestoreGetCollection("appConfig")
    ]);

    if (configDocs.length > 0) {
      const mainCfg = configDocs.find((d) => d.id === "main") || configDocs[0];
      if (mainCfg) {
        this.appConfig = { ...this.appConfig, ...mainCfg };
      }
    }

    if (plansDocs.length > 0) {
      this.subscriptionPlans = DEFAULT_SUBSCRIPTION_PLANS.map((defPlan) => {
        const match = plansDocs.find((c) => c.id === defPlan.id);
        return match ? { ...defPlan, ...match, price: Number(match.price ?? defPlan.price), days: Number(match.days ?? defPlan.days) } : defPlan;
      }).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    if (profilesDocs.length > 0) {
      const users = [];
      const profs = {};
      profilesDocs.forEach((p) => {
        if (p.role === "owner") {
          this.ownerProfile = {
            name: p.name || this.ownerProfile.name,
            title: p.headline || this.ownerProfile.title,
            contact: p.contact || this.ownerProfile.contact,
            email: p.email || this.ownerProfile.email,
            bio: p.bio || this.ownerProfile.bio,
            photo: p.photo || ""
          };
        } else {
          const cleanKey = this.normalizeContact(p.contact || p.id);
          users.push({
            id: p.id,
            name: p.name,
            contact: p.contact,
            password: p.password,
            role: p.role,
            feePaid: p.feePaid ?? 0,
            momoRef: p.momoRef || "Cloud Reg",
            status: p.status || "approved",
            subscriptionPlanId: p.subscriptionPlanId || "monthly",
            subscriptionPlanName: p.subscriptionPlanName || "Starter Monthly",
            subscriptionExpiresAt: p.subscriptionExpiresAt || 0
          });
          profs[cleanKey] = {
            name: p.name,
            contact: p.contact,
            role: p.role,
            photo: p.photo || "",
            isAvailable: p.isAvailable !== false,
            headline: p.headline || "",
            location: p.location || "Kigali, Rwanda",
            rateInfo: p.rateInfo || "",
            bio: p.bio || "",
            degrees: p.degrees || [],
            servicesOffered: p.servicesOffered || [],
            experiences: p.experiences || [],
            skills: p.skills || ["English", "Kinyarwanda"]
          };
        }
      });
      this.registeredUsers = users;
      this.userProfiles = profs;
    }

    if (vipDocs.length > 0) this.exemptAccounts = [...vipDocs].sort((a, b) => a.id.localeCompare(b.id));
    if (tasksDocs.length > 0) this.tasks = [...tasksDocs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (tripsDocs.length > 0) this.tripRequests = [...tripsDocs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (chatDocs.length > 0) this.chatMessages = [...chatDocs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    this.render();
  }

  async init() {
    this.setLanguage(this.currentLanguage, false);
    this.startPopupAdTimer(this.adDelayMs);
    await this.loadFirebaseData();
    setInterval(() => this.loadFirebaseData(), 6000);
  }

  resetToWelcome() {
    this.currentRole = "welcome";
    this.activeTab = "jobs";
    this.activeCustomDashId = "";
    this.regStep = "details";
    this.ussdTriggered = false;
    this.emailNotificationSent = false;
    this.expiredUserAccount = null;
    this.renewalSubmitted = false;
    this.activeUser = null;
    this.activeChatPeer = { id: "", name: "", role: "" };
    this.signInContact = "";
    this.signInPassword = "";
    this.render();
  }

  checkExemptUser(contactInput) {
    const cleanInput = this.normalizeContact(contactInput);
    if (
      cleanInput === this.normalizeContact(this.ownerProfile.contact) ||
      this.normalizeContact(this.ownerProfile.email) === cleanInput
    ) {
      return { id: "owner", name: this.ownerProfile.name, contact: this.ownerProfile.contact, role: "owner", confirmed: true };
    }
    return this.exemptAccounts.find(
      (acc) => acc.confirmed && this.normalizeContact(acc.contact) === cleanInput
    );
  }

  async handleSignIn() {
    const cleanInput = this.normalizeContact(this.signInContact);
    if (!cleanInput || !this.signInPassword) {
      alert("Please enter your Phone/Email and Password.");
      return;
    }

    const exemptMatch = this.checkExemptUser(this.signInContact);
    if (exemptMatch) {
      if (exemptMatch.id === "owner") {
        if (this.signInPassword === "FYP$2026") {
          this.ownerTab = "pending";
          this.currentRole = "owner";
          this.signInContact = "";
          this.signInPassword = "";
          this.render();
          return;
        }
        this.showOwnerPinModal = true;
        this.render();
        return;
      }
      if (this.appConfig.maintenanceMode) {
        alert(`⚠️ ${this.appConfig.maintenanceMessage}`);
        return;
      }
      this.activeUser = { name: exemptMatch.name, contact: exemptMatch.contact, role: exemptMatch.role, isVip: true };
      this.currentRole = exemptMatch.role;
      this.activeTab = "jobs";
      this.render();
      return;
    }

    if (this.appConfig.maintenanceMode) {
      alert(`⚠️ ${this.appConfig.maintenanceMessage}`);
      return;
    }

    const existingUser = this.registeredUsers.find((u) => this.normalizeContact(u.contact) === cleanInput);
    if (!existingUser) {
      alert('Account not found. Please click "Create Account (New Sign Up)".');
      return;
    }
    if (existingUser.password && existingUser.password !== this.signInPassword) {
      alert("Access Denied: Incorrect password.");
      return;
    }
    if (this.isUserSubscriptionExpired(existingUser)) {
      this.expiredUserAccount = existingUser;
      this.renewalPlanId = existingUser.subscriptionPlanId || "monthly";
      this.renewalMomoRef = "";
      this.renewalSubmitted = false;
      this.ussdTriggered = false;
      this.currentRole = "renew_sub";
      this.render();
      return;
    }
    if (existingUser.status !== "approved") {
      alert("Access Denied: Your account access is revoked or awaiting C.E.O payment confirmation.");
      return;
    }

    this.activeUser = existingUser;
    this.currentRole = existingUser.role;
    this.activeTab = "jobs";
    this.render();
  }

  async handleSignUpDetails() {
    if (!this.appConfig.allowNewSignups) {
      alert("New registrations are temporarily paused by the Administrator.");
      return;
    }
    if (!this.regForm.name.trim() || !this.regForm.contact.trim() || !this.regForm.password.trim()) {
      alert("Please fill in your Name, Contact, and create a Password.");
      return;
    }
    if (this.regForm.password.length < 4) {
      alert("Password must be at least 4 characters long.");
      return;
    }
    if (this.regForm.password !== this.regForm.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const cleanInput = this.normalizeContact(this.regForm.contact);
    if (this.registeredUsers.some((u) => this.normalizeContact(u.contact) === cleanInput) || this.checkExemptUser(this.regForm.contact)) {
      alert('This contact is already registered! Please use "Sign In".');
      this.signInContact = this.regForm.contact;
      this.signInPassword = "";
      this.currentRole = "signin";
      this.render();
      return;
    }

    if (this.regForm.role === "traveler") {
      const freeTraveler = {
        id: cleanInput,
        name: this.regForm.name.trim(),
        contact: this.regForm.contact.trim(),
        password: this.regForm.password,
        role: "traveler",
        feePaid: 0,
        status: "approved",
        subscriptionPlanId: "free_traveler",
        subscriptionPlanName: "Free Traveler Access",
        subscriptionExpiresAt: 0
      };
      this.registeredUsers = [freeTraveler, ...this.registeredUsers];
      this.activeUser = freeTraveler;
      this.currentRole = "traveler";
      this.activeTab = "jobs";
      await firestoreSaveDoc("profiles", cleanInput, { ...freeTraveler, isAvailable: true });
      this.render();
      return;
    }

    this.ussdTriggered = false;
    this.regStep = "pay_subscription";
    this.render();
  }

  async sendRealTimeOwnerEmailNotification(registrantData, isRenewal = false) {
    const targetOwnerEmail = this.ownerProfile.email || "rutungurab5@gmail.com";
    const ussdUsed = this.buildUssdDisplay(registrantData.feePaid);
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetOwnerEmail)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `${this.appConfig.appName}: ${isRenewal ? "Subscription Renewal" : "New Partner Subscription"} (${registrantData.name})`,
          Platform: this.appConfig.appName,
          Member_Name: registrantData.name,
          Account_Role: this.getRoleDisplayLabel(registrantData.role),
          Member_Contact: registrantData.contact,
          Subscription_Plan: registrantData.subscriptionPlanName,
          Amount_Paid: `${Number(registrantData.feePaid).toLocaleString()} RWF`,
          USSD_Dialed: ussdUsed,
          MoMo_Transaction_Ref: registrantData.momoRef
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async handleCompleteSubscriptionPayment() {
    const selectedPlan = this.getPlanById(this.regForm.subscriptionPlanId);
    const ussdCode = this.buildUssdDisplay(selectedPlan.price);
    if (!this.regForm.momoRef.trim()) {
      alert(`Please enter your MoMo Transaction Reference / ID after dialing ${ussdCode}.`);
      return;
    }

    this.isSubmittingPayment = true;
    this.render();

    const cleanInput = this.normalizeContact(this.regForm.contact);
    const newRegistrant = {
      id: cleanInput,
      name: this.regForm.name.trim(),
      contact: this.regForm.contact.trim(),
      password: this.regForm.password,
      role: this.regForm.role,
      feePaid: selectedPlan.price,
      subscriptionPlanId: selectedPlan.id,
      subscriptionPlanName: selectedPlan.name,
      subscriptionExpiresAt: Date.now() + selectedPlan.days * 24 * 60 * 60 * 1000,
      momoCodeUsed: ussdCode,
      momoRef: this.regForm.momoRef.trim(),
      status: "pending_approval"
    };

    this.registeredUsers = [newRegistrant, ...this.registeredUsers];
    await firestoreSaveDoc("profiles", cleanInput, { ...newRegistrant, isAvailable: true });
    this.emailNotificationSent = await this.sendRealTimeOwnerEmailNotification(newRegistrant, false);
    this.isSubmittingPayment = false;
    this.regStep = "pending_approval";
    this.render();
  }

  buildLiveProviderDirectory() {
    const base = [
      {
        id: "prov-g1",
        contactId: "prov-g1",
        type: "graduate",
        categoryLabel: "Tourism Graduate & Guide",
        name: "Jean Bosco Habimana",
        headline: "Certified Multilingual Safari & Cultural Guide",
        location: "Kigali & Volcanoes NP",
        rate: "RWF 40,000 / day",
        services: ["Gorilla Trekking Escort", "Kigali Cultural Walks"],
        isAvailable: true
      },
      {
        id: "prov-cr1",
        contactId: "prov-cr1",
        type: "car_rental",
        categoryLabel: "Car Rentals Company",
        name: "Kigali 4x4 & Safari Car Rentals",
        headline: "Self-Drive & Chauffeur SUVs, RAV4s & Land Cruisers",
        location: "Kigali & Musanze",
        rate: "From RWF 55,000 / day",
        services: ["Toyota RAV4 4x4", "Land Cruiser Prado", "Airport Pickup"],
        isAvailable: true
      }
    ];

    const dynamic = [];
    this.registeredUsers.forEach((u) => {
      if (u.status === "approved" && !this.isUserSubscriptionExpired(u) && ["graduate", "agency", "tour_company", "car_rental"].includes(u.role)) {
        const key = this.normalizeContact(u.contact);
        const prof = this.userProfiles[key] || {};
        dynamic.push({
          id: `reg-${u.id}`,
          contactId: key,
          type: u.role,
          categoryLabel: `${this.getRoleDisplayLabel(u.role)} • ${u.subscriptionPlanName || "Verified"}`,
          name: prof.name || u.name,
          headline: prof.headline || `Verified ${this.getRoleDisplayLabel(u.role)}`,
          location: prof.location || "Rwanda",
          rate: prof.rateInfo || "Custom Rates",
          services: prof.servicesOffered || [],
          isAvailable: prof.isAvailable !== false,
          photo: prof.photo || ""
        });
      }
    });

    return [...dynamic, ...base];
  }

  render() {
    const primary = this.appConfig.primaryColor || "#234E40";
    const secondary = this.appConfig.secondaryColor || "#3B6E5B";

    const langSwitcherHtml = `
      <select id="lang-switcher" class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold cursor-pointer">
        <option value="en" ${this.currentLanguage === "en" ? "selected" : ""}>EN</option>
        <option value="rw" ${this.currentLanguage === "rw" ? "selected" : ""}>RW</option>
        <option value="fr" ${this.currentLanguage === "fr" ? "selected" : ""}>FR</option>
      </select>
    `;

    if (this.currentRole === "welcome") {
      this.root.innerHTML = `
        <div class="min-h-screen w-full bg-slate-50 flex flex-col justify-between">
          <div>
            <div class="bg-[#E2ECE9] w-full px-6 md:px-12 py-8 flex justify-between items-center">
              <span class="text-xs font-extrabold uppercase tracking-wider text-[#234E40]">${this.appConfig.appName}</span>
              <div class="flex items-center space-x-2">
                ${langSwitcherHtml}
                <button id="btn-car-rental-signup" type="button" style="background:${secondary}" class="px-3 py-1.5 text-white rounded-lg text-xs font-bold">+ Car Rental</button>
              </div>
            </div>
            <div class="w-full px-6 md:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-7 space-y-4">
                <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900">${this.appConfig.appName}</h1>
                <p class="text-xl font-semibold" style="color:${primary}">${this.appConfig.tagline}</p>
                <p class="text-sm text-slate-600 max-w-2xl">${this.appConfig.subtitle}</p>
                <p class="text-xs font-bold text-slate-400 uppercase">C.E.O: ${this.ownerProfile.name} (${this.ownerProfile.contact})</p>
              </div>
              <div class="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs font-bold uppercase" style="color:${primary}">Member Access</span>
                  <span class="text-xs font-bold bg-emerald-100 text-[#234E40] px-3 py-1 rounded-full">${this.appConfig.travelerFreeBadge}</span>
                </div>
                <button id="go-signin" type="button" style="background:${primary}" class="w-full py-3.5 text-white rounded-xl font-bold text-sm">${this.t("signIn")}</button>
                <button id="go-signup" type="button" class="w-full py-3.5 bg-emerald-50 text-[#234E40] border border-[#3B6E5B]/30 rounded-xl font-bold text-sm">${this.t("createAccount")}</button>
                <button id="go-ceo" type="button" class="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs">👑 ${this.t("ceoLogin")} (${this.ownerProfile.name})</button>
              </div>
            </div>
          </div>
          <footer class="w-full px-6 md:px-12 py-4 bg-white border-t text-xs text-slate-500 flex justify-between">
            <span>&copy; ${new Date().getFullYear()} <strong>${this.ownerProfile.name}</strong></span>
            <span>${this.appConfig.appName} • ${this.appConfig.footerLocation}</span>
          </footer>
          ${this.showOwnerPinModal ? `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div class="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3 shadow-xl">
                <h3 class="font-bold text-base text-center">C.E.O Authentication</h3>
                <input id="ceo-pin-input" type="password" placeholder="••••••••" class="w-full p-3 border rounded-xl text-center font-bold" />
                <div class="flex space-x-2">
                  <button id="ceo-pin-cancel" type="button" class="flex-1 py-2 bg-slate-100 rounded-xl text-xs font-semibold">Cancel</button>
                  <button id="ceo-pin-unlock" type="button" style="background:${primary}" class="flex-1 py-2 text-white rounded-xl text-xs font-bold">Unlock</button>
                </div>
              </div>
            </div>` : ""}
        </div>
      `;
      this.bindWelcomeEvents();
      return;
    }

    if (this.currentRole === "signin") {
      this.root.innerHTML = `
        <div class="min-h-screen w-full bg-slate-100 flex flex-col justify-between">
          <div class="w-full bg-white px-6 md:px-12 py-4 border-b flex justify-between items-center">
            <h2 class="font-bold text-base">${this.appConfig.appName} — Sign In</h2>
            <div class="flex items-center space-x-2">
              ${langSwitcherHtml}
              <button id="btn-home" type="button" class="text-xs bg-slate-100 px-4 py-2 rounded-full font-semibold">${this.t("home")}</button>
            </div>
          </div>
          <div class="p-6 flex justify-center">
            <div class="w-full max-w-md bg-white p-6 rounded-2xl border space-y-4 shadow-sm">
              <h3 class="text-lg font-bold">Sign In to Your Dashboard</h3>
              <input id="signin-contact" type="text" value="${this.signInContact}" placeholder="Phone or Email" class="w-full p-3 border rounded-xl text-sm" />
              <input id="signin-password" type="password" value="${this.signInPassword}" placeholder="Password" class="w-full p-3 border rounded-xl text-sm" />
              <button id="submit-signin" type="button" style="background:${primary}" class="w-full py-3.5 text-white rounded-xl font-bold text-sm">Unlock Dashboard →</button>
            </div>
          </div>
          <div></div>
        </div>
      `;
      this.bindSignInEvents();
      return;
    }

    if (this.currentRole === "signup") {
      const plan = this.getPlanById(this.regForm.subscriptionPlanId);
      const ussdDisp = this.buildUssdDisplay(plan.price);
      const ussdUri = this.buildUssdDialUri(plan.price);

      this.root.innerHTML = `
        <div class="min-h-screen w-full bg-slate-100 flex flex-col justify-between">
          <div class="w-full bg-white px-6 md:px-12 py-4 border-b flex justify-between items-center">
            <h2 class="font-bold text-base">${this.appConfig.appName} — Create New Account</h2>
            <div class="flex items-center space-x-2">
              ${langSwitcherHtml}
              <button id="btn-home" type="button" class="text-xs bg-slate-100 px-4 py-2 rounded-full font-semibold">${this.t("home")}</button>
            </div>
          </div>
          <div class="p-6 flex justify-center">
            ${this.regStep === "details" ? `
              <div class="w-full max-w-2xl bg-white p-6 rounded-2xl border space-y-4 shadow-sm">
                <h3 class="text-lg font-bold">Join ${this.appConfig.appName}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input id="reg-name" type="text" value="${this.regForm.name}" placeholder="Full Name or Company Name" class="p-3 border rounded-xl text-sm" />
                  <input id="reg-contact" type="text" value="${this.regForm.contact}" placeholder="Phone Number or Email" class="p-3 border rounded-xl text-sm" />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input id="reg-pass" type="password" value="${this.regForm.password}" placeholder="Password" class="p-3 border rounded-xl text-sm" />
                  <input id="reg-pass2" type="password" value="${this.regForm.confirmPassword}" placeholder="Confirm Password" class="p-3 border rounded-xl text-sm" />
                  <select id="reg-role" class="p-3 border rounded-xl text-sm bg-white font-semibold">
                    <option value="traveler" ${this.regForm.role === "traveler" ? "selected" : ""}>🧳 Traveler (FREE)</option>
                    <option value="graduate" ${this.regForm.role === "graduate" ? "selected" : ""}>🎓 Tourism Graduate</option>
                    <option value="agency" ${this.regForm.role === "agency" ? "selected" : ""}>🏢 Travel Agency</option>
                    <option value="tour_company" ${this.regForm.role === "tour_company" ? "selected" : ""}>🚐 Tour Company</option>
                    <option value="car_rental" ${this.regForm.role === "car_rental" ? "selected" : ""}>🚗 Car Rentals Company</option>
                  </select>
                </div>
                ${this.regForm.role !== "traveler" ? `
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t">
                    ${this.subscriptionPlans.map((p) => `
                      <button data-plan-id="${p.id}" type="button" class="plan-select-btn p-3 rounded-xl border-2 text-left ${this.regForm.subscriptionPlanId === p.id ? "border-[#234E40] bg-emerald-50" : "border-slate-200"}">
                        <div class="font-bold text-xs text-slate-900">${p.name}</div>
                        <div class="text-xs font-extrabold text-[#234E40]">${Number(p.price).toLocaleString()} RWF • ${p.durationLabel}</div>
                      </button>
                    `).join("")}
                  </div>
                ` : ""}
                <button id="submit-reg-details" type="button" style="background:${secondary}" class="w-full py-3.5 text-white rounded-xl font-bold text-sm">
                  ${this.regForm.role === "traveler" ? "Complete Free Sign Up →" : `Pay ${Number(plan.price).toLocaleString()} RWF (${plan.name}) →`}
                </button>
              </div>
            ` : this.regStep === "pay_subscription" ? `
              <div class="w-full max-w-xl bg-white p-6 rounded-2xl border space-y-4 shadow-sm text-center">
                <h3 class="text-lg font-bold">Pay ${Number(plan.price).toLocaleString()} RWF via USSD</h3>
                <a href="${ussdUri}" class="block w-full py-3.5 bg-amber-400 text-slate-950 rounded-xl font-extrabold text-base">📞 ${ussdDisp}</a>
                <input id="reg-momo-ref" type="text" value="${this.regForm.momoRef}" placeholder="MoMo Transaction ID (e.g. MP261116...)" class="w-full p-3 border rounded-xl text-xs font-semibold" />
                <button id="submit-reg-pay" type="button" style="background:${primary}" class="w-full py-3.5 text-white rounded-xl font-bold text-sm">
                  ${this.isSubmittingPayment ? "⏳ Notifying C.E.O..." : "✓ Payment Completed — Notify C.E.O"}
                </button>
              </div>
            ` : `
              <div class="w-full max-w-lg bg-white p-6 rounded-2xl border space-y-4 shadow-sm text-center">
                <h3 class="text-lg font-bold">Subscription Recorded & C.E.O Notified</h3>
                <p class="text-xs text-slate-600">Ref: <strong>${this.regForm.momoRef}</strong> • C.E.O: <strong>${this.ownerProfile.name}</strong></p>
                <button id="btn-home" type="button" style="background:${secondary}" class="w-full py-3 text-white rounded-xl font-bold text-sm">Return to Home</button>
              </div>
            `}
          </div>
          <div></div>
        </div>
      `;
      this.bindSignUpEvents();
      return;
    }

    if (this.currentRole === "owner") {
      const totalRegFees = this.registeredUsers.reduce((s, u) => s + (u.feePaid || 0), 0);
      const totalComm = this.tasks.filter((t) => t.paymentStatus === "paid").reduce((s, t) => s + (t.ownerCommission || 0), 0);
      this.root.innerHTML = `
        <div class="min-h-screen w-full bg-slate-100 flex flex-col justify-between">
          <div>
            <div style="background:${primary}" class="w-full text-white px-6 md:px-12 py-4 flex justify-between items-center">
              <div>
                <h2 class="font-bold text-base">${this.ownerProfile.name} <span class="text-xs bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-extrabold ml-1">C.E.O</span></h2>
                <p class="text-xs text-emerald-200">${this.ownerProfile.contact} • MoMo: ${this.appConfig.momoCode}</p>
              </div>
              <div class="flex items-center space-x-2">
                ${langSwitcherHtml}
                <button id="btn-logout" type="button" class="text-xs bg-black/30 px-4 py-2 rounded-full font-semibold">${this.t("signOut")}</button>
              </div>
            </div>
            <div class="w-full bg-white border-b px-6 md:px-12 py-2 flex space-x-2 overflow-x-auto text-xs font-bold">
              ${["pending", "users_mgmt", "app_server", "plans_mgmt", "overview", "vip"].map((tab) => `
                <button data-owner-tab="${tab}" type="button" class="owner-tab-btn px-3.5 py-2 rounded-xl ${this.ownerTab === tab ? "bg-[#234E40] text-white" : "bg-slate-100 text-slate-700"}">${tab.toUpperCase()}</button>
              `).join("")}
            </div>
            <div class="w-full px-6 md:px-12 py-6 space-y-4">
              ${this.ownerTab === "overview" ? `
                <div style="background:linear-gradient(to right, ${primary}, ${secondary})" class="text-white p-8 rounded-2xl text-center space-y-1">
                  <div class="text-xs uppercase font-bold text-emerald-200">Total Platform Revenue</div>
                  <div class="text-4xl font-extrabold">RWF ${(totalRegFees + totalComm).toLocaleString()}</div>
                </div>
              ` : `
                <div class="bg-white p-6 rounded-2xl border space-y-3 text-xs">
                  <h3 class="font-bold text-sm text-slate-900">Registered Members (${this.registeredUsers.length})</h3>
                  ${this.registeredUsers.map((u) => `
                    <div class="p-3 border rounded-xl flex justify-between items-center">
                      <div>
                        <p class="font-bold text-slate-900">${u.name} • <span class="text-[#234E40]">${this.getRoleDisplayLabel(u.role)}</span></p>
                        <p class="text-slate-500">${u.contact} • Status: ${u.status}</p>
                      </div>
                      <button data-toggle-user="${u.id}" data-status="${u.status}" type="button" class="toggle-user-btn px-3 py-1.5 bg-[#234E40] text-white rounded-lg font-bold">
                        ${u.status === "approved" ? "Revoke" : "Grant Access"}
                      </button>
                    </div>
                  `).join("") || `<p class="text-slate-500">No users registered yet.</p>`}
                </div>
              `}
            </div>
          </div>
          <div></div>
        </div>
      `;
      this.bindOwnerEvents();
      return;
    }

    // Standard Role Dashboard (traveler, graduate, agency, tour_company, car_rental)
    const providers = this.buildLiveProviderDirectory().filter((p) =>
      this.directoryFilter === "all" ? true : p.type === this.directoryFilter
    );
    this.root.innerHTML = `
      <div class="min-h-screen w-full bg-slate-100 flex flex-col justify-between">
        <div>
          <div class="bg-white border-b px-6 md:px-12 py-3 flex justify-between items-center">
            <div>
              <h2 class="font-bold text-sm md:text-base">${this.activeUser?.name || "Member"}</h2>
              <p class="text-xs text-slate-500">${this.getRoleDisplayLabel(this.currentRole)}</p>
            </div>
            <div class="flex items-center space-x-2">
              ${langSwitcherHtml}
              <button id="btn-logout" type="button" class="text-xs bg-slate-100 px-4 py-1.5 rounded-full font-semibold">${this.t("signOut")}</button>
            </div>
          </div>
          <div class="w-full px-6 md:px-12 py-6 space-y-4">
            <div style="background:${primary}" class="text-white p-6 rounded-2xl">
              <h3 class="text-lg font-bold">${this.getRoleDisplayLabel(this.currentRole)} Hub — ${this.appConfig.appName}</h3>
              <p class="text-xs text-emerald-100 mt-1">Browse guides, agencies, tour operators, and car rental partners across Rwanda.</p>
            </div>
            <div class="flex space-x-2 text-xs font-bold">
              ${["all", "car_rental", "graduate", "agency", "tour_company"].map((f) => `
                <button data-dir-filter="${f}" type="button" class="dir-filter-btn px-3 py-2 rounded-xl ${this.directoryFilter === f ? "bg-[#234E40] text-white" : "bg-white text-slate-700 border"}">${f === "all" ? "All" : this.getRoleDisplayLabel(f)}</button>
              `).join("")}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${providers.map((prov) => `
                <div class="bg-white p-4 rounded-2xl border space-y-2 text-xs shadow-sm">
                  <span class="text-[10px] font-bold uppercase text-[#3B6E5B]">${prov.categoryLabel}</span>
                  <h4 class="font-bold text-sm text-slate-900">${prov.name}</h4>
                  <p class="text-slate-600">${prov.headline}</p>
                  <p class="text-slate-500">📍 ${prov.location} • 💰 ${prov.rate}</p>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
        <div></div>
      </div>
    `;
    this.bindDashboardEvents();
  }

  bindCommonLangAndHome() {
    const langSel = document.getElementById("lang-switcher");
    if (langSel) langSel.onchange = (e) => this.setLanguage(e.target.value, true);
    const homeBtn = document.getElementById("btn-home");
    if (homeBtn) homeBtn.onclick = () => this.resetToWelcome();
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) logoutBtn.onclick = () => this.resetToWelcome();
  }

  bindWelcomeEvents() {
    this.bindCommonLangAndHome();
    document.getElementById("btn-car-rental-signup").onclick = () => this.openCarRentalSignUp();
    document.getElementById("go-signin").onclick = () => {
      this.currentRole = "signin";
      this.render();
    };
    document.getElementById("go-signup").onclick = () => {
      this.regStep = "details";
      this.currentRole = "signup";
      this.render();
    };
    document.getElementById("go-ceo").onclick = () => {
      this.ownerPinInput = "";
      this.showOwnerPinModal = true;
      this.render();
    };
    if (this.showOwnerPinModal) {
      document.getElementById("ceo-pin-cancel").onclick = () => {
        this.showOwnerPinModal = false;
        this.render();
      };
      document.getElementById("ceo-pin-unlock").onclick = () => {
        const val = document.getElementById("ceo-pin-input").value;
        if (val === "FYP$2026") {
          this.showOwnerPinModal = false;
          this.ownerTab = "pending";
          this.currentRole = "owner";
          this.render();
        } else {
          alert("Access Denied: Invalid Owner Password.");
        }
      };
    }
  }

  bindSignInEvents() {
    this.bindCommonLangAndHome();
    document.getElementById("submit-signin").onclick = () => {
      this.signInContact = document.getElementById("signin-contact").value;
      this.signInPassword = document.getElementById("signin-password").value;
      this.handleSignIn();
    };
  }

  bindSignUpEvents() {
    this.bindCommonLangAndHome();
    if (this.regStep === "details") {
      document.querySelectorAll(".plan-select-btn").forEach((btn) => {
        btn.onclick = () => {
          this.regForm.subscriptionPlanId = btn.getAttribute("data-plan-id");
          this.render();
        };
      });
      const roleEl = document.getElementById("reg-role");
      if (roleEl) {
        roleEl.onchange = (e) => {
          this.regForm.name = document.getElementById("reg-name").value;
          this.regForm.contact = document.getElementById("reg-contact").value;
          this.regForm.password = document.getElementById("reg-pass").value;
          this.regForm.confirmPassword = document.getElementById("reg-pass2").value;
          this.regForm.role = e.target.value;
          this.render();
        };
      }
      document.getElementById("submit-reg-details").onclick = () => {
        this.regForm.name = document.getElementById("reg-name").value;
        this.regForm.contact = document.getElementById("reg-contact").value;
        this.regForm.password = document.getElementById("reg-pass").value;
        this.regForm.confirmPassword = document.getElementById("reg-pass2").value;
        this.regForm.role = document.getElementById("reg-role").value;
        this.handleSignUpDetails();
      };
    } else if (this.regStep === "pay_subscription") {
      document.getElementById("submit-reg-pay").onclick = () => {
        this.regForm.momoRef = document.getElementById("reg-momo-ref").value;
        this.handleCompleteSubscriptionPayment();
      };
    }
  }

  bindOwnerEvents() {
    this.bindCommonLangAndHome();
    document.querySelectorAll(".owner-tab-btn").forEach((btn) => {
      btn.onclick = () => {
        this.ownerTab = btn.getAttribute("data-owner-tab");
        this.render();
      };
    });
    document.querySelectorAll(".toggle-user-btn").forEach((btn) => {
      btn.onclick = async () => {
        const uid = btn.getAttribute("data-toggle-user");
        const cur = btn.getAttribute("data-status");
        const nextStatus = cur === "approved" ? "revoked" : "approved";
        this.registeredUsers = this.registeredUsers.map((u) => (u.id === uid ? { ...u, status: nextStatus } : u));
        await firestoreSaveDoc("profiles", uid, { status: nextStatus });
        this.render();
      };
    });
  }

  bindDashboardEvents() {
    this.bindCommonLangAndHome();
    document.querySelectorAll(".dir-filter-btn").forEach((btn) => {
      btn.onclick = () => {
        this.directoryFilter = btn.getAttribute("data-dir-filter");
        this.render();
      };
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.guideLinkRwandaApp = new GuideLinkRwandaJSApp("app");
  window.guideLinkRwandaApp.init();
});
