let xp = Number(localStorage.getItem("littleRealmXP")) || 0;
let level = Number(localStorage.getItem("littleRealmLevel")) || 1;
let tasks = loadTasks();
let streaks = JSON.parse(
    localStorage.getItem("littleRealmStreaks")
) || {};

const xpNeeded = 100;

const xpText = document.getElementById("xp-text");
const xpProgress = document.getElementById("xp-progress");
const levelText = document.getElementById("level");

const taskInput = document.getElementById("new-task-input");
const difficultySelect = document.getElementById("new-task-difficulty");
const taskDateInput = document.getElementById("new-task-date");
const taskTimeInput = document.getElementById("new-task-time");
const taskRepeatInput = document.getElementById("new-task-repeat");
const taskReminderInput = document.getElementById("new-task-reminder");

const addTaskButton = document.getElementById("add-task-button");
const taskList = document.getElementById("task-list");

const reminderStatus = document.getElementById("reminder-status");
const testNotificationButton = document.getElementById(
	"test-notification-button"
);
const backupButton = document.getElementById("backup-button");

const restoreButton = document.getElementById("restore-button");

const restoreFileInput = document.createElement("input");


restoreFileInput.type = "file";
restoreFileInput.accept = ".json,application/json";
restoreFileInput.style.display = "none";

document.body.appendChild(restoreFileInput);



function loadTasks() {
    try {
        const savedTasks = JSON.parse(
            localStorage.getItem("littleRealmTasks") || "[]"
        );

        if (!Array.isArray(savedTasks)) {
            return [];
        }

        const allowedDifficulties = [
            "small",
            "normal",
            "large",
            "huge"
        ];

        const allowedRepeats = [
            "none",
            "daily",
            "weekly",
            "monthly"
        ];

        const validTasks = savedTasks
            .filter((task) =>
                task &&
                typeof (task.name ?? task.text) === "string" &&
                (task.name ?? task.text).trim().length > 0
            )
            .map((task, index) => {
                const difficulty = allowedDifficulties.includes(
                    task.difficulty
                )
                    ? task.difficulty
                    : "normal";

                const repeat = allowedRepeats.includes(task.repeat)
                    ? task.repeat
                    : "none";

                const xp = Number.isSafeInteger(task.xp) &&
                    task.xp > 0 &&
                    task.xp <= 1000
                    ? task.xp
                    : 20;

                return {
                    id: Number.isSafeInteger(task.id) && task.id > 0
                        ? task.id
                        : index + 1,

                    name: (task.name ?? task.text).trim(),
                    xp,
                    difficulty,
                    repeat,

                    date: typeof task.date === "string"
                        ? task.date
                        : "",

                    time: typeof task.time === "string"
                        ? task.time
                        : "",

                    reminder: task.reminder === true,
                    reminderSent: task.reminderSent === true,
                    completed: task.completed === true
                };
            });

        // Doppelte IDs entfernen, damit nicht mehrere Aufgaben
        // versehentlich dieselbe Identität verwenden.
        const usedIds = new Set();

        return validTasks.filter((task) => {
            if (usedIds.has(task.id)) {
                return false;
            }

            usedIds.add(task.id);
            return true;
        });
    } catch {
        alert(
            "⚠️ Die gespeicherten Aufgaben konnten nicht gelesen werden."
        );
        return [];
    }
}



function saveProgress() {
    if (
        !Number.isSafeInteger(xp) ||
        xp < 0 ||
        xp >= xpNeeded ||
        !Number.isSafeInteger(level) ||
        level < 1 ||
        !Array.isArray(tasks)
    ) {
        alert(
            "⚠️ Little Realm hat ungültige Fortschrittsdaten erkannt. Speichern wurde abgebrochen."
        );
        return;
    }

    localStorage.setItem("littleRealmXP", xp);
    localStorage.setItem("littleRealmLevel", level);

    localStorage.setItem(
        "littleRealmTasks",
        JSON.stringify(tasks)
    );
}


function updateXP() {
	xpText.textContent = `${xp} / ${xpNeeded} XP`;
	levelText.textContent = level;

	const percentage = Math.min(
		(xp / xpNeeded) * 100,
		100
	);

	xpProgress.style.width = `${percentage}%`;

	saveProgress();
}

function getDifficultyXP(difficulty) {
	switch (difficulty) {
		case "small":
			return 10;

		case "normal":
			return 20;

		case "large":
			return 30;

		case "huge":
			return 50;

		default:
			return 20;
	}
}

function getDifficultyName(difficulty) {
	switch (difficulty) {
		case "small":
			return "🌱 Kleine Aufgabe";

		case "normal":
			return "🌿 Normale Aufgabe";

		case "large":
			return "🌳 Größere Aufgabe";

		case "huge":
			return "⭐ Große Aufgabe";

		default:
			return "🌿 Normale Aufgabe";
	}
}

function addTask() {
	const taskName = taskInput.value.trim();

	if (!taskName) {
		taskInput.focus();
		return;
	}

	const difficulty =
		difficultySelect?.value || "normal";

	const taskXP = getDifficultyXP(difficulty);

	const nextId =
		tasks.reduce(
			(maxId, task) =>
				Math.max(maxId, task.id),
			0
		) + 1;

	const newTask = {
		id: nextId,
		name: taskName,
		xp: taskXP,
		difficulty: difficulty,
		repeat: taskRepeatInput?.value || "none",
		date: taskDateInput.value,
		time: taskTimeInput.value,
		reminder: taskReminderInput.checked,
		reminderSent: false,
		completed: false
	};

	tasks.push(newTask);

	taskInput.value = "";
	taskDateInput.value = "";
	taskTimeInput.value = "";
	taskReminderInput.checked = false;

	saveProgress();
	renderTasks();

	taskInput.focus();
}

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
function completeTask(taskId) {
    const task = tasks.find(
        (item) => item.id === taskId
    );

    if (!task || task.completed) {
        return;
    }

    const today = getLocalDateString();

    const previousDate = streaks[task.id]?.lastDate;
    const previousCount = streaks[task.id]?.count || 0;

    let nextCount = 1;

    if (previousDate) {
        const previous = new Date(`${previousDate}T12:00:00`);
        const current = new Date(`${today}T12:00:00`);

        const daysSinceLastCompletion = Math.round(
            (current - previous) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastCompletion === 0) {
            nextCount = previousCount;
        } else if (daysSinceLastCompletion === 1) {
            nextCount = previousCount + 1;
        }
    }

    streaks[task.id] = {
        count: nextCount,
        lastDate: today
    };

    if (task.repeat && task.repeat !== "none" && task.date) {
        task.date = getNextRepeatDate(
            task.date,
            task.repeat
        );

        task.reminderSent = false;
        task.completed = false;
    } else {
        task.completed = true;
    }

    xp += task.xp;

    while (xp >= xpNeeded) {
        xp -= xpNeeded;
        level++;

        alert(
            `✨ Dein Little Realm wächst! Du bist jetzt Level ${level}!`
        );
    }

    localStorage.setItem(
        "littleRealmStreaks",
        JSON.stringify(streaks)
    );

    saveProgress();
    updateXP();
    renderTasks();
}

function getNextRepeatDate(dateString, repeat) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

    if (!match) {
        return dateString;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);

    // Ungültige Kalenderdaten erkennen
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return dateString;
    }

    if (repeat === "daily") {
        date.setDate(date.getDate() + 1);
    } else if (repeat === "weekly") {
        date.setDate(date.getDate() + 7);
    } else if (repeat === "monthly") {
        // Im Folgemonat den letzten gültigen Tag verwenden
        const originalDay = date.getDate();
        const nextMonth = date.getMonth() + 1;

        date.setDate(1);
        date.setMonth(nextMonth);

        const lastDay = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
        ).getDate();

        date.setDate(Math.min(originalDay, lastDay));
    } else {
        return dateString;
    }

    const nextYear = date.getFullYear();
    const nextMonthString = String(date.getMonth() + 1).padStart(2, "0");
    const nextDayString = String(date.getDate()).padStart(2, "0");

    return `${nextYear}-${nextMonthString}-${nextDayString}`;
}


function formatDate(dateString) {
	if (!dateString) {
		return "";
	}

	const date = new Date(
		`${dateString}T00:00:00`
	);

	if (Number.isNaN(date.getTime())) {
		return dateString;
	}

	return date.toLocaleDateString(
		"de-DE",
		{
			day: "2-digit",
			month: "2-digit",
			year: "numeric"
		}
	);
}

function renderTasks() {
	taskList.replaceChildren();

	if (tasks.length === 0) {
		const emptyMessage =
			document.createElement("p");

		emptyMessage.textContent =
			"🌱 Noch keine Aufgaben. Erstelle deine erste Aufgabe!";

		taskList.append(emptyMessage);

		return;
	}

	for (const task of tasks) {
		const taskElement =
			document.createElement("div");

		taskElement.className = "task";

		if (task.completed) {
			taskElement.classList.add("completed");
		}

		const taskInfo =
			document.createElement("div");

		const taskName =
			document.createElement("span");

		taskName.textContent = task.name;

		const taskDetails =
			document.createElement("small");

		const details = [];
		if (streaks[task.id]?.count > 0) {
    
			details.push(`🔥 Streak: ${streaks[task.id].count}`);
}

		details.push(`+${task.xp} XP`);

		if (task.difficulty) {
			details.push(
				getDifficultyName(task.difficulty)
			);
		}

		if (task.date) {
			details.push(
				`📅 ${formatDate(task.date)}`
			);
		}

		if (task.time) {
			details.push(
				`🕐 ${task.time}`
			);
		}

		if (task.reminder) {
			details.push(
				"🔔 Erinnerung"
			);
		}
		if (task.repeat && task.repeat !== "none") {
    const repeatNames = {
        daily: "🔁 Jeden Tag",
        weekly: "🔁 Jede Woche",
        monthly: "🔁 Jeden Monat"
    };

    details.push(
        repeatNames[task.repeat] || "🔁 Wiederholung"
    );
}

		taskDetails.textContent =
			details.join(" • ");

		taskInfo.append(
			taskName,
			document.createElement("br"),
			taskDetails
		);

		const button =
			document.createElement("button");

		button.type = "button";

		button.textContent =
			task.completed
				? "✓ Erledigt"
				: "Erledigt";

		button.disabled =
			task.completed;

		button.addEventListener(
			"click",
			() => completeTask(task.id)
		);

		taskElement.append(
			taskInfo,
			button
		);

		taskList.append(taskElement);
	}
}

function updateReminderStatus(message) {
	if (!reminderStatus) {
		return;
	}

	reminderStatus.textContent = message;
}

async function requestNotificationPermission() {
	if (!("Notification" in window)) {
		updateReminderStatus(
			"⚠️ Dieser Browser unterstützt keine Benachrichtigungen."
		);

		return false;
	}

	if (Notification.permission === "granted") {
		updateReminderStatus(
			"🔔 Erinnerungen sind aktiviert."
		);

		return true;
	}

	if (Notification.permission === "denied") {
		updateReminderStatus(
			"⚠️ Benachrichtigungen sind blockiert."
		);

		return false;
	}

	try {
		const permission =
			await Notification.requestPermission();

		if (permission === "granted") {
			updateReminderStatus(
				"🔔 Erinnerungen sind aktiviert."
			);

			return true;
		}

		updateReminderStatus(
			"⚠️ Benachrichtigungen wurden nicht freigegeben."
		);

		return false;
	} catch {
		updateReminderStatus(
			"⚠️ Benachrichtigungen konnten nicht aktiviert werden."
		);

		return false;
	}
}

function checkReminders() {
	if (
		!("Notification" in window) ||
		Notification.permission !== "granted"
	) {
		return;
	}

	const now = new Date();

	for (const task of tasks) {
		if (
			task.completed ||
			!task.reminder ||
			!task.date ||
			!task.time ||
			task.reminderSent
		) {
			continue;
		}

		const reminderDate =
			new Date(
				`${task.date}T${task.time}:00`
			);

		if (
			Number.isNaN(
				reminderDate.getTime()
			)
		) {
			continue;
		}

		if (
			now.getTime() >=
			reminderDate.getTime()
		) {
			try {
				new Notification(
					"🌿 Little Realm",
					{
						body:
							`⏰ Zeit für: ${task.name}`,
						tag:
							`little-realm-task-${task.id}`
					}
				);

				task.reminderSent = true;

				saveProgress();
				renderTasks();

				updateReminderStatus(
					`🔔 Erinnerung für „${task.name}“ wurde gesendet.`
				);
			} catch (error) {
				console.error(
					"Little Realm Reminder Error:",
					error
				);

				updateReminderStatus(
					`❌ Erinnerung konnte nicht angezeigt werden.`
				);
			}
		}
	}
}

addTaskButton.addEventListener(
	"click",
	addTask
);

taskInput.addEventListener(
	"keydown",
	(event) => {
		if (event.key === "Enter") {
			addTask();
		}
	}
);

if (taskReminderInput) {
	taskReminderInput.addEventListener(
		"change",
		async () => {
			if (taskReminderInput.checked) {
				await requestNotificationPermission();
			} else {
				updateReminderStatus("");
			}
		}
	);
}

if (testNotificationButton) {
	testNotificationButton.addEventListener(
		"click",
		async () => {
			const allowed =
				await requestNotificationPermission();

			if (!allowed) {
				return;
			}

			try {
				new Notification(
					"🌿 Little Realm",
					{
						body:
							"🔔 Test erfolgreich! Little Realm kann dich benachrichtigen.",
						tag:
							"little-realm-test"
					}
				);

				updateReminderStatus(
					"🔔 Test-Benachrichtigung wurde an Firefox übergeben..."
				);
			} catch (error) {
				console.error(
					"Little Realm Notification Error:",
					error
				);

				updateReminderStatus(
					"❌ Benachrichtigung fehlgeschlagen."
				);
			}
		}
	);
}

updateXP();
renderTasks();

if (
	"Notification" in window &&
	Notification.permission === "granted"
) {
	updateReminderStatus(
		"🔔 Erinnerungen sind aktiviert."
	);
}

setInterval(
	checkReminders,
	15000
);

checkReminders();


function exportLittleRealmBackup() {
    alert("Backup-Funktion wurde gestartet!");

    const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        xp: xp,
        level: level,
        tasks: tasks,
        streaks: streaks
    };

    const content = JSON.stringify(backup, null, 2);

    const blob = new Blob(
        [content],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "little-realm-backup.json";
    link.click();

    URL.revokeObjectURL(url);
}

if (backupButton) {
    backupButton.addEventListener("click", function () {
        alert("Der Backup-Button funktioniert!");
        exportLittleRealmBackup();
    });
} else {
    alert("Der Backup-Button wurde nicht gefunden!");
}


function restoreLittleRealmBackup(file) {
    const reader = new FileReader();

    reader.onload = function () {
        try {
            const backup = JSON.parse(reader.result);

            if (
                !backup ||
                backup.version !== 1 ||
                !Array.isArray(backup.tasks) ||
                !Number.isFinite(backup.xp) ||
                !Number.isFinite(backup.level) ||
                !backup.streaks ||
                typeof backup.streaks !== "object"
            ) {
                alert("Diese Backup-Datei ist ungültig.");
                return;
            }

            if (!confirm(
                "Deine aktuellen Daten werden durch das Backup ersetzt. Fortfahren?"
            )) {
                return;
            }

            xp = backup.xp;
            level = backup.level;
            tasks = backup.tasks;
            streaks = backup.streaks;

            localStorage.setItem(
                "littleRealmStreaks",
                JSON.stringify(streaks)
            );

            saveProgress();
            updateXP();
            renderTasks();

            alert("✨ Dein Little Realm wurde wiederhergestellt!");
        } catch {
            alert("Die Backup-Datei konnte nicht gelesen werden.");
        }
    };

    reader.readAsText(file);
}

if (restoreButton) {
    restoreButton.addEventListener("click", function () {
        restoreFileInput.click();
    });
}

restoreFileInput.addEventListener("change", function () {
    const file = restoreFileInput.files[0];

    if (file) {
        restoreLittleRealmBackup(file);
    }

    restoreFileInput.value = "";
});
