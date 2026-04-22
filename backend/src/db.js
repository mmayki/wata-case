const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Создаём таблицы при старте
async function initDB() {
  const client = await pool.connect();
  try {
    // Пользователи (ученики и учителя)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('student', 'teacher')),
        class_name VARCHAR(10)  -- только для учеников
      )
    `);

    // Предметы
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      )
    `);

    // Оценки
    await client.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id),
        subject_id INTEGER REFERENCES subjects(id),
        grade INTEGER CHECK (grade >= 1 AND grade <= 5),
        date DATE DEFAULT CURRENT_DATE,
        teacher_id INTEGER REFERENCES users(id)
      )
    `);

    // Домашнее задание
    await client.query(`
      CREATE TABLE IF NOT EXISTS homework (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(10) NOT NULL,
        subject_id INTEGER REFERENCES subjects(id),
        description TEXT NOT NULL,
        due_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Расписание
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(10) NOT NULL,
        subject_id INTEGER REFERENCES subjects(id),
        day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 6),
        lesson_number INTEGER CHECK (lesson_number BETWEEN 1 AND 8)
      )
    `);

    console.log("✅ База данных инициализирована");
  } catch (err) {
    console.error("❌ Ошибка инициализации БД:", err);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
