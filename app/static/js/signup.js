
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
    // Keep the hidden <input name="usertype"> in sync
    document.getElementById("userType").value = type;

    const studentBtn = document.getElementById("studentBtn");
    const generalBtn = document.getElementById("generalBtn");
    const idField = document.getElementById("idField");
    const designationField = document.getElementById("designationField");

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
     } else {
        idField.classList.remove("hidden");
        designationField.classList.remove("hidden");
     }
}

function handleSignUp(event) {
    event.preventDefault();

    // compute the message *before* using it
    let message = "";

    const email = document.getElementById("email").value.trim();
    const fullName = document.getElementById("fullname").value.trim();
    const username = document.getElementById("username").value.trim();
    const dob = document.getElementById("dob").value.trim()
    const password = document.getElementById("password1").value;
    const confirmPassword = document.getElementById('password2').value;

    const safeValue = (id) => document.getElementById(id)?.value?.trim() || "";
    const idNumber = safeValue("idnumber");
    const designation = safeValue("designation");

    // 1. Password match
    if (password !== confirmPassword) {
        document.getElementById('errorMessage').innerText = "Passwords do not match.";
        return document.getElementById('errorOverlay').classList.remove('hidden');
    }

    // 2. Required fields
    if (!email || !fullName || !username || !password) {
        return alert(" Please fill in all required fields.");
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
            return alert(" ID Number is required for Student/Staff.");
        }

        if (!designation) {
            return alert(" Designation is required for Student/Staff.");
        }
    }


    if (userType === "general") {
        message = "General account created successfully!";
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
    