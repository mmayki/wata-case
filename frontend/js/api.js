// API конфигурация
const API_BASE_URL = "http://localhost:3000/api";

// Универсальная функция запроса
async function apiRequest(
  endpoint,
  method = "GET",
  body = null,
  needAuth = true,
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (needAuth) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/frontend/pages/login.html";
      throw new Error("Нет авторизации");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = "/frontend/pages/login.html";
    throw new Error("Сессия истекла");
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ошибка запроса");

  return data;
}
