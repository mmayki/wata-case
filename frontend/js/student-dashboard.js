// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let tasks = [];
let currentFilter = "all";
let currentMonth = new Date();
let leaderboard = [];

// ============ ЗАГРУЗКА СТРАНИЦЫ ============
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Дашборд загружен");

  const userName = localStorage.getItem("userName") || "Ученик";
  const userNameEl = document.getElementById("userName");
  if (userNameEl) userNameEl.textContent = userName;

  await loadLeaderboard();
  loadTasksFromLocal();
  await loadSchedule();
  updateCalendar();
  updateProgress();

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

  // Кнопка назад
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "student-dashboard-old.html";
    });
  }

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

// ============ ТАБЛИЦА ЛИДЕРОВ ============
async function loadLeaderboard() {
  console.log("📊 Загрузка лидерборда...");
  const container = document.getElementById("leaderboardList");
  if (!container) return;

  try {
    const students = await apiRequest("/students");
    console.log("✅ Студенты получены:", students);

    const withAvg = await Promise.all(
      students.map(async (student) => {
        try {
          const grades = await apiRequest(`/grades/${student.id}`);
          const avg =
            grades.length > 0
              ? (
                  grades.reduce((sum, g) => sum + g.grade, 0) / grades.length
                ).toFixed(1)
              : 0;
          return { ...student, avg: parseFloat(avg) };
        } catch (e) {
          return { ...student, avg: 0 };
        }
      }),
    );

    leaderboard = withAvg.sort((a, b) => b.avg - a.avg);
    renderLeaderboard();
  } catch (error) {
    console.error("❌ Ошибка загрузки лидерборда:", error);
    container.innerHTML = '<div class="empty-state">⚠️ Ошибка загрузки</div>';
  }
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboardList");
  const currentUserId = localStorage.getItem("userId");

  if (!container) return;

  if (leaderboard.length === 0) {
    container.innerHTML = '<div class="empty-state">🏆 Нет данных</div>';
    return;
  }

  container.innerHTML = leaderboard
    .map(
      (student, index) => `
        <div class="leaderboard-item ${index < 3 ? "leaderboard-top" : ""}">
            <span class="leaderboard-rank">${index + 1}</span>
            <span>${student.full_name} ${student.id == currentUserId ? "👤" : ""}</span>
            <span>${student.avg} ⭐</span>
        </div>
    `,
    )
    .join("");
}

// ============ ЗАДАЧИ ============
function loadTasksFromLocal() {
  const saved = localStorage.getItem("studentTasks");
  if (saved) {
    tasks = JSON.parse(saved);
  } else {
    tasks = [
      {
        id: 1,
        title: "Прочитать параграф 5",
        date: "2026-04-22",
        completed: true,
      },
      {
        id: 2,
        title: "Сдать проект по математике",
        date: "2026-04-23",
        completed: false,
      },
      {
        id: 3,
        title: "Подготовиться к контрольной",
        date: "2026-04-23",
        completed: false,
      },
      {
        id: 4,
        title: "Решить 5 уравнений",
        date: "2026-04-24",
        completed: false,
      },
    ];
  }
  renderTasks();
}

function saveTasks() {
  localStorage.setItem("studentTasks", JSON.stringify(tasks));
  updateProgress();
  updateCalendar();
}

function renderTasks() {
  const container = document.getElementById("tasksList");
  if (!container) return;

  let filtered = tasks;
  if (currentFilter === "active") {
    filtered = tasks.filter((t) => !t.completed);
  }

  filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-tasks">✨ Нет задач</div>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (task) => `
        <div class="task-item ${task.completed ? "completed" : ""}">
            <div class="task-info">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <span class="task-date">📅 ${formatDate(task.date)}</span>
            </div>
            <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""} 
                   onchange="window.toggleTask(${task.id})">
        </div>
    `,
    )
    .join("");
}

window.toggleTask = function (taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
    updateCalendar();
  }
};

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

function updateProgress() {
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? (completed / total) * 100 : 0;

  const circle = document.getElementById("progressFill");
  const text = document.getElementById("progressPercent");

  if (circle) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percent / 100);
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
  }
  if (text) text.textContent = `${Math.round(percent)}%`;
}

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

    if (!title) {
      alert("Введите название задачи");
      return;
    }

    const newId =
      tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    tasks.push({ id: newId, title, date, completed: false });
    saveTasks();
    renderTasks();
    modal.remove();
  };
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
    console.error("❌ Ошибка расписания:", error);
    document.getElementById("scheduleTimeline").innerHTML =
      "<p>❌ Ошибка загрузки</p>";
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

// ============ КАЛЕНДАРЬ ============
function updateCalendar() {
  const monthTitle = document.getElementById("currentMonth");
  const calendarWeek = document.getElementById("calendarWeek");
  if (!calendarWeek) return;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  monthTitle.textContent = `${currentMonth.toLocaleString("ru", { month: "long" })} ${year}`;

  // Получаем сохранённую выбранную дату или сегодня
  const savedSelectedDate = localStorage.getItem("selectedDate");
  const today = new Date();
  const currentDate = new Date(year, month, today.getDate());

  // Находим начало недели (понедельник)
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = currentDate.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(currentDate.getDate() - diff);

  // Показываем 7 дней (с понедельника по воскресенье)
  let html = "";
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    const dayNum = date.getDate();
    const dayName = date.toLocaleString("ru", { weekday: "short" });
    const isToday = date.toDateString() === new Date().toDateString();
    const dateStr = date.toISOString().split("T")[0];
    const hasTasks = tasks.some((t) => t.date === dateStr);
    const isSelected = savedSelectedDate === dateStr;

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
      const date = day.dataset.date;
      if (date) {
        // Сохраняем выбранную дату
        localStorage.setItem("selectedDate", date);
        filterTasksByDate(date);

        // Обновляем классы выделения
        document.querySelectorAll(".calendar-day").forEach((d) => {
          d.classList.remove("selected");
        });
        day.classList.add("selected");
      }
    });
  });
}

function filterTasksByDate(date) {
  const filtered = tasks.filter((t) => t.date === date);
  const container = document.getElementById("tasksList");
  const monthTitle = document.getElementById("currentMonth");

  if (!container) return;

  // Показываем выбранную дату
  const formattedDate = formatDate(date);
  if (monthTitle && date) {
    // Можно добавить подзаголовок с выбранной датой
  }

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
            </div>
            <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""} 
                   onchange="window.toggleTask(${task.id})">
        </div>
    `,
    )
    .join("");
}

// ============ ПОДСЧЁТ БАЛЛОВ ============
function calculateUserScore() {
  // Подсчитываем баллы на основе выполненных задач
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;

  // За каждый выполненную задачу +10 баллов
  const scoreFromTasks = completedTasks * 10;

  // Баллы за оценки (если есть)
  let scoreFromGrades = 0;
  const userId = localStorage.getItem("userId");

  // Асинхронно получаем оценки и обновляем
  apiRequest(`/grades/${userId}`)
    .then((grades) => {
      if (grades && grades.length > 0) {
        const avgGrade =
          grades.reduce((sum, g) => sum + g.grade, 0) / grades.length;
        scoreFromGrades = Math.round(avgGrade * 10);
        document.getElementById("userScore").textContent =
          scoreFromTasks + scoreFromGrades;
      }
    })
    .catch(() => {
      document.getElementById("userScore").textContent = scoreFromTasks;
    });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayCompleted = tasks.filter(
    (t) => t.date === todayStr && t.completed,
  ).length;
  document.getElementById("todayScore").textContent = todayCompleted * 10;

  return scoreFromTasks;
}

function updateProgress() {
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? (completed / total) * 100 : 0;

  const circleBig = document.getElementById("progressFill");
  if (circleBig) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percent / 100);
    circleBig.style.strokeDasharray = circumference;
    circleBig.style.strokeDashoffset = offset;
  }

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

  // Подсчёт баллов
  calculateUserScore();
}
