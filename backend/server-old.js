const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase клиент
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const JWT_SECRET = process.env.JWT_SECRET || "hackathon_secret_2024";

// ============ МИДЛВЭР ДЛЯ ПРОВЕРКИ ТОКЕНА ============
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Нет токена" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Неверный токен" });
  }
};

// ============ ЛОГИН (БЕЗ ХЭШЕЙ!) ============
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("📝 Вход:", username, "Пароль:", password);

  try {
    // Ищем пользователя по username и plain_password
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, full_name, role, class_name, plain_password")
      .eq("username", username)
      .eq("plain_password", password)
      .single();

    if (error || !user) {
      console.log("❌ Неверный логин или пароль");
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    console.log("✅ Пользователь найден:", user.username);

    // Создаём токен
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        class_name: user.class_name,
      },
    });
  } catch (err) {
    console.error("❌ Ошибка:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ПОЛУЧИТЬ ОЦЕНКИ ============
app.get("/api/grades/:studentId", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("grades")
      .select(
        `
                id,
                grade,
                date,
                subjects (name)
            `,
      )
      .eq("student_id", req.params.studentId)
      .order("date", { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map((g) => ({
      id: g.id,
      grade: g.grade,
      date: g.date,
      subject: g.subjects?.name,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ПОСТАВИТЬ ОЦЕНКУ ============
app.post("/api/grades", authMiddleware, async (req, res) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Доступ только учителям" });
  }

  const { studentId, subjectName, grade } = req.body;

  try {
    // Найти или создать предмет
    let { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subjectName)
      .single();

    if (!subject) {
      const { data: newSubject } = await supabase
        .from("subjects")
        .insert([{ name: subjectName }])
        .select("id")
        .single();
      subject = newSubject;
    }

    // Добавить оценку
    await supabase.from("grades").insert([
      {
        student_id: studentId,
        subject_id: subject.id,
        grade: grade,
        date: new Date().toISOString().split("T")[0],
      },
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ПОЛУЧИТЬ ДОМАШНЕЕ ЗАДАНИЕ ============
app.get("/api/homework/:className", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("homework")
      .select(
        `
                id,
                description,
                due_date,
                subjects (name)
            `,
      )
      .eq("class_name", req.params.className)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map((h) => ({
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

// ============ ЗАДАТЬ ДОМАШНЕЕ ЗАДАНИЕ ============
app.post("/api/homework", authMiddleware, async (req, res) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Доступ только учителям" });
  }

  const { className, subjectName, description, dueDate } = req.body;

  try {
    let { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subjectName)
      .single();

    if (!subject) {
      const { data: newSubject } = await supabase
        .from("subjects")
        .insert([{ name: subjectName }])
        .select("id")
        .single();
      subject = newSubject;
    }

    await supabase.from("homework").insert([
      {
        class_name: className,
        subject_id: subject.id,
        description: description,
        due_date: dueDate || null,
      },
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ПОЛУЧИТЬ РАСПИСАНИЕ ============
app.get("/api/schedule/:className", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("schedule")
      .select(
        `
                day_of_week,
                lesson_number,
                subjects (name)
            `,
      )
      .eq("class_name", req.params.className)
      .order("day_of_week")
      .order("lesson_number");

    if (error) throw error;

    const formatted = (data || []).map((s) => ({
      day_of_week: s.day_of_week,
      lesson_number: s.lesson_number,
      subject: s.subjects?.name,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ СПИСОК УЧЕНИКОВ ============
app.get("/api/students", authMiddleware, async (req, res) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Доступ только учителям" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, class_name")
      .eq("role", "student")
      .order("full_name");

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ HEALTH CHECK ============
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ ЗАПУСК ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("\n=================================");
  console.log("✅ СЕРВЕР ЗАПУЩЕН");
  console.log(`📡 Порт: ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log("📝 Логин: alice/123 или teacher1/admin");
  console.log("=================================\n");
});
