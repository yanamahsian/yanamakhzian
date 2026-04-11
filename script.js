/* script.js — AN.KI "ironclad"
   - self-heals duplicated headers/drawers
   - one unified burger + drawer on every page
   - builds menu items into .drawer-nav everywhere
   - stable PWA install UI (no flicker)
   - stable Service Worker updates (no infinite reload)
*/

(() => {
  // === 0) ЕДИНОЕ МЕНЮ (правда одна) ===
  // Меняешь пункты ТОЛЬКО здесь.
  const NAV_ITEMS = [
    { href: "/index.html", label: "Главная" },
    { href: "/anki.html", label: "Об учении" },
    { href: "/mypath.html", label: "Мой путь" },

    { href: "/personalcontact.html", label: "Личный контакт" },
    { href: "/architecture-systems.html", label: "Архитектура систем" },
    { href: "/field-support.html", label: "Поддержка поля" },

    { href: "/workbooks.html", label: "Воркбуки" },
    { href: "/art.html", label: "Арт" },
    { href: "/aroma.html", label: "Ароматы" },
    { href: "/journal.html", label: "Журнал" },
    { href: "/artifacts.html", label: "Артефакты AN.KI" },

    { href: "/contacts.html", label: "Контакты" }
  ];

  const SW_VERSION = "2026-02-17-1"; // меняй только если хочешь форс-апдейт SW

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  function normalizePath(p) {
    const clean = (p || "").split("?")[0].split("#")[0];
    if (clean.endsWith("/")) return clean + "index.html";
    return clean;
  }

  function currentPathnameFile() {
    const p = normalizePath(location.pathname);
    const file = p.substring(p.lastIndexOf("/") + 1) || "index.html";
    return file;
  }

  // === 1) SELF-HEAL: убираем дубли UI-узлов ===
  function keepFirstRemoveRest(selector) {
    const nodes = $$(selector);
    if (nodes.length <= 1) return nodes[0] || null;
    nodes.slice(1).forEach((n) => n.remove());
    return nodes[0];
  }

  function ensureNavScaffold() {
    const btn = keepFirstRemoveRest("[data-burger]");

    let overlay = keepFirstRemoveRest("[data-nav-overlay]");
    let drawer = keepFirstRemoveRest("[data-nav-drawer]");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "nav-overlay";
      overlay.setAttribute("data-nav-overlay", "");
      document.body.appendChild(overlay);
    }

    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.className = "nav-drawer";
      drawer.setAttribute("data-nav-drawer", "");
      drawer.innerHTML = `
        <h3>Навигация</h3>
        <nav class="drawer-nav"></nav>
        <div class="drawer-bottom">Все права защищены.</div>
      `;
      document.body.appendChild(drawer);
    }

    let nav = $(".drawer-nav", drawer);
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "drawer-nav";
      drawer.insertBefore(nav, $(".drawer-bottom", drawer) || null);
    }

    const navs = $$(".drawer-nav", drawer);
    if (navs.length > 1) navs.slice(1).forEach((n) => n.remove());

    return { btn, overlay, drawer, nav: $(".drawer-nav", drawer) };
  }

  // === 2) Строим меню в drawer ===
  function buildDrawerNav(navEl) {
    if (!navEl) return;

    const activeFile = currentPathnameFile();

    navEl.innerHTML = NAV_ITEMS.map((it) => {
      const href = it.href;
      const file = href.substring(href.lastIndexOf("/") + 1);
      const isActive = file === activeFile;
      return `<a href="${href}" ${isActive ? 'aria-current="page"' : ""}>${it.label}</a>`;
    }).join("");
  }

  // === 3) Бургер ===
  function initBurger(btn, overlay, drawer) {
    if (!btn || !overlay || !drawer) return;

    const root = document.documentElement;

    function open() {
      root.classList.add("nav-open");
      btn.setAttribute("aria-expanded", "true");
    }

    function close() {
      root.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    }

    function toggle() {
      root.classList.contains("nav-open") ? close() : open();
    }

    btn.addEventListener("click", toggle);
    overlay.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) close();
    });
  }

  // === 4) PWA install button ===
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function initInstallUI() {
    const btn = document.getElementById("installBtn");
    const hint = document.getElementById("installHint");
    if (!btn) return;

    if (isStandalone()) {
      btn.style.display = "none";
      if (hint) hint.style.display = "none";
      return;
    }

    if (isIOS()) {
      btn.style.display = "inline-flex";
      btn.addEventListener("click", () => {
        if (!hint) return;
        hint.style.display = "block";
        hint.textContent = "iPhone: Поделиться → «На экран Домой»";
      });
      return;
    }

    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      btn.style.display = "inline-flex";
      if (hint) {
        hint.style.display = "none";
      }
    });

    btn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.style.display = "none";
      if (hint) hint.style.display = "none";
    });
  }

  // === 5) Service Worker ===
  async function initSW() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register(`/service-worker.js?v=${SW_VERSION}`, { scope: "/" });

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      let refreshed = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshed) return;
        refreshed = true;
        location.reload();
      });
    } catch (e) {
      console.warn("SW registration failed:", e);
    }
  }

  // === START ===
  document.addEventListener("DOMContentLoaded", () => {
    const { btn, overlay, drawer, nav } = ensureNavScaffold();
    buildDrawerNav(nav);
    initBurger(btn, overlay, drawer);
    initInstallUI();
    initSW();
  });
})();
