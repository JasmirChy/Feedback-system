window.addEventListener('DOMContentLoaded', () => {
  // Bind navigation clicks
  document.querySelectorAll('.nav-item[data-target]').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target) showSection(target);
    });
  });

  // Submenu toggles
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
  if (activeSection) activeSection.classList.remove('hidden');
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
  const rows = document.querySelectorAll("#feedbackTableBody tr");
  rows.forEach(row => {
    const status = row.dataset.status;
    if (type === 'all') {
      row.style.display = '';
    } else if (type === 'pending' && status === 'pending') {
      row.style.display = '';
    } else if (type === 'inprogress' && status === 'inprogress') {
      row.style.display = '';
    } else if (type === 'resolved' && status === 'solved') {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });

  // Update active filter button styling
  document.querySelectorAll('[id^="toggle"]').forEach(btn => {
    btn.classList.remove('bg-indigo-900', 'text-white');
    btn.classList.add('bg-gray-200', 'text-indigo-900');
  });

  const activeBtn = document.getElementById('toggle' + type.charAt(0).toUpperCase() + type.slice(1));
  if (activeBtn) {
    activeBtn.classList.remove('bg-gray-200', 'text-indigo-900');
    activeBtn.classList.add('bg-indigo-900', 'text-white');
  }
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

// FEEDBACK STATUS UPDATE (if using AJAX)
function updateStatus(fId, newStatus) {
  fetch('/admin/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `f_id=${encodeURIComponent(fId)}&status=${encodeURIComponent(newStatus)}`
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const select = document.querySelector(`select[data-f-id="${fId}"]`);
      const row = select?.closest('tr');

      if (row) {
        let statusText = 'pending';
        if (newStatus === '2') statusText = 'inprogress';
        else if (newStatus === '3') statusText = 'solved';
        row.dataset.status = statusText;
      }

      // Optionally re-apply filter to reflect change
      const activeBtn = document.querySelector('[id^="toggle"].bg-indigo-900');
      if (activeBtn) {
        const type = activeBtn.id.replace('toggle', '').toLowerCase();
        filterFeedback(type);
      }

      alert('Status updated successfully.');
    } else {
      alert('Error updating status: ' + data.message);
    }
  })
  .catch(err => {
    alert('Request failed: ' + err);
  });
}

// CHART RENDERING
function renderFeedbackChart() {
  const ctx = document.getElementById('feedbackChart');
  if (!ctx) return;

  const categoryLabels = window.categoryLabels || [];
  const categoryCounts = window.categoryCounts || [];

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

// CHANGE USER ROLE
function changeUserRole(userId, currentRoleId) {
  const newRoleId = currentRoleId === 1 ? 2 : 1;
  const roleLabel = newRoleId === 1 ? 'Admin' : 'User';

  if (confirm(`Change this user's role to ${roleLabel}?`)) {
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
window.filterFeedback = filterFeedback;
window.updateStatus = updateStatus;
