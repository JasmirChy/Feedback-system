
    let userType = "studentStaff"; // Default user type

    // List of all fields that can have inline errors
    const errorFields = ['email', 'fullname', 'idnumber', 'dob', 'designation', 'username', 'password'];

    /**
     * Displays an inline error message for a specific field.
     * @param {string} fieldId The ID of the input field.
     * @param {string} message The error message to display.
     */
    function displayError(fieldId, message) {
      const errorSpan = document.getElementById(fieldId + 'Error');
      if (errorSpan) {
        errorSpan.innerText = message;
        errorSpan.classList.remove('hidden');
      }
    }

    /**
     * Clears an inline error message for a specific field.
     * @param {string} fieldId The ID of the input field.
     */
    function clearError(fieldId) {
      const errorSpan = document.getElementById(fieldId + 'Error');
      if (errorSpan) {
        errorSpan.innerText = '';
        errorSpan.classList.add('hidden');
      }
    }

    /**
     * Clears all inline error messages.
     */
    function clearAllErrors() {
      errorFields.forEach(fieldId => clearError(fieldId));
    }

    /**
     * Toggles the user type between 'studentStaff' and 'general' and updates the UI accordingly.
     * @param {string} type The selected user type ('studentStaff' or 'general').
     */
    function setUserType(type) {
      userType = type;
      const studentBtn = document.getElementById("studentBtn");
      const generalBtn = document.getElementById("generalBtn");
      const idField = document.getElementById("idField");
      const designationField = document.getElementById("designationField");
      const dobField = document.getElementById("dobField");

      // Update button styling
      studentBtn.classList.remove("bg-indigo-900", "text-white", "bg-gray-300", "text-black");
      generalBtn.classList.remove("bg-indigo-900", "text-white", "bg-gray-300", "text-black");

      if (type === 'studentStaff') {
        studentBtn.classList.add("bg-indigo-900", "text-white");
        generalBtn.classList.add("bg-gray-300", "text-black");
      } else {
        generalBtn.classList.add("bg-indigo-900", "text-white");
        studentBtn.classList.add("bg-gray-300", "text-black");
      }

      // Toggle visibility of fields based on user type and clear errors for hidden fields
      idField.classList.toggle("hidden", type === "general");
      designationField.classList.toggle("hidden", type === "general");
      dobField.classList.toggle("hidden", type === "general");

      if (type === "general") {
          clearError('idnumber');
          clearError('designation');
          clearError('dob');
      }
    }

    /**
     * Handles the sign-up form submission.
     * Performs basic validation and simulates account creation.
     * @param {Event} event The submit event object.
     * @returns {boolean} False to prevent default form submission.
     */
    function handleSignUp(event) {
      event.preventDefault();
      clearAllErrors(); // Clear previous errors on new submission attempt

      const email = document.getElementById("email").value.trim();
      const fullName = document.getElementById("fullname").value.trim();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value; // Do not trim password, keep raw for regex
      const idNumber = document.getElementById("idnumber").value.trim();
      const designation = document.getElementById("designation").value.trim();
      const dob = document.getElementById("dob").value.trim();

      let isValid = true;

      // Basic validation for required fields
      if (!email) {
        displayError('email', "Email Address is required.");
        isValid = false;
      }
      if (!fullName) {
        displayError('fullname', "Full Name is required.");
        isValid = false;
      }
      if (!username) {
        displayError('username', "Username is required.");
        isValid = false;
      }
      if (!password) {
        displayError('password', "Password is required.");
        isValid = false;
      }

      // Password validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
      if (password && !passwordRegex.test(password)) { // Check only if password is not empty
        displayError('password', "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character (e.g., @, #, $).");
        isValid = false;
      }

      // Student/Staff specific validations
      if (userType !== "general") {
        if (!idNumber) {
          displayError('idnumber', "ID Number is required for Student/Staff.");
          isValid = false;
        }
        if (!designation) {
          displayError('designation', "Designation is required for Student/Staff.");
          isValid = false;
        }
        if (!dob) {
            displayError('dob', "Date of Birth is required for Student/Staff.");
            isValid = false;
        }
      }

      if (!isValid) {
        // If any validation failed, stop here
        return false;
      }

      // If all validations pass, simulate account creation success
      let message = "";
      if (userType === "general") {
        message = "General account created successfully!";
      } else if (designation.toLowerCase() === "student") {
        message = "Student account created successfully!";
      } else {
        message = "Staff account created successfully!";
      }

      showNotification(message, "success"); // Use the consistent global notification for success
      
      // Clear form only on successful submission
      document.getElementById("signupForm").reset();
      setUserType("studentStaff"); // Reset to default state after successful signup

      return false; // Prevent actual form submission
    }

    /**
     * Displays a temporary notification message (global, not tied to a specific field).
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


    // Set default user type on page load
    document.addEventListener('DOMContentLoaded', () => {
      setUserType("studentStaff");
    });

    // These specific modal functions are now superseded by showNotification and inline errors,
    // but kept as placeholders if a distinct modal UI is still desired for certain non-validation cases.
    function closeSuccessModal() {
      document.getElementById("successOverlay").classList.add("hidden");
    }
