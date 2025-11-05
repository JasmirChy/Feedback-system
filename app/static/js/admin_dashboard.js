// app/static/js/admin_dashboard.js
// Admin dashboard UI behaviour (delegated row clicks + safe status handling)

(function () {
  'use strict';

  // ----- small DOM helpers -----
  const qsa = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
  const qs = (sel, ctx = document) => (ctx || document).querySelector(sel);

  // ----- DOM Ready -----
  window.addEventListener('DOMContentLoaded', () => {
    // Bind navigation clicks
    qsa('.nav-item[data-target]').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.target;
        if (target) {
          showSection(target);
          try { setActiveNavItem(target); } catch (e) {}
        }
      });
    });

    // Submenu toggles
    qsa('[data-submenu-target]').forEach(item => {
      item.addEventListener('click', () => {
        const submenuId = item.dataset.submenuTarget;
        const submenu = document.getElementById(submenuId);
        if (submenu) submenu.classList.toggle('hidden');
        item.querySelector('.fa-chevron-down')?.classList.toggle('rotate-180');
      });
    });

    setupLogoutModal();
    setupFeedbackInteractions();    // delegated handler for rows + selects
    // mark filter card active by default (page default is 'all')
    markActiveFilterCard('all');
  });

  // ===== Navigation Helpers =====
  function setActiveNavItem(id) {
    qsa('.nav-item').forEach(item => {
      item.classList.remove('bg-gradient-to-r','from-teal-50','to-white','text-teal-600','border','border-teal-100');
      item.classList.add('text-slate-700','hover:text-teal-600');
    });
    const active = qs(`.nav-item[data-target="${id}"]`);
    if (active) {
      active.classList.remove('text-slate-700','hover:text-teal-600');
      active.classList.add('bg-gradient-to-r','from-teal-50','to-white','text-teal-600','border','border-teal-100');
    }
  }

  function showSection(id) {
    qsa('.section').forEach(sec => sec.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
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

  // ===== Filtering (cards call this inline) =====
  function filterFeedback(type) {
    const rows = qsa("#feedbackTableBody tr");
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


  // ===== Logout modal setup =====
  function setupLogoutModal() {
    const signOutBtn = qs('.signOutBtn');
    const logoutModal = qs('#logoutModal');
    const confirmLogoutBtn = qs('#confirmLogoutBtn');
    const cancelLogoutBtn = qs('#cancelLogoutBtn');

    if (!signOutBtn || !logoutModal) return;
    signOutBtn.addEventListener('click', () => logoutModal.classList.remove('hidden'));

    if (confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener('click', () => {
        window.location.href = window.LOGOUT_URL || '/auth/logout';
      });
    }
    if (cancelLogoutBtn) {
      cancelLogoutBtn.addEventListener('click', () => logoutModal.classList.add('hidden'));
    }
    logoutModal.addEventListener('click', (e) => {
      if (e.target === logoutModal) logoutModal.classList.add('hidden');
    });
  }

  // ===== Delegated feedback interactions (row click + status select) =====
  function setupFeedbackInteractions() {
    const tbody = document.getElementById('feedbackTableBody');
    if (!tbody) return;

    // --- initial: disable backward options for all selects in the table ---
    tbody.querySelectorAll('select[name="status"]').forEach(sel => {
      try {
        const cur = parseInt(sel.value, 10);
        if (!isNaN(cur)) {
          for (let opt of sel.options) {
            const v = parseInt(opt.value, 10);
            if (!isNaN(v) && v < cur) opt.disabled = true;
          }
        }
      } catch (e) {}
      // defensive - opening the select shouldn't trigger row navigation
      sel.addEventListener('click', ev => ev.stopPropagation());
    });

    // Delegated click: navigate to detail when clicking a non-interactive part of a row
    tbody.addEventListener('click', (e) => {
      // ignore if click originated from interactive elements
      if (e.target.closest('select, button, a, form, input, textarea, label')) return;

      // ignore modifier keys / middle click
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;

      const tr = e.target.closest('tr[data-url]');
      if (!tr) return;

      const url = tr.dataset.url;
      if (!url) return;

      // If a SPA loader exists, prefer it; otherwise do a normal navigation.
      e.preventDefault();
      e.stopPropagation();
      if (typeof loadFeedbackDetail === 'function') {
        try {
          loadFeedbackDetail(url, true);
        } catch (err) {
          // fallback to full navigation on error
          window.location.href = url;
        }
      } else {
        window.location.href = url;
      }
    });

    // Delegated change: handle status select changes
    tbody.addEventListener('change', (e) => {
      const sel = e.target.closest('select[name="status"]');
      if (!sel) return;
      // safety
      e.stopPropagation();

      // disable backward options to prevent regression
      const chosen = parseInt(sel.value, 10);
      for (let opt of sel.options) {
        const v = parseInt(opt.value, 10);
        if (!isNaN(v) && v < chosen) opt.disabled = true;
      }

      // submit the enclosing form (server will validate)
      const form = sel.closest('form');
      if (form) form.submit();
    });
  }

  // ===== Reports image reload (your existing logic) =====
  (function () {
    const chartBase = window.Admin_Chart_Base || '/adminUser/admin/chart/category';
    const chartImg = document.getElementById('category-chart-img');
    if (!chartImg) return;

    qsa('.period-link').forEach(link => {
      link.addEventListener('click', function (ev) {

        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;

        ev.preventDefault();
        const period = this.dataset.period || 'all';

        chartImg.classList.add('opacity-30');

        qsa('.period-link').forEach(a => a.classList.remove('bg-slate-800','text-white'));
        this.classList.add('bg-slate-800','text-white');


        chartImg.src = chartBase + '?period=' + encodeURIComponent(period);

        chartImg.onload = () => {
          chartImg.classList.remove('opacity-30');
        };
        chartImg.onerror = () => {
          chartImg.classList.remove('opacity-30');
          alert('Could not load chart. Try reloading the page.');
        };

        try {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('period', period);
          newUrl.hash = 'reports';
          window.history.replaceState({}, '', newUrl.toString());
        } catch (e) {}
      });
    });
  })();

  // ===== User role change helper (keeps your original behavior) =====
  function changeUserRole(userId, currentRoleId) {
    const newRoleId = currentRoleId === 1 ? 2 : 1;
    const roleLabel = newRoleId === 1 ? 'Admin' : 'User';
    if (!confirm(`Change this user's role to ${roleLabel}?`)) return;

    fetch('/adminUser/update-role', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:`user_id=${encodeURIComponent(userId)}&new_role_id=${encodeURIComponent(newRoleId)}`
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

  // ===== Expose globals used in template =====
  window.showSection = showSection;
  window.toggleMobileMenu = toggleMobileMenu;
  window.toggleMobileMenuIfOpen = toggleMobileMenuIfOpen;
  window.setActiveNavItem = setActiveNavItem;
  window.filterFeedback = filterFeedback;
  window.changeUserRole = changeUserRole;

})();
