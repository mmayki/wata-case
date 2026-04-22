const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const JWT_SECRET = process.env.JWT_SECRET || "hackathon_secret_2024";

// ============ ЛОГИН ============
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("📝 Login:", username);

  try {
    // Ищем пользователя
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) {
      console.log("❌ User not found");
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    // Проверяем пароль
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log("❌ Wrong password");
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    // Создаем токен
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
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ПОЛУЧИТЬ ОЦЕНКИ ============
app.get("/api/grades/:studentId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("grades")
      .select(
        `
                id,
                grade,
                date,
                subject:subjects(name)
            `,
      )
      .eq("student_id", req.params.studentId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ПОСТАВИТЬ ОЦЕНКУ ============
app.post("/api/grades", async (req, res) => {
  const { studentId, subjectName, grade } = req.body;

  try {
    // Находим или создаем предмет
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

    // Добавляем оценку
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

// ============ ДОМАШНЕЕ ЗАДАНИЕ ============
app.get("/api/homework/:className", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("homework")
      .select(
        `
                id,
                description,
                due_date,
                subject:subjects(name)
            `,
      )
      .eq("class_name", req.params.className);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/homework", async (req, res) => {
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

// ============ РАСПИСАНИЕ ============
app.get("/api/schedule/:className", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("schedule")
      .select(
        `
                day_of_week,
                lesson_number,
                subject:subjects(name)
            `,
      )
      .eq("class_name", req.params.className)
      .order("day_of_week")
      .order("lesson_number");

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ СПИСОК УЧЕНИКОВ ============
app.get("/api/students", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, class_name")
      .eq("role", "student");

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
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL}`);
});
