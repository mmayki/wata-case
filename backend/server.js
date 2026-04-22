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

// ТЕСТОВЫЙ РОУТ - проверим подключение к Supabase
app.get("/api/test-users", async (req, res) => {
  console.log("🔍 Запрос к /api/test-users");
  try {
    const { data, error } = await supabase.from("users").select("*");

    console.log("📦 Данные:", data);
    console.log("❌ Ошибка:", error);

    res.json({
      success: true,
      count: data?.length || 0,
      users: data,
      error: error?.message,
    });
  } catch (err) {
    console.error("Ошибка:", err);
    res.status(500).json({ error: err.message });
  }
});

// ЛОГИН с детальным логированием
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("\n=================================");
  console.log("🔐 ПОПЫТКА ВХОДА");
  console.log("📝 Username:", username);
  console.log("📝 Password:", password);

  try {
    // Сначала проверим, какие вообще есть пользователи
    const { data: allUsers, error: allError } = await supabase
      .from("users")
      .select("username, plain_password");

    console.log("👥 Все пользователи в БД:", allUsers);

    // Теперь ищем конкретного
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle(); // maybeSingle вместо single - не выбросит ошибку

    console.log("🔍 Результат поиска пользователя:", user);
    console.log("❌ Ошибка поиска:", error);

    if (!user) {
      console.log("❌ Пользователь НЕ НАЙДЕН");
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    console.log("✅ Пользователь НАЙДЕН:", user.username);
    console.log("🔑 Пароль из БД:", user.plain_password);
    console.log("🔑 Пароль из запроса:", password);
    console.log("🔑 Совпадение:", user.plain_password === password);

    // Проверяем пароль
    if (user.plain_password !== password) {
      console.log("❌ Пароль НЕ ПОДХОДИТ");
      return res.status(401).json({ error: "Неверный пароль" });
    }

    console.log("✅ ПАРОЛЬ ВЕРНЫЙ!");

    // Создаём токен
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    console.log("✅ Токен создан");
    console.log("=================================\n");

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
    console.error("❌ КРИТИЧЕСКАЯ ОШИБКА:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("\n=================================");
  console.log(`✅ СЕРВЕР ЗАПУЩЕН`);
  console.log(`📡 Порт: ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log("=================================\n");
});
