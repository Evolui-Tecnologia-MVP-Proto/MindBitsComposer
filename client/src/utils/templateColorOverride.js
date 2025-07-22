// Force override colors in templates page
export function overrideTemplateColors() {
  if (document.querySelector("[data-page='templates']")) {
    const darkMode = document.documentElement.classList.contains("dark");
    if (darkMode) {
      const elements = document.querySelectorAll("[data-page='templates'] *");
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.backgroundColor === "rgb(15, 23, 42)" || style.backgroundColor === "#0F172A") {
          el.style.setProperty('background-color', '#1F2937', 'important');
        }
      });
    }
  }
}

// Auto-run when DOM loads
document.addEventListener("DOMContentLoaded", overrideTemplateColors);

// Run multiple times to catch dynamic content
setTimeout(overrideTemplateColors, 100);
setTimeout(overrideTemplateColors, 500);
setTimeout(overrideTemplateColors, 1000);