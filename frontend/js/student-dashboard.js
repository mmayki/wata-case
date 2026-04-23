let currentFilter = "all";
let tasks = [];
let leaderboard = [];
let schedule = [];

document.addEventListener("DOMContentLoaded", async () => {
  const userName = localStorage.getItem("userName");
  document.getElementById("userName").textContent = userName || "Ученик";

  await loadLeaderboard();
  await loadTasks();
  await loadSchedule();
  setupCalendar();

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

  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "student-dashboard.html";
  });
});

async function loadLeaderboard() {
  try {
    // Получаем всех учеников с их средним баллом
    const students = await apiRequest("/students");

    // Для каждого ученика получаем оценки
    const withAvg = await Promise.all(
      students.map(async (student) => {
        const grades = await apiRequest(`/grades/${student.id}`);
        const avg =
          grades.length > 0
            ? (
                grades.reduce((sum, g) => sum + g.grade, 0) / grades.length
              ).toFixed(1)
            : 0;
        return {
          ...student,
          avg: parseFloat(avg),
        };
      }),
    );

    // Сортируем по среднему баллу
    leaderboard = withAvg.sort((a, b) => b.avg - a.avg);

    renderLeaderboard();
  } catch (error) {
    console.error("Ошибка загрузки лидерборда:", error);
  }
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboardList");
  const currentUserId = localStorage.getItem("userId");

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

async function loadTasks() {
  // Пример задач (можно расширить)
  tasks = [
    {
      id: 1,
      title: "Сдать проект по математике",
      date: "2026-04-23",
      completed: false,
    },
    {
      id: 2,
      title: "Подготовиться к контрольной",
      date: "2026-04-24",
      completed: false,
    },
    {
      id: 3,
      title: "Прочитать параграф 5",
      date: "2026-04-22",
      completed: true,
    },
    {
      id: 4,
      title: "Решить 5 уравнений",
      date: "2026-04-23",
      completed: false,
    },
  ];
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById("tasksList");
  let filtered = tasks;

  if (currentFilter === "active") {
    filtered = tasks.filter((t) => !t.completed);
  }

  container.innerHTML = filtered
    .map(
      (task) => `
        <div class="task-item ${task.completed ? "completed" : ""}">
            <span>${task.title}</span>
            <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""} 
                   onchange="toggleTask(${task.id})">
        </div>
    `,
    )
    .join("");
}

function toggleTask(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    renderTasks();
    updateProgress();
  }
}

function updateProgress() {
  const completed = tasks.filter((t) => t.completed).length;
  const percent = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

  const circle = document.getElementById("progressFill");
  const text = document.getElementById("progressPercent");
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = offset;
  text.textContent = `${Math.round(percent)}%`;
}

async function loadSchedule() {
  const className = localStorage.getItem("className") || "7А";
  try {
    const scheduleData = await apiRequest(
      `/schedule/${className}`,
      "GET",
      null,
      false,
    );

    // Текущее время для примера
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // ПН=1, ВС=7

    const todaySchedule = scheduleData.filter(
      (s) => s.day_of_week === dayOfWeek,
    );

    renderSchedule(todaySchedule);
  } catch (error) {
    console.error("Ошибка загрузки расписания:", error);
  }
}

function renderSchedule(scheduleData) {
  const container = document.getElementById("scheduleTimeline");
  const timeSlots = [
    "08:00",
    "09:30",
    "11:00",
    "12:30",
    "14:00",
    "15:30",
    "17:00",
  ];

  container.innerHTML = scheduleData
    .map(
      (item, index) => `
        <div class="schedule-item">
            <div class="schedule-time">${timeSlots[index] || "---"}</div>
            <div class="schedule-title">📖 ${item.subject}</div>
            <div class="schedule-desc">Урок ${item.lesson_number}</div>
        </div>
    `,
    )
    .join("");

  if (scheduleData.length === 0) {
    container.innerHTML = "<p>Нет уроков на сегодня</p>";
  }
}

function setupCalendar() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const currentDate = new Date();
  const month = currentDate.toLocaleString("ru", {
    month: "long",
    year: "numeric",
  });
  document.getElementById("currentMonth").textContent = month;

  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);

  const container = document.getElementById("calendarWeek");

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayNum = date.getDate();
    const isToday = date.toDateString() === new Date().toDateString();

    container.innerHTML += `
            <div class="calendar-day ${isToday ? "active" : ""}">
                <div class="day-name">${days[i]}</div>
                <div class="day-number">${dayNum}</div>
            </div>
        `;
  }
}
