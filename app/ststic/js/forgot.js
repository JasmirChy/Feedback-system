function handlePasswordReset(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (email === "") {
    alert("Please enter your email address.");
    return false;
  }

  // Set and show success modal
  document.getElementById("resetMessage").innerText = `A password reset link has been sent to ${email}.`;
  document.getElementById("successOverlay").classList.remove("hidden");

  return false;
}

function closeModal() {
  document.getElementById("successOverlay").classList.add("hidden");
  document.getElementById("email").value = ""; // Clear field after closing modal
}
