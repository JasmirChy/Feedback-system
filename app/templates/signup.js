// Default user type set to 'staff' (i.e. Student/Staff combined)
// let userType = "staff";

// Set user type based on button clicked



// function setUserType(type) {
//   userType = type;

//   document.getElementById("staffBtn").className = btnClass("staff", type);
//   document.getElementById("generalBtn").className = btnClass("general", type);

//   const idField = document.getElementById("idNumberField");
//   const designationField = document.getElementById("designationField");
//   const dobField = document.getElementById("dobField");

//   if (type === "staff") {
//     idField.classList.remove("hidden");
//     designationField.classList.remove("hidden");
//     dobField.classList.remove("hidden");



//   } else {
//     idField.classList.add("hidden");
//     designationField.classList.add("hidden");
//     dobField.classList.add("hidden");


//   }
// }

// Button style toggle
function btnClass(btn, current) {
  return "flex-1 p-2 rounded-lg font-medium transition " +
    (btn === current ? "bg-indigo-800 text-white hover:bg-teal-600" : "bg-gray-300 text-black hover:bg-teal-600 hover:text-white shadow-md");
}

// Handle form submission
function handleSignUp(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const fullName = document.getElementById("fullname").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trin();
  const idNumber = document.getElementById("idnumber").value.trim();
  const birthdate=document.getElementById("dob").value.trim();
  const designation = document.getElementById("designation").value.trim();

  // Basic validation
  if (!email || !fullName || !username || !password) {
    alert(" Please fill in all required fields.");
    return false;
  }

  // Password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
  if (!passwordRegex.test(password)) {
    alert(" Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character (e.g., @, #, $).");
    return false;
  }

  // Student/Staff validations
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

  // Show appropriate message
  let message = "";
  if (userType === "general") {
    message = "General account created successfully!";
  } else if (designation.toLowerCase() === "student") {
    message = "Student account created successfully!";
  } else {
    message = "Staff account created successfully!";
  }

  // Show modal
  document.getElementById("successMessage").innerText = message;
  document.getElementById("successOverlay").classList.remove("hidden");

  return false;
}


// Default selection on load
window.onload = () => setUserType("staff");
