    /**
     * Handles the login form submission.
     * Differentiates between 'admin' and 'user' roles for redirection.
     * @param {Event} event The submit event object.
     */
    function handleLogin(event) {
      event.preventDefault(); // Prevent default form submission

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      // User and admin differentiation
      if (username === "admin" && password === "admin123") {
        window.location.href = "admin_dashboard.html";
      } else if (username === "user" && password === "user123") {
        window.location.href = "user_dashboard.html";
      } else {
        // Show notification for invalid login
        showNotification("Invalid username or password. Please try again.", "error");
      }
      return false; // Prevent actual form submission
    }

    /**
     * Closes the error modal.
     * Note: With the new showNotification, this specific closeModal for the error modal might become redundant
     * if the error is only shown via notification. However, keeping it in case a specific modal UI is desired.
     */
    function closeModal() {
      const errorModal = document.getElementById("errorModal");
      if (errorModal) {
        errorModal.classList.add("hidden");
      }
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
