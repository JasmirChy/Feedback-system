
window.addEventListener('DOMContentLoaded', () => {

  // Bind navigation clicks
  document.querySelectorAll('.nav-item[data-target]').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target) showSection(target);
    });
  });

  // Bind submenu toggles
  document.querySelectorAll('[data-submenu-target]').forEach(item => {
    item.addEventListener('click', () => {
      const submenuId = item.dataset.submenuTarget;
      const submenu = document.getElementById(submenuId);
      if (submenu) submenu.classList.toggle('hidden');
      item.querySelector('.fa-chevron-down')?.classList.toggle('rotate-180');
    });
  });

  setupLogoutModal();
  setupFeedbackClick();
});

// Update active nav item highlighting
function setActiveNavItem(id) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('bg-gradient-to-r','from-teal-50','to-white','text-teal-600','border','border-teal-100');
    item.classList.add('text-slate-700','hover:text-teal-600');
  });
  const active = document.querySelector(`.nav-item[data-target="${id}"]`);
  if (active) {
    active.classList.remove('text-slate-700','hover:text-teal-600');
    active.classList.add('bg-gradient-to-r','from-teal-50','to-white','text-teal-600','border','border-teal-100');
  }
}



// SECTION NAVIGATION
function showSection(id) {
  document.querySelectorAll('.section').forEach(section => section.classList.add('hidden'));
  const activeSection = document.getElementById(id);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }
}

// ----- Mobile Menu -----
function toggleMobileMenu() {
  const sidebar = document.getElementById('mobile-sidebar');
  sidebar?.classList.toggle('-translate-x-full');
  sidebar?.classList.toggle('translate-x-0');
  document.body.classList.toggle('overflow-hidden');
}

function toggleMobileMenuIfOpen() {
  const sidebar = document.getElementById('mobile-sidebar');
  if (sidebar?.classList.contains('translate-x-0')) toggleMobileMenu();
}

// FEEDBACK FILTERING
function filterFeedback(type) {
  const rows = document.querySelectorAll("#allFeedback tbody tr");
  rows.forEach(row => {
    const statusText = row.querySelector("td:nth-child(4)").innerText.toLowerCase();
    if (type === 'all') {
      row.style.display = '';
    } else if (type === 'pending' && statusText.includes('pending')) {
      row.style.display = '';
    } else if (type === 'resolved' && statusText.includes('resolved')) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}


// HANDLE FEEDBACK ROW CLICK
function setupFeedbackClick() {
  document.querySelectorAll('[data-target="feedbackDetail"]').forEach(row => {
    row.addEventListener('click', () => {
      const feedbackId = row.getAttribute('data-f-id');
      if (feedbackId) {
        window.location.href = `/admin/feedback/${feedbackId}`;
      }
    });
  });
}


// CHART RENDERING
function renderFeedbackChart() {
  const ctx = document.getElementById('feedbackChart');
  if (!ctx) return;

  const categoryLabels = window.categoryLabels || [];
  const categoryCounts = window.categoryCounts || [];
  const statusLabels = window.statusLabels || [];
  const statusCounts = window.statusCounts || [];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categoryLabels,
      datasets: [{
        label: 'Feedback by Category',
        data: categoryCounts,
        backgroundColor: 'rgba(13, 148, 136, 0.6)',
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Feedback by Category'
        }
      }
    }
  });
}

// javascript function for changing user role
function changeUserRole(userId, currentRoleId) {
  const newRoleId = currentRoleId === 1 ? 2 : 1;
  const roleLabel = newRoleId === 1 ? 'Admin' : 'User';

  const confirmMsg = `Change this user's role to ${roleLabel}?`;

  if (confirm(confirmMsg)) {
    fetch('/admin/update-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `user_id=${userId}&new_role_id=${newRoleId}`
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("User role updated successfully.");
        location.reload();
      } else {
        alert("Failed to update role: " + data.message);
      }
    })
    .catch(err => {
      alert("Error: " + err.message);
    });
  }
}



// Expose globally
window.showSection = showSection;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleMobileMenuIfOpen = toggleMobileMenuIfOpen;
window.setActiveNavItem = setActiveNavItem;
window.toggleSubmenu = id => {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
};