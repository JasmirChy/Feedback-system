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
  document.querySelectorAll('tr[data-url]').forEach(row => {
    row.addEventListener('click', () => {
      const url = row.dataset.url;
      if (url) window.location.href = url;
    });
  });
}


// following function is to handle the reload issue of report section in admin page
(function () {
  const chartBase = window.Admin_Chart_Base || '/adminUser/admin/chart/category';
  const chartImg = document.getElementById('category-chart-img');
  if (!chartImg) return;

  document.querySelectorAll('.period-link').forEach(link => {
    link.addEventListener('click', function (ev) {

      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;

      ev.preventDefault();
      const period = this.dataset.period || 'all';

      chartImg.classList.add('opacity-30');

      document.querySelectorAll('.period-link').forEach(a => a.classList.remove('bg-slate-800','text-white'));
      this.classList.add('bg-slate-800','text-white');


      chartImg.src = chartBase + '?period=' + encodeURIComponent(period);

      chartImg.onload = () => {
        chartImg.classList.remove('opacity-30');
      };
      chartImg.onerror = () => {
        chartImg.classList.remove('opacity-30');
        // Optionally flash an error or revert active state
        alert('Could not load chart. Try reloading the page.');
      };

      // Update the URL in the address bar without reloading (nice to have)
      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('period', period);
        newUrl.hash = 'reports';
        window.history.replaceState({}, '', newUrl.toString());
      } catch (e) {

      }
    });
  });
})();

// USER ROLE CHANGE
function changeUserRole(userId, currentRoleId) {
  const newRoleId = currentRoleId === 1 ? 2 : 1;
  const roleLabel = newRoleId === 1 ? 'Admin' : 'User';
  if (!confirm(`Change this user's role to ${roleLabel}?`)) return;

  fetch('/adminUser/update-role', {
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
