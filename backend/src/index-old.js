const express = require("express");
const cors = require("cors");
require("dotenv").config();
const supabase = require("./supabase");
const { login, register, verifyToken } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

app.use((err, req, res, next) => {
  console.error("❌ Ошибка:", err);
  res.status(500).json({ error: err.message });
});

// Middleware для проверки авторизации
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Нет токена" });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Неверный токен" });
  }
  req.user = decoded;
  next();
}

// ========== РОУТЫ ==========

// Регистрация
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, fullName, role, className } = req.body;
    const user = await register(username, password, fullName, role, className);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Логин
app.post("/api/login", async (req, res) => {
  try {
    console.log("📝 Попытка входа:", req.body.username);
    const { username, password } = req.body;
    const result = await login(username, password);
    if (!result) {
      return res.status(401).json({ error: "Неверные данные" });
    }
    res.json(result);
  } catch (err) {
    console.error("❌ Ошибка в login:", err);
    res.status(500).json({ error: err.message });
  }
});

// Получить оценки ученика
app.get("/api/grades/:studentId", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    const { data, error } = await supabase
      .from("grades")
      .select(
        `
        id,
        grade,
        date,
        subjects (name),
        users!grades_teacher_id_fkey (full_name)
      `,
      )
      .eq("student_id", studentId)
      .order("date", { ascending: false });

    if (error) throw error;

    // Форматируем ответ
    const formatted = data.map((g) => ({
      id: g.id,
      grade: g.grade,
      date: g.date,
      subject: g.subjects?.name,
      teacher_name: g.users?.full_name,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Поставить оценку (только учитель)
app.post("/api/grades", authMiddleware, async (req, res) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Доступ только учителям" });
  }

  try {
    const { studentId, subjectName, grade } = req.body;

    // Найти или создать предмет
    let { data: subject, error: findError } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subjectName)
      .single();

    let subjectId;
    if (!subject) {
      const { data: newSubject, error: createError } = await supabase
        .from("subjects")
        .insert([{ name: subjectName }])
        .select("id")
        .single();

      if (createError) throw createError;
      subjectId = newSubject.id;
    } else {
      subjectId = subject.id;
    }

    // Вставляем оценку
    const { error: insertError } = await supabase.from("grades").insert([
      {
        student_id: studentId,
        subject_id: subjectId,
        grade: grade,
        teacher_id: req.user.id,
        date: new Date().toISOString().split("T")[0],
      },
    ]);

    if (insertError) throw insertError;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить домашнее задание для класса
app.get("/api/homework/:className", async (req, res) => {
  try {
    const { className } = req.params;

    const { data, error } = await supabase
      .from("homework")
      .select(
        `
        id,
        description,
        due_date,
        created_at,
        subjects (name)
      `,
      )
      .eq("class_name", className)
      .or(
        `due_date.is.null,due_date.gte.${new Date().toISOString().split("T")[0]}`,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = data.map((h) => ({
      id: h.id,
      description: h.description,
      due_date: h.due_date,
      subject: h.subjects?.name,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Задать домашнее задание (учитель)
app.post("/api/homework", authMiddleware, async (req, res) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Доступ только учителям" });
  }

  try {
    const { className, subjectName, description, dueDate } = req.body;

    // Найти или создать предмет
    let { data: subject, error: findError } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subjectName)
      .single();

    let subjectId;
    if (!subject) {
      const { data: newSubject, error: createError } = await supabase
        .from("subjects")
        .insert([{ name: subjectName }])
        .select("id")
        .single();

      if (createError) throw createError;
      subjectId = newSubject.id;
    } else {
      subjectId = subject.id;
    }

    // Вставляем домашку
    const { error: insertError } = await supabase.from("homework").insert([
      {
        class_name: className,
        subject_id: subjectId,
        description: description,
        due_date: dueDate || null,
      },
    ]);

    if (insertError) throw insertError;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить расписание
app.get("/api/schedule/:className", async (req, res) => {
  try {
    const { className } = req.params;

    const { data, error } = await supabase
      .from("schedule")
      .select(
        `
        day_of_week,
        lesson_number,
        subjects (name)
      `,
      )
      .eq("class_name", className)
      .order("day_of_week")
      .order("lesson_number");

    if (error) throw error;

    const formatted = data.map((s) => ({
      day_of_week: s.day_of_week,
      lesson_number: s.lesson_number,
      subject: s.subjects?.name,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Список учеников (для учителя)
app.get("/api/students", authMiddleware, async (req, res) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Доступ только учителям" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, class_name")
      .eq("role", "student");

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📊 Supabase подключён: ${process.env.SUPABASE_URL}`);
});
