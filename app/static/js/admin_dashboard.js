// app/static/js/admin_dashboard.js

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

// ── Navigation Helpers ──
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

function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
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
}

// FEEDBACK ROW CLICK
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

// USER ROLE CHANGE
function changeUserRole(userId, currentRoleId) {
  const newRoleId = currentRoleId === 1 ? 2 : 1;
  const roleLabel = newRoleId === 1 ? 'Admin' : 'User';
  if (!confirm(`Change this user's role to ${roleLabel}?`)) return;

  fetch('/admin/update-role', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`user_id=${userId}&new_role_id=${newRoleId}`
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('User role updated successfully.');
      location.reload();
    } else {
      alert('Failed to update role: ' + data.message);
    }
  })
  .catch(err => alert('Error: ' + err.message));
}

// Global exports
window.showSection = showSection;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleMobileMenuIfOpen = toggleMobileMenuIfOpen;
window.setActiveNavItem = setActiveNavItem;
window.filterFeedback = filterFeedback;
