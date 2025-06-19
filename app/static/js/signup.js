
let userType = "studentStaff";

window.initSignup = function() {
    setUserType(userType);
  };

    window.setUserType = function(type) {
      userType = type;
      const studentBtn = document.getElementById("studentBtn");
      const generalBtn = document.getElementById("generalBtn");
      const idField = document.getElementById("idField");
      const designationField = document.getElementById("designationField");
      const dobField=document.getElementById("dobField");

      studentBtn.className = type === 'studentStaff' ?
        "flex-1 p-2 rounded-lg font-medium bg-indigo-900 text-white" :
        "flex-1 p-2 rounded-lg font-medium bg-gray-300 text-black";

      generalBtn.className = type === 'general' ?
        "flex-1 p-2 rounded-lg font-medium bg-indigo-900 text-white" :
        "flex-1 p-2 rounded-lg font-medium bg-gray-300 text-black";

      // Show/hide fields explicitly
      if (type === "general") {
        idField.classList.add("hidden");
        designationField.classList.add("hidden");
        dobField.classList.add("hidden");
      } else {
        idField.classList.remove("hidden");
        designationField.classList.remove("hidden");
        dobField.classList.remove("hidden");
      }
    }

    window.handleSignUp = function(event) {
      event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const fullName = document.getElementById("fullname").value.trim();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const idNumber = document.getElementById("idnumber").value.trim();
      const designation = document.getElementById("designation").value.trim();
      const confirmPassword = document.getElementById('confirm_password').value;

      if (password !== confirmPassword) {
        document.getElementById('errorMessage').innerText = "Passwords do not match.";
        document.getElementById('errorOverlay').classList.remove('hidden');
        return false;
      }

      if (!email || !fullName || !username || !password) {
        alert(" Please fill in all required fields.");
        return false;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
      if (!passwordRegex.test(password)) {
        showErrorModal("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character (e.g., @, #, $).");
        return false;
      }

      if (userType !== "general") {
        if (!idNumber) {
          alert(" ID Number is required for Student/Staff.");
          return false;
        }

        if (!designation) {
          alert(" Designation is required for Student/Staff.");
          return false;
        }
      }

      let message = "";
      if (userType === "general") {
        message = "General account created successfully!";
      } else if (designation.toLowerCase() === "student") {
        message = "Student account created successfully!";
      } else {
        message = "Staff account created successfully!";
      }

      document.getElementById("successMessage").innerText = message;
      document.getElementById("successOverlay").classList.remove("hidden");

      // Clear form
      document.getElementById("signupForm").reset();
      setUserType("studentStaff"); // Reset to default

      return false;
    }
// for handling error message 
    function showErrorModal(message) {
      document.getElementById("errorMessage").innerText = message;
      document.getElementById("errorOverlay").classList.remove("hidden");
    }

    function closeErrorModal() {
      document.getElementById("errorOverlay").classList.add("hidden");
    }

    function closeSuccessModal() {
      document.getElementById("successOverlay").classList.add("hidden");
    }
    