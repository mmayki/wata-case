Обновлено 24 апреля 2026
==================================================================
              WATA-CASE: Электронный школьный дневник.
==================================================================


-- ЗАПУСК
1. Установите Node.js (если не установлен): 
   https://nodejs.org/
2. Откройте терминал и перейдите в папку backend:
   cd backend
3. Установите зависимости:
   npm install
4. Создайте файл .env в папке backend с содержимым:
   PORT=3000
   JWT_SECRET=hackathon_secret_2024
   SUPABASE_URL=https://ваш-проект.supabase.co
   SUPABASE_ANON_KEY=ваш-anon-ключ
5. Запустите сервер:
   node server.js
6. Откройте в браузере:
   frontend/index.html (через Live Server)


-- ТЕХНОЛОГИИ
Frontend:      HTML5, CSS3, JavaScript (Vanilla)
Backend:       Node.js + Express
База данных:   Supabase (PostgreSQL)


-- АРХИТЕКТУРА ПРИЛОЖЕНИЯ
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (HTML/CSS/JS)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Login/Reg   │  │ Student Dash │  │ Teacher Dash │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP / API
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   /api/auth  │  │ /api/grades  │  │ /api/tasks   │   │
│  │   /api/login │  │ /api/homework│  │ /api/points  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐   │
│  │  users  │ │ grades  │ │subjects │ │ user_points  │   │
│  │homework │ │schedule │ │tasks    │ │ leaderboard  │   │
│  └─────────┘ └─────────┘ └─────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘


-- СТРУКТУРА ПРОЕКТА (основное)
wata-case/
├── backend/
│   ├── server.js          # Главный файл бэкенда
│   ├── test.js            # Тестовый сервер если без базы данных
│   └── package.json       # Зависимости
├── frontend/
│   ├── index.html         # Точка входа
│   ├── css/               # Стили
│   │   ├── main.css
│   │   ├── login.css
│   │   ├── student-dashboard.css
│   │   └── teacher-dashboard.css
│   ├── js/                # Скрипты
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── register.js
│   │   ├── student-dashboard.js
│   │   └── teacher-dashboard.js
│   └── pages/             # HTML страницы
│       ├── login.html
│       ├── register.html
│       ├── forgot-password.html
│       ├── student-dashboard.html
│       └── teacher-dashboard.html
└── README.txt


-- БАЗА ДАННЫХ
users         - пользователи (id, username, password, full_name, role, class)
subjects      - предметы (id, name)
grades        - оценки (id, student_id, subject_id, grade, date, teacher_id)
homework      - домашние задания (id, class_name, subject_id, description, due_date, points)
schedule      - расписание (id, class_name, subject_id, day_of_week, lesson_number)
user_points   - баллы пользователей (id, user_id, points, updated_at)


-- API ЭНДПОЙНТЫ
Метод 	  Эндпойнт	                    Описание
POST   	  /api/login	                 Авторизация пользователя
POST  	  /api/register	               Регистрация нового пользователя
GET     	/api/grades/:studentId	     Получение оценок ученика
POST	    /api/grades	                 Поставить оценку (учитель)
GET	      /api/homework/:className	   Домашние задания для класса
POST	    /api/homework	               Создать задание (учитель)
GET	      /api/schedule/:className	   Расписание для класса
GET	      /api/students	               Список всех учеников
GET     	/api/leaderboard	           Таблица лидеров
GET     	/api/user-points/:userId	   Баллы пользователя
POST    	/api/user-points	           Обновить баллы


-- ЭКРАНЫ ПРИЛОЖЕНИЯ
1. Страница входа — авторизация, демо-доступ
2. Страница регистрации — создание нового аккаунта
3. Дашборд ученика:
    Приветствие и статистика
    Прогресс выполнения задач (круговая диаграмма)
    Календарь с отметками задач
    Список задач с баллами
    Кнопка отметки готовности
    Расписание на сегодня
    Таблица лидеров
4. Дашборд учителя:
    Статистика (ученики, задания, успеваемость)
    Форма выставления оценок
    Форма создания заданий
    Список активных заданий
    Таблица успеваемости класса

               Гранд-финал Всероссийского Хакатона
                       Моя Профессия - ИТ.
                            2026 Deta
