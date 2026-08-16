/**
 * SUPER ADMIN DASHBOARD — Simplified with working delete functionality
 */
(function () {
  const API = window.API;
  const UI = window.UI;

  const user = API.getUser();
  if (!API.getToken() || !user || user.role !== 'super_admin') { location.href = '/platform/login-super-admin.html'; return; }

  let layout;
  let ref = { classes: [], teachers: [], students: [], parents: [] };

  const nav = [
    { key: 'home', label: 'Overview', icon: '🏠', section: 'Main' },
    { key: 'messages', label: 'Messages', icon: '💬', section: 'Main' },
    { key: 'users', label: 'Users', icon: '👥', section: 'Management' },
    { key: 'students', label: 'Students', icon: '🧑‍🎓', section: 'Management' },
    { key: 'teachers', label: 'Teachers', icon: '👩‍🏫', section: 'Management' },
    { key: 'parents', label: 'Parents', icon: '👨‍👧‍👦', section: 'Management' },
    { key: 'classes', label: 'Classes', icon: '🏫', section: 'Management' },
    { key: 'settings', label: 'School Settings', icon: '⚙️', section: 'System' },
    { key: 'notifications', label: 'Notifications', icon: '🔔', section: 'Account' },
    { key: 'profile', label: 'Profile', icon: '👤', section: 'Account' },
  ];
  const bottomNav = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  UI.initLayout({ nav, bottomNav, title: 'Super Admin', onNav: (k) => show(k) }).then(async (l) => {
    layout = l;
    window.__setNavBadge = (k, n) => l.setBadge(k, n);
    window.__navHandler = (k) => show(k);
    try { ref = await API.get('/api/settings/classes-reference'); } catch {}
    window.Realtime.start();
    show('home');
  });

  async function show(key) {
    layout.setActive(key);
    const titles = {
      home: 'Overview', messages: 'Messages', users: 'User Management',
      students: 'Students', teachers: 'Teachers', parents: 'Parents',
      classes: 'Classes', settings: 'School Settings',
      notifications: 'Notifications', profile: 'Profile'
    };
    layout.setTitle(titles[key] || 'Dashboard');
    const content = layout.content;

    if (key === 'home') return renderHome(content);
    if (key === 'messages') return renderMessages(content);
    if (key === 'users') return renderUsers(content);
    if (key === 'students') return renderStudents(content);
    if (key === 'teachers') return renderTeachers(content);
    if (key === 'parents') return renderParents(content);
    if (key === 'classes') return renderClasses(content);
    if (key === 'settings') return renderSettings(content);
    if (key === 'notifications') return renderNotifications(content);
    if (key === 'profile') return renderProfile(content);
  }

  // ---------- HOME ----------
  async function renderHome(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    let stats;
    try { stats = await API.get('/api/stats/overview'); } catch (e) { UI.toast(e.message, 'error'); return; }
    const c = stats.counts || {};
    box.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#1e1b4b,#4f46e5);color:#fff;border:none">
        <h2 style="color:#fff;margin-bottom:2px">Platform overview, ${UI.esc(user.fullName.split(' ')[0])} 🛡️</h2>
        <div style="opacity:.9">Super admin control centre.</div>
      </div>
      <div class="grid grid-4" style="margin-top:16px">
        ${stat('🧑‍🎓', c.students || 0, 'Students', 'ic-blue')}
        ${stat('👩‍🏫', c.teachers || 0, 'Teachers', 'ic-purple')}
        ${stat('👨‍💼', c.admins || 0, 'Admins', 'ic-amber')}
        ${stat('👨‍👧‍👦', c.parents || 0, 'Parents', 'ic-green')}
        ${stat('👥', c.activeUsers || 0, 'Active users', 'ic-red')}
        ${stat('🏫', c.classes || 0, 'Classes', 'ic-blue')}
        ${stat('📝', c.assignments || 0, 'Assignments', 'ic-green')}
        ${stat('📋', c.exams || 0, 'Exams', 'ic-purple')}
      </div>`;
  }

  function stat(icon, value, label, cls) {
    return `<div class="card"><div class="stat-icon ${cls}">${icon}</div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
  }

  // ---------- USERS ----------
  async function renderUsers(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="search-input" style="flex:1;min-width:180px"><input id="u-search" placeholder="Search users…"></div>
        <select id="u-role" style="min-width:140px"><option value="">All roles</option><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option><option value="parent">Parent</option></select>
        <select id="u-status" style="min-width:140px"><option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option></select>
        <button class="btn" id="u-add">＋ Add user</button>
      </div>
      <div class="card table-responsive"><div id="u-list"></div></div>`;

    box.querySelector('#u-add').onclick = () => userModal(null, () => loadUsers());
    const loadUsers = async () => {
      const q = box.querySelector('#u-search').value.trim();
      const role = box.querySelector('#u-role').value;
      const status = box.querySelector('#u-status').value;
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      try {
        const data = await API.get('/api/users?' + params.toString());
        const list = box.querySelector('#u-list');
        const users = data.users || [];
        if (!users.length) { list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">👥</div>No users found.</div>'; return; }
        list.innerHTML = `<table class="table"><thead><tr><th>User</th><th>Role</th><th>Email</th><th>Phone</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody></tbody></table>`;
        const tbody = list.querySelector('tbody');
        users.forEach((u) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td data-label="User"><strong>${UI.esc(u.full_name)}</strong></td>
            <td data-label="Role"><span class="badge ${roleColor(u.role)}">${UI.esc(u.role)}</span></td>
            <td data-label="Email">${UI.esc(u.email || '—')}</td>
            <td data-label="Phone">${UI.esc(u.phone || '—')}</td>
            <td data-label="Status">${statusBadge(u.status)}</td>
            <td data-label="" class="actions-cell"><div class="actions">
              <button class="btn secondary sm" data-edit>✏️</button>
              <button class="btn danger sm" data-pass>🔑</button>
              <button class="btn danger sm" data-del>🗑</button>
            </div></td>`;
          tbody.appendChild(tr);
          tr.querySelector('[data-edit]').onclick = () => userModal(u, () => loadUsers());
          tr.querySelector('[data-pass]').onclick = () => resetPasswordModal(u);
          tr.querySelector('[data-del]').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete user ${UI.esc(u.full_name)} (${UI.esc(u.username)})? This permanently removes their account.`, { title: 'Delete user', confirmText: 'Delete' });
            if (!ok) return;
            try { await API.del(`/api/users/${u.id}`); UI.toast('User deleted.', 'success'); loadUsers(); } catch (e) { UI.toast(e.message, 'error'); }
          };
        });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
    ['#u-search', '#u-role', '#u-status'].forEach((sel) => box.querySelector(sel).addEventListener('input', loadUsers));
    box.querySelector('#u-role').addEventListener('change', loadUsers);
    box.querySelector('#u-status').addEventListener('change', loadUsers);
    await loadUsers();
  }

  function roleColor(role) {
    const map = { super_admin: 'purple', admin: 'blue', teacher: 'amber', student: 'indigo', parent: 'green' };
    return map[role] || 'gray';
  }

  function statusBadge(status) {
    const map = { active: 'green', inactive: 'red', pending: 'amber' };
    const color = map[status] || 'gray';
    return `<span class="badge ${color}">${UI.esc(status)}</span>`;
  }

  function userModal(u, onSave) {
    const isEdit = !!u;
    let modal;
    modal = UI.openModal({
      title: isEdit ? 'Edit user' : 'Add user',
      wide: true,
      body: `<div class="form-row">
        <label class="field">Full name <span class="req">*</span><input id="u-name" value="${isEdit ? UI.esc(u.full_name) : ''}"></label>
        <label class="field">Username <span class="req">*</span><input id="u-username" value="${isEdit ? UI.esc(u.username) : ''}" ${isEdit ? 'disabled' : ''}></label>
      </div>
      <div class="form-row">
        <label class="field">Email<input id="u-email" type="email" value="${isEdit ? UI.esc(u.email || '') : ''}"></label>
        <label class="field">Phone<input id="u-phone" value="${isEdit ? UI.esc(u.phone || '') : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Role<select id="u-role">${['super_admin','admin','teacher','student','parent'].map(r => `<option value="${r}" ${isEdit && u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        <label class="field">Status<select id="u-status"><option value="active" ${isEdit && u.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${isEdit && u.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="pending" ${isEdit && u.status === 'pending' ? 'selected' : ''}>Pending</option></select></label>
      </div>
      ${!isEdit ? `<div class="form-row">
        <label class="field">Password <span class="req">*</span><input id="u-password" type="password"></label>
      </div>` : ''}`,
      foot: `<button class="btn secondary" data-cancel>Cancel</button><button class="btn" data-save>${isEdit ? 'Save' : 'Add'}</button>`,
    });
    modal.backdrop.querySelector('[data-cancel]').onclick = () => modal.close();
    modal.backdrop.querySelector('[data-save]').onclick = async () => {
      const body = {
        fullName: modal.backdrop.querySelector('#u-name').value.trim(),
        email: modal.backdrop.querySelector('#u-email').value.trim(),
        phone: modal.backdrop.querySelector('#u-phone').value.trim(),
        role: modal.backdrop.querySelector('#u-role').value,
        status: modal.backdrop.querySelector('#u-status').value,
      };
      if (!isEdit) {
        body.username = modal.backdrop.querySelector('#u-username').value.trim();
        body.password = modal.backdrop.querySelector('#u-password').value;
      }
      try {
        if (isEdit) await API.put(`/api/users/${u.id}`, body);
        else await API.post('/api/users', body);
        UI.toast('Saved.', 'success'); modal.close(); onSave && onSave();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  function resetPasswordModal(u) {
    UI.openModal({
      title: `Reset password for ${UI.esc(u.full_name)}`,
      body: `<label class="field">New password <span class="req">*</span><input id="rp-pass" type="password"></label>`,
      foot: `<button class="btn secondary" data-cancel>Cancel</button><button class="btn danger" data-save>Reset</button>`,
    }).then((modal) => {
      modal.backdrop.querySelector('[data-cancel]').onclick = () => modal.close();
      modal.backdrop.querySelector('[data-save]').onclick = async () => {
        const pass = modal.backdrop.querySelector('#rp-pass').value;
        if (!pass) return UI.toast('Password required.', 'error');
        try { await API.post(`/api/users/${u.id}/reset-password`, { password: pass }); UI.toast('Password reset.', 'success'); modal.close(); } catch (e) { UI.toast(e.message, 'error'); }
      };
    });
  }

  // ---------- STUDENTS ----------
  async function renderStudents(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="search-input" style="flex:1;min-width:180px"><input id="s-search" placeholder="Search students…"></div>
        <button class="btn" id="s-add">＋ Add student</button>
      </div>
      <div class="card table-responsive"><div id="s-list"></div></div>`;

    box.querySelector('#s-add').onclick = () => studentModal(null, () => loadStudents());
    const loadStudents = async () => {
      const q = box.querySelector('#s-search').value.trim();
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      try {
        const data = await API.get('/api/students?' + params.toString());
        const list = box.querySelector('#s-list');
        const students = data.students || [];
        if (!students.length) { list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">🧑‍🎓</div>No students found.</div>'; return; }
        list.innerHTML = `<table class="table"><thead><tr><th>Student</th><th>Number</th><th>Class</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody></tbody></table>`;
        const tbody = list.querySelector('tbody');
        students.forEach((s) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td data-label="Student"><strong>${UI.esc(s.full_name)}</strong></td>
            <td data-label="Number">${UI.esc(s.student_code)}</td>
            <td data-label="Class">${UI.esc(s.class_name || '—')} ${UI.esc(s.class_stream || '')}</td>
            <td data-label="Status">${statusBadge(s.status)}</td>
            <td data-label="" class="actions-cell"><div class="actions">
              <button class="btn secondary sm" data-edit>✏️</button>
              <button class="btn danger sm" data-del>🗑</button>
            </div></td>`;
          tbody.appendChild(tr);
          tr.querySelector('[data-edit]').onclick = () => studentModal(s, () => loadStudents());
          tr.querySelector('[data-del]').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete student ${UI.esc(s.full_name)}?`, { title: 'Delete student', confirmText: 'Delete' });
            if (!ok) return;
            try { await API.del(`/api/students/${s.id}`); UI.toast('Deleted.', 'success'); loadStudents(); } catch (e) { UI.toast(e.message, 'error'); }
          };
        });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
    box.querySelector('#s-search').oninput = () => loadStudents();
    await loadStudents();
  }

  function studentModal(s, onSave) {
    const isEdit = !!s;
    let modal;
    modal = UI.openModal({
      title: isEdit ? 'Edit student' : 'Add student',
      wide: true,
      body: `<div class="form-row">
        <label class="field">Full name <span class="req">*</span><input id="s-name" value="${isEdit ? UI.esc(s.full_name) : ''}"></label>
        <label class="field">Student number <span class="req">*</span><input id="s-code" value="${isEdit ? UI.esc(s.student_code) : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Class<select id="s-class"><option value="">— Unassigned —</option>${ref.classes.map((c) => `<option value="${c.id}" ${isEdit && s.class_id === c.id ? 'selected' : ''}>${UI.esc(c.name)} ${UI.esc(c.stream)}</option>`).join('')}</select></label>
        <label class="field">Parent name<input id="s-pname" value="${isEdit ? UI.esc(s.parent_name || '') : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Parent phone<input id="s-pphone" value="${isEdit ? UI.esc(s.parent_phone || '') : ''}"></label>
        <label class="field">Gender<select id="s-gender"><option value="">—</option><option ${isEdit && s.gender === 'Male' ? 'selected' : ''}>Male</option><option ${isEdit && s.gender === 'Female' ? 'selected' : ''}>Female</option></select></label>
      </div>
      ${!isEdit ? `<div class="form-row">
        <label class="field">Login username<input id="s-username"></label>
        <label class="field">Login password<input id="s-password" type="password"></label>
      </div>` : ''}`,
      foot: `<button class="btn secondary" data-cancel>Cancel</button><button class="btn" data-save>${isEdit ? 'Save' : 'Add'}</button>`,
    });
    modal.backdrop.querySelector('[data-cancel]').onclick = () => modal.close();
    modal.backdrop.querySelector('[data-save]').onclick = async () => {
      const body = {
        fullName: modal.backdrop.querySelector('#s-name').value.trim(),
        studentCode: modal.backdrop.querySelector('#s-code').value.trim(),
        classId: modal.backdrop.querySelector('#s-class').value || null,
        parentName: modal.backdrop.querySelector('#s-pname').value.trim(),
        parentPhone: modal.backdrop.querySelector('#s-pphone').value.trim(),
        gender: modal.backdrop.querySelector('#s-gender').value || null,
      };
      if (!isEdit) {
        body.username = modal.backdrop.querySelector('#s-username').value.trim();
        body.password = modal.backdrop.querySelector('#s-password').value;
      }
      try {
        if (isEdit) await API.put(`/api/students/${s.id}`, body);
        else await API.post('/api/students', body);
        UI.toast('Saved.', 'success'); modal.close(); onSave && onSave();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  // ---------- TEACHERS ----------
  async function renderTeachers(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="search-input" style="flex:1;min-width:180px"><input id="t-search" placeholder="Search teachers…"></div>
        <button class="btn" id="t-add">＋ Add teacher</button>
      </div>
      <div class="card table-responsive"><div id="t-list"></div></div>`;

    box.querySelector('#t-add').onclick = () => teacherModal(null, () => loadTeachers());
    const loadTeachers = async () => {
      const q = box.querySelector('#t-search').value.trim();
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      try {
        const data = await API.get('/api/teachers?' + params.toString());
        const list = box.querySelector('#t-list');
        const teachers = data.teachers || [];
        if (!teachers.length) { list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">👩‍🏫</div>No teachers found.</div>'; return; }
        list.innerHTML = `<table class="table"><thead><tr><th>Teacher</th><th>Staff code</th><th>Subjects</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody></tbody></table>`;
        const tbody = list.querySelector('tbody');
        teachers.forEach((t) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td data-label="Teacher"><strong>${UI.esc(t.full_name)}</strong></td>
            <td data-label="Staff code">${UI.esc(t.staff_code)}</td>
            <td data-label="Subjects">${UI.esc((t.subjects || []).join(', ') || '—')}</td>
            <td data-label="Status">${statusBadge(t.status)}</td>
            <td data-label="" class="actions-cell"><div class="actions">
              <button class="btn secondary sm" data-edit>✏️</button>
              <button class="btn danger sm" data-del>🗑</button>
            </div></td>`;
          tbody.appendChild(tr);
          tr.querySelector('[data-edit]').onclick = () => teacherModal(t, () => loadTeachers());
          tr.querySelector('[data-del]').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete teacher ${UI.esc(t.full_name)}?`, { title: 'Delete teacher', confirmText: 'Delete' });
            if (!ok) return;
            try { await API.del(`/api/teachers/${t.id}`); UI.toast('Deleted.', 'success'); loadTeachers(); } catch (e) { UI.toast(e.message, 'error'); }
          };
        });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
    box.querySelector('#t-search').oninput = () => loadTeachers();
    await loadTeachers();
  }

  function teacherModal(t, onSave) {
    const isEdit = !!t;
    let modal;
    modal = UI.openModal({
      title: isEdit ? 'Edit teacher' : 'Add teacher',
      wide: true,
      body: `<div class="form-row">
        <label class="field">Full name <span class="req">*</span><input id="t-name" value="${isEdit ? UI.esc(t.full_name) : ''}"></label>
        <label class="field">Staff code <span class="req">*</span><input id="t-code" value="${isEdit ? UI.esc(t.staff_code) : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Subjects (comma-separated)<input id="t-subjects" value="${isEdit ? UI.esc((t.subjects || []).join(', ')) : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Phone<input id="t-phone" value="${isEdit ? UI.esc(t.phone || '') : ''}"></label>
        <label class="field">Email<input id="t-email" type="email" value="${isEdit ? UI.esc(t.email || '') : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Qualification<input id="t-qual" value="${isEdit ? UI.esc(t.qualification || '') : ''}"></label>
        <label class="field">Status<select id="t-status"><option value="active" ${isEdit && t.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${isEdit && t.status === 'inactive' ? 'selected' : ''}>Inactive</option></select></label>
      </div>
      ${!isEdit ? `<div class="form-row">
        <label class="field">Login username<input id="t-username"></label>
        <label class="field">Login password<input id="t-password" type="password"></label>
      </div>` : ''}`,
      foot: `<button class="btn secondary" data-cancel>Cancel</button><button class="btn" data-save>${isEdit ? 'Save' : 'Add'}</button>`,
    });
    modal.backdrop.querySelector('[data-cancel]').onclick = () => modal.close();
    modal.backdrop.querySelector('[data-save]').onclick = async () => {
      const body = {
        fullName: modal.backdrop.querySelector('#t-name').value.trim(),
        staffCode: modal.backdrop.querySelector('#t-code').value.trim(),
        subjects: modal.backdrop.querySelector('#t-subjects').value.split(',').map(s => s.trim()).filter(Boolean),
        phone: modal.backdrop.querySelector('#t-phone').value.trim(),
        email: modal.backdrop.querySelector('#t-email').value.trim(),
        qualification: modal.backdrop.querySelector('#t-qual').value.trim(),
        status: modal.backdrop.querySelector('#t-status').value,
      };
      if (!isEdit) {
        body.username = modal.backdrop.querySelector('#t-username').value.trim();
        body.password = modal.backdrop.querySelector('#t-password').value;
      }
      try {
        if (isEdit) await API.put(`/api/teachers/${t.id}`, body);
        else await API.post('/api/teachers', body);
        UI.toast('Saved.', 'success'); modal.close(); onSave && onSave();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  // ---------- PARENTS ----------
  async function renderParents(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="search-input" style="flex:1;min-width:180px"><input id="p-search" placeholder="Search parents…"></div>
        <button class="btn" id="p-add">＋ Add parent</button>
      </div>
      <div class="card table-responsive"><div id="p-list"></div></div>`;

    box.querySelector('#p-add').onclick = () => parentModal(null, () => loadParents());
    const loadParents = async () => {
      const q = box.querySelector('#p-search').value.trim();
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      try {
        const data = await API.get('/api/parents?' + params.toString());
        const list = box.querySelector('#p-list');
        const parents = data.parents || [];
        if (!parents.length) { list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">👨‍👧‍👦</div>No parents found.</div>'; return; }
        list.innerHTML = `<table class="table"><thead><tr><th>Parent</th><th>Phone</th><th>Email</th><th>Children</th><th style="text-align:right">Actions</th></tr></thead><tbody></tbody></table>`;
        const tbody = list.querySelector('tbody');
        parents.forEach((p) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td data-label="Parent"><strong>${UI.esc(p.full_name)}</strong></td>
            <td data-label="Phone">${UI.esc(p.phone || '—')}</td>
            <td data-label="Email">${UI.esc(p.email || '—')}</td>
            <td data-label="Children">${(p.children || []).map(c => UI.esc(c.full_name)).join(', ') || '—'}</td>
            <td data-label="" class="actions-cell"><div class="actions">
              <button class="btn secondary sm" data-edit>✏️</button>
              <button class="btn danger sm" data-del>🗑</button>
            </div></td>`;
          tbody.appendChild(tr);
          tr.querySelector('[data-edit]').onclick = () => parentModal(p, () => loadParents());
          tr.querySelector('[data-del]').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete parent ${UI.esc(p.full_name)}?`, { title: 'Delete parent', confirmText: 'Delete' });
            if (!ok) return;
            try { await API.del(`/api/parents/${p.id}`); UI.toast('Deleted.', 'success'); loadParents(); } catch (e) { UI.toast(e.message, 'error'); }
          };
        });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
    box.querySelector('#p-search').oninput = () => loadParents();
    await loadParents();
  }

  function parentModal(p, onSave) {
    const isEdit = !!p;
    let modal;
    modal = UI.openModal({
      title: isEdit ? 'Edit parent' : 'Add parent',
      wide: true,
      body: `<div class="form-row">
        <label class="field">Full name <span class="req">*</span><input id="p-name" value="${isEdit ? UI.esc(p.full_name) : ''}"></label>
        <label class="field">Phone<input id="p-phone" value="${isEdit ? UI.esc(p.phone || '') : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Email<input id="p-email" type="email" value="${isEdit ? UI.esc(p.email || '') : ''}"></label>
        <label class="field">Address<input id="p-addr" value="${isEdit ? UI.esc(p.address || '') : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Occupation<input id="p-occ" value="${isEdit ? UI.esc(p.occupation || '') : ''}"></label>
        <label class="field">Status<select id="p-status"><option value="active" ${isEdit && p.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${isEdit && p.status === 'inactive' ? 'selected' : ''}>Inactive</option></select></label>
      </div>
      ${!isEdit ? `<div class="form-row">
        <label class="field">Login username<input id="p-username"></label>
        <label class="field">Login password<input id="p-password" type="password"></label>
      </div>` : ''}`,
      foot: `<button class="btn secondary" data-cancel>Cancel</button><button class="btn" data-save>${isEdit ? 'Save' : 'Add'}</button>`,
    });
    modal.backdrop.querySelector('[data-cancel]').onclick = () => modal.close();
    modal.backdrop.querySelector('[data-save]').onclick = async () => {
      const body = {
        fullName: modal.backdrop.querySelector('#p-name').value.trim(),
        phone: modal.backdrop.querySelector('#p-phone').value.trim(),
        email: modal.backdrop.querySelector('#p-email').value.trim(),
        address: modal.backdrop.querySelector('#p-addr').value.trim(),
        occupation: modal.backdrop.querySelector('#p-occ').value.trim(),
        status: modal.backdrop.querySelector('#p-status').value,
      };
      if (!isEdit) {
        body.username = modal.backdrop.querySelector('#p-username').value.trim();
        body.password = modal.backdrop.querySelector('#p-password').value;
      }
      try {
        if (isEdit) await API.put(`/api/parents/${p.id}`, body);
        else await API.post('/api/parents', body);
        UI.toast('Saved.', 'success'); modal.close(); onSave && onSave();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  // ---------- CLASSES ----------
  async function renderClasses(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    box.innerHTML = `
      <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="search-input" style="flex:1;min-width:180px"><input id="c-search" placeholder="Search classes…"></div>
        <button class="btn" id="c-add">＋ Add class</button>
      </div>
      <div class="card table-responsive"><div id="c-list"></div></div>`;

    box.querySelector('#c-add').onclick = () => classModal(null, () => loadClasses());
    const loadClasses = async () => {
      const q = box.querySelector('#c-search').value.trim();
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      try {
        const data = await API.get('/api/classes?' + params.toString());
        const list = box.querySelector('#c-list');
        const classes = data.classes || [];
        if (!classes.length) { list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="big">🏫</div>No classes found.</div>'; return; }
        list.innerHTML = `<table class="table"><thead><tr><th>Class</th><th>Stream</th><th>Year</th><th>Teacher</th><th>Students</th><th style="text-align:right">Actions</th></tr></thead><tbody></tbody></table>`;
        const tbody = list.querySelector('tbody');
        classes.forEach((c) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td data-label="Class"><strong>${UI.esc(c.name)}</strong></td>
            <td data-label="Stream">${UI.esc(c.stream)}</td>
            <td data-label="Year">${UI.esc(c.academic_year)}</td>
            <td data-label="Teacher">${UI.esc(c.class_teacher || '—')}</td>
            <td data-label="Students">${c.student_count || 0}</td>
            <td data-label="" class="actions-cell"><div class="actions">
              <button class="btn secondary sm" data-edit>✏️</button>
              <button class="btn danger sm" data-del>🗑</button>
            </div></td>`;
          tbody.appendChild(tr);
          tr.querySelector('[data-edit]').onclick = () => classModal(c, () => loadClasses());
          tr.querySelector('[data-del]').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete class ${UI.esc(c.name)} ${UI.esc(c.stream)}?`, { title: 'Delete class', confirmText: 'Delete' });
            if (!ok) return;
            try { await API.del(`/api/classes/${c.id}`); UI.toast('Deleted.', 'success'); loadClasses(); } catch (e) { UI.toast(e.message, 'error'); }
          };
        });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
    box.querySelector('#c-search').oninput = () => loadClasses();
    await loadClasses();
  }

  function classModal(c, onSave) {
    const isEdit = !!c;
    let modal;
    modal = UI.openModal({
      title: isEdit ? 'Edit class' : 'Add class',
      body: `<div class="form-row">
        <label class="field">Name <span class="req">*</span><input id="c-name" value="${isEdit ? UI.esc(c.name) : ''}"></label>
        <label class="field">Stream <span class="req">*</span><input id="c-stream" value="${isEdit ? UI.esc(c.stream) : ''}"></label>
      </div>
      <div class="form-row">
        <label class="field">Academic year <span class="req">*</span><input id="c-year" value="${isEdit ? UI.esc(c.academic_year) : ''}"></label>
      </div>`,
      foot: `<button class="btn secondary" data-cancel>Cancel</button><button class="btn" data-save>${isEdit ? 'Save' : 'Add'}</button>`,
    });
    modal.backdrop.querySelector('[data-cancel]').onclick = () => modal.close();
    modal.backdrop.querySelector('[data-save]').onclick = async () => {
      const body = {
        name: modal.backdrop.querySelector('#c-name').value.trim(),
        stream: modal.backdrop.querySelector('#c-stream').value.trim(),
        academic_year: modal.backdrop.querySelector('#c-year').value.trim(),
      };
      try {
        if (isEdit) await API.put(`/api/classes/${c.id}`, body);
        else await API.post('/api/classes', body);
        UI.toast('Saved.', 'success'); modal.close(); onSave && onSave();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  // ---------- SETTINGS ----------
  async function renderSettings(content) {
    content.innerHTML = `<div class="view active"></div>`;
    const box = content.firstElementChild;
    let settings = {};
    try { settings = await API.get('/api/settings'); } catch {}
    box.innerHTML = `
      <div class="card">
        <h3>School Settings</h3>
        <div class="form-row" style="margin-top:16px">
          <label class="field">School name<input id="st-name" value="${UI.esc(settings.school_name || 'Kalinabiri Secondary School')}"></label>
        </div>
        <div class="form-row">
          <label class="field">Phone<input id="st-phone" value="${UI.esc(settings.school_phone || '')}"></label>
          <label class="field">Email<input id="st-email" type="email" value="${UI.esc(settings.school_email || '')}"></label>
        </div>
        <div class="form-row">
          <label class="field">Address<textarea id="st-addr" style="min-height:80px">${UI.esc(settings.school_address || '')}</textarea></label>
        </div>
        <button class="btn" id="st-save" style="margin-top:16px">Save settings</button>
      </div>`;
    box.querySelector('#st-save').onclick = async () => {
      try {
        await API.put('/api/settings', {
          school_name: box.querySelector('#st-name').value.trim(),
          school_phone: box.querySelector('#st-phone').value.trim(),
          school_email: box.querySelector('#st-email').value.trim(),
          school_address: box.querySelector('#st-addr').value.trim(),
        });
        UI.toast('Settings saved.', 'success');
      } catch (e) { UI.toast(e.message, 'error'); }
    };
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
        // Update layout
        layout.updateUser({ fullName: box.querySelector('#pf-name').value.trim() });
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  }

  // ---------- MESSAGES (reuse from existing) ----------
  async function renderMessages(content) {
    // Placeholder - uses the messaging component if available
    content.innerHTML = `<div class="view active"><div class="card" style="text-align:center;padding:40px"><h3>💬 Messages</h3><p>Click the messages icon in the sidebar to open the communication center.</p></div></div>`;
  }

})();