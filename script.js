/* تفاعلات الموقع: اللغة، القائمة، السلة، النموذج، والمعرض. */
(function () {
  "use strict";

  // ===== عرض أي خطأ على الشاشة =====
  window.addEventListener("error", function (e) {
    var box = document.getElementById("errorBox");
    if (!box) return;
    box.style.display = "block";
    box.textContent += "\u274C " + (e.message || e) + " \u2014 " + (e.filename || "?") + ":" + (e.lineno || "?") + "\n";
  });
  window.addEventListener("unhandledrejection", function (e) {
    var box = document.getElementById("errorBox");
    if (!box) return;
    box.style.display = "block";
    box.textContent += "\u274C " + ((e.reason && e.reason.message) || e.reason || e) + "\n";
  });

  // التأكد من تحميل بيانات الموقع
  if (typeof translations === "undefined" || typeof menuItems === "undefined") {
    var box = document.getElementById("errorBox");
    if (box) {
      box.style.display = "block";
      box.textContent = "\u274C لم يتم تحميل ملف data.js. تأكد من وجود data.js في نفس المجلد قبل script.js.";
    }
    return;
  }

  // تفعيل وضع js (لإظهار عناصر reveal بأنيميشن)
  document.documentElement.classList.add("js-enabled");

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var storage = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem(key); return v !== null ? v : fallback; } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }
  };

  var language = storage.get("yasmine-language", "ar");
  if (!translations[language]) language = "ar";
  var activeFilter = "all";
  var cart = [];
  try {
    var savedCart = JSON.parse(storage.get("yasmine-cart", "[]"));
    cart = Array.isArray(savedCart) ? savedCart.filter(function (item) {
      return item && typeof item.id === "string" &&
        menuItems.some(function (p) { return p.id === item.id; }) &&
        Number.isInteger(item.quantity) && item.quantity > 0;
    }) : [];
  } catch (e) { cart = []; }

  function t(key) {
    var dict = translations[language] || translations.ar;
    return dict[key] || key;
  }

  function formatPrice(price) {
    var num;
    try {
      num = new Intl.NumberFormat(language === "ar" ? "ar-DZ" : "en-DZ", { maximumFractionDigits: 0 }).format(price);
    } catch (e) {
      num = String(price);
    }
    return num + " " + (language === "ar" ? "\u062F\u062C" : "DZD");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  // ===== تطبيق الترجمات =====
  function applyTranslations() {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = t("pageTitle");

    $$("[data-i18n]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-placeholder]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-placeholder")); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    $$("[data-i18n-alt]").forEach(function (el) { el.alt = t(el.getAttribute("data-i18n-alt")); });
    $$("[data-i18n-title]").forEach(function (el) { el.title = t(el.getAttribute("data-i18n-title")); });
    $$("[data-i18n-content]").forEach(function (el) { el.content = t(el.getAttribute("data-i18n-content")); });

    $$(".language-switch__button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === language));
    });

    var toggle = $("#menuToggle");
    if (toggle) {
      toggle.setAttribute("aria-label", t(toggle.getAttribute("aria-expanded") === "true" ? "menuClose" : "menuOpen"));
    }

    renderMenu(activeFilter);
    renderTestimonials();
    renderCart();
    updateThemeButton();
  }

  // ===== المنيو =====
  function renderMenu(filter) {
    filter = filter || "all";
    var grid = $("#menuGrid");
    if (!grid) return;
    var products = menuItems.filter(function (item) { return filter === "all" || item.category === filter; });
    var html = "";
    products.forEach(function (item) {
      var badge = item.badge ? '<span class="menu-card__badge">' + escapeHTML(t(item.badge === "popular" ? "badgePopular" : "badgeNew")) + "</span>" : "";
      html += '<article class="menu-card reveal">'
        + '<div class="menu-card__image-wrap">'
        + '<img class="menu-card__image" src="' + item.image + '" alt="' + escapeHTML(t(item.nameKey)) + '" loading="lazy" width="700" height="440">'
        + badge
        + '</div>'
        + '<div class="menu-card__body">'
        + '<h3 class="menu-card__title">' + escapeHTML(t(item.nameKey)) + '</h3>'
        + '<p class="menu-card__description">' + escapeHTML(t(item.descriptionKey)) + '</p>'
        + '<div class="menu-card__bottom">'
        + '<span class="menu-card__price">' + formatPrice(item.price) + '</span>'
        + '<button class="btn menu-card__add" type="button" data-add="' + item.id + '">' + escapeHTML(t("addToCart")) + '</button>'
        + '</div></div></article>';
    });
    grid.innerHTML = html;
    observeReveals();
  }

  // ===== آراء العملاء =====
  function renderTestimonials() {
    var grid = $("#testimonialGrid");
    if (!grid) return;
    var html = "";
    testimonials.forEach(function (item) {
      html += '<article class="testimonial-card reveal">'
        + '<div class="testimonial-card__stars" aria-label="5 out of 5 stars">\u2605\u2605\u2605\u2605\u2605</div>'
        + '<p class="testimonial-card__quote">\u201C' + escapeHTML(t(item.quoteKey)) + '\u201D</p>'
        + '<p class="testimonial-card__name">' + escapeHTML(t(item.nameKey)) + '</p>'
        + '</article>';
    });
    grid.innerHTML = html;
    observeReveals();
  }

  // ===== السلة =====
  function renderCart() {
    var list = $("#cartList");
    var countEl = $("#cartCount");
    var totalEl = $("#cartTotal");
    if (!list || !countEl || !totalEl) return;

    var count = cart.reduce(function (s, i) { return s + i.quantity; }, 0);
    var total = cart.reduce(function (sum, entry) {
      var p = menuItems.find(function (x) { return x.id === entry.id; });
      return sum + (p ? p.price * entry.quantity : 0);
    }, 0);
    countEl.textContent = String(count);
    totalEl.textContent = formatPrice(total);

    if (!cart.length) {
      list.innerHTML = '<p class="cart-empty">' + escapeHTML(t("cartEmpty")) + "</p>";
      return;
    }
    var html = "";
    cart.forEach(function (entry) {
      var product = menuItems.find(function (x) { return x.id === entry.id; });
      if (!product) return;
      html += '<div class="cart-item">'
        + '<div>'
        + '<div class="cart-item__name">' + escapeHTML(t(product.nameKey)) + '</div>'
        + '<div class="cart-item__detail">' + entry.quantity + ' \u00D7 ' + formatPrice(product.price) + '</div>'
        + '</div>'
        + '<button class="cart-item__remove" type="button" data-remove="' + product.id + '">' + escapeHTML(t("cartRemove")) + '</button>'
        + '</div>';
    });
    list.innerHTML = html;
  }

  function persistCart() {
    storage.set("yasmine-cart", JSON.stringify(cart));
    renderCart();
  }

  function addToCart(id) {
    var product = menuItems.find(function (p) { return p.id === id; });
    if (!product) return;
    var existing = cart.find(function (i) { return i.id === id; });
    if (existing) existing.quantity += 1;
    else cart.push({ id: id, quantity: 1 });
    persistCart();
    showToast(t("itemAdded"));
  }

  var toastTimer;
  function showToast(message) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
  }

  function openCart() {
    var panel = $("#cartPanel"), overlay = $("#overlay"), close = $("#cartClose");
    if (panel) { panel.classList.add("is-open"); panel.setAttribute("aria-hidden", "false"); }
    if (overlay) { overlay.classList.add("is-visible"); overlay.setAttribute("aria-hidden", "false"); }
    if (close) close.focus();
  }
  function closeCart() {
    var panel = $("#cartPanel"), overlay = $("#overlay");
    if (panel) { panel.classList.remove("is-open"); panel.setAttribute("aria-hidden", "true"); }
    if (overlay) { overlay.classList.remove("is-visible"); overlay.setAttribute("aria-hidden", "true"); }
  }

  function updateThemeButton() {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var button = $("#themeToggle");
    if (!button) return;
    button.setAttribute("aria-label", t(isDark ? "lightMode" : "darkMode"));
    button.innerHTML = isDark
      ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z"/></svg>';
  }

  // ===== Reveal (ظهور عند التمرير) =====
  var revealObserver = null;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
    }
    $$(".reveal:not(.is-visible)").forEach(function (el) { revealObserver.observe(el); });
  }

  // ===== Scroll Spy =====
  function initScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    var links = $$(".nav__link");
    var sections = links.map(function (l) {
      var href = l.getAttribute("href");
      return href && href.charAt(0) === "#" ? document.getElementById(href.slice(1)) : null;
    }).filter(Boolean);
    if (!sections.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          var active = link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    sections.forEach(function (s) { observer.observe(s); });
  }

  function updateScrollUI() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var progress = $("#readingProgress");
    if (progress) progress.style.width = (maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0) + "%";
    var backTop = $("#backTop");
    if (backTop) backTop.classList.toggle("is-visible", scrollTop > 450);
  }

  function setLanguage(next) {
    if (!translations[next]) return;
    language = next;
    storage.set("yasmine-language", language);
    applyTranslations();
  }

  // ===== التحقق من النموذج =====
  function validateForm(form) {
    var today = new Date().toISOString().slice(0, 10);
    var checks = [
      { input: $("#customerName"), error: $("#nameError"), key: "errorName",
        valid: function (v) { return v.trim().length >= 2; } },
      { input: $("#customerPhone"), error: $("#phoneError"), key: "errorPhone",
        valid: function (v) { return /^\+?[\d\s()\-]{8,20}$/.test(v.trim()); } },
      { input: $("#requestDate"), error: $("#dateError"), key: "errorDate",
        valid: function (v) { return Boolean(v) && v >= today; } },
      { input: $("#requestTime"), error: $("#timeError"), key: "errorTime",
        valid: function (v) { return Boolean(v); } },
      { input: $("#guestCount"), error: $("#guestsError"), key: "errorGuests",
        valid: function (v) { return Boolean(v); } }
    ];
    var valid = true;
    checks.forEach(function (c) {
      if (!c.input) return;
      var ok = c.valid(c.input.value);
      c.input.setAttribute("aria-invalid", String(!ok));
      if (c.error) c.error.textContent = ok ? "" : t(c.key);
      if (!ok) valid = false;
    });
    form.setAttribute("data-valid", String(valid));
    return valid;
  }

  // ===== التهيئة =====
  function init() {
    var savedTheme = storage.get("yasmine-theme", "light");
    if (savedTheme === "dark") document.documentElement.setAttribute("data-theme", "dark");

    applyTranslations();
    observeReveals();
    initScrollSpy();
    updateScrollUI();

    // شبكة الأمان: بعد ثانيتين، أظهر أي عنصر لم يُكتشف
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 800);

    // أحداث النقر العامة
    document.addEventListener("click", function (event) {
      var langBtn = event.target.closest("[data-lang]");
      if (langBtn) setLanguage(langBtn.getAttribute("data-lang"));

      var filterBtn = event.target.closest("[data-filter]");
      if (filterBtn) {
        activeFilter = filterBtn.getAttribute("data-filter");
        $$(".filter-btn").forEach(function (b) {
          b.classList.toggle("is-active", b === filterBtn);
        });
        renderMenu(activeFilter);
      }

      var addBtn = event.target.closest("[data-add]");
      if (addBtn) addToCart(addBtn.getAttribute("data-add"));

      var removeBtn = event.target.closest("[data-remove]");
      if (removeBtn) {
        cart = cart.filter(function (i) { return i.id !== removeBtn.getAttribute("data-remove"); });
        persistCart();
      }

      var navLink = event.target.closest("#siteNav a");
      if (navLink) {
        var navEl = $("#siteNav"), toggleEl = $("#menuToggle");
        if (navEl) navEl.classList.remove("is-open");
        if (toggleEl) toggleEl.setAttribute("aria-expanded", "false");
      }

      var galleryBtn = event.target.closest("[data-lightbox]");
      if (galleryBtn) {
        var img = galleryBtn.querySelector("img");
        var lightbox = $("#lightbox"), lightImg = $("#lightboxImage"), closeBtn = $("#lightboxClose");
        if (img && lightbox && lightImg) {
          lightImg.src = img.src;
          lightImg.alt = img.alt;
          lightbox.classList.add("is-open");
          if (closeBtn) closeBtn.focus();
        }
      }
    });

    // زر الوضع الليلي
    var themeToggle = $("#themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", function () {
        var isDark = document.documentElement.getAttribute("data-theme") !== "dark";
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
        storage.set("yasmine-theme", isDark ? "dark" : "light");
        updateThemeButton();
      });
    }

    // زر القائمة على الجوال
    var menuToggle = $("#menuToggle");
    if (menuToggle) {
      menuToggle.addEventListener("click", function (event) {
        var expanded = event.currentTarget.getAttribute("aria-expanded") !== "true";
        var navEl = $("#siteNav");
        if (navEl) navEl.classList.toggle("is-open", expanded);
        event.currentTarget.setAttribute("aria-expanded", String(expanded));
        event.currentTarget.setAttribute("aria-label", t(expanded ? "menuClose" : "menuOpen"));
      });
    }

    // السلة
    var cartToggle = $("#cartToggle"); if (cartToggle) cartToggle.addEventListener("click", openCart);
    var cartClose = $("#cartClose"); if (cartClose) cartClose.addEventListener("click", closeCart);
    var overlay = $("#overlay"); if (overlay) overlay.addEventListener("click", closeCart);
    var cartCheckout = $("#cartCheckout"); if (cartCheckout) cartCheckout.addEventListener("click", closeCart);

    // العودة للأعلى
    var backTop = $("#backTop");
    if (backTop) {
      backTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Lightbox
    var lightbox = $("#lightbox");
    var lightboxClose = $("#lightboxClose");
    function closeLightbox() { if (lightbox) lightbox.classList.remove("is-open"); }
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightbox) {
      lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
    }

    // Esc
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeLightbox(); closeCart(); }
    });

    // النموذج
    var form = $("#requestForm");
    if (form) {
      form.addEventListener("input", function (event) {
        var field = event.target;
        if (field.matches("input, select, textarea")) {
          field.removeAttribute("aria-invalid");
          var fieldBox = field.closest(".field");
          var errorEl = fieldBox ? fieldBox.querySelector(".field__error") : null;
          if (errorEl) errorEl.textContent = "";
        }
        var status = $("#formStatus");
        if (status) status.textContent = "";
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var status = $("#formStatus");
        if (status) status.textContent = "";
        if (!validateForm(form)) {
          if (status) status.textContent = t("errorForm");
          var firstInvalid = form.querySelector('[aria-invalid="true"]');
          if (firstInvalid) firstInvalid.focus();
          return;
        }
        if (status) status.textContent = t("formSuccess");
        form.reset();
        form.querySelectorAll("[aria-invalid]").forEach(function (f) { f.removeAttribute("aria-invalid"); });
      });
    }

    // التمرير
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateScrollUI();
        ticking = false;
      });
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();