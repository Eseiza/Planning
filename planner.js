// ─────────────────────────────────────────
// FIREBASE
// ─────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyAJgnFCKt_8TT4BpWrDwqy--Oep0raYA18",
    authDomain: "romero-env.firebaseapp.com",
    databaseURL: "https://romero-env-default-rtdb.firebaseio.com",
    projectId: "romero-env",
    storageBucket: "romero-env.firebasestorage.app",
    messagingSenderId: "350498956335",
    appId: "1:350498956335:web:901f91c4d7b983308252da"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
const autenticado   = sessionStorage.getItem('autenticado');
const rolActual     = sessionStorage.getItem('rol');
const usuarioNombre = sessionStorage.getItem('usuario');
if (!autenticado) window.location.href = './index.html';

const spanUsuario = document.getElementById('usuarioActual');
if (spanUsuario) spanUsuario.textContent = usuarioNombre || '';

function logout() {
    sessionStorage.clear();
    window.location.href = './index.html';
}

// ─────────────────────────────────────────
// NAVEGACIÓN PRINCIPAL
// ─────────────────────────────────────────
function mostrarVista(nombre) {
    document.querySelectorAll('.vista').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-center button').forEach(b => b.classList.remove('active'));

    const vista = document.getElementById('vista-' + nombre);
    if (vista) vista.classList.remove('hidden');

    const btnMap = { cargar:'btnCarga', estados:'btnEstados', calendario:'btnCalendario' };
    const btn = document.getElementById(btnMap[nombre]);
    if (btn) btn.classList.add('active');

    // Nav secundario solo en estados
    const navSub = document.getElementById('navSub');
    if (navSub) navSub.classList.toggle('hidden', nombre !== 'estados');

    if (nombre === 'estados')    { filtroActivo = 'todas'; cargarEstados(); }
    if (nombre === 'calendario') setTimeout(construirGantt, 80);

    cerrarPaneles();
}

// ─────────────────────────────────────────
// GUARDAR TAREA
// ─────────────────────────────────────────
function guardarTarea() {
    const sector      = document.getElementById('sector')?.value.trim();
    const equipo      = document.getElementById('equipo')?.value.trim();
    const descripcion = document.getElementById('descripcion')?.value.trim();
    const inicioEst   = document.getElementById('inicioEst')?.value;
    const finEst      = document.getElementById('finEst')?.value;
    const estado      = document.getElementById('estado')?.value;

    if (!sector || !equipo || !descripcion) {
        alert('Completá al menos sector, equipo y descripción.');
        return;
    }
    db.ref('tareas').push({
        sector, equipo, descripcion,
        inicioEst: inicioEst||'', finEst: finEst||'',
        inicioReal:'', finReal:'',
        estado, creadoPor: usuarioNombre, timestamp: Date.now()
    })
    .then(() => {
        alert('Tarea guardada.');
        ['sector','equipo','descripcion','inicioEst','finEst'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('estado').value = 'Pendiente';
        actualizarBadgeNotif();
    })
    .catch(err => alert('Error: ' + err.message));
}

// ─────────────────────────────────────────
// FILTRO ESTADOS
// ─────────────────────────────────────────
let filtroActivo = 'todas';

function filtrarEstados(filtro) {
    filtroActivo = filtro;
    document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
    const tabMap = { todas:'subTodas', Pendiente:'subPendiente', 'En progreso':'subProgreso', Finalizada:'subFinalizada', Demorada:'subDemorada' };
    const el = document.getElementById(tabMap[filtro]);
    if (el) el.classList.add('active');
    cargarEstados();
}

function cargarEstados() {
    const contenedores = {
        'Pendiente':   document.getElementById('pendientes'),
        'En progreso': document.getElementById('progreso'),
        'Finalizada':  document.getElementById('finalizadas'),
        'Demorada':    document.getElementById('demoradas')
    };
    Object.values(contenedores).forEach(c => { if (c) c.innerHTML = ''; });

    document.querySelectorAll('.estado-card').forEach(card => {
        if (filtroActivo === 'todas') { card.style.display = ''; return; }
        const mapa = { Pendiente:'Pendientes', 'En progreso':'En progreso', Finalizada:'Finalizadas', Demorada:'Demoradas' };
        card.style.display = card.querySelector('h3')?.textContent.includes(mapa[filtroActivo]) ? '' : 'none';
    });

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        if (!data) return;
        Object.entries(data).forEach(([id, tarea]) => {
            if (filtroActivo !== 'todas' && tarea.estado !== filtroActivo) return;
            const cont = contenedores[tarea.estado];
            if (!cont) return;
            const div = document.createElement('div');
            div.className = 'tarea';
            div.innerHTML = `
                <h4>${tarea.equipo} · ${tarea.sector}</h4>
                <p>${tarea.descripcion}</p>
                <small>
                    ${tarea.inicioEst ? '📅 Est: '+formatFecha(tarea.inicioEst)+(tarea.finEst?' → '+formatFecha(tarea.finEst):'') : ''}
                    ${tarea.inicioReal ? '<br>✅ Real: '+formatFecha(tarea.inicioReal)+(tarea.finReal?' → '+formatFecha(tarea.finReal):'') : ''}
                </small>
                <div class="tarea-acciones">
                    <button class="editar" onclick="abrirModal('${id}')">Editar</button>
                    ${rolActual==='admin' ? `<button class="eliminar" onclick="eliminarTarea('${id}')">Eliminar</button>` : ''}
                </div>`;
            cont.appendChild(div);
        });
    });
}

// ─────────────────────────────────────────
// GANTT
// ─────────────────────────────────────────
function construirGantt() {
    const inner = document.getElementById('ganttInner');
    const scroll = document.getElementById('ganttScroll');
    if (!inner || !scroll) return;
    inner.innerHTML = '<div style="padding:40px;color:var(--texto-soft);text-align:center">Cargando...</div>';

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        inner.innerHTML = '';

        if (!data) {
            inner.innerHTML = '<div style="padding:40px;color:var(--texto-soft);text-align:center">No hay tareas cargadas.</div>';
            return;
        }

        const tareas = Object.entries(data)
            .map(([id, t]) => ({ id, ...t }))
            .filter(t => t.inicioReal || t.inicioEst);

        if (!tareas.length) {
            inner.innerHTML = '<div style="padding:40px;color:var(--texto-soft);text-align:center">No hay tareas con fechas.</div>';
            return;
        }

        // Rango total
        let minFecha = null, maxFecha = null;
        tareas.forEach(t => {
            const ini = parseDate(t.inicioReal || t.inicioEst);
            const fin = parseDate(t.finReal || t.finEst || t.inicioReal || t.inicioEst);
            if (!minFecha || ini < minFecha) minFecha = ini;
            if (!maxFecha || fin > maxFecha) maxFecha = fin;
        });

        // Extender rango un poco
        minFecha = startOfMonth(minFecha);
        maxFecha = endOfMonth(maxFecha);

        const totalDias = Math.ceil((maxFecha - minFecha) / 86400000) + 1;
        const DAY_W    = 32; // px por día
        const ROW_H    = 48;
        const LABEL_W  = 220;
        const MONTH_H  = 32; // fila de meses
        const DAY_H    = 28; // fila de números de día
        const HEADER_H = MONTH_H + DAY_H;

        const totalW = LABEL_W + totalDias * DAY_W;
        const hoy = new Date(); hoy.setHours(0,0,0,0);

        // Construir HTML
        let html = `<div class="gantt-table" style="width:${totalW}px">`;

        // — HEADER MESES —
        html += `<div class="gantt-header" style="height:${MONTH_H}px">`;
        html += `<div class="gantt-label-col" style="width:${LABEL_W}px;height:${MONTH_H}px"></div>`;
        html += `<div class="gantt-months" style="position:relative;flex:1;height:${MONTH_H}px">`;

        let cur = new Date(minFecha);
        while (cur <= maxFecha) {
            const mesInicio = new Date(cur.getFullYear(), cur.getMonth(), 1);
            const mesFin    = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
            const diaIni    = Math.max(0, Math.ceil((mesInicio - minFecha) / 86400000));
            const diaFin    = Math.min(totalDias - 1, Math.ceil((mesFin - minFecha) / 86400000));
            const ancho     = (diaFin - diaIni + 1) * DAY_W;
            const left      = diaIni * DAY_W;
            const label     = cur.toLocaleDateString('es-AR', { month:'long', year:'numeric' });
            html += `<div class="gantt-month-label" style="left:${left}px;width:${ancho}px;height:${MONTH_H}px">${label}</div>`;
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }
        html += '</div></div>'; // gantt-months, gantt-header (fila meses)

        // — HEADER DÍAS —
        html += `<div class="gantt-header gantt-days-row" style="height:${DAY_H}px;top:${MONTH_H}px">`;
        html += `<div class="gantt-label-col" style="width:${LABEL_W}px;height:${DAY_H}px"></div>`;
        html += `<div class="gantt-months" style="position:relative;flex:1;height:${DAY_H}px">`;

        for (let d = 0; d < totalDias; d++) {
            const fecha = new Date(minFecha); fecha.setDate(minFecha.getDate() + d);
            const num   = fecha.getDate();
            const esHoy = fecha.getTime() === hoy.getTime();
            const esFin = fecha.getDay() === 0 || fecha.getDay() === 6; // fin de semana
            html += `<div class="gantt-day-num ${esHoy?'gantt-day-hoy':''} ${esFin?'gantt-day-fin':''}"
                         style="left:${d*DAY_W}px;width:${DAY_W}px;height:${DAY_H}px">${num}</div>`;
        }
        html += '</div></div>'; // días row

        // — GRID VERTICAL (días y meses) —
        html += `<div class="gantt-grid-lines" style="left:${LABEL_W}px;width:${totalDias*DAY_W}px;top:${HEADER_H}px;height:${tareas.length*ROW_H}px">`;
        for (let d = 0; d < totalDias; d++) {
            const fecha = new Date(minFecha); fecha.setDate(minFecha.getDate() + d);
            const esFin = fecha.getDay() === 0 || fecha.getDay() === 6;
            const esMes = fecha.getDate() === 1 && d > 0;
            if (esMes) {
                html += `<div class="gantt-month-line" style="left:${d*DAY_W}px"></div>`;
            } else {
                html += `<div class="gantt-day-line ${esFin?'gantt-day-line-fin':''}" style="left:${d*DAY_W}px"></div>`;
            }
        }
        // Línea de hoy
        const dHoy = Math.ceil((hoy - minFecha) / 86400000);
        if (dHoy >= 0 && dHoy <= totalDias) {
            html += `<div class="gantt-today-line" style="left:${dHoy*DAY_W}px"></div>`;
        }
        html += '</div>';

        // — FILAS —
        const colores = { Pendiente:'#f59e0b', 'En progreso':'#3b82f6', Finalizada:'#22c55e', Demorada:'#ef4444' };

        tareas.forEach((t, i) => {
            const iniDate = parseDate(t.inicioReal || t.inicioEst);
            const finDate = parseDate(t.finReal || t.finEst || t.inicioReal || t.inicioEst);
            const dIni    = Math.ceil((iniDate - minFecha) / 86400000);
            const dFin    = Math.ceil((finDate - minFecha) / 86400000);
            const barW    = Math.max((dFin - dIni + 1) * DAY_W, DAY_W);
            const barL    = dIni * DAY_W;
            const color   = colores[t.estado] || '#888';
            const esReal  = !!(t.inicioReal);
            const top     = i * ROW_H;

            html += `
            <div class="gantt-row" style="top:${HEADER_H + top}px;height:${ROW_H}px"
                 data-top="${HEADER_H + top}">
                <div class="gantt-row-label" style="width:${LABEL_W}px">
                    <span class="gantt-dot" style="background:${color}"></span>
                    <span class="gantt-row-text">${t.equipo} · ${t.sector}</span>
                </div>
                <div class="gantt-row-track" style="width:${totalDias*DAY_W}px">
                    <div class="gantt-bar ${esReal?'gantt-bar-real':''}"
                         style="left:${barL}px;width:${barW}px;background:${color}"
                         onclick="abrirModal('${t.id}')"
                         title="${t.equipo} · ${t.sector}&#10;${t.descripcion}&#10;${esReal?'Real':'Est'}: ${formatFecha(t.inicioReal||t.inicioEst)} → ${formatFecha(t.finReal||t.finEst||t.inicioReal||t.inicioEst)}">
                        <span class="gantt-bar-label">${t.equipo}</span>
                    </div>
                </div>
            </div>`;
        });

        html += '</div>'; // gantt-table
        inner.innerHTML = html;

        // Scroll táctil / mouse drag
        initGanttDrag(scroll);
    });
}

function initGanttDrag(el) {
    let isDown = false, startX, startY, scrollLeft, scrollTop;

    el.addEventListener('mousedown', e => {
        if (e.target.classList.contains('gantt-bar')) return;
        isDown = true;
        el.classList.add('grabbing');
        startX = e.pageX - el.offsetLeft;
        startY = e.pageY - el.offsetTop;
        scrollLeft = el.scrollLeft;
        scrollTop  = el.scrollTop;
    });
    el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('grabbing'); });
    el.addEventListener('mouseup',    () => { isDown = false; el.classList.remove('grabbing'); });
    el.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX);
        el.scrollTop  = scrollTop  - (e.pageY - el.offsetTop  - startY);
    });

    // Touch
    let tx, ty, tsl, tst;
    el.addEventListener('touchstart', e => {
        tx  = e.touches[0].pageX;
        ty  = e.touches[0].pageY;
        tsl = el.scrollLeft;
        tst = el.scrollTop;
    }, { passive:true });
    el.addEventListener('touchmove', e => {
        el.scrollLeft = tsl - (e.touches[0].pageX - tx);
        el.scrollTop  = tst - (e.touches[0].pageY - ty);
    }, { passive:true });
}

function parseDate(str) {
    if (!str) return new Date();
    const [y,m,d] = str.split('-').map(Number);
    return new Date(y, m-1, d);
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth()+1, 0); }

// ─────────────────────────────────────────
// PANELES FLOTANTES
// ─────────────────────────────────────────
function togglePanel(tipo) {
    const panel   = document.getElementById('panel-' + tipo);
    const overlay = document.getElementById('panel-overlay');
    if (!panel) return;
    const abierto = panel.classList.contains('open');
    cerrarPaneles();
    if (!abierto) {
        panel.classList.add('open');
        if (overlay) overlay.style.display = 'block';
        if (tipo === 'lista') cargarPanelLista();
        if (tipo === 'notif') cargarPanelNotif();
    }
}

function cerrarPaneles() {
    document.querySelectorAll('.panel-dropdown').forEach(p => p.classList.remove('open'));
    const overlay = document.getElementById('panel-overlay');
    if (overlay) overlay.style.display = 'none';
}

function cargarPanelLista() {
    const body = document.getElementById('panel-lista-body');
    if (!body) return;
    body.innerHTML = '<div class="panel-empty">Cargando...</div>';
    const colores = { Pendiente:'#f59e0b','En progreso':'#3b82f6', Finalizada:'#22c55e', Demorada:'#ef4444' };
    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        body.innerHTML = '';
        if (!data) { body.innerHTML = '<div class="panel-empty">No hay tareas.</div>'; return; }
        Object.values(data).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).forEach(t => {
            const item = document.createElement('div');
            item.className = 'panel-item';
            item.innerHTML = `
                <div class="panel-item-titulo">${t.equipo} · ${t.sector}</div>
                <div class="panel-item-desc">${t.descripcion}</div>
                <div class="panel-item-meta">
                    <span class="panel-estado-dot" style="background:${colores[t.estado]||'#888'}"></span>
                    <span style="font-size:12px;color:var(--texto-soft);font-weight:600">${t.estado}</span>
                    ${t.inicioEst?`<span class="panel-item-fecha">📅 ${formatFecha(t.inicioEst)}${t.finEst?' → '+formatFecha(t.finEst):''}</span>`:''}
                </div>`;
            body.appendChild(item);
        });
    });
}

function cargarPanelNotif() {
    const body = document.getElementById('panel-notif-body');
    if (!body) return;
    body.innerHTML = '<div class="panel-empty">Cargando...</div>';
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const limite = new Date(hoy); limite.setDate(hoy.getDate()+5);
    const colores = { Pendiente:'#f59e0b','En progreso':'#3b82f6', Finalizada:'#22c55e', Demorada:'#ef4444' };
    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        body.innerHTML = '';
        if (!data) { body.innerHTML = '<div class="panel-empty">Sin notificaciones.</div>'; return; }
        const proximas = Object.values(data).filter(t => {
            if (!t.inicioEst) return false;
            const f = parseDate(t.inicioEst);
            return f >= hoy && f <= limite;
        }).sort((a,b) => parseDate(a.inicioEst)-parseDate(b.inicioEst));
        if (!proximas.length) { body.innerHTML = '<div class="panel-empty">Sin tareas en los próximos 5 días.</div>'; return; }
        proximas.forEach(t => {
            const diff = Math.round((parseDate(t.inicioEst)-hoy)/86400000);
            const label = diff===0?'🔴 Hoy':diff===1?'🟠 Mañana':`🟡 En ${diff} días`;
            const item = document.createElement('div');
            item.className = 'panel-item';
            item.innerHTML = `
                <div class="panel-item-titulo">${t.equipo} · ${t.sector}</div>
                <div class="panel-item-desc">${t.descripcion}</div>
                <div class="panel-item-meta">
                    <span class="panel-estado-dot" style="background:${colores[t.estado]||'#888'}"></span>
                    <span style="font-size:12px;color:var(--texto-soft);font-weight:600">${t.estado}</span>
                    <span class="panel-item-fecha">${label} · ${formatFecha(t.inicioEst)}</span>
                </div>`;
            body.appendChild(item);
        });
    });
}

function actualizarBadgeNotif() {
    const badge = document.getElementById('badge-notif');
    if (!badge) return;
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const limite = new Date(hoy); limite.setDate(hoy.getDate()+5);
    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        if (!data) { badge.textContent='0'; badge.classList.add('empty'); return; }
        const count = Object.values(data).filter(t => {
            if (!t.inicioEst) return false;
            const f = parseDate(t.inicioEst);
            return f >= hoy && f <= limite;
        }).length;
        badge.textContent = count;
        count>0 ? badge.classList.remove('empty') : badge.classList.add('empty');
    });
}

// ─────────────────────────────────────────
// MODAL EDICIÓN
// ─────────────────────────────────────────
function abrirModal(id) {
    db.ref('tareas/'+id).once('value', snapshot => {
        const t = snapshot.val();
        if (!t) return;
        document.getElementById('modal-titulo').textContent      = `${t.equipo} · ${t.sector}`;
        document.getElementById('modal-descripcion').textContent = t.descripcion;
        document.getElementById('modal-inicioReal').value        = t.inicioReal||'';
        document.getElementById('modal-finReal').value           = t.finReal||'';
        document.getElementById('modal-estado').value            = t.estado||'Pendiente';
        document.getElementById('modal-id').value                = id;
        document.getElementById('modal-overlay').classList.remove('hidden');
    });
}
function cerrarModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
function guardarEdicion() {
    const id         = document.getElementById('modal-id').value;
    const inicioReal = document.getElementById('modal-inicioReal').value;
    const finReal    = document.getElementById('modal-finReal').value;
    const estado     = document.getElementById('modal-estado').value;
    db.ref('tareas/'+id).update({ inicioReal, finReal, estado })
        .then(() => { cerrarModal(); cargarEstados(); actualizarBadgeNotif(); construirGantt(); })
        .catch(err => alert('Error: '+err.message));
}

function eliminarTarea(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    db.ref('tareas/'+id).remove()
        .then(() => { cargarEstados(); actualizarBadgeNotif(); })
        .catch(err => alert('Error: '+err.message));
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function formatFecha(str) {
    if (!str) return '';
    const [y,m,d] = str.split('-');
    return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.addEventListener('click', e => { if (e.target===overlay) cerrarModal(); });
    actualizarBadgeNotif();
    if (!document.getElementById('vista-cargar')) {
        mostrarVista('estados');
    }
});
