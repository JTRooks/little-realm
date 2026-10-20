
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from
    "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFQT9UpHtFpUR8OKgB8XC7fOj60652jis",
    authDomain: "little-realm-sync.firebaseapp.com",
    projectId: "little-realm-sync",
    storageBucket: "little-realm-sync.firebasestorage.app",
    messagingSenderId: "598105864798",
    appId: "1:598105864798:web:353b740820a91feef5d2cf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const LITTLE_REALM_SYNC = {
    initialized: true,
    user: null,
    status: "loading"
};

function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
}

function signOutGoogle() {
    return signOut(auth);
}

// Liest lokale Daten nur aus.
// Es werden keine Daten gespeichert oder hochgeladen.
function createLocalPreview() {
    const readNumber = (key, fallback) => {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;

        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
    };

    const readJson = (key, fallback) => {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;

        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    };

    const xp = readNumber("littleRealmXP", 0);
    const level = readNumber("littleRealmLevel", 1);
    const tasks = readJson("littleRealmTasks", []);
    const streaks = readJson("littleRealmStreaks", {});

    const issues = [];

    if (!Number.isSafeInteger(xp) || xp < 0) {
        issues.push("XP-Wert ist ungültig.");
    }

    if (!Number.isSafeInteger(level) || level < 1) {
        issues.push("Level-Wert ist ungültig.");
    }

    if (!Array.isArray(tasks)) {
        issues.push("Aufgabenliste ist ungültig.");
    }

    if (
        !streaks ||
        typeof streaks !== "object" ||
        Array.isArray(streaks)
    ) {
        issues.push("Streak-Daten sind ungültig.");
    }

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const seenIds = new Set();

    for (const task of safeTasks) {
        if (
            !task ||
            typeof task !== "object" ||
            task.id === undefined ||
            task.id === null
        ) {
            issues.push("Eine Aufgabe hat keine gültige ID.");
            break;
        }

        const id = String(task.id);

        if (seenIds.has(id)) {
            issues.push("Doppelte Aufgaben-IDs gefunden.");
            break;
        }

        seenIds.add(id);
    }

    const safeStreaks =
        streaks &&
        typeof streaks === "object" &&
        !Array.isArray(streaks)
            ? streaks
            : {};

    return {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        xp,
        level,
        tasks: safeTasks,
        streaks: safeStreaks,
        summary: {
            taskCount: safeTasks.length,
            completedTaskCount: safeTasks.filter(
                task => task && task.completed === true
            ).length,
            streakCount: Object.keys(safeStreaks).length
        },
        issues
    };
}

function getSyncStatus() {
    return {
        initialized: LITTLE_REALM_SYNC.initialized,
        user: LITTLE_REALM_SYNC.user,
        status: LITTLE_REALM_SYNC.status
    };
}

const signInButton =
    document.getElementById("google-sign-in");
const signOutButton =
    document.getElementById("google-sign-out");
const authStatus =
    document.getElementById("cloud-auth-status");
const syncButton =
    document.getElementById("cloud-sync-now");
const syncStatus =
    document.getElementById("cloud-sync-status");
const mergePreview =
    document.getElementById("cloud-merge-preview");

if (
    signInButton &&
    signOutButton &&
    authStatus &&
    syncButton &&
    syncStatus
) {
    signInButton.addEventListener("click", async () => {
        authStatus.textContent =
            "Google-Anmeldung wird geöffnet …";
        signInButton.disabled = true;

        try {
            await signInWithGoogle();
        } catch (error) {
            console.error(
                "Google-Anmeldung fehlgeschlagen:",
                error
            );

            authStatus.textContent =
                "Anmeldung fehlgeschlagen. Bitte versuche es erneut.";
        } finally {
            signInButton.disabled = false;
        }
    });

    signOutButton.addEventListener("click", async () => {
        try {
            await signOutGoogle();
        } catch (error) {
            console.error(
                "Abmeldung fehlgeschlagen:",
                error
            );

            authStatus.textContent =
                "Abmeldung fehlgeschlagen. Bitte versuche es erneut.";
        }
    });

    // Bleibt deaktiviert, bis die echte Synchronisierung sicher ist.
    syncButton.disabled = true;
    syncButton.title =
        "Noch deaktiviert: Datenabgleich und Regeln müssen zuerst abgesichert werden.";
}

onAuthStateChanged(auth, user => {
    LITTLE_REALM_SYNC.user = user;
    
    if (mergePreview) {
    const preview = createMergePreview();

    mergePreview.textContent = JSON.stringify(
        preview,
        null,
        2
    );
}
    LITTLE_REALM_SYNC.status =
        user ? "signed-in" : "signed-out";

    console.info(
        "Little Realm Anmeldung:",
        user ? "angemeldet" : "nicht angemeldet"
    );

    if (
        !signInButton ||
        !signOutButton ||
        !authStatus ||
        !syncButton ||
        !syncStatus
    ) {
        return;
    }

    signInButton.hidden = Boolean(user);
    signOutButton.hidden = !user;
    syncButton.disabled = true;

    authStatus.textContent = user
        ? `Angemeldet als ${user.email || "Google-Konto"}`
        : "Noch nicht mit Google angemeldet.";

    if (user) {
        const preview = createLocalPreview();

        console.info(
            "Little Realm – lokale Datenprüfung:",
            preview
        );

        if (preview.issues.length > 0) {
            syncStatus.textContent =
                `Anmeldung erfolgreich. ${preview.issues.length} Hinweis(e) bei der Datenprüfung. Details stehen in der Browser-Konsole. Es wurde nichts hochgeladen.`;
        } else {
            syncStatus.textContent =
                `Anmeldung erfolgreich. ${preview.summary.taskCount} Aufgaben, ` +
                `${preview.summary.completedTaskCount} erledigt, ` +
                `${preview.xp} XP, Level ${preview.level}. ` +
                "Es wurde nichts verändert oder hochgeladen.";
        }
    } else {
        syncStatus.textContent =
            "Bitte melde dich an, um die Synchronisierung vorzubereiten.";
    }
});


function createMergePreview() {
    const local = createLocalPreview();
    const issues = [...local.issues];

    const tasksById = new Map();

    for (const task of local.tasks) {
        if (!Number.isSafeInteger(task.id) || task.id <= 0) {
            issues.push(
                `Aufgabe "${task.name || "Unbenannt"}" hat keine stabile ID.`
            );
            continue;
        }

        tasksById.set(task.id, task);
    }

    return {
        schemaVersion: 1,
        mode: "preview-only",
        local: {
            xp: local.xp,
            level: local.level,
            taskCount: local.summary.taskCount,
            completedTaskCount: local.summary.completedTaskCount
        },
        tasks: {
            total: local.tasks.length,
            uniqueIds: tasksById.size,
            duplicateIds: local.tasks.length - tasksById.size
        },
        streaks: {
            count: local.summary.streakCount
        },
        issues,
        writesToFirebase: false,
        changesLocalData: false
    };
}

export {
    auth,
    db,
    LITTLE_REALM_SYNC,
    signInWithGoogle,
    signOutGoogle,
    getSyncStatus,
    createLocalPreview,
    createMergePreview
};

