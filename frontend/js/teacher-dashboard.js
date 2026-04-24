// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let students = [];
let homework = [];
let classStats = [];

// ============ ЗАГРУЗКА СТРАНИЦЫ ============
document.addEventListener("DOMContentLoaded", async () => {
  console.log("👩‍🏫 Дашборд учителя загружен");

  const userName = localStorage.getItem("userName") || "Учитель";
  document.getElementById("userName").textContent = userName;

  await loadStudents();
  await loadHomework();
  await loadClassStats();
  await loadStats();

  // Кнопка выхода
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Поставить оценку
  const addGradeBtn = document.getElementById("addGradeBtn");
  if (addGradeBtn) addGradeBtn.addEventListener("click", addGrade);

  // Задать домашку
  const addHomeworkBtn = document.getElementById("addHomeworkBtn");
  if (addHomeworkBtn) addHomeworkBtn.addEventListener("click", addHomework);
});

// ============ ЗАГРУЗКА УЧЕНИКОВ ============
async function loadStudents() {
  try {
    students = await apiRequest("/students");
    const select = document.getElementById("studentSelect");

    if (select && students) {
      select.innerHTML = students
        .map(
          (s) =>
            `<option value="${s.id}">${s.full_name} (${s.class_name})</option>`,
        )
        .join("");
    }

    document.getElementById("studentsCount").textContent = students.length;
  } catch (error) {
    console.error("Ошибка загрузки учеников:", error);
  }
}

// ============ ЗАГРУЗКА ДОМАШНИХ ЗАДАНИЙ ============
async function loadHomework() {
  const className = document.getElementById("classSelect")?.value || "7А";
  try {
    homework = await apiRequest(`/homework/${className}`, "GET", null, false);
    renderHomework();
    document.getElementById("homeworkCount").textContent = homework.length;
    document.getElementById("tasksCount").textContent = homework.length;
  } catch (error) {
    console.error("Ошибка загрузки ДЗ:", error);
  }
}

function renderHomework() {
  const container = document.getElementById("homeworkList");
  if (!container) return;

  if (homework.length === 0) {
    container.innerHTML =
      '<div class="empty-state">📭 Нет активных заданий</div>';
    return;
  }

  container.innerHTML = homework
    .map(
      (h) => `
        <div class="homework-item">
            <div class="homework-info">
                <h4>📖 ${h.subject || "Предмет"}</h4>
                <p>${h.description}</p>
                <div class="homework-meta">
                    <span>📅 ${h.due_date ? formatDate(h.due_date) : "Без срока"}</span>
                    <span class="homework-points">⭐ +${h.points || 10} баллов</span>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

// ============ ЗАГРУЗКА УСПЕВАЕМОСТИ ============
async function loadClassStats() {
  try {
    const studentsList = await apiRequest("/students");
    const stats = [];

    for (const student of studentsList) {
      const grades = await apiRequest(`/grades/${student.id}`);
      const avg =
        grades.length > 0
          ? (
              grades.reduce((sum, g) => sum + g.grade, 0) / grades.length
            ).toFixed(1)
          : 0;
      stats.push({
        ...student,
        avg: avg,
        gradesCount: grades.length,
      });
    }

    classStats = stats.sort((a, b) => b.avg - a.avg);
    renderClassStats();

    const totalAvg =
      stats.reduce((sum, s) => sum + parseFloat(s.avg), 0) / stats.length;
    document.getElementById("avgGrade").textContent = totalAvg.toFixed(1);
  } catch (error) {
    console.error("Ошибка загрузки статистики:", error);
  }
}

function renderClassStats() {
  const container = document.getElementById("classStats");
  if (!container) return;

  if (classStats.length === 0) {
    container.innerHTML = '<div class="empty-state">📊 Нет данных</div>';
    return;
  }

  container.innerHTML = `
        <table>
            <thead>
                <tr><th>Ученик</th><th>Класс</th><th>Оценок</th><th>Средний балл</th></tr>
            </thead>
            <tbody>
                ${classStats
                  .map(
                    (s) => `
                    <tr>
                        <td>${s.full_name}</td>
                        <td>${s.class_name}</td>
                        <td>${s.gradesCount}</td>
                        <td><strong>${s.avg}</strong> ⭐</td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>
    `;
}

// ============ ПОСТАВИТЬ ОЦЕНКУ ============
async function addGrade() {
  const studentId = document.getElementById("studentSelect").value;
  const subject = document.getElementById("gradeSubject").value.trim();
  const grade = document.getElementById("gradeValue").value;

  if (!subject) {
    alert("Введите предмет");
    return;
  }

  try {
    await apiRequest("/grades", "POST", {
      studentId: parseInt(studentId),
      subjectName: subject,
      grade: parseInt(grade),
    });

    alert("✅ Оценка поставлена!");
    document.getElementById("gradeSubject").value = "";
    await loadClassStats();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============ ЗАДАТЬ ДОМАШНЕЕ ЗАДАНИЕ ============
async function addHomework() {
  const className = document.getElementById("classSelect").value;
  const subject = document.getElementById("homeworkSubject").value.trim();
  const description = document.getElementById("homeworkDesc").value.trim();
  const dueDate = document.getElementById("dueDate").value;
  const points = document.getElementById("homeworkPoints").value;

  if (!subject || !description) {
    alert("Заполните предмет и описание");
    return;
  }

  try {
    await apiRequest("/homework", "POST", {
      className: className,
      subjectName: subject,
      description: description,
      dueDate: dueDate || null,
      points: parseInt(points) || 10,
    });

    alert("✅ Домашнее задание добавлено!");
    document.getElementById("homeworkSubject").value = "";
    document.getElementById("homeworkDesc").value = "";
    document.getElementById("dueDate").value = "";
    document.getElementById("homeworkPoints").value = "10";

    await loadHomework();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============ ЗАГРУЗКА СТАТИСТИКИ ДАШБОРДА ============
async function loadStats() {
  await loadStudents();
  await loadHomework();
  await loadClassStats();
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}
