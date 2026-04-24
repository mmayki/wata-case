// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let tasks = [];
let currentFilter = "all";
let currentMonth = new Date();
let leaderboard = [];
let selectedDate = new Date().toISOString().split("T")[0];

// ============ ЗАГРУЗКА СТРАНИЦЫ ============
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Дашборд загружен");

  const userName = localStorage.getItem("userName") || "Ученик";
  document.getElementById("userName").textContent = userName;

  await loadLeaderboard();
  await loadTasksFromServer();
  await loadSchedule();
  updateCalendar();
  updateStats();

  // Фильтры
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Кнопка добавления задачи
  const addTaskBtn = document.getElementById("addTaskBtn");
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", showAddTaskModal);
  }

  // Кнопки навигации месяца
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  if (prevMonthBtn)
    prevMonthBtn.addEventListener("click", () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      updateCalendar();
    });
  if (nextMonthBtn)
    nextMonthBtn.addEventListener("click", () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      updateCalendar();
    });
});

// ============ ЗАГРУЗКА ЗАДАЧ С СЕРВЕРА ============
async function loadTasksFromServer() {
  const userId = localStorage.getItem("userId");
  try {
    // Пытаемся загрузить задачи с сервера
    const serverTasks = await apiRequest(`/tasks/${userId}`);
    if (serverTasks && serverTasks.length > 0) {
      tasks = serverTasks;
    } else {
      // Задачи по умолчанию
      tasks = [
        {
          id: 1,
          title: "Проект по истории. Тема: Династия Романовых",
          date: "2026-04-19",
          completed: false,
          points: 10,
        },
        {
          id: 2,
          title: "Химия. Конспект по учебнику, стр 270–275",
          date: "2026-04-19",
          completed: false,
          points: 10,
        },
        {
          id: 3,
          title: "Геометрия. Решение задач 607–610 подробно",
          date: "2026-04-20",
          completed: false,
          points: 15,
        },
        {
          id: 4,
          title: "Сдать проект по математике",
          date: "2026-04-23",
          completed: false,
          points: 20,
        },
        {
          id: 5,
          title: "Подготовиться к контрольной",
          date: "2026-04-23",
          completed: false,
          points: 5,
        },
      ];
    }
    renderTasks();
    updateStats();
  } catch (error) {
    console.log("Загрузка задач с сервера, использую локальные");
    tasks = [
      {
        id: 1,
        title: "Проект по истории. Тема: Династия Романовых",
        date: "2026-04-19",
        completed: false,
        points: 10,
      },
      {
        id: 2,
        title: "Химия. Конспект по учебнику, стр 270–275",
        date: "2026-04-19",
        completed: false,
        points: 10,
      },
      {
        id: 3,
        title: "Геометрия. Решение задач 607–610 подробно",
        date: "2026-04-20",
        completed: false,
        points: 15,
      },
      {
        id: 4,
        title: "Сдать проект по математике",
        date: "2026-04-23",
        completed: false,
        points: 20,
      },
      {
        id: 5,
        title: "Подготовиться к контрольной",
        date: "2026-04-23",
        completed: false,
        points: 5,
      },
    ];
    renderTasks();
    updateStats();
  }
}

function saveTasksToServer() {
  const userId = localStorage.getItem("userId");
  // Сохраняем задачи на сервер (опционально)
  apiRequest("/tasks", "POST", { userId, tasks }).catch((e) =>
    console.log("Сохранение на сервер не удалось"),
  );
}

// ============ ОТОБРАЖЕНИЕ ЗАДАЧ ============
function renderTasks() {
  const container = document.getElementById("tasksList");
  if (!container) return;

  let filtered = tasks;
  if (currentFilter === "active") {
    filtered = tasks.filter((t) => !t.completed);
  }

  // Сортируем по дате
  filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-tasks">✨ Нет задач</div>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (task) => `
        <div class="task-item ${task.completed ? "completed" : ""}" data-id="${task.id}">
            <div class="task-info">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <div class="task-meta">
                    <span class="task-date">📅 ${formatDate(task.date)}</span>
                    <span class="task-points">⭐ +${task.points} баллов</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-complete-btn ${task.completed ? "completed" : ""}" 
                        onclick="completeTask(${task.id})">
                    ${task.completed ? "✅ Выполнено" : "○ Отметить готовность"}
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

// ============ ОТМЕТКА ГОТОВНОСТИ ЗАДАЧИ ============
window.completeTask = function (taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task && !task.completed) {
    task.completed = true;

    // Добавляем баллы пользователю
    addPointsToUser(task.points);

    saveTasksToServer();
    renderTasks();
    updateCalendar();
    updateStats();
    loadLeaderboard(); // Обновляем рейтинг

    // Показываем уведомление
    showNotification(`✅ +${task.points} баллов!`, "success");
  }
};

// ============ ЗАГРУЗКА БАЛЛОВ С СЕРВЕРА ============
async function loadUserPoints() {
  const userId = localStorage.getItem("userId");
  try {
    const data = await apiRequest(`/user-points/${userId}`, "GET", null, false);
    return data.points || 0;
  } catch (error) {
    console.log("Ошибка загрузки баллов:", error);
    return 0;
  }
}

async function saveUserPoints(points) {
  const userId = localStorage.getItem("userId");
  try {
    await apiRequest("/user-points", "POST", { userId, points }, false);
  } catch (error) {
    console.log("Ошибка сохранения баллов:", error);
  }
}

// ============ НАЧИСЛЕНИЕ БАЛЛОВ ============
async function addPointsToUser(points) {
  const currentPoints = await loadUserPoints();
  const newPoints = currentPoints + points;
  await saveUserPoints(newPoints);
  updateStats();
  await loadLeaderboard();
  return newPoints;
}

// ============ ОБНОВЛЕНИЕ СТАТИСТИКИ ============
async function updateStats() {
  const totalPoints = await loadUserPoints();
  const pointsToday = tasks
    .filter(
      (t) => t.completed && t.date === new Date().toISOString().split("T")[0],
    )
    .reduce((sum, t) => sum + t.points, 0);

  const userScoreEl = document.getElementById("userScore");
  const todayScoreEl = document.getElementById("todayScore");
  if (userScoreEl) userScoreEl.textContent = totalPoints;
  if (todayScoreEl) todayScoreEl.textContent = pointsToday;

  // Обновляем прогресс
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? (completed / total) * 100 : 0;

  const circleSmall = document.getElementById("progressFillSmall");
  const textSmall = document.getElementById("progressPercentSmall");

  if (circleSmall) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percent / 100);
    circleSmall.style.strokeDasharray = circumference;
    circleSmall.style.strokeDashoffset = offset;
  }

  if (textSmall) {
    textSmall.textContent = `${Math.round(percent)}%`;
  }
}

// ============ ТАБЛИЦА ЛИДЕРОВ ============
async function loadLeaderboard() {
  console.log("📊 Загрузка лидерборда...");
  const container = document.getElementById("leaderboardList");
  if (!container) return;

  try {
    const leaderboardData = await apiRequest(
      "/leaderboard",
      "GET",
      null,
      false,
    );
    console.log("🏆 Лидерборд:", leaderboardData);

    if (!leaderboardData || leaderboardData.length === 0) {
      container.innerHTML = '<div class="empty-state">🏆 Нет данных</div>';
      return;
    }

    const currentUserId = localStorage.getItem("userId");

    container.innerHTML = leaderboardData
      .map((student, index) => {
        let trend = "";
        if (index === 0) trend = "↑";
        else if (index === leaderboardData.length - 1) trend = "↓";
        else trend = "→";

        return `
                <div class="leaderboard-item ${index === 0 ? "first" : ""}">
                    <span class="leaderboard-rank">${index + 1}</span>
                    <span class="leaderboard-name">${student.full_name} ${student.id == currentUserId ? "👤" : ""}</span>
                    <span class="leaderboard-points">${student.points} ${trend}</span>
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Ошибка загрузки лидерборда:", error);
    container.innerHTML = '<div class="empty-state">⚠️ Ошибка загрузки</div>';
  }
}

// ============ ОТМЕТКА ГОТОВНОСТИ ЗАДАЧИ ============
window.completeTask = async function (taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task && !task.completed) {
    task.completed = true;

    // Добавляем баллы пользователю
    await addPointsToUser(task.points);

    saveTasksToServer();
    renderTasks();
    updateCalendar();
    await updateStats();
    await loadLeaderboard();

    showNotification(`✅ +${task.points} баллов!`, "success");
  }
};

// ============ ДОБАВЛЕНИЕ ЗАДАЧИ ============
function showAddTaskModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <strong>➕ Новая задача</strong>
                <button class="modal-close">&times;</button>
            </div>
            <input type="text" id="newTaskTitle" class="modal-input" placeholder="Название задачи">
            <input type="date" id="newTaskDate" class="modal-input" value="${new Date().toISOString().split("T")[0]}">
            <input type="number" id="newTaskPoints" class="modal-input" placeholder="Баллы за выполнение" value="10">
            <div class="modal-buttons">
                <button id="cancelTaskBtn" class="btn-outline">Отмена</button>
                <button id="saveTaskBtn" class="btn">Добавить</button>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.querySelector("#cancelTaskBtn").onclick = () => modal.remove();
  modal.querySelector("#saveTaskBtn").onclick = () => {
    const title = document.getElementById("newTaskTitle").value.trim();
    const date = document.getElementById("newTaskDate").value;
    const points =
      parseInt(document.getElementById("newTaskPoints").value) || 10;

    if (!title) {
      alert("Введите название задачи");
      return;
    }

    const newId =
      tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    tasks.push({ id: newId, title, date, points, completed: false });
    saveTasksToServer();
    renderTasks();
    updateCalendar();
    modal.remove();
  };
}

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
function formatDate(dateStr) {
  if (!dateStr) return "Дата не указана";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  const date = new Date(year, month, day);
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return `${days[date.getDay()]} ${day}.${month + 1}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============ КАЛЕНДАРЬ (оставляем как есть) ============
function updateCalendar() {
  const monthTitle = document.getElementById("currentMonth");
  const calendarWeek = document.getElementById("calendarWeek");
  if (!calendarWeek) return;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  monthTitle.textContent = `${currentMonth.toLocaleString("ru", { month: "long" })} ${year}`;

  const today = new Date();
  const currentDate = new Date(year, month, today.getDate());

  const startOfWeek = new Date(currentDate);
  const dayOfWeek = currentDate.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(currentDate.getDate() - diff);

  let html = "";
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    const dayNum = date.getDate();
    const dayName = date.toLocaleString("ru", { weekday: "short" });
    const isToday = date.toDateString() === new Date().toDateString();
    const dateStr = date.toISOString().split("T")[0];
    const hasTasks = tasks.some((t) => t.date === dateStr);
    const isSelected = selectedDate === dateStr;

    html += `
            <div class="calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${hasTasks ? "has-tasks" : ""}" 
                 data-date="${dateStr}">
                <div class="day-name">${dayName}</div>
                <div class="day-number">${dayNum}</div>
                ${hasTasks ? '<div class="task-dot"></div>' : ""}
            </div>
        `;
  }

  calendarWeek.innerHTML = html;

  document.querySelectorAll(".calendar-day[data-date]").forEach((day) => {
    day.addEventListener("click", () => {
      selectedDate = day.dataset.date;
      filterTasksByDate(selectedDate);
      document
        .querySelectorAll(".calendar-day")
        .forEach((d) => d.classList.remove("selected"));
      day.classList.add("selected");
    });
  });
}

function filterTasksByDate(date) {
  const filtered = tasks.filter((t) => t.date === date);
  const container = document.getElementById("tasksList");

  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-tasks">📭 Нет задач на этот день</div>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (task) => `
        <div class="task-item ${task.completed ? "completed" : ""}">
            <div class="task-info">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <div class="task-meta">
                    <span class="task-points">⭐ +${task.points} баллов</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-complete-btn ${task.completed ? "completed" : ""}" 
                        onclick="window.completeTask(${task.id})">
                    ${task.completed ? "✅ Выполнено" : "○ Отметить готовность"}
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

// ============ РАСПИСАНИЕ ============
async function loadSchedule() {
  const className = localStorage.getItem("className") || "7А";
  console.log("📅 Загрузка расписания для:", className);

  try {
    const scheduleData = await apiRequest(
      `/schedule/${className}`,
      "GET",
      null,
      false,
    );
    const today = new Date();
    let dayOfWeek = today.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const todaySchedule = scheduleData.filter(
      (s) => s.day_of_week === dayOfWeek,
    );
    renderSchedule(todaySchedule);
  } catch (error) {
    console.error("Ошибка расписания:", error);
  }
}

function renderSchedule(scheduleData) {
  const container = document.getElementById("scheduleTimeline");
  if (!container) return;

  if (!scheduleData || scheduleData.length === 0) {
    container.innerHTML = "<p>📭 Сегодня уроков нет</p>";
    return;
  }

  const lessonTimes = {
    1: "08:30 - 09:15",
    2: "09:25 - 10:10",
    3: "10:20 - 11:05",
    4: "11:15 - 12:00",
    5: "12:10 - 12:55",
    6: "13:05 - 13:50",
  };
  const sorted = [...scheduleData].sort(
    (a, b) => a.lesson_number - b.lesson_number,
  );

  container.innerHTML = sorted
    .map(
      (lesson) => `
        <div class="schedule-item">
            <div class="schedule-time">⏰ ${lessonTimes[lesson.lesson_number] || "---"}</div>
            <div class="schedule-title">📖 ${lesson.subject || "Предмет"}</div>
            <div class="schedule-desc">${lesson.lesson_number}-й урок</div>
        </div>
    `,
    )
    .join("");
}
