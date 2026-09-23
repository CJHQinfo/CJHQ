/* ================================================================
 * CJHQ admin app
 * ----------------------------------------------------------------
 * Everything only the admin panel uses: staff sign-in checks, the
 * editors for every tab, the Publishing and Ask CJHQ admin UIs.
 *
 * It used to live inside index.html, so every visitor downloaded and
 * parsed it on every page. tools/generate-routes.mjs now injects this
 * file into admin.html only, at the placeholder in index.html's main
 * script - same arrangement as tools/admin-panel.inc (markup) and
 * tools/ask-engine.js (Ask engine).
 *
 * It runs inside that same <script> block, so it shares globals with
 * the public code exactly as before (fetchCollection, goPage, ...).
 * Public code must never call anything defined here; the one hook,
 * syncAdminAuthUI from initFirebase, is guarded with typeof.
 *
 * Edit admin behaviour HERE, then run: node tools/generate-routes.mjs
 * ================================================================ */

/* ---------- In-page messages (replace browser alert/confirm/prompt) ----------
   The brief asks for no browser pop-ups. These keep the same meaning:
   admToast   = alert   (information; never blocks)
   admConfirm = confirm (resolves true/false; Esc or Cancel = false)
   admForm    = several prompt() calls folded into one small form      */
function admToastHost(){
  let h = document.getElementById('admToastHost');
  if(!h){
    h = document.createElement('div');
    h.id = 'admToastHost';
    h.setAttribute('role','status');
    h.setAttribute('aria-live','polite');
    document.body.appendChild(h);
  }
  return h;
}
const ADM_ERROR_RE = /could not|couldn't|cannot|can't|not connected|not available|required|please|invalid|not a valid|not look like|larger than|already in use|before the start|earlier than|run the review first|no response/i;
function admToast(msg, kind){
  const k = kind || (ADM_ERROR_RE.test(String(msg)) ? 'error' : 'ok');
  const t = document.createElement('div');
  t.className = 'adm-toast adm-toast-' + k;
  t.textContent = String(msg);
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'adm-toast-x'; x.setAttribute('aria-label','Dismiss'); x.textContent = '×';
  x.addEventListener('click', ()=> t.remove());
  t.appendChild(x);
  admToastHost().appendChild(t);
  setTimeout(()=> t.remove(), k === 'error' ? 9000 : 5000);
}
function admDialog(build){
  return new Promise(resolve => {
    const prev = document.activeElement;
    const back = document.createElement('div');
    back.className = 'adm-modal-back';
    const box = document.createElement('div');
    box.className = 'adm-modal';
    box.setAttribute('role','dialog');
    box.setAttribute('aria-modal','true');
    back.appendChild(box);
    const done = (v)=>{ back.remove(); document.removeEventListener('keydown', onKey, true); if(prev && prev.focus) prev.focus(); resolve(v); };
    const onKey = (e)=>{
      if(e.key === 'Escape'){ e.preventDefault(); done(build.cancelValue); }
      if(e.key === 'Tab'){
        const f = [...box.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled);
        if(!f.length) return;
        if(e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length-1].focus(); }
        else if(!e.shiftKey && document.activeElement === f[f.length-1]){ e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('click', e=>{ if(e.target === back) done(build.cancelValue); });
    build.render(box, done);
    document.body.appendChild(back);
    const first = box.querySelector(build.focus || 'button.adm-modal-ok');
    if(first) first.focus();
  });
}
function admConfirmLabel(msg){
  const w = String(msg).trim().split(/\s+/)[0].replace(/[^A-Za-z]/g,'');
  const map = { Delete:'Delete', Permanently:'Delete', Remove:'Remove', Reset:'Reset', Hide:'Hide',
                Publish:'Publish', Activate:'Activate', Deactivate:'Deactivate', Update:'Update', Load:'Load' };
  return map[w] || 'OK';
}
function admConfirm(msg){
  const label = admConfirmLabel(msg);
  const danger = /^(Delete|Remove|Reset|Hide|Deactivate)$/.test(label);
  return admDialog({
    cancelValue: false,
    focus: danger ? 'button.adm-modal-cancel' : 'button.adm-modal-ok',
    render(box, done){
      const parts = String(msg).split(/\n\n/);
      const h = document.createElement('p'); h.className = 'adm-modal-title'; h.textContent = parts[0];
      box.appendChild(h);
      parts.slice(1).forEach(p=>{ const e = document.createElement('p'); e.className = 'adm-modal-text'; e.textContent = p; box.appendChild(e); });
      const row = document.createElement('div'); row.className = 'adm-modal-row';
      const no = document.createElement('button'); no.type='button'; no.className='btn admin-btn-outline adm-modal-cancel'; no.textContent='Cancel';
      const yes = document.createElement('button'); yes.type='button'; yes.className='btn dark adm-modal-ok' + (danger ? ' adm-danger' : ''); yes.textContent=label;
      no.addEventListener('click', ()=> done(false));
      yes.addEventListener('click', ()=> done(true));
      row.append(no, yes); box.appendChild(row);
    }
  });
}
function admForm(title, fields, okLabel){
  return admDialog({
    cancelValue: null,
    focus: 'input,select',
    render(box, done){
      const h = document.createElement('p'); h.className = 'adm-modal-title'; h.textContent = title; box.appendChild(h);
      const form = document.createElement('form');
      const inputs = {};
      fields.forEach(f=>{
        const wrap = document.createElement('label'); wrap.className = 'adm-modal-field' + (f.type === 'checkbox' ? ' adm-modal-check' : '');
        let el;
        if(f.type === 'select'){
          el = document.createElement('select'); el.className = 'admin-input';
          f.options.forEach(o=>{ const op = document.createElement('option'); op.value = o; op.textContent = o; el.appendChild(op); });
          if(f.value) el.value = f.value;
        }else{
          el = document.createElement('input');
          el.type = f.type === 'checkbox' ? 'checkbox' : 'text';
          if(f.type !== 'checkbox') el.className = 'admin-input';
          if(f.required) el.required = true;
          if(f.value && f.type !== 'checkbox') el.value = f.value;
        }
        inputs[f.key] = el;
        const span = document.createElement('span'); span.textContent = f.label;
        if(f.type === 'checkbox'){ wrap.append(el, span); } else { wrap.append(span, el); }
        form.appendChild(wrap);
      });
      const row = document.createElement('div'); row.className = 'adm-modal-row';
      const no = document.createElement('button'); no.type='button'; no.className='btn admin-btn-outline'; no.textContent='Cancel';
      const yes = document.createElement('button'); yes.type='submit'; yes.className='btn dark adm-modal-ok'; yes.textContent = okLabel || 'Save';
      no.addEventListener('click', ()=> done(null));
      row.append(no, yes); form.appendChild(row);
      form.addEventListener('submit', e=>{
        e.preventDefault();
        const out = {};
        fields.forEach(f=>{ const el = inputs[f.key]; out[f.key] = f.type === 'checkbox' ? el.checked : el.value.trim(); });
        done(out);
      });
      box.appendChild(form);
    }
  });
}
/* ---------- Admin panel: shared ---------- */
// Signed in with Firebase Auth. Firestore enforces the same condition on every
// write, so the panel and the database agree instead of relying on a flag the
// browser could set for itself.
function adminUnlocked(){ return !!adminUser && adminIsStaff === true; }

// Signing in proves who you are, not that you are staff. This decides whether
// to OPEN the panel; Firestore rules remain the actual security boundary and
// reject every write from a non-staff account regardless of what the UI does.
//
// An earlier version probed a staff-only collection to find out. That was wrong:
// the Firestore read can hang instead of returning permission-denied, which left
// the answer undetermined and could stall a real staff member out of the panel.
//
// This compares a SHA-256 of the signed-in address against a fixed list. No
// network call, so it cannot hang. Hashes rather than plain addresses because
// this file is public - six real staff email addresses in page source would be
// harvested by scrapers.
const STAFF_EMAIL_HASHES = [
  '802f29f18f2c21c1e75ed93c8370a46e42e1f6d1351dd65da0ee6defc356ec0a',
  'c56b62a4276676b8988ba6e92f4569c6e9c9a09fefddf7fc4d5ab0b1c4727955',
  'bfb5888a455e596f356dfad1cebf7b7be594b69e795b60c5cd68bb6657c27e21',
  'da8379e0210c9cf3fd4fee3d0c53b167f459201045c39eef986ddbf65e7c6d82',
  '40470a896474b00dfc2b9e05996a2f4bdb340d456301d65bdcaac5b132c3adaa',
  '71b41552fc55fe00e35e511f40cd4e84975dbb16e39ea726ded0d7c680d2671b'
];

let adminIsStaff = null;   // null = not yet determined

async function sha256Hex(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Staff can also be added from the panel, which writes one document per
   address into the `staff` collection. The panel therefore has to ask
   Firestore about anyone who is not in the hash list above.

   The reason that read used to be wrong was never the read itself - it was
   that it could hang, leaving the answer undetermined and a real staff member
   stranded. So it is bounded: the hash list answers first and costs no
   network call, the Firestore lookup runs only for addresses it does not
   cover, and it is raced against a timeout. Anything other than a document
   that exists - denied, offline, timed out, malformed - resolves to NOT
   staff. Fail closed, never hang.

   The rules allow a signed-in account to `get` exactly one document: the one
   whose id is its own address. So this lookup cannot be used to enumerate
   staff, and a stranger learns only that they are not on the list.

   None of this is a security boundary. Firestore rules are; they run the
   same two checks server-side on every read and write. */
const STAFF_LOOKUP_TIMEOUT_MS = 6000;

function staffDocId(email){ return String(email || '').trim().toLowerCase(); }

async function staffDocExists(email){
  const id = staffDocId(email);
  if(!id || !firebaseReady || !window.__fbFirestore) return false;
  const fs = window.__fbFirestore;
  let timer;
  try{
    const lookup = fs.getDoc(fs.doc(fbDb, 'staff', id)).then(snap => snap.exists());
    const bail   = new Promise(resolve => { timer = setTimeout(() => resolve('timeout'), STAFF_LOOKUP_TIMEOUT_MS); });
    const result = await Promise.race([lookup, bail]);
    if(result === 'timeout'){
      console.warn('[CJHQ] staff lookup timed out; treating as not staff');
      return false;
    }
    return result === true;
  }catch(err){
    console.warn('[CJHQ] staff lookup failed:', err);
    return false;
  }finally{
    clearTimeout(timer);
  }
}

async function verifyAdminIsStaff(){
  if(!adminUser || !adminUser.email){ adminIsStaff = false; return false; }
  try{
    const hash = await sha256Hex(staffDocId(adminUser.email));
    if(STAFF_EMAIL_HASHES.includes(hash)){
      adminIsStaff = true;
      // Not awaited: access is already decided, and this must not delay or
      // endanger sign-in. See ensureOwnStaffRecord().
      ensureOwnStaffRecord();
      return true;
    }
  }catch(err){
    // crypto.subtle needs a secure context. Do not fail the whole check on
    // this - the Firestore lookup below does not depend on it.
    console.warn('[CJHQ] could not hash the signed-in address:', err);
  }
  adminIsStaff = await staffDocExists(adminUser.email);
  return adminIsStaff === true;
}

async function syncAdminAuthUI(){
  const loginBox = document.getElementById('adminLoginBox');
  const panelBox = document.getElementById('adminPanelBox');
  const whoami   = document.getElementById('adminSignedInAs');
  if(!loginBox || !panelBox) return;
  const onAdminRoute = document.getElementById('page-admin').classList.contains('active');

  if(!adminUser){
    adminIsStaff = null;
    panelBox.style.display = 'none';
    loginBox.style.display = 'block';
    return;
  }

  // Signed in - but is this account on the staff list?
  if(adminIsStaff === null) await verifyAdminIsStaff();

  if(adminIsStaff === true){
    loginBox.style.display = 'none';
    if(whoami) whoami.textContent = adminUser.email || '';
    if(onAdminRoute) showAdminPanel();
    return;
  }

  // Authenticated, not authorised. Close the panel, say so plainly, and sign
  // the account out so it is not left in a half-open state.
  panelBox.style.display = 'none';
  loginBox.style.display = 'block';
  const email = adminUser.email || 'That account';
  showLoginErrorGlobal(adminIsStaff === false
    ? `${email} does not have access to the CJHQ admin panel. Contact the site administrator if you believe this is a mistake.`
    : 'Could not confirm your access. Check your connection and try signing in again.');
  try{
    if(fbAuth && window.__fbAuth) await window.__fbAuth.signOut(fbAuth);
  }catch(e){ /* already signed out, or offline */ }
  adminUser = null;
  adminIsStaff = null;
}

// showLoginError lives inside the admin IIFE; this reaches the same element
// from syncAdminAuthUI, which is called from onAuthStateChanged.
function showLoginErrorGlobal(msg){
  const el = document.getElementById('adminLoginError');
  if(!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}


/* ---------- EN | FR side by side ----------
   Layout only. Finds each English field whose French twin follows it
   (label, field, label, field - same parent) and wraps the two in a
   two-column row; on narrow screens the row stacks again. Element ids,
   values and handlers are untouched, so every save works exactly as before. */
function admPairBilingual(root){
  (root || document.getElementById('adminPanelBox') || document).querySelectorAll('input[id$="En"],textarea[id$="En"],select[id$="En"]').forEach(en=>{
    if(en.closest('.adm-bi')) return;
    const fr = document.getElementById(en.id.replace(/En$/,'Fr'));
    if(!fr || fr.parentElement !== en.parentElement) return;
    const lEn = en.previousElementSibling, lFr = fr.previousElementSibling;
    if(!lEn || !lFr || lEn.tagName !== 'LABEL' || lFr.tagName !== 'LABEL') return;
    if(en.nextElementSibling !== lFr) return;
    const row = document.createElement('div'); row.className = 'adm-bi';
    const c1 = document.createElement('div'); c1.className = 'adm-bi-col'; c1.setAttribute('lang','en');
    const c2 = document.createElement('div'); c2.className = 'adm-bi-col'; c2.setAttribute('lang','fr');
    en.parentElement.insertBefore(row, lEn);
    c1.append(lEn, en); c2.append(lFr, fr); row.append(c1, c2);
  });
}
let admPairTimer = null;
function admWatchBilingual(){
  const box = document.getElementById('adminPanelBox');
  if(!box || box.__admPairObs) return;
  admPairBilingual(box);
  box.__admPairObs = new MutationObserver(()=>{ clearTimeout(admPairTimer); admPairTimer = setTimeout(()=>admPairBilingual(box), 60); });
  box.__admPairObs.observe(box, {childList:true, subtree:true});
}


/* ---------- Preview a notice before saving ----------
   Shows the banner or popup exactly as visitors would get it (same element,
   same classes, same sanitiser), from what is typed in the form right now.
   Nothing is saved and nothing is remembered: closing the preview puts the
   page back the way it was and does not mark anything as seen. */
function admPreviewNotice(lang){
  const val = id => (document.getElementById(id) || {}).value || '';
  const type = val('noticeType') || 'banner';
  const style = val('noticeStyle') || 'info';
  const fr = lang === 'fr';
  const title = val(fr ? 'noticeTitleFr' : 'noticeTitleEn');
  const body = val(fr ? 'noticeBodyFr' : 'noticeBodyEn');
  if(!title && !body){ admToast('Type a title or message first, in ' + (fr ? 'French' : 'English') + '.', 'error'); return; }
  const sp = cjhqSanitizeHtml;
  const tag = '<span style="display:inline-block; margin-left:8px; padding:1px 7px; border-radius:10px; background:#FFF3CD; color:#7A5B00; font-size:.72rem; font-weight:600; vertical-align:middle;">PREVIEW · ' + (fr ? 'FR' : 'EN') + ' · not saved</span>';
  if(type === 'popup'){
    const overlay = document.getElementById('sitePopupOverlay');
    const box = document.getElementById('sitePopupBody');
    if(!overlay || !box){ admToast('Could not open the popup preview on this page.', 'error'); return; }
    const before = box.innerHTML;
    box.innerHTML = `
        <div class="site-modal-head"><h2 style="margin:2px 0;">${sp(title)||''}${tag}</h2>
          <button class="site-modal-close" type="button" aria-label="Close">&times;</button></div>
        <div class="site-modal-body"><div class="site-modal-section"><p>${sp(body)||''}</p></div></div>`;
    const close = ()=>{ overlay.classList.remove('open'); box.innerHTML = before; overlay.removeEventListener('click', onBack); };
    const onBack = e=>{ if(e.target === overlay) close(); };
    box.querySelector('.site-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', onBack);
    overlay.classList.add('open');
    return;
  }
  const el = document.getElementById('siteNoticeBanner');
  if(!el){ admToast('Could not open the banner preview on this page.', 'error'); return; }
  if(!el.__admBefore) el.__admBefore = { cls: el.className, disp: el.style.display, html: el.innerHTML };
  el.className = 'notice-' + style;
  el.style.display = 'block';
  el.innerHTML = `${title?`<b>${sp(title)}</b>`:''}${sp(body)}${tag}<button class="notice-close" type="button" aria-label="Close preview">&times;</button>`;
  el.querySelector('.notice-close').addEventListener('click', ()=>{
    const b = el.__admBefore; el.__admBefore = null;
    el.className = b.cls; el.style.display = b.disp; el.innerHTML = b.html;
    // Re-render the real banner (if any) so its own close button works again.
    if(typeof renderPublicNotices === 'function') renderPublicNotices().catch(()=>{});
  });
  window.scrollTo({top:0, behavior:'smooth'});
  admToast('Banner preview shown at the top of the page. Close it with its ×.');
}

function showAdminPanel(){
  document.getElementById('adminLoginBox').style.display = 'none';
  document.getElementById('adminPanelBox').style.display = 'block';
  // The banner now means "not signed in", which is the condition that actually
  // stops saves from working.
  // Superseded: the banner used to key off firebaseReady, which is true even
  // when nobody is signed in - so it stayed hidden in exactly the case that
  // blocks saving. It now keys off the auth state, which is the real condition.
  const warn = document.getElementById('adminFirebaseWarning');
  if(warn) warn.style.display = adminUser ? 'none' : 'block';
  // Open on Home, the dashboard, instead of dropping straight into Pages.
  // Every tab is still rendered up front exactly as before.
  switchAdminTab('home');
  admWatchBilingual();
  renderPagesList();
  renderCustomPagesList();
  renderContentBlocksList();
  renderEmbeddedPartnersList();
  renderAdminNoticesList();
  renderAdminPartnersList();
  renderAdminResourcesList();
  renderExistingResourcesList();
  renderAdminEventsList();
  renderLinkAuditList();
  renderErrorReportsList();
  renderMessagesList();
  loadSettingsIntoForm();
}

/* ---------- Admin panel: Staff access ----------
   Who may sign in. Two sources, and the difference matters to the person
   reading the list:

     Built-in  - written into the Firestore security rules. Not removable
                 from here, by design: they are the way back in if this list
                 is ever emptied. Changing them means editing the rules.
     Added     - a document in the `staff` collection, one per address,
                 doc id = the lowercased address. This tab writes those.

   The built-in addresses are deliberately NOT listed in this file. This file
   is public: six real staff addresses in page source would be harvested by
   scrapers, which is the whole reason STAFF_EMAIL_HASHES above holds hashes
   rather than addresses. So the panel never enumerates them from code. Each
   built-in account records itself in the `staff` collection the first time it
   signs in - see ensureOwnStaffRecord() - and the tab lists it from there,
   flagged built_in so it is shown but not removable. The collection is
   staff-only to read, so the addresses stay out of public reach.

   Consequence, stated plainly in the tab: a built-in account that has not
   signed in since this went live is not in the list yet. It still has full
   access - the rules grant it - it simply has not introduced itself.

   Every guard below is a courtesy to the person clicking, not a security
   control. The rules decide; they apply the same two sources on the server
   for every read and write, including the writes this tab makes. */

let STAFF_COLLECTION_CACHE = null;   // null = not loaded yet

// Built-in means "in the rules", and the only copy of that list this file has
// is the hash list used for sign-in. Async because hashing is.
async function staffIsBuiltIn(email){
  try{
    return STAFF_EMAIL_HASHES.includes(await sha256Hex(staffDocId(email)));
  }catch(e){
    return false;
  }
}

// Deliberately permissive - Firebase Auth, not this, decides what is a real
// address. This only catches the obvious typo before a pointless write.
function staffEmailLooksValid(email){
  const e = staffDocId(email);
  return e.length > 2 && e.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
      && !/[\/#?\[\]*]/.test(e);   // characters Firestore will not take in a doc id
}

/* Best-effort self-registration, run once per sign-in AFTER access has already
   been decided. It exists so a built-in account appears in the Staff tab
   without any address ever being written into this file. It must never affect
   whether someone gets in: every failure is swallowed. */
async function ensureOwnStaffRecord(){
  if(!adminUser || !adminUser.email || !firebaseReady || !window.__fbFirestore) return;
  const id = staffDocId(adminUser.email);
  if(!id) return;
  const fs = window.__fbFirestore;
  try{
    const snap = await fs.getDoc(fs.doc(fbDb, 'staff', id));
    const builtIn = await staffIsBuiltIn(id);
    if(snap.exists()){
      // Only ever ADD the flag to an existing record; never rewrite it.
      if(builtIn && snap.data() && snap.data().built_in !== true){
        await fs.setDoc(fs.doc(fbDb, 'staff', id), { built_in:true }, { merge:true });
      }
      return;
    }
    if(!builtIn) return;   // a non-built-in account with no record is not staff
    await fs.setDoc(fs.doc(fbDb, 'staff', id), {
      email: id, built_in: true, added_by: 'built-in', added_at: new Date().toISOString()
    }, { merge:true });
  }catch(e){
    console.warn('[CJHQ] could not record this account in the staff list:', e);
  }
}

async function fetchStaffCollection(){
  if(!firebaseReady || !window.__fbFirestore) return [];
  const fs = window.__fbFirestore;
  try{
    const snap = await fs.getDocs(fs.collection(fbDb, 'staff'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }catch(e){
    console.warn('[CJHQ] could not read the staff list:', e);
    return null;   // distinct from "empty" - the UI says which
  }
}

function staffRowHtml(rec){
  const email = rec.id;
  const builtIn = rec.built_in === true;
  const isYou = adminUser && staffDocId(adminUser.email) === email;
  const badge = builtIn
    ? '<span style="font-size:.72rem; font-weight:600; color:#6B7280; border:1px solid #D1D5DB; border-radius:99px; padding:2px 8px;">Built-in</span>'
    : '<span style="font-size:.72rem; font-weight:600; color:#2E7D32; border:1px solid #A9CBA9; border-radius:99px; padding:2px 8px;">Added</span>';
  const you = isYou ? ' <span style="font-size:.72rem; color:var(--muted);">(you)</span>' : '';
  const action = builtIn
    ? '<span style="font-size:.78rem; color:var(--muted);">Edit in the Firebase console</span>'
    : (ADM_OWN_ROLE === 'editor'
        ? ''
        : isYou
        ? '<span style="font-size:.78rem; color:var(--muted);">You cannot remove yourself</span>'
        : '<button class="btn admin-btn-outline" type="button" data-staff-remove="' +
          cjhqEscapeHtml(email) + '" style="font-size:.8rem;">Remove</button>');
  const meta = staffAddedMeta(rec);
  const role = builtIn ? 'owner' : admRoleOf(rec);
  const roleCtl = (builtIn || isYou || ADM_OWN_ROLE !== 'owner')
    ? '<span style="font-size:.76rem; font-weight:600; color:var(--ink);">' + (role === 'owner' ? 'Owner' : 'Editor') + '</span>'
    : '<select class="admin-input" data-staff-role="' + cjhqEscapeHtml(email) + '" aria-label="Role for ' + cjhqEscapeHtml(email) + '" style="width:auto; padding:4px 8px; font-size:.8rem;">' +
      '<option value="owner"' + (role === 'owner' ? ' selected' : '') + '>Owner</option>' +
      '<option value="editor"' + (role === 'editor' ? ' selected' : '') + '>Editor</option></select>';
  return '<div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; ' +
         'border:1px solid var(--line); border-radius:8px; padding:10px 14px; margin-bottom:8px;">' +
         '<span style="flex:1 1 240px; font-size:.9rem; word-break:break-all;">' +
         cjhqEscapeHtml(email) + you + '</span>' + badge + roleCtl +
         (meta ? '<span style="font-size:.76rem; color:var(--muted); flex:1 1 160px;">' +
                 cjhqEscapeHtml(meta) + '</span>' : '') +
         '<span>' + action + '</span></div>';
}

function staffAddedMeta(rec){
  if(rec && rec.built_in === true) return 'in the security rules';
  const by = rec && rec.added_by ? 'added by ' + rec.added_by : '';
  const on = rec && rec.added_at ? String(rec.added_at).slice(0, 10) : '';
  return [by, on].filter(Boolean).join(' · ');
}

async function renderStaffList(){
  const box  = document.getElementById('staffList');
  const note = document.getElementById('staffBuiltInNote');
  if(!box) return;
  box.innerHTML = '<p style="font-size:.86rem; color:var(--muted);">Loading…</p>';

  await admLoadOwnRole();
  const rows = await fetchStaffCollection();
  STAFF_COLLECTION_CACHE = rows;

  if(rows === null){
    box.innerHTML = '<p style="font-size:.86rem; color:#A23B3B;">Could not read the staff list. ' +
      'Check your connection and reopen this tab. Nobody\'s access has changed.</p>';
    if(note) note.style.display = 'none';
    return;
  }

  const builtIn = rows.filter(r => r.built_in === true).sort((a, b) => a.id.localeCompare(b.id));
  const added   = rows.filter(r => r.built_in !== true).sort((a, b) => a.id.localeCompare(b.id));
  const total   = builtIn.length + added.length;

  // The list is honest about what it can and cannot see. It shows built-in
  // accounts that have signed in; it cannot show the ones that have not.
  if(note) note.style.display = 'block';

  box.innerHTML =
    (total === 0
      ? '<p style="font-size:.88rem; color:var(--muted);">No accounts are listed yet. ' +
        'Built-in accounts appear here the first time each one signs in.</p>'
      : builtIn.map(staffRowHtml).join('') + added.map(staffRowHtml).join('')) +
    (total
      ? '<p style="font-size:.8rem; color:var(--muted); margin-top:10px;">' + total +
        ' account' + (total === 1 ? '' : 's') + ' listed' +
        (added.length ? ', ' + added.length + ' added from here' : '') + '.</p>'
      : '');
}

function showStaffMsg(text, bad){
  const el = document.getElementById('staffAddMsg');
  if(!el) return;
  el.textContent = text;
  el.style.color = bad ? '#A23B3B' : '#2E7D32';
  el.style.display = text ? 'block' : 'none';
}

async function addStaffMember(emailRaw){
  const email = staffDocId(emailRaw);
  if(!staffEmailLooksValid(email)){
    showStaffMsg('That does not look like an email address. Check it and try again.', true);
    return false;
  }
  if(await staffIsBuiltIn(email)){
    showStaffMsg(email + ' already has access as a built-in account.', true);
    return false;
  }
  if((STAFF_COLLECTION_CACHE || []).some(r => r.id === email)){
    showStaffMsg(email + ' already has access.', true);
    return false;
  }
  if(!firebaseReady || !window.__fbFirestore){
    showStaffMsg('Not connected to the database, so nothing was saved.', true);
    return false;
  }
  const fs = window.__fbFirestore;
  try{
    await fs.setDoc(fs.doc(fbDb, 'staff', email), {
      email,
      role: 'editor',
      added_by: (adminUser && adminUser.email) || 'unknown',
      added_at: new Date().toISOString()
    });
  }catch(err){
    reportSaveFailure('staff', err);
    return false;
  }
  showStaffMsg(email + ' can now sign in to this panel as an Editor (everything except the staff list). Change the role below if they should be an Owner. Let them know — nothing was emailed.', false);
  await renderStaffList();
  return true;
}

async function removeStaffMember(emailRaw){
  const email = staffDocId(emailRaw);
  if(await staffIsBuiltIn(email)){
    admToast('This is a built-in account. Removing it here would change nothing, because the ' +
          'security rules grant it access directly. To change that, edit the rules in the ' +
          'Firebase console.');
    return false;
  }
  if(adminUser && staffDocId(adminUser.email) === email){
    admToast('You cannot remove your own access from here. Ask another staff member to do it.');
    return false;
  }
  if(!firebaseReady || !window.__fbFirestore){
    admToast('Not connected to the database. Nothing was changed.');
    return false;
  }
  if(!(await admConfirm('Remove access for ' + email + '?\n\nThey will no longer be able to sign in to the admin panel. ' +
              'Nothing they have already saved is affected, and you can add them again at any time.'))) return false;
  const fs = window.__fbFirestore;
  try{
    await fs.deleteDoc(fs.doc(fbDb, 'staff', email));
  }catch(err){
    reportSaveFailure('staff', err);
    return false;
  }
  showStaffMsg(email + ' no longer has access.', false);
  await renderStaffList();
  return true;
}

function switchAdminTab(tab){
  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    const on = b.dataset.tab===tab;
    b.classList.toggle('active', on);
    if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.admin-tab-panel').forEach(p => p.style.display = (p.id === 'tab-'+tab) ? 'block' : 'none');
  admSyncMenuLabel(tab);
  admCloseMenu();
  if(tab === 'home') renderAdminDashboard();
  if(tab === 'history') renderAdminHistory();
  // Read the staff list when the tab is opened rather than on every panel
  // load: it is one collection read, and most sessions never look at it.
  if(tab === 'staff'){ showStaffMsg('', false); renderStaffList(); }
}


async function renderPagesList(){
  const hidden = await fetchCollection('page_settings');
  HIDDEN_PAGES_CACHE = Object.fromEntries(hidden.map(h => [h.pageId, h]));
  const list = document.getElementById('pagesList');
  list.innerHTML = SITE_PAGES.map(p => {
    const isHidden = HIDDEN_PAGES_CACHE[p.id] && HIDDEN_PAGES_CACHE[p.id].hidden;
    return `
    <div class="card admin-row" style="${isHidden?'opacity:.55;':''}">
      <div><p style="margin:0; font-weight:600;">${p.en}${isHidden ? ' <span style="color:#A23B3B; font-weight:600; font-size:.75rem;">(deactivated)</span>' : ''}</p>
        <p style="margin:2px 0 0; font-size:.8rem; color:var(--muted);">${p.fr} · #${p.id}</p></div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="admin-small-btn" onclick="window.open(location.origin + pathForPage('${p.id}'), '_blank')">View</button>
        <button class="admin-small-btn" onclick="toggleBuiltInPageHidden('${p.id}')">${isHidden ? 'Reactivate' : 'Deactivate'}</button>
      </div>
    </div>`;
  }).join('');
}
async function toggleBuiltInPageHidden(pageId){
  if(pageId === 'home'){ admToast("The Home page can't be deactivated, since it's where visitors land by default."); return; }
  const existing = HIDDEN_PAGES_CACHE[pageId] || {};
  await saveToCollection('page_settings', { id: pageId, pageId, hidden: !existing.hidden });
  await enhancePagesFromBackend();
  renderPagesList();
  refreshNav();
}

/* ---------- Admin panel: Custom Pages ---------- */
async function renderCustomPagesList(){
  // Staff see every page, whatever its state - that is the point of the
  // Expired badge. Only the public split is filtered.
  const pages = await fetchCollection('custom_pages');
  CUSTOM_PAGES_CACHE = Object.fromEntries(pages.map(p => [p.slug, p]));
  const list = document.getElementById('customPagesList');
  const stale = pages.filter(cjhqPageNeedsBackfill);
  const bar = document.getElementById('customPageBackfillBar');
  if(bar){
    bar.style.display = stale.length ? 'block' : 'none';
    const msg = document.getElementById('customPageBackfillMsg');
    if(msg) msg.textContent = stale.length +
      ' page(s) were created before start and end dates existed and will not appear on the website until they are updated: ' +
      stale.map(p => '#' + p.slug).join(', ') + '.';
  }
  if(!pages.length){ list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No custom pages added yet.</p>`; return; }
  list.innerHTML = pages.map(p => {
    const state = cjhqPageLifecycle(p);
    const live = state === 'live';
    return `
    <div class="card admin-row" style="${live ? '' : 'opacity:.62;'}">
      <div>
        <p style="margin:0; font-weight:600;">${p.title_en} ${cjhqPageStatusPill(state)}${p.show_in_nav ? ' <span class="pill" style="font-size:.65rem;">in nav</span>' : ''}${live && p.show_on_home ? ' <span class="pill" style="font-size:.65rem;">on homepage</span>' : ''}</p>
        <p style="margin:2px 0 0; font-size:.8rem; color:var(--muted);">${cjhqPageAddressLine(p, state)} &middot; ${cjhqPageWindowLabel(p)}</p>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="admin-small-btn" onclick="window.open(location.origin + pathForPage('${p.slug}'), '_blank')">View</button>
        <button class="admin-small-btn" data-copy-share="${p.slug}">Copy Link</button>
        <button class="admin-small-btn" onclick="editCustomPage('${p.slug}')">Edit</button>
        <button class="admin-small-btn" style="color:#A23B3B;" onclick="deleteCustomPage('${p.slug}')">Delete</button>
      </div>
    </div>`; }).join('');
}

/* Pages created before the lifecycle existed carry none of its fields. They
   cannot satisfy the public query, so they need one write to bring them in
   line. It is offered as a button rather than done silently: it changes stored
   data, and the editor should know it happened. Defaults preserve exactly what
   those pages did before - published, no dates, not promoted. */
function cjhqPageNeedsBackfill(p){ return typeof p.public_until_ms !== 'number'; }

async function backfillCustomPageLifecycle(){
  const stale = Object.values(CUSTOM_PAGES_CACHE).filter(cjhqPageNeedsBackfill);
  if(!stale.length) return;
  if(!(await admConfirm('Update ' + stale.length + ' existing page(s) so they work with start and end dates?\n\n' +
              'They stay exactly as they are now: published, with no dates and not on the homepage.'))) return;
  for(const p of stale){
    await saveToCollection('custom_pages', Object.assign({}, p, {
      id: p.slug,
      published: p.published !== false,
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      show_on_home: !!p.show_on_home,
      home_style: p.home_style || 'tile',
      public_until_ms: cjhqEndOfDayMs(p.end_date)
    }));
  }
  await enhancePagesFromBackend();
  renderCustomPagesList();
  admToast('Updated ' + stale.length + ' page(s).');
}

/* The four states, said plainly and coloured the same way everywhere. */
const CJHQ_PAGE_STATUS = {
  draft:     { label:'Draft',     colour:'#6B7280', note:'Not published. Nobody but you can see it.' },
  scheduled: { label:'Scheduled', colour:'#8A6D1F', note:'Published, but its start date has not arrived.' },
  live:      { label:'Live',      colour:'#2E7D32', note:'Public right now.' },
  expired:   { label:'Expired',   colour:'#A23B3B', note:'Past its end date. Removed from the website, still editable here.' }
};
function cjhqPageStatusPill(state){
  const m = CJHQ_PAGE_STATUS[state] || CJHQ_PAGE_STATUS.draft;
  return `<span class="pill" style="font-size:.65rem; background:${m.colour}; color:#fff;">${m.label}</span>`;
}
/* While a page is live its real address is worth showing in full, so it can be
   copied into an email or a WhatsApp message without anyone having to assemble
   it. While it is not live there is no address to give out, and saying so is
   more useful than printing a link that answers 404. */
/* Copy the share link straight from the list, so posting a notice does not
   mean opening the editor. Delegated once rather than an onclick per row. */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest && e.target.closest('[data-copy-share]');
  if(!btn) return;
  const url = cjhqShareUrl(btn.getAttribute('data-copy-share'));
  if(!url) return;
  const ok = await cjhqCopyText(url);
  const original = btn.textContent;
  btn.textContent = ok ? 'Link copied' : 'Copy failed';
  setTimeout(() => { btn.textContent = original; }, 2000);
});

function cjhqPageAddressLine(p, state){
  const url = location.origin + pathForPage(p.slug);
  if(state === 'live'){
    return `<a href="${cjhqEscapeHtml(url)}" target="_blank" rel="noopener">${cjhqEscapeHtml(url)}</a>`;
  }
  const why = { draft:'not published', scheduled:'not public yet', expired:'no longer public' }[state] || '';
  return `<span style="text-decoration:line-through;">${cjhqEscapeHtml(url)}</span> <em>(${why})</em>`;
}
function cjhqPageWindowLabel(p){
  const from = String(p.start_date || '').trim(), to = String(p.end_date || '').trim();
  if(from && to) return from + ' to ' + to;
  if(from) return 'from ' + from + ', no end date';
  if(to)   return 'until ' + to;
  return 'no start or end date';
}
/* Live preview under the date fields, so the editor sees the consequence of
   what they typed before they save it. */
/* ---------- Share link for a temporary page ----------
   A temporary page has no file of its own on GitHub Pages, so its own address
   answers 404 to a social crawler and shows no preview card. The Notice Pages
   workflow (tools/generate-notice-pages.py) commits a real preview file for
   every LIVE temporary page at /notice/<slug> - the page's own title,
   description and card - which forwards the human visitor to the page itself
   through the existing router. So the address to POST is /notice/<slug>.

   Files regenerate every 15 minutes, so a brand-new page's preview file can
   lag publication by a few minutes; a click in that window is bounced by
   404.html to the generic bridge. Links already posted as /notice?p=<slug>
   keep working: notice.html stays as the generic-card bridge.

   Nothing new is stored for this. The share URL is derived from the slug the
   page already has, every time it is displayed, so it cannot drift - rename the
   page and the link follows. SITE_BASE_PATH is honoured exactly as pathForPage
   does, so this is correct on cjhq.org and on the GitHub project address. */
function cjhqShareUrl(slug){
  const s = String(slug || '').trim().toLowerCase();
  if(!s) return '';
  /* The direct address IS the share link: a static preview file with the
     page's own og tags lives at /<slug> (generated by the Notice Pages
     workflow), and human visitors are forwarded from it into the SPA. */
  return location.origin + SITE_BASE_PATH + '/' + encodeURIComponent(s);
}
function cjhqPageUrl(slug){
  const s = String(slug || '').trim().toLowerCase();
  if(!s) return '';
  return location.origin + pathForPage(s);
}

/* Clipboard, without assuming the modern API is there. navigator.clipboard is
   undefined outside a secure context and can reject even inside one, so the
   old textarea trick stays as the fallback rather than leaving the button
   silently doing nothing. */
async function cjhqCopyText(text){
  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch(e){ /* fall through */ }
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed; top:0; left:-9999px; opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){ return false; }
}

// A quiet inline confirmation next to the button, not an alert - the rest of
// this panel only alerts for failures and confirmations, never for success.
function cjhqFlashMsg(el, text, bad){
  if(!el) return;
  el.textContent = text;
  el.style.color = bad ? '#A23B3B' : '#2E7D32';
  el.style.opacity = '1';
  clearTimeout(el.__t);
  el.__t = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}

function updateCustomPageShareBox(){
  const box = document.getElementById('customPageShareBox');
  if(!box) return;
  const slugEl = document.getElementById('customPageSlug');
  // Same normalisation the save handler applies, so what is shown is what will
  // be saved rather than what was typed.
  const slug = String((slugEl && slugEl.value) || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const share = cjhqShareUrl(slug);
  const set = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  if(!slug){
    box.dataset.ready = '0';
    set('customPageShareUrl', 'Enter a page address above to get the share link.');
  } else {
    box.dataset.ready = '1';
    set('customPageShareUrl', share);
  }
  ['customPageShareCopy','customPageShareOpen','customPageShareWhatsApp','customPageShareEmail'].forEach(id => {
    const b = document.getElementById(id);
    if(b) b.disabled = !slug;
  });
  box.__share = share;
}
window.updateCustomPageShareBox = updateCustomPageShareBox;

function updateCustomPageStatusPreview(){
  const el = document.getElementById('customPageStatusPreview');
  if(!el) return;
  const pub = document.getElementById('customPagePublished');
  const draft = {
    published: pub ? pub.checked : true,
    start_date: (document.getElementById('customPageStart')||{}).value || '',
    end_date: (document.getElementById('customPageEnd')||{}).value || ''
  };
  if(draft.start_date && draft.end_date && draft.end_date < draft.start_date){
    el.innerHTML = `<span style="color:#A23B3B; font-weight:600;">End Date is before Start Date</span>
      <span style="color:var(--muted);"> — the page would never be public.</span>`;
    return;
  }
  const state = cjhqPageLifecycle(draft);
  const m = CJHQ_PAGE_STATUS[state];
  el.innerHTML = `Status if saved now: ${cjhqPageStatusPill(state)}
    <span style="color:var(--muted);"> ${m.note} (${cjhqPageWindowLabel(draft)})</span>`;
}
function editCustomPage(slug){
  const p = CUSTOM_PAGES_CACHE[slug];
  if(!p) return;
  document.getElementById('customPageId').value = p.slug;
  document.getElementById('customPageSlug').value = p.slug;
  document.getElementById('customPageSlug').disabled = true;
  document.getElementById('customPageTitleEn').value = p.title_en || '';
  document.getElementById('customPageTitleFr').value = p.title_fr || '';
  document.getElementById('customPageBodyEn').value = p.body_en || '';
  document.getElementById('customPageBodyFr').value = p.body_fr || '';
  // No body_format means the page predates the switch, and what it holds is
  // HTML - which is what it was always rendered as.
  const isText = p.body_format === 'text';
  document.getElementById('customPageFormatText').checked = isText;
  document.getElementById('customPageFormatHtml').checked = !isText;
  if(window.updateCustomPageFormatHint) updateCustomPageFormatHint();
  document.getElementById('customPageShowNav').checked = !!p.show_in_nav;
  document.getElementById('customPageNavLabelFields').style.display = p.show_in_nav ? 'block' : 'none';
  document.getElementById('customPageNavEn').value = p.nav_en || '';
  document.getElementById('customPageNavFr').value = p.nav_fr || '';
  // A page saved before this feature existed has no `published` field and was
  // public by existing, so it loads as published rather than silently becoming
  // a draft the first time someone opens it.
  document.getElementById('customPagePublished').checked = p.published !== false;
  document.getElementById('customPageStart').value = p.start_date || '';
  document.getElementById('customPageEnd').value = p.end_date || '';
  document.getElementById('customPageShowHome').checked = !!p.show_on_home;
  document.getElementById('customPageHomeFields').style.display = p.show_on_home ? 'block' : 'none';
  document.getElementById('customPageHomeStyle').value = p.home_style || 'tile';
  document.getElementById('customPageHomeCtaEn').value = p.home_cta_en || '';
  document.getElementById('customPageHomeCtaFr').value = p.home_cta_fr || '';
  document.getElementById('customPageHomeBlurbEn').value = p.home_blurb_en || '';
  document.getElementById('customPageHomeBlurbFr').value = p.home_blurb_fr || '';
  updateCustomPageStatusPreview();
  updateCustomPageShareBox();
  if(window.syncHomeCtaPlaceholders) syncHomeCtaPlaceholders();
  if(window.renderCustomPagePreview) renderCustomPagePreview();
  // Bring the EDITOR into view, not the top of the admin page. The form sits
  // below a long list of pages, so scrolling to the top left the editor off
  // screen and looked as though Edit had done nothing.
  const form = document.getElementById('customPageForm');
  if(form && form.scrollIntoView) form.scrollIntoView({ behavior:'smooth', block:'start' });
  const firstField = document.getElementById('customPageTitleEn');
  if(firstField) try{ firstField.focus({ preventScroll:true }); }catch(e){ /* older browsers */ }
}
async function deleteCustomPage(slug){
  if(!(await admConfirm('Permanently delete this page? This cannot be undone.'))) return;
  await deleteFromCollection('custom_pages', slug);
  await enhancePagesFromBackend();
  await syncPublicPageIndex();
  renderCustomPagesList();
  refreshNav();
}


/* ---------- Admin panel: Page Content editor ---------- */
let CONTENT_OVERRIDES_CACHE = {};
function initContentEditorPageSelect(){
  const sel = document.getElementById('contentPageSelect');
  if(sel.dataset.built) return;
  sel.dataset.built = '1';
  const seen = new Set();
  CONTENT_MANIFEST.forEach(m => {
    if(seen.has(m.page)) return;
    seen.add(m.page);
    const opt = document.createElement('option');
    opt.value = m.page; opt.textContent = m.pageLabel;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', renderContentBlocksList);
}
async function renderContentBlocksList(){
  initContentEditorPageSelect();
  const overrides = await fetchCollection('content_overrides');
  CONTENT_OVERRIDES_CACHE = Object.fromEntries(overrides.map(o => [o.cid, o]));
  const drafts = await fetchCollection('content_drafts');
  const DRAFTS = Object.fromEntries(drafts.map(d => [d.cid || d.id, d]));
  const selectedPage = document.getElementById('contentPageSelect').value || CONTENT_MANIFEST[0].page;
  document.getElementById('contentPageSelect').value = selectedPage;
  const blocks = CONTENT_MANIFEST.filter(m => m.page === selectedPage);
  const list = document.getElementById('contentBlocksList');
  list.innerHTML = blocks.map(m => {
    const ov = CONTENT_OVERRIDES_CACHE[m.cid];
    const hasOverride = !!ov;
    const dr = DRAFTS[m.cid];
    return `
    <div class="card" style="margin-bottom:12px;">
      <div class="admin-row" style="align-items:flex-start;">
        <span class="pill" style="font-size:.68rem;">${m.tag}${hasOverride ? ' · edited' : ''}</span>
        ${dr ? `<span class="pill" style="font-size:.68rem; background:#FFF3CD; color:#7A5B00;">Draft · not live yet</span>` : ''}
      </div>
      <p style="font-size:.78rem; color:var(--muted); margin:6px 0 8px; font-style:italic;">"${m.label}${m.label.length>=70?'…':''}"</p>
      <label class="admin-label">English</label>
      <textarea class="admin-input" rows="2" data-cid="${m.cid}" data-lang="en">${dr ? (dr.en||'') : hasOverride ? (ov.en||'') : m.default_en}</textarea>
      <label class="admin-label">French</label>
      <textarea class="admin-input" rows="2" data-cid="${m.cid}" data-lang="fr">${dr ? (dr.fr||'') : hasOverride ? (ov.fr||'') : m.default_fr}</textarea>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="admin-small-btn" onclick="saveContentBlock('${m.cid}')">${dr ? 'Publish' : 'Save'}</button>
        <button class="admin-small-btn" type="button" onclick="admSaveContentDraft('${m.cid}')">Save as draft</button>
        ${dr ? `<button class="admin-small-btn" type="button" onclick="admDiscardContentDraft('${m.cid}')">Discard draft</button>` : ''}
        <button class="admin-small-btn" type="button" onclick="admToggleBlockPreview('${m.cid}')">Preview</button>
        ${hasOverride ? `<button class="admin-small-btn" style="color:#A23B3B;" onclick="resetContentBlock('${m.cid}')">Reset to Default</button>` : ''}
      </div>
      <div class="adm-block-preview" data-preview-cid="${m.cid}" hidden style="margin-top:10px; border:1px dashed var(--line,#d8d8d8); border-radius:8px; padding:10px 12px; background:#fcfcfa;"></div>
    </div>`;
  }).join('');
  if(!list.__admPreviewWired){
    list.__admPreviewWired = true;
    list.addEventListener('input', e=>{
      const cid = e.target && e.target.getAttribute && e.target.getAttribute('data-cid');
      if(cid) admRenderBlockPreview(cid);
    });
  }
}
/* Preview a Page Content block before saving. Shows both languages as they
   would read on the page, from what is typed now. A blank field previews the
   original wording, because that is what visitors get for a blank field. */
function admRenderBlockPreview(cid){
  const box = document.querySelector(`[data-preview-cid="${cid}"]`);
  if(!box || box.hidden) return;
  const m = CONTENT_MANIFEST.find(x => x.cid === cid) || {};
  const get = lang => (document.querySelector(`textarea[data-cid="${cid}"][data-lang="${lang}"]`) || {}).value || '';
  const en = get('en') || m.default_en || '';
  const fr = get('fr') || m.default_fr || '';
  const sp = cjhqSanitizeHtml;
  const lab = t => `<div style="font-size:.7rem; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin:6px 0 2px;">${t}</div>`;
  box.innerHTML = `<div style="font-size:.72rem; color:#7A5B00;">Preview · not saved</div>${lab('English')}<div>${sp(en)}</div>${lab('Français')}<div>${sp(fr)}</div>`;
}
function admToggleBlockPreview(cid){
  const box = document.querySelector(`[data-preview-cid="${cid}"]`);
  if(!box) return;
  box.hidden = !box.hidden;
  if(!box.hidden) admRenderBlockPreview(cid);
}
async function saveContentBlock(cid){
  const enVal = document.querySelector(`textarea[data-cid="${cid}"][data-lang="en"]`).value;
  const frVal = document.querySelector(`textarea[data-cid="${cid}"][data-lang="fr"]`).value;
  await saveToCollection('content_overrides', { id: cid, cid, en: enVal, fr: frVal });
  // Publishing a block clears its draft, if it had one.
  try{ if((localCache.content_drafts || []).some(d => (d.cid || d.id) === cid)) await deleteFromCollection('content_drafts', cid); }catch(e){}
  admToast('Saved. Visitors see this now.');
  await applyContentOverrides();
  renderContentBlocksList();
}
async function resetContentBlock(cid){
  if(!(await admConfirm('Reset this block to the site\'s original wording?'))) return;
  await deleteFromCollection('content_overrides', cid);
  const m = CONTENT_MANIFEST.find(x => x.cid === cid);
  const el = document.querySelector(`[data-cid="${cid}"]`);
  if(el && m){
    const enSpan = el.querySelector('span[data-en]');
    const frSpan = el.querySelector('span[data-fr]');
    if(enSpan) enSpan.innerHTML = m.default_en;
    if(frSpan) frSpan.innerHTML = m.default_fr;
  }
  renderContentBlocksList();
}

/* ---------- Admin panel: Notices ---------- */
async function renderAdminNoticesList(){
  const live = await fetchCollection('notices');
  const drafts = (await fetchCollection('notice_drafts')).map(n => ({ ...n, draft:true, __src:'notice_drafts' }));
  const notices = drafts.concat(live);
  const list = document.getElementById('noticesList');
  if(!notices.length){ list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No notices yet.</p>`; return; }
  list.innerHTML = notices.map(n => `
    <div class="card admin-row">
      <div>
        <span class="pill" style="font-size:.7rem; margin-bottom:6px; display:inline-block;">${n.type} · ${n.style} ${n.active ? '' : '· inactive'}${n.draft ? ' · draft' : ''}</span>
        <p style="margin:4px 0 0; font-weight:600;">${n.title_en || '(no title)'}</p>
        <p style="margin:2px 0 0; font-size:.85rem; color:var(--muted);">${n.body_en || ''}</p>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="admin-small-btn" onclick="editNotice('${n.id}')">Edit</button>
        <button class="admin-small-btn" style="color:#A23B3B;" onclick="removeNotice('${n.id}')">Delete</button>
      </div>
    </div>`).join('');
}
async function editNotice(id){
  let src = 'notices';
  let n = (await fetchCollection('notices')).find(x=>x.id===id);
  if(!n){ n = (await fetchCollection('notice_drafts')).find(x=>x.id===id); src = 'notice_drafts'; }
  if(!n) return;
  document.getElementById('noticeId').value = n.id;
  document.getElementById('noticeSource').value = src;
  document.getElementById('noticeType').value = n.type;
  document.getElementById('noticeStyle').value = n.style;
  document.getElementById('noticeTitleEn').value = n.title_en||'';
  document.getElementById('noticeTitleFr').value = n.title_fr||'';
  document.getElementById('noticeBodyEn').value = n.body_en||'';
  document.getElementById('noticeBodyFr').value = n.body_fr||'';
  document.getElementById('noticeActive').checked = !!n.active;
  document.getElementById('noticeDraft').checked = !!n.draft;
  document.getElementById('noticeStartsOn').value = n.startsOn || '';
  document.getElementById('noticeEndsOn').value = n.endsOn || '';
  window.scrollTo({top:0, behavior:'smooth'});
}
async function removeNotice(id){
  if(!(await admConfirm('Delete this notice? You can bring it back from Change History.'))) return;
  const isDraft = (localCache.notice_drafts || []).some(x => x.id === id);
  await deleteFromCollection(isDraft ? 'notice_drafts' : 'notices', id);
  renderAdminNoticesList();
}

/* ---------- Admin panel: Settings ---------- */
async function loadSettingsIntoForm(){
  const s = await fetchSettingsDoc();
  if(!s) return;
  const set = (id, val) => { const el = document.getElementById(id); if(el && val!=null) el.value = val; };
  set('setOrgEn', s.org_en); set('setOrgFr', s.org_fr);
  set('setAddrEn', s.addr_en); set('setAddrFr', s.addr_fr);
  set('setPhone', s.phone); set('setEmail', s.email);
  set('setFacebook', s.facebook); set('setX', s.x_url);
  set('setTaglineEn', s.tagline_en); set('setTaglineFr', s.tagline_fr);
  set('setLogoUrl', s.logo_url);
  set('setColorPrimary', s.color_primary || '#0E2149');
  set('setColorAccent', s.color_accent || '#2F4C7A');
}

/* ---------- Admin panel: Partners ---------- */
async function renderEmbeddedPartnersList(){
  const list = document.getElementById('embeddedPartnersList');
  if(!list) return;
  const overrides = await fetchCollection('partner_overrides');
  PARTNER_OVERRIDES_CACHE = Object.fromEntries(overrides.map(o => [o.key, o]));
  const base = PARTNERS_DATA_BASE || PARTNERS_DATA;
  list.innerHTML = base.map(p => {
    const key = p.type === 'img' ? p.alt : p.name;
    const name = key;
    const ov = PARTNER_OVERRIDES_CACHE[key];
    const isHidden = ov && ov.hidden;
    const currentUrl = (ov && ov.url !== undefined) ? ov.url : (p.url || '');
    const safeKey = key.replace(/'/g, "\\'");
    return `
    <div class="card" style="margin-bottom:8px; ${isHidden?'opacity:.55;':''}">
      <div class="admin-row" style="align-items:flex-start;">
        <div>
          <p style="margin:0; font-weight:600; font-size:.9rem;">${name}${isHidden ? ' <span style="color:#A23B3B; font-weight:600; font-size:.75rem;">(hidden)</span>' : ''}</p>
          <p style="margin:3px 0 0; font-size:.75rem;">${partnerContactBadge(ov || {})}</p>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button class="admin-small-btn" onclick="togglePartnerLinkEditor('${btoa(key).replace(/=/g,'')}')">Edit Link</button>
          <button class="admin-small-btn" onclick="partnerContactEditor('${safeKey}')">Edit Contact Information</button>
          <button class="admin-small-btn" onclick="togglePartnerHidden('${safeKey}')">${isHidden ? 'Unhide' : 'Hide'}</button>
        </div>
      </div>
      <div id="editor-partner-${btoa(key).replace(/=/g,'')}" class="partner-link-editor" style="display:none; margin-top:10px; border-top:1px solid var(--line); padding-top:10px;">
        <label class="admin-label">Website URL</label>
        <input type="text" class="admin-input" id="ov-purl-${btoa(key).replace(/=/g,'')}" value="${currentUrl.replace(/"/g,'&quot;')}" placeholder="https://...">
        <button class="admin-small-btn" style="margin-top:8px;" onclick="savePartnerLinkOverride('${safeKey}', '${btoa(key).replace(/=/g,'')}')">Save Link</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- Partner contact directory (admin) ----------
   Writes to the existing partner_overrides collection, keyed by the same
   organization name the marquee already uses. PARTNERS_DATA, the logos and the
   public marquee are untouched: this information is supplemental.

   Verification is the point of this screen. Ask CJHQ speaks a number only when
   contactVerified is true, so entering a number here does nothing until a
   staff member has actually confirmed it against the organization. */

function partnerContactBadge(ov){
  const o = {
    phone: ov.phone || '', emergencyPhone: ov.emergencyPhone || '',
    nonEmergencyPhone: ov.nonEmergencyPhone || '', email: ov.email || '',
    contactVerified: ov.contactVerified === true
  };
  const state = (typeof askOrgContactState === 'function')
    ? askOrgContactState(o)
    : (!(o.phone || o.emergencyPhone || o.nonEmergencyPhone || o.email) ? 'none'
       : (o.contactVerified ? 'verified' : 'pending'));
  if(state === 'verified'){
    return '<span style="color:#2E6B4F; font-weight:600;">VERIFIED</span>'
         + (ov.contactVerifiedDate ? ' <span style="color:var(--muted);">' + cjhqEscapeHtml(ov.contactVerifiedDate) + '</span>' : '');
  }
  if(state === 'pending'){
    // Name what has been entered, so the reviewer knows what they are checking.
    const have = [];
    if(o.phone) have.push('phone');
    if(o.nonEmergencyPhone) have.push('non-emergency');
    if(o.emergencyPhone) have.push('emergency');
    if(o.email) have.push('email');
    return '<span style="color:#8A6A1F; font-weight:600;">PENDING REVIEW</span>'
         + ' <span style="color:var(--muted);">' + have.join(' + ') + ' entered, not yet verified</span>';
  }
  // Deliberately NOT called "incomplete". Most of these organizations have no
  // emergency line, and calling that a gap invites someone to fill it in.
  return '<span style="color:var(--muted); font-weight:600;">NO CONTACT INFO</span>';
}

function partnerContactEditor(key){
  const ov = PARTNER_OVERRIDES_CACHE[key] || {};
  const box = document.getElementById('partnerContactEditorBox');
  if(!box) return;
  const v = (x) => cjhqEscapeHtml(x == null ? '' : String(x));
  const field = (id, label, val, ph) =>
    '<label class="admin-label">' + label + '</label>'
    + '<input type="text" class="admin-input" id="pc-' + id + '" value="' + v(val) + '" placeholder="' + v(ph || '') + '">';

  box.innerHTML =
    '<h3 style="font-size:1rem; margin:0 0 4px;">Edit Contact Information &mdash; ' + v(key) + '</h3>'
    + '<p style="font-size:.8rem; color:var(--muted); margin:0 0 12px;">Ask CJHQ will not give any of this to the public until <b>Contact verified</b> is ticked. Changing a field clears that tick.</p>'

    + '<h4 style="font-size:.85rem; margin:14px 0 4px;">Organization</h4>'
    + field('website', 'Website', ov.url !== undefined ? ov.url : '', 'https://...')
    + field('address', 'Address', ov.address)
    + field('description', 'Description', ov.description)
    + field('services', 'Services (comma separated)', (ov.services || []).join(', '), 'roadside assistance, vehicle lockout')
    + field('aliases', 'Aliases (comma separated)', (ov.aliases || []).join(', '))

    + '<h4 style="font-size:.85rem; margin:16px 0 4px;">Phone</h4>'
    + '<p style="font-size:.78rem; color:var(--muted); margin:0 0 8px;">These are three different things and the assistant answers them separately. Put a number under <b>Emergency</b> only if the organization itself calls it an emergency or urgent line. A general office line presented as an emergency number is the most damaging mistake this directory can make.</p>'
    + field('phone', 'General phone &mdash; a published number whose purpose is not classified', ov.phone)
    + field('emergencyPhone', 'Emergency phone &mdash; only if the organization says so', ov.emergencyPhone)
    + field('nonEmergencyPhone', 'Non-emergency phone &mdash; only if the purpose is explicitly non-urgent', ov.nonEmergencyPhone)
    + field('additionalPhone', 'Additional phone', ov.additionalPhone)

    + '<h4 style="font-size:.85rem; margin:16px 0 4px;">Digital</h4>'
    + field('email', 'Email', ov.email)
    + field('hours', 'Hours (only if published)', ov.hours)
    + field('languages', 'Languages (only if published)', ov.languages)

    + '<h4 style="font-size:.85rem; margin:16px 0 4px;">Verification</h4>'
    + field('contactSource', 'Contact source (where this came from)', ov.contactSource, 'https://organization.org/contact')
    + '<label style="display:flex; gap:8px; align-items:center; margin:10px 0; font-size:.9rem;">'
    + '<input type="checkbox" id="pc-contactVerified"' + (ov.contactVerified ? ' checked' : '') + '>'
    + '<span>Contact verified &mdash; I have confirmed this against the organization</span></label>'
    + field('contactVerifiedDate', 'Verification date', ov.contactVerifiedDate, 'YYYY-MM-DD')

    + '<div style="margin-top:14px; display:flex; gap:8px;">'
    + '<button type="button" class="btn dark" id="pcSave">Save Contact Information</button>'
    + '<button type="button" class="btn admin-btn-outline" id="pcCancel">Cancel</button></div>';

  box.style.display = 'block';
  box.scrollIntoView({ behavior:'smooth', block:'start' });
  document.getElementById('pcCancel').addEventListener('click', () => { box.style.display = 'none'; });
  document.getElementById('pcSave').addEventListener('click', () => savePartnerContact(key));
}

async function savePartnerContact(key){
  const g = (id) => (document.getElementById('pc-' + id) || {}).value || '';
  const existing = PARTNER_OVERRIDES_CACHE[key] || {};
  const list = (x) => x.split(',').map(t => t.trim()).filter(Boolean);

  const next = {
    ...existing, id:key, key,
    url:               g('website'),
    address:           g('address'),
    description:       g('description'),
    services:          list(g('services')),
    aliases:           list(g('aliases')),
    phone:             g('phone'),
    emergencyPhone:    g('emergencyPhone'),
    nonEmergencyPhone: g('nonEmergencyPhone'),
    additionalPhone:   g('additionalPhone'),
    email:             g('email'),
    hours:             g('hours'),
    languages:         g('languages'),
    contactSource:     g('contactSource'),
    contactVerified:   !!(document.getElementById('pc-contactVerified') || {}).checked,
    contactVerifiedDate: g('contactVerifiedDate'),
    hidden:            existing.hidden || false
  };

  // Changed information requires re-verification. If any contact value differs
  // from what was verified before, the tick is cleared even if the person left
  // it checked - otherwise an edit silently inherits an old confirmation.
  const watched = ['phone','emergencyPhone','nonEmergencyPhone','additionalPhone',
                   'email','address','hours','languages'];
  const changed = watched.some(f => (existing[f] || '') !== (next[f] || ''));
  if(existing.contactVerified === true && changed){
    next.contactVerified = false;
    next.contactVerifiedDate = '';
    admToast('Contact details changed, so verification was reset. Please re-confirm against the organization, then tick Contact verified again.');
  }

  await saveToCollection('partner_overrides', next);
  await applyPartnerOverrides();
  await renderEmbeddedPartnersList();
  const box = document.getElementById('partnerContactEditorBox');
  if(box) box.style.display = 'none';
}

/* The Edit Link button toggled a class called "open-editor" that no CSS rule
   anywhere ever matched, while the panel carries an inline style="display:none".
   A class cannot override an inline style, so the button has never done
   anything. Toggle the inline display directly instead. */
function togglePartnerLinkEditor(domId){
  const el = document.getElementById('editor-partner-' + domId);
  if(!el) return;
  el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
}

async function togglePartnerHidden(key){
  const existing = PARTNER_OVERRIDES_CACHE[key] || {};
  await saveToCollection('partner_overrides', { ...existing, id: key, key, hidden: !existing.hidden });
  await applyPartnerOverrides();
  renderEmbeddedPartnersList();
}
async function savePartnerLinkOverride(key, domId){
  const url = document.getElementById('ov-purl-'+domId).value;
  const existing = PARTNER_OVERRIDES_CACHE[key] || {};
  await saveToCollection('partner_overrides', { ...existing, id: key, key, url, hidden: existing.hidden || false });
  await applyPartnerOverrides();
  renderEmbeddedPartnersList();
}
async function renderAdminPartnersList(){
  const partners = await fetchCollection('partners');
  const list = document.getElementById('partnersAdminList');
  if(!partners.length){ list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No additional partners added yet.</p>`; return; }
  list.innerHTML = partners.map(p => `
    <div class="card admin-row">
      <div><p style="margin:0; font-weight:600;">${p.name}</p>
        <p style="margin:2px 0 0; font-size:.82rem; color:var(--muted);">${p.linkUrl || '(no link)'}</p></div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="admin-small-btn" onclick="editPartner('${p.id}')">Edit</button>
        <button class="admin-small-btn" style="color:#A23B3B;" onclick="removePartner('${p.id}')">Delete</button>
      </div>
    </div>`).join('');
}
async function editPartner(id){
  const p = (await fetchCollection('partners')).find(x=>x.id===id);
  if(!p) return;
  document.getElementById('partnerId').value = p.id;
  document.getElementById('partnerName').value = p.name||'';
  document.getElementById('partnerLogoUrl').value = p.logoUrl||'';
  document.getElementById('partnerLinkUrl').value = p.linkUrl||'';
  window.scrollTo({top:0, behavior:'smooth'});
}
async function removePartner(id){
  if(!(await admConfirm('Delete this partner? This cannot be undone.'))) return;
  await deleteFromCollection('partners', id);
  renderAdminPartnersList();
}

/* ---------- Admin panel: Resource Links ---------- */
async function renderAdminResourcesList(){
  const items = await fetchCollection('resources');
  const list = document.getElementById('resourcesAdminList');
  if(!items.length){ list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No additional resource links added yet.</p>`; return; }
  list.innerHTML = items.map(r => `
    <div class="card admin-row">
      <div>
        <span class="pill" style="font-size:.7rem; margin-bottom:6px; display:inline-block;">${r.category}</span>
        <p style="margin:4px 0 0; font-weight:600;">${r.title_en}</p>
        <p style="margin:2px 0 0; font-size:.82rem; color:var(--muted);">${r.desc_en||''}</p>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="admin-small-btn" onclick="editResource('${r.id}')">Edit</button>
        <button class="admin-small-btn" style="color:#A23B3B;" onclick="removeResource('${r.id}')">Delete</button>
      </div>
    </div>`).join('');
}
async function editResource(id){
  const r = (await fetchCollection('resources')).find(x=>x.id===id);
  if(!r) return;
  document.getElementById('resourceId').value = r.id;
  document.getElementById('resourceCategory').value = r.category;
  document.getElementById('resourceTitleEn').value = r.title_en||'';
  document.getElementById('resourceTitleFr').value = r.title_fr||'';
  document.getElementById('resourceDescEn').value = r.desc_en||'';
  document.getElementById('resourceDescFr').value = r.desc_fr||'';
  document.getElementById('resourceUrl').value = r.url||'';
  window.scrollTo({top:0, behavior:'smooth'});
}
async function removeResource(id){
  if(!(await admConfirm('Delete this resource link? This cannot be undone.'))) return;
  await deleteFromCollection('resources', id);
  renderAdminResourcesList();
}

function populateResourceCategoryDropdown(){
  const sel = document.getElementById('resourceCategory');
  if(!sel || sel.dataset.built) return;
  sel.dataset.built = '1';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.en; opt.textContent = c.en;
    sel.appendChild(opt);
  });
}

let OPEN_RESOURCE_EDITORS = new Set();
async function renderExistingResourcesList(){
  populateResourceCategoryDropdown();
  const overrides = await fetchCollection('resource_overrides');
  RESOURCE_OVERRIDES_CACHE = Object.fromEntries(overrides.map(o => [o.slug, o]));
  const query = (document.getElementById('existingResourceSearch').value || '').toLowerCase();
  const all = Object.values(RESOURCE_BY_SLUG).filter(it => !it._fromBackend);
  const filtered = query ? all.filter(it => it.en.toLowerCase().includes(query) || it.url.toLowerCase().includes(query)) : all;
  const list = document.getElementById('existingResourcesList');
  if(!filtered.length){ list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No matches.</p>`; return; }
  const esc = (s) => (s||'').replace(/"/g,'&quot;');
  const joinLines = (arr) => (arr||[]).join('\n');
  const joinLinks = (arr) => (arr||[]).map(l => `${l.label_en}|${l.label_fr}|${l.url}`).join('\n');
  list.innerHTML = filtered.map(it => {
    const ov = RESOURCE_OVERRIDES_CACHE[it.slug];
    const isHidden = ov && ov.hidden;
    const titleEn = it.en, descEn = it.desc_en || '', url = it.url;
    const id = it.slug;
    return `
    <div class="card" style="margin-bottom:8px; ${isHidden?'opacity:.55;':''}">
      <div class="admin-row" style="align-items:flex-start;">
        <div style="flex:1; min-width:0;">
          <p style="margin:0; font-weight:600;">${titleEn}${isHidden ? ' <span style="color:#A23B3B; font-weight:600; font-size:.75rem;">(hidden)</span>' : ''}</p>
          <p style="margin:2px 0 0; font-size:.78rem; color:var(--muted); word-break:break-all;">${url}</p>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button class="admin-small-btn" onclick="toggleExistingResourceEditor('${id}')">Edit</button>
          <button class="admin-small-btn" onclick="toggleResourceHidden('${id}')">${isHidden ? 'Unhide' : 'Hide'}</button>
        </div>
      </div>
      <div id="editor-res-${id}" style="display:${OPEN_RESOURCE_EDITORS.has(id)?'block':'none'}; margin-top:12px; border-top:1px solid var(--line); padding-top:12px;">

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:0 0 8px;">Cell &amp; Basics</h4>
        <label class="admin-label">Title — English</label>
        <input type="text" class="admin-input" id="ov-title_en-${id}" value="${esc(it.en)}">
        <label class="admin-label">Title — French</label>
        <input type="text" class="admin-input" id="ov-title_fr-${id}" value="${esc(it.fr)}">
        <label class="admin-label">Summary — English (shown on the cell itself)</label>
        <input type="text" class="admin-input" id="ov-desc_en-${id}" value="${esc(descEn)}">
        <label class="admin-label">Summary — French</label>
        <input type="text" class="admin-input" id="ov-desc_fr-${id}" value="${esc(it.desc_fr)}">
        <label class="admin-label">Primary Link (URL)</label>
        <input type="text" class="admin-input" id="ov-url-${id}" value="${esc(url)}">
        <label class="admin-label">"Go to Application" Button Label — English (optional, defaults to "Go to Application →")</label>
        <input type="text" class="admin-input" id="ov-label_en1-${id}" value="${esc(it.label_en1)}">
        <label class="admin-label">Button Label — French</label>
        <input type="text" class="admin-input" id="ov-label_fr1-${id}" value="${esc(it.label_fr1)}">

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:16px 0 8px;">Popup: What Is This?</h4>
        <label class="admin-label">English</label>
        <textarea class="admin-input" rows="2" id="ov-what_en-${id}">${esc(it.what_en)}</textarea>
        <label class="admin-label">French</label>
        <textarea class="admin-input" rows="2" id="ov-what_fr-${id}">${esc(it.what_fr)}</textarea>

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:16px 0 8px;">Popup: Question &amp; Answer (optional)</h4>
        <label class="admin-label">Question — English</label>
        <input type="text" class="admin-input" id="ov-question_en-${id}" value="${esc(it.question_en)}">
        <label class="admin-label">Question — French</label>
        <input type="text" class="admin-input" id="ov-question_fr-${id}" value="${esc(it.question_fr)}">
        <label class="admin-label">Answer — English</label>
        <textarea class="admin-input" rows="2" id="ov-answer_en-${id}">${esc(it.answer_en)}</textarea>
        <label class="admin-label">Answer — French</label>
        <textarea class="admin-input" rows="2" id="ov-answer_fr-${id}">${esc(it.answer_fr)}</textarea>

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:16px 0 8px;">Popup: What You'll Need</h4>
        <label class="admin-label">Section Heading — English</label>
        <input type="text" class="admin-input" id="ov-need_heading_en-${id}" value="${esc(it.need_heading_en)}">
        <label class="admin-label">Section Heading — French</label>
        <input type="text" class="admin-input" id="ov-need_heading_fr-${id}" value="${esc(it.need_heading_fr)}">
        <label class="admin-label">Intro Line — English (optional)</label>
        <input type="text" class="admin-input" id="ov-need_intro_en-${id}" value="${esc(it.need_intro_en)}">
        <label class="admin-label">Intro Line — French</label>
        <input type="text" class="admin-input" id="ov-need_intro_fr-${id}" value="${esc(it.need_intro_fr)}">
        <label class="admin-label">List Items — English (one per line)</label>
        <textarea class="admin-input" rows="3" id="ov-need_list_en-${id}">${joinLines(it.need_list_en)}</textarea>
        <label class="admin-label">List Items — French (one per line)</label>
        <textarea class="admin-input" rows="3" id="ov-need_list_fr-${id}">${joinLines(it.need_list_fr)}</textarea>

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:16px 0 8px;">Popup: How to Apply</h4>
        <label class="admin-label">Section Heading — English</label>
        <input type="text" class="admin-input" id="ov-steps_heading_en-${id}" value="${esc(it.steps_heading_en)}">
        <label class="admin-label">Section Heading — French</label>
        <input type="text" class="admin-input" id="ov-steps_heading_fr-${id}" value="${esc(it.steps_heading_fr)}">
        <label class="admin-label">Steps — English (one per line)</label>
        <textarea class="admin-input" rows="3" id="ov-steps_list_en-${id}">${joinLines(it.steps_list_en)}</textarea>
        <label class="admin-label">Steps — French (one per line)</label>
        <textarea class="admin-input" rows="3" id="ov-steps_list_fr-${id}">${joinLines(it.steps_list_fr)}</textarea>

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:16px 0 8px;">Popup: Good to Know (optional tips)</h4>
        <label class="admin-label">Tips — English (one per line)</label>
        <textarea class="admin-input" rows="3" id="ov-tips_list_en-${id}">${joinLines(it.tips_list_en)}</textarea>
        <label class="admin-label">Tips — French (one per line)</label>
        <textarea class="admin-input" rows="3" id="ov-tips_list_fr-${id}">${joinLines(it.tips_list_fr)}</textarea>

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:16px 0 8px;">Official Links (optional — one per line, format: Label EN | Label FR | URL)</h4>
        <textarea class="admin-input" rows="3" id="ov-official_links-${id}" placeholder="Passport Processing Times|Délais de traitement|https://...">${joinLinks(it.official_links)}</textarea>

        <h4 style="font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--bronze); margin:16px 0 8px;">Related Resources (optional — comma-separated page addresses, e.g. passport-renewal, child-passport)</h4>
        <input type="text" class="admin-input" id="ov-related-${id}" value="${esc((it.related||[]).join(', '))}">

        <div style="margin-top:14px; display:flex; gap:8px;">
          <button class="admin-small-btn" onclick="saveExistingResourceOverride('${id}')">Save All Changes</button>
          ${ov ? `<button class="admin-small-btn" style="color:#A23B3B;" onclick="resetExistingResourceOverride('${id}')">Reset to Default</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}
function toggleExistingResourceEditor(slug){
  const el = document.getElementById('editor-res-'+slug);
  if(!el) return;
  const willOpen = el.style.display === 'none';
  el.style.display = willOpen ? 'block' : 'none';
  if(willOpen) OPEN_RESOURCE_EDITORS.add(slug); else OPEN_RESOURCE_EDITORS.delete(slug);
}
async function saveExistingResourceOverride(slug){
  const v = (field) => { const el = document.getElementById(`ov-${field}-${slug}`); return el ? el.value : ''; };
  const lines = (field) => v(field).split('\n').map(s=>s.trim()).filter(Boolean);
  const links = () => v('official_links').split('\n').map(s=>s.trim()).filter(Boolean).map(line => {
    const [label_en, label_fr, url] = line.split('|').map(s=>(s||'').trim());
    return { label_en: label_en||'', label_fr: label_fr||'', url: url||'' };
  });
  const relatedSlugs = () => v('related').split(',').map(s=>s.trim()).filter(Boolean);
  const existing = RESOURCE_OVERRIDES_CACHE[slug] || {};
  const record = {
    id: slug, slug, hidden: existing.hidden || false,
    title_en: v('title_en'), title_fr: v('title_fr'),
    desc_en: v('desc_en'), desc_fr: v('desc_fr'),
    url: v('url'),
    label_en1: v('label_en1'), label_fr1: v('label_fr1'),
    what_en: v('what_en'), what_fr: v('what_fr'),
    question_en: v('question_en'), question_fr: v('question_fr'),
    answer_en: v('answer_en'), answer_fr: v('answer_fr'),
    need_heading_en: v('need_heading_en'), need_heading_fr: v('need_heading_fr'),
    need_intro_en: v('need_intro_en'), need_intro_fr: v('need_intro_fr'),
    need_list_en: lines('need_list_en'), need_list_fr: lines('need_list_fr'),
    steps_heading_en: v('steps_heading_en'), steps_heading_fr: v('steps_heading_fr'),
    steps_list_en: lines('steps_list_en'), steps_list_fr: lines('steps_list_fr'),
    tips_list_en: lines('tips_list_en'), tips_list_fr: lines('tips_list_fr'),
    official_links: links(),
    related: relatedSlugs(),
  };
  await saveToCollection('resource_overrides', record);
  await applyResourceOverrides();
  renderExistingResourcesList();
}
async function resetExistingResourceOverride(slug){
  if(!(await admConfirm('Reset this resource to its original text and link? This clears every field you\'ve customized for it.'))) return;
  const existing = RESOURCE_OVERRIDES_CACHE[slug];
  const hiddenState = existing ? existing.hidden : false;
  if(hiddenState){
    await saveToCollection('resource_overrides', { id: slug, slug, hidden: true });
  } else {
    await deleteFromCollection('resource_overrides', slug);
  }
  await applyResourceOverrides();
  renderExistingResourcesList();
}
async function toggleResourceHidden(slug){
  const existing = RESOURCE_OVERRIDES_CACHE[slug] || {};
  await saveToCollection('resource_overrides', { ...existing, id: slug, slug, hidden: !existing.hidden });
  await applyResourceOverrides();
  renderExistingResourcesList();
}

/* ---------- Admin panel: Calendar (Community Events) ---------- */
async function renderAdminEventsList(){
  const events = await fetchCollection('events');
  const list = document.getElementById('eventsAdminList');
  if(!list) return;
  if(!events.length){ list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No community events yet.</p>`; return; }
  const sorted = events.slice().sort((a,b) => (a.date||'') < (b.date||'') ? -1 : 1);
  list.innerHTML = sorted.map(e => `
    <div class="card admin-row">
      <div>
        <p style="margin:0; font-weight:600;">${e.date || '(no date)'} — ${e.title_en || '(no title)'}</p>
        <p style="margin:2px 0 0; font-size:.82rem; color:var(--muted);">${[e.start_time, e.location].filter(Boolean).join(' · ')}</p>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="admin-small-btn" onclick="editEvent('${e.id}')">Edit</button>
        <button class="admin-small-btn" style="color:#A23B3B;" onclick="removeEvent('${e.id}')">Delete</button>
      </div>
    </div>`).join('');
}
async function editEvent(id){
  const e = (await fetchCollection('events')).find(x=>x.id===id);
  if(!e) return;
  document.getElementById('eventId').value = e.id;
  document.getElementById('eventTitleEn').value = e.title_en||'';
  document.getElementById('eventTitleFr').value = e.title_fr||'';
  document.getElementById('eventDate').value = e.date||'';
  document.getElementById('eventStart').value = e.start_time||'';
  document.getElementById('eventEnd').value = e.end_time||'';
  document.getElementById('eventLocation').value = e.location||'';
  document.getElementById('eventDescEn').value = e.desc_en||'';
  document.getElementById('eventDescFr').value = e.desc_fr||'';
  document.getElementById('eventLink').value = e.link||'';
  window.scrollTo({top:0, behavior:'smooth'});
}
async function removeEvent(id){
  if(!(await admConfirm('Delete this event? This cannot be undone.'))) return;
  await deleteFromCollection('events', id);
  renderAdminEventsList();
}

/* ---------- Admin panel: Link Audit ---------- */
async function syncResourcesToBackend(){
  const btn = document.getElementById('syncResourcesBtn');
  const original = btn.textContent;
  btn.textContent = 'Syncing…'; btn.disabled = true;
  try{
    const all = Object.values(RESOURCE_BY_SLUG);
    for(const it of all){
      const record = {
        id: it.slug, slug: it.slug, en: it.en, url: it.url,
        what_en: it.what_en || it.desc_en || '',
        need_en: it.need_en || '',
        need_list_en: it.need_list_en || null,
        steps_en: it.steps_en || '',
        steps_list_en: it.steps_list_en || null,
      };
      if(firebaseReady){
        const fs = window.__fbFirestore;
        await fs.setDoc(fs.doc(fbDb, 'resources_master', it.slug), record, { merge:true });
      }
    }
    btn.textContent = firebaseReady ? `Synced ${all.length} resources ✓` : 'Firebase not connected — nothing to sync to';
  }catch(e){
    btn.textContent = 'Sync failed — see console';
    console.error(e);
  }
  setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 3000);
}

async function renderLinkAuditList(){
  renderLinkCheckResults();
  renderAiCheckSummary();
  document.getElementById('linkAuditSetupWarning').style.display = firebaseReady ? 'none' : 'block';
  const audits = await fetchCollection('link_audits');
  const flagged = audits.filter(a => a.slug && a.slug !== '_run_summary' && a.status && a.status !== 'ok');
  const list = document.getElementById('linkAuditList');
  if(!flagged.length){
    list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No flagged items. Once the monthly checker has run at least once, anything needing attention will show up here.</p>`;
    return;
  }
  const statusColor = { broken:'#A23B3B', changed:'#B4881A', unclear:'#6B7280', error:'#A23B3B' };
  list.innerHTML = flagged.map(a => `
    <div class="card" style="margin-bottom:10px;">
      <div class="admin-row">
        <div>
          <span class="pill" style="font-size:.7rem; background:${statusColor[a.status]||'#6B7280'}; color:#fff; border:none;">${a.status}</span>
          <p style="margin:6px 0 0; font-weight:600;">${a.title || a.slug}</p>
          <p style="margin:4px 0 0; font-size:.85rem; color:var(--muted);">${a.summary || ''}</p>
          ${a.announcedFutureChange ? `<p style="margin:6px 0 0; font-size:.85rem; color:#7A5B0E;"><strong>Announced future change:</strong> ${a.announcedFutureChange}</p>` : ''}
          <p style="margin:6px 0 0; font-size:.72rem; color:var(--muted);">Last checked: ${a.lastChecked ? new Date(a.lastChecked).toLocaleDateString() : '—'} · <a href="${a.url}" target="_blank" rel="noopener">View live page</a></p>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
          <button class="admin-small-btn" onclick="markResourceReviewed('${a.slug}')">Mark Reviewed</button>
          ${a.announcedFutureChange ? `<button class="admin-small-btn" onclick="publishChangeNotice('${a.slug}')">Publish Notice</button>` : ''}
        </div>
      </div>
    </div>`).join('');
}

/* error_reports is written by ANY visitor - the Firestore rules allow
   anonymous create so the 404 page's "Report This Broken Link" button works
   without a sign-in. That is deliberate and stays. It does mean every field
   below is attacker-controlled, and so is the document id: an anonymous
   create may choose its own id via setDoc.

   Before this, attemptedUrl / message / referrer went into innerHTML raw and
   the id went into an inline onclick. A report containing
   <img src="/missing.png" onerror="..."> executed inside the authenticated
   staff session - the one session that can write every collection. Escaped
   throughout now, and the id is carried in a data attribute read by a
   delegated listener, never parsed as JavaScript. */
async function renderErrorReportsList(){
  const reports = await fetchCollection('error_reports');
  const sorted = reports.slice().sort((a,b) => (b.reportedAt||'').localeCompare(a.reportedAt||'')).slice(0, 30);
  const list = document.getElementById('errorReportsList');
  if(!sorted.length){
    list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No issues reported yet.</p>`;
    return;
  }
  const esc = cjhqEscapeHtml;
  // Dates are rebuilt from a parsed timestamp rather than echoed, so a
  // reportedAt of "<img ...>" renders as nothing instead of as markup.
  const when = (v) => {
    const d = v ? new Date(v) : null;
    return (d && !isNaN(d.getTime())) ? esc(d.toLocaleString()) : '';
  };
  list.innerHTML = sorted.map(r => `
    <div class="card admin-row" style="margin-bottom:8px;">
      <div>
        <span class="pill" style="font-size:.68rem;">${r.type === 'broken_link' ? '🔗 broken link' : '⚠️ js error'}</span>
        <p style="margin:4px 0 0; font-size:.85rem; font-family:monospace; word-break:break-all;">${esc(r.attemptedUrl || r.message || '')}</p>
        ${r.message && r.type==='broken_link' ? '' : (r.message ? `<p style="margin:2px 0 0; font-size:.78rem; color:var(--muted);">${esc(r.message)}</p>` : '')}
        <p style="margin:4px 0 0; font-size:.72rem; color:var(--muted);">${when(r.reportedAt)}${r.referrer ? ' · from: '+esc(r.referrer) : ''}</p>
      </div>
      <button class="admin-small-btn" type="button" data-del-report="${esc(r.id == null ? '' : r.id)}">Dismiss</button>
    </div>`).join('');
}

/* contact_submissions is the same shape of risk as error_reports: the rules
   allow anonymous create so the contact form works without a sign-in, which
   means a submitter controls the field VALUES, the field KEYS, and the
   document id. Nothing here may be trusted because it "comes from the contact
   form" - a caller can write any document they like straight to the
   collection. Keys, values, the derived title and the id are all escaped or
   kept out of executable positions. */
async function renderMessagesList(){
  const messages = await fetchCollection('contact_submissions');
  const query = (document.getElementById('messagesSearch').value || '').toLowerCase();
  const sorted = messages.slice().sort((a,b) => (b.submittedAt||'').localeCompare(a.submittedAt||''));
  const filtered = query
    ? sorted.filter(m => Object.values(m).some(v => typeof v==='string' && v.toLowerCase().includes(query)))
    : sorted;
  const list = document.getElementById('messagesList');
  if(!filtered.length){
    list.innerHTML = `<p style="color:var(--muted); font-size:.88rem;">No messages yet.</p>`;
    return;
  }
  const esc = cjhqEscapeHtml;
  const when = (v) => {
    const d = v ? new Date(v) : null;
    return (d && !isNaN(d.getTime())) ? esc(d.toLocaleString()) : '';
  };
  const skipKeys = new Set(['id','submittedAt','lang']);
  list.innerHTML = filtered.map(m => {
    const fields = Object.entries(m).filter(([k,v]) => !skipKeys.has(k) && v);
    const nameField = fields.find(([k]) => /name/i.test(k));
    const title = nameField ? nameField[1] : 'Message';
    return `
    <div class="card admin-row" style="margin-bottom:8px; align-items:flex-start;">
      <div>
        <p style="margin:0; font-weight:600;">${esc(title)} <span class="pill" style="font-size:.65rem; margin-left:6px;">${m.lang==='fr'?'FR':'EN'}</span></p>
        <div style="margin:6px 0 0; font-size:.82rem; color:var(--ink-soft); line-height:1.6;">
          ${fields.map(([k,v]) => `<div><strong>${esc(String(k).replace(/_/g,' '))}:</strong> ${esc(v)}</div>`).join('')}
        </div>
        <p style="margin:6px 0 0; font-size:.72rem; color:var(--muted);">${when(m.submittedAt)}</p>
      </div>
      <button class="admin-small-btn" type="button" data-del-message="${esc(m.id == null ? '' : m.id)}">Delete</button>
    </div>`;
  }).join('');
}

/* One delegated listener for both inboxes. The document id is read back from
   the attribute at click time, so it is never parsed as JavaScript no matter
   what an anonymous submitter chose to call their document. */
document.addEventListener('click', (e) => {
  const t = e.target;
  if(!t || !t.closest) return;
  const del = t.closest('[data-del-report], [data-del-message]');
  if(!del) return;
  if(del.hasAttribute('data-del-report')){
    deleteFromCollection('error_reports', del.getAttribute('data-del-report'))
      .then(renderErrorReportsList);
  } else {
    deleteFromCollection('contact_submissions', del.getAttribute('data-del-message'))
      .then(renderMessagesList);
  }
});

async function markResourceReviewed(slug){
  const today = new Date().toLocaleDateString('en-US', { month:'long', year:'numeric' });
  await saveToCollection('reviewed_overrides', { id: slug, slug, reviewed: today });
  await deleteFromCollection('link_audits', slug);
  renderLinkAuditList();
}

async function publishChangeNotice(slug){
  const audits = await fetchCollection('link_audits');
  const a = audits.find(x => x.slug === slug);
  if(!a) return;
  await saveToCollection('pending_change_notices', { id: slug, slug, notice_en: a.announcedFutureChange, notice_fr: a.announcedFutureChange });
  admToast('Notice published. It will now show on the public resource popup until you clear it (edit the resource once the change takes effect, then delete this notice from Firestore or extend the admin panel to manage it directly).');
}

/* ---------- Wire up admin UI ---------- */
(function initAdmin(){
  const loginBtn = document.getElementById('adminLoginBtn');
  if(!loginBtn) return;

  // Firebase restores the session asynchronously, so reconcile now with
  // whatever is known and let onAuthStateChanged correct it a moment later.
  syncAdminAuthUI();

  document.getElementById('syncResourcesBtn').addEventListener('click', syncResourcesToBackend);
  document.getElementById('refreshAuditBtn').addEventListener('click', renderLinkAuditList);
  document.getElementById('aiCheckRunBtn').addEventListener('click', (e) => runAiInstructionCheck(e.currentTarget));
  document.querySelectorAll('[data-img-upload]').forEach(buildImageUploader);
  document.getElementById('existingResourceSearch').addEventListener('input', renderExistingResourcesList);
  document.getElementById('messagesSearch').addEventListener('input', renderMessagesList);

  document.getElementById('customPageShowNav').addEventListener('change', (e)=>{
    document.getElementById('customPageNavLabelFields').style.display = e.target.checked ? 'block' : 'none';
  });
  /* Clearing the editor is more than form.reset(): the panel also carries
     derived state - the preview, the status line, the format hint and the
     button-label placeholders - none of which reset() knows about. Saving used
     to clear only the fields, so the previous page's preview stayed on screen
     under an empty form and looked like unsaved work. One function now does
     the whole job, so Cancel and Save cannot drift apart again. */
  function resetCustomPageForm(){
    document.getElementById('customPageForm').reset();
    document.getElementById('customPageId').value = '';
    document.getElementById('customPageSlug').disabled = false;
    document.getElementById('customPageNavLabelFields').style.display = 'none';
    document.getElementById('customPageHomeFields').style.display = 'none';
    // reset() restores the markup default, which is HTML - make the hint agree.
    updateCustomPageFormatHint();
    updateCustomPageStatusPreview();
    updateCustomPageShareBox();
    if(window.syncHomeCtaPlaceholders) syncHomeCtaPlaceholders();
    if(window.renderCustomPagePreview) renderCustomPagePreview();
  }
  window.resetCustomPageForm = resetCustomPageForm;
  document.getElementById('customPageCancelBtn').addEventListener('click', resetCustomPageForm);
  /* The switcher only changes how the body is rendered - it never rewrites what
     was typed, so flipping it back and forth is safe and reversible. */
  function updateCustomPageFormatHint(){
    const hint = document.getElementById('customPageFormatHint');
    if(!hint) return;
    const isText = document.getElementById('customPageFormatText').checked;
    hint.textContent = isText
      ? 'Typed exactly as written. Blank lines start a new paragraph; tags are shown, not applied.'
      : 'Tags like <p>, <strong> and <a> are applied. Anything unsafe is stripped when the page is shown.';
  }
  window.updateCustomPageFormatHint = updateCustomPageFormatHint;
  ['customPageFormatHtml','customPageFormatText'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', updateCustomPageFormatHint);
  });
  updateCustomPageFormatHint();

  /* Read an .html or .txt file straight into the box. The file is read in the
     browser and never uploaded anywhere; it just saves pasting. Choosing an
     .html file also flips the switch to HTML, which is almost always what was
     meant by opening one. */
  [['En','customPageBodyEn'], ['Fr','customPageBodyFr']].forEach(([side, target])=>{
    const btn   = document.getElementById('customPageFile' + side + 'Btn');
    const input = document.getElementById('customPageFile' + side);
    const name  = document.getElementById('customPageFile' + side + 'Name');
    if(!btn || !input) return;
    btn.addEventListener('click', ()=> input.click());
    input.addEventListener('change', ()=>{
      const file = input.files && input.files[0];
      if(!file) return;
      if(file.size > 512 * 1024){
        admToast('That file is larger than 512 KB. Page bodies are stored in the database and downloaded by every visitor, so please trim it first.');
        input.value = ''; return;
      }
      const reader = new FileReader();
      reader.onload = ()=>{
        document.getElementById(target).value = String(reader.result || '');
        if(/\.html?$/i.test(file.name)){
          document.getElementById('customPageFormatHtml').checked = true;
          updateCustomPageFormatHint();
        }
        if(name) name.textContent = 'Loaded ' + file.name;
        renderCustomPagePreview();
        input.value = '';
      };
      reader.onerror = ()=>{ admToast('Could not read that file.'); input.value = ''; };
      reader.readAsText(file);
    });
  });

  /* The homepage button says the page title unless something else is typed.
     Showing the title as the placeholder makes that visible instead of
     implied - the field stays empty and fully editable. */
  function syncHomeCtaPlaceholders(){
    const t = { En: document.getElementById('customPageTitleEn'),
                Fr: document.getElementById('customPageTitleFr') };
    ['En','Fr'].forEach(side=>{
      const cta = document.getElementById('customPageHomeCta' + side);
      if(cta && t[side]) cta.placeholder = t[side].value.trim() || 'Uses the page title';
    });
  }
  window.syncHomeCtaPlaceholders = syncHomeCtaPlaceholders;
  ['customPageTitleEn','customPageTitleFr'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', syncHomeCtaPlaceholders);
  });
  syncHomeCtaPlaceholders();

  /* The preview runs the body through cjhqRenderPageBody() - the very function
     the public page uses - so it cannot drift from what a visitor sees. That
     includes the sanitiser: markup stripped here is markup that would have been
     stripped there. */
  let previewLang = 'en';
  function renderCustomPagePreview(){
    const host  = document.getElementById('customPagePreviewBody');
    const title = document.getElementById('customPagePreviewTitle');
    if(!host || !title) return;
    const fr = previewLang === 'fr';
    const t = (document.getElementById(fr ? 'customPageTitleFr' : 'customPageTitleEn') || {}).value || '';
    const b = (document.getElementById(fr ? 'customPageBodyFr'  : 'customPageBodyEn')  || {}).value || '';
    const fmt = document.getElementById('customPageFormatText').checked ? 'text' : 'html';
    title.textContent = t || (fr ? 'Titre de la page' : 'Page title');
    title.style.opacity = t ? '1' : '.45';
    host.innerHTML = b.trim()
      ? cjhqRenderPageBody(b, fmt)
      : `<p class="tp-preview-empty">${fr ? 'Le contenu apparaîtra ici.' : 'Content will appear here.'}</p>`;
  }
  window.renderCustomPagePreview = renderCustomPagePreview;
  function setPreviewLang(lang){
    previewLang = lang;
    const en = document.getElementById('customPagePreviewEnBtn');
    const frb = document.getElementById('customPagePreviewFrBtn');
    if(en)  en.setAttribute('aria-pressed', String(lang === 'en'));
    if(frb) frb.setAttribute('aria-pressed', String(lang === 'fr'));
    renderCustomPagePreview();
  }
  const enBtn = document.getElementById('customPagePreviewEnBtn');
  const frBtn = document.getElementById('customPagePreviewFrBtn');
  if(enBtn) enBtn.addEventListener('click', ()=> setPreviewLang('en'));
  if(frBtn) frBtn.addEventListener('click', ()=> setPreviewLang('fr'));
  // Debounced: re-sanitising on every keystroke of a long body is wasted work.
  let previewTimer = null;
  const schedulePreview = ()=>{ clearTimeout(previewTimer); previewTimer = setTimeout(renderCustomPagePreview, 180); };
  ['customPageTitleEn','customPageTitleFr','customPageBodyEn','customPageBodyFr']
    .forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('input', schedulePreview); });
  ['customPageFormatHtml','customPageFormatText']
    .forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('change', renderCustomPagePreview); });
  renderCustomPagePreview();

  const backfillBtn = document.getElementById('customPageBackfillBtn');
  if(backfillBtn) backfillBtn.addEventListener('click', backfillCustomPageLifecycle);
  document.getElementById('customPageShowHome').addEventListener('change', (e)=>{
    document.getElementById('customPageHomeFields').style.display = e.target.checked ? 'block' : 'none';
  });
  // Tells the editor, before they save, exactly what the public will get.
  ['customPagePublished','customPageStart','customPageEnd'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', updateCustomPageStatusPreview);
  });
  updateCustomPageStatusPreview();
  document.getElementById('customPageForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const isEdit = !!document.getElementById('customPageId').value;
    const slug = document.getElementById('customPageSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');
    if(!slug){ admToast('Please enter a page address.'); return; }
    if(!isEdit && (document.getElementById('page-'+slug) || CUSTOM_PAGES_CACHE[slug])){
      admToast('That page address is already in use — please choose another.');
      return;
    }
    const page = {
      id: slug, slug,
      title_en: document.getElementById('customPageTitleEn').value,
      title_fr: document.getElementById('customPageTitleFr').value,
      body_en: document.getElementById('customPageBodyEn').value,
      body_fr: document.getElementById('customPageBodyFr').value,
      body_format: document.getElementById('customPageFormatText').checked ? 'text' : 'html',
      show_in_nav: document.getElementById('customPageShowNav').checked,
      nav_en: document.getElementById('customPageNavEn').value,
      nav_fr: document.getElementById('customPageNavFr').value,
      published: document.getElementById('customPagePublished').checked,
      start_date: document.getElementById('customPageStart').value || '',
      end_date: document.getElementById('customPageEnd').value || '',
      show_on_home: document.getElementById('customPageShowHome').checked,
      home_style: document.getElementById('customPageHomeStyle').value || 'tile',
      home_cta_en: document.getElementById('customPageHomeCtaEn').value,
      home_cta_fr: document.getElementById('customPageHomeCtaFr').value,
      home_blurb_en: document.getElementById('customPageHomeBlurbEn').value,
      home_blurb_fr: document.getElementById('customPageHomeBlurbFr').value,
    };
    // Firestore rules cannot read a YYYY-MM-DD string as a date, and security
    // rules are not filters - a list query fails outright if ANY returned
    // document breaks the rule. So the end of the window is also stored as a
    // number the rules and the public query can both use, and the public query
    // asks for exactly what the rules allow.
    page.public_until_ms = cjhqEndOfDayMs(page.end_date);
    // An end date before the start date would make the page permanently
    // unreachable without ever saying so.
    if(page.start_date && page.end_date && page.end_date < page.start_date){
      admToast('The End Date is before the Start Date, so the page would never be public. Please correct the dates.');
      return;
    }
    await saveToCollection('custom_pages', page);
    await enhancePagesFromBackend();
    // The index is what visitors read from. A page saved without reaching the
    // index is a page nobody can see, so this is awaited, not fired and forgotten.
    await syncPublicPageIndex();
    if(window.resetCustomPageForm) window.resetCustomPageForm();
    renderCustomPagesList();
  });

  // PIN rate-limiting: max 5 attempts within 15 minutes, then 15-minute lockout
  // Firebase Auth sign-in. Firebase applies its own throttling after repeated
  // failures, so the old client-side attempt counter is gone - it could be
  // bypassed by reloading the page and never protected the database anyway.
  const showLoginError = (msg) => {
    const el = document.getElementById('adminLoginError');
    el.textContent = msg;
    el.style.display = 'block';
  };

  async function attemptAdminSignIn(){
    const emailEl = document.getElementById('adminEmailInput');
    const passEl  = document.getElementById('adminPasswordInput');
    const email = (emailEl.value || '').trim();
    const password = passEl.value || '';
    if(!email || !password){
      showLoginError('Enter your email address and password.');
      return;
    }
    if(!firebaseReady || !fbAuth){
      showLoginError('Cannot reach the sign-in service. Check your connection and try again.');
      return;
    }
    loginBtn.disabled = true;
    const originalLabel = loginBtn.textContent;
    loginBtn.textContent = 'Signing in…';
    try{
      await window.__fbAuth.signInWithEmailAndPassword(fbAuth, email, password);
      document.getElementById('adminLoginError').style.display = 'none';
      passEl.value = '';
      // onAuthStateChanged opens the panel.
    }catch(err){
      const code = (err && err.code) || '';
      let msg;
      if(code === 'auth/invalid-email')            msg = 'That does not look like a valid email address.';
      else if(code === 'auth/too-many-requests')   msg = 'Too many attempts. Please wait a few minutes and try again.';
      else if(code === 'auth/network-request-failed') msg = 'Network error. Check your connection and try again.';
      else if(code === 'auth/user-disabled')       msg = 'This account has been disabled. Contact the site administrator.';
      else if(code === 'auth/operation-not-allowed') msg = 'Email sign-in is not enabled for this project yet.';
      else msg = 'Email or password is incorrect.';
      showLoginError(msg);
      console.warn('[CJHQ] admin sign-in failed:', code || err);
      passEl.value = '';
    }finally{
      loginBtn.disabled = false;
      loginBtn.textContent = originalLabel;
    }
  }

  async function attemptGoogleSignIn(){
    if(!firebaseReady || !fbAuth){
      showLoginError('Cannot reach the sign-in service. Check your connection and try again.');
      return;
    }
    const btn = document.getElementById('adminGoogleBtn');
    btn.disabled = true;
    try{
      const provider = new window.__fbAuth.GoogleAuthProvider();
      // Always ask which account to use. Without this, a browser signed into a
      // personal Google account signs in with it silently.
      provider.setCustomParameters({ prompt: 'select_account' });
      await window.__fbAuth.signInWithPopup(fbAuth, provider);
      document.getElementById('adminLoginError').style.display = 'none';
      // onAuthStateChanged opens the panel.
    }catch(err){
      const code = (err && err.code) || '';
      let msg;
      if(code === 'auth/popup-blocked')                    msg = 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
      else if(code === 'auth/popup-closed-by-user' ||
              code === 'auth/cancelled-popup-request')     msg = '';   // user backed out; not an error
      else if(code === 'auth/operation-not-allowed')       msg = 'Google sign-in is not enabled for this project yet.';
      else if(code === 'auth/unauthorized-domain')         msg = 'This domain is not authorised for Google sign-in. Add it in Firebase Authentication settings.';
      else if(code === 'auth/network-request-failed')      msg = 'Network error. Check your connection and try again.';
      else msg = 'Google sign-in did not complete. Please try again.';
      if(msg) showLoginError(msg);
      if(code) console.warn('[CJHQ] Google sign-in:', code);
    }finally{
      btn.disabled = false;
    }
  }

  loginBtn.addEventListener('click', attemptAdminSignIn);
  document.getElementById('adminGoogleBtn').addEventListener('click', attemptGoogleSignIn);
  ['adminEmailInput','adminPasswordInput'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); attemptAdminSignIn(); } });
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', async ()=>{
    try{
      if(fbAuth && window.__fbAuth) await window.__fbAuth.signOut(fbAuth);
    }catch(err){
      console.warn('[CJHQ] sign-out failed:', err);
    }
    // onAuthStateChanged closes the panel; do it here too so the UI responds
    // immediately even if the network call is slow.
    adminUser = null;
    syncAdminAuthUI();
  });

  document.querySelectorAll('.admin-tab-btn').forEach(b=>{
    b.addEventListener('click', ()=>switchAdminTab(b.dataset.tab));
  });

  // Share link box: derived from the address field, so it follows a rename.
  const slugField = document.getElementById('customPageSlug');
  if(slugField){
    slugField.addEventListener('input', updateCustomPageShareBox);
    slugField.addEventListener('change', updateCustomPageShareBox);
  }
  const shareBox = document.getElementById('customPageShareBox');
  const shareMsg = document.getElementById('customPageShareMsg');
  const copyBtn  = document.getElementById('customPageShareCopy');
  if(copyBtn) copyBtn.addEventListener('click', async ()=>{
    const url = (shareBox && shareBox.__share) || '';
    if(!url) return;
    const ok = await cjhqCopyText(url);
    cjhqFlashMsg(shareMsg,
      ok ? 'Link copied' : 'Could not copy \u2014 select the link above and copy it manually.',
      !ok);
  });
  const shareOpen = document.getElementById('customPageShareOpen');
  if(shareOpen) shareOpen.addEventListener('click', ()=>{
    const url = (shareBox && shareBox.__share) || '';
    if(url) window.open(url, '_blank', 'noopener');
  });
  // One-tap share straight from the admin, same pattern as the resources
  // page's share buttons (shareResourceVia): a WhatsApp draft and an email
  // draft with the page's share link prefilled.
  const shareWa = document.getElementById('customPageShareWhatsApp');
  if(shareWa) shareWa.addEventListener('click', ()=>{
    const url = (shareBox && shareBox.__share) || '';
    if(!url) return;
    const title = ((document.getElementById('customPageTitleEn')||{}).value || 'CJHQ Community Notice').trim();
    window.open('https://wa.me/?text=' + encodeURIComponent(title + ' \u2014 ' + url), '_blank', 'noopener');
  });
  const shareEmail = document.getElementById('customPageShareEmail');
  if(shareEmail) shareEmail.addEventListener('click', ()=>{
    const url = (shareBox && shareBox.__share) || '';
    if(!url) return;
    const title = ((document.getElementById('customPageTitleEn')||{}).value || 'CJHQ Community Notice').trim();
    window.location.href = 'mailto:?subject=' + encodeURIComponent(title) +
      '&body=' + encodeURIComponent('Here is a CJHQ community notice: ' + url);
  });
  updateCustomPageShareBox();

  // Staff access
  const staffForm = document.getElementById('staffAddForm');
  if(staffForm) staffForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const input = document.getElementById('staffAddEmail');
    const ok = await addStaffMember(input ? input.value : '');
    if(ok && input) input.value = '';
  });
  const staffListBox = document.getElementById('staffList');
  if(staffListBox) staffListBox.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-staff-remove]');
    if(btn) removeStaffMember(btn.getAttribute('data-staff-remove'));
  });

  // Notices form
  document.getElementById('noticeCancelBtn').addEventListener('click', ()=>{
    document.getElementById('noticeForm').reset();
    document.getElementById('noticeId').value = '';
    document.getElementById('noticeSource').value = 'notices';
  });


/* ---------- Publishing admin UI ----------
   One place to see everything that is built but not currently visible to the
   public - sections, notices and popups - with preview, edit, scheduling and a
   save-without-activating option. */
(function initVisibilityAdmin(){
  const box = document.getElementById('visibilityList');
  if(!box) return;

  const SECTIONS = [
    { key:'yomim-tovim-travel', routeId:'special-information',
      name:'Special Information for Yomim Tovim & Travel',
      note:'Seasonal travel and Yom Tov guidance. Content and visibility are separate.' }
  ];

  const STATE_LABEL = {
    live:      { dot:'published', text:'Live \u2014 visible to the public' },
    hidden:    { dot:'hidden',    text:'Hidden' },
    draft:     { dot:'draft',     text:'Draft \u2014 saved, not activated' },
    inactive:  { dot:'hidden',    text:'Inactive' },
    scheduled: { dot:'sched',     text:'Scheduled \u2014 not yet started' },
    expired:   { dot:'hidden',    text:'Expired \u2014 end date passed' }
  };

  function stateChip(state){
    const cfg = STATE_LABEL[state] || STATE_LABEL.hidden;
    const el = document.createElement('div');
    el.className = 'vis-status';
    // Keep the "Status:" prefix the original specification asked for.
    el.innerHTML = '<span class="vis-dot ' + cfg.dot + '"></span>Status: ' + cfg.text;
    return el;
  }

  function dateRow(a, startVal, endVal, onChange){
    const wrap = document.createElement('div');
    wrap.className = 'vis-dates';
    [['Start date', startVal, 'startsOn'], ['End date', endVal, 'endsOn']].forEach(([lbl, val, key])=>{
      const g = document.createElement('div');
      const id = 'vis-' + key + '-' + a;
      const l = document.createElement('label'); l.setAttribute('for', id); l.textContent = lbl;
      const inp = document.createElement('input');
      inp.type = 'date'; inp.id = id; inp.className = 'admin-input'; inp.value = val || '';
      inp.addEventListener('change', ()=> onChange(key, inp.value));
      g.appendChild(l); g.appendChild(inp); wrap.appendChild(g);
    });
    const hint = document.createElement('p');
    hint.className = 'vis-audit';
    hint.textContent = 'Leave blank for no limit. Dates are inclusive: an end date of 5 September stays visible all day on the 5th.';
    wrap.appendChild(hint);
    return wrap;
  }

  /* ---- sections ---- */
  function renderSections(target){
    SECTIONS.forEach(sec=>{
      const a = sectionAudit(sec.key);
      const published = a.status === 'published';
      const state = a.state;
      const pending = { startsOn: a.startsOn, endsOn: a.endsOn };

      const row = document.createElement('div');
      row.className = 'vis-row';

      const head = document.createElement('div');
      head.className = 'vis-name';
      head.textContent = sec.name;
      if(state !== 'live'){
        const flag = document.createElement('span');
        flag.className = 'vis-preview-flag';
        flag.textContent = 'NOT PUBLIC';
        head.appendChild(flag);
      }
      row.appendChild(head);
      row.appendChild(stateChip(state));

      const note = document.createElement('div');
      note.className = 'vis-audit'; note.textContent = sec.note;
      row.appendChild(note);

      row.appendChild(dateRow(sec.key, a.startsOn, a.endsOn, (k,v)=>{ pending[k] = v; }));

      const audit = document.createElement('div');
      audit.className = 'vis-audit';
      audit.textContent = a.changedAt
        ? ('Last changed: ' + new Date(a.changedAt).toLocaleString() + (a.changedBy ? ' \u00b7 by ' + a.changedBy : ''))
        : 'Never changed \u2014 default is Hidden.';
      row.appendChild(audit);

      const bar = document.createElement('div');
      bar.className = 'vis-actions';

      // Preview: opens the real section with the admin banner, without publishing.
      const prev = document.createElement('button');
      prev.type = 'button'; prev.className = 'btn admin-btn-outline';
      prev.textContent = 'Preview';
      prev.addEventListener('click', ()=> openPreview(sec, false));

      // Edit: same view, scrolled to the content, admin banner visible.
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'btn admin-btn-outline';
      edit.textContent = 'Preview & edit content';
      edit.addEventListener('click', ()=> openPreview(sec, true));

      // Save dates without changing published/hidden.
      const saveOnly = document.createElement('button');
      saveOnly.type = 'button'; saveOnly.className = 'btn admin-btn-outline';
      saveOnly.textContent = 'Save dates only';
      saveOnly.addEventListener('click', async ()=>{
        if(pending.startsOn && pending.endsOn && pending.endsOn < pending.startsOn){
          admToast('The end date cannot be earlier than the start date.'); return;
        }
        saveOnly.disabled = true;
        try{
          await setSectionVisibility(sec.key, published, adminUser && adminUser.email, pending);
          render();
        }catch(err){ admToast('Could not save the dates.'); }
        finally{ saveOnly.disabled = false; }
      });

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = published ? 'btn admin-btn-outline' : 'btn dark';
      toggle.textContent = published ? 'Hide from Website' : 'Publish to Website';
      toggle.addEventListener('click', async ()=>{
        if(!published && pending.startsOn && pending.endsOn && pending.endsOn < pending.startsOn){
          admToast('The end date cannot be earlier than the start date.'); return;
        }
        const msg = published
          ? 'Hide this resource?\n\nThis will remove the ' + sec.name + ' section from public view. '
            + 'The content will remain available in the admin panel.'
          : 'Publish this resource?\n\nThis will make the ' + sec.name + ' section visible to the public '
            + 'on the CJHQ website'
            + (pending.startsOn ? ', starting ' + pending.startsOn : '')
            + (pending.endsOn ? ' and ending after ' + pending.endsOn : '') + '.';
        if(!(await admConfirm(msg))) return;
        toggle.disabled = true;
        try{
          await setSectionVisibility(sec.key, !published, adminUser && adminUser.email, pending);
          render();
        }catch(err){
          console.warn('[CJHQ] visibility change failed:', (err && err.code) || err);
          admToast('Could not change visibility. Check that you are still signed in and that the Firestore rules allow writing to settings.');
        }finally{ toggle.disabled = false; }
      });

      [prev, edit, saveOnly, toggle].forEach(b=> bar.appendChild(b));
      row.appendChild(bar);
      target.appendChild(row);
    });
  }

  /* Open a hidden section for this admin only.
     The earlier version set the preview flag and navigated, but never re-ran
     applySectionVisibility() - which only executes once during init - so the
     section's hidden attribute was still set and the page appeared blank or
     fell through to the 404. Re-applying visibility after setting the flag is
     what actually reveals it. */
  function openPreview(sec, scrollToContent){
    window.__sectionPreview = sec.key;
    applySectionVisibility();          // <- the missing step
    goPage(sec.routeId);
    // Show the admin banner so it is never mistaken for the live page.
    const banner = document.getElementById('siPreviewBanner');
    if(banner) banner.hidden = false;
    // Give the admin a way back, and a way to end the preview.
    showPreviewExitBar(sec);
    if(scrollToContent){
      setTimeout(()=>{
        const t = document.getElementById('siCountries');
        if(t) t.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 400);
    }
  }

  function showPreviewExitBar(sec){
    let bar = document.getElementById('siPreviewExit');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'siPreviewExit';
      bar.className = 'si-preview-exit';
      const txt = document.createElement('span');
      txt.textContent = 'Previewing a hidden section \u2014 only you can see this.';
      const back = document.createElement('button');
      back.type = 'button'; back.className = 'btn dark';
      back.textContent = 'Exit preview';
      back.addEventListener('click', ()=>{
        window.__sectionPreview = null;
        applySectionVisibility();
        bar.remove();
        goPage('admin');
        setTimeout(()=>{ const t=document.querySelector('.admin-tab-btn[data-tab="visibility"]'); if(t) t.click(); }, 300);
      });
      bar.appendChild(txt); bar.appendChild(back);
      document.body.appendChild(bar);
    }
    bar.hidden = false;
  }

  /* ---- notices and popups ---- */
  let noticeCache = [];

  async function loadNotices(){
    try{ noticeCache = await fetchCollection('notices'); }
    catch(err){ noticeCache = []; }
  }

  function renderNotices(target){
    const hidden = noticeCache.filter(n => scheduleState(n) !== 'live');
    const live   = noticeCache.filter(n => scheduleState(n) === 'live');

    const summary = document.createElement('p');
    summary.className = 'ask-help';
    summary.textContent = noticeCache.length
      ? (live.length + ' live \u00b7 ' + hidden.length + ' not currently showing')
      : 'No notices or popups have been created yet.';
    target.appendChild(summary);

    noticeCache.forEach(n=>{
      const state = scheduleState(n);
      const row = document.createElement('div');
      row.className = 'vis-row';

      const head = document.createElement('div');
      head.className = 'vis-name';
      head.textContent = (n.title_en || n.body_en || '(untitled)').slice(0, 70);
      const kind = document.createElement('span');
      kind.className = 'vis-kind';
      kind.textContent = n.type === 'banner' ? 'Banner' : (n.type === 'popup' ? 'Popup' : (n.type || 'Notice'));
      head.appendChild(kind);
      if(state !== 'live'){
        const flag = document.createElement('span');
        flag.className = 'vis-preview-flag'; flag.textContent = 'NOT SHOWING';
        head.appendChild(flag);
      }
      row.appendChild(head);
      row.appendChild(stateChip(state));

      if(n.body_en){
        const body = document.createElement('div');
        body.className = 'vis-audit';
        body.textContent = String(n.body_en).replace(/<[^>]+>/g,'').slice(0, 160);
        row.appendChild(body);
      }

      // Dates are edited in the Notices tab, alongside the notice itself.
      // Publishing shows them read-only so this stays an overview, not a second
      // place to edit the same thing.
      if(n.startsOn || n.endsOn){
        const win = document.createElement('div');
        win.className = 'vis-audit';
        win.textContent = 'Shows ' + (n.startsOn ? 'from ' + n.startsOn : 'immediately')
                        + (n.endsOn ? ' until ' + n.endsOn : ' with no end date');
        row.appendChild(win);
      }

      const bar = document.createElement('div');
      bar.className = 'vis-actions';

      // Send the admin to the real editor rather than duplicating the form.
      const editBtn = document.createElement('button');
      editBtn.type='button'; editBtn.className='btn admin-btn-outline';
      editBtn.textContent = 'Edit / set dates';
      editBtn.addEventListener('click', ()=>{
        const tab = document.querySelector('.admin-tab-btn[data-tab="notices"]');
        if(tab) tab.click();
        if(typeof editNotice === 'function'){ try{ editNotice(n.id); }catch(e){} }
        setTimeout(()=>{ const f=document.getElementById('noticeForm'); if(f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 250);
      });

      const draftBtn = document.createElement('button');
      draftBtn.type='button'; draftBtn.className='btn admin-btn-outline';
      draftBtn.textContent = n.draft ? 'Mark ready' : 'Save as draft';
      draftBtn.addEventListener('click', ()=> persist(n, { draft: !n.draft }, draftBtn));

      const act = document.createElement('button');
      act.type='button';
      act.className = n.active ? 'btn admin-btn-outline' : 'btn dark';
      act.textContent = n.active ? 'Deactivate' : 'Activate';
      act.addEventListener('click', async ()=>{
        const msg = n.active
          ? 'Deactivate this item?\n\nIt will stop showing on the website. The content is kept.'
          : 'Activate this item?\n\nIt will show on the website'
            + ((n.startsOn || n.endsOn) ? ' according to the dates set on it.' : ' immediately.');
        if(!(await admConfirm(msg))) return;
        persist(n, { active: !n.active }, act);
      });

      [editBtn, draftBtn, act].forEach(b=> bar.appendChild(b));
      row.appendChild(bar);
      target.appendChild(row);
    });
  }

  async function persist(notice, changes, btn){
    if(changes.startsOn && changes.endsOn && changes.endsOn < changes.startsOn){
      admToast('The end date cannot be earlier than the start date.'); return;
    }
    if(btn) btn.disabled = true;
    try{
      const updated = Object.assign({}, notice, changes);
      await saveToCollection('notices', updated);
      await loadNotices();
      render();
    }catch(err){
      console.warn('[CJHQ] notice save failed:', (err && err.code) || err);
      admToast('Could not save. Check that you are still signed in.');
    }finally{ if(btn) btn.disabled = false; }
  }

  function render(){
    box.innerHTML = '';
    const h1 = document.createElement('h3');
    h1.className = 'ask-h3'; h1.style.marginTop = '0';
    h1.textContent = 'Sections';
    box.appendChild(h1);
    renderSections(box);

    const h2 = document.createElement('h3');
    h2.className = 'ask-h3';
    h2.textContent = 'Notices & popups';
    box.appendChild(h2);
    renderNotices(box);
  }

  document.querySelectorAll('.admin-tab-btn').forEach(b=>{
    if(b.dataset.tab === 'visibility'){
      b.addEventListener('click', async ()=>{
        await loadSectionVisibility();
        await loadNotices();
        render();
      });
    }
  });
  render();
})();

/* ---------- Ask CJHQ admin UI ----------
   Wired only inside the admin panel. Conversations live in memory for the
   session and are never written to Firestore or logged, per the privacy
   requirement - "Clear" genuinely discards them. */
(function initAskCjhq(){
  const $a = (id) => document.getElementById(id);
  if(!$a('askLog')) return;   // public pages have no Ask CJHQ markup at all

  // Second lock, so the feature flag is not decorative. The markup only ships
  // inside admin.html today, but if it ever appeared anywhere else - a copied
  // partial, a generator change, a hand edit - this refuses to wire it up
  // while ASK_CJHQ_PUBLIC is false. It never blocks the admin panel, which is
  // what the ask UI is inside of.
  const inAdminPage = !!($a('askLog').closest && $a('askLog').closest('#page-admin'));
  if(!ASK_CJHQ_PUBLIC && !inAdminPage){
    console.warn('[CJHQ] Ask CJHQ markup found outside the admin page while the public flag is off - not initialising.');
    return;
  }

  let askTurns = [];          // in-memory only
  let showSources = true;
  let lastAnswer = '';

  function backendStatus(){
    const wired = (typeof ASK_BACKEND !== 'undefined') && ASK_BACKEND && typeof ASK_BACKEND.ask === 'function';
    const ready = wired && firebaseReady && appCheckReady;
    let msg;
    if(ready){
      msg = 'AI: <b>connected</b> \u00b7 model <b>' + ASK_AI_CONFIG.model + '</b> '
          + '(free tier 15 req/min, 500/day) \u00b7 App Check <b>active</b>.';
    }else if(wired && !appCheckReady){
      msg = 'AI: <b>ready</b> \u2014 App Check initializes on the first question. '
          + 'Answers still come from CJHQ\u2019s verified information.';
    }else if(wired && !firebaseReady){
      msg = 'AI: <b>Firebase not ready</b>. Answers come from CJHQ\u2019s verified information.';
    }else{
      msg = 'AI: <b>not connected</b>. Structured sources and the resource matcher answer directly.';
    }
    $a('askBackendStatus').innerHTML = msg + ' Public flag: <b>' + (ASK_CJHQ_PUBLIC ? 'ON' : 'OFF') + '</b>.';
  }


  function renderLog(){
    const log = $a('askLog');
    if(!askTurns.length){
      log.innerHTML = '<p class="ask-empty">No messages yet.</p>';
      return;
    }
    log.innerHTML = '';
    askTurns.forEach(t=>{
      if(t.role === 'user'){
        const d = document.createElement('div');
        d.className = 'ask-msg user';
        d.textContent = t.text;
        log.appendChild(d);
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'ask-msg bot';
      const bub = document.createElement('div');
      bub.className = 'ask-bubble';
      bub.textContent = t.res.answer;
      wrap.appendChild(bub);

      if(t.res.actions && t.res.actions.length){
        const acts = document.createElement('div');
        acts.className = 'ask-acts';
        t.res.actions.forEach(a=>{
          const safe = cjhqSafeUrl(a.url);
          if(!safe) return;                      // never render a link we cannot validate
          const el = document.createElement('a');
          el.className = 'ask-act';
          el.href = safe;
          el.textContent = a.label;
          if(!/^\//.test(safe)){ el.target = '_blank'; el.rel = 'noopener noreferrer'; }
          acts.appendChild(el);
        });
        if(acts.children.length) wrap.appendChild(acts);
      }

      // Admin diagnostics: which layer answered, how long it took, and what the
      // deterministic answer was, so AI phrasing can be compared against it.
      const meta = document.createElement('div');
      meta.className = 'ask-metabox';   // distinct from ask-srcbox: "Hide Sources" must not hide diagnostics
      let m = '<b>Answered by:</b> ' + (t.res.aiUsed ? ('Gemini \u2014 ' + cjhqEscapeHtml(t.res.aiModel || '')) : 'CJHQ deterministic layer');
      if(t.res.handler) m += ' \u00b7 handler: ' + cjhqEscapeHtml(t.res.handler);
      if(t.res.lang) m += ' \u00b7 detected language: ' + cjhqEscapeHtml(t.res.lang);
      if(typeof t.res.aiLatencyMs === 'number') m += ' \u00b7 ' + t.res.aiLatencyMs + ' ms';
      if(t.res.aiError) m += '<br><span style="color:#8A3B12">AI unavailable: ' + cjhqEscapeHtml(t.res.aiError) + '</span>';
      if(t.res.deterministicAnswer){
        m += '<br><br><b>CJHQ verified answer (before phrasing):</b><br>' + cjhqEscapeHtml(t.res.deterministicAnswer);
      }
      meta.innerHTML = m;
      wrap.appendChild(meta);

      if(showSources && t.res.sources && t.res.sources.length){
        const box = document.createElement('div');
        box.className = 'ask-srcbox';
        const head = document.createElement('div');
        head.innerHTML = '<b>Sources used</b> \u2014 handler: ' + cjhqEscapeHtml(t.res.handler || 'none');
        box.appendChild(head);
        t.res.sources.forEach(s=>{
          const line = document.createElement('div');
          line.style.marginTop = '5px';
          let html = cjhqEscapeHtml(s.name) + ' <span class="ask-dim">(' + cjhqEscapeHtml(s.type || '\u2014') + ')</span>';
          if(s.authoritative) html += '<span class="ask-flag auth">authoritative</span>';
          if(s.timeSensitive) html += '<span class="ask-flag time">time-sensitive</span>';
          const safe = cjhqSafeUrl(s.url);
          if(safe) html += '<br><span style="word-break:break-all">' + cjhqEscapeHtml(safe) + '</span>';
          line.innerHTML = html;
          box.appendChild(line);
        });
        wrap.appendChild(box);
      }
      log.appendChild(wrap);
    });
    log.scrollTop = log.scrollHeight;
  }

  async function send(){
    const input = $a('askInput');
    const q = input.value.trim();
    if(!q) return;
    askTurns.push({ role:'user', text:q });
    input.value = '';
    renderLog();
    $a('askSend').disabled = true;
    try{
      const res = await askCommunityAssistant(q);
      lastAnswer = res ? res.answer : '';
      askTurns.push({ role:'bot', res });
    }catch(err){
      console.warn('[CJHQ] Ask CJHQ failed:', err);
      askTurns.push({ role:'bot', res:{ answer:'Something went wrong preparing that answer.', sources:[], actions:[], handler:'error' }});
    }finally{
      $a('askSend').disabled = false;
      renderLog();
    }
  }

  $a('askForm').addEventListener('submit', (e)=>{ e.preventDefault(); send(); });
  $a('askNew').addEventListener('click', ()=>{ askTurns = []; lastAnswer=''; renderLog(); $a('askInput').focus(); });
  $a('askClear').addEventListener('click', ()=>{ askTurns = []; lastAnswer=''; renderLog(); });
  $a('askCopy').addEventListener('click', ()=>{
    if(!lastAnswer){ admToast('No response to copy yet.'); return; }
    navigator.clipboard.writeText(lastAnswer)
      .then(()=> admToast('Response copied.'))
      .catch(()=> admToast('Could not copy. Select the text manually.'));
  });
  $a('askToggleSources').addEventListener('click', ()=>{
    showSources = !showSources;
    $a('askToggleSources').textContent = showSources ? 'Hide Sources' : 'Show Sources';
    $a('askToggleSources').setAttribute('aria-pressed', String(showSources));
    renderLog();
  });

  /* ---------- knowledge source registry ---------- */
  let askSources = [];

  function renderSources(){
    const box = $a('askSourcesList');
    if(!askSources.length){
      box.innerHTML = '<p class="ask-empty">No sources stored yet. "Load Default Sources" seeds the registry.</p>';
      return;
    }
    box.innerHTML = '';
    askSources.forEach((s, i)=>{
      const row = document.createElement('div');
      row.className = 'ask-src-row' + (s.active ? '' : ' inactive');
      let flags = '';
      if(s.authoritative) flags += '<span class="ask-flag auth">authoritative</span>';
      if(s.timeSensitive) flags += '<span class="ask-flag time">time-sensitive</span>';
      row.innerHTML =
        '<div><b>' + cjhqEscapeHtml(s.name) + '</b> <span class="ask-dim">(' + cjhqEscapeHtml(s.type) + ')</span>' + flags + '</div>' +
        '<div class="u">' + cjhqEscapeHtml(s.url || '') + '</div>' +
        '<div style="margin-top:4px;">' + cjhqEscapeHtml(s.description || '') + '</div>' +
        '<div class="u" style="margin-top:4px;">integration: ' + cjhqEscapeHtml(s.integration || 'pending') +
        ' \u00b7 updates: ' + cjhqEscapeHtml(s.updateFrequency || '\u2014') + '</div>' +
        (s.notes ? '<div class="u" style="margin-top:4px;">' + cjhqEscapeHtml(s.notes) + '</div>' : '');
      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;';
      const t = document.createElement('button');
      t.type='button'; t.className='btn admin-btn-outline'; t.style.fontSize='.78rem';
      t.textContent = s.active ? 'Deactivate' : 'Activate';
      t.addEventListener('click', ()=> saveSource(Object.assign({}, s, { active: !s.active })));
      const d = document.createElement('button');
      d.type='button'; d.className='btn admin-btn-outline'; d.style.fontSize='.78rem';
      d.textContent = 'Remove';
      d.addEventListener('click', async ()=>{ if(await admConfirm('Remove "' + s.name + '" from the registry?')) removeSource(s); });
      bar.appendChild(t); bar.appendChild(d);
      row.appendChild(bar);
      box.appendChild(row);
    });
  }

  async function loadSources(){
    askSources = [];
    try{
      const fs = window.__fbFirestore;
      if(fs && typeof fbDb !== 'undefined' && fbDb){
        const snap = await fs.getDocs(fs.collection(fbDb, 'ask_sources'));
        snap.forEach(doc => askSources.push(Object.assign({ id: doc.id }, doc.data())));
      }
    }catch(err){
      console.warn('[CJHQ] could not load Ask CJHQ sources:', (err && err.code) || err);
    }
    renderSources();
  }

  async function saveSource(src){
    try{
      const fs = window.__fbFirestore;
      await fs.setDoc(fs.doc(fbDb, 'ask_sources', src.id), src);
      await loadSources();
    }catch(err){
      console.warn('[CJHQ] Ask CJHQ source save failed:', (err && err.code) || err);
      admToast('Could not save. The ask_sources collection may not be permitted by the published Firestore rules yet.');
    }
  }

  async function removeSource(src){
    try{
      const fs = window.__fbFirestore;
      await fs.deleteDoc(fs.doc(fbDb, 'ask_sources', src.id));
      await loadSources();
    }catch(err){
      console.warn('[CJHQ] Ask CJHQ source delete failed:', (err && err.code) || err);
      admToast('Could not remove. Check the Firestore rules for ask_sources.');
    }
  }

  $a('askSeedSources').addEventListener('click', async ()=>{
    if(!(await admConfirm('Load the default source registry? Existing entries with the same id will be overwritten.'))) return;
    for(const s of ASK_DEFAULT_SOURCES){ await saveSource(s); }
  });

  $a('askAddSource').addEventListener('click', async ()=>{
    const v = await admForm('Add a source', [
      { key:'name', label:'Source name', required:true },
      { key:'url', label:'Source URL (https://…)', type:'url' },
      { key:'type', label:'Source type', type:'select', options: ASK_SOURCE_TYPES, value:'Community' },
      { key:'description', label:'Short description' },
      { key:'authoritative', label:'Mark as authoritative', type:'checkbox' },
      { key:'timeSensitive', label:'This information is time-sensitive', type:'checkbox' }
    ], 'Add source');
    if(!v || !v.name) return;
    const name = v.name, url = v.url || '';
    if(url && !cjhqSafeUrl(url)){ admToast('That URL is not a valid http(s) address.', 'error'); return; }
    const type = v.type || 'Other';
    const src = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || ('src-' + Date.now()),
      name, url, type: ASK_SOURCE_TYPES.includes(type) ? type : 'Other',
      description: v.description || '',
      active:true, authoritative: !!v.authoritative,
      timeSensitive: !!v.timeSensitive,
      updateFrequency:'as needed', integration:'pending', notes:''
    };
    await saveSource(src);
  });


  /* ---------- Language Review bench (brief section 17) ----------
     Deterministic layer by default: useAI:false, so a review reads the CJHQ
     wording itself rather than Gemini's paraphrase of it. "Run with AI
     phrasing" is the separate button, because that is a different thing to
     review and it consumes free-tier quota.

     Nothing is written to Firestore and nothing is logged. */
  const LANG_BENCH = [
    { lang:'English',  q:'Where do I apply for a passport?' },
    { lang:'English',  q:'Where is the eruv?' },
    { lang:'English',  q:'When is shkia?' },
    { lang:'English',  q:'How do I contact Hatzolah?' },
    { lang:'English',  q:'Where can I find Shabbos information?' },
    { lang:'French',   q:'O\u00f9 puis-je demander un passeport canadien?' },
    { lang:'French',   q:'Comment contacter Hatzolah?' },
    { lang:'French',   q:'Quand est le coucher du soleil?' },
    { lang:'French',   q:'Est-ce que l\u2019erouv est ouvert?' },
    { lang:'Hebrew',   q:'\u05d0\u05d9\u05e4\u05d4 \u05d0\u05e4\u05e9\u05e8 \u05dc\u05d7\u05d3\u05e9 \u05d3\u05e8\u05db\u05d5\u05df?' },
    { lang:'Hebrew',   q:'\u05de\u05d4 \u05de\u05e6\u05d1 \u05d4\u05e2\u05d9\u05e8\u05d5\u05d1 \u05d4\u05d9\u05d5\u05dd?' },
    { lang:'Hebrew',   q:'\u05de\u05ea\u05d9 \u05d4\u05e9\u05e7\u05d9\u05e2\u05d4 \u05d4\u05d9\u05d5\u05dd \u05d1\u05de\u05d5\u05e0\u05d8\u05e8\u05d9\u05d0\u05d5\u05dc?' },
    { lang:'Hebrew',   q:'\u05d0\u05d9\u05da \u05d0\u05e0\u05d9 \u05d9\u05db\u05d5\u05dc \u05dc\u05d9\u05e6\u05d5\u05e8 \u05e7\u05e9\u05e8 \u05e2\u05dd \u05d4\u05e6\u05dc\u05d4?' },
    { lang:'Yiddish',  q:'\u05d5\u05d5\u05d0\u05d5 \u05e7\u05e2\u05df \u05d0\u05d9\u05da \u05d1\u05e2\u05d8\u05df \u05d0 \u05e7\u05d0\u05e0\u05d0\u05d3\u05d9\u05e9\u05df \u05e4\u05d0\u05e1\u05e4\u05d0\u05e8\u05d8?' },
    { lang:'Yiddish',  q:'\u05d5\u05d5\u05d0\u05e1 \u05d0\u05d9\u05d6 \u05d3\u05e2\u05e8 \u05de\u05e6\u05d1 \u05e4\u05d5\u05e0\u05e2\u05dd \u05e2\u05d9\u05e8\u05d5\u05d1?' },
    { lang:'Yiddish',  q:'\u05d5\u05d5\u05e2\u05df \u05d0\u05d9\u05d6 \u05e9\u05e7\u05d9\u05e2\u05d4 \u05d0\u05d9\u05df \u05de\u05d0\u05e0\u05d8\u05e8\u05e2\u05d0\u05dc \u05d4\u05d9\u05d9\u05e0\u05d8?' },
    { lang:'Yiddish',  q:'\u05d5\u05d5\u05d9 \u05d0\u05d6\u05d5\u05d9 \u05e7\u05e2\u05df \u05d0\u05d9\u05da \u05e8\u05d5\u05e4\u05df \u05d4\u05e6\u05dc\u05d4?' },
    { lang:'Yiddish',  q:'\u05d5\u05d5\u05e2\u05df \u05d0\u05d9\u05d6 \u05e8\u05d0\u05e9 \u05d4\u05e9\u05e0\u05d4 \u05d4\u05d9\u05d9 \u05d9\u05d0\u05e8?' },
    { lang:'Yiddish',  q:'\u05d5\u05d5\u05d0\u05e1 \u05d3\u05d0\u05e8\u05e3 \u05d0\u05d9\u05da \u05d5\u05d5\u05d9\u05e1\u05df \u05d5\u05d5\u05e2\u05d2\u05df \u05e8\u05d9\u05d9\u05d6\u05df \u05e7\u05d9\u05d9\u05df \u05e7\u05d0\u05e0\u05d0\u05d3\u05e2?' },
    { lang:'Yiddish',  q:'\u05d5\u05d5\u05d0\u05d5 \u05e7\u05e2\u05df \u05d0\u05d9\u05da \u05e4\u05d0\u05e8\u05e7\u05df \u05d3\u05d0 \u05d0\u05d9\u05df \u05d0\u05d5\u05d8\u05e8\u05de\u05d0\u05e0\u05d8?' },
    { lang:'Yiddish (Latin)', q:'vu ken ikh find passport information?' },
    { lang:'Yiddish (Latin)', q:'ven iz shkia in Montreal?' },
    { lang:'Yiddish (Latin)', q:'ver ken ikh rufen Hatzolah?' },
    { lang:'Yiddish (Latin)', q:'vos darf ikh wissen far travel?' },
    { lang:'Mixed',    q:'\u05d5\u05d5\u05d0\u05e1 \u05d3\u05d0\u05e8\u05e3 \u05d0\u05d9\u05da \u05d5\u05d5\u05d9\u05e1\u05df \u05d5\u05d5\u05e2\u05d2\u05df my passport?' },
    { lang:'Mixed',    q:'Can you tell me \u05d5\u05d5\u05e2\u05df is shkia?' }
  ];
  const LANG_NAME = { en:'English', fr:'French', he:'Hebrew', yi:'Yiddish' };
  let __benchRows = [];

  async function runLangBench(useAI){
    const out = document.getElementById('langBenchResults');
    const st  = document.getElementById('langBenchStatus');
    if(!out || !st) return;
    __benchRows = [];
    out.innerHTML = '';
    st.textContent = 'Running ' + LANG_BENCH.length + ' questions'
                   + (useAI ? ' with AI phrasing (throttled, this takes a while)' : '') + '\u2026';
    for(let i = 0; i < LANG_BENCH.length; i++){
      const c = LANG_BENCH[i];
      const t0 = Date.now();
      let res = null, err = '';
      try{
        res = await askCommunityAssistant(c.q, { useAI: !!useAI });
      }catch(e){ err = String((e && e.message) || e); }
      const ms = Date.now() - t0;
      const detected = res ? res.lang : '';
      const row = {
        expected: c.lang, question: c.q,
        detected: LANG_NAME[detected] || detected || '\u2014',
        detectedCode: detected,
        handler: res ? (res.handled ? res.handler : (res.handler || 'none')) : 'error',
        answer: err ? ('ERROR: ' + err) : (res ? res.answer : ''),
        sources: res ? (res.sources || []).map(s => s.name) : [],
        actions: res ? (res.actions || []).map(a => a.label + ' \u2014 ' + a.url) : [],
        ms: ms, ai: !!(res && res.aiUsed), aiError: (res && res.aiError) || ''
      };
      __benchRows.push(row);
      out.appendChild(benchRowEl(row));
      st.textContent = 'Ran ' + (i + 1) + ' of ' + LANG_BENCH.length + '\u2026';
    }
    const missing = (typeof __askMissingYi !== 'undefined') ? Array.from(__askMissingYi) : [];
    st.innerHTML = 'Done \u2014 ' + LANG_BENCH.length + ' questions.'
      + (missing.length
          ? ' <b style="color:#A23B3B;">' + missing.length + ' string(s) had no Yiddish and fell back to English.</b>'
          : ' <b>No string fell back out of Yiddish.</b>');
  }

  function benchRowEl(r){
    const d = document.createElement('div');
    d.className = 'card admin-row';
    d.style.cssText = 'display:block; margin-bottom:10px;';
    const mismatch = (r.expected.indexOf(r.detected) < 0 && r.expected !== 'Mixed');
    const isRtl = (r.detectedCode === 'he' || r.detectedCode === 'yi');
    const esc = (t) => String(t == null ? '' : t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    d.innerHTML =
      '<div style="font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--muted);">'
        + esc(r.expected) + ' \u00b7 detected <b style="' + (mismatch ? 'color:#A23B3B;' : '') + '">'
        + esc(r.detected) + '</b> \u00b7 handler <b>' + esc(r.handler) + '</b> \u00b7 '
        + r.ms + ' ms' + (r.ai ? ' \u00b7 AI phrasing' : '')
        + (r.aiError ? ' \u00b7 AI error: ' + esc(r.aiError) : '') + '</div>'
      + '<p style="margin:6px 0 4px 0; font-weight:600;'
        + (isRtl ? ' direction:rtl; text-align:right;' : '') + '">' + esc(r.question) + '</p>'
      + '<p style="margin:0 0 6px 0; white-space:pre-wrap;'
        + (isRtl ? ' direction:rtl; text-align:right;' : '') + '">' + esc(r.answer) + '</p>'
      + (r.actions.length
          ? '<div style="font-size:.8rem; color:var(--muted);">Links: ' + esc(r.actions.join(' \u00b7 ')) + '</div>' : '')
      + (r.sources.length
          ? '<div style="font-size:.8rem; color:var(--muted);">Sources: ' + esc(r.sources.join(', ')) + '</div>' : '');
    return d;
  }

  const _bRun   = document.getElementById('langBenchRun');
  const _bRunAI = document.getElementById('langBenchRunAI');
  const _bCopy  = document.getElementById('langBenchCopy');
  const _bClear = document.getElementById('langBenchClear');
  if(_bRun)   _bRun.addEventListener('click',   ()=> runLangBench(false));
  if(_bRunAI) _bRunAI.addEventListener('click', ()=> runLangBench(true));
  if(_bClear) _bClear.addEventListener('click', ()=>{
    __benchRows = [];
    document.getElementById('langBenchResults').innerHTML = '';
    document.getElementById('langBenchStatus').textContent = 'Cleared.';
  });
  if(_bCopy) _bCopy.addEventListener('click', ()=>{
    if(!__benchRows.length){ admToast('Run the review first.'); return; }
    const txt = __benchRows
      .filter(r => r.expected.indexOf('Yiddish') === 0 || r.expected === 'Mixed')
      .map(r => 'QUESTION: ' + r.question
              + '\nDETECTED: ' + r.detected
              + '\nANSWER:   ' + r.answer
              + '\nHANDLER:  ' + r.handler + '  (' + r.ms + ' ms)')
      .join('\n\n----------------\n\n');
    const header = 'CJHQ \u2014 Ask CJHQ Yiddish review sheet\n'
      + 'Please read the ANSWER lines. They were written by a developer, not a native\n'
      + 'Yiddish speaker. Mark anything that sounds wrong, stiff, or too literary.\n\n';
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(header + txt)
        .then(()=> admToast('Copied. Paste it into an email for the reviewer.'))
        .catch(()=> admToast('Could not copy automatically.'));
    }else{
      admToast('Clipboard not available in this browser.');
    }
  });

  // Populate when the tab is opened, so nothing is fetched until an admin looks.
  document.querySelectorAll('.admin-tab-btn').forEach(b=>{
    if(b.dataset.tab === 'askcjhq'){
      b.addEventListener('click', ()=>{ backendStatus(); renderLog(); loadSources(); });
    }
  });
  backendStatus(); renderLog();
})();

  document.getElementById('noticeForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const notice = {
      id: document.getElementById('noticeId').value || null,
      type: document.getElementById('noticeType').value,
      style: document.getElementById('noticeStyle').value,
      title_en: document.getElementById('noticeTitleEn').value,
      title_fr: document.getElementById('noticeTitleFr').value,
      body_en: document.getElementById('noticeBodyEn').value,
      body_fr: document.getElementById('noticeBodyFr').value,
      active: document.getElementById('noticeActive').checked,
      draft: document.getElementById('noticeDraft').checked,
      startsOn: document.getElementById('noticeStartsOn').value || '',
      endsOn: document.getElementById('noticeEndsOn').value || '',
    };
    if(notice.startsOn && notice.endsOn && notice.endsOn < notice.startsOn){
      admToast('The end date cannot be earlier than the start date.');
      return;
    }
    if(!notice.id) delete notice.id;
    // Drafts live in the staff-only notice_drafts collection, so their text is
    // never readable by visitors. Moving between the two keeps the same id.
    const src = (document.getElementById('noticeSource') || {}).value || 'notices';
    const dest = notice.draft ? 'notice_drafts' : 'notices';
    const existingId = notice.id || null;   // saveToCollection fills in an id for new notices
    await saveToCollection(dest, notice);
    if(existingId && src !== dest){ try{ await deleteFromCollection(src, existingId); }catch(e){} }
    admToast(notice.draft ? 'Draft saved. It does not show on the site.' : 'Notice saved.');
    document.getElementById('noticeForm').reset();
    document.getElementById('noticeId').value = '';
    document.getElementById('noticeSource').value = 'notices';
    renderAdminNoticesList();
    renderPublicNotices();
  });

  // Settings form
  document.getElementById('settingsForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const s = {
      org_en: document.getElementById('setOrgEn').value,
      org_fr: document.getElementById('setOrgFr').value,
      addr_en: document.getElementById('setAddrEn').value,
      addr_fr: document.getElementById('setAddrFr').value,
      phone: document.getElementById('setPhone').value,
      email: document.getElementById('setEmail').value,
      facebook: document.getElementById('setFacebook').value,
      x_url: document.getElementById('setX').value,
      tagline_en: document.getElementById('setTaglineEn').value,
      tagline_fr: document.getElementById('setTaglineFr').value,
      logo_url: document.getElementById('setLogoUrl').value,
      color_primary: document.getElementById('setColorPrimary').value,
      color_accent: document.getElementById('setColorAccent').value,
    };
    await saveSettingsDoc(s);
    applySettingsToSite(s);
    const msg = document.getElementById('settingsSavedMsg');
    msg.style.display = 'inline';
    setTimeout(()=>{ msg.style.display = 'none'; }, 2500);
  });

  document.getElementById('resetColorsBtn').addEventListener('click', async ()=>{
    document.getElementById('setColorPrimary').value = '#0E2149';
    document.getElementById('setColorAccent').value = '#2F4C7A';
    document.documentElement.style.removeProperty('--ink');
    document.documentElement.style.removeProperty('--burgundy');
    document.documentElement.style.removeProperty('--bronze');
    const existing = await fetchSettingsDoc() || {};
    await saveSettingsDoc({ ...existing, color_primary: '', color_accent: '' });
  });

  // Partners form
  document.getElementById('partnerCancelBtn').addEventListener('click', ()=>{
    document.getElementById('partnerForm').reset();
    document.getElementById('partnerId').value = '';
  });
  document.getElementById('partnerForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const p = {
      id: document.getElementById('partnerId').value || null,
      name: document.getElementById('partnerName').value,
      logoUrl: document.getElementById('partnerLogoUrl').value,
      linkUrl: document.getElementById('partnerLinkUrl').value,
    };
    if(!p.id) delete p.id;
    if(!p.name){ admToast('Organization name is required.'); return; }
    await saveToCollection('partners', p);
    document.getElementById('partnerForm').reset();
    document.getElementById('partnerId').value = '';
    renderAdminPartnersList();
    enhancePartnersFromBackend();
  });

  // Resources form
  document.getElementById('resourceCancelBtn').addEventListener('click', ()=>{
    document.getElementById('resourceForm').reset();
    document.getElementById('resourceId').value = '';
  });
  document.getElementById('resourceForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const r = {
      id: document.getElementById('resourceId').value || null,
      category: document.getElementById('resourceCategory').value,
      title_en: document.getElementById('resourceTitleEn').value,
      title_fr: document.getElementById('resourceTitleFr').value,
      desc_en: document.getElementById('resourceDescEn').value,
      desc_fr: document.getElementById('resourceDescFr').value,
      url: document.getElementById('resourceUrl').value,
    };
    if(!r.id) delete r.id;
    if(!r.title_en || !r.url){ admToast('Title and URL are required.'); return; }
    await saveToCollection('resources', r);
    document.getElementById('resourceForm').reset();
    document.getElementById('resourceId').value = '';
    renderAdminResourcesList();
    enhanceResourcesFromBackend();
  });

  // Calendar events form
  document.getElementById('eventCancelBtn').addEventListener('click', ()=>{
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
  });
  document.getElementById('eventForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const ev = {
      id: document.getElementById('eventId').value || null,
      title_en: document.getElementById('eventTitleEn').value,
      title_fr: document.getElementById('eventTitleFr').value,
      date: document.getElementById('eventDate').value,
      start_time: document.getElementById('eventStart').value,
      end_time: document.getElementById('eventEnd').value,
      location: document.getElementById('eventLocation').value,
      desc_en: document.getElementById('eventDescEn').value,
      desc_fr: document.getElementById('eventDescFr').value,
      link: document.getElementById('eventLink').value,
    };
    if(!ev.id) delete ev.id;
    if(!ev.title_en || !ev.date){ admToast('Title and date are required.'); return; }
    await saveToCollection('events', ev);
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    renderAdminEventsList();
  });
})();



/* ================================================================
 * Admin shell: mobile menu + Home dashboard
 * ----------------------------------------------------------------
 * The dashboard is read-only. It reads the same collections the tabs
 * already read (fetchCollection) and never writes anything. Each list
 * links to the tab where the item is actually managed.
 * ================================================================ */
function admSyncMenuLabel(tab){
  const btn = document.querySelector(`.admin-tab-btn[data-tab="${tab}"]`);
  const label = document.getElementById('admMenuCurrent');
  if(btn && label) label.textContent = btn.childNodes[0] ? btn.childNodes[0].textContent.trim() : btn.textContent.trim();
}
function admCloseMenu(){
  const side = document.querySelector('#page-admin .adm-side');
  const t = document.getElementById('admMenuToggle');
  if(side) side.classList.remove('open');
  if(t) t.setAttribute('aria-expanded','false');
}
(function initAdminShell(){
  const t = document.getElementById('admMenuToggle');
  if(!t) return;
  t.addEventListener('click', ()=>{
    const side = t.closest('.adm-side');
    const open = !side.classList.contains('open');
    side.classList.toggle('open', open);
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  const dash = document.getElementById('admDashboard');
  if(dash) dash.addEventListener('click', (e)=>{
    const go = e.target.closest && e.target.closest('[data-adm-go]');
    if(go) switchAdminTab(go.getAttribute('data-adm-go'));
  });
})();

function admAddDaysISO(iso, n){
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y, m-1, d + n);
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
}
function admFmtDay(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||''))) return '';
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
}
function admFmtWhen(v){
  const d = v ? new Date(v) : null;
  return (d && !isNaN(d.getTime())) ? d.toLocaleDateString(undefined, { month:'short', day:'numeric' }) : '';
}

let ADM_DASH_BUSY = false;
async function renderAdminDashboard(){
  const box = document.getElementById('admDashboard');
  if(!box || ADM_DASH_BUSY) return;
  ADM_DASH_BUSY = true;
  const esc = cjhqEscapeHtml;
  const today = cjhqTodayISO();
  const soon = admAddDaysISO(today, 7);
  const weekAgo = admAddDaysISO(today, -7);
  const dateEl = document.getElementById('admDashDate');
  if(dateEl) dateEl.textContent = 'Today: ' + admFmtDay(today) + '. Starting/ending soon means within 7 days.';
  const safe = (p) => p.then(v => v || [], () => null);   // null = could not load
  try{
    const [notices, pages, messages, reports, audits] = await Promise.all([
      safe(fetchCollection('notices')),
      safe(fetchCollection('custom_pages')),
      safe(fetchCollection('contact_submissions')),
      safe(fetchCollection('error_reports')),
      safe(fetchCollection('link_audits')),
    ]);
    try{ await loadSectionVisibility(); }catch(e){ /* shown as unavailable below */ }

    const section = (title, tab, items, empty) => `
      <section>
        <h3><span>${title}</span>${tab ? `<button type="button" data-adm-go="${tab}">Open</button>` : ''}</h3>
        ${items === null
          ? `<p class="adm-muted">Could not load. Check your connection or sign-in.</p>`
          : items.length ? `<ul>${items.join('')}</ul>` : `<p class="adm-muted">${empty}</p>`}
      </section>`;
    const li = (left, right) => `<li><span>${left}</span><span>${right || ''}</span></li>`;
    const title = (x) => esc(x.title_en || x.titleEn || x.title_fr || x.titleFr || x.slug || x.id || 'Untitled');

    // Messages: there is no read/unread flag in the data, so "new" = last 7 days.
    let msgItems = null;
    if(messages){
      const recent = messages
        .filter(m => (m.submittedAt||'').slice(0,10) >= weekAgo)
        .sort((a,b) => (b.submittedAt||'').localeCompare(a.submittedAt||''));
      const nameOf = (m) => { const k = Object.keys(m).find(k => /name/i.test(k) && m[k]); return k ? m[k] : (m.email || 'Message'); };
      msgItems = recent.slice(0,5).map(m => li(esc(String(nameOf(m))), admFmtWhen(m.submittedAt)));
      if(recent.length > 5) msgItems.push(li(`and ${recent.length-5} more`, ''));
    }

    // Notices: live now, starting soon, ending soon.
    let noticeItems = null;
    if(notices){
      noticeItems = [];
      const n = notices.filter(x => x.draft !== true && x.active);
      const kind = (x) => x.type === 'popup' ? 'Popup' : 'Banner';
      n.filter(isLiveNow).forEach(x => {
        const ends = (x.endsOn||'').trim();
        const endingSoon = ends && ends <= soon;
        noticeItems.push(li(`${kind(x)}: ${title(x)}`, endingSoon ? `<span class="adm-flag">ends ${esc(admFmtDay(ends))}</span>` : 'live'));
      });
      n.filter(x => scheduleState(x) === 'scheduled' && (x.startsOn||'') <= soon)
        .forEach(x => noticeItems.push(li(`${kind(x)}: ${title(x)}`, 'starts ' + esc(admFmtDay(x.startsOn)))));
    }

    // Pages: scheduled to start soon, live and ending soon.
    let pageItems = null;
    if(pages){
      pageItems = [];
      pages.forEach(p => {
        const st = cjhqPageLifecycle(p);
        const from = String(p.start_date||'').trim(), to = String(p.end_date||'').trim();
        if(st === 'scheduled' && from <= soon) pageItems.push(li(title(p), 'starts ' + esc(admFmtDay(from))));
        else if(st === 'live' && to && to <= soon) pageItems.push(li(title(p), `<span class="adm-flag">ends ${esc(admFmtDay(to))}</span>`));
      });
    }

    // Publishing: section visibility, with the existing change record.
    const pubItems = SECTION_KEYS.map(k => {
      const a = sectionAudit(k);
      const by = a.changedBy ? ` by ${esc(a.changedBy)}` : '';
      const when = a.changedAt ? ` ${esc(admFmtWhen(a.changedAt))}` : '';
      return li(esc(k), `${esc(a.state || a.status)}${a.changedAt || a.changedBy ? ' - changed' + when + by : ''}`);
    });

    // Link problems: visitor reports (last 30 days) + flagged audit items.
    let linkItems = null;
    if(reports || audits){
      linkItems = [];
      const monthAgo = admAddDaysISO(today, -30);
      const rep = (reports||[]).filter(r => (r.reportedAt||'').slice(0,10) >= monthAgo);
      const flagged = (audits||[]).filter(a => a.slug && a.slug !== '_run_summary' && a.status && a.status !== 'ok');
      if(rep.length) linkItems.push(li(`${rep.length} visitor report${rep.length===1?'':'s'} (broken links / errors, last 30 days)`, ''));
      if(flagged.length) linkItems.push(li(`${flagged.length} resource link${flagged.length===1?'':'s'} flagged by the audit`, ''));
    }

    box.innerHTML =
      section('New messages (last 7 days)', 'messages', msgItems, 'No new messages this week.') +
      section('Notices live or starting soon', 'notices', noticeItems, 'No notices live or starting in the next 7 days.') +
      section('Pages starting or ending soon', 'pages', pageItems, 'Nothing starting or ending in the next 7 days.') +
      section('Link problems', 'linkaudit', linkItems, 'No broken-link reports in the last 30 days.') +
      section('Publishing (hidden sections)', 'visibility', pubItems, 'No sections.');
  }finally{
    ADM_DASH_BUSY = false;
  }
}

/* ======================================================================
   Change history (Step 7)
   Every admin save and delete records one entry in admin_history: which
   collection and document, what happened, who did it, when, and the document
   as it was BEFORE the change. Restore puts that earlier version back, and the
   restore is itself recorded, so nothing is ever lost by restoring.

   Entries are append-only in the security rules (no edit, no delete).
   ADM_HISTORY_ON stays false until the admin_history rule is published: before
   that every history write would be refused, so recording is switched off and
   the History tab says so, rather than failing on each save.
   ====================================================================== */
const ADM_HISTORY_ON = true;
const ADM_HISTORY_SKIP = new Set(['admin_history']);
const ADM_HISTORY_MAX_BEFORE = 800000; // characters; Firestore caps a document at 1 MiB

async function admReadDocForHistory(name, id){
  if(!firebaseReady || !id) return null;
  try{
    const fs = window.__fbFirestore;
    const snap = await fs.getDoc(fs.doc(fbDb, name, id));
    return snap.exists() ? snap.data() : null;
  }catch(e){ return undefined; } // undefined = could not read; null = did not exist
}
async function admRecordHistory(entry){
  if(!ADM_HISTORY_ON || !firebaseReady) return;
  try{
    const fs = window.__fbFirestore;
    const by = (adminUser && adminUser.email ? adminUser.email : '').toLowerCase();
    let before = entry.before;
    let before_omitted = false;
    if(before !== undefined && before !== null){
      try{ if(JSON.stringify(before).length > ADM_HISTORY_MAX_BEFORE){ before = null; before_omitted = true; } }
      catch(e){ before = null; before_omitted = true; }
    }
    await fs.addDoc(fs.collection(fbDb, 'admin_history'), {
      collection: entry.collection,
      doc_id: entry.doc_id || '',
      action: entry.action,
      by,
      at: new Date().toISOString(),
      before: before === undefined ? null : before,
      before_known: before !== undefined,
      before_omitted,
      restored_from: entry.restored_from || null
    });
  }catch(e){
    console.warn('[CJHQ] history entry not recorded:', e);
    if(!admRecordHistory.warned){ admRecordHistory.warned = true; admToast('Saved, but the change history entry could not be recorded.', 'error'); }
  }
}
(function admWrapWritesForHistory(){
  const origSave = saveToCollection, origDelete = deleteFromCollection;
  saveToCollection = async function(name, record){
    if(!ADM_HISTORY_ON || ADM_HISTORY_SKIP.has(name)) return origSave(name, record);
    const had = !!(record && record.id);
    const before = had ? await admReadDocForHistory(name, record.id) : null;
    const out = await origSave(name, record);
    await admRecordHistory({ collection:name, doc_id: out && out.id, action: (had && before) ? 'update' : 'create', before });
    return out;
  };
  deleteFromCollection = async function(name, id){
    if(!ADM_HISTORY_ON || ADM_HISTORY_SKIP.has(name)) return origDelete(name, id);
    const before = await admReadDocForHistory(name, id);
    await origDelete(name, id);
    if(before === null) return; // nothing was there, so nothing changed
    await admRecordHistory({ collection:name, doc_id:id, action:'delete', before });
  };
})();

const ADM_COLLECTION_LABELS = {
  notices:'Notices & Popups', partners:'Partners', partner_overrides:'Partners', resources:'Resource Links',
  resource_overrides:'Resource Links', events:'Calendar', settings:'Site Settings', content_overrides:'Page Content',
  custom_pages:'Pages', page_settings:'Publishing', reviewed_overrides:'Reviewed dates',
  pending_change_notices:'Change notices', contact_submissions:'Messages', error_reports:'Error reports',
  staff:'Staff Access', ask_sources:'Ask CJHQ', link_audits:'Link Audit', resources_master:'Resource Links',
  content_drafts:'Page Content drafts', notice_drafts:'Notice drafts'
};
function admEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function admHistorySummary(before){
  if(!before) return '';
  const t = before.title_en || before.name_en || before.title || before.name || before.label_en || before.en || before.email || '';
  return String(t).replace(/<[^>]*>/g,'').slice(0, 90);
}
async function renderAdminHistory(){
  const list = document.getElementById('historyList');
  const note = document.getElementById('historyOffNote');
  if(!list) return;
  if(note) note.hidden = ADM_HISTORY_ON;
  if(!ADM_HISTORY_ON){ list.innerHTML = ''; return; }
  list.innerHTML = '<p style="color:var(--muted); font-size:.88rem;">Loading…</p>';
  let rows = [];
  try{
    const fs = window.__fbFirestore;
    const q = fs.query(fs.collection(fbDb, 'admin_history'), fs.orderBy('at','desc'), fs.limit(200));
    const snap = await fs.getDocs(q);
    rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }catch(e){
    list.innerHTML = '<p style="color:#A23B3B; font-size:.88rem;">Could not load the change history.</p>';
    return;
  }
  const filter = (document.getElementById('historyFilter') || {}).value || '';
  if(filter) rows = rows.filter(r => r.collection === filter);
  if(!rows.length){ list.innerHTML = '<p style="color:var(--muted); font-size:.88rem;">No changes recorded yet.</p>'; return; }
  window.__admHistoryRows = Object.fromEntries(rows.map(r => [r.id, r]));
  const verb = { create:'Added', update:'Edited', delete:'Deleted', restore:'Restored' };
  list.innerHTML = rows.map(r => {
    const when = r.at ? new Date(r.at).toLocaleString('en-CA', { dateStyle:'medium', timeStyle:'short', timeZone:'America/Toronto' }) : '';
    const canRestore = r.before_known && !r.before_omitted && r.action !== 'restore' ? true : (r.action === 'restore' && r.before_known);
    const sum = admHistorySummary(r.before);
    return `<div class="card admin-row" style="padding:10px 14px;">
      <div style="min-width:0;">
        <p style="margin:0; font-weight:600;">${admEsc(verb[r.action] || r.action)} · ${admEsc(ADM_COLLECTION_LABELS[r.collection] || r.collection)}</p>
        <p style="margin:2px 0 0; font-size:.8rem; color:var(--muted);">${admEsc(when)} · ${admEsc(r.by)}${sum ? ' · "' + admEsc(sum) + '"' : ''}</p>
        ${r.before_omitted ? '<p style="margin:2px 0 0; font-size:.78rem; color:var(--muted);">Earlier version too large to keep; cannot restore.</p>' : ''}
      </div>
      <div style="flex-shrink:0;">${canRestore ? `<button class="admin-small-btn" onclick="admRestoreHistory('${admEsc(r.id)}')">${r.action === 'restore' ? 'Undo this restore' : 'Restore earlier version'}</button>` : ''}</div>
    </div>`;
  }).join('');
}
async function admRestoreHistory(historyId){
  const r = (window.__admHistoryRows || {})[historyId];
  if(!r) return;
  const label = ADM_COLLECTION_LABELS[r.collection] || r.collection;
  const msg = r.before
    ? `Put back the version of this ${label} item from before this change? The current version is kept in the history.`
    : `This change added the item. Restoring removes it again. The current version is kept in the history. Continue?`;
  if(!(await admConfirm(msg))) return;
  try{
    const fs = window.__fbFirestore;
    const current = await admReadDocForHistory(r.collection, r.doc_id);
    if(r.before){ await fs.setDoc(fs.doc(fbDb, r.collection, r.doc_id), r.before); }
    else { await fs.deleteDoc(fs.doc(fbDb, r.collection, r.doc_id)); }
    await admRecordHistory({ collection:r.collection, doc_id:r.doc_id, action:'restore', before: current, restored_from: historyId });
    admToast('Restored. Visitors see the earlier version now.');
    renderAdminHistory();
  }catch(e){
    reportSaveFailure(r.collection, e);
  }
}

/* The shared save-failure message used a browser alert(). In the admin it now
   uses the same toast as everything else; the wording is unchanged. */
reportSaveFailure = function(name, err){
  const denied = err && (err.code === 'permission-denied' || /permission/i.test(err.message || ''));
  const msg = denied
    ? 'Could not save: the database rejected the change. Your session may have expired. Sign out and sign back in with your CJHQ staff account, then try again. Your change has NOT been saved - copy anything you typed before leaving this page.'
    : 'Could not save: ' + ((err && err.message) || 'unknown error') + '. Your change has NOT been saved.';
  console.error('[CJHQ] save failed for "' + name + '":', err);
  try{ admToast(msg, 'error'); }catch(e){}
};


/* ======================================================================
   Roles (Step 6, owner's choice A)
   Owner: everything, including the staff list. Editor: everything except
   the staff list. The security rules enforce this; the screens follow it so
   an editor is not shown controls that would be refused.
   Built-in (break-glass) accounts are always owners. A staff record with no
   role is an owner - that is how everyone on the list before roles existed
   keeps exactly the access they had. New people added here start as editor.
   ====================================================================== */
let ADM_OWN_ROLE = null;
function admRoleOf(rec){ return (rec && rec.role === 'editor') ? 'editor' : 'owner'; }
async function admLoadOwnRole(){
  if(!adminUser || !adminUser.email){ ADM_OWN_ROLE = null; return null; }
  try{
    const hash = await sha256Hex(staffDocId(adminUser.email));
    if(STAFF_EMAIL_HASHES.includes(hash)){ ADM_OWN_ROLE = 'owner'; admApplyRoleToUI(); return ADM_OWN_ROLE; }
  }catch(e){}
  try{
    const fs = window.__fbFirestore;
    const snap = await fs.getDoc(fs.doc(fbDb, 'staff', staffDocId(adminUser.email)));
    ADM_OWN_ROLE = snap.exists() ? admRoleOf(snap.data()) : 'editor';
  }catch(e){ ADM_OWN_ROLE = 'editor'; }
  admApplyRoleToUI();
  return ADM_OWN_ROLE;
}
function admApplyRoleToUI(){
  const editor = ADM_OWN_ROLE === 'editor';
  const addForm = document.getElementById('staffAddForm');
  if(addForm) addForm.style.display = editor ? 'none' : '';
  let note = document.getElementById('staffEditorNote');
  const list = document.getElementById('staffList');
  if(editor && !note && list){
    note = document.createElement('p');
    note.id = 'staffEditorNote';
    note.className = 'card';
    note.style.fontSize = '.88rem';
    note.textContent = 'You are an Editor, so you can see the staff list but not change it. Ask an Owner to add or remove people.';
    list.parentNode.insertBefore(note, list);
  }
  if(note) note.style.display = editor ? '' : 'none';
  const who = document.getElementById('adminSignedInAs');
  if(who && ADM_OWN_ROLE && adminUser){ who.textContent = adminUser.email + ' (' + (editor ? 'Editor' : 'Owner') + ')'; }
}
document.addEventListener('change', async (e)=>{
  const sel = e.target && e.target.closest && e.target.closest('select[data-staff-role]');
  if(!sel) return;
  const email = sel.getAttribute('data-staff-role');
  const role = sel.value === 'editor' ? 'editor' : 'owner';
  const ok = await admConfirm(role === 'owner'
    ? 'Make ' + email + ' an Owner? Owners can add and remove staff.'
    : 'Make ' + email + ' an Editor? Editors can change everything except the staff list.');
  if(!ok){ renderStaffList(); return; }
  try{
    const fs = window.__fbFirestore;
    const before = await admReadDocForHistory('staff', email);
    await fs.setDoc(fs.doc(fbDb, 'staff', email), { role }, { merge:true });
    await admRecordHistory({ collection:'staff', doc_id:email, action:'update', before });
    admToast(email + ' is now ' + (role === 'owner' ? 'an Owner.' : 'an Editor.'));
  }catch(err){ reportSaveFailure('staff', err); }
  renderStaffList();
});


/* ======================================================================
   Drafts (Step 8)
   A draft is saved to a staff-only collection, so its text cannot be read
   by visitors or through the database before it is published. Publishing
   is an ordinary save into the public collection, followed by removing the
   draft. Public pages never read the draft collections.
   ====================================================================== */
async function admSaveContentDraft(cid){
  const enVal = document.querySelector(`textarea[data-cid="${cid}"][data-lang="en"]`).value;
  const frVal = document.querySelector(`textarea[data-cid="${cid}"][data-lang="fr"]`).value;
  await saveToCollection('content_drafts', { id: cid, cid, en: enVal, fr: frVal,
    saved_by: (adminUser && adminUser.email) || '', saved_at: new Date().toISOString() });
  admToast('Draft saved. Visitors still see the current wording until you publish.');
  renderContentBlocksList();
}
async function admDiscardContentDraft(cid){
  if(!(await admConfirm('Discard this draft? The live wording is not affected.'))) return;
  await deleteFromCollection('content_drafts', cid);
  admToast('Draft discarded.');
  renderContentBlocksList();
}

/* Know the signed-in person's role as soon as the panel opens, not only when
   the Staff tab is visited. */
(function(){
  const orig = showAdminPanel;
  showAdminPanel = function(){ const r = orig.apply(this, arguments); try{ admLoadOwnRole(); }catch(e){} return r; };
})();


/* ======================================================================
   Link check results (Step 9)
   Written monthly by .github/workflows/link-audit.yml into
   data/link-audit.json on the site itself; read here. Nothing is stored in
   Firestore and nothing is edited automatically.
   ====================================================================== */
async function renderLinkCheckResults(){
  const sum = document.getElementById('linkCheckSummary');
  if(!sum) return;
  const esc = cjhqEscapeHtml;
  let rep = null;
  try{
    const r = await fetch('/data/link-audit.json?cb=' + Date.now(), { cache:'no-store' });
    if(r.ok) rep = await r.json();
  }catch(e){}
  const brokenBox = document.getElementById('linkCheckBroken');
  const unsureWrap = document.getElementById('linkCheckUnsureWrap');
  if(!rep){
    sum.innerHTML = '<p style="color:var(--muted);">No results yet. The first check runs on the 1st of the month, or on demand from the repository\'s Actions tab ("Monthly link check", then "Run workflow").</p>';
    brokenBox.innerHTML = ''; unsureWrap.style.display = 'none';
    return;
  }
  const when = new Date(rep.checked_at).toLocaleString('en-CA', { dateStyle:'medium', timeStyle:'short', timeZone:'America/Toronto' });
  const nb = (rep.broken || []).length, nu = (rep.unsure || []).length;
  sum.innerHTML = `<p style="margin:0;">Last checked <strong>${esc(when)}</strong>: ${rep.total} links, ${rep.ok} fine, ` +
    `<strong style="color:${nb ? '#A23B3B' : 'inherit'};">${nb} broken</strong>, ${nu} could not be confirmed.</p>`;
  const row = (x, color) => {
    const used = (x.used_by || []).map(u => esc(u.label)).join(', ');
    const why = x.status ? ('HTTP ' + x.status) : esc(x.error || 'no response');
    return `<div class="card" style="margin-bottom:8px; padding:10px 14px;">
      <p style="margin:0; font-size:.85rem; font-family:monospace; word-break:break-all;"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a></p>
      <p style="margin:4px 0 0; font-size:.8rem;"><span style="color:${color}; font-weight:600;">${why}</span>${used ? ' · used by: ' + used : ''}</p>
    </div>`;
  };
  brokenBox.innerHTML = nb ? rep.broken.map(x => row(x, '#A23B3B')).join('') : '<p style="color:var(--muted); font-size:.88rem;">No broken links found.</p>';
  unsureWrap.style.display = nu ? '' : 'none';
  document.getElementById('linkCheckUnsureCount').textContent = nu;
  document.getElementById('linkCheckUnsure').innerHTML = (rep.unsure || []).map(x => row(x, '#6B7280')).join('');
}

/* ================================================================
 * Image uploads: drag-and-drop / pick-a-file for the image URL fields
 * (site logo, partner logos). The URL input stays - pasting a link works
 * exactly as before and externally hosted images are untouched. The widget
 * only fills the input after a successful upload to Firebase Storage;
 * nothing is saved to Firestore until the form's own Save button is
 * pressed, and the preview shows what will be used before that.
 * ================================================================ */
const IMG_UPLOAD_TYPES = { 'image/png':'.png', 'image/jpeg':'.jpg', 'image/webp':'.webp', 'image/gif':'.gif', 'image/svg+xml':'.svg' };
const IMG_UPLOAD_MAX = 2 * 1024 * 1024;

async function cjhqImageStorage(){
  const stMod = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js');
  return { mod: stMod, storage: stMod.getStorage(window.__fbApp) };
}

function buildImageUploader(box){
  const input = document.getElementById(box.getAttribute('data-img-upload'));
  if(!input) return;
  box.innerHTML = `
    <div class="img-up-zone" style="margin:6px 0 2px; border:1.5px dashed var(--line); border-radius:8px; padding:12px 14px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#FAFBFD;">
      <button type="button" class="btn admin-btn-outline img-up-pick" style="font-size:.8rem;">Upload an image</button>
      <span class="img-up-hint" style="font-size:.78rem; color:var(--muted);">or drag one here - PNG, JPG, WebP, GIF or SVG, up to 2 MB. Pasting a URL above still works.</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" style="display:none;">
    </div>
    <div class="img-up-status" style="font-size:.8rem; margin:4px 0;"></div>
    <div class="img-up-preview" style="display:none; margin:6px 0;">
      <img alt="Image preview" style="max-height:72px; max-width:220px; border:1px solid var(--line); border-radius:6px; background:#fff; padding:4px;">
    </div>`;
  const zone = box.querySelector('.img-up-zone');
  const file = box.querySelector('input[type=file]');
  const statusEl = box.querySelector('.img-up-status');
  const prevBox = box.querySelector('.img-up-preview');
  const prevImg = prevBox.querySelector('img');
  const say = (msg, color) => { statusEl.textContent = msg || ''; statusEl.style.color = color || 'var(--muted)'; };
  const showPreview = (url) => {
    if(url && /^https?:\/\//i.test(url)){ prevImg.src = url; prevBox.style.display = 'block'; }
    else prevBox.style.display = 'none';
  };
  input.addEventListener('input', () => showPreview(input.value.trim()));
  showPreview(input.value.trim());
  box.querySelector('.img-up-pick').addEventListener('click', () => file.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = '#2F4C7A'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = 'var(--line)'; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--line)';
    if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  file.addEventListener('change', () => { if(file.files && file.files[0]) handleFile(file.files[0]); file.value = ''; });

  async function handleFile(f){
    if(!IMG_UPLOAD_TYPES[f.type]){ say('That file type is not supported. Use PNG, JPG, WebP, GIF or SVG.', '#A23B3B'); return; }
    if(f.size > IMG_UPLOAD_MAX){ say('That file is ' + (f.size/1048576).toFixed(1) + ' MB - the limit is 2 MB.', '#A23B3B'); return; }
    if(!firebaseReady || !window.__fbApp){ say('Not connected to the site backend. Reload the page and try again.', '#A23B3B'); return; }
    say('Uploading ' + f.name + '…');
    try{
      const { mod, storage } = await cjhqImageStorage();
      const safeName = (f.name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')) || ('image' + IMG_UPLOAD_TYPES[f.type]);
      const ref = mod.ref(storage, 'uploads/' + Date.now() + '-' + safeName);
      const snap = await mod.uploadBytes(ref, f, { contentType: f.type });
      const url = await mod.getDownloadURL(snap.ref);
      input.value = url;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      say('Uploaded ✓ - the URL is filled in above. Press Save to keep it.', '#3A7D52');
    }catch(e){
      console.error(e);
      say('Upload failed: ' + (e && e.message ? e.message : 'unknown error'), '#A23B3B');
    }
  }
}

/* ================================================================
 * AI instruction comparison: the "Run instruction check now" button calls
 * the instructionCheck Cloud Function with the signed-in staff member's ID
 * token. The function compares resources_master against each live page and
 * writes link_audits documents, which renderLinkAuditList() shows under
 * Flagged Items. The monthly run is a Cloud Scheduler job - same function.
 * ================================================================ */
const AI_CHECK_URL = 'https://instructioncheck-qu3jib66wa-ue.a.run.app';

async function runAiInstructionCheck(btn){
  const statusEl = document.getElementById('aiCheckStatus');
  const say = (t) => { if(statusEl) statusEl.textContent = t; };
  if(!adminUser){ say('Sign in first.'); return; }
  btn.disabled = true;
  say('Running… this reads every official page and takes a few minutes. Keep this tab open.');
  try{
    const token = await adminUser.getIdToken();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9.5 * 60 * 1000);
    const r = await fetch(AI_CHECK_URL, {
      method: 'POST',
      headers: { 'authorization': 'Bearer ' + token, 'content-type': 'application/json' },
      body: '{}',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const body = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error(body.error || ('HTTP ' + r.status));
    say('Done: ' + body.checked + ' pages compared - ' + body.changed + ' changed, ' + body.unclear + ' unclear, ' + body.errors + ' could not be read. Anything needing attention is under Flagged Items below.');
    renderLinkAuditList();
  }catch(e){
    say('The check failed: ' + (e && e.name === 'AbortError'
      ? 'it took too long - partial results are saved; press "Refresh Results" in a few minutes.'
      : (e && e.message) || e));
  }finally{
    btn.disabled = false;
  }
}

/* Shows the last AI run (from link_audits/_run_summary) above the run
   button whenever the Link Audit tab renders. */
async function renderAiCheckSummary(){
  const el = document.getElementById('aiCheckStatus');
  if(!el || el.dataset.busy === '1') return;
  if(!firebaseReady || !window.__fbFirestore) return;
  try{
    const fs = window.__fbFirestore;
    const snap = await fs.getDoc(fs.doc(fbDb, 'link_audits', '_run_summary'));
    if(!snap.exists()) return;
    const d = snap.data();
    if(d.source !== 'ai_instruction_check' || !d.lastRun) return;
    if(el.textContent) return; // a live run's own status wins
    const when = new Date(d.lastRun).toLocaleString('en-CA', { dateStyle:'medium', timeStyle:'short', timeZone:'America/Toronto' });
    el.textContent = 'Last check ' + when + ': ' + d.checked + ' pages compared - ' + d.changed + ' changed, ' + d.unclear + ' unclear, ' + d.errors + ' could not be read.';
  }catch(e){ /* summary is best-effort */ }
}
