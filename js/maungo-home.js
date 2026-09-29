js -/* =========================================================
   MAUNGU HOMEPAGE EXPERIENCE
   /public/js/maungu-home.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initHeroParallax();
  initStoryCards();
  initAppPreview();
  initNewsletter();
  initSmoothScroll();
});

/* =========================================================
   SCROLL REVEAL
   ========================================================= */

function initScrollReveal() {
  const elements = document.querySelectorAll(
    ".reveal, .story-section, .editorial-section, .app-section, .originals-section"
  );

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -60px 0px",
    }
  );

  elements.forEach((element) => observer.observe(element));
}

/* =========================================================
   HERO PARALLAX
   ========================================================= */

function initHeroParallax() {
  const hero = document.querySelector(".cinematic-hero");
  const image = document.querySelector(".cinematic-hero__image");

  if (!hero || !image) return;

  window.addEventListener(
    "scroll",
    () => {
      const rect = hero.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const movement = Math.max(-40, Math.min(40, rect.top * -0.08));

      image.style.transform = `translate3d(0, ${movement}px, 0) scale(1.05)`;
    },
    { passive: true }
  );
}

/* =========================================================
   STORY CARDS
   ========================================================= */

function initStoryCards() {
  const cards = document.querySelectorAll(".moment-card");

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      cards.forEach((item) => {
        if (item !== card) {
          item.classList.remove("active");
        }
      });

      card.classList.add("active");
    });

    card.addEventListener("mouseleave", () => {
      card.classList.remove("active");
    });
  });
}

/* =========================================================
   APP PREVIEW
   ========================================================= */

function initAppPreview() {
  const screens = document.querySelectorAll("[data-app-screen]");
  const buttons = document.querySelectorAll("[data-app-control]");

  if (!screens.length || !buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.appControl;

      screens.forEach((screen) => {
        screen.classList.toggle(
          "active",
          screen.dataset.appScreen === target
        );
      });

      buttons.forEach((item) => {
        item.classList.toggle("active", item === button);
      });
    });
  });
}

/* =========================================================
   NEWSLETTER
   ========================================================= */

function initNewsletter() {
  const form = document.querySelector("#maunguNewsletter");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = form.querySelector('input[type="email"]');
    const button = form.querySelector("button");
    const message = form.querySelector(".newsletter-message");

    if (!emailInput) return;

    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      showNewsletterMessage(
        message,
        "Please enter a valid email address.",
        "error"
      );
      return;
    }

    const originalText = button ? button.innerHTML : "";

    if (button) {
      button.disabled = true;
      button.innerHTML = "Joining...";
    }

    try {
      /*
       * Connect this to your backend newsletter endpoint later.
       * For now the form gives the user immediate feedback.
       */

      await new Promise((resolve) => setTimeout(resolve, 700));

      showNewsletterMessage(
        message,
        "You're in. Welcome to Maungu.",
        "success"
      );

      form.reset();
    } catch (error) {
      showNewsletterMessage(
        message,
        "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = originalText;
      }
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showNewsletterMessage(element, text, type) {
  if (!element) return;

  element.textContent = text;
  element.className = `newsletter-message ${type}`;

  setTimeout(() => {
    element.textContent = "";
    element.className = "newsletter-message";
  }, 4000);
}

/* =========================================================
   SMOOTH SCROLL
   ========================================================= */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);

      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

/* =========================================================
   PRODUCT IMAGE HOVER
   ========================================================= */

document.addEventListener("mouseover", (event) => {
  const card = event.target.closest(".editorial-product");

  if (!card) return;

  card.classList.add("hovered");
});

document.addEventListener("mouseout", (event) => {
  const card = event.target.closest(".editorial-product");

  if (!card) return;

  card.classList.remove("hovered");
});

/* =========================================================
   NAVBAR SCROLL EFFECT
   ========================================================= */

window.addEventListener(
  "scroll",
  () => {
    const navbar = document.querySelector(".navbar");

    if (!navbar) return;

    navbar.classList.toggle("scrolled", window.scrollY > 40);
  },
  { passive: true }
);

/* =========================================================
   CURRENT YEAR
   ========================================================= */

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});