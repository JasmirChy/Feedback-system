// app/static/js/admin_dashboard.js
(function () {
  'use strict';

  // ---------- DOM Ready ----------
  window.addEventListener('DOMContentLoaded', () => {
    bindNavClicks();
    bindSubmenuToggles();
    setupLogoutModal();
    setupFeedbackClick();         // load detail via AJAX (no reload)
    bindStatusSelects();          // handle status changes via AJAX (idempotent)
    bindAjaxForms();              // delegated submit handling for ajax-form / ajax-admin-request
    ensureFlashContainer();       // top-center flash container
    loadInitialCounts();          // read server-provided totals once
    updateSummaryCounts();        // render the stored totals
    setupHistoryHandler();        // popstate handling for SPA-like nav
    delegateSpaBack();            // make Back button use history.back()

    // Ensure admin-requests lists are in sync on initial load
    if (typeof refreshAdminRequestsLists === 'function') {
      try { refreshAdminRequestsLists(); } catch (e) { /* best-effort */ }
    }
  });

  // ---------- Tiny helpers ----------
  const qsa = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
  const qs = (sel, ctx = document) => (ctx || document).querySelector(sel);

  // ---------- Normalize counts utility ----------
  function normalizeCounts(raw) {
    if (!raw || typeof raw !== 'object') return null;
    // Accept either 'resolved' or 'solved' from server, normalize to 'solved'
    const total = Number(raw.total || raw.count || 0) || 0;
    const pending = Number(raw.pending || 0) || 0;
    const inprogress = Number(raw.inprogress || 0) || 0;
    const solved = Number(raw.solved || raw.resolved || 0) || 0;
    return { total, pending, inprogress, solved };
  }

  // ---------- Flash container (top center of main) ----------
  function ensureFlashContainer() {
    let container = qs('#flash-messages');
    const main = qs('main.desktop-main') || document.body;

    if (container) {
      Object.assign(container.style, {
        position: 'sticky',
        top: '1rem',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        width: '100%'
      });
      Array.from(container.children).forEach(ch => ch.style.pointerEvents = 'auto');
      return container;
    }

    container = document.createElement('div');
    container.id = 'flash-messages';
    Object.assign(container.style, {
      position: 'sticky',
      top: '1rem',
      zIndex: 60,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
      width: '100%'
    });
    if (main.firstChild) main.insertBefore(container, main.firstChild);
    else main.appendChild(container);
    return container;
  }

  function clearFlashContainer() {
    const c = qs('#flash-messages');
    if (c) c.innerHTML = '';
  }

  function buildFlashNode(message, category='info') {
    const classMap = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error:   'bg-red-100 text-red-800',
      info:    'bg-blue-100 text-blue-800'
    };
    const wrapper = document.createElement('div');
    wrapper.className = `p-4 rounded shadow inline-block ${classMap[category] || classMap.info}`;
    wrapper.style.pointerEvents = 'auto';
    wrapper.style.maxWidth = 'min(900px, 90vw)';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.margin = '0.25rem';
    wrapper.innerText = message;
    return wrapper;
  }

  function renderFlashFromHTML(htmlFragment) {
    const container = ensureFlashContainer();
    if (!container) return false;
    container.innerHTML = '';
    const temp = document.createElement('div');
    temp.innerHTML = htmlFragment;
    Array.from(temp.children).forEach(ch => {
      ch.style.pointerEvents = 'auto';
      ch.style.display = 'inline-block';
      ch.style.margin = '0.25rem';
      container.appendChild(ch);
    });
    window.setTimeout(() => fadeOutFlash(container), 5000);
    return true;
  }

  function renderFlashFromJSON(message, category = 'info') {
    const container = ensureFlashContainer();
    if (!container) return false;
    container.innerHTML = '';
    const node = buildFlashNode(message, category);
    container.appendChild(node);
    window.setTimeout(() => fadeOutFlash(container), 5000);
    return true;
  }

  function fadeOutFlash(container) {
    try {
      container.style.transition = 'opacity 0.5s';
      container.style.opacity = '0';
      setTimeout(() => { container.innerHTML = ''; container.style.opacity = ''; }, 500);
    } catch (e) {}
  }

  function showInlineToast(message, type = 'error', duration = 4000) {
    const containerId = 'inline-toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '1rem';
      container.style.left = '1rem';
      container.style.zIndex = 9999;
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'p-3 mb-2 rounded shadow';
    el.style.background = (type === 'error') ? '#fee2e2' : '#ecfeff';
    el.style.color = (type === 'error') ? '#991b1b' : '#0f766e';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ---------- Navigation & Sections ----------
  function bindNavClicks() {
    qsa('.nav-item[data-target]').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.target;
        if (target) showSection(target);
      });
    });
  }

  function bindSubmenuToggles() {
    qsa('[data-submenu-target]').forEach(item => {
      item.addEventListener('click', () => {
        const submenuId = item.dataset.submenuTarget;
        const submenu = document.getElementById(submenuId);
        if (submenu) submenu.classList.toggle('hidden');
        const chev = item.querySelector('.fa-chevron-down');
        if (chev) chev.classList.toggle('rotate-180');
      });
    });
  }

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
    if (el) {
      el.classList.remove('hidden');
      setActiveNavItem(id);
      toggleMobileMenuIfOpen();
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    }
  }

  // ----- Mobile Menu -----
  function toggleMobileMenu() {
    const sidebar = document.getElementById('mobile-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('-translate-x-full');
    sidebar.classList.toggle('translate-x-0');
    document.body.classList.toggle('overflow-hidden');
  }
  function toggleMobileMenuIfOpen() {
    const sidebar = document.getElementById('mobile-sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('translate-x-0')) toggleMobileMenu();
  }

  // ---------- Feedback filtering (only hides rows; counts remain from FEEDBACK_COUNTS) ----------
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
      } else if ((type === 'resolved' || type === 'solved') && status === 'solved') {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
    // counts reflect DB totals loaded on startup and only change on real updates
  }

  // ---------- Feedback row click -> load details via AJAX (no reload) ----------
  function setupFeedbackClick() {
    qsa('tr[data-url]').forEach(row => {
      if (row.__spa_bound) return;
      row.__spa_bound = true;
      row.addEventListener('click', (ev) => {
        if (ev.target.closest('a, button, input, select, textarea, form')) return;
        const url = row.dataset.url;
        if (url) {
          loadFeedbackDetail(url, true);
        }
      });
    });
  }

  async function loadFeedbackDetail(url, pushHistory = true) {
    try {
      const headers = { 'X-Requested-With': 'XMLHttpRequest' };
      const resp = await fetch(url, { headers, credentials: 'same-origin' });
      const text = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const detailEl = doc.getElementById('feedbackDetail');
      const remoteFlash = doc.getElementById('flash-messages');

      if (remoteFlash && remoteFlash.innerHTML.trim()) {
        renderFlashFromHTML(remoteFlash.innerHTML);
      }

      if (detailEl) {
        const currentDetail = qs('#feedbackDetail');
        if (currentDetail) {
          currentDetail.innerHTML = detailEl.innerHTML;
        } else {
          const main = qs('main.desktop-main') || document.body;
          main.appendChild(detailEl);
        }

        showSection('feedbackDetail');

        // Re-bind newly inserted elements
        setupFeedbackClick();
        bindStatusSelects();
        bindAjaxForms();

        if (pushHistory) {
          try {
            window.history.pushState({ section: 'feedbackDetail', url }, '', url);
          } catch (e) {}
        }
      } else {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Could not load feedback detail', err);
      showInlineToast('Could not load feedback detail. Try reloading the page.', 'error');
    }
  }

  // ---------- History handling ----------
  function setupHistoryHandler() {
    try {
      const initialSection = document.getElementById('feedbackDetail') && !document.getElementById('feedbackDetail').classList.contains('hidden')
        ? 'feedbackDetail' : (window.location.hash ? window.location.hash.replace('#','') : (window.initialSection || 'home'));
      window.history.replaceState({ section: initialSection, url: window.location.href }, '', window.location.href);
    } catch (e) {}

    window.addEventListener('popstate', (ev) => {
      const state = ev.state || {};
      const section = state.section || 'home';
      if (section === 'feedbackDetail' && state.url) {
        loadFeedbackDetail(state.url, false);
      } else {
        showSection(section);
      }
    });
  }

  // Make anchors with .spa-back use history.back()
  function delegateSpaBack() {
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('.spa-back');
      if (!a) return;
      ev.preventDefault();
      if (window.history && window.history.length > 1) window.history.back();
      else {
        showSection('home');
        try { window.history.replaceState({ section: 'home', url: window.location.origin + window.location.pathname }, '', window.location.origin + window.location.pathname); } catch (e) {}
      }
    });
  }

  // ---------- Logout modal ----------
  function setupLogoutModal() {
    const signOutBtn = qs('.signOutBtn');
    const logoutModal = qs('#logoutModal');
    const confirmLogoutBtn = qs('#confirmLogoutBtn');
    const cancelLogoutBtn = qs('#cancelLogoutBtn');

    if (!signOutBtn || !logoutModal) return;

    signOutBtn.addEventListener('click', () => logoutModal.classList.remove('hidden'));
    if (confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener('click', () => {
        const url = window.LOGOUT_URL || '/auth/logout';
        window.location.href = url;
      });
    }
    if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', () => logoutModal.classList.add('hidden'));
    logoutModal.addEventListener('click', (e) => { if (e.target === logoutModal) logoutModal.classList.add('hidden'); });
  }

  // ---------- Refresh admin-requests lists from server (pending + denied) ----------
  async function refreshAdminRequestsLists() {
    const url = window.ADMIN_REQUESTS_LIST_URL || '/admin/requests/list.json';
    try {
      const resp = await fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!resp.ok) {
        console.warn('Could not fetch admin requests list', resp.status);
        return;
      }
      const data = await resp.json();

      // helper to escape user content
      const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // optional csrf hidden input for injected forms (if your server uses a form-field token)
      const csrfHidden = window.CSRF_TOKEN ? `<input type="hidden" name="csrf_token" value="${esc(window.CSRF_TOKEN)}">` : '';

      // Build pending rows
      const pendingBody = qs('#pendingRequestsBody');
      if (pendingBody) {
        if (!Array.isArray(data.pending) || data.pending.length === 0) {
          pendingBody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-gray-500">No pending requests.</td></tr>`;
        } else {
          pendingBody.innerHTML = data.pending.map(req => {
            const uid = esc(req.user_id);
            const username = esc(req.username);
            const currentRole = (req.current_role_id === 1) ? 'Admin' : 'User';
            const requestedRole = (req.requested_role === 1) ? 'Admin' : 'User';
            const requestedAt = esc(req.requested_at || '');
            const approveUrl = (window.ADMIN_APPROVE_URL || '/admin/approve-admin-request');
            const denyUrl = (window.ADMIN_DENY_URL || '/admin/deny-admin-request');

            return `
              <tr class="border-t border-gray-200" data-userid="${uid}">
                <td class="py-3 px-4">${uid}</td>
                <td class="py-3 px-4">${username}</td>
                <td class="py-3 px-4">${currentRole}</td>
                <td class="py-3 px-4">${requestedRole}</td>
                <td class="py-3 px-4">${requestedAt}</td>
                <td class="py-3 px-4 flex flex-wrap gap-2">
                  <form method="POST" action="${approveUrl}" class="ajax-admin-request" data-userid="${uid}">
                    ${csrfHidden}
                    <input type="hidden" name="user_id" value="${uid}">
                    <input type="hidden" name="new_role_id" value="${esc(req.requested_role)}">
                    <button type="submit" class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Accept</button>
                  </form>
                  <form method="POST" action="${denyUrl}" class="ajax-admin-request" data-userid="${uid}">
                    ${csrfHidden}
                    <input type="hidden" name="user_id" value="${uid}">
                    <button type="submit" class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Deny</button>
                  </form>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // Build denied rows
      const deniedBody = qs('#deniedRequestsBody');
      if (deniedBody) {
        if (!Array.isArray(data.denied) || data.denied.length === 0) {
          deniedBody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-gray-500">No denied requests.</td></tr>`;
        } else {
          deniedBody.innerHTML = data.denied.map(req => {
            const uid = esc(req.user_id);
            const username = esc(req.username);
            const currentRole = (req.current_role_id === 1) ? 'Admin' : 'User';
            const requestedRole = (req.requested_role === 1) ? 'Admin' : 'User';
            const requestedAt = esc(req.requested_at || '');
            const reopenUrl = (window.ADMIN_REOPEN_URL || '/admin/requests/reopen');

            return `
              <tr class="border-t border-gray-200" data-userid="${uid}">
                <td class="py-3 px-4">${uid}</td>
                <td class="py-3 px-4">${username}</td>
                <td class="py-3 px-4">${currentRole}</td>
                <td class="py-3 px-4">${requestedRole}</td>
                <td class="py-3 px-4">${requestedAt}</td>
                <td class="py-3 px-4 flex gap-2">
                  <form method="POST" action="${reopenUrl}" class="ajax-admin-request" data-userid="${uid}">
                    ${csrfHidden}
                    <input type="hidden" name="user_id" value="${uid}">
                    <button type="submit" class="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Re-open</button>
                  </form>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // Rebind clicks if any row contains feedback links
      setupFeedbackClick();
    } catch (err) {
      console.error('Failed to refresh admin requests lists', err);
    }
  }

  // ---------- Delegated AJAX form submit handler (approve/deny/reopen / ajax-form) ----------
  document.addEventListener('submit', async function (ev) {
    const form = ev.target;
    if (!form || !form.matches) return;

    // only intercept forms marked with class ajax-admin-request or ajax-form
    if (!(form.matches('form.ajax-admin-request') || form.matches('form.ajax-form'))) return;

    ev.preventDefault();

    if (form.__submitting) return;
    form.__submitting = true;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '…'; }

    const formData = new FormData(form);
    const bodyParams = new URLSearchParams();
    for (const pair of formData.entries()) bodyParams.append(pair[0], pair[1]);

    const headers = { 'X-Requested-With': 'XMLHttpRequest' };
    if (window.CSRF_TOKEN) headers['X-CSRFToken'] = window.CSRF_TOKEN;
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

    try {
      const resp = await fetch(form.action, {
        method: (form.method || 'POST').toUpperCase(),
        body: bodyParams.toString(),
        headers,
        credentials: 'same-origin'
      });

      const ctype = (resp.headers.get('Content-Type') || '').toLowerCase();

      if (ctype.includes('application/json')) {
        const data = await resp.json();

        // If server returned aggregated counts, normalize and update summary
        if (data && data.counts) {
          const nc = normalizeCounts(data.counts);
          if (nc) {
            window.FEEDBACK_COUNTS = nc;
            updateSummaryCounts();
          }
        }

        if (resp.ok && data && data.success) {
          if (data.removed_feedback_id || data.removed_user_id) {
            removeRowByFormOrUserId(form);
          }
          if (data.new_feedback && data.new_feedback.status) {
            incrementFeedbackCounts(data.new_feedback.status);
          }

          const cat = data.category || (data.success ? 'success' : 'error');
          if (!renderFlashFromJSON(data.message || 'Action succeeded', cat)) {
            showInlineToast(data.message || 'Action succeeded', 'success');
          }

          // If this was an admin-request action, refresh the pending/denied lists from DB
          if (form.classList.contains('ajax-admin-request')) {
            refreshAdminRequestsLists();
          }
        } else {
          const msg = data && data.message ? data.message : `Server returned ${resp.status}`;
          if (!renderFlashFromJSON(msg, (data && data.category) || 'error')) showInlineToast(msg, 'error');
        }
      } else {
        const text = await resp.text();
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          const remoteFlash = doc.getElementById('flash-messages');
          if (remoteFlash && remoteFlash.innerHTML.trim()) {
            if (!renderFlashFromHTML(remoteFlash.innerHTML)) {
              const firstText = remoteFlash.textContent.trim().split('\n').map(s=>s.trim()).filter(Boolean)[0] || 'Action completed';
              showInlineToast(firstText, 'success');
            }
            removeRowByFormOrUserId(form);
            updateSummaryCounts();
            if (form.classList.contains('ajax-admin-request')) {
              refreshAdminRequestsLists();
            }
          } else {
            const plain = text.replace(/<[^>]+>/g, '').trim().slice(0, 400);
            showInlineToast(plain || `Server returned ${resp.status}`, resp.ok ? 'success' : 'error');
          }
        } catch (err) {
          showInlineToast(`Server returned ${resp.status}`, resp.ok ? 'success' : 'error');
        }
      }

      // update pending badge if present (best-effort)
      const pendingBadge = qs('#pendingRequestsBadge');
      if (pendingBadge) {
        if (window.FEEDBACK_COUNTS && typeof window.FEEDBACK_COUNTS.pending === 'number') {
          pendingBadge.innerText = String(window.FEEDBACK_COUNTS.pending);
        } else {
          const val = Math.max(0, parseInt(pendingBadge.innerText || '0') - 1);
          pendingBadge.innerText = String(val);
        }
      }

    } catch (err) {
      console.error('AJAX admin request failed', err);
      showInlineToast('Network error. Try again.', 'error');
    } finally {
      form.__submitting = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnHtml; }
    }
  });

  // ---------- handle status <select> changes via AJAX (no reload) ----------
  function bindStatusSelects() {
    // idempotent bind: attach listener once
    if (document.__feedback_status_change_bound) return;
    document.__feedback_status_change_bound = true;

    document.addEventListener('change', async function (ev) {
      const sel = ev.target;
      if (!sel || sel.tagName !== 'SELECT' || sel.name !== 'status') return;
      const form = sel.closest('form');
      if (!form) return;

      ev.preventDefault();

      const tr = form.closest('tr[data-url]') || form.closest('tr');
      const oldStatusLabel = tr ? tr.dataset.status : null;
      const oldStatusMap = { pending: '1', inprogress: '2', solved: '3' };
      const oldStatus = oldStatusMap[oldStatusLabel] || null;

      const formData = new FormData(form);
      const params = new URLSearchParams();
      for (const pair of formData.entries()) params.append(pair[0], pair[1]);

      const headers = { 'X-Requested-With': 'XMLHttpRequest' };
      if (window.CSRF_TOKEN) headers['X-CSRFToken'] = window.CSRF_TOKEN;
      headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

      const submitBtn = sel;
      const originalDisabled = submitBtn.disabled;
      submitBtn.disabled = true;

      try {
        const resp = await fetch(form.action, {
          method: (form.method || 'POST').toUpperCase(),
          body: params.toString(),
          headers,
          credentials: 'same-origin'
        });

        const ctype = (resp.headers.get('Content-Type') || '').toLowerCase();

        if (ctype.includes('application/json')) {
          const data = await resp.json();

          // if server returned counts, update them
          if (data && data.counts) {
            const nc = normalizeCounts(data.counts);
            if (nc) { window.FEEDBACK_COUNTS = nc; }
          }

          if (resp.ok && data && data.success) {
            const newStatus = params.get('status');
            if (tr) {
              if (newStatus === '1') tr.dataset.status = 'pending';
              else if (newStatus === '2') tr.dataset.status = 'inprogress';
              else if (newStatus === '3') tr.dataset.status = 'solved';
            }

            if (!window.FEEDBACK_COUNTS) loadInitialCounts();
            const map = { '1': 'pending', '2': 'inprogress', '3': 'solved' };
            const oldKey = oldStatus;
            const newKey = map[newStatus];

            if (oldKey && oldKey !== newStatus) {
              const oldMapKey = map[oldKey];
              if (oldMapKey && typeof window.FEEDBACK_COUNTS[oldMapKey] === 'number') {
                window.FEEDBACK_COUNTS[oldMapKey] = Math.max(0, window.FEEDBACK_COUNTS[oldMapKey] - 1);
              }
              if (newKey && typeof window.FEEDBACK_COUNTS[newKey] === 'number') {
                window.FEEDBACK_COUNTS[newKey] = (window.FEEDBACK_COUNTS[newKey] || 0) + 1;
              }
            }

            updateSelectOptionsAfterStatusChange(sel, params.get('status'));
            renderFlashFromJSON(data.message || 'Status updated', data.category || 'success');
            updateSummaryCounts();
          } else {
            const msg = (data && data.message) ? data.message : `Server returned ${resp.status}`;
            renderFlashFromJSON(msg, (data && data.category) || 'error');
          }
        } else {
          const text = await resp.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          const remoteFlash = doc.getElementById('flash-messages');
          if (remoteFlash && remoteFlash.innerHTML.trim()) {
            renderFlashFromHTML(remoteFlash.innerHTML);
            const newStatus = params.get('status');
            if (tr) {
              if (newStatus === '1') tr.dataset.status = 'pending';
              else if (newStatus === '2') tr.dataset.status = 'inprogress';
              else if (newStatus === '3') tr.dataset.status = 'solved';
            }

            if (!window.FEEDBACK_COUNTS) loadInitialCounts();
            const map = { '1': 'pending', '2': 'inprogress', '3': 'solved' };
            if (oldStatus && oldStatus !== params.get('status')) {
              const oldMapKey = map[oldStatus];
              const newKey = map[params.get('status')];
              if (oldMapKey && typeof window.FEEDBACK_COUNTS[oldMapKey] === 'number') {
                window.FEEDBACK_COUNTS[oldMapKey] = Math.max(0, window.FEEDBACK_COUNTS[oldMapKey] - 1);
              }
              if (newKey && typeof window.FEEDBACK_COUNTS[newKey] === 'number') {
                window.FEEDBACK_COUNTS[newKey] = (window.FEEDBACK_COUNTS[newKey] || 0) + 1;
              }
            }
            updateSelectOptionsAfterStatusChange(sel, params.get('status'));
            updateSummaryCounts();
          } else {
            showInlineToast('Status update failed (server did not return JSON).', 'error');
          }
        }
      } catch (err) {
        console.error('Status update failed', err);
        showInlineToast('Network error during status update.', 'error');
      } finally {
        submitBtn.disabled = originalDisabled;
      }
    });
  }

  function updateSelectOptionsAfterStatusChange(selectEl, newStatusStr) {
    const newStatus = Number(newStatusStr);
    Array.from(selectEl.options).forEach(opt => {
      const val = Number(opt.value);
      if (val < newStatus) opt.disabled = true;
      else opt.disabled = false;
      opt.selected = (val === newStatus);
    });
    selectEl.classList.remove('bg-yellow-100','text-yellow-800','bg-blue-100','text-blue-800','bg-green-100','text-green-800');
    if (newStatus === 1) selectEl.classList.add('bg-yellow-100','text-yellow-800');
    else if (newStatus === 2) selectEl.classList.add('bg-blue-100','text-blue-800');
    else if (newStatus === 3) selectEl.classList.add('bg-green-100','text-green-800');
  }

  // ---------- Remove table row helper (updates totals) ----------
  function removeRowByFormOrUserId(form) {
    const tr = form.closest('tr');
    if (tr) {
      const status = tr.dataset.status;
      if (status && window.FEEDBACK_COUNTS) {
        if (status === 'pending' && typeof window.FEEDBACK_COUNTS.pending === 'number') {
          window.FEEDBACK_COUNTS.pending = Math.max(0, window.FEEDBACK_COUNTS.pending - 1);
        } else if (status === 'inprogress' && typeof window.FEEDBACK_COUNTS.inprogress === 'number') {
          window.FEEDBACK_COUNTS.inprogress = Math.max(0, window.FEEDBACK_COUNTS.inprogress - 1);
        } else if (status === 'solved' && typeof window.FEEDBACK_COUNTS.solved === 'number') {
          window.FEEDBACK_COUNTS.solved = Math.max(0, window.FEEDBACK_COUNTS.solved - 1);
        }
        if (typeof window.FEEDBACK_COUNTS.total === 'number') {
          window.FEEDBACK_COUNTS.total = Math.max(0, window.FEEDBACK_COUNTS.total - 1);
        }
        updateSummaryCounts();
      }
      tr.remove();
      return true;
    }
    const userId = form.dataset.userid || form.querySelector('input[name="user_id"]')?.value;
    if (userId) {
      const row = qs(`tr[data-userid="${userId}"]`);
      if (row) { row.remove(); return true; }
    }
    return false;
  }

  // ---------- Counts: load once at startup & update helpers ----------
  function loadInitialCounts() {
    const readByAttr = (k) => {
      const el = qs(`[data-count="${k}"]`);
      if (el) {
        const n = parseInt(el.textContent.trim().replace(/[^\d]/g, '')) || 0;
        return n;
      }
      return null;
    };

    const totalAttr = readByAttr('total');
    const pendingAttr = readByAttr('pending');
    const inprogressAttr = readByAttr('inprogress');
    const solvedAttr = readByAttr('solved');

    if ([totalAttr, pendingAttr, inprogressAttr, solvedAttr].every(v => v !== null)) {
      window.FEEDBACK_COUNTS = {
        total: totalAttr, pending: pendingAttr, inprogress: inprogressAttr, solved: solvedAttr
      };
      return;
    }

    const statNodes = qsa('.text-2xl.font-bold');
    let counts = { total: 0, pending: 0, inprogress: 0, solved: 0 };
    if (statNodes && statNodes.length >= 1) {
      statNodes.forEach(node => {
        const parent = node.closest('div') || node.parentElement;
        if (!parent) return;
        const label = parent.querySelector('.text-sm') || parent.querySelector('.font-medium');
        const labelText = label ? label.innerText.trim().toLowerCase() : '';
        const val = parseInt(node.textContent.trim().replace(/[^\d]/g, '')) || 0;
        if (labelText.includes('all')) counts.total = val;
        else if (labelText.includes('pending')) counts.pending = val;
        else if (labelText.includes('in progress') || labelText.includes('inprogress')) counts.inprogress = val;
        else if (labelText.includes('solved')) counts.solved = val;
      });
    }

    const rows = qsa('#feedbackTableBody tr');
    if (rows && rows.length) {
      const totals = { total: rows.length, pending: 0, inprogress: 0, solved: 0 };
      rows.forEach(r => {
        const s = r.dataset.status;
        if (s === 'pending') totals.pending++;
        else if (s === 'inprogress') totals.inprogress++;
        else if (s === 'solved') totals.solved++;
      });
      counts.total = counts.total || totals.total;
      counts.pending = counts.pending || totals.pending;
      counts.inprogress = counts.inprogress || totals.inprogress;
      counts.solved = counts.solved || totals.solved;
    }

    window.FEEDBACK_COUNTS = {
      total: counts.total || 0,
      pending: counts.pending || 0,
      inprogress: counts.inprogress || 0,
      solved: counts.solved || 0
    };
  }

  // Update the stat cards using the stored FEEDBACK_COUNTS (do NOT recalc from visible rows)
  function updateSummaryCounts() {
    if (!window.FEEDBACK_COUNTS) loadInitialCounts();
    const { total, pending, inprogress, solved } = window.FEEDBACK_COUNTS || { total:0,pending:0,inprogress:0,solved:0 };

    const setByAttr = (k, val) => {
      const el = qs(`[data-count="${k}"]`);
      if (el) { el.textContent = String(val); return true; }
      return false;
    };

    let wrote = 0;
    wrote += setByAttr('total', total) ? 1 : 0;
    wrote += setByAttr('pending', pending) ? 1 : 0;
    wrote += setByAttr('inprogress', inprogress) ? 1 : 0;
    wrote += setByAttr('solved', solved) ? 1 : 0;

    if (wrote === 4) return;

    function setStatByLabel(labelText, val) {
      const candidate = qsa('.grid .text-sm').find(el => el.innerText.trim().toLowerCase() === labelText.toLowerCase());
      if (candidate) {
        const parent = candidate.closest('[class*="col-span"]') || candidate.closest('div');
        if (!parent) return;
        const countEl = parent.querySelector('.text-2xl.font-bold') || parent.querySelector('[data-count]');
        if (countEl) countEl.innerText = String(val);
      }
    }

    setStatByLabel('All Feedback', total);
    setStatByLabel('Pending', pending);
    setStatByLabel('In Progress', inprogress);
    setStatByLabel('Solved', solved);

    const numericNodes = qsa('.text-2xl.font-bold');
    if (numericNodes && numericNodes.length >= 4) {
      numericNodes[0].textContent = String(total);
      numericNodes[1].textContent = String(pending);
      numericNodes[2].textContent = String(inprogress);
      numericNodes[3].textContent = String(solved);
    }
  }

  // ---------- Exposed helper for new feedback creation ----------
  window.incrementFeedbackCounts = function (status) {
    if (!window.FEEDBACK_COUNTS) loadInitialCounts();
    if (!window.FEEDBACK_COUNTS) window.FEEDBACK_COUNTS = { total:0, pending:0, inprogress:0, solved:0 };
    const map = { '1': 'pending', '2': 'inprogress', '3': 'solved', pending: 'pending', inprogress: 'inprogress', solved: 'solved' };
    const key = map[String(status)];
    if (key && typeof window.FEEDBACK_COUNTS[key] === 'number') {
      window.FEEDBACK_COUNTS[key] = window.FEEDBACK_COUNTS[key] + 1;
    } else if (key) {
      window.FEEDBACK_COUNTS[key] = 1;
    }
    window.FEEDBACK_COUNTS.total = (window.FEEDBACK_COUNTS.total || 0) + 1;
    updateSummaryCounts();
  };

  // ---------- AJAX-enabled small forms (add category, add admin) ----------
  function bindAjaxForms() {
    // delegated submit handler above already handles forms with class 'ajax-form' or 'ajax-admin-request'
  }

  // ---------- User role change ----------
  async function changeUserRole(userId, currentRoleId) {
    const newRoleId = Number(currentRoleId) === 1 ? 2 : 1;
    const roleLabel = newRoleId === 1 ? 'Admin' : 'User';
    if (!confirm(`Change this user's role to ${roleLabel}?`)) return;

    const body = new URLSearchParams();
    body.append('user_id', userId);
    body.append('new_role_id', newRoleId);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (window.CSRF_TOKEN) headers['X-CSRFToken'] = window.CSRF_TOKEN;

    try {
      const resp = await fetch(window.UPDATE_ROLE_URL || '/admin/update-role', {
        method: 'POST',
        body: body.toString(),
        headers,
        credentials: 'same-origin'
      });

      const ctype = (resp.headers.get('Content-Type') || '').toLowerCase();
      let data;
      if (ctype.includes('application/json')) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const remoteFlash = doc.getElementById('flash-messages');
        if (remoteFlash && remoteFlash.innerHTML.trim()) {
          renderFlashFromHTML(remoteFlash.innerHTML);
        } else {
          const plain = text.replace(/<[^>]+>/g, '').trim().split('\n').map(s=>s.trim()).filter(Boolean)[0];
          if (plain) showInlineToast(plain, resp.ok ? 'success' : 'error');
        }
      }

      if (data) {
        if (resp.ok && data.success) {
          renderFlashFromJSON(data.message || 'User role updated', data.category || 'success');
          const tr = qs(`tr[data-userid="${userId}"]`);
          if (tr) tr.remove();
        } else {
          renderFlashFromJSON((data && data.message) || `Failed (status ${resp.status})`, 'error');
        }
      }
    } catch (err) {
      showInlineToast(`Error: ${err.message}`, 'error');
    }
  }

  // expose to global
  window.changeUserRole = changeUserRole;

  // ---------- Chart period handling (unchanged) ----------
  (function () {
    const chartBase = window.ADMIN_CHART_BASE || '/admin/chart/category';
    const chartImg = document.getElementById('category-chart-img');
    if (!chartImg) return;

    document.addEventListener('click', (ev) => {
      const link = ev.target.closest('.period-link');
      if (!link) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
      ev.preventDefault();

      const period = link.dataset.period || 'all';
      chartImg.classList.add('opacity-30');
      qsa('.period-link').forEach(a => a.classList.remove('bg-slate-800','text-white'));
      link.classList.add('bg-slate-800','text-white');

      chartImg.src = `${chartBase}?period=${encodeURIComponent(period)}&_=${Date.now()}`;
      chartImg.onload = () => chartImg.classList.remove('opacity-30');
      chartImg.onerror = () => {
        chartImg.classList.remove('opacity-30');
        showInlineToast('Could not load chart. Try reloading the page.', 'error');
      };

      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('period', period);
        newUrl.hash = 'reports';
        window.history.replaceState({}, '', newUrl.toString());
      } catch (e) {}
    });
  })();

  // ---------- Expose globals ----------
  window.showSection = showSection;
  window.toggleMobileMenu = toggleMobileMenu;
  window.toggleMobileMenuIfOpen = toggleMobileMenuIfOpen;
  window.setActiveNavItem = setActiveNavItem;
  window.filterFeedback = filterFeedback;
  window.refreshAdminRequestsLists = refreshAdminRequestsLists;

})();