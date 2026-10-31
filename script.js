/* تفاعلات الموقع: اللغة، القائمة، السلة، النموذج، والمعرض. */
(() => {
  "use strict";

  const \$ = (selector, context = document) => context.querySelector(selector);
  const \$\$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const storage = {
    get(key, fallback) {
      try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (_) { /* التخزين اختياري */ }
    }
  };

  let language = storage.get("yasmine-language", "ar");
  let activeFilter = "all";
  let cart = [];
  try {
    const savedCart = JSON.parse(storage.get("yasmine-cart", "[]"));
    cart = Array.isArray(savedCart) ? savedCart.filter(item =>
      item && menuItems.some(product => product.id === item.id) &&
      Number.isInteger(item.quantity) && item.quantity > 0
    ) : [];
  } catch (_) {
    cart = [];
  }

  const t = key => (translations[language] && translations[language][key]) || key;
  const formatPrice = price => \`\${new Intl.NumberFormat(language === "ar" ? "ar-DZ" : "en-DZ", {
    maximumFractionDigits: 0
  }).format(price)} \${language === "ar" ? "دج" : "DZD"}\`;

  function applyTranslations() {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = t("pageTitle");

    \$\$("[data-i18n]").forEach(element => {
      element.innerHTML = t(element.dataset.i18n);
    });
    $$("[data-i18n-placeholder]").forEach(element => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    $$("[data-i18n-aria]").forEach(element => {
      element.setAttribute("aria-label", t(element.dataset.i18nAria));
    });
    $$("[data-i18n-alt]").forEach(element => {
      element.alt = t(element.dataset.i18nAlt);
    });
    $$("[data-i18n-title]").forEach(element => {
      element.title = t(element.dataset.i18nTitle);
    });
    $$("[data-i18n-content]").forEach(element => {
      element.content = t(element.dataset.i18nContent);
    });

    $$(".language-switch\_\_button").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === language));
    });

    const menuToggle = \$("#menuToggle");
    if (menuToggle) {
      menuToggle.setAttribute("aria-label", t(menuToggle.getAttribute("aria-expanded") === "true" ? "menuClose" : "menuOpen"));
    }

    renderMenu(activeFilter);
    renderTestimonials();
    renderCart();
    updateThemeButton();
  }

  function renderMenu(filter = "all") {
    const grid = \$("#menuGrid");
    if (!grid) return;
    const products = menuItems.filter(item => filter === "all" || item.category === filter);
    grid.innerHTML = products.map(item => \`
      <article class="menu-card reveal">
        <div class="menu-card\_\_image-wrap">
          <img class="menu-card\_\_image" src="\${item.image}" alt="\${escapeHTML(t(item.nameKey))}" loading="lazy" width="700" height="440">
          \${item.badge ? \`<span class="menu-card\_\_badge">\${escapeHTML(t(item.badge === "popular" ? "badgePopular" : "badgeNew"))}</span>\` : ""}
        </div>
        <div class="menu-card__body">
          <h3 class="menu-card\_\_title">\${escapeHTML(t(item.nameKey))}</h3>
          <p class="menu-card\_\_description">\${escapeHTML(t(item.descriptionKey))}</p>
          <div class="menu-card\_\_bottom">
            <span class="menu-card\_\_price">\${formatPrice(item.price)}</span>
            <button class="btn menu-card\_\_add" type="button" data-add="\${item.id}">\${escapeHTML(t("addToCart"))}</button>
          </div>
        </div>
      </article>
    \`).join("");
    observeReveals();
  }

  function renderTestimonials() {
    const grid = \$("#testimonialGrid");
    if (!grid) return;
    grid.innerHTML = testimonials.map(item => \`
      <article class="testimonial-card reveal">
        <div class="testimonial-card\_\_stars" aria-label="5 out of 5 stars">★★★★★</div>
        <p class="testimonial-card\_\_quote">“\${escapeHTML(t(item.quoteKey))}”</p>
        <p class="testimonial-card\_\_name">\${escapeHTML(t(item.nameKey))}</p>
      </article>
    \`).join("");
    observeReveals();
  }

  function renderCart() {
    const list = \$("#cartList");
    if (!list) return;
    const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, entry) => {
      const product = menuItems.find(item => item.id === entry.id);
      return sum + (product ? product.price * entry.quantity : 0);
    }, 0);

    \$("#cartCount").textContent = String(quantity);
    \$("#cartTotal").textContent = formatPrice(total);
    if (!cart.length) {
      list.innerHTML = `<p class="cart-empty">${escapeHTML(t("cartEmpty"))}</p>`;
      return;
    }
    list.innerHTML = cart.map(entry => {
      const product = menuItems.find(item => item.id === entry.id);
      if (!product) return "";
      return \`<div class="cart-item">
        <div>
          <div class="cart-item\_\_name">\${escapeHTML(t(product.nameKey))}</div>
          <div class="cart-item\_\_detail">\${entry.quantity} × \${formatPrice(product.price)}</div>
        </div>
        <button class="cart-item\_\_remove" type="button" data-remove="\${product.id}">\${escapeHTML(t("cartRemove"))}</button>
      </div>\`;
    }).join("");
  }

  function persistCart() {
    storage.set("yasmine-cart", JSON.stringify(cart));
    renderCart();
  }

  function addToCart(id) {
    const product = menuItems.find(item => item.id === id);
    if (!product) return;
    const existing = cart.find(item => item.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ id, quantity: 1 });
    persistCart();
    showToast(t("itemAdded"));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  let toastTimer;
  function showToast(message) {
    const toast = \$("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function openCart() {
    \$("#cartPanel").classList.add("is-open");
    \$("#cartPanel").setAttribute("aria-hidden", "false");
    \$("#overlay").classList.add("is-visible");
    \$("#overlay").setAttribute("aria-hidden", "false");
    \$("#cartClose").focus();
  }

  function closeCart() {
    \$("#cartPanel").classList.remove("is-open");
    \$("#cartPanel").setAttribute("aria-hidden", "true");
    \$("#overlay").classList.remove("is-visible");
    \$("#overlay").setAttribute("aria-hidden", "true");
  }

  function updateThemeButton() {
    const isDark = document.documentElement.dataset.theme === "dark";
    const button = \$("#themeToggle");
    if (!button) return;
    button.setAttribute("aria-label", t(isDark ? "lightMode" : "darkMode"));
    button.innerHTML = isDark
      ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z"/></svg>';
  }

  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      \$\$(".reveal").forEach(element => element.classList.add("is-visible"));
      return;
    }
    if (!window.revealObserver) {
      window.revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            window.revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
    }
    \$\$(".reveal:not(.is-visible)").forEach(element => window.revealObserver.observe(element));
  }

  function initScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    const links = \$\$(".nav\_\_link");
    const sections = links.map(link => \$(link.getAttribute("href"))).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    sections.forEach(section => observer.observe(section));
  }

  function updateScrollUI() {
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    \$("#readingProgress").style.width = `${maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0}%`;
    \$("#backTop").classList.toggle("is-visible", scrollTop > 450);
  }

  function setLanguage(nextLanguage) {
    if (!translations[nextLanguage]) return;
    language = nextLanguage;
    storage.set("yasmine-language", language);
    applyTranslations();
  }

  function validateForm(form) {
    const fields = [
      { input: \$("#customerName"), error: \$("#nameError"), key: "errorName", valid: value => value.trim().length >= 2 },
      { input: \$("#customerPhone"), error: \$("#phoneError"), key: "errorPhone", valid: value => /^\\+?[\d\s()-]{8,20}\$/.test(value.trim()) },
      { input: \$("#requestDate"), error: \$("#dateError"), key: "errorDate", valid: value => Boolean(value) && value >= new Date().toISOString().slice(0, 10) },
      { input: \$("#requestTime"), error: \$("#timeError"), key: "errorTime", valid: value => Boolean(value) },
      { input: \$("#guestCount"), error: \$("#guestsError"), key: "errorGuests", valid: value => Boolean(value) }
    ];
    let valid = true;
    fields.forEach(field => {
      const fieldValid = field.valid(field.input.value);
      field.input.setAttribute("aria-invalid", String(!fieldValid));
      field.error.textContent = fieldValid ? "" : t(field.key);
      if (!fieldValid) valid = false;
    });
    form.setAttribute("data-valid", String(valid));
    return valid;
  }

  function init() {
    const savedTheme = storage.get("yasmine-theme", "light");
    if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";

    applyTranslations();
    observeReveals();
    initScrollSpy();
    updateScrollUI();

    document.addEventListener("click", event => {
      const languageButton = event.target.closest("[data-lang]");
      if (languageButton) setLanguage(languageButton.dataset.lang);

      const filterButton = event.target.closest("[data-filter]");
      if (filterButton) {
        activeFilter = filterButton.dataset.filter;
        \$\$(".filter-btn").forEach(button => button.classList.toggle("is-active", button === filterButton));
        renderMenu(activeFilter);
      }

      const addButton = event.target.closest("[data-add]");
      if (addButton) addToCart(addButton.dataset.add);

      const removeButton = event.target.closest("[data-remove]");
      if (removeButton) {
        cart = cart.filter(item => item.id !== removeButton.dataset.remove);
        persistCart();
      }

      const navLink = event.target.closest("#siteNav a");
      if (navLink) {
        \$("#siteNav").classList.remove("is-open");
        \$("#menuToggle").setAttribute("aria-expanded", "false");
        \$("#menuToggle").setAttribute("aria-label", t("menuOpen"));
      }

      const galleryButton = event.target.closest("[data-lightbox]");
      if (galleryButton) {
        const image = \$("img", galleryButton);
        \$("#lightboxImage").src = image.src;
        \$("#lightboxImage").alt = image.alt;
        \$("#lightbox").classList.add("is-open");
        \$("#lightboxClose").focus();
      }
    });

    \$("#themeToggle").addEventListener("click", () => {
      const isDark = document.documentElement.dataset.theme !== "dark";
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      storage.set("yasmine-theme", isDark ? "dark" : "light");
      updateThemeButton();
    });

    \$("#menuToggle").addEventListener("click", event => {
      const expanded = event.currentTarget.getAttribute("aria-expanded") !== "true";
      \$("#siteNav").classList.toggle("is-open", expanded);
      event.currentTarget.setAttribute("aria-expanded", String(expanded));
      event.currentTarget.setAttribute("aria-label", t(expanded ? "menuClose" : "menuOpen"));
    });

    \$("#cartToggle").addEventListener("click", openCart);
    \$("#cartClose").addEventListener("click", closeCart);
    \$("#overlay").addEventListener("click", closeCart);
    \$("#cartCheckout").addEventListener("click", closeCart);

    \$("#backTop").addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const lightbox = \$("#lightbox");
    const closeLightbox = () => lightbox.classList.remove("is-open");
    \$("#lightboxClose").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", event => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeLightbox();
        closeCart();
      }
    });

    const form = \$("#requestForm");
    form.addEventListener("input", event => {
      const field = event.target;
      if (field.matches("input, select")) {
        field.removeAttribute("aria-invalid");
        const error = field.closest(".field")?.querySelector(".field\_\_error");
        if (error) error.textContent = "";
      }
      \$("#formStatus").textContent = "";
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      \$("#formStatus").textContent = "";
      if (!validateForm(form)) {
        \$("#formStatus").textContent = t("errorForm");
        const firstInvalid = \$('[aria-invalid="true"]', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      \$("#formStatus").textContent = t("formSuccess");
      form.reset();
      form.querySelectorAll("[aria-invalid]").forEach(field => field.removeAttribute("aria-invalid"));
    });

    let scrollTicking = false;
    window.addEventListener("scroll", () => {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        updateScrollUI();
        scrollTicking = false;
      });
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
```*_
