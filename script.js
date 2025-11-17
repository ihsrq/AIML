document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.querySelector("#year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  const modal = document.querySelector("#schedule-modal");
  const scheduleButtons = document.querySelectorAll('[data-modal="schedule"]');
  const closeTriggers = document.querySelectorAll('[data-close="true"]');

  const openModal = () => {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  scheduleButtons.forEach((btn) => btn.addEventListener("click", openModal));
  closeTriggers.forEach((el) => el.addEventListener("click", closeModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
});
