import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue,
    set
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";


/* =====================================================
   FIREBASE INITIALIZATION

   Wrapped in try/catch so that a bad config or a blocked
   network request doesn't silently kill the whole script.
   `database` stays null on failure and every listener /
   write below checks for that before touching Firebase.
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBlvnmdOFXUyhb86SD6kv3rlHVQXnzM8eY",
    authDomain: "smart-pet-feeder-cc57b.firebaseapp.com",
    databaseURL: "https://smart-pet-feeder-cc57b-default-rtdb.firebaseio.com",
    projectId: "smart-pet-feeder-cc57b",
    storageBucket: "smart-pet-feeder-cc57b.firebasestorage.app",
    messagingSenderId: "857529321707",
    appId: "1:857529321707:web:b788717411543fe72296ae"
};

let database = null;

try {

    const app = initializeApp(firebaseConfig);

    database = getDatabase(app);

    console.log("Firebase connected!");

} catch (error) {

    // Don't print firebaseConfig itself — just the failure.
    console.error("Firebase failed to initialize:", error);

}



/* =====================================================
   DOM CACHE

   Every element we touch repeatedly (especially inside
   Firebase listeners, which can fire often) is looked up
   once here instead of re-querying the DOM on every update.
===================================================== */

const dom = {

    // Navigation
    navItems: document.querySelectorAll(".nav-item"),
    pages: document.querySelectorAll(".page"),
    pageTitle: document.getElementById("pageTitle"),
    pageSubtitle: document.getElementById("pageSubtitle"),

    // Sidebar / mobile menu
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    menuBtn: document.getElementById("menuBtn"),

    // Connection status
    connectionDot: document.getElementById("connectionDot"),
    connectionLabel: document.getElementById("connectionLabel"),
    systemPillDot: document.getElementById("systemPillDot"),
    systemPillLabel: document.getElementById("systemPillLabel"),
    wifiStatusText: document.getElementById("wifiStatusText"),

    // Greeting
    greeting: document.getElementById("greeting"),

    // Stats
    dogCount: document.getElementById("dogCount"),
    catCount: document.getElementById("catCount"),
    birdCount: document.getElementById("birdCount"),
    totalMeals: document.getElementById("totalMeals"),
    dogLimit: document.getElementById("dogLimit"),
    catLimit: document.getElementById("catLimit"),
    birdLimit: document.getElementById("birdLimit"),

    // Last detection
    lastPet: document.getElementById("lastPet"),
    petIcon: document.getElementById("petIcon"),
    lastTime: document.getElementById("lastTime"),
    lastStatus: document.getElementById("lastStatus"),

    // Toast
    toast: document.getElementById("toast"),
    toastIcon: document.getElementById("toastIcon"),
    toastTitle: document.getElementById("toastTitle"),
    toastMessage: document.getElementById("toastMessage"),

    // Manual feeding
    feedButtons: document.querySelectorAll(".feed-btn"),

    // Daily reset
    resetDailyCountsBtn:
        document.getElementById("resetDailyCountsBtn"),

    // Misc stubs
    addPetBtn: document.getElementById("addPetBtn"),
    saveSchedule: document.getElementById("saveSchedule"),
    filters: document.querySelectorAll(".filter"),
    notificationBtn: document.getElementById("notificationBtn")

};



/* =====================================================
   SMALL UTILITIES
===================================================== */

/**
 * Safely coerce a Firebase value into a finite number.
 * Guards against missing fields, strings, null, or NaN
 * so a single malformed field can't crash the UI.
 */
function safeNumber(value, fallback = 0) {

    const num = Number(value);

    return Number.isFinite(num) ? num : fallback;

}


/**
 * Set text content only if the target element exists and
 * the value actually changed — avoids redundant reflows
 * when Firebase re-sends data that hasn't changed.
 */
function setText(element, text) {

    if (!element) return;

    if (element.textContent !== String(text)) {

        element.textContent = text;

    }

}



/* =====================================================
   TOAST NOTIFICATIONS

   Used instead of alert()/confirm() for all success and
   error feedback so the UI never blocks on a native dialog.
===================================================== */

let toastTimer;


function showToast(title, message, variant = "success") {

    if (!dom.toast) return;

    setText(dom.toastTitle, title);
    setText(dom.toastMessage, message);

    dom.toastIcon.textContent = variant === "error" ? "✕" : "✓";

    dom.toast.classList.toggle("toast-error", variant === "error");

    dom.toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        dom.toast.classList.remove("show");

    }, 3500);

}



/* =====================================================
   DYNAMIC GREETING
===================================================== */

function setGreeting() {

    if (!dom.greeting) return;

    const hour = new Date().getHours();

    let greeting = "Good evening";

    if (hour < 12) {
        greeting = "Good morning";
    } else if (hour < 18) {
        greeting = "Good afternoon";
    }

    setText(dom.greeting, `${greeting} 👋`);

}


setGreeting();



/* =====================================================
   PAGE NAVIGATION
===================================================== */

const pageInfo = {

    dashboard: {
        title: "Dashboard",
        subtitle: "Monitor your smart pet feeding station"
    },

    pets: {
        title: "Pets",
        subtitle: "Manage your registered pets"
    },

    schedule: {
        title: "Feeding Schedule",
        subtitle: "Configure automatic feeding times"
    },

    history: {
        title: "Feeding History",
        subtitle: "View all feeding activity"
    },

    manual: {
        title: "Manual Control",
        subtitle: "Control food dispensing manually"
    },

    device: {
        title: "Device",
        subtitle: "Monitor ESP32-CAM and system health"
    },

    settings: {
        title: "Settings",
        subtitle: "Configure your feeding station"
    }

};


function showPage(pageId) {

    if (!pageInfo[pageId]) return;

    dom.pages.forEach(page => {
        page.classList.remove("active");
    });

    dom.navItems.forEach(item => {
        item.classList.remove("active");
        item.removeAttribute("aria-current");
    });


    const selectedPage = document.getElementById(pageId);

    const selectedNav = document.querySelector(
        `.nav-item[data-page="${pageId}"]`
    );


    if (selectedPage) {

        selectedPage.classList.add("active");

        // Move focus to the page for screen-reader / keyboard users
        // so navigation is announced, without disrupting mouse users.
        selectedPage.focus({ preventScroll: true });

    }

    if (selectedNav) {

        selectedNav.classList.add("active");
        selectedNav.setAttribute("aria-current", "page");

    }


    dom.pageTitle.textContent = pageInfo[pageId].title;
    dom.pageSubtitle.textContent = pageInfo[pageId].subtitle;


    closeSidebar();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


dom.navItems.forEach(item => {

    item.addEventListener("click", () => {

        showPage(item.dataset.page);

    });

});


/* Other buttons that also navigate (e.g. "View History →") */

document.querySelectorAll("[data-page]").forEach(button => {

    if (!button.classList.contains("nav-item")) {

        button.addEventListener("click", () => {

            showPage(button.dataset.page);

        });

    }

});



/* =====================================================
   MOBILE MENU (with backdrop + Escape-to-close)
===================================================== */

function openSidebar() {

    dom.sidebar.classList.add("open");

    dom.sidebarBackdrop.hidden = false;

    // Allow the browser to paint `hidden` removal before animating opacity.
    requestAnimationFrame(() => {
        dom.sidebarBackdrop.classList.add("show");
    });

    dom.menuBtn.setAttribute("aria-expanded", "true");

}


function closeSidebar() {

    dom.sidebar.classList.remove("open");

    dom.sidebarBackdrop.classList.remove("show");

    dom.menuBtn.setAttribute("aria-expanded", "false");

    setTimeout(() => {

        // Wait for the fade-out transition before hiding fully.
        if (!dom.sidebar.classList.contains("open")) {
            dom.sidebarBackdrop.hidden = true;
        }

    }, 250);

}


if (dom.menuBtn) {

    dom.menuBtn.addEventListener("click", () => {

        const isOpen = dom.sidebar.classList.contains("open");

        isOpen ? closeSidebar() : openSidebar();

    });

}


if (dom.sidebarBackdrop) {

    dom.sidebarBackdrop.addEventListener("click", closeSidebar);

}


document.addEventListener("keydown", (event) => {

    if (event.key === "Escape" && dom.sidebar.classList.contains("open")) {

        closeSidebar();

    }

});



/* =====================================================
   FIREBASE CONNECTION STATUS

   Firebase Realtime Database exposes a special path,
   ".info/connected", that reports whether THIS client
   currently has an active connection. Using it (instead
   of a hardcoded "System Online" label) gives an honest,
   real-time status indicator.
===================================================== */

function setConnectionStatus(state) {

    // state: "connected" | "connecting" | "offline"

    const labels = {
        connected: "System Online",
        connecting: "Connecting…",
        offline: "Connection Lost"
    };

    [dom.connectionDot, dom.systemPillDot].forEach(dot => {

        if (!dot) return;

        dot.classList.remove("offline", "connecting");

        if (state !== "connected") {
            dot.classList.add(state === "offline" ? "offline" : "connecting");
        }

    });

    setText(dom.connectionLabel, labels[state]);
    setText(dom.systemPillLabel, labels[state]);

    if (dom.wifiStatusText) {

        dom.wifiStatusText.textContent = state === "connected" ? "CONNECTED" : "DISCONNECTED";
        dom.wifiStatusText.classList.toggle("online-text", state === "connected");
        dom.wifiStatusText.classList.toggle("offline-text", state !== "connected");

    }

}


if (database) {

    setConnectionStatus("connecting");

    onValue(
        ref(database, ".info/connected"),
        (snapshot) => {

            const isConnected = snapshot.val() === true;

            setConnectionStatus(isConnected ? "connected" : "offline");

        },
        (error) => {

            console.error("Connection status listener error:", error);

            setConnectionStatus("offline");

        }
    );

} else {

    setConnectionStatus("offline");

}



/* =====================================================
   FIREBASE → FEEDING DATA

   Listens on the parent "Feeding" node so Dog/Cat/Bird
   counts always arrive together in one snapshot. Each pet
   is parsed defensively: a malformed node for one pet will
   no longer break the read-out for the other two.
===================================================== */

if (database) {

    const feedingRef = ref(database, "Feeding");

    const petFields = [
        { key: "Dog", countEl: dom.dogCount, limitEl: dom.dogLimit },
        { key: "Cat", countEl: dom.catCount, limitEl: dom.catLimit },
        { key: "Bird", countEl: dom.birdCount, limitEl: dom.birdLimit }
    ];


    onValue(
        feedingRef,
        (snapshot) => {

            const data = snapshot.val();

            if (!data || typeof data !== "object") {

                console.log("No (or invalid) Feeding data found.");

                return;

            }


            let totalMeals = 0;

            petFields.forEach(({ key, countEl, limitEl }) => {

                const petNode = data[key];

                // Guard against a node that isn't an object (e.g. corrupted write)
                if (!petNode || typeof petNode !== "object") return;

                const count = safeNumber(petNode.count, 0);
                const limit = safeNumber(petNode.limit, 0);

                setText(countEl, count);
                setText(limitEl, `/ ${limit}`);

                totalMeals += count;

            });

            setText(dom.totalMeals, totalMeals);

        },
        (error) => {

            console.error("Feeding listener error:", error);

            showToast(
                "Connection Issue",
                "Couldn't read live feeding data. Retrying automatically.",
                "error"
            );

        }
    );

}



/* =====================================================
   FIREBASE → LAST DETECTION
===================================================== */

if (database) {

    const lastDetectionRef = ref(database, "LastDetection");

    const petIcons = {
        Dog: "🐶",
        Cat: "🐱",
        Bird: "🐦"
    };


    onValue(
        lastDetectionRef,
        (snapshot) => {

            const data = snapshot.val();

            if (!data || typeof data !== "object") {

                console.log("No (or invalid) LastDetection data found.");

                return;

            }

            const pet = typeof data.pet === "string" && data.pet ? data.pet : "Unknown";
            const icon = petIcons[pet] || "🐾";

            setText(dom.lastPet, pet);
            setText(dom.petIcon, icon);
            setText(dom.lastTime, data.time || "--");
            setText(dom.lastStatus, data.status || "No Status");

        },
        (error) => {

            console.error("LastDetection listener error:", error);

            showToast(
                "Connection Issue",
                "Couldn't read the latest detection. Retrying automatically.",
                "error"
            );

        }
    );

}



/* =====================================================
   MANUAL FEEDING

   Writes a one-shot command to Commands/{pet} for the
   ESP32 to pick up. Guarded against rapid repeat clicks:
   the clicked button is disabled and shows a spinner for
   the duration of the write, and is re-enabled afterwards
   whether the write succeeds or fails.
===================================================== */

function setButtonLoading(button, isLoading) {

    const label = button.querySelector(".btn-label");

    if (isLoading) {

        button.dataset.originalLabel = label ? label.textContent : button.textContent;

        button.disabled = true;

        button.setAttribute("aria-busy", "true");

        if (label) {

            label.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>Sending…`;

        }

    } else {

        button.disabled = false;

        button.removeAttribute("aria-busy");

        if (label && button.dataset.originalLabel) {

            label.textContent = button.dataset.originalLabel;

        }

    }

}


dom.feedButtons.forEach(button => {

    button.addEventListener("click", async () => {

        // Prevent double-submits from rapid clicking.
        if (button.disabled) return;

        const pet = button.dataset.pet;

        if (!database) {

            showToast(
                "Not Connected",
                "Firebase isn't available right now. Please try again shortly.",
                "error"
            );

            return;

        }

        const confirmed = confirm(
            `Do you want to dispense food for ${pet}?`
        );

        if (!confirmed) return;

        setButtonLoading(button, true);

        try {

            // Write command to Firebase — the ESP32 reads this path
            // and activates the matching servo/valve.
            const commandRef = ref(database, `Commands/${pet}`);

            await set(commandRef, {
                action: "FEED",
                timestamp: Date.now()
            });

            showToast(
                "Command Sent",
                `${pet} feeding command sent to Firebase.`
            );

        } catch (error) {

            console.error("Manual feeding error:", error);

            showToast(
                "Error",
                `Could not send the feeding command for ${pet}. Please try again.`,
                "error"
            );

        } finally {

            setButtonLoading(button, false);

        }

    });

});



/* =====================================================
   ADD PET (stub — not yet wired to a Firebase path)
===================================================== */

if (dom.addPetBtn) {

    dom.addPetBtn.addEventListener("click", () => {

        showToast(
            "Pet Management",
            "Pet management will be connected to Firebase next."
        );

    });

}



/* =====================================================
   SAVE SCHEDULE (stub — not yet wired to a Firebase path)
===================================================== */

if (dom.saveSchedule) {

    dom.saveSchedule.addEventListener("click", () => {

        showToast(
            "Schedule",
            "Schedule saving will be connected to Firebase next."
        );

    });

}



/* =====================================================
   HISTORY FILTERS
===================================================== */

dom.filters.forEach(filter => {

    filter.addEventListener("click", () => {

        dom.filters.forEach(item => {

            item.classList.remove("active");
            item.setAttribute("aria-pressed", "false");

        });

        filter.classList.add("active");
        filter.setAttribute("aria-pressed", "true");

        showToast(
            "History Filter",
            `${filter.textContent.trim()} selected.`
        );

    });

});



/* =====================================================
   NOTIFICATIONS
===================================================== */

if (dom.notificationBtn) {

    dom.notificationBtn.addEventListener("click", () => {

        showToast(
            "Notifications",
            "No new notifications."
        );

    });

}



/* =====================================================
   STARTUP
===================================================== */

console.log("Smart Pet Feeding Station v2.2 running.");
console.log("Waiting for Firebase data…");


/* =====================================================
   DAILY COUNT RESET
===================================================== */

if (dom.resetDailyCountsBtn) {

    dom.resetDailyCountsBtn.addEventListener("click", async () => {

        if (!database) {

            showToast(
                "Not Connected",
                "Firebase isn't available right now. Please try again shortly.",
                "error"
            );

            return;
        }

        const confirmed = confirm(
            "Reset today's Cat, Dog, and Bird feeding counts to 0?"
        );

        if (!confirmed) return;

        const button = dom.resetDailyCountsBtn;

        button.disabled = true;
        button.textContent = "Resetting...";

        try {

            const today = new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone: "Asia/Kolkata",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            ).format(new Date());

            await Promise.all([
                set(
                    ref(database, "Feeding/Cat/count"),
                    0
                ),

                set(
                    ref(database, "Feeding/Dog/count"),
                    0
                ),

                set(
                    ref(database, "Feeding/Bird/count"),
                    0
                ),

                set(
                    ref(database, "Feeding/date"),
                    today
                )
            ]);

            showToast(
                "Counts Reset",
                "Cat, Dog, and Bird feeding counts are now 0."
            );

            console.log(
                "Daily feeding counts reset:",
                today
            );

        } catch (error) {

            console.error(
                "Daily count reset error:",
                error
            );

            showToast(
                "Reset Failed",
                "Could not reset the feeding counts. Please try again.",
                "error"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Reset Daily Counts";

        }

    });

}