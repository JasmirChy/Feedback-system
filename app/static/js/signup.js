document.addEventListener('DOMContentLoaded', () => {
    initSignup();
    document.getElementById('signupForm').addEventListener('submit', handleSignUp);
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
    event.preventDefault();

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
        showErrorModal("Passwords do not match.");
        return;
    }

    // 2. Required fields
    if (!email || !fullName || !username || !password) {
        showErrorModal("Please fill in all required fields.");
        return;
    }

    // 3. Password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
    if (!passwordRegex.test(password)) {
        showErrorModal("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character (e.g., @, #, $).");
        return;
    }

    // 4. Student/Staff fields
    if (userType !== "general") {
        if (!idNumber) {
            showErrorModal("ID Number is required for Student/Staff.");
            return;
        }
        if (!designation) {
            showErrorModal("Designation is required for Student/Staff.");
            return;
        }
    }

    // ✅ All validation passed → now submit to server
    event.target.submit();
}


// Utility: Show error overlay modal
function showErrorModal(message) {
    document.getElementById("errorMessage").innerText = message;
    document.getElementById("errorOverlay").classList.remove("hidden");
}

function closeErrorModal() {
    document.getElementById("errorOverlay").classList.add("hidden");
}
