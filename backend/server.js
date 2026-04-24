const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const JWT_SECRET = "test_secret";

// ============ ЛОГИН ============
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("🔐 Логин:", username, "Пароль:", password);

  // Сначала просто посмотрим, есть ли пользователь
  const { data: userByName, error: nameError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  console.log("👤 Пользователь по имени:", userByName);

  if (!userByName) {
    return res.status(401).json({ error: "Пользователь не найден" });
  }

  // Теперь проверяем пароль
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("plain_password", password)
    .maybeSingle();

  console.log("🔑 Результат проверки пароля:", user ? "Найден" : "Не найден");
  console.log("📝 Пароль в БД:", userByName.plain_password);
  console.log("📝 Введённый пароль:", password);

  if (error || !user) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
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
});

// ============ РЕГИСТРАЦИЯ ============
app.post("/api/register", async (req, res) => {
  console.log("📥 ПОЛУЧЕН ЗАПРОС НА РЕГИСТРАЦИЮ");
  console.log("📦 Тело запроса:", req.body);

  const { full_name, username, password, role, class_name } = req.body;

  // Проверяем, что все поля есть
  if (!full_name || !username || !password || !role) {
    console.log("❌ Ошибка: не все поля заполнены");
    return res.status(400).json({ error: "Заполните все обязательные поля" });
  }

  try {
    // Проверяем, существует ли пользователь
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    console.log(
      "🔍 Проверка существования:",
      existing ? "Найден" : "Не найден",
    );

    if (existing) {
      console.log("❌ Пользователь уже существует");
      return res
        .status(400)
        .json({ error: "Пользователь с таким логином уже существует" });
    }

    // Создаём нового пользователя
    const newUserData = {
      username: username,
      plain_password: password,
      full_name: full_name,
      role: role,
      class_name: class_name || null,
    };

    console.log("📝 Данные для вставки:", newUserData);

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([newUserData])
      .select("id, username, full_name, role, class_name")
      .single();

    if (insertError) {
      console.error("❌ Ошибка вставки в БД:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log("✅ Пользователь зарегистрирован:", newUser);

    res.status(201).json({
      success: true,
      message: "Регистрация успешна",
      user: newUser,
    });
  } catch (err) {
    console.error("❌ Критическая ошибка:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ВОССТАНОВЛЕНИЕ ПАРОЛЯ ============
app.post("/api/reset-password", async (req, res) => {
  const { username, newPassword } = req.body;

  try {
    const { data, error } = await supabase
      .from("users")
      .update({ plain_password: newPassword })
      .eq("username", username)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({ success: true, message: "Пароль обновлён" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ОЦЕНКИ ============
app.get("/api/grades/:studentId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("grades")
      .select("id, grade, date, subjects(name)")
      .eq("student_id", req.params.studentId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ДОМАШКА ============
app.get("/api/homework/:className", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("homework")
      .select("id, description, due_date, subjects(name)")
      .eq("class_name", req.params.className);

    if (error) throw error;
    res.json(data || []);
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
                subject_id,
                subjects!inner (name)
            `,
      )
      .eq("class_name", req.params.className);

    if (error) throw error;

    const formatted = (data || []).map((s) => ({
      day_of_week: s.day_of_week,
      lesson_number: s.lesson_number,
      subject: s.subjects?.name || "Неизвестный предмет",
    }));

    console.log("📅 Расписание для", req.params.className, ":", formatted);
    res.json(formatted);
  } catch (err) {
    console.error("Ошибка расписания:", err);
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

// ============ ПОСТАВИТЬ ОЦЕНКУ ============
app.post("/api/grades", async (req, res) => {
  const { studentId, subjectName, grade } = req.body;

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

// ============ ЗАДАТЬ ДОМАШКУ ============
app.post("/api/homework", async (req, res) => {
  const { className, subjectName, description, dueDate, points } = req.body;

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

  await supabase.from("homework").insert([
    {
      class_name: className,
      subject_id: subject.id,
      description: description,
      due_date: dueDate || null,
      points: points || 10,
    },
  ]);
});

// ============ ПОЛУЧИТЬ БАЛЛЫ ПОЛЬЗОВАТЕЛЯ ============
app.get("/api/user-points/:userId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", req.params.userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    res.json({ points: data?.points || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ОБНОВИТЬ БАЛЛЫ ПОЛЬЗОВАТЕЛЯ ============
app.post("/api/user-points", async (req, res) => {
  const { userId, points } = req.body;

  try {
    // Проверяем, есть ли запись
    const { data: existing } = await supabase
      .from("user_points")
      .select("id")
      .eq("user_id", userId)
      .single();

    let result;
    if (existing) {
      // Обновляем существующую
      result = await supabase
        .from("user_points")
        .update({ points, updated_at: new Date() })
        .eq("user_id", userId);
    } else {
      // Создаём новую
      result = await supabase
        .from("user_points")
        .insert([{ user_id: userId, points }]);
    }

    if (result.error) throw result.error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ТАБЛИЦА ЛИДЕРОВ (все пользователи с баллами) ============
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_points")
      .select(
        `
                points,
                users!inner (id, full_name, role)
            `,
      )
      .eq("users.role", "student")
      .order("points", { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map((item) => ({
      id: item.users.id,
      full_name: item.users.full_name,
      points: item.points || 0,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ HEALTH ============
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер на http://localhost:${PORT}`);
});
