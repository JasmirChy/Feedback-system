function handleLogin(event) {
  event.preventDefault(); // prevent form submission

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (username === "admin" && password === "admin123") {
    window.location.href = "admin_dashboard.html";
  } else if (username === "user" && password === "user123") {
    window.location.href = "user_dashboard.html";
  } else {
    // Show the modal for invalid login
    document.getElementById("errorModal").classList.remove("hidden");
  }
}

function closeModal() {
  document.getElementById("errorModal").classList.add("hidden");
}
