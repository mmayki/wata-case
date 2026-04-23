document.addEventListener("DOMContentLoaded", () => {
  const roleSelect = document.getElementById("role");
  const classGroup = document.getElementById("classGroup");

  if (roleSelect) {
    roleSelect.addEventListener("change", () => {
      classGroup.style.display =
        roleSelect.value === "student" ? "block" : "none";
    });
  }

  const registerBtn = document.getElementById("registerBtn");
  if (registerBtn) {
    registerBtn.addEventListener("click", handleRegister);
  }

  const inputs = ["fullName", "username", "password", "confirmPassword"];
  inputs.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleRegister();
      });
    }
  });
});

async function handleRegister() {
  const fullName = document.getElementById("fullName").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const role = document.getElementById("role").value;
  const className = document.getElementById("className")?.value || null;

  const errorDiv = document.getElementById("errorMessage");
  const successDiv = document.getElementById("successMessage");

  errorDiv.style.display = "none";
  successDiv.style.display = "none";

  if (!fullName || !username || !password) {
    showError("Заполните все обязательные поля");
    return;
  }

  if (password !== confirmPassword) {
    showError("Пароли не совпадают");
    return;
  }

  if (password.length < 3) {
    showError("Пароль должен быть не менее 3 символов");
    return;
  }

  if (role === "student" && !className) {
    showError("Выберите класс");
    return;
  }

  try {
    console.log("📤 Отправка регистрации:", {
      fullName,
      username,
      role,
      className,
    });

    const response = await fetch("http://localhost:3000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        username: username,
        password: password,
        role: role,
        class_name: className,
      }),
    });

    const data = await response.json();
    console.log("📥 Ответ сервера:", data);

    if (!response.ok) {
      throw new Error(data.error || "Ошибка регистрации");
    }

    successDiv.textContent =
      "✅ Регистрация успешна! Сейчас вы будете перенаправлены на страницу входа...";
    successDiv.style.display = "block";

    document.getElementById("fullName").value = "";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("confirmPassword").value = "";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    showError(error.message);
  }
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 3000);
}
