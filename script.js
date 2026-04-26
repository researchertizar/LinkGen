// ══════════════════════════════════════════════
//  script.js – LinkGen Pro
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let currentVars = [];
let fieldValues = {};
let savedTemplates = JSON.parse(localStorage.getItem('lgp_templates') || '[]');
let linkHistory = JSON.parse(localStorage.getItem('lgp_history') || '[]');
let generatedLink = '';
let previewDebounce;

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!', 'accent')).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast('Copied!', 'accent');
    });
}

// ══════════════════════════════════════════════
//  NAV TABS
// ══════════════════════════════════════════════
document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
    });
});

// Sub-tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.closest('.panel');
        parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        parent.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('sub-' + btn.dataset.sub).classList.add('active');
    });
});

// ══════════════════════════════════════════════
//  TEMPLATE & VARIABLES
// ══════════════════════════════════════════════
const templateInput = document.getElementById('templateInput');
const varPills = document.getElementById('varPills');
const fieldList = document.getElementById('fieldList');

function extractVars(tpl) {
    return [...new Set([...tpl.matchAll(/\{([^}]+)\}/g)].map(m => m[1]))];
}

function renderVarPills(vars) {
    varPills.innerHTML = '';
    vars.forEach(v => {
        const p = document.createElement('div');
        p.className = 'var-pill';
        p.textContent = '{' + v + '}';
        varPills.appendChild(p);
    });
}

function renderFields(vars) {
    fieldList.innerHTML = '';
    if (vars.length === 0) {
        fieldList.innerHTML = '<div class="empty">No variables detected yet.</div>';
        return;
    }
    vars.forEach(v => {
        const row = document.createElement('div');
        row.className = 'field-item';
        row.innerHTML =
            `<div class="field-var-tag">{${esc(v)}}</div>
      <input class="field-input" type="text" data-var="${esc(v)}" placeholder="${esc(v)}…" value="${esc(fieldValues[v] || '')}" style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:var(--mono);font-size:12px;padding:9px 12px;outline:none;flex:1;" />`;
        row.querySelector('input').addEventListener('input', e => {
            fieldValues[v] = e.target.value;
            updateBrowserBar();
            scheduleLivePreview();
        });
        fieldList.appendChild(row);
    });
}

function buildLink() {
    let t = templateInput.value.trim();
    if (!t) return '';
    currentVars.forEach(v => {
        t = t.split('{' + v + '}').join(fieldValues[v] || '{' + v + '}');
    });
    return t;
}

function updateBrowserBar() {
    const t = templateInput.value.trim();
    const url = document.getElementById('browserUrl');
    const label = document.getElementById('previewLabel');
    if (!t) {
        url.textContent = 'about:blank';
        label.textContent = 'Enter a URL template to get started →';
        return;
    }
    let html = esc(t);
    currentVars.forEach(v => {
        const val = fieldValues[v];
        if (val) html = html.split('{' + esc(v) + '}').join(`<span class="filled">${esc(val)}</span>`);
        else html = html.split('{' + esc(v) + '}').join(`<span class="unfilled">{${esc(v)}}</span>`);
    });
    url.innerHTML = html;
    label.textContent = buildLink() || t;
}

templateInput.addEventListener('input', () => {
    const vars = extractVars(templateInput.value);
    currentVars = vars;
    fieldValues = Object.fromEntries(vars.map(v => [v, fieldValues[v] || '']));
    renderVarPills(vars);
    renderFields(vars);
    updateBrowserBar();
    scheduleLivePreview();
});

// ══════════════════════════════════════════════
//  LIVE PREVIEW
// ══════════════════════════════════════════════
function scheduleLivePreview() {
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(updateLivePreview, 400);
}

function updateLivePreview() {
    const frame = document.getElementById('previewFrame');
    const html = buildOutputHtml(true);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    frame.src = url;
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

document.getElementById('refreshPreviewBtn').addEventListener('click', updateLivePreview);

// ══════════════════════════════════════════════
//  COLOR CONTROLS
// ══════════════════════════════════════════════
function syncColor(inputId, textId, previewId) {
    const input = document.getElementById(inputId);
    const text = document.getElementById(textId);
    const prev = document.getElementById(previewId);
    if (!input) return;
    const update = (val) => {
        prev.style.background = val;
        if (text) text.value = val;
    };
    update(input.value);
    input.addEventListener('input', () => update(input.value));
    if (text)
        text.addEventListener('input', () => {
            input.value = text.value;
            update(text.value);
            scheduleLivePreview();
        });
    input.addEventListener('change', scheduleLivePreview);
}

syncColor('bgColor', 'bgColorText', 'bgPreview');
syncColor('accentColor', 'accentColorText', 'accentPreview');
syncColor('textColor', 'textColorText', 'textPreview');
syncColor('surfColor', 'surfColorText', 'surfPreview');
syncColor('btnTextColor', 'btnTextColorText', 'btnTextPreview');

// Color presets
const presets = {
    'dark-neon': { bg: '#0a0a0c', accent: '#c8ff57', text: '#eeeef2', surf: '#111115', btnText: '#000000' },
    'midnight': { bg: '#080c1a', accent: '#5771ff', text: '#e0e8ff', surf: '#0e1428', btnText: '#ffffff' },
    'light': { bg: '#f8f8f8', accent: '#2563eb', text: '#111111', surf: '#ffffff', btnText: '#ffffff' },
    'warm': { bg: '#f5f0e8', accent: '#e05a00', text: '#2c1a0e', surf: '#fff9f0', btnText: '#ffffff' },
    'crimson': { bg: '#0f0508', accent: '#ff4f6a', text: '#f5e0e4', surf: '#1a0810', btnText: '#ffffff' },
    'forest': { bg: '#060f08', accent: '#57ff8c', text: '#d0f0d8', surf: '#0c1a0e', btnText: '#000000' },
    'cyberpunk': { bg: '#0d0014', accent: '#ff0099', text: '#f0e0ff', surf: '#15001e', btnText: '#ffffff' },
};
document.getElementById('colorPreset').addEventListener('change', function() {
    const p = presets[this.value];
    if (!p) return;
    ['bg', 'accent', 'text', 'surf', 'btnText'].forEach(k => {
        const col = p[k];
        const input = document.getElementById(k + 'Color');
        const text = document.getElementById(k + 'ColorText');
        const prev = document.getElementById(k + 'Preview');
        if (input) {
            input.value = col;
            if (text) text.value = col;
            if (prev) prev.style.background = col;
        }
    });
    scheduleLivePreview();
});

// ══════════════════════════════════════════════
//  RANGE SLIDERS
// ══════════════════════════════════════════════
function bindRange(id, valId, fmt) {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    if (!el) return;
    val.textContent = fmt(el.value);
    el.addEventListener('input', () => {
        val.textContent = fmt(el.value);
        scheduleLivePreview();
    });
}
bindRange('titleSize', 'titleSizeVal', v => v + 'px');
bindRange('bodySize', 'bodySizeVal', v => v + 'px');
bindRange('letterSpacing', 'letterSpacingVal', v => (v / 100).toFixed(2) + 'em');
bindRange('pagePad', 'pagePadVal', v => v + 'px');
bindRange('borderRadius', 'borderRadiusVal', v => v + 'px');

// Other controls
[
    'titleFont', 'bodyFont', 'cardStyle', 'layoutWidth', 'inputStyle', 'btnShape',
    'brandName', 'tagline', 'logoIcon', 'btnLabel', 'btnSize',
    'showQR', 'showCopy', 'showOpen', 'showHistory', 'showValidation', 'showCharCount', 'showThemeToggle',
    'showFooter',
    'footerText', 'fxAnimBg', 'fxScanlines', 'fxGlowInputs', 'fxFloatLabels', 'fxGrid', 'fxParticles', 'fxFadeIn',
    'fxConfetti',
    'pageTitleInput'
].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', scheduleLivePreview);
    if (el && (el.tagName === 'INPUT' && el.type === 'text')) el.addEventListener('input', scheduleLivePreview);
});

// ══════════════════════════════════════════════
//  GENERATE LINK
// ══════════════════════════════════════════════
function doGenerate() {
    const link = buildLink();
    if (!link) { toast('Enter a URL template first!'); return; }
    const allFilled = currentVars.every(v => fieldValues[v]);
    if (currentVars.length && !allFilled) { toast('Fill all variable fields!'); return; }
    generatedLink = link;

    const out = document.getElementById('outputLink');
    let html = esc(link);
    currentVars.forEach(v => {
        if (fieldValues[v])
            html = html.split(esc(fieldValues[v])).join(`<span class="hl">${esc(fieldValues[v])}</span>`);
    });
    out.innerHTML = html + '<div class="copy-overlay">Click to copy</div>';
    out.className = 'output-link has-value';
    out.onclick = () => copyText(generatedLink);

    document.getElementById('openLinkBtn').style.display = '';
    document.getElementById('qrBtn').style.display = '';
    copyText(generatedLink);
    addToHistory(generatedLink);

    // Confetti
    if (document.getElementById('fxConfetti').checked) spawnConfetti();
}

document.getElementById('generateLinkBtn').addEventListener('click', doGenerate);
document.getElementById('generateLinkBtn2').addEventListener('click', doGenerate);
document.getElementById('openLinkBtn').addEventListener('click', () => {
    if (generatedLink) window.open(generatedLink, '_blank');
});
document.getElementById('copyLinkBtn').addEventListener('click', () => {
    if (generatedLink) copyText(generatedLink);
});

// ══════════════════════════════════════════════
//  QR CODE (simple canvas impl)
// ══════════════════════════════════════════════
document.getElementById('qrBtn').addEventListener('click', () => {
    if (!generatedLink) return;
    const section = document.getElementById('qrSection');
    section.style.display = '';
    drawSimpleQR(generatedLink);
});
document.getElementById('closeQrBtn').addEventListener('click', () => {
    document.getElementById('qrSection').style.display = 'none';
});

function drawSimpleQR(text) {
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    // Use QR API
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(text);
    img.onload = () => { ctx.clearRect(0, 0, 200, 200);
        ctx.drawImage(img, 0, 0, 200, 200); };
    img.onerror = () => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#000';
        ctx.font = '12px monospace';
        ctx.fillText('QR: ' + text.substring(0, 20), 10, 100);
    };
}

// ══════════════════════════════════════════════
//  CONFETTI
// ══════════════════════════════════════════════
function spawnConfetti() {
    const colors = ['#c8ff57', '#57c8ff', '#ff57a8', '#ffd657', '#ff5757'];
    for (let i = 0; i < 60; i++) {
        setTimeout(() => {
            const p = document.createElement('div');
            p.style.cssText =
                `position:fixed;top:0;left:${Math.random()*100}vw;width:8px;height:8px;border-radius:${Math.random()>0.5?'50%':'2px'};background:${colors[Math.floor(Math.random()*colors.length)]};z-index:9999;pointer-events:none;animation:fall ${0.8+Math.random()*1.2}s linear forwards;`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 2000);
        }, i * 30);
    }
    if (!document.getElementById('confettiStyle')) {
        const s = document.createElement('style');
        s.id = 'confettiStyle';
        s.textContent =
            '@keyframes fall{from{transform:translateY(-20px) rotate(0deg);opacity:1}to{transform:translateY(100vh) rotate(720deg);opacity:0}}';
        document.head.appendChild(s);
    }
}

// ══════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════
function addToHistory(link) {
    linkHistory = [link, ...linkHistory.filter(l => l !== link)].slice(0, 15);
    localStorage.setItem('lgp_history', JSON.stringify(linkHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (!linkHistory.length) { list.innerHTML = '<div class="empty">No history yet.</div>'; return; }
    linkHistory.forEach(link => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML =
            `<span style="flex:1;">${esc(link)}</span><span class="history-copy" title="Copy">⎘</span>`;
        item.querySelector('.history-copy').addEventListener('click', () => copyText(link));
        item.addEventListener('click', e => {
            if (!e.target.classList.contains('history-copy')) {
                templateInput.value = link;
                templateInput.dispatchEvent(new Event('input'));
            }
        });
        list.appendChild(item);
    });
}

document.getElementById('clearHistBtn').addEventListener('click', () => {
    linkHistory = [];
    localStorage.removeItem('lgp_history');
    renderHistory();
});

// ══════════════════════════════════════════════
//  SAVED TEMPLATES
// ══════════════════════════════════════════════
document.getElementById('saveTplBtn').addEventListener('click', () => {
    const name = document.getElementById('saveName').value.trim();
    const tpl = templateInput.value.trim();
    if (!name) { toast('Enter a name!'); return; }
    if (!tpl) { toast('Enter a template!'); return; }
    savedTemplates = savedTemplates.filter(t => t.name !== name);
    savedTemplates.unshift({ name, tpl });
    localStorage.setItem('lgp_templates', JSON.stringify(savedTemplates));
    document.getElementById('saveName').value = '';
    renderSaved();
    toast('Saved!', 'accent');
});

document.getElementById('clearAllSavedBtn').addEventListener('click', () => {
    savedTemplates = [];
    localStorage.removeItem('lgp_templates');
    renderSaved();
});

function renderSaved() {
    const list = document.getElementById('savedList');
    list.innerHTML = '';
    if (!savedTemplates.length) { list.innerHTML = '<div class="empty">No saved templates.</div>'; return; }
    savedTemplates.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = 'saved-item';
        item.innerHTML =
            `<div style="flex:1;min-width:0;"><div class="saved-name">${esc(t.name)}</div><div class="saved-tpl">${esc(t.tpl)}</div></div>
      <span class="saved-del" data-i="${i}">×</span>`;
        item.addEventListener('click', e => {
            if (e.target.classList.contains('saved-del')) return;
            templateInput.value = t.tpl;
            templateInput.dispatchEvent(new Event('input'));
        });
        item.querySelector('.saved-del').addEventListener('click', e => {
            e.stopPropagation();
            savedTemplates.splice(i, 1);
            localStorage.setItem('lgp_templates', JSON.stringify(savedTemplates));
            renderSaved();
        });
        list.appendChild(item);
    });
}

document.getElementById('clearTplBtn').addEventListener('click', () => {
    templateInput.value = '';
    templateInput.dispatchEvent(new Event('input'));
});

// ══════════════════════════════════════════════
//  DOWNLOAD HTML
// ══════════════════════════════════════════════
function downloadHtml() {
    const html = buildOutputHtml(false);
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (document.getElementById('pageTitleInput').value || 'linkgen') + '.html';
    a.click();
    toast('HTML downloaded!', 'accent');
}

document.getElementById('downloadHtmlBtn').addEventListener('click', downloadHtml);
document.getElementById('downloadHtmlBtn2').addEventListener('click', downloadHtml);

// ══════════════════════════════════════════════
//  HTML BUILDER
// ══════════════════════════════════════════════
function getConfig() {
    const g = id => document.getElementById(id);
    const gv = id => g(id)?.value || '';
    const gc = id => g(id)?.checked;
    return {
        bg: gv('bgColor') || '#0a0a0c',
        accent: gv('accentColor') || '#c8ff57',
        textCol: gv('textColor') || '#f0f0f0',
        surf: gv('surfColor') || '#111115',
        btnText: gv('btnTextColor') || '#000000',
        titleFont: gv('titleFont') || "'DM Sans', sans-serif",
        bodyFont: gv('bodyFont') || "'DM Sans', sans-serif",
        titleSize: gv('titleSize') || '52',
        bodySize: gv('bodySize') || '16',
        letterSpacing: ((gv('letterSpacing') || '2') / 100).toFixed(2),
        cardStyle: gv('cardStyle') || 'modern',
        layoutWidth: gv('layoutWidth') || '640px',
        pagePad: gv('pagePad') || '40',
        borderRadius: gv('borderRadius') || '14',
        inputStyle: gv('inputStyle') || 'filled',
        btnShape: gv('btnShape') || 'rounded',
        brandName: gv('brandName') || 'LinkGen Pro',
        tagline: gv('tagline') || 'Generate links instantly',
        logoIcon: gv('logoIcon') || '⚡',
        btnLabel: gv('btnLabel') || 'Generate Link',
        btnSize: gv('btnSize') || 'medium',
        pageTitle: gv('pageTitleInput') || 'LinkGen',
        showQR: gc('showQR'),
        showCopy: gc('showCopy'),
        showOpen: gc('showOpen'),
        showHistory: gc('showHistory'),
        showValidation: gc('showValidation'),
        showCharCount: gc('showCharCount'),
        showThemeToggle: gc('showThemeToggle'),
        showFooter: gc('showFooter'),
        footerText: gv('footerText'),
        fxAnimBg: gc('fxAnimBg'),
        fxScanlines: gc('fxScanlines'),
        fxGlowInputs: gc('fxGlowInputs'),
        fxFloatLabels: gc('fxFloatLabels'),
        fxGrid: gc('fxGrid'),
        fxParticles: gc('fxParticles'),
        fxFadeIn: gc('fxFadeIn'),
        fxConfetti: gc('fxConfetti'),
        template: templateInput.value.trim(),
        vars: currentVars,
    };
}

function buildOutputHtml(isPreview) {
    const c = getConfig();
    const vars = c.vars;

    const btnRadius = c.btnShape === 'pill' ? '99px' : c.btnShape === 'sharp' ? '0' : (c.borderRadius + 'px');
    const btnPad = c.btnSize === 'small' ? '10px 20px' : c.btnSize === 'large' ? '16px 36px' : c.btnSize === 'xl' ?
        '18px 0' : '13px 28px';
    const btnFontSize = c.btnSize === 'small' ? '12px' : c.btnSize === 'large' ? '15px' : c.btnSize === 'xl' ? '15px' :
        '13px';

    const inputBg = c.inputStyle === 'outline' ? 'transparent' : c.inputStyle === 'underline' ? 'transparent' :
        'rgba(255,255,255,0.06)';
    const inputBorder = c.inputStyle === 'outline' ? `1px solid rgba(255,255,255,0.2)` : c.inputStyle === 'underline' ?
        `none; border-bottom:1px solid rgba(255,255,255,0.2); border-radius:0` :
        `1px solid rgba(255,255,255,0.1)`;
    const inputBorderRadius = c.inputStyle === 'underline' ? '0' : (c.borderRadius + 'px');

    const glassExtra = c.cardStyle === 'glass' ?
        'backdrop-filter:blur(20px);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.15);' : '';
    const brutalExtra = c.cardStyle === 'brutal' ? `border:2px solid ${c.accent};border-radius:0;` : '';
    const cardRadius = c.cardStyle === 'sharp' ? '0' : c.cardStyle === 'brutal' ? '0' : (c.borderRadius + 'px');
    const pillRadius = c.cardStyle === 'pill' ? '99px' : cardRadius;

    const animBgCSS = c.fxAnimBg ? `
    @keyframes bgShift {
      0%,100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    body { background: linear-gradient(135deg, ${c.bg}, ${c.bg}dd, ${c.surf}cc) !important; background-size: 400% 400% !important; animation: bgShift 12s ease infinite; }
  ` : '';

    const scanlinesCSS = c.fxScanlines ? `
    body::before { content:''; position:fixed; inset:0; background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px); pointer-events:none; z-index:9999; }
  ` : '';

    const glowInputCSS = c.fxGlowInputs ? `
    input:focus, textarea:focus { box-shadow: 0 0 0 3px ${c.accent}22, 0 0 15px ${c.accent}15 !important; }
  ` : '';

    const gridCSS = c.fxGrid ? `
    .grid-deco { position:fixed; top:0; right:0; width:300px; height:300px; opacity:0.04; background-image:linear-gradient(${c.accent} 1px,transparent 1px),linear-gradient(90deg,${c.accent} 1px,transparent 1px); background-size:30px 30px; pointer-events:none; }
  ` : '';

    const fadeCSS = c.fxFadeIn ? `
    @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .wrap { animation: fadeUp 0.6s ease both; }
  ` : '';

    const particlesCSS = c.fxParticles ? `
    .particle { position:fixed; pointer-events:none; border-radius:50%; animation:floatUp linear infinite; }
    @keyframes floatUp { from { transform:translateY(100vh) scale(1); opacity:0.6; } to { transform:translateY(-100px) scale(0.5); opacity:0; } }
  ` : '';

    const confettiJS = c.fxConfetti ? `
    function spawnConfetti() {
      const colors = ['${c.accent}','#57c8ff','#ff57a8','#ffd657'];
      for(let i=0;i<60;i++) setTimeout(()=>{
        const p=document.createElement('div');
        p.style.cssText='position:fixed;top:0;left:'+Math.random()*100+'vw;width:8px;height:8px;border-radius:'+(Math.random()>.5?'50%':'2px')+';background:'+colors[Math.floor(Math.random()*colors.length)]+';z-index:9999;pointer-events:none;animation:fall '+(0.8+Math.random()*1.2)+'s linear forwards';
        document.body.appendChild(p);setTimeout(()=>p.remove(),2000);
      },i*25);
    }
    const style=document.createElement('style');
    style.textContent='@keyframes fall{from{transform:translateY(-20px) rotate(0);opacity:1}to{transform:translateY(100vh) rotate(720deg);opacity:0}}';
    document.head.appendChild(style);
  ` : '';

    const themeToggleHTML = c.showThemeToggle ? `
    <button id="themeBtn" onclick="toggleTheme()" style="position:fixed;top:16px;right:16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:50%;width:40px;height:40px;color:${c.textCol};font-size:16px;cursor:pointer;z-index:100;display:flex;align-items:center;justify-content:center;">☀</button>
    <script>
      let dark=true;
      function toggleTheme(){
        dark=!dark;
        document.body.style.background=dark?'${c.bg}':'#f8f8f8';
        document.body.style.color=dark?'${c.textCol}':'#111';
        document.getElementById('themeBtn').textContent=dark?'☀':'🌙';
      }
    <\/script>
  ` : '';

    const historyHTML = c.showHistory ? `
    <div id="histSection" style="display:none;">
      <div style="font-size:10px;font-family:monospace;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Recent Links</div>
      <div id="histList" style="display:flex;flex-direction:column;gap:6px;"></div>
      <button onclick="clearHist()" style="margin-top:8px;background:transparent;border:none;color:rgba(255,255,255,0.3);font-size:11px;cursor:pointer;font-family:monospace;">Clear history</button>
    </div>
  ` : '';

    const charCountHTML = c.showCharCount ?
        `<div id="charCount" style="text-align:right;font-size:10px;font-family:monospace;color:rgba(255,255,255,0.3);margin-top:4px;"></div>` :
        '';
    const charCountJS = c.showCharCount ?
        `document.querySelectorAll('.vi').forEach(i=>i.addEventListener('input',updateCharCounts)); function updateCharCounts(){document.querySelectorAll('.vi').forEach(i=>{const next=i.nextElementSibling;if(next&&next.id==='charCount')next.textContent=i.value.length+' chars';});}` :
        '';

    const validationJS = c.showValidation ? `
    function validateUrl(url) {
      try { new URL(url); return true; } catch { return false; }
    }
    function showValidation(valid, url) {
      let vEl = document.getElementById('validMsg');
      if(!vEl){vEl=document.createElement('div');vEl.id='validMsg';vEl.style.cssText='font-size:11px;font-family:monospace;margin-top:6px;padding:6px 10px;border-radius:6px;';document.getElementById('result').after(vEl);}
      if(!url){vEl.style.display='none';return;}
      vEl.style.display='';
      if(valid){vEl.style.background='rgba(79,255,154,0.1)';vEl.style.color='#4fff9a';vEl.textContent='✓ Valid URL';}
      else{vEl.style.background='rgba(255,79,79,0.1)';vEl.style.color='#ff4f4f';vEl.textContent='⚠ URL may be invalid';}
    }
  ` : '';

    const particlesJS = c.fxParticles ? `
    (function(){
      const colors=['${c.accent}33','${c.accent}22'];
      for(let i=0;i<15;i++){
        const p=document.createElement('div');
        p.className='particle';
        const size=Math.random()*6+3;
        p.style.cssText='width:'+size+'px;height:'+size+'px;background:'+colors[Math.floor(Math.random()*colors.length)]+';left:'+Math.random()*100+'vw;animation-duration:'+(8+Math.random()*12)+'s;animation-delay:'+(Math.random()*10)+'s;';
        document.body.appendChild(p);
      }
    })();
  ` : '';

    const fieldsHtml = vars.map(v => `
    <div style="margin-bottom:14px;">
      <label style="display:block;font-size:11px;font-family:monospace;color:${c.accent};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">{${v}}</label>
      <input class="vi" type="text" data-var="${v}" placeholder="Enter ${v}…"
        style="width:100%;background:${inputBg};border:${inputBorder};border-radius:${pillRadius};color:${c.textCol};font-family:monospace;font-size:13px;padding:11px 14px;outline:none;transition:border-color 0.2s;box-sizing:border-box;" />
      ${charCountHTML}
    </div>
  `).join('');

    const qrHTML = c.showQR ? `
    <div id="qrWrap" style="display:none;margin-top:16px;text-align:center;">
      <img id="qrImg" src="" alt="QR Code" style="width:160px;height:160px;border-radius:10px;background:#fff;padding:8px;" />
    </div>
  ` : '';

    const qrJS = c.showQR ? `
    function showQR(url){
      const wrap=document.getElementById('qrWrap');
      const img=document.getElementById('qrImg');
      if(wrap&&img){img.src='https://api.qrserver.com/v1/create-qr-code/?size=160x160&data='+encodeURIComponent(url);wrap.style.display='';}
    }
  ` : 'function showQR(){}';

    const copyBtnHTML = c.showCopy ?
        `<button onclick="doCopy()" style="flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:${btnRadius};color:${c.textCol};font-family:monospace;font-size:12px;padding:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">⎘ Copy</button>` :
        '';
    const openBtnHTML = c.showOpen ?
        `<button id="openBtn" onclick="doOpen()" style="display:none;flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:${btnRadius};color:${c.textCol};font-family:monospace;font-size:12px;padding:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">↗ Open</button>` :
        '';
    const qrBtnHTML = c.showQR ?
        `<button id="qrBtnEl" onclick="showQR(lastLink)" style="display:none;flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:${btnRadius};color:${c.textCol};font-family:monospace;font-size:12px;padding:10px;cursor:pointer;">⊞ QR</button>` :
        '';

    const histJS = c.showHistory ? `
    let hist=JSON.parse(localStorage.getItem('lgh')||'[]');
    function addHist(l){hist=[l,...hist.filter(x=>x!==l)].slice(0,10);localStorage.setItem('lgh',JSON.stringify(hist));renderHist();}
    function clearHist(){hist=[];localStorage.removeItem('lgh');renderHist();}
    function renderHist(){
      const s=document.getElementById('histSection');
      const hl=document.getElementById('histList');
      if(!s||!hl)return;
      if(!hist.length){s.style.display='none';return;}
      s.style.display='';hl.innerHTML='';
      hist.forEach(l=>{
        const d=document.createElement('div');
        d.style.cssText='padding:8px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;font-family:monospace;font-size:10px;word-break:break-all;cursor:pointer;color:rgba(255,255,255,0.6);';
        d.textContent=l;d.onclick=()=>{navigator.clipboard.writeText(l).catch(()=>{});};
        hl.appendChild(d);
      });
    }
    renderHist();
  ` : 'function addHist(){}';

    const footerHTML = c.showFooter ?
        `<div style="text-align:center;padding:30px 0 0;font-size:11px;font-family:monospace;color:rgba(255,255,255,0.2);">${esc(c.footerText || 'Made with LinkGen Pro')}</div>` :
        '';

    const logoIconHTML = c.logoIcon !== 'none' ?
        `<span style="margin-right:10px;font-size:0.8em;">${c.logoIcon}</span>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(c.pageTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap" rel="stylesheet" />
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: ${c.bg};
  color: ${c.textCol};
  font-family: ${c.bodyFont};
  font-size: ${c.bodySize}px;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: ${c.pagePad}px 20px;
}
.wrap {
  width: 100%;
  max-width: ${c.layoutWidth};
}
.title {
  font-family: ${c.titleFont};
  font-size: ${c.titleSize}px;
  letter-spacing: ${c.letterSpacing}em;
  color: ${c.textCol};
  line-height: 1.1;
  margin-bottom: 6px;
}
.title span { color: ${c.accent}; }
.tagline {
  font-size: 13px;
  color: rgba(${hexToRgb(c.textCol)},0.5);
  margin-bottom: 28px;
  font-family: monospace;
}
.card {
  background: ${c.surf};
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: ${cardRadius};
  padding: 24px;
  margin-bottom: 16px;
  ${glassExtra}
  ${brutalExtra}
}
.card-label {
  font-family: monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(${hexToRgb(c.textCol)},0.35);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-label::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.06); }
input[type=text] {
  width: 100%;
  background: ${inputBg};
  border: ${inputBorder};
  border-radius: ${inputBorderRadius};
  color: ${c.textCol};
  font-family: monospace;
  font-size: 13px;
  padding: 11px 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  margin-bottom: 0;
}
input[type=text]:focus { border-color: ${c.accent}66; }
.gen-btn {
  width: ${c.btnSize === 'xl' ? '100%' : 'auto'};
  background: ${c.accent};
  color: ${c.btnText};
  border: none;
  border-radius: ${btnRadius};
  padding: ${btnPad};
  font-size: ${btnFontSize};
  font-weight: 700;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
  display: ${c.btnSize === 'xl' ? 'block' : 'inline-block'};
}
.gen-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px ${c.accent}44; filter:brightness(1.05); }
.gen-btn:active { transform:translateY(0); }
#result {
  padding: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: ${cardRadius};
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  color: rgba(${hexToRgb(c.textCol)},0.5);
  min-height: 46px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 10px;
}
#result:hover { background: rgba(255,255,255,0.05); }
#result.has-val { color: ${c.textCol}; }
#result .hl { color: ${c.accent}; }
.action-row { display:flex; gap:8px; flex-wrap:wrap; }
.grid-deco { position:fixed; top:0; right:0; width:300px; height:300px; opacity:0.04; background-image:linear-gradient(${c.accent} 1px,transparent 1px),linear-gradient(90deg,${c.accent} 1px,transparent 1px); background-size:30px 30px; pointer-events:none; }
${animBgCSS}
${scanlinesCSS}
${glowInputCSS}
${gridCSS}
${fadeCSS}
${particlesCSS}
@media(max-width:480px){.wrap{padding:0;}.card{padding:16px;border-radius:0;border-left:none;border-right:none;}}
</style>
</head>
<body>

${c.fxGrid ? '<div class="grid-deco"></div>' : ''}

<div class="wrap">
  <div style="margin-bottom:32px;">
    <h1 class="title">${logoIconHTML}${esc(c.brandName).replace(/(\w+)$/, '<span>$1</span>')}</h1>
    <div class="tagline">${esc(c.tagline)}</div>
  </div>

  ${vars.length > 0 ? `
  <div class="card">
    <div class="card-label">Variables</div>
    ${fieldsHtml}
  </div>
  ` : `
  <div class="card">
    <div class="card-label">Template</div>
    <p style="font-family:monospace;font-size:12px;color:rgba(255,255,255,0.4);">${esc(c.template) || 'No template set.'}</p>
  </div>
  `}

  <div class="card">
    <div class="card-label">Generate</div>
    <button class="gen-btn" onclick="doGenerate()">${esc(c.btnLabel)}</button>
  </div>

  <div class="card">
    <div class="card-label">Result</div>
    <div id="result" onclick="doCopy()">Fill the fields and click Generate.</div>
    <div class="action-row">
      ${copyBtnHTML}
      ${openBtnHTML}
      ${qrBtnHTML}
    </div>
    ${qrHTML}
  </div>

  ${historyHTML}
  ${footerHTML}
</div>

${themeToggleHTML}

<script>
const TEMPLATE = ${JSON.stringify(c.template)};
const VARS = ${JSON.stringify(vars)};
let lastLink = '';

${confettiJS}
${qrJS}
${histJS}
${validationJS}
${charCountJS}
${particlesJS}

function buildLink() {
  let t = TEMPLATE;
  VARS.forEach(v => {
    const inp = document.querySelector('[data-var="'+v+'"]');
    const val = inp ? inp.value : '';
    t = t.split('{'+v+'}').join(val || ('{'+v+'}'));
  });
  return t;
}

function doGenerate() {
  const link = buildLink();
  const allFilled = VARS.every(v => document.querySelector('[data-var="'+v+'"]')?.value);
  const result = document.getElementById('result');
  if (!link) return;
  if (VARS.length && !allFilled) { result.innerHTML='<span style="color:#ff4f4f;">⚠ Fill all fields first!</span>'; return; }
  lastLink = link;
  let html = link.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  VARS.forEach(v => {
    const val = document.querySelector('[data-var="'+v+'"]')?.value || '';
    if(val) html = html.split(val.replace(/&/g,'&amp;')).join('<span class="hl">'+val+'</span>');
  });
  result.innerHTML = html;
  result.className = 'has-val';
  const openBtn = document.getElementById('openBtn');
  if(openBtn) openBtn.style.display = '';
  const qrBtnEl = document.getElementById('qrBtnEl');
  if(qrBtnEl) qrBtnEl.style.display = '';
  ${c.showValidation ? 'showValidation(validateUrl(link), link);' : ''}
  ${c.fxConfetti ? 'spawnConfetti();' : ''}
  addHist(link);
}

function doCopy() {
  if(!lastLink) return;
  navigator.clipboard.writeText(lastLink).catch(()=>{
    const ta=document.createElement('textarea');ta.value=lastLink;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
  });
  const r=document.getElementById('result');
  const orig=r.innerHTML;
  r.innerHTML='<span style="color:${c.accent};">✓ Copied!</span>';
  setTimeout(()=>r.innerHTML=orig,1200);
}

function doOpen() { if(lastLink) window.open(lastLink,'_blank'); }

document.querySelectorAll('.vi').forEach(i => i.addEventListener('keydown', e => { if(e.key==='Enter') doGenerate(); }));
<\/script>
</body>
</html>`;
}

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '255,255,255';
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
if (savedTemplates.length === 0) {
    savedTemplates = [
        { name: 'CDN Page', tpl: 'https://d2f9lckj2oznig.cloudfront.net/{code}/index.html' },
        { name: 'API v{version}', tpl: 'https://api.example.com/v{version}/{resource}/{id}' },
        { name: 'S3 Asset', tpl: 'https://mybucket.s3.amazonaws.com/{folder}/{filename}.{ext}' },
    ];
    localStorage.setItem('lgp_templates', JSON.stringify(savedTemplates));
}

renderSaved();
renderHistory();
updateLivePreview();

// Seed colors
['bgColor', 'accentColor', 'textColor', 'surfColor', 'btnTextColor'].forEach(id => {
    const el = document.getElementById(id);
    const prevId = id.replace('Color', '') + 'Preview';
    const prev = document.getElementById(prevId.charAt(0).toUpperCase() + prevId.slice(1)) ||
        document.getElementById(prevId);
    // already synced via syncColor()
});