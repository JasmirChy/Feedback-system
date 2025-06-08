// Show selected section and hide all others
function showSection(sectionId) {
  const sections = document.querySelectorAll(".section");
  sections.forEach((section) => {
    section.classList.add("hidden");
  });
  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.classList.remove("hidden");
  }

  // Close popup menu if open (mobile)
  const popup = document.getElementById("popupMenu");
  if (popup && !popup.classList.contains("hidden")) {
    popup.classList.add("hidden");
  }
}






// Change Password function
function changePassword(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
  if (newPassword !== confirmPassword) {
    alert(" New passwords do not match.");
    return false;
  }
  if (newPassword.length < 8) {
    showNotification("❌ Password must be at least 8 characters.");
    return false;
  }
  if (!passwordRegex.test(newPassword)) {
    showNotification("❌ Password must include uppercase, lowercase, number, and special character.");
    return false;
  }
  if (currentPassword === newPassword) {
    showNotification("❌ New password cannot be the same as the current password.");
    return false;
  }
  showNotification("✅ Password changed successfully!");
  showSection("home");
  return false; // Prevent form submission for demonstration
}

// Show notification function
function showNotification(message) {
  const notificationOverlay = document.getElementById("notificationOverlay");
  const notificationMessage = document.getElementById("notificationMessage");
  notificationMessage.textContent = message;
  notificationOverlay.classList.remove("hidden");
}
// Hide notification function
function hideNotification() {
  const notificationOverlay = document.getElementById("notificationOverlay");
  notificationOverlay.classList.add("hidden");
}

//  function changePassword(event) {
//       event.preventDefault();

//       const currentPassword = document.getElementById('currentPassword').value.trim();
//       const newPassword = document.getElementById('newPassword').value.trim();
//       const confirmPassword = document.getElementById('confirmPassword').value.trim();

//       const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;

//       if (newPassword !== confirmPassword) {
//         showNotification("❌ New passwords do not match.");
//         return false;
//       }

//       if (newPassword.length < 8) {
//         showNotification("❌ Password must be at least 8 characters.");
//         return false;
//       }

//       if (!passwordRegex.test(newPassword)) {
//         showNotification("❌ Password must include uppercase, lowercase, number, and special character.");
//         return false;
//       }

//       if (currentPassword === newPassword) {
//         showNotification("❌ New password cannot be the same as the current password.");
//         return false;
//       }

//       showNotification("✅ Password changed successfully!");
//       return false;
//     }


// Toggle mobile submenus 
  function toggleSubmenu(id) {
    const submenu = document.getElementById(id);
    if (submenu) submenu.classList.toggle("hidden");
  }

// Toggle mobile popup menu
function toggleMenu() {
  const menu = document.getElementById("popupMenu");
  if (menu) {
    menu.classList.toggle("hidden");
  }
}

// Submit feedback (dummy functionality)
function submitFeedback() {
  const feedbackText = document.querySelector("#feedback textarea").value.trim();
  const hideDetails = document.querySelector("#hideDetails").checked;

  if (feedbackText === "") {
    alert("Please enter your feedback before submitting.");
    return;
  }

  // Here, you'd normally send data to the server (AJAX or fetch)
  alert(
    `Feedback Submitted!\n\nMessage: ${feedbackText}\nHide Personal Details: ${
      hideDetails ? "Yes" : "No"
    }`
  );

  // Clear inputs
  document.querySelector("#feedback textarea").value = "";
  document.querySelector("#hideDetails").checked = false;

  // Optionally show the status section or confirmation
  showSection("status");
}

// logout function
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    window.location.href = "login.html";
  }
}

// Close popup menu when clicking outside of it
document.addEventListener("click", function (event) {
  const menu = document.getElementById("popupMenu");
  const menuBtn = document.getElementById("menuBtn");

  if (menu && !menu.contains(event.target) && event.target !== menuBtn) {
    menu.classList.add("hidden");
  }
});

// Optional: Automatically show default section on load
document.addEventListener("DOMContentLoaded", () => {
  showSection("feedback"); // Change to any default section if needed
});
window.addEventListener('DOMContentLoaded', () => {
    showSection('home');
  });

   // Show logout confirmation modal
  window.logout = function () {
    document.getElementById("logoutOverlay").classList.remove("hidden");
  };

  // Confirm and perform logout
  window.confirmLogout = function () {
    window.location.href = "login.html";
  };

  // Hide modal without logout
  window.hideLogoutModal = function () {
    document.getElementById("logoutOverlay").classList.add("hidden");
  };


