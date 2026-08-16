/**
 * TEACHER DASHBOARD — Simplified
 */
(function () {
  const API = window.API;
  const UI = window.UI;

  const user = API.getUser();
  if (!API.getToken() || !user || user.role !== 'teacher') { location.href = '/platform/login-teacher.html'; return; }

  let layout;

  const nav = [
    { key: 'home', label: 'Home', icon: '🏠', section: 'Main' },
    { key: 'messages', label: 'Messages', icon: '💬', section: 'Main' },
    { key: 'documents', label: 'Documents', icon: '📄', section: 'Main' },
    { key: 'announcements', label: 'Announcements', icon: '📢', section: 'Main' },
    { key: 'classes', label: 'My Classes', icon: '🏫', section: 'Teaching' },
    { key: 'students', label: 'Students', icon: '🧑‍🎓', section: 'Teaching' },
    { key: 'notifications', label: 'Notifications', icon: '🔔', section: 'Account' },
    { key: 'profile', label: 'Profile', icon: '👤', section: 'Account' },
  ];
  const bottomNav = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'documents', label: 'Documents', icon: '📄' },
    { key: 'classes', label: 'Classes', icon: '🏫' },
  ];

  UI.initLayout({ nav, bottomNav, title: 'Teacher Dashboard', onNav: (k) => show(k) }).then((l) => {
    layout = l;
    window.__setNavBadge = (k, n) => l.setBadge(k, n);
    window.__navHandler = (k) => show(k);
    window.Realtime.start();
    show('home');
  });

  async function show(key) {
    layout.setActive(key);
    const titles = { home: 'Home', messages: 'Messages', documents: 'Documents', announcements: 'Announcements', classes: 'My Classes', students: 'Students', notifications: 'Notifications', profile: 'Profile' };
    layout.setTitle(titles[key] || 'Dashboard');
    const content = layout.content;

    if (key === 'home') return renderHome(content);
    if (key === 'messages') return renderMessages(content);
    if (key === 'documents') return renderDocuments(content);
    if (key === 'announcements') return renderAnnouncements(content);
    if (key === 'classes') return renderClasses(content);
    if (key === 'students') return renderStudents(content);
    if (key === 'notifications') return renderNotifications(content);
    if (key === 'profile') return renderProfile(content);
  }

  function stat(icon, value, label, cls) {
    return `<div class="card"><div class="stat-icon ${cls}">${icon}</div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
  }

  function statusBadge(status) { const map = { active: 'green', inactive: 'red', pending: 'amber' }; const color = map[status] || 'gray'; return `<span class="badge ${color}">${UI.esc(status)}</span>`; }

  // ---------- HOME ----------
  async function renderHome(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    let stats;
    try { stats = await API.get('/api/stats/overview'); } catch (e) { UI.toast(e.message, 'error'); return; }
    const c = stats.counts || {};
    box.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;border:none">
        <h2 style="color:#fff;margin-bottom:2px">Hello, ${UI.esc(user.fullName.split(' ')[0])}! 👩‍🏫</h2>
        <div style="opacity:.92">Welcome back to your teaching dashboard.</div>
      </div>
      <div class="grid grid-4" style="margin-top:16px">
        ${stat('🏫', c.classes || 0, 'My classes', 'ic-purple')}
        ${stat('🧑‍🎓', c.students || 0, 'Students', 'ic-blue')}
        ${stat('💬', c.unreadMessages || 0, 'Unread messages', 'ic-green')}
        ${stat('📄', c.documents || 0, 'My documents', 'ic-amber')}
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card"><h3>🏫 My classes</h3><div id="home-classes"></div></div>
        <div class="card"><h3>📢 Latest announcements</h3><div id="home-ann"></div></div>
      </div>`;

    const clsBox = box.querySelector('#home-classes');
    for (const cl of (stats.classes || [])) {
      clsBox.appendChild(UI.el(`<div class="child-card" data-goto="classes" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar">🏫</div>
          <div style="flex:1"><div class="doc-name">${UI.esc(cl.name)} ${UI.esc(cl.stream || '')}</div>
          <div class="doc-meta">${cl.student_count || 0} students${cl.unread ? ' · 💬 ' + cl.unread + ' unread' : ''}</div></div>
        </div></div>`));
    }
    if (!(stats.classes || []).length) clsBox.innerHTML = '<div class="doc-meta">You have no classes assigned yet.</div>';
    clsBox.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => show('classes')));
  }

  // ---------- CLASSES ----------
  async function renderClasses(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card table-responsive"><div id="cl-list"></div></div>`;
    try {
      const data = await API.get('/api/teachers/classes');
      const classes = data.classes || [];
      if (!classes.length) { box.querySelector('#cl-list').innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">🏫</div>No classes assigned.</div>'; return; }
      box.querySelector('#cl-list').innerHTML = `<table class="table"><thead><tr><th>Class</th><th>Stream</th><th>Year</th><th>Students</th><th>Subjects</th></tr></thead><tbody>` + classes.map(c => `<tr><td>${UI.esc(c.name)}</td><td>${UI.esc(c.stream)}</td><td>${UI.esc(c.academic_year)}</td><td>${c.student_count || 0}</td><td>${(c.subjects || []).join(', ') || '—'}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  // ---------- STUDENTS ----------
  async function renderStudents(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="search-input" style="flex:1;min-width:180px"><input id="s-search" placeholder="Search students…"></div>
      </div>
      <div class="card table-responsive"><div id="s-list"></div></div>`;

    const loadStudents = async () => {
      const q = box.querySelector('#s-search').value.trim();
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      try {
        const data = await API.get('/api/students?' + params.toString());
        const list = box.querySelector('#s-list');
        const students = data.students || [];
        if (!students.length) { list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">🧑‍🎓</div>No students found.</div>'; return; }
        list.innerHTML = `<table class="table"><thead><tr><th>Student</th><th>Number</th><th>Class</th><th>Status</th></tr></thead><tbody></tbody></table>`;
        const tbody = list.querySelector('tbody');
        students.forEach((s) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td data-label="Student"><strong>${UI.esc(s.full_name)}</strong></td>
            <td data-label="Number">${UI.esc(s.student_code)}</td>
            <td data-label="Class">${UI.esc(s.class_name || '—')} ${UI.esc(s.class_stream || '')}</td>
            <td data-label="Status">${statusBadge(s.status)}</td>`;
          tbody.appendChild(tr);
        });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
    box.querySelector('#s-search').oninput = () => loadStudents();
    await loadStudents();
  }

  function statusBadge(status) { const map = { active: 'green', inactive: 'red', pending: 'amber' }; const color = map[status] || 'gray'; return `<span class="badge ${color}">${UI.esc(status)}</span>`; }

  // ---------- DOCUMENTS ----------
  async function renderDocuments(content) {
    content.innerHTML = `<div class="view active"><div class="card" style="text-align:center;padding:40px"><h3>📄 Documents</h3><p>Document management coming soon.</p></div></div>`;
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