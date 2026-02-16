import {
  developerSites,
  platformLinks,
  socialLinks,
  type HubLink,
  type HubSocialLink,
} from "@repo/shared/site-links";
import gsap from "gsap";
import "./style.css";

/* ── Types ────────────────────────────────────────────── */

interface ServiceItem {
  name: string;
  url: string;
  description: string;
  headline: string;
  summary: string;
}

/* ── SVG Icons ────────────────────────────────────────── */

const socialSvg: Record<HubSocialLink["iconKey"], string> = {
  github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 00-3.8 23.38c.6.11.82-.26.82-.58v-2.16c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18a4.65 4.65 0 011.23 3.22c0 4.61-2.8 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0012 .3z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>`,
};

const chevronLeftSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7"/></svg>`;
const chevronRightSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`;
const arrowUpRightSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>`;
const menuSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`;
const closeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>`;
const linkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
const starSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>`;
const lockSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;

/* ── Helpers ──────────────────────────────────────────── */

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const hostOf = (url: string): string => {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
};

/* ── Service Data ─────────────────────────────────────── */

const enrichService = (link: HubLink): ServiceItem => {
  const { url, name, description } = link;
  const desc = description ?? "";
  if (url.includes("log.itjustbong")) return { name, url, description: desc, headline: "기술 아카이브", summary: "실무 경험과 학습 기록을 정리하는 기술 블로그입니다. 읽기 흐름과 검색 경험을 중심으로 콘텐츠 구조를 설계했습니다." };
  if (url.includes("chat.itjustbong")) return { name, url, description: desc, headline: "개인 데이터 RAG", summary: "블로그와 이력서 데이터를 기반으로 질문에 답하는 AI 서비스입니다. 문맥 검색과 출처 응답 흐름을 직접 구현했습니다." };
  if (url.includes("resume.itjustbong")) return { name, url, description: desc, headline: "인터랙티브 이력서", summary: "프로젝트 중심으로 경력과 기술 스택을 탐색할 수 있는 웹 이력서입니다. 정보 밀도와 가독성을 균형 있게 구성했습니다." };
  if (url.includes("lemmeblind")) return { name, url, description: desc, headline: "소개팅 플랫폼", summary: "신뢰할 수 있는 친구를 통한 소개팅 연결 플랫폼입니다." };
  if (url.includes("pickiverse")) return { name, url, description: desc, headline: "피키버스", summary: "취향 기반 투표와 소통이 가능한 커뮤니티 서비스입니다." };
  if (url.includes("whales-wallet")) return { name, url, description: desc, headline: "Whale Tracker", summary: "암호화폐 고래 지갑의 움직임을 실시간으로 추적하고 분석하는 서비스입니다." };
  return { name, url, description: desc, headline: name, summary: desc };
};

const services: ServiceItem[] = [...platformLinks, ...developerSites].map(enrichService);

/* ── Slide Constants ──────────────────────────────────── */

const WELCOME_INDEX = 0;
const totalSlides = services.length + 1;

/* ── State ────────────────────────────────────────────── */

let currentIndex = 0;
let isAnimating = false;
let menuOpen = false;

/* ── Toolbar HTML Helper ──────────────────────────────── */

const toolbarHtml = (urlLabel: string, iconSvg: string) => `
  <div class="card__toolbar">
    <button class="card__toolbar-arrow card__toolbar-arrow--prev" aria-label="이전">
      ${chevronLeftSvg}
    </button>
    <div class="card__toolbar-url">
      ${iconSvg}
      <span>${esc(urlLabel)}</span>
    </div>
    <button class="card__toolbar-arrow card__toolbar-arrow--next" aria-label="다음">
        ${chevronRightSvg}
      </button>
  </div>`;

/* ── Build DOM ────────────────────────────────────────── */

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app not found");

const welcomeCardHtml = `
  <div class="card card--welcome" data-index="0">
    <div class="card__glass">
      ${toolbarHtml("서비스 허브", starSvg)}
      <div class="card__info">

        <h3 class="card__name">
          <span class="card__welcome-brand">Hello</span>
          <span>👋</span>
        </h3>
        <p class="card__welcome-greeting">Let's explore my services</p>

        <p class="card__desc">좌우로 스크롤하여<br/>서비스를 탐색해보세요</p>
        <div class="card__welcome-gesture">
          <span class="card__welcome-arrow">&lsaquo;</span>
          <div class="card__welcome-track">
            <div class="card__welcome-dot"></div>
          </div>
          <span class="card__welcome-arrow">&rsaquo;</span>
        </div>
      </div>
    </div>
  </div>`;

const serviceCardsHtml = services.map((s, i) => {
  const slideIdx = i + 1;
  return `
    <div class="card" data-index="${slideIdx}">
      <div class="card__glass">
        ${toolbarHtml(hostOf(s.url), lockSvg)}
        <div class="card__info">
          <span class="card__number">0${i + 1}</span>
          <span class="card__headline">${esc(s.headline)}</span>
          <h3 class="card__name">${esc(s.name)}</h3>
          <p class="card__desc">${esc(s.description)}</p>
          <span class="card__url">${linkSvg} ${esc(hostOf(s.url))}</span>
        </div>
        <div class="card__iframe-wrap">
          <div class="card__loader">
            <div class="card__spinner"></div>
            <span>로딩 중...</span>
          </div>
        </div>
      </div>
    </div>`;
}).join("");

const dotsHtml = Array.from({ length: totalSlides }, (_, i) =>
  `<button class="nav-dot ${i === 0 ? "is-active" : ""}" data-dot="${i}" aria-label="슬라이드 ${i + 1}"></button>`
).join("");

app.innerHTML = `
  <div class="bg" aria-hidden="true">
    <div class="bg__orb bg__orb--1"></div>
    <div class="bg__orb bg__orb--2"></div>
    <div class="bg__orb bg__orb--3"></div>
  </div>

  <header class="header" id="header">
    <div class="header__glass">
      <span class="header__brand">itjustbong</span>
      <div class="header__divider"></div>
      <div class="header__actions">
        ${socialLinks.map(link => `
          <a class="header__social-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(link.label)}">${socialSvg[link.iconKey]}</a>
        `).join("")}
        <button class="header__menu-btn" id="menu-btn" aria-label="메뉴 열기">${menuSvg}</button>
      </div>
    </div>
  </header>

  <div class="menu-overlay" id="menu-overlay">
    <div class="menu-overlay__backdrop" id="menu-backdrop"></div>
    <div class="menu__panel" id="menu-panel">
      <div class="menu__header">
        <h2 class="menu__title">서비스 목록</h2>
        <button class="menu__close" id="menu-close" aria-label="메뉴 닫기">${closeSvg}</button>
      </div>
      <div class="menu__list">
        ${services.map((s, i) => `
          <button class="menu__item" data-menu="${i + 1}">
            <span class="menu__item-num">0${i + 1}</span>
            <div class="menu__item-body">
              <span class="menu__item-label">${esc(s.headline)}</span>
              <h3 class="menu__item-name">${esc(s.name)}</h3>
              <p class="menu__item-desc">${esc(s.description)}</p>
              <span class="menu__item-url">${linkSvg} ${esc(hostOf(s.url))}</span>
            </div>
          </button>
        `).join("")}
      </div>
    </div>
  </div>

  <div class="carousel" id="carousel">
    <div class="carousel__stage" id="stage">
      ${welcomeCardHtml}
      ${serviceCardsHtml}
    </div>
  </div>

  <div class="info-panel" id="info-panel">
    <div class="info-panel__glass">
      <div class="info-panel__dots">${dotsHtml}</div>
      <div class="info-panel__body">
        <div class="info-panel__text">
          <span class="info-panel__label">WELCOME</span>
          <h2 class="info-panel__name">itjustbong 서비스 허브</h2>
          <p class="info-panel__desc">직접 설계하고 운영하는 서비스들을 한곳에서 탐색하세요. 좌우로 스크롤하여 각 서비스의 실제 화면을 미리볼 수 있습니다.</p>
        </div>
        <a class="info-panel__cta" id="info-cta" href="#" target="_blank" rel="noopener noreferrer" style="display:none">
          방문하기 ${arrowUpRightSvg}
        </a>
      </div>
    </div>
  </div>
`;

/* ── DOM Refs ─────────────────────────────────────────── */

const root = document.documentElement;
const headerEl = document.getElementById("header")!;
const infoPanelEl = document.getElementById("info-panel")!;
const cardEls = [...document.querySelectorAll<HTMLElement>(".card")];
const dotEls = [...document.querySelectorAll<HTMLElement>(".nav-dot")];
const infoCta = document.getElementById("info-cta") as HTMLAnchorElement;

const menuBtn = document.getElementById("menu-btn")!;
const menuOverlay = document.getElementById("menu-overlay")!;
const menuPanel = document.getElementById("menu-panel")!;
const menuBackdrop = document.getElementById("menu-backdrop")!;
const menuCloseBtn = document.getElementById("menu-close")!;
const menuItems = [...document.querySelectorAll<HTMLElement>(".menu__item")];

/* ── Responsive Config ────────────────────────────────── */

interface CarouselConfig {
  cardWidth: number;
  cardHeight: number;
  spacing: number;
  rotateY: number;
  zDepth: number;
  sideScale: number;
}

const PANEL_MAX_W = 560;
const MOBILE_CARD_MAX_H = 680;
const MOBILE_CARD_HEIGHT_RATIO = 0.68;

const getConfig = (): CarouselConfig => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (w < 640) {
    const cw = Math.min(PANEL_MAX_W, w - 32);
    return {
      cardWidth: cw,
      cardHeight: Math.min(MOBILE_CARD_MAX_H, h * MOBILE_CARD_HEIGHT_RATIO),
      spacing: cw + 24,
      rotateY: 28,
      zDepth: 120,
      sideScale: 0.7,
    };
  }
  if (w < 1024) {
    const cw = Math.min(PANEL_MAX_W, w - 48);
    return {
      cardWidth: cw,
      cardHeight: Math.min(620, h * 0.6),
      spacing: cw + 40,
      rotateY: 30,
      zDepth: 160,
      sideScale: 0.73,
    };
  }
  const cw = Math.min(PANEL_MAX_W, w - 48);
  return {
    cardWidth: cw,
    cardHeight: Math.min(680, h * 0.65),
    spacing: Math.min(640, cw + 80),
    rotateY: 35,
    zDepth: 220,
    sideScale: 0.78,
  };
};

let config = getConfig();

const applyLayout = () => {
  config = getConfig();
  root.style.setProperty("--card-w", `${config.cardWidth}px`);
  root.style.setProperty("--card-h", `${config.cardHeight}px`);
};

applyLayout();

/* ── Position Cards (3D Carousel) ─────────────────────── */

const positionCards = (animate: boolean) => {
  const dur = animate ? 0.8 : 0;

  cardEls.forEach((card, i) => {
    const offset = i - currentIndex;
    const absOffset = Math.abs(offset);
    const x = offset * config.spacing;
    const rotY = Math.max(-65, Math.min(65, offset * -config.rotateY));
    const z = absOffset === 0 ? 0 : -(absOffset * config.zDepth);
    const scale = absOffset === 0 ? 1 : Math.max(0.6, config.sideScale - (absOffset - 1) * 0.08);
    const opacity = absOffset > 3 ? 0 : Math.max(0.12, 1 - absOffset * 0.3);
    const zIndex = 100 - absOffset;
    const visible = absOffset <= 3;

    card.style.zIndex = String(zIndex);

    const props = { xPercent: -50, yPercent: -50, x, rotateY: rotY, z, scale, opacity, duration: dur, ease: "power3.inOut" };

    if (animate) {
      gsap.to(card, { ...props, onStart: () => { if (visible) card.style.visibility = "visible"; }, onComplete: () => { if (!visible) card.style.visibility = "hidden"; } });
    } else {
      gsap.set(card, props);
      card.style.visibility = visible ? "visible" : "hidden";
    }

    card.classList.toggle("is-focused", i === currentIndex);
  });
};

/* ── Navigate ─────────────────────────────────────────── */

const goTo = (index: number) => {
  if (isAnimating) return;
  const target = Math.max(0, Math.min(totalSlides - 1, index));
  if (target === currentIndex) return;

  isAnimating = true;

  if (currentIndex !== WELCOME_INDEX) unloadIframe(currentIndex);
  currentIndex = target;

  positionCards(true);
  updateInfoPanel();
  updateDots();
  updateToolbarArrows();
  updateMenuCurrent();

  if (currentIndex !== WELCOME_INDEX) loadIframe(currentIndex);

  setTimeout(() => { isAnimating = false; }, 850);
};

const next = () => goTo(currentIndex + 1);
const prev = () => goTo(currentIndex - 1);

/* ── Iframe Management ────────────────────────────────── */

const loadIframe = (index: number) => {
  if (index === WELCOME_INDEX) return;
  const card = cardEls[index];
  const wrap = card.querySelector<HTMLElement>(".card__iframe-wrap")!;
  if (wrap.querySelector("iframe")) return;

  const service = services[index - 1];
  const iframe = document.createElement("iframe");
  iframe.src = service.url;
  iframe.loading = "lazy";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation");
  iframe.style.cssText = "width:125%;height:125%;border:none;background:#fff;transform:scale(0.8);transform-origin:0 0;";

  const loader = wrap.querySelector<HTMLElement>(".card__loader");

  iframe.addEventListener("load", () => { if (loader) loader.classList.add("is-hidden"); });

  const loadTimeout = setTimeout(() => {
    if (loader) loader.innerHTML = `<span style="text-align:center;line-height:1.6">미리보기를 사용할 수 없습니다<br/><span style="font-size:0.7rem;opacity:0.6">하단의 '방문하기' 버튼을 이용해주세요</span></span>`;
  }, 10000);

  iframe.addEventListener("load", () => clearTimeout(loadTimeout));
  iframe.addEventListener("error", () => {
    clearTimeout(loadTimeout);
    if (loader) loader.innerHTML = `<span style="text-align:center;line-height:1.6">미리보기를 사용할 수 없습니다<br/><span style="font-size:0.7rem;opacity:0.6">하단의 '방문하기' 버튼을 이용해주세요</span></span>`;
  });

  wrap.appendChild(iframe);
};

const unloadIframe = (index: number) => {
  if (index === WELCOME_INDEX) return;
  const card = cardEls[index];
  const wrap = card.querySelector<HTMLElement>(".card__iframe-wrap");
  if (!wrap) return;
  const iframe = wrap.querySelector("iframe");
  if (iframe) iframe.remove();

  const loader = wrap.querySelector<HTMLElement>(".card__loader");
  if (loader) {
    loader.classList.remove("is-hidden");
    loader.innerHTML = `<div class="card__spinner"></div><span>로딩 중...</span>`;
  }
};

/* ── Info Panel Update ────────────────────────────────── */

const updateInfoPanel = () => {
  const labelEl = infoPanelEl.querySelector<HTMLElement>(".info-panel__label")!;
  const nameEl = infoPanelEl.querySelector<HTMLElement>(".info-panel__name")!;
  const descEl = infoPanelEl.querySelector<HTMLElement>(".info-panel__desc")!;

  const isWelcome = currentIndex === WELCOME_INDEX;
  const label = isWelcome ? "WELCOME" : services[currentIndex - 1].headline;
  const name = isWelcome ? "itjustbong 서비스 허브" : services[currentIndex - 1].name;
  const desc = isWelcome
    ? "직접 설계하고 운영하는 서비스들을 한곳에서 탐색하세요. 좌우로 스크롤하여 각 서비스의 실제 화면을 미리볼 수 있습니다."
    : services[currentIndex - 1].summary;

  gsap.to([labelEl, nameEl, descEl], {
    opacity: 0, y: 8, duration: 0.2,
    onComplete: () => {
      labelEl.textContent = label;
      nameEl.textContent = name;
      descEl.textContent = desc;

      if (isWelcome) {
        infoCta.style.display = "none";
      } else {
        infoCta.style.display = "";
        infoCta.href = services[currentIndex - 1].url;
      }

      gsap.to([labelEl, nameEl, descEl], { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out" });
    },
  });
};

/* ── Navigation Dots ──────────────────────────────────── */

const updateDots = () => {
  dotEls.forEach((dot, i) => dot.classList.toggle("is-active", i === currentIndex));
};

dotEls.forEach((dot) => {
  dot.addEventListener("click", () => {
    const i = Number(dot.dataset.dot);
    if (!isNaN(i)) goTo(i);
  });
});

/* ── Toolbar Arrow Buttons ────────────────────────────── */

const updateToolbarArrows = () => {
  cardEls.forEach((card) => {
    const prevBtn = card.querySelector<HTMLButtonElement>(".card__toolbar-arrow--prev");
    const nextBtn = card.querySelector<HTMLButtonElement>(".card__toolbar-arrow--next");
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === totalSlides - 1;
  });
};

cardEls.forEach((card) => {
  const prevBtn = card.querySelector<HTMLButtonElement>(".card__toolbar-arrow--prev");
  const nextBtn = card.querySelector<HTMLButtonElement>(".card__toolbar-arrow--next");

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      prev();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      next();
    });
  }
});

/* ── Menu ─────────────────────────────────────────────── */

const updateMenuCurrent = () => {
  menuItems.forEach((item) => {
    const idx = Number(item.dataset.menu);
    item.classList.toggle("is-current", idx === currentIndex);
  });
};

const openMenu = () => {
  if (menuOpen) return;
  menuOpen = true;
  updateMenuCurrent();
  menuOverlay.classList.add("is-open");
  gsap.fromTo(menuOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
  gsap.fromTo(menuPanel, { scale: 0.94, y: 16, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: "power3.out" });
};

const closeMenu = () => {
  if (!menuOpen) return;
  menuOpen = false;
  gsap.to(menuOverlay, { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => { menuOverlay.classList.remove("is-open"); } });
};

menuBtn.addEventListener("click", () => { if (menuOpen) closeMenu(); else openMenu(); });
menuCloseBtn.addEventListener("click", closeMenu);
menuBackdrop.addEventListener("click", closeMenu);

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const idx = Number(item.dataset.menu);
    if (isNaN(idx)) return;
    closeMenu();
    setTimeout(() => goTo(idx), 280);
  });
});

/* ── Event: Wheel ─────────────────────────────────────── */

let lastWheelTime = 0;
const WHEEL_COOLDOWN = 700;

window.addEventListener("wheel", (e) => {
  if (menuOpen) return;
  const target = e.target as HTMLElement;
  if (target.closest("iframe")) return;
  e.preventDefault();
  if (isAnimating) return;
  const now = Date.now();
  if (now - lastWheelTime < WHEEL_COOLDOWN) return;
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(delta) < 15) return;
  lastWheelTime = now;
  if (delta > 0) next(); else prev();
}, { passive: false });

/* ── Event: Touch ─────────────────────────────────────── */

let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;

window.addEventListener("touchstart", (e) => {
  if (menuOpen) return;
  const target = e.target as HTMLElement;
  if (target.closest("iframe")) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchDeltaX = 0;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (menuOpen) return;
  const target = e.target as HTMLElement;
  if (target.closest("iframe")) return;
  touchDeltaX = e.touches[0].clientX - touchStartX;
  const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
  if (Math.abs(touchDeltaX) > deltaY + 10) e.preventDefault();
}, { passive: false });

window.addEventListener("touchend", () => {
  if (menuOpen || isAnimating) return;
  if (Math.abs(touchDeltaX) > 50) { if (touchDeltaX < 0) next(); else prev(); }
}, { passive: true });

/* ── Event: Keyboard ──────────────────────────────────── */

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menuOpen) { closeMenu(); return; }
  if (menuOpen) return;
  if (e.key === "ArrowRight") next();
  else if (e.key === "ArrowLeft") prev();
});

/* ── Event: Click Side Cards ──────────────────────────── */

cardEls.forEach((card, i) => {
  card.addEventListener("click", () => {
    if (menuOpen) return;
    if (i !== currentIndex && !isAnimating) goTo(i);
  });
});

/* ── Event: Resize ────────────────────────────────────── */

let resizeTimer: number | null = null;
window.addEventListener("resize", () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => { applyLayout(); positionCards(false); }, 150);
});

/* ── Pointer Parallax ─────────────────────────────────── */

window.addEventListener("pointermove", (e) => {
  const x = (e.clientX / innerWidth - 0.5) * 2;
  const y = (e.clientY / innerHeight - 0.5) * 2;
  root.style.setProperty("--px", x.toFixed(3));
  root.style.setProperty("--py", y.toFixed(3));
}, { passive: true });

window.addEventListener("blur", () => {
  root.style.setProperty("--px", "0");
  root.style.setProperty("--py", "0");
});

/* ── Initial Setup ────────────────────────────────────── */

gsap.set([headerEl, infoPanelEl], { opacity: 0 });
positionCards(false);
updateToolbarArrows();

gsap.fromTo(headerEl, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.2, ease: "power2.out" });
gsap.fromTo(infoPanelEl, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: "power2.out" });

cardEls.forEach((card, i) => {
  gsap.from(card, { z: -500, opacity: 0, duration: 0.9, delay: 0.15 + i * 0.07, ease: "power3.out" });
});
