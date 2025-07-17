// app/static/js/signup.js

document.addEventListener('DOMContentLoaded', () => {
    initSignup();
    document.getElementById('signupForm').addEventListener('submit', handleSignUp);

    const flash = document.getElementById('flash-messages');
    if (!flash) return;
    // after 5 seconds, fade out (you can also just hide instantly)
    setTimeout(() => {
      flash.classList.add('opacity-0', 'transition', 'duration-500');
      // optional: completely remove from layout after fade-out
      setTimeout(() => flash.style.display = 'none', 500);
    }, 5000);
});

let userType = "studentStaff";

function initSignup() {
    setUserType(userType);
}

function setUserType(type) {
    userType = type;
    document.getElementById("userType").value = type;
    document.getElementById("studentBtn").classList.toggle("active", type === "studentStaff");
    document.getElementById("generalBtn").classList.toggle("active", type === "general");
    document.getElementById("idField").classList.toggle("hidden", type === "general");
    document.getElementById("designationField").classList.toggle("hidden", type === "general");
}

function handleSignUp(event) {

    const f = id => document.getElementById(id)?.value.trim() || "";

    const email = f("email");
    const fullName = f("fullname");
    const username = f("username");
    const dob = f("dob");
    const password = document.getElementById("password1").value;
    const confirmPassword = document.getElementById("password2").value;
    const idNumber = f("idnumber");
    const designation = f("designation");

    // 1. Password match
    if (password !== confirmPassword) {
        event.preventDefault();
        showErrorModal("Passwords do not match.");
        return;
    }

    // 2. Email verification
    const emailRegex = /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      event.preventDefault();
      showErrorModal("Please enter a valid email address.");
      return;
    }

    // 3. Required fields
    if (!email || !fullName || !username || !password) {
        event.preventDefault();
        showErrorModal("Please fill in all required fields.");
        return;
    }

    // 4. Password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
    if (!passwordRegex.test(password)) {
        event.preventDefault();
        showErrorModal("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character (e.g., @, #, $).");
        return;
    }

    // 5. Student/Staff fields
    if (userType !== "general") {
        if (!idNumber) {
            event.preventDefault();
            showErrorModal("ID Number is required for Student/Staff.");
            return;
        }
        if (!designation) {
            event.preventDefault();
            showErrorModal("Designation is required for Student/Staff.");
            return;
        }
    }
}


// Utility: Show error overlay modal
function showErrorModal(message) {
    document.getElementById("errorMessage").innerText = message;
    document.getElementById("errorOverlay").classList.remove("hidden");
}

function closeErrorModal() {
    document.getElementById("errorOverlay").classList.add("hidden");
}
