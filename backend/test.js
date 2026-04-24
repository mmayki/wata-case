const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const users = [
  {
    id: 1,
    username: "alice",
    password: "123",
    full_name: "Алиса С.",
    role: "student",
    class_name: "7А",
  },
  {
    id: 2,
    username: "teacher1",
    password: "admin",
    full_name: "Мария Ивановна",
    role: "teacher",
  },
];

// Логин
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );

  if (!user) {
    return res.status(401).json({ error: "Неверные данные" });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, "secret");
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

app.get("/api/grades/:studentId", (req, res) => {
  res.json([
    { id: 1, grade: 5, date: "2024-04-20", subject: "Математика" },
    { id: 2, grade: 4, date: "2024-04-19", subject: "Русский язык" },
  ]);
});

app.get("/api/homework/:className", (req, res) => {
  res.json([
    {
      id: 1,
      subject: "Математика",
      description: "№345, стр 56",
      due_date: null,
    },
    {
      id: 2,
      subject: "Русский язык",
      description: "Упражнение 120",
      due_date: "2024-04-25",
    },
  ]);
});

app.get("/api/schedule/:className", (req, res) => {
  res.json([
    { day_of_week: 1, lesson_number: 1, subject: "Математика" },
    { day_of_week: 1, lesson_number: 2, subject: "Русский язык" },
  ]);
});

app.get("/api/students", (req, res) => {
  res.json([{ id: 1, full_name: "Алиса С.", class_name: "7А" }]);
});

app.post("/api/grades", (req, res) => {
  res.json({ success: true });
});

app.post("/api/homework", (req, res) => {
  res.json({ success: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("✅ ТЕСТОВЫЙ СЕРВЕР РАБОТАЕТ на http://localhost:3000");
  console.log("📝 Логин: alice/123 или teacher1/admin");
});
