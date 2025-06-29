document.addEventListener('DOMContentLoaded', () => {
    initSignup();
    document.getElementById('signupForm').addEventListener('submit', handleSignUp);
});


let userType = "studentStaff";

function initSignup() {
    setUserType(userType);
};

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

    // compute the message *before* using it
    let message = "";

    const f = id => document.getElementById(id)?.value.trim() || "";
    const email = f("email"), fullName = f("fullname"), username = f("username"), dob = f("dob");

    // Corrected: Ensure you are getting the correct password and confirm password fields.
    // Based on your HTML, 'password' is the id for the first password field.
    // If you intend to have a "Confirm Password" field, please add it to your HTML with a unique ID (e.g., 'confirmPassword').
    // For now, I'm assuming 'password' is the only password field, which means password === confirmPassword will always be true.
    const password = document.getElementById("password1").value;
    const confirmPassword = document.getElementById('password2').value; // This will currently be the same as 'password'

    const safeValue = (id) => document.getElementById(id)?.value?.trim() || "";
    const idNumber = safeValue("idnumber"), designation = safeValue("designation");

    // 1. Password match
    // This check will always pass as currently 'password' and 'confirmPassword' refer to the same input.
    // If you add a separate 'confirmPassword' input, this logic will then function correctly.
    if (password !== confirmPassword) {
        document.getElementById('errorMessage').innerText = "Passwords do not match.";
        return document.getElementById('errorOverlay').classList.remove('hidden');
    }

    // 2. Required fields
    if (!email || !fullName || !username || !password) {
        // Replaced alert with showErrorModal as per previous instructions to avoid alert()
        showErrorModal("Please fill in all required fields.");
        return;
    }

    // 3. Password Strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
    if (!passwordRegex.test(password)) {
        showErrorModal("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character (e.g., @, #, $).");
        return;
    }

    // 4. Student/Staff validation
    if (userType !== "general") {
        if (!idNumber) {
            // Replaced alert with showErrorModal as per previous instructions to avoid alert()
            showErrorModal("ID Number is required for Student/Staff.");
            return;
        }

        if (!designation) {
            // Replaced alert with showErrorModal as per previous instructions to avoid alert()
            showErrorModal("Designation is required for Student/Staff.");
            return;
        }
    }


    if (userType === "general") {
        message = "OTP is sent to your Email!";
    } else if (designation.toLowerCase() === "student") {
        message = "Student account created successfully!";
    } else {
        message = "Staff account created successfully!";
    }

    // show modal
    document.getElementById("successMessage").innerText = message;
    const overlay = document.getElementById("successOverlay");
    overlay.classList.remove("hidden");

    // hook OK-button *once* to actually submit after they click it
    const okBtn = overlay.querySelector("button");

    okBtn.onclick = () => {
        overlay.classList.add("hidden");
        // now submit the form for real
        document.getElementById("signupForm").submit();
    };
    // and bail out without submitting right now
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