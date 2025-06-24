
    /**
     * Handles the password reset form submission.
     * In a real application, this would send an API request to trigger a password reset email.
     * For this demo, it just simulates success and shows a modal.
     * @param {Event} event The submit event object.
     * @returns {boolean} False to prevent default form submission.
     */
    function handlePasswordReset(event) {
      event.preventDefault(); // Prevent default form submission
      
      const email = document.getElementById('email').value;
      console.log('Password reset requested for:', email);

      // Simulate API call success
      showNotification("A password reset link has been sent to " + email, "success");
      document.getElementById('successOverlay').classList.remove('hidden');

      return false; // Prevent actual form submission
    }

    /**
     * Closes the success modal and optionally redirects.
     */
    function closeModal() {
      document.getElementById('successOverlay').classList.add('hidden');
      // In a real app, you might redirect to login here:
      // window.location.href = 'login.html'; 
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
