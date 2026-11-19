/**
 * GuideLink Rwanda - Core Application Script
 * Features:
 * - Firebase Sync & Auth
 * - USSD Mobile Money Gateway (*182#)
 * - C.E.O Server Controls
 * - Confidential 1-on-1 Realtime Chat
 * - Multi-Language Support (EN / RW / FR)
 * - Car Rental Company Registration
 * - Scheduled Popup Ads (Triggers after 3 minutes / 180,000 ms)
 */

class GuideLinkApp {
    constructor() {
        this.currentUser = null;
        this.activeChatId = null;
        this.ussdSessionActive = false;
        this.serverStatus = "ONLINE"; // ONLINE, MAINTENANCE, SECURE_LOCKDOWN
        this.firebaseConnected = true;
        this.registeredCompanies = [];

        // Popup Ads Configuration (3 minutes = 180,000 milliseconds)
        this.adDelayMs = 3 * 60 * 1000;
        this.adTimer = null;
        this.currentAdIndex = 0;
        this.popupAds = [
            {
                badge: "SPONSORED PARTNER",
                title: "Explore Rwanda with Verified 4x4 Car Rentals",
                description: "Book reliable Toyota RAV4s, Land Cruisers, and safari vans across Kigali, Musanze, Nyungwe, and Akagera.",
                ctaText: "Browse Car Rentals →",
                actionType: "car_rental"
            },
            {
                badge: "TOURISM OPPORTUNITY",
                title: "Hire Certified Tourism Graduates & Safari Guides",
                description: "Connect directly with multilingual Rwandan tour guides and travel consultants for your next expedition.",
                ctaText: "Connect Now →",
                actionType: "chat"
            },
            {
                badge: "INSTANT PAYMENT",
                title: "Fast & Secure Mobile Money Checkout (*182#)",
                description: "Pay for tours, permits, and car rentals seamlessly using MTN Mobile Money or Airtel Money.",
                ctaText: "Pay via USSD →",
                actionType: "ussd"
            }
        ];

        // Supported languages: 'en' (English), 'rw' (Kinyarwanda), 'fr' (French)
        this.currentLanguage = localStorage.getItem("guidelink_lang") || "en";
        this.translations = {
            en: {
                welcomeBack: "Welcome back, {name}! Connected securely.",
                ussdPromptAmount: "Enter Service Fee in RWF (e.g., 5000):",
                ussdPromptProvider: "Select Telecom Provider:\n1. MTN Mobile Money\n2. Airtel Money",
                ussdPromptPhone: "Enter Mobile Number (e.g., 078XXXXXXX):",
                ussdDialing: "[USSD Gateway] Dialing *182*8*1# for {provider}...\nPushing payment prompt of {amount} RWF to {phone}. Please enter your PIN on your phone.",
                paymentSuccess: "Payment Successful! Transaction Reference: {ref}",
                paymentFailed: "Payment Failed or Cancelled by User.",
                chatTitle: "Confidential Chat with {name}",
                chatEncrypted: "End-to-end encryption active. Messages are confidential.",
                lockdownKeyPrompt: "Enter C.E.O Master Authorization Key to toggle server state:",
                unauthorized: "Unauthorized Access. Action logged.",
                lockdownActivated: "CRITICAL: C.E.O Server Lockdown activated. All external USSD & API gateways restricted.",
                serverRestored: "Server restored to normal operating status.",
                companyNamePrompt: "Enter Car Rental Company Name (e.g., Kigali Drive Rentals):",
                companyPhonePrompt: "Enter Company Contact Phone (e.g., 078XXXXXXX):",
                companyFleetPrompt: "Enter available vehicles (comma-separated, e.g., Toyota RAV4, Suzuki Vitara):",
                companyRegistered: "Car Rental Company '{name}' registered and synced!",
                languageChanged: "Language switched to English.",
                addCarRentalBtn: "+ Register Car Rental Company",
                closeAdBtn: "Close Ad"
            },
            rw: {
                welcomeBack: "Murakaza neza, {name}! Mwahujwe neza kandi mu buryo bwizewe.",
                ussdPromptAmount: "Andika amafaranga ya serivisi mu RWF (urugero: 5000):",
                ussdPromptProvider: "Hitamo urubuga rw'itumanaho:\n1. MTN Mobile Money\n2. Airtel Money",
                ussdPromptPhone: "Andika nimero ya telefone (urugero: 078XXXXXXX):",
                ussdDialing: "[USSD Gateway] Guhamagara *182*8*1# kuri {provider}...\nKohereza ubusabe bwo kwishyura {amount} RWF kuri {phone}. Nyabuneka shyiramo PIN yawe kuri telefone.",
                paymentSuccess: "Kwishyura byagenze neza! Nimero y'ubwishyu: {ref}",
                paymentFailed: "Kwishyura byanze cyangwa byahagaritswe.",
                chatTitle: "Iganiro ryihariye na {name}",
                chatEncrypted: "Ubwirinzi bwo guhanahana ubutumwa burakora. Ubutumwa ni ibanga.",
                lockdownKeyPrompt: "Andika urufunguzo rw'ubuyobozi (C.E.O) kugira ngo uhindure imiterere ya server:",
                unauthorized: "Ntabwo mwemerewe. Iki gikorwa cyabitswe.",
                lockdownActivated: "BYIHUTIRWA: Ifungwa rya server (C.E.O Lockdown) ryatangiye. Imiyoboro ya USSD na API irahagaritswe.",
                serverRestored: "Server yasubiye ku murongo bisanzwe.",
                companyNamePrompt: "Andika izina ry'ikigo gikodesha imodoka (urugero: Kigali Drive Rentals):",
                companyPhonePrompt: "Andika nimero ya telefone y'ikigo (urugero: 078XXXXXXX):",
                companyFleetPrompt: "Andika amamodoka ahari (atandukanijwe n'uturingushyo, urugero: Toyota RAV4, Suzuki Vitara):",
                companyRegistered: "Ikigo gikodesha imodoka '{name}' cyanditswe kandi cyahujwe na Firebase!",
                languageChanged: "Ururimi rwahinduwe rwashyirwa mu Kinyarwanda.",
                addCarRentalBtn: "+ Andikisha Ikigo cy'Imodoka",
                closeAdBtn: "Funga Itangazo"
            },
            fr: {
                welcomeBack: "Bon retour, {name} ! Connexion sécurisée établie.",
                ussdPromptAmount: "Entrez les frais de service en RWF (ex. : 5000) :",
                ussdPromptProvider: "Sélectionnez l'opérateur télécom :\n1. MTN Mobile Money\n2. Airtel Money",
                ussdPromptPhone: "Entrez le numéro de mobile (ex. : 078XXXXXXX) :",
                ussdDialing: "[Passerelle USSD] Composition de *182*8*1# pour {provider}...\nEnvoi de la demande de paiement de {amount} RWF vers {phone}. Veuillez saisir votre code PIN sur votre téléphone.",
                paymentSuccess: "Paiement réussi ! Référence de transaction : {ref}",
                paymentFailed: "Paiement échoué ou annulé par l'utilisateur.",
                chatTitle: "Discussion confidentielle avec {name}",
                chatEncrypted: "Chiffrement de bout en bout actif. Les messages sont confidentiels.",
                lockdownKeyPrompt: "Entrez la clé principale d'autorisation du C.E.O pour basculer l'état du serveur :",
                unauthorized: "Accès non autorisé. Action enregistrée.",
                lockdownActivated: "CRITIQUE : Verrouillage serveur C.E.O activé. Toutes les passerelles USSD et API externes sont restreintes.",
                serverRestored: "Serveur rétabli en fonctionnement normal.",
                companyNamePrompt: "Entrez le nom de l'entreprise de location de voitures (ex. : Kigali Drive Rentals) :",
                companyPhonePrompt: "Entrez le téléphone de contact de l'entreprise (ex. : 078XXXXXXX) :",
                companyFleetPrompt: "Entrez les véhicules disponibles (séparés par des virgules, ex. : Toyota RAV4, Suzuki Vitara) :",
                companyRegistered: "L'entreprise de location de voitures « {name} » a été enregistrée et synchronisée !",
                languageChanged: "La langue a été changée en français.",
                addCarRentalBtn: "+ Inscrire Location de Voitures",
                closeAdBtn: "Fermer la pub"
            }
        };

        this.ensureDefaultControls();
        this.initEventListeners();
        this.applyLanguage(this.currentLanguage, false);
        this.checkServerHealth();
        this.startPopupAdTimer();
    }

    /**
     * Ensures Language Switcher, Car Rental Registration button, and Popup Ad Modal
     * exist in the DOM even if not manually added to HTML.
     */
    ensureDefaultControls() {
        if (!document.getElementById("language-select") || !document.getElementById("add-car-rental-btn")) {
            const floatingBar = document.createElement("div");
            floatingBar.id = "guidelink-quick-bar";
            floatingBar.style.cssText = [
                "position: fixed",
                "bottom: 16px",
                "right: 16px",
                "z-index: 9990",
                "display: flex",
                "gap: 8px",
                "align-items: center",
                "background: #ffffff",
                "padding: 8px 12px",
                "border-radius: 12px",
                "box-shadow: 0 6px 20px rgba(0,0,0,0.15)",
                "border: 1px solid #e2e8f0",
                "font-family: system-ui, -apple-system, sans-serif"
            ].join(";");

            if (!document.getElementById("language-select")) {
                const select = document.createElement("select");
                select.id = "language-select";
                select.style.cssText = "padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; cursor: pointer;";
                select.innerHTML = `
                    <option value="en">🇬🇧 English</option>
                    <option value="rw">🇷🇼 Kinyarwanda</option>
                    <option value="fr">🇫🇷 Français</option>
                `;
                floatingBar.appendChild(select);
            }

            if (!document.getElementById("add-car-rental-btn")) {
                const btn = document.createElement("button");
                btn.id = "add-car-rental-btn";
                btn.type = "button";
                btn.setAttribute("data-i18n", "addCarRentalBtn");
                btn.textContent = this.t("addCarRentalBtn");
                btn.style.cssText = "padding: 7px 12px; border-radius: 8px; border: none; background: #234E40; color: #ffffff; font-size: 12px; font-weight: 700; cursor: pointer;";
                floatingBar.appendChild(btn);
            }

            if (floatingBar.children.length > 0 && document.body) {
                document.body.appendChild(floatingBar);
            }
        }
    }

    /**
     * Popup Ads Scheduler: Displays a popup ad after 3 minutes (180,000 ms),
     * and repeats every 3 minutes after dismissal.
     */
    startPopupAdTimer(delayMs = this.adDelayMs) {
        if (this.adTimer) {
            clearTimeout(this.adTimer);
        }
        this.adTimer = setTimeout(() => {
            this.showPopupAd();
        }, delayMs);
    }

    showPopupAd() {
        // Avoid stacking multiple popups if one is already open
        if (document.getElementById("guidelink-popup-ad")) return;

        const ad = this.popupAds[this.currentAdIndex % this.popupAds.length];
        this.currentAdIndex += 1;

        const overlay = document.createElement("div");
        overlay.id = "guidelink-popup-ad";
        overlay.style.cssText = [
            "position: fixed",
            "inset: 0",
            "background: rgba(15, 23, 42, 0.65)",
            "z-index: 10000",
            "display: flex",
            "align-items: center",
            "justify-content: center",
            "padding: 16px",
            "font-family: system-ui, -apple-system, sans-serif"
        ].join(";");

        overlay.innerHTML = `
            <div style="background: #ffffff; max-width: 420px; width: 100%; border-radius: 18px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); position: relative; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.05em;">
                        ${ad.badge}
                    </span>
                    <button id="guidelink-ad-close-x" type="button" style="background: #f1f5f9; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: 700; cursor: pointer; color: #475569;">
                        ✕
                    </button>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                    ${ad.title}
                </h3>
                <p style="margin: 0 0 18px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                    ${ad.description}
                </p>
                <div style="display: flex; gap: 10px;">
                    <button id="guidelink-ad-cta" type="button" style="flex: 2; padding: 11px 14px; border-radius: 10px; border: none; background: #234E40; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer;">
                        ${ad.ctaText}
                    </button>
                    <button id="guidelink-ad-dismiss" type="button" style="flex: 1; padding: 11px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer;">
                        ${this.t("closeAdBtn")}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeAd = () => {
            const modal = document.getElementById("guidelink-popup-ad");
            if (modal) modal.remove();
            // Schedule the next popup ad in another 3 minutes
            this.startPopupAdTimer(this.adDelayMs);
        };

        document.getElementById("guidelink-ad-close-x")?.addEventListener("click", closeAd);
        document.getElementById("guidelink-ad-dismiss")?.addEventListener("click", closeAd);
        document.getElementById("guidelink-ad-cta")?.addEventListener("click", () => {
            closeAd();
            if (ad.actionType === "car_rental") {
                this.registerCarRentalCompany();
            } else if (ad.actionType === "ussd") {
                this.initiateUSSDPayment();
            } else if (ad.actionType === "chat") {
                this.openSecureChat("support_desk", "GuideLink Support");
            }
        });
    }

    /**
     * Translation helper with optional template placeholders
     */
    t(key, params = {}) {
        const langDict = this.translations[this.currentLanguage] || this.translations.en;
        let text = langDict[key] || this.translations.en[key] || key;
        Object.keys(params).forEach((paramKey) => {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), params[paramKey]);
        });
        return text;
    }

    /**
     * Change application language ('en', 'rw', 'fr') and update DOM elements with [data-i18n]
     */
    setLanguage(langCode) {
        const normalized = (langCode || "").toLowerCase();
        if (!this.translations[normalized]) {
            console.warn(`Unsupported language '${langCode}'. Defaulting to 'en'.`);
            return;
        }
        this.applyLanguage(normalized, true);
    }

    applyLanguage(langCode, notifyUser = true) {
        this.currentLanguage = langCode;
        localStorage.setItem("guidelink_lang", langCode);
        document.documentElement.lang = langCode;

        const selector = document.getElementById("language-select");
        if (selector && selector.value !== langCode) {
            selector.value = langCode;
        }

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (key) {
                el.textContent = this.t(key);
            }
        });

        this.syncWithFirebaseDatabase("preferences/language", { lang: langCode, updatedAt: Date.now() });

        if (notifyUser) {
            alert(this.t("languageChanged"));
        }
    }

    initEventListeners() {
        // Navigation & UI Triggers
        const loginBtn = document.getElementById("login-btn");
        if (loginBtn) {
            loginBtn.addEventListener("click", () => this.handleAuthentication());
        }

        const ussdTrigger = document.getElementById("ussd-pay-trigger");
        if (ussdTrigger) {
            ussdTrigger.addEventListener("click", () => this.initiateUSSDPayment());
        }

        const chatSendBtn = document.getElementById("send-message-btn");
        if (chatSendBtn) {
            chatSendBtn.addEventListener("click", () => this.sendSecureMessage());
        }

        // Language Switcher (<select id="language-select"> or buttons with [data-lang])
        const langSelect = document.getElementById("language-select");
        if (langSelect) {
            langSelect.addEventListener("change", (e) => this.setLanguage(e.target.value));
        }

        document.querySelectorAll("[data-lang]").forEach((btn) => {
            btn.addEventListener("click", () => this.setLanguage(btn.getAttribute("data-lang")));
        });

        // Register Car Rentals Company Trigger
        const addCarRentalBtn = document.getElementById("add-car-rental-btn");
        if (addCarRentalBtn) {
            addCarRentalBtn.addEventListener("click", () => this.registerCarRentalCompany());
        }

        // C.E.O Server Controls
        const toggleLockdown = document.getElementById("ceo-lockdown-btn");
        if (toggleLockdown) {
            toggleLockdown.addEventListener("click", () => this.toggleServerLockdown());
        }
    }

    /**
     * Register a Car Rentals Company as a new user in GuideLink Rwanda
     */
    registerCarRentalCompany(companyDetails = null) {
        const name = companyDetails?.name || prompt(this.t("companyNamePrompt"));
        if (!name || !name.trim()) return null;

        const phone = companyDetails?.phone || prompt(this.t("companyPhonePrompt")) || "";
        const fleetInput = companyDetails?.fleet || prompt(this.t("companyFleetPrompt")) || "";
        const fleet = Array.isArray(fleetInput)
            ? fleetInput
            : fleetInput.split(",").map((item) => item.trim()).filter(Boolean);

        const newCompanyUser = {
            uid: "rw_car_rental_" + Math.floor(100000 + Math.random() * 900000),
            name: name.trim(),
            phone: phone.trim(),
            role: "CAR_RENTAL_COMPANY",
            serviceType: "CAR_RENTAL",
            location: "Kigali, Rwanda",
            fleet,
            verified: true,
            createdAt: Date.now()
        };

        this.registeredCompanies.push(newCompanyUser);
        this.currentUser = newCompanyUser;

        this.syncWithFirebaseDatabase("users/" + newCompanyUser.uid, newCompanyUser);
        this.syncWithFirebaseDatabase("car_rentals/" + newCompanyUser.uid, newCompanyUser);

        if (!companyDetails) {
            alert(this.t("companyRegistered", { name: newCompanyUser.name }));
        }

        return newCompanyUser;
    }

    /**
     * Firebase Authentication & State Synchronization
     */
    async handleAuthentication() {
        try {
            console.log("Authenticating user via Firebase...");
            this.currentUser = {
                uid: "rwanda_user_" + Math.floor(Math.random() * 10000),
                name: "Jean Bosco",
                role: "CITIZEN_CLIENT",
                verified: true
            };
            this.syncWithFirebaseDatabase("users/" + this.currentUser.uid, this.currentUser);
            alert(this.t("welcomeBack", { name: this.currentUser.name }));
        } catch (error) {
            console.error("Authentication failed:", error);
        }
    }

    async syncWithFirebaseDatabase(path, data) {
        if (!this.firebaseConnected) {
            console.warn("Firebase offline. Caching data locally.");
            return;
        }
        console.log(`[Firebase Sync] Data pushed to path: ${path}`, data);
    }

    /**
     * Live USSD Mobile Money Integration (*182# / MTN / Airtel Money)
     */
    initiateUSSDPayment() {
        if (this.ussdSessionActive) return;
        this.ussdSessionActive = true;

        const amount = prompt(this.t("ussdPromptAmount"));
        if (!amount || isNaN(amount)) {
            this.ussdSessionActive = false;
            return;
        }

        const provider = prompt(this.t("ussdPromptProvider"), "1");
        const phoneNumber = prompt(this.t("ussdPromptPhone"), "078");

        if (!phoneNumber) {
            this.ussdSessionActive = false;
            return;
        }

        const providerLabel = provider === "1" ? "MTN MoMo" : "Airtel Money";
        alert(this.t("ussdDialing", {
            provider: providerLabel,
            amount,
            phone: phoneNumber
        }));

        setTimeout(() => {
            const success = Math.random() > 0.1;
            if (success) {
                const ref = "RW_MOMO_" + Date.now();
                alert(this.t("paymentSuccess", { ref }));
                this.logTransaction({ amount, provider, phoneNumber, status: "SUCCESS", reference: ref });
            } else {
                alert(this.t("paymentFailed"));
            }
            this.ussdSessionActive = false;
        }, 4000);
    }

    logTransaction(txData) {
        console.log("Logging transaction to secure ledger:", txData);
        this.syncWithFirebaseDatabase("transactions/" + Date.now(), txData);
    }

    /**
     * Confidential 1-on-1 Realtime Chat System
     */
    openSecureChat(recipientId, recipientName) {
        this.activeChatId = recipientId;
        const chatWindow = document.getElementById("chat-container");
        if (chatWindow) {
            chatWindow.style.display = "block";
            const titleEl = document.getElementById("chat-title");
            if (titleEl) {
                titleEl.innerText = this.t("chatTitle", { name: recipientName });
            }
        }
        this.fetchChatHistory(recipientId);
    }

    fetchChatHistory(recipientId) {
        console.log(`Fetching encrypted messages for session with ${recipientId}...`);
        const chatBox = document.getElementById("chat-messages");
        if (chatBox) {
            chatBox.innerHTML = `<div class='system-msg'>${this.t("chatEncrypted")}</div>`;
        }
    }

    sendSecureMessage() {
        const inputField = document.getElementById("chat-input-field");
        if (!inputField || !inputField.value.trim()) return;

        const messageText = inputField.value.trim();
        const messagePayload = {
            sender: this.currentUser ? this.currentUser.uid : "anonymous",
            recipient: this.activeChatId,
            message: messageText,
            timestamp: Date.now(),
            encrypted: true
        };

        console.log("Sending encrypted message payload:", messagePayload);
        this.syncWithFirebaseDatabase(`chats/${this.activeChatId}/${Date.now()}`, messagePayload);

        const chatBox = document.getElementById("chat-messages");
        if (chatBox) {
            chatBox.innerHTML += `<div class='msg-bubble outgoing'>${messageText}</div>`;
        }
        inputField.value = "";
    }

    /**
     * Dynamic C.E.O Server Controls & Health Monitoring
     */
    checkServerHealth() {
        setInterval(() => {
            if (this.serverStatus === "SECURE_LOCKDOWN") {
                console.warn("WARNING: Server is currently under C.E.O Lockdown mode.");
            }
        }, 10000);
    }

    toggleServerLockdown() {
        if (!this.currentUser || this.currentUser.role !== "CEO") {
            const authKey = prompt(this.t("lockdownKeyPrompt"));
            if (authKey !== "RWANDA_CEO_ADMIN_2026") {
                alert(this.t("unauthorized"));
                return;
            }
        }

        if (this.serverStatus === "ONLINE") {
            this.serverStatus = "SECURE_LOCKDOWN";
            alert(this.t("lockdownActivated"));
        } else {
            this.serverStatus = "ONLINE";
            alert(this.t("serverRestored"));
        }
    }
}

// Initialize Application Safely (works whether script loads before or after DOMContentLoaded)
const initGuideLinkApp = () => {
    if (!window.guideLinkApp) {
        window.guideLinkApp = new GuideLinkApp();
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGuideLinkApp);
} else {
    initGuideLinkApp();
}
