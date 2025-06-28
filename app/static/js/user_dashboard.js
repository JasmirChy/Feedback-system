    // Global variable to store the currently viewed feedback
    let currentFeedback = null;

    document.addEventListener('DOMContentLoaded', function() {
      showSection('home');

      // Add event listener for clicking outside to close mobile menu
      document.addEventListener('click', function(event) {
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

      // Populate category dropdown on page load
      populateCategoryDropdown();

      // Add event listener for submit feedback form
      const submitFeedbackForm = document.getElementById('submitFeedbackForm');
      if (submitFeedbackForm) {
        submitFeedbackForm.addEventListener('submit', handleFeedbackSubmission);
      }

      // Update dashboard counts on load
      updateDashboardCounts();

      // Wire up the logout-confirmation modal buttons:
      document.querySelectorAll('.signOutBtn').forEach(btn =>
        btn.addEventListener('click', () => document.getElementById('logoutModal').classList.remove('hidden'))
      );
      document.getElementById('cancelLogoutBtn').addEventListener('click', () =>
        document.getElementById('logoutModal').classList.add('hidden')
      );
      document.getElementById('confirmLogoutBtn').addEventListener('click', () => {
        window.location.href = "{{ url_for('auth.logout') }}";
      });


      // —— new drop‑zone wiring ——
      const attachmentInput = document.getElementById('attachment');
      const attachmentList  = document.getElementById('attachment-list');
      const dropZone        = document.getElementById('drop-zone');

      // 1) When they pick via file‑picker...
      attachmentInput.addEventListener('change', updateFileList);

      // 2) (Optional) Support dragging files directly into the drop‑zone
      // Highlight on drag-over
      ['dragenter','dragover'].forEach(ev =>
        dropZone.addEventListener(ev, e => {
          e.preventDefault();
          dropZone.classList.add('border-teal-400', 'bg-teal-50');
        })
      );

      // Remove highlight on drag-leave or drop
      ['dragleave','drop'].forEach(ev =>
        dropZone.addEventListener(ev, e => {
          e.preventDefault();
          dropZone.classList.remove('border-teal-400', 'bg-teal-50');
        })
      );

      // On drop: wire files on drag-leave or drop
      dropZone.addEventListener('drop', e => {
        attachmentInput.files = e.dataTransfer.files;  // populate input
        updateFileList();
      });

      function updateFileList() {
        // clear old
        attachmentList.innerHTML = '';
        // for each file, append its name
        Array.from(attachmentInput.files).forEach(file => {
          const li = document.createElement('li');
          li.textContent = file.name;
          attachmentList.appendChild(li);
        });
      }

    });
    
    function showSection(sectionId) {
      document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
      });
      
      const sectionToShow = document.getElementById(sectionId);
      if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
        if (sectionId === 'history') {
          renderUserFeedbacksHistory(); // Render history when navigating to it
        }
        if (sectionId === 'home') {
          updateDashboardCounts(); // Update counts when navigating to home
        }
      }
      
      setActiveNavItem(sectionId);
      window.scrollTo(0, 0);
      
      // Close sidebar on mobile after navigation
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
        n.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg text-white font-semibold flex items-center space-x-2 ${ type === 'success' ? 'bg-green-500' : type === 'error'   ? 'bg-red-500'   : 'bg-blue-500'
        }`;
        n.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'times-circle':'info-circle'}"></i> <span>${msg}</span>`;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 5000);
     }

    /**
     * Populates the category dropdown in the submit feedback form.
     */
    function populateCategoryDropdown() {
      const categorySelect = document.getElementById('category');
      categorySelect.innerHTML = '<option value="">-- Choose a category --</option>'; // Reset
      feedbackCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
    }

    /**
     * Renders the user's feedback history dynamically.
     */
    function renderUserFeedbacksHistory() {
      const historyContainer = document.getElementById('userFeedbackHistoryContainer');
      historyContainer.innerHTML = ''; // Clear existing content

      if (userFeedbacks.length === 0) {
        historyContainer.innerHTML = '<p class="text-slate-600 text-center py-8">You have not submitted any feedback yet.</p>';
        return;
      }

      // Sort feedbacks: Resolved at the bottom, others by date descending (latest first)
      const sortedFeedbacks = [...userFeedbacks].sort((a, b) => {
        const statusA = a.status.toLowerCase();
        const statusB = b.status.toLowerCase();
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        if (statusA === 'resolved' && statusB !== 'resolved') {
          return 1; // 'a' (resolved) comes after 'b' (not resolved)
        }
        if (statusB === 'resolved' && statusA !== 'resolved') {
          return -1; // 'b' (resolved) comes after 'a' (not resolved)
        }
        // If both are resolved or both are not resolved, sort by date descending
        return dateB - dateA;
      });

      sortedFeedbacks.forEach(fb => {
        let statusClass = '';
        let statusIcon = '';
        if (fb.status.toLowerCase() === 'pending') {
          statusClass = 'bg-yellow-100 text-yellow-800';
          statusIcon = 'fas fa-clock';
        } else if (fb.status.toLowerCase() === 'under review') {
          statusClass = 'bg-blue-100 text-blue-800';
          statusIcon = 'fas fa-hourglass-half';
        } else if (fb.status.toLowerCase() === 'resolved') {
          statusClass = 'bg-green-100 text-green-800';
          statusIcon = 'fas fa-check-circle';
        } else {
          statusClass = 'bg-gray-100 text-gray-800';
          statusIcon = 'fas fa-info-circle';
        }

        const feedbackCard = document.createElement('div');
        feedbackCard.classList.add('p-6', 'bg-white', 'border', 'border-slate-200', 'rounded-xl', 'hover:shadow-md', 'transition-shadow', 'cursor-pointer');
        
        feedbackCard.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="font-semibold text-slate-800 text-lg mb-2">${fb.title}</h3>
              <p class="text-sm text-slate-500 flex items-center mb-1">
                <i class="fas fa-tags mr-2"></i>Category: ${fb.category}
              </p>
              <p class="text-sm text-slate-500 flex items-center mb-3">
                <i class="fas fa-calendar mr-2"></i>Submitted on ${fb.date}
              </p>
              <p class="text-slate-600 text-sm truncate max-w-lg">${fb.message}</p>
            </div>
            <div class="ml-6">
              <span class="status-indicator px-4 py-2 ${statusClass} rounded-full text-sm font-semibold">
                <i class="${statusIcon} mr-1"></i>${fb.status}
              </span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end text-sm">
            <button onclick="event.stopPropagation(); showUserFeedbackDetails('${fb.id}')" class="text-teal-600 hover:text-teal-700 font-medium">View Details</button>
          </div>
        `;
        historyContainer.appendChild(feedbackCard);
      });
    }

    /**
     * Updates the dashboard counts for total, pending, and resolved submissions.
     */
    function updateDashboardCounts() {
      document.getElementById('totalSubmissionsCount').innerText = userFeedbacks.length;
      document.getElementById('pendingSubmissionsCount').innerText = userFeedbacks.filter(f=>/[Pending|Under Review]/i.test(f.status)).length;
      document.getElementById('resolvedSubmissionsCount').innerText = userFeedbacks.filter(f=>/resolved/i.test(f.status)).length;;
    }


    /**
     * Displays the full details of a selected user feedback.
     * @param {string} feedbackId The ID of the feedback to display.
     */
    function showUserFeedbackDetails(feedbackId) {
      currentFeedback = userFeedbacks.find(f => f.id === id);

      if (!currentFeedback) return showNotification("Feedback not found","error");
        [ 'Title','Submitter','Category','Status','Date','Message' ].forEach(key => {
        document.getElementById(`detailUser${key}`).innerText = currentFeedback[key.toLowerCase()];
      });
      showNotification("Feedback not found.", "error");
    }

    // Function to go back from feedback details to history
    function goBackToFeedbackHistory() {
      showSection('history');
    }
