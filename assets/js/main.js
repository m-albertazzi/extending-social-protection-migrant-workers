/* Course Hub – behaviour: section routing, mobile menu, data-driven timetable,
   resource persons, participants and feedback. Content lives in data.js. */
(function () {
  'use strict';

  var DATA = window.HUB_DATA || { config: {}, weeks: [], sessions: [], people: [], participants: [] };
  var ROUTES = ['overview', 'course-requirements', 'timetable', 'resource-persons', 'participants', 'feedback'];
  var LABELS = {
    'overview': 'Overview', 'course-requirements': 'Course requirements', 'timetable': 'Timetable',
    'resource-persons': 'Resource Persons', 'participants': 'Participants', 'feedback': 'Feedback'
  };
  var SITE = 'Course Hub · Extending Social Protection to Migrant Workers, Refugees and their Families';

  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var ICON = {
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    video: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3z"/></svg>',
    person: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 21c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.3c2 .7 3.5 2.6 3.5 5.7"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5h16v11H9l-5 4z"/></svg>'
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function tbc(text) { return String(text).replace(/\(TBC\)/g, '(to be confirmed)'); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : null; }

  /* ---------------- Toast ---------------- */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4200);
  }

  /* ---------------- Dates ---------------- */
  function parseDay(iso) {
    var p = iso.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function offsetMinutes(isoWithOffset) {
    var m = /([+-])(\d\d):(\d\d)$/.exec(isoWithOffset);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  }
  function localTimeLine(s) {
    var start = new Date(s.start), end = new Date(s.end);
    if (isNaN(start) || isNaN(end)) return '';
    if (-start.getTimezoneOffset() === offsetMinutes(s.start)) return '';
    try {
      var d = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
      var t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' });
      return 'Your local time: ' + d.format(start) + ' – ' + t.format(end);
    } catch (e) { return ''; }
  }

  /* ---------------- Timetable ---------------- */
  function sessionStatus(s, now) {
    var st = new Date(s.start).getTime(), en = new Date(s.end).getTime();
    if (now > en) return 'past';
    if (now >= st) return 'live';
    return 'upcoming';
  }

  function zoomAction(s) {
    var url = safeUrl(s.zoomUrl);
    if (url) {
      return '<a class="btn btn--primary" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + ICON.video +
        '<span>Join on Zoom<span class="sr-only"> – Session ' + s.number + '</span></span></a>';
    }
    return '<button type="button" class="btn btn--primary" data-zoom-placeholder="' + s.number + '">' + ICON.video +
      '<span>Join on Zoom<span class="sr-only"> – Session ' + s.number + ' (link not yet added)</span></span></button>' +
      '<small>Zoom link to be added</small>';
  }

  function sessionCard(s, status, isNext) {
    var d = parseDay(s.date);
    var mods = (s.modules || []).map(function (m) { return '<span class="tag tag--module">Module ' + m + '</span>'; }).join('');
    var badge = '';
    if (status === 'live') badge = '<span class="tag tag--next">Happening now</span>';
    else if (status === 'past') badge = '<span class="tag tag--past">Completed</span>';
    else if (isNext) badge = '<span class="tag tag--next">Next session</span>';
    var local = localTimeLine(s);
    var objectives = (s.objectives || []).map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('');
    return '<li class="card session' + (isNext || status === 'live' ? ' is-next' : '') + (status === 'past' ? ' is-past' : '') + '" id="' + esc(s.id) + '">' +
      '<div class="datebadge" aria-hidden="true"><span class="datebadge__dow">' + DOW[d.getUTCDay()] + '</span><span class="datebadge__day">' + d.getUTCDate() + '</span><span class="datebadge__mon">' + MON[d.getUTCMonth()] + '</span></div>' +
      '<div class="session__main">' +
        '<div class="session__kicker"><span class="tag">Session ' + s.number + '</span>' + mods + badge + '</div>' +
        '<h3 class="session__title">' + esc(s.title) + '</h3>' +
        '<div class="session__time">' +
          '<span>' + ICON.cal + DOW_LONG[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON_LONG[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + '</span>' +
          '<span>' + ICON.clock + esc(s.timeLabel) + '</span>' +
          (local ? '<span class="session__local">' + esc(local) + '</span>' : '') +
        '</div>' +
        '<p class="session__summary">' + esc(s.summary) + '</p>' +
        '<details class="session__more"><summary>Full abstract, speakers and learning objectives</summary>' +
          '<div class="session__detail">' +
            '<h4>Speakers (as listed in the agenda)</h4><p>' + esc(tbc(s.speakers)) + '</p>' +
            '<h4>Abstract</h4><p>' + esc(s.abstract) + '</p>' +
            '<h4>Learning objectives: by the end of the session, participants will be able to</h4><ul>' + objectives + '</ul>' +
          '</div></details>' +
      '</div>' +
      '<div class="session__action">' + zoomAction(s) + '</div>' +
    '</li>';
  }

  function renderTimetable() {
    var root = $('#timetable-root'), nav = $('#weeknav');
    if (!root) return;
    var now = Date.now();
    var sessions = DATA.sessions.slice().sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    var nextId = null;
    sessions.forEach(function (s) { if (!nextId && sessionStatus(s, now) === 'upcoming') nextId = s.id; });

    var html = '', chips = '';
    DATA.weeks.forEach(function (w) {
      var list = sessions.filter(function (s) { return s.week === w.number; });
      if (!list.length) return;
      chips += '<button type="button" data-week="' + w.number + '">Week ' + w.number + '</button>';
      html += '<section class="week" id="week-' + w.number + '" aria-labelledby="week-' + w.number + '-h">' +
        '<div class="week__head"><span class="week__num">Week ' + w.number + '</span>' +
        '<h2 class="week__title" id="week-' + w.number + '-h">' + esc(w.title) + '</h2>' +
        '<span class="week__dates">' + esc(w.dates) + '</span></div>' +
        '<ul class="sessions">' +
        list.map(function (s) { return sessionCard(s, sessionStatus(s, now), s.id === nextId); }).join('') +
        '</ul></section>';
    });
    root.innerHTML = html;
    nav.innerHTML = chips;

    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-week]');
      if (!b) return;
      var target = document.getElementById('week-' + b.getAttribute('data-week'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-zoom-placeholder]');
      if (b) toast('The Zoom link for Session ' + b.getAttribute('data-zoom-placeholder') + ' has not been added yet.');
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var n = en.target.id.replace('week-', '');
            $$('button[data-week]', nav).forEach(function (b) {
              if (b.getAttribute('data-week') === n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
            });
          }
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      $$('.week', root).forEach(function (w) { io.observe(w); });
    }
  }

  /* ---------------- Resource persons ---------------- */
  function personFlag(p) {
    if (p.partial && p.tbc) return 'Name to be confirmed';
    if (p.partial) return 'Full name to be confirmed';
    if (p.tbc) return 'To be confirmed';
    return '';
  }
  function renderPeople() {
    var root = $('#people-root'), filters = $('#rp-filters'), note = $('#rp-note');
    if (!root) return;
    var people = DATA.people.slice().sort(function (a, b) { return String(a.sortKey || a.name).localeCompare(String(b.sortKey || b.name)); });
    var orgs = [];
    people.forEach(function (p) { if (p.org && orgs.indexOf(p.org) < 0) orgs.push(p.org); });
    orgs.sort();

    function draw(org) {
      root.innerHTML = people.filter(function (p) { return !org || p.org === org; }).map(function (p) {
        var photo = safeUrl(p.photo) || (p.photo && !/^[a-z]+:/i.test(p.photo) ? p.photo : null);
        var flag = personFlag(p);
        return '<li class="card person">' +
          '<div class="person__photo">' + (photo ? '<img src="' + esc(photo) + '" alt="Photo of ' + esc(p.name) + '" loading="lazy">' : ICON.person) + '</div>' +
          '<h2 class="person__name">' + esc(p.name) + '</h2>' +
          (p.role ? '<p class="person__role">' + esc(p.role) + '</p>' : '') +
          (p.org ? '<p class="person__org">' + esc(p.org) + (p.unit ? ' · ' + esc(p.unit) : '') + '</p>' : '') +
          (flag ? '<p class="person__flag"><span class="tag tag--past">' + esc(flag) + '</span></p>' : '') +
        '</li>';
      }).join('');
    }
    filters.innerHTML = '<button type="button" aria-pressed="true" data-org="">All (' + people.length + ')</button>' +
      orgs.map(function (o) { return '<button type="button" aria-pressed="false" data-org="' + esc(o) + '">' + esc(o) + '</button>'; }).join('');
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-org]');
      if (!b) return;
      $$('button', filters).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      draw(b.getAttribute('data-org'));
    });
    draw('');
    note.textContent = 'Names and organisations are shown as listed in the course agenda. Entries marked “to be confirmed” may change. The ITCILO course team and a STREAM consultant (to be confirmed) also contribute to the live sessions.';
  }

  /* ---------------- Participants & feedback ---------------- */
  function renderParticipants() {
    var root = $('#participants-root');
    if (!root) return;
    var list = DATA.participants || [];
    if (!list.length) {
      root.innerHTML = '<div class="empty"><div class="empty__icon">' + ICON.users + '</div>' +
        '<h3>Participant directory coming soon</h3>' +
        '<p>The list of participants for this cohort has not been added yet. It will appear here once it is available.</p></div>';
      return;
    }
    root.innerHTML = '<ul class="pdir">' + list.map(function (p) {
      var line = [p.organisation, p.country].filter(Boolean).join(' · ');
      return '<li class="card pdir__item"><strong>' + esc(p.name) + '</strong>' + (line ? '<span>' + esc(line) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function renderFeedback() {
    var root = $('#feedback-root');
    if (!root) return;
    var url = safeUrl(DATA.config && DATA.config.feedbackUrl);
    var body = '<div><h2>Course feedback form</h2><p>' +
      (url ? 'Use the button to open the feedback form.' : 'The feedback form link has not been added yet. It will be available here.') + '</p></div>';
    if (url) {
      root.innerHTML = body + '<a class="btn btn--primary" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + ICON.chat + '<span>Open the feedback form</span></a>';
    } else {
      root.innerHTML = body + '<div><button type="button" class="btn btn--primary" id="feedback-placeholder">' + ICON.chat + '<span>Open the feedback form</span></button></div>';
      $('#feedback-placeholder').addEventListener('click', function () { toast('The feedback form link has not been added yet.'); });
    }
  }

  /* ---------------- Routing ---------------- */
  var views = $$('.view');
  var navLinks = $$('.nav__link');
  var pager = $('#pager');
  var firstRender = true;

  function routeFromHash() {
    var h = '';
    try { h = decodeURIComponent(location.hash.replace(/^#/, '')).toLowerCase(); } catch (e) { h = ''; }
    return ROUTES.indexOf(h) >= 0 ? h : 'overview';
  }
  function renderPager(route) {
    var i = ROUTES.indexOf(route), out = '';
    if (i > 0) out += '<a class="pager__prev" href="#' + ROUTES[i - 1] + '" data-route="' + ROUTES[i - 1] + '"><small>Previous</small><span>← ' + LABELS[ROUTES[i - 1]] + '</span></a>';
    if (i < ROUTES.length - 1) out += '<a class="pager__next" href="#' + ROUTES[i + 1] + '" data-route="' + ROUTES[i + 1] + '"><small>Next</small><span>' + LABELS[ROUTES[i + 1]] + ' →</span></a>';
    pager.innerHTML = out;
  }
  function show(route) {
    views.forEach(function (v) { v.hidden = v.id !== route; });
    toastEl.hidden = true;
    navLinks.forEach(function (a) {
      if (a.getAttribute('data-route') === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = (route === 'overview' ? '' : LABELS[route] + ' · ') + SITE;
    renderPager(route);
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (!firstRender) {
      var h = $('#' + route + ' h1');
      if (h) h.focus({ preventScroll: true });
    }
    firstRender = false;
    closeMenu(true);
  }
  window.addEventListener('hashchange', function () { show(routeFromHash()); });

  /* ---------------- Mobile menu ---------------- */
  var sidebar = $('#sidebar'), scrim = $('#scrim'), toggle = $('#menu-toggle'), closeBtn = $('#menu-close');
  var mq = window.matchMedia('(max-width: 1023px)');
  function openMenu() {
    sidebar.classList.add('is-open');
    scrim.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    setTimeout(function () { var a = $('.nav__link[aria-current="page"]', sidebar) || $('.nav__link', sidebar); if (a) a.focus(); }, 30);
  }
  function closeMenu(silent) {
    var wasOpen = sidebar.classList.contains('is-open');
    sidebar.classList.remove('is-open');
    scrim.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (wasOpen && !silent) toggle.focus();
  }
  toggle.addEventListener('click', function () { sidebar.classList.contains('is-open') ? closeMenu() : openMenu(); });
  closeBtn.addEventListener('click', function () { closeMenu(); });
  scrim.addEventListener('click', function () { closeMenu(); });
  document.addEventListener('keydown', function (e) {
    if (!sidebar.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key === 'Tab') {
      var f = $$('a[href], button', sidebar).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var onMq = function () { if (!mq.matches) closeMenu(true); };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);

  // Same-page route links: make sure clicking the current section's link still scrolls to top.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-route]');
    if (!a) return;
    if (a.getAttribute('data-route') === routeFromHash()) { window.scrollTo({ top: 0, behavior: 'auto' }); closeMenu(true); }
  });

  /* ---------------- Init ---------------- */
  renderTimetable();
  renderPeople();
  renderParticipants();
  renderFeedback();
  show(routeFromHash());
  // Loading with a #hash makes the browser jump to the section, under the fixed banner: reset to the top.
  window.addEventListener('load', function () { if (location.hash) window.scrollTo({ top: 0, behavior: 'auto' }); });
})();
