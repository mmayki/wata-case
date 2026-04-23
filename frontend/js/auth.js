// Страница логина
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", handleLogin);

  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    passwordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  }
});

async function handleLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorDiv = document.getElementById("errorMessage");

  if (!username || !password) {
    showError("Введите логин и пароль");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Неверный логин или пароль");
    }

    // Сохраняем данные
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("userName", data.user.full_name);
    localStorage.setItem("userRole", data.user.role);
    if (data.user.class_name) {
      localStorage.setItem("className", data.user.class_name);
    }

    // Перенаправление
    if (data.user.role === "student") {
      window.location.href = 'student-dashboard.html';
    } else if (data.user.role === "teacher") {
      window.location.href = "teacher-dashboard.html";
    }
  } catch (error) {
    showError(error.message);
  }
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 3000);
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}
