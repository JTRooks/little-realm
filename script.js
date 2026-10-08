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

function loadTasks() {
	try {
		const savedTasks = JSON.parse(
			localStorage.getItem("littleRealmTasks") || "[]"
		);

		if (!Array.isArray(savedTasks)) {
			return [];
		}

		return savedTasks
			.filter(
				(task) =>
					task &&
					typeof (task.name ?? task.text) === "string"
			)
			.map((task, index) => ({
				id: Number.isSafeInteger(task.id)
					? task.id
					: index + 1,

				name: task.name ?? task.text,

				xp:
					Number.isFinite(task.xp) && task.xp > 0
						? task.xp
						: 20,

				difficulty:
					typeof task.difficulty === "string"
						? task.difficulty
						: "normal",

repeat:
	typeof task.repeat === "string"
		? task.repeat
		: "none",

				date:
					typeof task.date === "string"
						? task.date
						: "",

				time:
					typeof task.time === "string"
						? task.time
						: "",

				reminder: Boolean(task.reminder),

				reminderSent: Boolean(task.reminderSent),

				completed: Boolean(task.completed)
			}));
	} catch {
		return [];
	}
}

function saveProgress() {
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

function completeTask(taskId) {
    const task = tasks.find(
        (item) => item.id === taskId
    );

    if (!task || task.completed) {
        return;
    }

    // Streak für diese Aufgabe erhöhen
    streaks[task.id] = (streaks[task.id] || 0) + 1;

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
	const [year, month, day] = dateString
		.split("-")
		.map(Number);

	const date = new Date(year, month - 1, day);

	if (Number.isNaN(date.getTime())) {
		return dateString;
	}

	if (repeat === "daily") {
		date.setDate(date.getDate() + 1);
	}

	if (repeat === "weekly") {
		date.setDate(date.getDate() + 7);
	}

	if (repeat === "monthly") {
		date.setMonth(date.getMonth() + 1);
	}

	const nextYear = date.getFullYear();
	const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
	const nextDay = String(date.getDate()).padStart(2, "0");

	return `${nextYear}-${nextMonth}-${nextDay}`;
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