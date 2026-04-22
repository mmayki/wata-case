const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { pool, initDB } = require("./db");
const { login, register, verifyToken } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

// Инициализация БД
initDB();

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
    const { username, password } = req.body;
    const result = await login(username, password);
    if (!result) {
      return res.status(401).json({ error: "Неверные данные" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить оценки ученика
app.get("/api/grades/:studentId", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `
      SELECT g.id, g.grade, g.date, s.name as subject, u.full_name as teacher_name
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      JOIN users u ON g.teacher_id = u.id
      WHERE g.student_id = $1
      ORDER BY g.date DESC
    `,
      [studentId],
    );
    res.json(result.rows);
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
    let subject = await pool.query("SELECT id FROM subjects WHERE name = $1", [
      subjectName,
    ]);
    let subjectId;
    if (subject.rows.length === 0) {
      const newSubject = await pool.query(
        "INSERT INTO subjects (name) VALUES ($1) RETURNING id",
        [subjectName],
      );
      subjectId = newSubject.rows[0].id;
    } else {
      subjectId = subject.rows[0].id;
    }

    await pool.query(
      "INSERT INTO grades (student_id, subject_id, grade, teacher_id) VALUES ($1, $2, $3, $4)",
      [studentId, subjectId, grade, req.user.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить домашнее задание для класса
app.get("/api/homework/:className", async (req, res) => {
  try {
    const { className } = req.params;
    const result = await pool.query(
      `
      SELECT h.id, h.description, h.due_date, s.name as subject
      FROM homework h
      JOIN subjects s ON h.subject_id = s.id
      WHERE h.class_name = $1 AND (h.due_date >= CURRENT_DATE OR h.due_date IS NULL)
      ORDER BY h.created_at DESC
    `,
      [className],
    );
    res.json(result.rows);
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

    let subject = await pool.query("SELECT id FROM subjects WHERE name = $1", [
      subjectName,
    ]);
    let subjectId;
    if (subject.rows.length === 0) {
      const newSubject = await pool.query(
        "INSERT INTO subjects (name) VALUES ($1) RETURNING id",
        [subjectName],
      );
      subjectId = newSubject.rows[0].id;
    } else {
      subjectId = subject.rows[0].id;
    }

    await pool.query(
      "INSERT INTO homework (class_name, subject_id, description, due_date) VALUES ($1, $2, $3, $4)",
      [className, subjectId, description, dueDate],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить расписание
app.get("/api/schedule/:className", async (req, res) => {
  try {
    const { className } = req.params;
    const result = await pool.query(
      `
      SELECT s.day_of_week, s.lesson_number, sub.name as subject
      FROM schedule s
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE s.class_name = $1
      ORDER BY s.day_of_week, s.lesson_number
    `,
      [className],
    );
    res.json(result.rows);
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
    const result = await pool.query(
      "SELECT id, username, full_name, class_name FROM users WHERE role = $1",
      ["student"],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
