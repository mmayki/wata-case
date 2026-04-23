document.addEventListener("DOMContentLoaded", async () => {
  // Отображаем имя
  const userName = localStorage.getItem("userName");
  const userNameEl = document.getElementById("userName");
  if (userNameEl) userNameEl.textContent = userName;

  // Загружаем данные
  await loadGrades();
  await loadHomework();
  await loadSchedule();

  // Кнопка выхода
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
});

async function loadGrades() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("gradesList");
  if (!container) return;

  try {
    const grades = await apiRequest(`/grades/${userId}`);

    console.log("Полученные оценки:", grades); // Для отладки

    if (!grades || grades.length === 0) {
      container.innerHTML = "<p>📭 Пока нет оценок</p>";
      return;
    }

    // Группируем по предметам
    const grouped = {};
    grades.forEach((g) => {
      // Исправление: предмет может быть в g.subject или g.subjects?.name
      const subjectName = g.subject || g.subjects?.name || "Без названия";
      if (!grouped[subjectName]) grouped[subjectName] = [];
      grouped[subjectName].push(g.grade);
    });

    let html = "";
    for (const [subject, marks] of Object.entries(grouped)) {
      const sum = marks.reduce((a, b) => a + b, 0);
      const avg = (sum / marks.length).toFixed(1);
      html += `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">📖 ${subject}</div>
                    <div>
                        ${marks.map((m) => `<span class="grade">${m}</span>`).join("")}
                        <span class="badge" style="margin-left: 10px;">ср. ${avg}</span>
                    </div>
                </div>
            `;
    }
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = "<p>❌ Ошибка загрузки оценок</p>";
    console.error(error);
  }
}

async function loadHomework() {
  const className = localStorage.getItem("className") || "7А";
  const container = document.getElementById("homeworkList");
  if (!container) return;

  try {
    const homework = await apiRequest(
      `/homework/${className}`,
      "GET",
      null,
      false,
    );

    console.log("Полученное ДЗ:", homework);

    if (!homework || homework.length === 0) {
      container.innerHTML = "<p>📭 Нет домашнего задания</p>";
      return;
    }

    let html = "";
    homework.forEach((h) => {
      // Исправление: предмет может быть в h.subject или h.subjects?.name
      const subjectName = h.subject || h.subjects?.name || "Без названия";
      html += `
                <div class="homework-item">
                    <strong>📚 ${subjectName}</strong>
                    <p style="margin-top: 8px;">${h.description}</p>
                    ${h.due_date ? `<small>📅 Срок: ${h.due_date}</small>` : ""}
                </div>
            `;
    });
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = "<p>❌ Ошибка загрузки заданий</p>";
    console.error(error);
  }
}

async function loadSchedule() {
  const className = localStorage.getItem("className") || "7А";
  const container = document.getElementById("scheduleList");
  if (!container) return;

  try {
    const schedule = await apiRequest(
      `/schedule/${className}`,
      "GET",
      null,
      false,
    );

    console.log("Полученное расписание:", schedule);

    if (!schedule || schedule.length === 0) {
      container.innerHTML = "<p>📭 Нет расписания</p>";
      return;
    }

    const days = [
      "Понедельник",
      "Вторник",
      "Среда",
      "Четверг",
      "Пятница",
      "Суббота",
    ];
    const grouped = {};

    schedule.forEach((s) => {
      // Исправление: предмет может быть в s.subject или s.subjects?.name
      const subjectName = s.subject || s.subjects?.name || "Без названия";
      if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
      grouped[s.day_of_week].push({
        lesson_number: s.lesson_number,
        subject: subjectName,
      });
    });

    let html = "";
    for (let day = 1; day <= 6; day++) {
      if (grouped[day]) {
        html += `<div style="margin-bottom: 16px;"><strong>📅 ${days[day - 1]}</strong><br>`;
        grouped[day].forEach((lesson) => {
          html += `<span class="badge" style="margin: 4px;">${lesson.lesson_number}. ${lesson.subject}</span>`;
        });
        html += `</div>`;
      }
    }
    container.innerHTML = html || "<p>Расписание не загружено</p>";
  } catch (error) {
    container.innerHTML = "<p>❌ Ошибка загрузки расписания</p>";
    console.error(error);
  }
}
