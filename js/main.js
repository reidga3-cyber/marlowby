/* =============================================================
   main.js — shared behavior for every Marlowby page.

   Everything here is an "enhancement": the site is fully readable
   and navigable without it. Each feature checks that what it needs
   exists before running, so a missing library never breaks a page.

   Sections:
     1. Mobile menu
     2. Site search
     3. Smooth scrolling (Lenis) + GSAP scroll animations
     4. Magnetic buttons
     5. 3D tilt cards
   ============================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* -----------------------------------------------------------
     1. Mobile menu
     The button toggles aria-expanded (so screen readers announce
     "expanded/collapsed") and a CSS class that slides the panel in.
     ----------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    // Escape closes the menu and returns focus to the button
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
    // Close the menu if the screen grows to desktop width
    window.matchMedia('(min-width: 64em)').addEventListener('change', function (mq) { if (mq.matches) setMenu(false); });
  }

  /* -----------------------------------------------------------
     2. Site search
     Builds one flat list from data.js, then filters it on every
     keystroke. Matching is case- and accent-insensitive, and every
     word typed must appear somewhere in the entry.
     ----------------------------------------------------------- */
  var dialog = document.getElementById('search');
  var openBtn = document.querySelector('.search-open');

  if (dialog && openBtn && window.MARLOWBY_DATA && typeof dialog.showModal === 'function') {
    var input = dialog.querySelector('.search__input');
    var list = dialog.querySelector('.search__results');
    var status = dialog.querySelector('.search__status');
    var data = window.MARLOWBY_DATA;

    // Turn "Piñon" into "pinon" so typing either one matches
    var plain = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var cityName = {};
    data.cities.forEach(function (c) { cityName[c.slug] = c.name + ', ' + c.state; });

    // One index entry per city, maker, and product
    var index = [];
    data.cities.forEach(function (c) {
      index.push({ type: 'City', title: c.name + ', ' + c.state, sub: c.box + ' · ' + c.when, url: 'cities.html#' + c.slug, text: c.blurb });
    });
    data.makers.forEach(function (m) {
      index.push({ type: 'Maker', title: m.name, sub: m.owner + ' · ' + cityName[m.city], url: 'makers.html#' + m.slug, text: m.product });
      index.push({ type: 'Product', title: m.product, sub: 'by ' + m.name + ' · ' + cityName[m.city], url: 'makers.html#' + m.slug, text: '' });
    });
    index.forEach(function (item) { item.hay = plain([item.title, item.sub, item.text, item.type].join(' ')); });

    // Wrap the matched words in <mark> so people can see why a result matched
    function highlight(text, words) {
      var safe = text.replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
      words.forEach(function (w) {
        if (w.length < 2) return;
        var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
        safe = safe.replace(re, '<mark>$1</mark>');
      });
      return safe;
    }

    function render() {
      var q = plain(input.value.trim());
      if (!q) { list.innerHTML = ''; status.textContent = 'Type to search ' + data.cities.length + ' cities and ' + data.makers.length + ' makers.'; return; }
      var words = q.split(/\s+/);
      var hits = index.filter(function (item) { return words.every(function (w) { return item.hay.indexOf(w) !== -1; }); });
      // Rank results whose title starts with the query first
      hits.sort(function (a, b) { return (plain(b.title).indexOf(q) === 0) - (plain(a.title).indexOf(q) === 0); });
      hits = hits.slice(0, 12);
      status.textContent = hits.length
        ? hits.length + (hits.length === 1 ? ' result' : ' results') + ' for “' + input.value.trim() + '”'
        : 'No matches for “' + input.value.trim() + '”. Try a city like “Duluth” or a product like “honey.”';
      list.innerHTML = hits.map(function (h) {
        return '<li class="search__result"><a href="' + h.url + '"><span class="search__type">' + h.type + '</span>' +
          '<span class="search__title">' + highlight(h.title, words) + '</span>' +
          '<span class="search__sub">' + highlight(h.sub, words) + '</span></a></li>';
      }).join('');
    }

    function openSearch() { dialog.showModal(); input.focus(); render(); }
    function closeSearch() { dialog.close(); }

    openBtn.addEventListener('click', openSearch);
    input.addEventListener('input', render);
    dialog.querySelector('.search__close').addEventListener('click', closeSearch);
    // Clicking the dark backdrop (outside the box) closes search
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeSearch(); });
    // Suggested searches
    dialog.querySelectorAll('[data-query]').forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.getAttribute('data-query'); render(); input.focus(); });
    });
    // Choosing a result that links to this same page should close the dialog
    list.addEventListener('click', function (e) { if (e.target.closest('a')) closeSearch(); });
    // Press "/" anywhere to search (like many big sites)
    document.addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing && !dialog.open) { e.preventDefault(); openSearch(); }
    });
  }

  /* -----------------------------------------------------------
     3. Smooth scrolling + scroll animations
     Lenis smooths the wheel; GSAP ScrollTrigger runs animations
     tied to scroll position. Both are skipped for reduced motion.
     ----------------------------------------------------------- */
  var hasGsap = window.gsap && window.ScrollTrigger;
  if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

  if (!reduceMotion && window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.1, anchors: { offset: -80 } });
    window.marlowbyLenis = lenis;
    if (hasGsap) {
      // Let GSAP drive Lenis so scroll animations stay perfectly in sync
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }

  if (hasGsap && !reduceMotion) {
    var gsap = window.gsap;

    // [data-reveal]: rise gently into place when scrolled into view.
    // Children marked [data-reveal-item] follow one after another.
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      var items = el.querySelectorAll('[data-reveal-item]');
      gsap.from(items.length ? items : el, {
        y: 48, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });

    // [data-deal]: postcards fly in from a fanned stack, tied to scroll
    gsap.utils.toArray('[data-deal]').forEach(function (group) {
      var cards = group.querySelectorAll('.postcard');
      gsap.fromTo(cards,
        { y: 160, rotation: function (i) { return (i % 2 ? 1 : -1) * (6 + (i % 3) * 4); }, x: function (i) { return window.innerWidth < 768 ? 0 : (i - (cards.length - 1) / 2) * -40; } },
        { y: 0, rotation: 0, x: 0, ease: 'none', stagger: 0.05,
          scrollTrigger: { trigger: group, start: 'top 95%', end: 'top 40%', scrub: 0.8 } });
    });

    // [data-draw]: SVG paths draw themselves as you scroll (the route lines)
    gsap.utils.toArray('[data-draw]').forEach(function (path) {
      var len = path.getTotalLength();
      gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: path.closest('section') || path, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 }
      });
    });

    // [data-parallax="0.2"]: drifts slower or faster than the page
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var depth = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      gsap.to(el, { yPercent: -100 * depth, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* -----------------------------------------------------------
     4. Magnetic buttons
     The button drifts toward the cursor; its label drifts a little
     further, which makes it feel springy and three-dimensional.
     ----------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      var label = btn.querySelector('.btn__label');
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + dx * 0.25 + 'px,' + dy * 0.35 + 'px)';
        if (label) label.style.transform = 'translate(' + dx * 0.12 + 'px,' + dy * 0.15 + 'px)';
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.transform = '';
        if (label) label.style.transform = '';
      });
    });
  }

  /* -----------------------------------------------------------
     5. 3D tilt cards
     Writes the pointer position (-1 to 1) into CSS variables.
     The CSS turns those into rotateX/rotateY, a moving glare,
     and layers that shift at different depths.
     ----------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.classList.add('is-tilting');
        card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--mx', '0');
        card.style.setProperty('--my', '0');
      });
    });
  }

  /* -----------------------------------------------------------
     6. Lazy-load the 3D hero
     The 3D scene (Three.js) is the heaviest file on the site, so
     the page never waits for it. The visitor sees the SVG box at
     once; the 3D file loads after their first scroll, mouse move,
     or tap (or after 4 seconds), then fades in over the SVG.
     Skipped entirely without WebGL, with reduced motion, or when
     the visitor has turned on a data-saver setting.
     ----------------------------------------------------------- */
  var hero = document.querySelector('[data-hero]');
  var saveData = navigator.connection && navigator.connection.saveData;
  if (hero && root.classList.contains('webgl') && !reduceMotion && !saveData) {
    var loaded = false;
    var events = ['pointermove', 'scroll', 'wheel', 'touchstart', 'keydown'];
    var load = function () {
      if (loaded) return;
      loaded = true;
      events.forEach(function (ev) { window.removeEventListener(ev, load); });
      var s = document.createElement('script');
      s.src = 'js/hero-box.min.js';
      s.async = true;
      document.body.appendChild(s);
    };
    events.forEach(function (ev) { window.addEventListener(ev, load, { passive: true, once: true }); });
    window.setTimeout(load, 4000);
  }
})();
