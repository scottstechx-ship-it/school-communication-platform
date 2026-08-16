/**
 * PARENT DASHBOARD — Simplified, mobile-first
 */
(function () {
  const API = window.API;
  const UI = window.UI;

  const user = API.getUser();
  if (!API.getToken() || !user || user.role !== 'parent') { location.href = '/platform/login-parent.html'; return; }

  let layout;
  let children = [];
  let activeChildId = Number(localStorage.getItem('scp_child_id')) || null;

  function currentChild() {
    return children.find((c) => c.id === activeChildId) || children[0] || null;
  }

  const nav = [
    { key: 'home', label: 'Home', icon: '🏠', section: 'Main' },
    { key: 'messages', label: 'Messages', icon: '💬', section: 'Main' },
    { key: 'documents', label: 'Documents', icon: '📄', section: 'Main' },
    { key: 'announcements', label: 'Announcements', icon: '📢', section: 'Main' },
    { key: 'children', label: 'My Children', icon: '👨‍👧‍👦', section: 'Family' },
    { key: 'notifications', label: 'Notifications', icon: '🔔', section: 'Account' },
    { key: 'profile', label: 'Profile', icon: '👤', section: 'Account' },
  ];
  const bottomNav = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'documents', label: 'Documents', icon: '📄' },
    { key: 'children', label: 'Children', icon: '👨‍👧‍👦' },
  ];

  UI.initLayout({ nav, bottomNav, title: 'Parent Dashboard', onNav: (k) => show(k) }).then(async (l) => {
    layout = l;
    window.__setNavBadge = (k, n) => l.setBadge(k, n);
    window.__navHandler = (k) => show(k);
    await loadChildren();
    window.Realtime.start();
    show('home');
  });

  async function loadChildren() {
    try {
      children = (await API.get('/api/parents/children')).children || [];
    } catch (e) { UI.toast(e.message, 'error'); }
    if (!activeChildId && children.length) activeChildId = children[0].id;
    if (!children.some((c) => c.id === activeChildId) && children.length) activeChildId = children[0].id;
    localStorage.setItem('scp_child_id', activeChildId || '');
  }

  async function show(key) {
    layout.setActive(key);
    const titles = { home: 'Home', messages: 'Messages', documents: 'Documents', announcements: 'Announcements', children: 'My Children', notifications: 'Notifications', profile: 'Profile' };
    layout.setTitle(titles[key] || 'Dashboard');
    const content = layout.content;

    if (key === 'home') return renderHome(content);
    if (key === 'messages') return renderMessages(content);
    if (key === 'documents') return renderDocuments(content);
    if (key === 'announcements') return renderAnnouncements(content);
    if (key === 'children') return renderChildren(content);
    if (key === 'notifications') return renderNotifications(content);
    if (key === 'profile') return renderProfile(content);
  }

  function childSelectorHtml(current) {
    if (!children.length) return '';
    return `<div class="card" style="background:var(--primary-light)">
      <div class="stat-label" style="font-weight:700;margin-bottom:8px">SELECT CHILD</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${children.map((c) => `<button class="chip ${c.id === (current || {}).id ? 'active' : ''}" data-child="${c.id}">
          ${UI.esc(c.full_name)} <small>· ${UI.esc(c.class_name || '')} ${UI.esc(c.stream || '')}</small></button>`).join('')}
      </div></div>`;
  }

  function bindChildChips(root) {
    root.querySelectorAll('[data-child]').forEach((b) => b.addEventListener('click', () => {
      activeChildId = Number(b.dataset.child);
      localStorage.setItem('scp_child_id', activeChildId);
      show(activeViewName());
    }));
  }

  let activeViewName = () => 'home';

  // ---------- HOME ----------
  async function renderHome(content) {
    activeViewName = () => 'home';
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    const child = currentChild();
    let stats;
    try { stats = await API.get('/api/stats/overview'); } catch (e) { UI.toast(e.message, 'error'); }
    if (!child) {
      box.innerHTML = `<div class="card" style="text-align:center;padding:40px"><h3>👨‍👧‍👦 No children linked</h3><p>Please contact school administration to link your children.</p></div>`;
      return;
    }
    const c = stats.counts || {};
    box.innerHTML = childSelectorHtml(child) + `
      <div class="card" style="margin-top:16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none">
        <h2 style="color:#fff;margin-bottom:2px">Welcome, ${UI.esc(user.fullName.split(' ')[0])}! 👨‍👧‍👦</h2>
        <div style="opacity:.9">Tracking ${UI.esc(child.full_name)} — ${UI.esc(child.class_name || '')} ${UI.esc(child.stream || '')}</div>
      </div>
      <div class="grid grid-4" style="margin-top:16px">
        ${stat('📊', c.assignments || 0, 'Assignments', 'ic-green')}
        ${stat('📋', c.exams || 0, 'Exams', 'ic-blue')}
        ${stat('💬', c.unreadMessages || 0, 'Unread messages', 'ic-red')}
        ${stat('📄', c.documents || 0, 'Documents', 'ic-amber')}
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card"><h3>📢 Latest announcements</h3><div id="home-ann"></div></div>
        <div class="card"><h3>📅 Upcoming events</h3><div id="home-events"></div></div>
      </div>`;

    // Load announcements
    try {
      const data = await API.get('/api/announcements');
      const items = (data.announcements || []).slice(0, 3);
      const annBox = box.querySelector('#home-ann');
      if (!items.length) { annBox.innerHTML = '<div class="doc-meta">No announcements.</div>'; }
      else { annBox.innerHTML = items.map(a => `<div class="child-card" style="margin-bottom:8px"><div class="doc-name">${UI.esc(a.title)}</div><div class="doc-meta">${UI.esc(a.created_at || '')}</div></div>`).join(''); }
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  function stat(icon, value, label, cls) {
    return `<div class="card"><div class="stat-icon ${cls}">${icon}</div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
  }

  // ---------- CHILDREN ----------
  async function renderChildren(content) {
    activeViewName = () => 'children';
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    if (!children.length) {
      box.innerHTML = `<div class="card" style="text-align:center;padding:40px"><h3>👨‍👧‍👦 No children linked</h3><p>Please contact school administration to link your children.</p></div>`;
      return;
    }
    box.innerHTML = childSelectorHtml(currentChild()) + `
      <div class="card" style="margin-top:16px">
        <h3>My Children</h3>
        <div class="table-responsive"><table class="table"><thead><tr><th>Child</th><th>Class</th><th>Stream</th></tr></thead><tbody>`
        + children.map(c => `<tr><td><strong>${UI.esc(c.full_name)}</strong></td><td>${UI.esc(c.class_name || '—')}</td><td>${UI.esc(c.stream || '—')}</td></tr>`).join('')
        + `</tbody></table></div></div>`;
    bindChildChips(box);
  }

  // ---------- DOCUMENTS ----------
  async function renderDocuments(content) {
    content.innerHTML = `<div class="view active"><div class="card table-responsive"><div id="doc-list"></div></div></div>`;
    const box = content.querySelector('#doc-list');
    try {
      const data = await API.get('/api/documents');
      const items = data.documents || [];
      if (!items.length) { box.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">📄</div>No documents.</div>'; return; }
      box.innerHTML = `<table class="table"><thead><tr><th>Title</th><th>Type</th><th>Date</th></tr></thead><tbody>` + items.map(d => `<tr><td>${UI.esc(d.title)}</td><td>${UI.esc(d.type)}</td><td>${UI.esc(d.created_at || '')}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  // ---------- ANNOUNCEMENTS ----------
  async function renderAnnouncements(content) {
    content.innerHTML = `<div class="view active"><div class="card table-responsive"><div id="a-list"></div></div></div>`;
    const box = content.querySelector('#a-list');
    try {
      const data = await API.get('/api/announcements');
      const items = data.announcements || [];
      if (!items.length) { box.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">📢</div>No announcements.</div>'; return; }
      box.innerHTML = `<table class="table"><thead><tr><th>Title</th><th>For</th><th>Date</th></tr></thead><tbody>` + items.map(a => `<tr><td>${UI.esc(a.title)}</td><td>${UI.esc(a.target_roles || 'All')}</td><td>${UI.esc(a.created_at || '')}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  // ---------- NOTIFICATIONS ----------
  async function renderNotifications(content) {
    content.innerHTML = `<div class="view active"><div class="card table-responsive"><div id="n-list"></div></div></div>`;
    const box = content.querySelector('#n-list');
    try {
      const data = await API.get('/api/notifications');
      const notes = data.notifications || [];
      if (!notes.length) { box.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">🔔</div>No notifications.</div>'; return; }
      box.innerHTML = `<table class="table"><thead><tr><th>Title</th><th>Type</th><th>Time</th><th>Read</th></tr></thead><tbody>` + notes.map(n => `<tr><td>${UI.esc(n.title)}</td><td>${UI.esc(n.type)}</td><td>${UI.esc(n.created_at || '')}</td><td>${n.read ? '✅' : '🔘'}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  // ---------- PROFILE ----------
  async function renderProfile(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card">
        <h3>Profile</h3>
        <div class="form-row" style="margin-top:16px">
          <label class="field">Full name<input id="pf-name" value="${UI.esc(user.fullName)}"></label>
          <label class="field">Email<input id="pf-email" type="email" value="${UI.esc(user.email || '')}"></label>
        </div>
        <div class="form-row">
          <label class="field">Phone<input id="pf-phone" value="${UI.esc(user.phone || '')}"></label>
        </div>
        <button class="btn" id="pf-save" style="margin-top:16px">Save profile</button>
      </div>`;
    box.querySelector('#pf-save').onclick = async () => {
      try {
        await API.put('/api/users/profile', {
          fullName: box.querySelector('#pf-name').value.trim(),
          email: box.querySelector('#pf-email').value.trim(),
          phone: box.querySelector('#pf-phone').value.trim(),
        });
        UI.toast('Profile updated.', 'success');
        layout.updateUser({ fullName: box.querySelector('#pf-name').value.trim() });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  // ---------- MESSAGES ----------
  async function renderMessages(content) {
    content.innerHTML = `<div class="view active"><div class="card" style="text-align:center;padding:40px"><h3>💬 Messages</h3><p>Click the messages icon in the sidebar to open the communication center.</p></div></div>`;
  }

})();