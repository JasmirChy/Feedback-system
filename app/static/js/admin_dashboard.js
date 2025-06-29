// Sample feedbacks data
const feedbacks = [
  {
    id: 'f001',
    title: "Install AC in classrooms",
    submitter: "Harendra Shah",
    status: "Pending",
    date: "2025-05-16",
    message: "Please install AC to make summer chill.",
    category: "Infrastructure" // Updated category
  },
  {
    id: 'f002',
    title: "Need Smart Boards",
    submitter: "Sunil Bahadur Bist",
    status: "Resolved",
    date: "2025-05-14",
    message: "Smart boards will improve teaching efficiency.",
    category: "Academic" // Updated category
  },
  {
    id: 'f003',
    title: 'Website navigation unclear',
    submitter: 'Alice Smith',
    status: 'Pending',
    date: '2025-06-20',
    message: 'The new navigation menu is confusing, especially on mobile. It\'s hard to find specific pages.',
    category: "Technical" // Updated category
  },
  {
    id: 'f004',
    title: 'Feature request: Dark mode',
    submitter: 'Bob Johnson',
    status: 'Resolved',
    date: '2025-06-18',
    message: 'Please add a dark mode option for better eye comfort during night usage.',
    category: "General Suggestion" // Updated category
  },
  {
    id: 'f005',
    title: 'Bug report: Login issue',
    submitter: 'Charlie Brown',
    status: 'Pending',
    date: '2025-06-15',
    message: 'Unable to log in using correct credentials. Getting an "invalid credentials" error.',
    category: "Technical" // Updated category
  }
];

// Sample users data
const users = [
  {
    id: 'u001',
    name: 'Jasmir Admin',
    email: 'jasmir@example.com',
    role: 'admin',
    registrationDate: '2024-01-10'
  },
  {
    id: 'u002',
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    role: 'user',
    registrationDate: '2024-03-01'
  },
  {
    id: 'u003',
    name: 'Bob The Builder',
    email: 'bob@example.com',
    role: 'user',
    registrationDate: '2024-04-15'
  },
  {
    id: 'u004',
    name: 'Charlie Chaplin',
    email: 'charlie@example.com',
    role: 'user',
    registrationDate: '2024-05-20'
  }
];


// Updated feedback categories
const feedbackCategories = [
  "Academic",
  "Administrative",
  "Infrastructure",
  "Faculty",
  "Technical",
  "Discipline",
  "General Suggestion",
  "Other"
];

// Global variable to store the currently viewed feedback or user
let currentFeedback = null;
let currentViewingUser = null;
let feedbackChartInstance = null; // To store the chart instance


/**
 * Shows a specific section and hides all other sections.
 * Also updates the active navigation item.
 * @param {string} sectionId The ID of the section to show.
 */
function showSection(sectionId) {
  // Hide all sections first
  document.querySelectorAll('.section').forEach(section => {
    section.classList.add('hidden');
  });

  // Show the requested section
  const sectionToShow = document.getElementById(sectionId);
  if (sectionToShow) {
    sectionToShow.classList.remove('hidden');
    if (sectionId === 'reports') {
      renderFeedbackReports();
    } else if (sectionId === 'viewUsers') {
      renderUsers(); // Render users when viewUsers section is shown
    } else if (sectionId === 'addAdmin') {
      // Potentially clear form or perform setup for Add Admin
      document.getElementById('addAdminForm').reset();
    }
  }

  // Set the active navigation item
  setActiveNavItem(sectionId);
  // Scroll to the top of the page
  window.scrollTo(0, 0);

  // Close sidebar on mobile after navigation if it's open
  if (window.innerWidth < 768 && document.getElementById('mobile-sidebar').classList.contains('translate-x-0')) {
    toggleMobileMenu();
  }
}

/**
 * Sets the active state for the clicked navigation item.
 * @param {string} sectionId The ID of the section associated with the active nav item.
 */
function setActiveNavItem(sectionId) {
  // Remove active classes from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('bg-gradient-to-r', 'from-teal-50', 'to-white', 'text-teal-600', 'border', 'border-teal-100');
    item.classList.add('text-slate-700', 'hover:text-teal-600');
  });

  // Add active classes to the current nav item
  const activeNavItem = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
  if (activeNavItem) {
    activeNavItem.classList.remove('text-slate-700', 'hover:text-teal-600');
    activeNavItem.classList.add('bg-gradient-to-r', 'from-teal-50', 'to-white', 'text-teal-600', 'border', 'border-teal-100');
  }

  // Handle submenu items for active state
  document.querySelectorAll('#settingsSubmenuSidebar li').forEach(item => {
    item.classList.remove('bg-teal-50', 'text-teal-600');
  });
  document.querySelectorAll('#userManagementSubmenuSidebar li').forEach(item => {
    item.classList.remove('bg-teal-50', 'text-teal-600');
  });

  // Specifically highlight submenu items if their parent is active
  if (sectionId === 'addAdmin' || sectionId === 'viewUsers') {
    const userManagementParent = document.querySelector('[onclick="toggleSubmenu(\'userManagementSubmenuSidebar\')"]');
    if (userManagementParent) {
      userManagementParent.classList.remove('text-slate-700', 'hover:text-teal-600');
      userManagementParent.classList.add('bg-gradient-to-r', 'from-teal-50', 'to-white', 'text-teal-600', 'border', 'border-teal-100');
    }
    const submenuItem = document.querySelector(`#userManagementSubmenuSidebar li[onclick="showSection('${sectionId}')"]`);
    if (submenuItem) {
      submenuItem.classList.add('bg-teal-50', 'text-teal-600');
    }
  } else if (sectionId === 'changePassword') {
    const settingsParent = document.querySelector('[onclick="toggleSubmenu(\'settingsSubmenuSidebar\')"]');
    if (settingsParent) {
      settingsParent.classList.remove('text-slate-700', 'hover:text-teal-600');
      settingsParent.classList.add('bg-gradient-to-r', 'from-teal-50', 'to-white', 'text-teal-600', 'border', 'border-teal-100');
    }
    const submenuItem = document.querySelector(`#settingsSubmenuSidebar li[onclick="showSection('${sectionId}')"]`);
    if (submenuItem) {
      submenuItem.classList.add('bg-teal-50', 'text-teal-600');
    }
  }
}


/**
 * Toggles the visibility of a submenu.
 * @param {string} submenuId The ID of the submenu to toggle.
 */
function toggleSubmenu(submenuId) {
  const submenu = document.getElementById(submenuId);
  submenu.classList.toggle('hidden');
  const icon = submenu.previousElementSibling.querySelector('.fa-chevron-down');
  icon.classList.toggle('rotate-180'); // Rotate icon for visual feedback
}

/**
 * Toggles the mobile sidebar's visibility and changes the hamburger icon.
 */
function toggleMobileMenu() {
  const sidebar = document.getElementById('mobile-sidebar');
  sidebar.classList.toggle('translate-x-0');
  sidebar.classList.toggle('-translate-x-full'); // For sliding effect
  const hamburger = document.getElementById('hamburger-icon');
  hamburger.classList.toggle('fa-bars'); // Change to 'times' icon when open
  hamburger.classList.toggle('fa-times');
  document.body.classList.toggle('overflow-hidden'); // Prevent body scroll when sidebar is open
}

/**
 * Placeholder function for user logout.
 */
function logout() {
  console.log('Logging out...');
  // Close mobile sidebar if open before logging out
  if (window.innerWidth < 768 && document.getElementById('mobile-sidebar').classList.contains('translate-x-0')) {
    toggleMobileMenu();
  }
  // Redirect to login page or perform actual logout logic
  window.location.href = 'login.html';
}


/**
 * Renders the feedback table with the provided data, filtered by status.
 * @param {string} filter The status to filter by ('all', 'pending', 'resolved').
 */
function renderFeedbacks(filter) {
  const tbody = document.getElementById("feedbackTableBody");
  if (!tbody) return;

  tbody.innerHTML = ""; // Clear existing rows

  // Filter feedbacks based on the selected status
  const filteredFeedbacks = feedbacks.filter(fb => {
    return filter === "all" || fb.status.toLowerCase() === filter.toLowerCase();
  });

  if (filteredFeedbacks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-3 px-4 text-center text-gray-500">No ${filter === 'all' ? 'Feedbacks' : filter.charAt(0).toUpperCase() + filter.slice(1) + ' Feedbacks'}</td></tr>`;
    return;
  }

  // Populate the table with filtered feedbacks
  filteredFeedbacks.forEach(fb => {
    const row = document.createElement("tr");
    row.classList.add("border-b", "border-gray-200", "hover:bg-gray-50", "cursor-pointer");
    row.onclick = () => showFeedbackDetails(fb); // Pass the entire feedback object

    // Determine status badge colors
    let statusClass = '';
    let statusIcon = '';
    if (fb.status.toLowerCase() === 'pending') {
      statusClass = 'bg-yellow-100 text-yellow-800';
      statusIcon = 'fas fa-clock';
    } else if (fb.status.toLowerCase() === 'resolved') {
      statusClass = 'bg-green-100 text-green-800';
      statusIcon = 'fas fa-check-circle';
    } else {
      statusClass = 'bg-gray-100 text-gray-800';
      statusIcon = 'fas fa-info-circle';
    }

    row.innerHTML = `
      <td class="py-3 px-4">${fb.title}</td>
      <td class="py-3 px-4">${fb.submitter}</td>
      <td class="py-3 px-4">${fb.category}</td> 
      <td class="py-3 px-4">
        <span class="px-3 py-1 rounded-full text-sm font-semibold ${statusClass}">
          <i class="${statusIcon} mr-1"></i>${fb.status}
        </span>
      </td>
      <td class="py-3 px-4">${fb.date}</td>
      <td class="py-3 px-4 truncate max-w-xs">${fb.message}</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Filters the feedback table and updates the active toggle button styling.
 * This function is called by the `onclick` events on the filter buttons in HTML.
 * @param {string} type The status to filter by ('all', 'pending', 'resolved').
 */
window.filterFeedback = function (type) {
  renderFeedbacks(type); // Render table with filtered data

  // Update button active states
  document.querySelectorAll('button[id^="toggle"]').forEach(btn => {
    btn.classList.remove("bg-indigo-900", "text-white");
    btn.classList.add("bg-gray-200", "text-indigo-900");
  });
  const toggleBtn = document.getElementById("toggle" + type.charAt(0).toUpperCase() + type.slice(1));
  if (toggleBtn) {
    toggleBtn.classList.add("bg-indigo-900", "text-white");
    toggleBtn.classList.remove("bg-gray-200", "text-indigo-900");
  }
};

/**
 * Shows selected feedback details in a separate section.
 * @param {object} fb The feedback object to display.
 */
function showFeedbackDetails(fb) {
  currentFeedback = fb; // Store the current feedback object

  document.getElementById("detailTitle").innerText = fb.title;
  document.getElementById("detailSubmitter").innerText = fb.submitter;
  document.getElementById("detailCategory").innerText = fb.category;
  document.getElementById("detailStatus").innerText = fb.status;
  document.getElementById("detailDate").innerText = fb.date;
  document.getElementById("detailMessage").innerText = fb.message;

  const resolveBtn = document.getElementById("resolveButton");
  if (fb.status === "Pending") {
    resolveBtn.classList.remove("hidden");
  } else {
    resolveBtn.classList.add("hidden");
  }

  showSection("feedbackDetails");
}

/**
 * Marks the currently viewed feedback as resolved.
 */
window.markAsResolved = function () {
  if (currentFeedback && currentFeedback.status === "Pending") {
    currentFeedback.status = "Resolved";
    showNotification("Feedback marked as resolved.", "success");

    // Update the details view immediately
    document.getElementById("detailStatus").innerText = "Resolved";
    document.getElementById("resolveButton").classList.add("hidden");

    // Go back to the home section and re-render the 'all' feedback table
    // to reflect the change globally.
    showSection("home");
    filterFeedback("all");
  }
};


/**
 * Displays a temporary notification message.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('success', 'error', 'info').
 */
function showNotification(message, type = "info") {
  const notificationArea = document.createElement("div");
  // Updated class for centering the notification at the top
  notificationArea.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg text-white font-semibold flex items-center space-x-2`;

  if (type === "success") {
    notificationArea.classList.add("bg-green-500");
    notificationArea.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;
  } else if (type === "error") {
    notificationArea.classList.add("bg-red-500");
    notificationArea.innerHTML = `<i class="fas fa-times-circle"></i> <span>${message}</span>`;
  } else {
    notificationArea.classList.add("bg-blue-500");
    notificationArea.innerHTML = `<i class="fas fa-info-circle"></i> <span>${message}</span>`;
  }

  document.body.appendChild(notificationArea);

  setTimeout(() => {
    notificationArea.remove();
  }, 5000); // Remove after 5 seconds
}


/**
 * Renders the feedback reports chart.
 */
function renderFeedbackReports() {
  const ctx = document.getElementById('feedbackChart').getContext('2d');

  // Destroy existing chart if it exists
  if (feedbackChartInstance) {
    feedbackChartInstance.destroy();
  }

  // Aggregate data
  const categoryCounts = {};
  feedbackCategories.forEach(cat => {
    categoryCounts[cat] = { Pending: 0, Resolved: 0 };
  });

  feedbacks.forEach(fb => {
    if (categoryCounts[fb.category]) {
      categoryCounts[fb.category][fb.status]++;
    }
  });

  const labels = Object.keys(categoryCounts);
  const pendingData = labels.map(cat => categoryCounts[cat].Pending);
  const resolvedData = labels.map(cat => categoryCounts[cat].Resolved);

  feedbackChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Pending',
          data: pendingData,
          backgroundColor: 'rgba(255, 159, 64, 0.8)', // Orange-like for pending
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1
        },
        {
          label: 'Resolved',
          data: resolvedData,
          backgroundColor: 'rgba(75, 192, 192, 0.8)', // Green-like for resolved
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allows canvas to take parent height
      plugins: {
        title: {
          display: true,
          text: 'Feedback Status by Category',
          font: { size: 18 }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Category'
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Feedbacks'
          },
          ticks: {
            precision: 0 // Ensure whole numbers
          }
        }
      }
    }
  });
}

/**
 * Renders the list of users in a table.
 */
function renderUsers() {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;

  tbody.innerHTML = ""; // Clear existing rows

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-3 px-4 text-center text-gray-500">No users found.</td></tr>`;
    return;
  }

  users.forEach(user => {
    const row = document.createElement("tr");
    row.classList.add("border-b", "border-gray-200", "hover:bg-gray-50", "cursor-pointer");
    row.onclick = () => showUserDetails(user); // Make row clickable to show details

    row.innerHTML = `
      <td class="py-3 px-4">${user.id}</td>
      <td class="py-3 px-4">${user.name}</td>
      <td class="py-3 px-4">${user.email}</td>
      <td class="py-3 px-4">
        <span class="px-3 py-1 rounded-full text-sm font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
          ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </span>
      </td>
      <td class="py-3 px-4">
        <button onclick="event.stopPropagation(); showUserDetails(${JSON.stringify(user).replace(/"/g, '&quot;')})" class="text-teal-600 hover:text-teal-800 mr-2">
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Displays the full details of a selected user.
 * @param {object} user The user object to display.
 */
function showUserDetails(user) {
  currentViewingUser = user; // Store the user being viewed

  document.getElementById("detailUserId").innerText = user.id;
  document.getElementById("detailUserName").innerText = user.name;
  document.getElementById("detailUserEmail").innerText = user.email;
  document.getElementById("detailUserRole").innerText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  document.getElementById("detailUserRegDate").innerText = user.registrationDate;

  const makeAdminBtn = document.getElementById("makeAdminButton");
  if (user.role === 'user') { // Only show "Make Admin" if the user is not already an admin
    makeAdminBtn.classList.remove("hidden");
  } else {
    makeAdminBtn.classList.add("hidden");
  }

  showSection("userDetails");
}

/**
 * Handles the "Make Admin" action for the currently viewed user.
 */
window.makeAdmin = function () {
  if (currentViewingUser && currentViewingUser.role === 'user') {
    const confirmation = confirm(`Are you sure you want to make ${currentViewingUser.name} an administrator?`);
    if (confirmation) {
      currentViewingUser.role = 'admin'; // Update role
      showNotification(`${currentViewingUser.name} has been made an administrator.`, "success");

      // Update the displayed role and hide the button immediately
      document.getElementById("detailUserRole").innerText = "Admin";
      document.getElementById("makeAdminButton").classList.add("hidden");

      // Re-render the user list to reflect the change
      showSection('viewUsers');
    }
  } else if (currentViewingUser && currentViewingUser.role === 'admin') {
    showNotification(`${currentViewingUser.name} is already an administrator.`, "info");
  }
};

/**
 * Handles the "Add Admin" form submission.
 */
window.addAdmin = function (event) {
  event.preventDefault(); // Prevent default form submission

  const name = document.getElementById("newAdminName").value;
  const email = document.getElementById("newAdminEmail").value;
  const password = document.getElementById("newAdminPassword").value; // For demo, not secure

  if (!name || !email || !password) {
    showNotification("Please fill in all fields to add a new admin.", "error");
    return;
  }

  // Check if user already exists by email (simple check)
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    showNotification("A user with this email already exists.", "error");
    return;
  }

  const newAdmin = {
    id: 'u' + (users.length + 1).toString().padStart(3, '0'),
    name: name,
    email: email,
    role: 'admin',
    registrationDate: new Date().toISOString().split('T')[0]
  };

  users.push(newAdmin);
  showNotification(`${name} added as a new administrator.`, "success");
  document.getElementById("addAdminForm").reset(); // Clear form
  showSection('viewUsers'); // Go to view users list
};


// Call renderFeedbacks when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  showSection('home'); // Initialize with 'home' section shown
  filterFeedback('all'); // Initialize with 'all' feedback selected and styled

  // Show welcome notification for admin when the page loads
  showNotification("Welcome Admin!", "success");

  // Add event listener for clicking outside to close mobile menu
  document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('mobile-sidebar');
    const hamburger = document.getElementById('hamburger-button');
    const target = event.target;
    // Only close sidebar if open, clicking outside sidebar and hamburger, and not on interactive elements
    if (
      window.innerWidth < 768 &&
      sidebar.classList.contains('translate-x-0') &&
      !sidebar.contains(target) &&
      !hamburger.contains(target) &&
      !target.closest('button, input, select, textarea, label, a')
    ) {
      toggleMobileMenu();
    }
  });

  // Attach event listener to the addAdmin form's submit button
  const addAdminForm = document.getElementById('addAdminForm');
  if (addAdminForm) {
    addAdminForm.addEventListener('submit', window.addAdmin);
  }
});
