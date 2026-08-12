/* =========================================================
   ICONS
========================================================= */
const ICONS = {
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 15l6-6M9.5 6.5l1-1a4 4 0 015.7 5.7l-1.2 1.2M14.5 17.5l-1 1a4 4 0 01-5.7-5.7l1.2-1.2"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.2h1.6"/></svg>',
  coin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M9.2 9.6c0-1 1.2-1.6 2.8-1.6s2.8.8 2.8 1.9-1 1.4-2.8 1.9-2.8 1-2.8 2 1.2 1.9 2.8 1.9 2.8-.5 2.8-1.5"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V10M10 19V5M16 19v-6M21 19H3"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l7 2.8v6c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9v-6l7-2.8z"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.6 1z"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>'
};
function icon(name){ return '<span class="icon">' + (ICONS[name] || '') + '</span>'; }

/* =========================================================
   HELPERS
========================================================= */
function money(n){ n = Number(n) || 0; return '$' + (Math.round(n * 100) / 100).toFixed(2); }
function num(n){ return Number(n || 0).toLocaleString('en-US'); }
const EASTERN_DIGITS = ['٠','١','٢','٣','٤'];
function stageDigit(n){ return EASTERN_DIGITS[n] || n; }

function toast(msg, type){
  const box = document.getElementById('toast-container');
  if(!box) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 3400);
}
function copyText(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>toast('تم النسخ ✅')).catch(()=>toast('تعذّر النسخ','error'));
  } else { toast('تعذّر النسخ تلقائيًا، انسخه يدويًا','error'); }
}

async function api(path, opts){
  opts = opts || {};
  const fetchOpts = {
    method: opts.method || 'GET',
    credentials: 'include',
    headers: {}
  };
  if(opts.body !== undefined){
    fetchOpts.headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, fetchOpts);
  let data = null;
  try{ data = await res.json(); } catch(e){ data = null; }
  if(!res.ok){
    const err = new Error((data && data.error) || ('خطأ (' + res.status + ')'));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function ticketHTML(currentStage){
  let html = '<div class="ticket">';
  for(let i=1;i<=4;i++){
    const done = i < currentStage;
    const isCurrent = i === currentStage;
    const cls = done ? 'done' : (isCurrent ? 'current' : '');
    html += '<div class="stub ' + cls + '"><div class="stage-no">مرحلة ' + stageDigit(i) + '</div><div class="stamp-circle">' + (done ? icon('check') : i) + '</div></div>';
  }
  return html + '</div>';
}

/* =========================================================
   NAVBAR / FOOTER (shared shell)
========================================================= */
let currentUser = null;

function navHTML(activeRoute, user){
  const links = [
    { route:'home', href:'/index.html', label:'الرئيسية', icon:'coin' },
    { route:'dashboard', href:'/dashboard.html', label:'لوحة التحكم', icon:'chart' },
    { route:'articles', href:'/articles.html', label:'المقالات', icon:'doc' },
    { route:'profile', href:'/profile.html', label:'الملف الشخصي', icon:'wallet' }
  ];
  const navLinks = links.map(l =>
    `<a href="${l.href}" class="nav-link ${activeRoute===l.route?'active':''}">${icon(l.icon)}<span>${l.label}</span></a>`
  ).join('');

  let right;
  if(user){
    const initials = user.name.split(' ').map(w=>w[0]).slice(0,2).join('.') + '.';
    right = `
      <a href="/profile.html" class="balance-chip">${icon('coin')}<span>${money(user.balance)}</span></a>
      ${user.isAdmin ? `<a href="/admin.html" class="icon-btn" title="لوحة تحكم المالك">${icon('gear')}</a>` : ''}
      <button class="icon-btn" id="logoutBtn" title="تسجيل الخروج">${icon('logout')}</button>
      <div class="avatar" title="${user.name}">${initials}</div>`;
  } else {
    right = `<a href="/login.html" class="btn btn-ghost btn-sm">تسجيل الدخول</a>
              <a href="/register.html" class="btn btn-copper btn-sm">إنشاء حساب</a>`;
  }

  return `<div class="nav-inner">
    <a href="/index.html" class="brand"><span class="brand-mark icon">${ICONS.link}</span><span>Linkora<span class="brand-sub">لينكورا</span></span></a>
    <nav class="nav-links">${navLinks}</nav>
    <div class="nav-right">${right}</div>
  </div>`;
}

async function initShell(activeRoute){
  const navEl = document.getElementById('navbar');
  try{
    const data = await api('/api/me');
    currentUser = data.user;
  }catch(e){ currentUser = null; }
  if(navEl){
    navEl.innerHTML = navHTML(activeRoute, currentUser);
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn){
      logoutBtn.addEventListener('click', async ()=>{
        try{ await api('/api/auth/logout', {method:'POST'}); }catch(e){}
        location.href = '/index.html';
      });
    }
  }
  return currentUser;
}

// opts: { active: 'dashboard', auth: true, admin: true }
async function guardPage(opts){
  opts = opts || {};
  const user = await initShell(opts.active);
  if(opts.auth && !user){
    location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
    return null;
  }
  if(opts.admin && (!user || !user.isAdmin)){
    toast('هذا القسم مخصص لمالك المنصة فقط', 'error');
    location.href = '/index.html';
    return null;
  }
  return user;
}
