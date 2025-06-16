// Sample feedbacks data to show 
const feedbacks = [
  {
    title: "Install AC in classrooms",
    submitter: "Harendra Shah",
    status: "Pending",
    date: "2025-05-16",
    message: "Please install AC to make summer chill."
  },
  {
    title: "Need Smart Boards",
    submitter: "Sunil Bahadur Bist",
    status: "Resolved",
    date: "2025-05-14",
    message: "Smart boards will improve teaching efficiency."
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const menuBtn = document.getElementById("menuBtn");
  const popupMenu = document.getElementById("popupMenu");
  menuBtn.addEventListener("click", toggleMenu);

  function toggleMenu() {
    popupMenu.classList.toggle("hidden");
    ["userManagementSubmenuMobile", "settingsSubmenuMobile"].forEach(id => {
      const submenu = document.getElementById(id);
      if (submenu) submenu.classList.add("hidden");
    });
  }

  // Toggle visibility of submenu (User Management, Settings)
  window.toggleSubmenu = function(id) {
    const submenu = document.getElementById(id);
    if (submenu) submenu.classList.toggle('hidden');
    
  };
  // Close popup menu when clicking outside of it
document.addEventListener("click", function (event) {
  const menu = document.getElementById("popupMenu");
  const menuBtn = document.getElementById("menuBtn");

  if (menu && !menu.contains(event.target) && event.target !== menuBtn) {
    menu.classList.add("hidden");
  }
});

  // Close all submenus
  function closeAllSubmenus() {
    ['userManagementSubmenu', 'settingsSubmenu', 'userManagementSubmenuMobile', 'settingsSubmenuMobile'].forEach(id => {
      const submenu = document.getElementById(id);
      if (submenu) submenu.classList.add('hidden');
    });
  }


  // Show only the requested hidden section 
window.showSection = function(sectionId) {
  document.querySelectorAll('.section').forEach(section => section.classList.add('hidden'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove('hidden');
  closeAllSubmenus();

  // Close popup menu ONLY if on mobile view
  if (window.innerWidth < 768) {
    popupMenu.classList.add("hidden");
  }
};

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


  // Notification functions
  window.showNotification = function(message) {
    const overlay = document.getElementById('notificationOverlay');
    const messageEl = document.getElementById('notificationMessage');
    messageEl.innerText = message;
    overlay.classList.remove('hidden');
  };

  window.hideNotification = function() {
    const overlay = document.getElementById('notificationOverlay');
    overlay.classList.add('hidden');
  };

  // Handle Add Admin and that form submission
  window.addAdmin = function(event) {
    event.preventDefault();
    showNotification("New admin added successfully!");
    return false;
  };


  // Handle Change Password and that form submission
  window.changePassword = function(event) {
    event.preventDefault();
    const current = document.getElementById("currentPassword").value.trim();
    const newPass = document.getElementById("newPassword").value.trim();
    const confirmPass = document.getElementById("confirmPassword").value.trim();
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
    if (newPass !== confirmPass) {
      showNotification("New passwords do not match.");
      return false;
    }
    // if (!passwordRegex.test(newPassword)) {
    //     showNotification(" Password must include uppercase, lowercase, number, and special character.");
    //     return false;
    //   }
    if (newPass.length < 8) {
      showNotification("New password must be at least 8 characters.");
      return false;
    }
    if (currentPassword === newPassword) {
        showNotification(" New password cannot be the same as the current password.");
        return false;
      }


    showNotification("Password changed successfully!");
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    showSection('allFeedback');
    return false;
  };

  // Display feedbacks based on filter
  function renderFeedbacks(filter) {
    const tbody = document.getElementById("feedbackTableBody");
    tbody.innerHTML = "";
    const filteredFeedbacks = feedbacks.filter(fb => filter === "all" || fb.status.toLowerCase() === filter);
    
    if (filteredFeedbacks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-3 px-4 text-center">No ${filter === 'all' ? 'Feedbacks' : filter.charAt(0).toUpperCase() + filter.slice(1) + ' Feedbacks'}</td></tr>`;
      return;
    }

    filteredFeedbacks.forEach(fb => {
      const row = document.createElement("tr");
      row.className = "cursor-pointer hover:bg-indigo-100";
      row.onclick = () => showFeedbackDetails(fb);
      row.innerHTML = `
        <td class="py-3 px-4">${fb.title}</td>
        <td class="py-3 px-4">${fb.submitter}</td>
        <td class="py-3 px-4 ${fb.status === 'Pending' ? 'text-yellow-600' : 'text-green-600'}">${fb.status}</td>
        <td class="py-3 px-4">${fb.date}</td>
        <td class="py-3 px-4 truncate max-w-xs">${fb.message}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Apply a filter to feedback for (all, pending, resolved) and highlight the selected button
  window.filterFeedback = function(type) {
    renderFeedbacks(type);
    document.querySelectorAll('button[id^="toggle"]').forEach(btn => {
      btn.classList.remove("bg-indigo-900", "text-white");
      btn.classList.add("bg-gray-200", "text-indigo-900");
    });
    const toggleBtn = document.getElementById("toggle" + type.charAt(0).toUpperCase() + type.slice(1));
    toggleBtn.classList.add("bg-indigo-900", "text-white");
    toggleBtn.classList.remove("bg-gray-200", "text-indigo-900");
  };

  // Show selected feedback details in separate section 
  function showFeedbackDetails(fb) {
    document.getElementById("detailTitle").innerText = fb.title;
    document.getElementById("detailSubmitter").innerText = fb.submitter;
    document.getElementById("detailStatus").innerText = fb.status;
    document.getElementById("detailDate").innerText = fb.date;
    document.getElementById("detailMessage").innerText = fb.message;
    const resolveBtn = document.getElementById("resolveButton");
    resolveBtn.classList.toggle("hidden", fb.status !== "Pending");
    showSection("feedbackDetails");
  }

  // Mark feedback as resolved
  window.markAsResolved = function() {
    const detailStatus = document.getElementById("detailStatus").innerText;
    if (detailStatus === "Pending") {
      const title = document.getElementById("detailTitle").innerText;
      const feedback = feedbacks.find(fb => fb.title === title);
      if (feedback) {
        feedback.status = "Resolved";
        showNotification("Feedback marked as resolved.");
        showSection("allFeedback");
        filterFeedback("resolved");
      }
    }
  };

  // Initialize
  renderFeedbacks("all");

  // Hide popup menu on resize to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      popupMenu.classList.add('hidden');
    }
  });
});