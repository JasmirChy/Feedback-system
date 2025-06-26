    // Define feedback categories (from admin panel)
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

    // Sample user feedbacks (this would ideally come from a database)
    const userFeedbacks = [
      {
        id: 'user_f001',
        title: "Request for new course in AI",
        category: "Academic",
        submitter: "Current User",
        date: "2025-06-22",
        status: "Pending",
        message: "I would like to request a new elective course focusing on advanced topics in Artificial Intelligence and Machine Learning. This would greatly benefit students pursuing careers in tech."
      },
      {
        id: 'user_f002',
        title: "Improve cafeteria food quality",
        category: "Administrative",
        submitter: "Current User",
        date: "2025-06-19",
        status: "Under Review",
        message: "The quality and variety of food options in the main cafeteria have declined. Could we explore healthier and more diverse meal choices?"
      },
      {
        id: 'user_f003',
        title: "Broken projector in Room 305",
        category: "Infrastructure",
        submitter: "Current User",
        date: "2025-06-15",
        status: "Resolved",
        message: "The projector in lecture hall 305 is not working. It flickers constantly and makes it difficult to follow presentations."
      },
      {
        id: 'user_f004',
        title: "Suggestion for career counseling workshop",
        category: "General Suggestion",
        submitter: "Current User",
        date: "2025-06-10",
        status: "Pending",
        message: "It would be great to have more workshops focused on career counseling and job interview preparation for final year students."
      }
    ];

    // Global variable to store the currently viewed feedback
    let currentFeedback = null;

    document.addEventListener('DOMContentLoaded', function() {
      showSection('home');
      // Show welcome notification for user
      showNotification("Welcome User!", "success");

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
      const icon = submenu.previousElementSibling.querySelector('.fa-chevron-down');
      icon.classList.toggle('rotate-180');
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

    function logout() {
      console.log('Logging out...');
      
      if (window.innerWidth < 768 && document.getElementById('mobile-sidebar').classList.contains('translate-x-0')) {
        toggleMobileMenu();
      }
      window.location.href = 'login.html'; // Redirect to login page
    }

    /**
     * Displays a temporary notification message.
     * @param {string} message The message to display.
     * @param {string} type The type of notification ('success', 'error', 'info').
     */
    function showNotification(message, type = "info") {
      const notificationArea = document.createElement("div");
      // Styling for centering the notification at the top
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
     * Handles the submission of new feedback.
     * @param {Event} event The form submission event.
     */
    function handleFeedbackSubmission(event) {
      event.preventDefault();

      const title = document.getElementById('title').value;
      const category = document.getElementById('category').value;
      const details = document.getElementById('details').value;
      const hideDetails = document.getElementById('hideDetails').checked;

      if (!title || !category || !details) {
        showNotification("Please fill in all required fields (Title, Category, Details).", "error");
        return;
      }

      const newFeedback = {
        id: 'user_f' + (userFeedbacks.length + 1).toString().padStart(3, '0'),
        title: title,
        category: category,
        submitter: hideDetails ? "Anonymous" : "Current User", // Simplified for demo
        date: new Date().toISOString().split('T')[0], // Current date
        status: "Pending", // Always pending on submission
        message: details
      };

      userFeedbacks.push(newFeedback);
      showNotification("Your feedback has been submitted successfully!", "success");
      document.getElementById('submitFeedbackForm').reset(); // Clear form
      showSection('history'); // Navigate to history to see the new feedback
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
      const totalCount = userFeedbacks.length;
      const pendingCount = userFeedbacks.filter(fb => fb.status.toLowerCase() === 'pending' || fb.status.toLowerCase() === 'under review').length;
      const resolvedCount = userFeedbacks.filter(fb => fb.status.toLowerCase() === 'resolved').length;

      document.getElementById('totalSubmissionsCount').innerText = totalCount;
      document.getElementById('pendingSubmissionsCount').innerText = pendingCount;
      document.getElementById('resolvedSubmissionsCount').innerText = resolvedCount;
    }


    /**
     * Displays the full details of a selected user feedback.
     * @param {string} feedbackId The ID of the feedback to display.
     */
    function showUserFeedbackDetails(feedbackId) {
      currentFeedback = userFeedbacks.find(fb => fb.id === feedbackId);

      if (currentFeedback) {
        document.getElementById("detailUserTitle").innerText = currentFeedback.title;
        document.getElementById("detailUserSubmitter").innerText = currentFeedback.submitter;
        document.getElementById("detailUserCategory").innerText = currentFeedback.category;
        document.getElementById("detailUserStatus").innerText = currentFeedback.status;
        document.getElementById("detailUserDate").innerText = currentFeedback.date;
        document.getElementById("detailUserMessage").innerText = currentFeedback.message;

        let statusClass = '';
        let statusIcon = '';
        if (currentFeedback.status.toLowerCase() === 'pending') {
          statusClass = 'bg-yellow-100 text-yellow-800';
          statusIcon = 'fas fa-clock';
        } else if (currentFeedback.status.toLowerCase() === 'under review') {
          statusClass = 'bg-blue-100 text-blue-800';
          statusIcon = 'fas fa-hourglass-half';
        } else if (currentFeedback.status.toLowerCase() === 'resolved') {
          statusClass = 'bg-green-100 text-green-800';
          statusIcon = 'fas fa-check-circle';
        } else {
          statusClass = 'bg-gray-100 text-gray-800';
          statusIcon = 'fas fa-info-circle';
        }
        document.getElementById("detailUserStatus").className = `font-semibold px-3 py-1 rounded-full text-sm ${statusClass}`;
        
        showSection("userFeedbackDetails");
      } else {
        showNotification("Feedback not found.", "error");
      }
    }

    // Function to go back from feedback details to history
    function goBackToFeedbackHistory() {
      showSection('history');
    }
