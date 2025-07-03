document.addEventListener("DOMContentLoaded", () => {
  // SECTION SWITCHING
  const sections = document.querySelectorAll(".section");
  const navItems = document.querySelectorAll(".nav-item, li[data-target]");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");
      if (target) showSection(target);
    });
  });

  window.showSection = (id) => {
    sections.forEach((sec) => sec.classList.add("hidden"));
    const target = document.getElementById(id);
    if (target) target.classList.remove("hidden");
  };

  // SIDEBAR DROPDOWNS
  const toggles = document.querySelectorAll("[data-toggle]");
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const submenu = document.getElementById(toggle.dataset.toggle);
      submenu.classList.toggle("hidden");

      const icon = toggle.querySelector("i.fas.fa-chevron-down");
      if (icon) icon.classList.toggle("rotate-180");
    });
  });

  // FEEDBACK FILTERING
  window.filterFeedback = (status) => {
    const rows = document.querySelectorAll("#allFeedback tbody tr");
    const buttons = ["All", "Pending", "Resolved"];
    buttons.forEach((b) => {
      const btn = document.getElementById(`toggle${b}`);
      btn.classList.remove("bg-indigo-900", "text-white");
      btn.classList.add("bg-gray-200", "text-indigo-900");
    });

    const activeBtn = document.getElementById(`toggle${capitalize(status)}`);
    activeBtn.classList.add("bg-indigo-900", "text-white");

    rows.forEach((row) => {
      const text = row.innerText.toLowerCase();
      if (status === "all" || text.includes(status)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  };

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // FEEDBACK DETAILS (assumes dynamic implementation)
  window.showFeedbackDetails = function (feedback) {
    document.getElementById("detailTitle").textContent = feedback.f_title;
    document.getElementById("detailSubmitter").textContent = feedback.submitter_name;
    document.getElementById("detailCategory").textContent = feedback.category_name;
    document.getElementById("detailStatus").textContent = feedback.status === 1 ? "Pending" : "Resolved";
    document.getElementById("detailDate").textContent = feedback.date || "N/A";
    document.getElementById("detailMessage").textContent = feedback.f_body;

    const resolveBtn = document.getElementById("resolveButton");
    resolveBtn.style.display = feedback.status === 1 ? "inline-block" : "none";

    showSection("feedbackDetails");
  };

  window.markAsResolved = function () {
    // TODO: send request to backend to resolve
    alert("Feedback marked as resolved (mocked)");
    showSection("home");
  };

  // USER DETAILS
  window.showUserDetails = function (user) {
    document.getElementById("detailUserId").textContent = user.id;
    document.getElementById("detailUserName").textContent = user.name;
    document.getElementById("detailUserEmail").textContent = user.email;
    document.getElementById("detailUserRole").textContent = user.role;
    document.getElementById("detailUserRegDate").textContent = user.registration_date || "N/A";

    const makeAdminBtn = document.getElementById("makeAdminButton");
    makeAdminBtn.style.display = user.role !== "Admin" ? "inline-block" : "none";

    showSection("userDetails");
  };

  window.makeAdmin = function () {
    alert("User promoted to admin (mocked)");
    showSection("viewUsers");
  };

  // ADD ADMIN FORM
  const addAdminForm = document.getElementById("addAdminForm");
  if (addAdminForm) {
    addAdminForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("newAdminName").value;
      const email = document.getElementById("newAdminEmail").value;
      const password = document.getElementById("newAdminPassword").value;

      // TODO: Send this to the backend
      alert(`Admin ${name} added (mocked)`);
      showSection("viewUsers");
    });
  }

  // CHART
  const chartCanvas = document.getElementById("feedbackChart");
  if (chartCanvas) {
    new Chart(chartCanvas, {
      type: "doughnut",
      data: {
        labels: ["Pending", "Resolved"],
        datasets: [
          {
            label: "Feedback Status",
            data: [12, 30],
            backgroundColor: ["#facc15", "#22c55e"],
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }
});

// MOBILE SIDEBAR TOGGLE
function toggleMobileMenu() {
  const sidebar = document.getElementById("mobile-sidebar");
  sidebar.classList.toggle("hidden");
}
