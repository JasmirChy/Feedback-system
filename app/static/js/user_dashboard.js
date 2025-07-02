
window.addEventListener('DOMContentLoaded', () => {
  // ----- Navigation Binding -----
  document.querySelectorAll('.nav-item[data-target]').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target) showSection(target);
    });
  });

  // ----- Submenu Toggle Binding -----
  document.querySelectorAll('[data-submenu-target]').forEach(item => {
    item.addEventListener('click', () => {
      const submenuId = item.dataset.submenuTarget;
      const submenu = document.getElementById(submenuId);
      if (submenu) submenu.classList.toggle('hidden');
      item.querySelector('.fa-chevron-down')?.classList.toggle('rotate-180');
    });
  });

});


// ----- Section Management -----
function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
  setActiveNavItem(id);
  window.scrollTo(0, 0);
  if (id === 'home') updateDashboardCounts();
  if (id === 'history') renderUserFeedbacksHistory();
  if (id === 'submitFeedback') initAttachments();
  if (window.innerWidth < 768) toggleMobileMenuIfOpen();
}

// ----- Dashboard Counts -----
function updateDashboardCounts() {
    if (!Array.isArray(window.userFeedbacks)) return;
    const total = document.getElementById('totalSubmissionsCount');
    const pending = document.getElementById('pendingSubmissionsCount');
    const resolved = document.getElementById('resolvedSubmissionsCount');
    if (total) total.innerText = window.userFeedbacks.length;
    if (pending) pending.innerText = window.userFeedbacks.filter(f => f.status === 1).length;
    if (resolved) resolved.innerText = window.userFeedbacks.filter(f => f.status === 2).length;
}

// ----- Attachment Drop-Zone -----
function initAttachments() {
   const container = document.getElementById('attachments-container');
   if (container && container.childElementCount === 0) {
      ensureNewDropZone(container);
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

// ----- Utility Functions -----

function setActiveNavItem(id) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('bg-gradient-to-r','from-teal-50','to-white','text-teal-600','border','border-teal-100');
    item.classList.add('text-slate-700','hover:text-teal-600');
  });
  const active = document.querySelector(`[onclick="showSection('${id}')"]`);
  if (active) {
    active.classList.remove('text-slate-700','hover:text-teal-600');
    active.classList.add('bg-gradient-to-r','from-teal-50','to-white','text-teal-600','border','border-teal-100');
  }
}

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
  const list = dz.querySelector('.file-list');

  dz.addEventListener('click', () => inp.click());
  inp.addEventListener('change', () => handleFilesSelected(inp.files, wrapper, container));
  ['dragenter','dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('border-teal-400','bg-teal-50'); }));
  ['dragleave','drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('border-teal-400','bg-teal-50'); }));
  dz.addEventListener('drop', ev => { ev.preventDefault(); inp.files = ev.dataTransfer.files; handleFilesSelected(inp.files, wrapper, container); });

  wrapper.appendChild(dz);
  container.appendChild(wrapper);
}

function handleFilesSelected(files, wrapper, container) {
  const inp = wrapper.querySelector('input[type="file"]');
  wrapper.querySelector('.drop-zone')?.remove();

  Array.from(files).forEach(file => {
    const preview = document.createElement('div');
    preview.className = 'flex items-center justify-between bg-slate-100 p-3 rounded mb-2';
    const name = document.createElement('span'); name.textContent = file.name; name.className='text-slate-800';
    const remove = document.createElement('button'); remove.innerHTML='✖️'; remove.className='text-red-500 hover:text-red-700';
    remove.onclick = () => { preview.remove(); inp.value = ''; };
    preview.append(name, remove);
    wrapper.appendChild(preview);
  });

  ensureNewDropZone(container);
}

function renderUserFeedbacksHistory() {
  const container = document.getElementById('feedbackHistoryContainer');
  if (!container) return;

  const feedbacks = window.userFeedbacks || [];
  container.innerHTML = '';

  if (feedbacks.length === 0) {
    container.innerHTML = '<p class="text-slate-500">No feedback history available.</p>';
    return;
  }

  feedbacks.forEach(fb => {
    const div = document.createElement('div');
    div.className = 'p-4 bg-white rounded shadow mb-2';
    div.innerHTML = `
      <h3 class="font-semibold text-slate-700">${fb.title}</h3>
      <p class="text-sm text-slate-600">${fb.body}</p>
      <p class="text-xs text-slate-400 mt-1">Status: ${fb.status === 1 ? 'Pending' : 'Resolved'}</p>
    `;
    container.appendChild(div);
  });
}


// Expose globally
window.showSection = showSection;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleMobileMenuIfOpen = toggleMobileMenuIfOpen;
window.initAttachments = initAttachments;
window.setActiveNavItem = setActiveNavItem;
window.toggleSubmenu = id => {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
};
window.goBackToFeedbackHistory = () => showSection('history');
