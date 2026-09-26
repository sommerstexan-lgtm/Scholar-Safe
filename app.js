const APP_VERSION = '1.1.0';
const KEY = 'scholarsafe-v1';

const HELP = [
  { q: 'What does this app do?', t: 'app', a: 'It points you to official scholarship doors, checks offers for common scam signs, and keeps a history on this device. It does not apply for you, does not guarantee money, and does not upload your list.' },
  { q: 'Where is my data stored?', t: 'app', a: 'Only on this device, in this browser. There is no account and no cloud copy. The publisher cannot see your history.' },
  { q: 'How do parents see what I found?', t: 'family', a: 'On any item in List, tap Email family. That opens a short mail draft with the official link. They do not need this app. You still apply on the official site.' },
  { q: 'Why is backup so important?', t: 'family', a: 'A forgotten PIN, a cleared browser, a new phone, or “wipe site data” erases this copy. A recent export is the only backup. Export after any week you add notes, and again before February 1.' },
  { q: 'Which A&M application do I use?', t: 'tamu', a: 'If you are already enrolled at Texas A&M, use the University Scholarship Application at uwide.tamu.edu. That is the continuing-student door. The freshman Common App / ApplyTexas December 1 path is for students entering in the fall, not for students already on campus.' },
  { q: 'When does the A&M continuing application open?', t: 'tamu', a: 'It opens October 15 and the deadline is February 1 for the next academic year. There is no separate Submit button — it is complete when status turns green. Answer every section. Late applications are not considered.' },
  { q: 'Does parent income over $100,000 end all scholarships?', t: 'tamu', a: 'No. It often blocks need-based grants and promise-style tuition programs. Merit awards and many department or association awards do not use parent income. This app can hide need-only listings if you check that box in Situation.' },
  { q: 'Do we still file the FAFSA?', t: 'tamu', a: 'File if you want to be considered for any need-based piece. Merit-only review at A&M does not require it, but skipping the aid application means you will not be considered for need-based university funds.' },
  { q: 'I have about 30 credit hours. Freshman or sophomore?', t: 'tamu', a: 'Hour bands are used here only to sort sources. Around 30 hours is commonly sophomore standing. For A&M scholarships you are a continuing student if you have finished at least one semester and will enroll next year. Update the hours band when you cross 30, 60, or 90.' },
  { q: 'Why are “no essay” awards shown with a warning?', t: 'scam', a: 'Many no-essay “scholarships” are sweepstakes or lead funnels. Your contact data is the product. They stay in History so you remember you already saw them and why they were marked.' },
  { q: 'When is a Social Security number actually needed?', t: 'scam', a: 'Almost never at the first apply step of a private scholarship. Do not give SSN, bank routing, or a credit card to “hold” an award. If an official university or IRS form later needs a number, you will know because it is a real campus or government process.' },
  { q: 'Can I share this app with roommates?', t: 'share', a: 'Yes, if you choose to. Sharing the app does not reserve an award and does not hide official A&M applications. Never share your export file, notes, or Situation. Friends should start with an empty app.' },
  { q: 'Is there a master password?', t: 'app', a: 'No. The optional PIN only locks this copy on this device. Nobody — including the publisher — can look up your PIN. Forgot PIN erases this device copy. Import your last backup to recover.' },
  { q: 'How do I update the app?', t: 'app', a: 'Tap Check for update on Home or More. If a newer version is published, refresh or close and reopen so the new files load. Read What’s new — it explains fixes in everyday language.' },
  { q: 'The app looks old after an update.', t: 'app', a: 'Do a hard refresh (Chromebook: Shift + reload) or close the installed app and open it again. Check that the version in the top corner matches What’s new.' },
  { q: 'Something is broken. Do I text the publisher?', t: 'app', a: 'No. Use Menu → Report a problem. Fill every box. Take a screenshot, then attach it in your mail app.' },
  { q: 'How often should I look?', t: 'cadence', a: 'From October 15 to February 1, spend a short session each week on the University Scholarship Application and official department pages. The rest of the year, check official sources about once a month, and again when your hours band changes.' },
  { q: 'Who do we ask at A&M?', t: 'tamu', a: 'Scholarships & Financial Aid / Aggie One Stop. This app cannot confirm whether you will receive an award.' }
];

const state = {
  view: 'home',
  sources: [],
  remoteVersion: null,
  data: load()
};

function load() {
  try {
    return Object.assign(defaultData(), JSON.parse(localStorage.getItem(KEY) || 'null') || {});
  } catch {
    return defaultData();
  }
}
function defaultData() {
  return {
    seenWelcome: false,
    profile: { standing: 'continuing', hours: '', major: 'kinesiology', texas: 'yes', hideNeed: false, set: false },
    history: [],
    userSources: [],
    pinHash: '',
    unlocked: true,
    lastExport: '',
    dirtySinceExport: false,
    reportEmail: '',
    familyEmail: ''
  };
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state.data));
}

function $(id) { return document.getElementById(id); }

async function boot() {
  if (state.data.pinHash && sessionStorage.getItem('ss-open') !== '1') {
    $('lock').classList.remove('hidden');
    $('app').classList.add('hidden');
  }
  $('verLabel').textContent = 'v' + APP_VERSION;
  wireNav();
  wireLock();
  try {
    const [src, ver] = await Promise.all([
      fetch('sources.json?v=' + APP_VERSION).then((r) => r.json()),
      fetch('version.json?v=' + APP_VERSION).then((r) => r.json()).catch(() => null)
    ]);
    state.sources = src.items || [];
    state.remoteVersion = ver;
    if (ver && ver.reportEmail && !state.data.reportEmail) state.data.reportEmail = ver.reportEmail;
  } catch {
    state.sources = [];
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=' + APP_VERSION);
  }
  renderAll();
  maybeBanners();
}

function wireNav() {
  document.querySelectorAll('.nav button').forEach((b) => {
    b.onclick = () => show(b.dataset.view);
  });
}
function show(name) {
  state.view = name;
  document.querySelectorAll('.nav button').forEach((b) => {
    b.setAttribute('aria-current', b.dataset.view === name ? 'page' : 'false');
  });
  ['home','sources','check','history','menu'].forEach((v) => {
    const el = $('view-' + v);
    if (el) el.classList.toggle('hidden', v !== name);
  });
  if (name === 'history') renderHistory();
  if (name === 'sources') renderSources();
}

function wireLock() {
  $('pinGo').onclick = () => {
    const pin = $('pinIn').value;
    if (hash(pin) === state.data.pinHash) {
      sessionStorage.setItem('ss-open', '1');
      $('lock').classList.add('hidden');
      $('app').classList.remove('hidden');
    } else {
      $('pinErr').textContent = 'That PIN does not match.';
    }
  };
  $('pinWipe').onclick = () => {
    if (!confirm('This erases history, notes, and Situation on this device. Continue?')) return;
    state.data = defaultData();
    save();
    sessionStorage.removeItem('ss-open');
    location.reload();
  };
}

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return String(h);
}

function maybeBanners() {
  const ub = $('updateBanner');
  if (state.remoteVersion && state.remoteVersion.version && state.remoteVersion.version !== APP_VERSION) {
    ub.classList.remove('hidden');
    ub.innerHTML = '<strong>Update ready.</strong> Published version is ' + state.remoteVersion.version +
      '. Tap Check for update under More, then hard-refresh so the new files load.';
  }
  const bb = $('backupBanner');
  if (state.data.dirtySinceExport && state.data.history.length) {
    bb.classList.remove('hidden');
    bb.innerHTML = '<strong>Export overdue — this is your only backup.</strong> Open Family and save a file for a parent.';
  }
}

function renderAll() {
  renderHome();
  renderSources();
  renderCheck();
  renderHistory();
  renderMenu();
}

function profileLine() {
  const p = state.data.profile;
  if (!p.set) return 'Situation not set — showing general continuing-student sources.';
  const bits = ['continuing'];
  if (p.hours) bits.push(p.hours + ' hours');
  if (p.major) bits.push(p.major);
  if (p.hideNeed) bits.push('hiding need-only');
  return 'Situation: ' + bits.join(', ');
}

function renderHome() {
  const el = $('view-home');
  el.innerHTML = `
    <div class="card">
      <h2>Do this first</h2>
      <p class="hero">A&amp;M continuing-student application.<br><strong>Opens October 15</strong> · due <strong>February 1</strong></p>
      <p class="small muted">You are already enrolled. Use this door, not the freshman December form.</p>
      <div class="row">
        <a class="btn" href="https://uwide.tamu.edu/" target="_blank" rel="noopener">Open the A&amp;M form</a>
      </div>
    </div>
    <div class="card">
      <h3>Then</h3>
      <p>Find an official page. Check anything that looks off. Apply there yourself. Email family only if you want them to look at one lead.</p>
      <div class="row">
        <button class="primary" type="button" id="goFind">Find pages</button>
        <button class="ghost" type="button" id="goCheck">Check a listing</button>
      </div>
    </div>
    <div class="card ${state.data.seenWelcome ? 'hidden' : ''}" id="welcome">
      <p>Optional: save hours and major so Find hides need-only awards. You can skip this.</p>
      <div class="row">
        <button class="primary" type="button" id="skipWel">Skip</button>
        <button class="ghost" type="button" id="setWel">Set hours / major</button>
      </div>
    </div>
    <div class="card hidden" id="sitBox">${situationForm()}</div>
  `;
  $('goFind').onclick = () => show('sources');
  $('goCheck').onclick = () => show('check');
  if ($('skipWel')) $('skipWel').onclick = () => {
    state.data.seenWelcome = true; save(); $('welcome').classList.add('hidden');
  };
  if ($('setWel')) $('setWel').onclick = () => {
    state.data.seenWelcome = true; save(); $('welcome').classList.add('hidden'); $('sitBox').classList.remove('hidden');
  };
  bindSituation();
}

function situationForm() {
  const p = state.data.profile;
  return `
    <h3>Situation</h3>
    <p class="small muted">Optional. Used only to sort sources on this device. Never uploaded.</p>
    <label>Hours band</label>
    <select id="pHours">
      <option value="">Not set</option>
      <option ${p.hours==='under 30'?'selected':''}>under 30</option>
      <option ${p.hours==='30–59'?'selected':''}>30–59</option>
      <option ${p.hours==='60–89'?'selected':''}>60–89</option>
      <option ${p.hours==='90+'?'selected':''}>90+</option>
    </select>
    <label>Major family</label>
    <select id="pMajor">
      <option value="kinesiology" ${p.major==='kinesiology'?'selected':''}>Kinesiology / related</option>
      <option value="other" ${p.major==='other'?'selected':''}>Other</option>
    </select>
    <label>Texas resident</label>
    <select id="pTx">
      <option value="yes" ${p.texas==='yes'?'selected':''}>Yes</option>
      <option value="no" ${p.texas==='no'?'selected':''}>No</option>
      <option value="unsure" ${p.texas==='unsure'?'selected':''}>Not sure</option>
    </select>
    <label class="row" style="display:flex;gap:8px;align-items:center">
      <input type="checkbox" id="pNeed" ${p.hideNeed?'checked':''} style="width:auto" />
      Hide awards that are need-only (parent income often too high)
    </label>
    <div class="row" style="margin-top:10px">
      <button class="primary" type="button" id="saveSit">Save situation</button>
    </div>
  `;
}
function bindSituation() {
  const btn = $('saveSit');
  if (!btn) return;
  btn.onclick = () => {
    state.data.profile = {
      standing: 'continuing',
      hours: $('pHours').value,
      major: $('pMajor').value,
      texas: $('pTx').value,
      hideNeed: $('pNeed').checked,
      set: true
    };
    state.data.seenWelcome = true;
    save();
    renderHome();
    renderSources();
  };
}

function sourceVisible(s) {
  const p = state.data.profile;
  if (s.forFreshmanOnly) return false;
  if (p.hideNeed && s.need && !s.merit) return false;
  return true;
}

function renderSources() {
  const el = $('view-sources');
  const groups = [
    ['tamu', 'Texas A&M official'],
    ['dept', 'Department / major'],
    ['assoc', 'Associations'],
    ['dir', 'Directories (use with care)'],
    ['user', 'Added by you']
  ];
  const all = state.sources.concat(state.data.userSources.map((u) => Object.assign({ group: 'user' }, u)));
  el.innerHTML = `<div class="card"><h2>Find</h2>
    <p class="small muted">Official pages first. Open the site and apply there. This is not every scholarship in America.</p></div>` +
    groups.map(([g, label]) => {
      const items = all.filter((s) => s.group === g && sourceVisible(s));
      if (!items.length && g !== 'user') return '';
      return `<div class="card"><h3>${label}</h3>${items.map(sourceCard).join('') || '<p class="muted">None yet.</p>'}</div>`;
    }).join('') +
    `<div class="card"><h3>Add a source you verified</h3>
      <label>Title</label><input id="usTitle" />
      <label>Official URL</label><input id="usUrl" placeholder="https://" />
      <label>Note</label><input id="usNote" />
      <button class="primary" type="button" id="usAdd">Add to this device</button>
    </div>`;
  const add = $('usAdd');
  if (add) add.onclick = () => {
    const title = $('usTitle').value.trim();
    const url = $('usUrl').value.trim();
    if (!title || !url) return alert('Title and URL are required.');
    state.data.userSources.push({ id: 'u' + Date.now(), title, url, blurb: $('usNote').value.trim(), verified: new Date().toISOString().slice(0,10), merit: true, need: false });
    state.data.dirtySinceExport = true;
    save();
    renderSources();
    maybeBanners();
  };
}

function sourceCard(s) {
  const warn = s.warning ? `<span class="tag warn">Warning</span>` : '';
  return `<article>
    <p><strong>${esc(s.title)}</strong> ${warn}</p>
    <p class="small">${esc(s.blurb || '')}</p>
    ${s.warning ? `<p class="small">${esc(s.warning)}</p>` : ''}
    <p class="small muted">Verified ${esc(s.verified || '—')} · ${s.merit ? 'merit ' : ''}${s.need ? 'need ' : ''}</p>
    <p><a href="${esc(s.url)}" target="_blank" rel="noopener">Open official page</a></p>
  </article>`;
}

function renderCheck() {
  $('view-check').innerHTML = `
    <div class="card">
      <h2>Check an offer</h2>
      <p class="small muted">Paste a name, message, or URL. Nothing is sent anywhere. The result is saved to History.</p>
      <label>What did you see?</label>
      <textarea id="offerText" rows="5" placeholder="Name of award, email text, or website"></textarea>
      <label>URL if you have one</label>
      <input id="offerUrl" placeholder="https://" />
      <div class="row"><button class="primary" type="button" id="runCheck">Check</button></div>
      <div id="checkOut"></div>
    </div>`;
  $('runCheck').onclick = runCheck;
}

function runCheck() {
  const text = ($('offerText').value + ' ' + $('offerUrl').value).trim();
  if (!text) return;
  const flags = flagOffer(text);
  const rec = {
    id: Date.now(),
    when: new Date().toISOString(),
    text: $('offerText').value.trim(),
    url: $('offerUrl').value.trim(),
    flags,
    status: flags.some((f) => f.level === 'stop') ? 'warned' : 'reviewed',
    note: ''
  };
  state.data.history.unshift(rec);
  state.data.dirtySinceExport = true;
  save();
  $('checkOut').innerHTML = resultHtml(rec);
  const em = $('emailThis');
  if (em) em.onclick = () => emailLead(rec);
  maybeBanners();
}

function flagOffer(raw) {
  const t = raw.toLowerCase();
  const flags = [];
  const hit = (re, level, why) => { if (re.test(t)) flags.push({ level, why }); };
  hit(/application fee|processing fee|handling fee|pay (now|today|a fee)|wire |gift card|bitcoin|crypto/, 'stop', 'Asks for money or a payment method to apply or “release” funds.');
  hit(/social security|\bssn\b|bank account|routing number|credit card|debit card|fsa id|fafsa password/, 'stop', 'Asks for SSN, bank, card, or federal login at apply time.');
  hit(/you('ve| have) been selected|congratulations you (won|have won)|guaranteed (scholarship|award)|pre-?approved|no one else can/, 'stop', 'Claims you won or are guaranteed money without a real application.');
  hit(/act now|expires today|24 hours|limited spots|urgent/, 'warn', 'Uses pressure or a fake countdown.');
  hit(/no essay|no-essay|sweepstakes|enter to win/, 'warn', 'No-essay or sweepstakes style — often a data funnel. Shown so you remember you already saw it.');
  hit(/\$\s?(5|10|15|20|25),?000|million dollar/, 'warn', 'Very large dollar amount with thin requirements is often bait.');
  if (!flags.length) flags.push({ level: 'ok', why: 'No automatic red flag. Still open the sponsor’s official site and never pay to apply.' });
  return flags;
}

function resultHtml(rec) {
  const worst = rec.flags.some((f) => f.level === 'stop') ? 'bad' : rec.flags.some((f) => f.level === 'warn') ? 'warn' : 'ok';
  return `<div class="card"><p><span class="tag ${worst}">${worst === 'bad' ? 'Do not proceed' : worst === 'warn' ? 'Warning' : 'No auto flag'}</span></p>
    <ul>${rec.flags.map((f) => `<li>${esc(f.why)}</li>`).join('')}</ul>
    <p class="small muted">Saved to List.</p>
    <button class="ghost" type="button" id="emailThis">Email family this one</button></div>`;
}

function renderHistory() {
  const q = (window._histQ || '').toLowerCase();
  const filter = window._histF || 'all';
  let rows = state.data.history;
  if (filter === 'warned') rows = rows.filter((r) => r.status === 'warned' || r.flags.some((f) => f.level !== 'ok'));
  if (filter === 'applying') rows = rows.filter((r) => r.status === 'applying');
  if (filter === 'skipped') rows = rows.filter((r) => r.status === 'skipped');
  if (q) rows = rows.filter((r) => (r.text + r.url + r.note).toLowerCase().includes(q));
  $('view-history').innerHTML = `
    <div class="card">
      <h2>List</h2>
      <input id="histQ" placeholder="Search history" value="${esc(window._histQ || '')}" />
      <div class="row" style="margin-top:8px">
        <button class="ghost" type="button" data-f="all">All</button>
        <button class="ghost" type="button" data-f="warned">Warned</button>
        <button class="ghost" type="button" data-f="applying">Applying</button>
        <button class="ghost" type="button" data-f="skipped">Skipped</button>
      </div>
    </div>
    <div class="card list">${rows.map(histCard).join('') || '<p class="muted">Nothing saved yet.</p>'}</div>`;
  $('histQ').oninput = (e) => { window._histQ = e.target.value; renderHistory(); };
  document.querySelectorAll('#view-history [data-f]').forEach((b) => b.onclick = () => { window._histF = b.dataset.f; renderHistory(); });
  rows.forEach((r) => {
    const st = document.querySelector('[data-st="'+r.id+'"]');
    const nt = document.querySelector('[data-nt="'+r.id+'"]');
    if (st) st.onchange = () => { r.status = st.value; state.data.dirtySinceExport = true; save(); };
    if (nt) nt.onchange = () => { r.note = nt.value; state.data.dirtySinceExport = true; save(); };
    const em = document.querySelector('[data-em="'+r.id+'"]');
    if (em) em.onclick = () => emailLead(r);
  });
}

function histCard(r) {
  const warn = r.flags.some((f) => f.level === 'stop') ? 'bad' : r.flags.some((f) => f.level === 'warn') ? 'warn' : '';
  return `<article>
    <p>${warn ? `<span class="tag ${warn}">${warn === 'bad' ? 'Stop' : 'Warning'}</span>` : ''}
      <strong>${esc(r.text.slice(0, 80) || r.url || 'Offer')}</strong></p>
    <p class="small muted">${esc(r.when.slice(0,10))} ${esc(r.url)}</p>
    <ul class="small">${r.flags.map((f) => `<li>${esc(f.why)}</li>`).join('')}</ul>
    <label>Status</label>
    <select data-st="${r.id}">
      <option value="reviewed" ${r.status==='reviewed'?'selected':''}>Reviewed</option>
      <option value="warned" ${r.status==='warned'?'selected':''}>Warned</option>
      <option value="applying" ${r.status==='applying'?'selected':''}>Applying</option>
      <option value="skipped" ${r.status==='skipped'?'selected':''}>Skipped</option>
      <option value="submitted" ${r.status==='submitted'?'selected':''}>Submitted</option>
    </select>
    <label>Note</label>
    <input data-nt="${r.id}" value="${esc(r.note)}" />
    <div class="row" style="margin-top:8px">
      <button class="ghost" type="button" data-em="${r.id}">Email family this one</button>
    </div>
  </article>`;
}

function emailLead(rec) {
  const to = state.data.familyEmail || '';
  const flags = (rec.flags || []).map((f) => '- ' + f.why).join('\n');
  const body = [
    'Possible scholarship to review',
    '',
    rec.text || '(no title)',
    rec.url ? 'Link: ' + rec.url : 'No link saved — please ask me for the official page.',
    '',
    'What the checker said:',
    flags || '- No automatic flag',
    '',
    rec.note ? ('My note: ' + rec.note) : '',
    '',
    'I have not applied. I will apply on the official site if this looks real.',
    '',
    '(Sent from ScholarSafe v' + APP_VERSION + ')'
  ].filter(Boolean).join('\n');
  if (!to) {
    navigator.clipboard.writeText(body).then(() => alert('No family email saved yet. The text was copied. Open Menu, add an email, or paste this into a message.')).catch(() => alert(body));
    return;
  }
  location.href = 'mailto:' + encodeURIComponent(to) +
    '?subject=' + encodeURIComponent('Scholarship to review') +
    '&body=' + encodeURIComponent(body);
}

function renderFamily() {
  renderMenu();
}

function doExport() {
  const blob = new Blob([JSON.stringify({
    app: 'ScholarSafe',
    version: APP_VERSION,
    exported: new Date().toISOString(),
    profile: state.data.profile,
    history: state.data.history,
    userSources: state.data.userSources
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'scholarsafe-backup.json';
  a.click();
  state.data.lastExport = new Date().toISOString();
  state.data.dirtySinceExport = false;
  save();
  $('backupBanner').classList.add('hidden');
  renderFamily();
}

function doImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const j = JSON.parse(reader.result);
      if (!j.history && !j.profile) throw new Error('not a ScholarSafe file');
      if (!confirm('Replace this device’s list with the file?')) return;
      state.data.profile = Object.assign(defaultData().profile, j.profile || {});
      state.data.history = j.history || [];
      state.data.userSources = j.userSources || [];
      state.data.lastExport = j.exported || new Date().toISOString();
      state.data.dirtySinceExport = false;
      save();
      renderAll();
      alert('Imported.');
    } catch {
      alert('That file could not be read.');
    }
  };
  reader.readAsText(file);
}

function renderHelp() {
  $('view-help').innerHTML = `
    <div class="card">
      <h2>Help</h2>
      <input id="helpQ" placeholder="Search help" />
    </div>
    <div class="card" id="helpList">${helpList('')}</div>`;
  $('helpQ').oninput = (e) => { $('helpList').innerHTML = helpList(e.target.value); };
}

function helpList(q) {
  const s = q.toLowerCase();
  const items = HELP.filter((h) => !s || (h.q + h.a + h.t).toLowerCase().includes(s));
  return items.map((h) => `<details class="help-item"><summary>${esc(h.q)}</summary><p>${esc(h.a)}</p></details>`).join('') || '<p>No matching card. Try another word or Report a problem.</p>';
}

function renderMenu() {
  const el = $('view-menu');
  if (!el) return;
  el.innerHTML = `
    <div class="card">
      <h2>Menu</h2>
      <p>Version <strong>${APP_VERSION}</strong></p>
      <div class="row">
        <button class="primary" type="button" id="mUpd">Check for update</button>
      </div>
    </div>
    <div class="card">
      <h3>Family email</h3>
      <p class="small muted">Used when you tap Email family this one. They do not need the app.</p>
      <input id="famMail" value="${esc(state.data.familyEmail)}" placeholder="parent@email" />
      <div class="row" style="margin-top:8px"><button class="primary" type="button" id="saveFam">Save email</button></div>
    </div>
    <div class="card">
      <h3>Backup file</h3>
      <p class="small muted">Last export: ${esc(state.data.lastExport || 'never')}</p>
      <div class="row">
        <button class="ghost" type="button" id="doExp">Export</button>
        <label class="ghost">Import<input type="file" id="doImp" accept="application/json,.json" hidden /></label>
      </div>
    </div>
    <div class="card">
      <h3>Help</h3>
      <input id="helpQ" placeholder="Search help" />
      <div id="helpList">${helpList('')}</div>
    </div>
    <div class="card">
      <h3>What’s new</h3>
      <div id="wn"></div>
    </div>
    <div class="card">
      <h3>Privacy</h3>
      <p>No account. No upload. Optional PIN is only a lock on this device. Export is optional and visible. Problem reports open your own mail app.</p>
    </div>
    <div class="card">
      <h3>Optional PIN</h3>
      <p class="small muted">Privacy screen only. There is no master password.</p>
      <label>New PIN</label><input id="newPin" type="password" inputmode="numeric" />
      <div class="row">
        <button class="primary" type="button" id="setPin">Set PIN</button>
        <button class="ghost" type="button" id="clrPin">Remove PIN</button>
      </div>
    </div>
    <div class="card">
      <h3>Report a problem</h3>
      <label>Where</label>
      <select id="rpWhere">
        <option>Home</option><option>Sources</option><option>Check</option>
        <option>History</option><option>Family</option><option>Help</option><option>More</option>
      </select>
      <label>What I tapped</label><input id="rpTap" />
      <label>What happened</label><textarea id="rpHap" rows="3"></textarea>
      <label>What I thought would happen</label><textarea id="rpExp" rows="3"></textarea>
      <label>Email to (publisher)</label><input id="rpMail" value="${esc(state.data.reportEmail)}" placeholder="parent-or-publisher@email" />
      <p class="small muted">Take a screenshot with your phone or Chromebook (not this button). Attach it in the mail app after the draft opens.</p>
      <button class="primary" type="button" id="rpGo">Open email draft</button>
    </div>`;
  $('mUpd').onclick = checkUpdate;
  $('saveFam').onclick = () => {
    state.data.familyEmail = $('famMail').value.trim();
    save();
    alert('Family email saved on this device.');
  };
  if ($('doExp')) $('doExp').onclick = doExport;
  if ($('doImp')) $('doImp').onchange = doImport;
  if ($('helpQ')) $('helpQ').oninput = (e) => { $('helpList').innerHTML = helpList(e.target.value); };
  $('setPin').onclick = () => {
    const p = $('newPin').value;
    if (p.length < 4) return alert('Use at least 4 digits or characters.');
    state.data.pinHash = hash(p);
    save();
    alert('PIN saved on this device only.');
  };
  $('clrPin').onclick = () => { state.data.pinHash = ''; save(); alert('PIN removed.'); };
  $('rpGo').onclick = sendReport;
  loadWhatsNew();
}

async function loadWhatsNew() {
  try {
    const j = await fetch('whats-new.json?v=' + APP_VERSION).then((r) => r.json());
    $('wn').innerHTML = (j.entries || []).map((e) =>
      `<p><strong>v${esc(e.version)}</strong> · ${esc(e.date)}</p>` +
      e.items.map((i) => `<p><strong>What was going on:</strong> ${esc(i.wrong)}<br><strong>What changed:</strong> ${esc(i.changed)}<br><strong>What you should do:</strong> ${esc(i.do)}</p>`).join('')
    ).join('');
  } catch {
    $('wn').textContent = 'Could not load notes (offline).';
  }
}

async function checkUpdate() {
  try {
    const j = await fetch('version.json?v=' + Date.now()).then((r) => r.json());
    if (j.version === APP_VERSION) alert('You are on v' + APP_VERSION + '. No newer file is published.');
    else alert('Published version is ' + j.version + '. Hard-refresh or close and reopen so sw.js?v=' + j.version + ' can load.');
  } catch {
    alert('Could not reach version.json. Try again on a network.');
  }
}

function sendReport() {
  const tap = $('rpTap').value.trim();
  const hap = $('rpHap').value.trim();
  const exp = $('rpExp').value.trim();
  if (!tap || !hap || !exp) return alert('Fill what you tapped, what happened, and what you expected.');
  const to = $('rpMail').value.trim();
  state.data.reportEmail = to;
  save();
  const body = [
    'ScholarSafe problem report',
    'Version: ' + APP_VERSION,
    'When: ' + new Date().toISOString(),
    'Screen: ' + $('rpWhere').value,
    'Browser: ' + navigator.userAgent,
    '',
    'What I tapped:', tap,
    '',
    'What happened:', hap,
    '',
    'What I thought would happen:', exp,
    '',
    'Please attach the screenshot you took on the device.'
  ].join('\n');
  if (!to) {
    navigator.clipboard.writeText(body).then(() => alert('No email on file. The report was copied. Paste it into a message to the publisher and attach a screenshot.')).catch(() => alert(body));
    return;
  }
  location.href = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent('ScholarSafe v' + APP_VERSION + ' — ' + $('rpWhere').value) + '&body=' + encodeURIComponent(body);
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

boot();
