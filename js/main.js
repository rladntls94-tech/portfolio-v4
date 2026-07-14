/**
 * 김우신 포트폴리오 — 탭(뷰) 라우터 + 앱형 리치 모션
 * 구조: 상단 메뉴를 누르면 해당 뷰만 표시(나머지 숨김). 첫 화면은 '소개(home)'.
 *  - 라우팅: location.hash 기반(#home/#strengths/…) → 뒤로가기/링크 공유 지원
 *  - 모바일: 햄버거 → 드롭다운 메뉴
 *  - 뷰 진입 시 리빌/숫자 카운트업 재생
 * 점진적 향상: .js가 붙어야 초기 은닉/뷰 숨김이 적용 → JS 실패 시 모든 콘텐츠가 그냥 보임.
 * prefers-reduced-motion: reduce → 화려한 모션은 끄고 최종 상태 즉시 적용.
 */
(function () {
  var html = document.documentElement;
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var finePointer = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);

  try {
    html.classList.remove("no-js");
    html.classList.add("js");

    /* reveal-group 내 요소에 순번(--i) 부여 (스태거) */
    document.querySelectorAll(".reveal-group").forEach(function (group) {
      group.querySelectorAll(".reveal").forEach(function (item, i) { item.style.setProperty("--i", i); });
    });

    /* ---------- 숫자 카운트업 (안전망 포함) ---------- */
    var parseNum = function (raw) {
      var m = String(raw).trim().match(/^(\d+)(.*)$/);
      return m ? { value: parseInt(m[1], 10), suffix: m[2] || "" } : null;
    };
    var countUp = function (el) {
      var p = parseNum(el.getAttribute("data-target") || el.textContent);
      if (!p) return;
      el.setAttribute("data-target", p.value + p.suffix); // 원본 목표 보존(재생 시 재파싱 안전)
      if (reduceMotion) { el.textContent = p.value + p.suffix; return; }
      var dur = 1100, start = null, done = false;
      var settle = function () { if (!done) { done = true; el.textContent = p.value + p.suffix; } };
      var step = function (t) {
        if (done) return;
        if (start === null) start = t;
        var prog = Math.min((t - start) / dur, 1);
        el.textContent = Math.round(p.value * (1 - Math.pow(1 - prog, 3))) + p.suffix;
        if (prog < 1) requestAnimationFrame(step); else settle();
      };
      el.textContent = "0" + p.suffix;
      requestAnimationFrame(step);
      setTimeout(settle, dur + 500); // rAF가 멈춰도 최종값은 반드시 정확히 확정
    };

    /* ---------- 뷰 진입 시 리빌/카운트 재생 ---------- */
    var replayView = function (view) {
      var revs = view.querySelectorAll(".reveal");
      revs.forEach(function (el) { el.classList.remove("is-visible"); });
      void view.offsetWidth; // 리플로우 → 애니메이션 재생
      revs.forEach(function (el) { el.classList.add("is-visible"); });
      view.querySelectorAll(".stat__num").forEach(countUp);
    };

    /* ---------- 라우터 ---------- */
    var views = Array.prototype.slice.call(document.querySelectorAll(".view"));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
    var navLinksMenu = document.getElementById("nav-links");
    var toggle = document.querySelector(".nav__toggle");

    var closeMenu = function () {
      if (!navLinksMenu) return;
      navLinksMenu.classList.remove("is-open");
      if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "메뉴 열기"); }
    };

    var showView = function (id) {
      var target = document.getElementById(id);
      if (!target || target.className.indexOf("view") === -1) { target = document.getElementById("home"); id = "home"; }
      views.forEach(function (v) { v.classList.toggle("is-active", v === target); });
      navLinks.forEach(function (a) {
        var on = a.getAttribute("data-view") === id;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      closeMenu();
      window.scrollTo(0, 0);
      replayView(target);
    };

    var currentId = function () { return (location.hash || "#home").slice(1); };
    var route = function () { showView(currentId()); };
    window.addEventListener("popstate", route);   // 뒤로/앞으로 가기
    window.addEventListener("hashchange", route); // 주소창에 직접 해시 입력 대비

    // 메뉴/브랜드/버튼 등 data-view 요소 클릭 → 즉시 뷰 전환 (+ 주소 갱신)
    document.querySelectorAll("[data-view]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        var id = el.getAttribute("data-view");
        e.preventDefault();
        if (currentId() !== id) {
          try { history.pushState(null, "", "#" + id); } catch (_) { /* file:// 등 pushState 불가 시 무시 */ }
        }
        showView(id); // 이벤트에 의존하지 않고 즉시 반영
      });
    });

    /* ---------- 햄버거 토글 ---------- */
    if (toggle && navLinksMenu) {
      toggle.addEventListener("click", function () {
        var open = navLinksMenu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
      document.addEventListener("click", function (e) {
        if (navLinksMenu.classList.contains("is-open") &&
            !navLinksMenu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
      });
    }

    /* ---------- 다크 모드 토글 ---------- */
    var themeBtn = document.querySelector(".theme-toggle");
    if (themeBtn) {
      var applyTheme = function (t) {
        html.setAttribute("data-theme", t);
        themeBtn.setAttribute("aria-pressed", String(t === "dark"));
        themeBtn.setAttribute("aria-label", t === "dark" ? "라이트 모드 전환" : "다크 모드 전환");
      };
      var saved = null;
      try { saved = localStorage.getItem("kws-theme"); } catch (_) {}
      if (saved) applyTheme(saved);
      themeBtn.addEventListener("click", function () {
        var next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem("kws-theme", next); } catch (_) {}
      });
    }

    /* ---------- 경력 필터 (+ 팝 등장) ---------- */
    var filters = document.querySelectorAll(".filter");
    var projects = document.querySelectorAll(".project");
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-filter");
        filters.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-pressed", String(on));
        });
        projects.forEach(function (p) {
          var show = cat === "all" || p.getAttribute("data-category") === cat;
          p.classList.remove("is-appearing");
          p.classList.toggle("is-hidden", !show);
          if (show && !reduceMotion) { void p.offsetWidth; p.classList.add("is-appearing"); }
        });
      });
    });

    /* ---------- 히어로 역할 타이핑 ---------- */
    var roleEl = document.getElementById("hero-role");
    var roles = ["일본어 원어민", "글로벌 라이브 서비스 운영", "PM · GM"];
    if (roleEl && !reduceMotion) {
      var ri = 0, ci = 0, deleting = false;
      var tick = function () {
        var word = roles[ri];
        roleEl.textContent = word.slice(0, ci);
        if (!deleting) {
          if (ci < word.length) { ci++; setTimeout(tick, 90); }
          else { deleting = true; setTimeout(tick, 1600); }
        } else {
          if (ci > 0) { ci--; setTimeout(tick, 45); }
          else { deleting = false; ri = (ri + 1) % roles.length; setTimeout(tick, 320); }
        }
      };
      setTimeout(tick, 700);
    }

    /* ---------- 3D 틸트 + 커서 광택 ---------- */
    if (finePointer && !reduceMotion) {
      document.querySelectorAll(".card, .tool").forEach(function (el) {
        el.addEventListener("mouseenter", function () { el.style.transition = "transform 60ms linear"; });
        el.addEventListener("mousemove", function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          el.style.transform = "perspective(820px) rotateX(" + ((0.5 - py) * 8).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * 8).toFixed(2) + "deg) translateY(-6px)";
          el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
          el.classList.add("is-tilting");
        });
        el.addEventListener("mouseleave", function () {
          el.style.transition = "transform .45s cubic-bezier(.2,.7,.3,1)";
          el.style.transform = ""; el.classList.remove("is-tilting");
        });
      });
    }

    /* ---------- 버튼/필터 리플 ---------- */
    if (!reduceMotion) {
      document.querySelectorAll(".btn, .filter").forEach(function (el) {
        el.addEventListener("click", function (e) {
          var r = el.getBoundingClientRect(), size = Math.max(r.width, r.height);
          var span = document.createElement("span");
          span.className = "ripple";
          span.style.width = span.style.height = size + "px";
          span.style.left = (e.clientX - r.left - size / 2) + "px";
          span.style.top = (e.clientY - r.top - size / 2) + "px";
          el.appendChild(span);
          span.addEventListener("animationend", function () { span.remove(); });
        });
      });
    }

    /* ---------- 마그네틱 버튼 ---------- */
    if (finePointer && !reduceMotion) {
      document.querySelectorAll(".btn--dark").forEach(function (el) {
        el.classList.add("is-magnetic");
        el.addEventListener("mousemove", function (e) {
          var r = el.getBoundingClientRect();
          el.style.transform = "translate(" + ((e.clientX - (r.left + r.width / 2)) * 0.28).toFixed(1) + "px," + ((e.clientY - (r.top + r.height / 2)) * 0.4).toFixed(1) + "px)";
        });
        el.addEventListener("mouseleave", function () { el.style.transform = ""; });
      });
    }

    /* ---------- 스크롤 진행 바 ---------- */
    if (!reduceMotion) {
      var bar = document.createElement("div");
      bar.className = "scroll-progress"; bar.setAttribute("aria-hidden", "true");
      document.body.appendChild(bar);
      var ticking = false;
      var update = function () {
        var st = window.pageYOffset || document.documentElement.scrollTop;
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (h > 0 ? Math.min(st / h, 1) : 0) + ")";
        ticking = false;
      };
      window.addEventListener("scroll", function () { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
      update();
    }

    /* ---------- 초기 라우팅 ---------- */
    route();
    // 안전망: 라우팅이 어떤 이유로든 아무 뷰도 못 켰다면 홈을 강제 표시
    setTimeout(function () {
      if (!document.querySelector(".view.is-active")) {
        var home = document.getElementById("home");
        if (home) home.classList.add("is-active");
        document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
      }
    }, 1200);
  } catch (err) {
    /* 안전망: 실패 시 .js 제거 → 모든 뷰/콘텐츠가 그냥 보이는 기본 상태로 복귀 */
    html.classList.remove("js");
    html.classList.add("no-js");
  }
})();
