
document.addEventListener('DOMContentLoaded', function () {
  showSection('home');

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

    const addAttachmentButton = document.getElementById('addAttachmentBtn');
    if (addAttachmentButton) {
        addAttachmentButton.addEventListener('click', function() {
          const attachmentsContainer = document.getElementById('attachments-container');
          if (attachmentsContainer) {
            ensureNewDropZone(attachmentsContainer);
          }
        });
    }
  });


  // Update dashboard counts on load
  if (typeof userFeedbacks !== 'undefined') {
    updateDashboardCounts();
  }

  // wire up log out model
  wireLogoutModal();


  // Initialize dynamic attachment areas
  const attachmentsContainer = document.getElementById('attachments-container');
  if (attachmentsContainer) {
    console.log('→ calling ensureNewDropZone');
    ensureNewDropZone(attachmentsContainer);
  }
  else {
    console.error('❌ could not find #attachments-container!');
  }

});

function wireLogoutModal() {
  document.querySelectorAll('.signOutBtn').forEach(btn =>
    btn.addEventListener('click', () => document.getElementById('logoutModal').classList.remove('hidden'))
  );
  document.getElementById('cancelLogoutBtn').addEventListener('click', () =>
    document.getElementById('logoutModal').classList.add('hidden')
  );
  document.getElementById('confirmLogoutBtn').addEventListener('click', () => {
    window.location.href = "{{ url_for('auth.logout') }}";
  });
}


// —— Dynamic Drop‑Zone Logic —— //

function ensureNewDropZone(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'drop-zone-wrapper mb-4';

  const dz = document.createElement('div');
  dz.className = 'border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-teal-400 transition-colors bg-slate-50 cursor-pointer drop-zone';
  dz.innerHTML = `
    <input type="file" name="attachment" multiple class="hidden" />
    <i class="fas fa-cloud-upload-alt text-5xl text-slate-400 mb-4"></i>
    <p class="text-slate-700 font-semibold text-lg">
      Drag & Drop files here or <span class="text-teal-600 underline">Browse</span>
    </p>
    <p class="text-sm text-slate-500 mt-2">
      Max file size: 10MB per file. Accepted: Images, PDFs, Documents.
    </p>
    <ul class="mt-2 text-left text-sm text-slate-700 space-y-1 list-disc list-inside file-list"></ul>
  `;

  const inp = dz.querySelector('input[type="file"]');
  const flist = dz.querySelector('.file-list');

  dz.addEventListener('click', () => inp.click());
  inp.addEventListener('change', () => handleFilesSelected(inp.files, wrapper, container));

  ['dragenter', 'dragover'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('border-teal-400', 'bg-teal-50'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('border-teal-400', 'bg-teal-50'); })
  );
  dz.addEventListener('drop', e => {
    e.preventDefault();
    inp.files = e.dataTransfer.files;
    handleFilesSelected(inp.files, wrapper, container);
  });

  wrapper.appendChild(dz);
  container.appendChild(wrapper);
}

function handleFilesSelected(files, wrapper, container) {
  // 1) Grab & keep the existing file-input
  const inp = wrapper.querySelector('input[type="file"]');

  // 2) Remove only the drop‑zone box, not the input
  const dz = wrapper.querySelector('.drop-zone');
  dz.remove();

  // 3) For each selected file, add a preview row
  Array.from(files).forEach(file => {
    const preview = document.createElement('div');
    preview.className = 'flex items-center justify-between bg-slate-100 p-3 rounded mb-2';

    const name = document.createElement('span');
    name.textContent = file.name;
    name.className = 'text-slate-800';

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '✖️';
    removeBtn.className = 'text-red-500 hover:text-red-700';
    removeBtn.onclick = () => {
      // Remove preview row
      preview.remove();
      // Also clear that input so it doesn’t submit
      inp.value = '';
    };

    preview.appendChild(name);
    preview.appendChild(removeBtn);
    wrapper.appendChild(preview);
  });

  // 4) Now inject a fresh drop‑zone (with its own input) below
  ensureNewDropZone(container);
}


function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.add('hidden');
  });

  const sectionToShow = document.getElementById(sectionId);
  if (sectionToShow) {
    sectionToShow.classList.remove('hidden');

    if (sectionId === 'history' && typeof userFeedbacks !== 'undefined') {
      renderUserFeedbacksHistory();
    }

    if (sectionId === 'home' && typeof userFeedbacks !== 'undefined') {
      updateDashboardCounts();
    }

    // 🟢 Inject drop zone when opening submit section
    if (sectionId === 'submitFeedback') {
      const attachmentsContainer = document.getElementById('attachments-container');
      if (attachmentsContainer && attachmentsContainer.childElementCount === 0) {
        ensureNewDropZone(attachmentsContainer);
      }
    }
  }

  setActiveNavItem(sectionId);
  window.scrollTo(0, 0);

  if (window.innerWidth < 768 && document.getElementById('mobile-sidebar').classList.contains('translate-x-0')) {
    toggleMobileMenu();
  }
}

function setActiveNavItem(sectionId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('bg-gradient-to-r', 'from-teal-50', 'to-white', 'text-teal-600', 'border', 'border-teal-100');
    item.classList.add('text-slate-700', 'hover:text-teal-600');
  });

  const activeNavItem = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
  if (activeNavItem) {
    activeNavItem.classList.remove('text-slate-700', 'hover:text-teal-600');
    activeNavItem.classList.add('bg-gradient-to-r', 'from-teal-50', 'to-white', 'text-teal-600', 'border', 'border-teal-100');
  }

  document.querySelectorAll('#settingsSubmenuSidebar li').forEach(item => {
    item.classList.remove('bg-teal-50', 'text-teal-600');
  });
}

function toggleSubmenu(submenuId) {
  const submenu = document.getElementById(submenuId);
  submenu.classList.toggle('hidden');
  submenu.previousElementSibling.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
}

function toggleMobileMenu() {
  const sidebar = document.getElementById('mobile-sidebar');
  sidebar.classList.toggle('translate-x-0');
  sidebar.classList.toggle('-translate-x-full');
  const hamburger = document.getElementById('hamburger-icon');
  hamburger.classList.toggle('fa-bars');
  hamburger.classList.toggle('fa-times');
  document.body.classList.toggle('overflow-hidden');
}

/**
 * Displays a temporary notification message.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('success', 'error', 'info').
 */
function showNotification(msg, type = "info") {
  const n = document.createElement('div');
  n.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg text-white font-semibold flex items-center space-x-2 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
  n.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i> <span>${msg}</span>`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 5000);
}

/**
 * Updates the dashboard counts for total, pending, and resolved submissions.
 */
function updateDashboardCounts() {
  // Check if userFeedbacks is defined and an array
  if (typeof userFeedbacks === 'undefined' || !Array.isArray(userFeedbacks)) {
    console.warn("userFeedbacks is not defined or not an array. Dashboard counts might be incorrect.");
    return;
  }

  document.getElementById('totalSubmissionsCount').innerText = userFeedbacks.length;

  document.getElementById('pendingSubmissionsCount').innerText =
    userFeedbacks.filter(f => f.status === 1).length; // Check for status == 1 (Pending)

  document.getElementById('resolvedSubmissionsCount').innerText =
    userFeedbacks.filter(f => f.status === 2).length; // Check for status == 2 (Resolved)
}


/**
 * Simple HTML-escape for plain-text insertion
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// Function to go back from feedback details to history
function goBackToFeedbackHistory() {
  showSection('history');
}


// make these available to inline handlers
window.showSection       = showSection;
window.toggleMobileMenu  = toggleMobileMenu;
window.toggleSubmenu     = toggleSubmenu;
window.goBackToFeedbackHistory = goBackToFeedbackHistory;