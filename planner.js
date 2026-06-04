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

    const navSub = document.getElementById('navSub');
    if (navSub) navSub.classList.toggle('hidden', nombre !== 'estados');

    if (nombre === 'estados')    { filtroActivo = 'todas'; cargarEstados(); }
    if (nombre === 'calendario') {
        setTimeout(construirGantt, 80);
    }

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
    const inner  = document.getElementById('ganttInner');
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

        let minFecha = null, maxFecha = null;
        tareas.forEach(t => {
            const ini = parseDate(t.inicioReal || t.inicioEst);
            const fin = parseDate(t.finReal || t.finEst || t.inicioReal || t.inicioEst);
            if (!minFecha || ini < minFecha) minFecha = ini;
            if (!maxFecha || fin > maxFecha) maxFecha = fin;
        });
        minFecha = startOfMonth(minFecha);
        maxFecha = endOfMonth(maxFecha);

        const isMobile = window.innerWidth <= 768;
        const DAY_W   = isMobile ? 28 : 34;
        const LABEL_W = isMobile ? 130 : 220;
        const hoy = new Date(); hoy.setHours(0,0,0,0);

        const dias = [];
        const cur = new Date(minFecha);
        while (cur <= maxFecha) {
            dias.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        const totalDias = dias.length;
        const trackW = totalDias * DAY_W;

        const meses = [];
        dias.forEach((d, i) => {
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!meses.length || meses[meses.length-1].key !== key) {
                meses.push({ key, label: d.toLocaleDateString('es-AR',{month:'long',year:'numeric'}), startIdx: i, count: 1 });
            } else {
                meses[meses.length-1].count++;
            }
        });

        const colores = { Pendiente:'#f59e0b','En progreso':'#3b82f6',Finalizada:'#22c55e',Demorada:'#ef4444' };

        let html = `<div class="gt-wrap" style="min-width:${LABEL_W + trackW}px">`;

        // FILA MESES
        html += `<div class="gt-row gt-head-row">`;
        html += `<div class="gt-cell gt-label-cell gt-head-cell" style="width:${LABEL_W}px;min-width:${LABEL_W}px"></div>`;
        html += `<div class="gt-track" style="width:${trackW}px">`;
        meses.forEach(m => {
            html += `<div class="gt-month-cell" style="width:${m.count*DAY_W}px">${m.label}</div>`;
        });
        html += `</div></div>`;

        // FILA DÍAS
        html += `<div class="gt-row gt-days-row">`;
        html += `<div class="gt-cell gt-label-cell gt-days-head" style="width:${LABEL_W}px;min-width:${LABEL_W}px"></div>`;
        html += `<div class="gt-track" style="width:${trackW}px">`;
        dias.forEach(d => {
            const esHoy = d.getTime() === hoy.getTime();
            const esFin = d.getDay()===0 || d.getDay()===6;
            html += `<div class="gt-day-cell${esHoy?' gt-hoy':''}${esFin?' gt-finde':''}" style="width:${DAY_W}px">${d.getDate()}</div>`;
        });
        html += `</div></div>`;

        // FILAS TAREAS
        tareas.forEach(t => {
            const ini   = parseDate(t.inicioReal || t.inicioEst);
            const fin   = parseDate(t.finReal || t.finEst || t.inicioReal || t.inicioEst);
            const dIni  = Math.round((ini - minFecha) / 86400000);
            const dFin  = Math.round((fin - minFecha) / 86400000);
            const barL  = dIni * DAY_W;
            const barW  = Math.max((dFin - dIni + 1) * DAY_W, DAY_W);
            const color = colores[t.estado] || '#888';
            const esReal = !!t.inicioReal;

            html += `<div class="gt-row gt-task-row">`;
            html += `<div class="gt-cell gt-label-cell" style="width:${LABEL_W}px;min-width:${LABEL_W}px">
                        <span class="gantt-dot" style="background:${color}"></span>
                        <span class="gt-label-text">${t.equipo} · ${t.sector}</span>
                     </div>`;
            html += `<div class="gt-track" style="width:${trackW}px;position:relative">`;

            dias.forEach((d, i) => {
                const esFin = d.getDay()===0 || d.getDay()===6;
                const esMes = d.getDate()===1 && i>0;
                html += `<div class="gt-col${esFin?' gt-col-fin':''}${esMes?' gt-col-mes':''}" style="left:${i*DAY_W}px;width:${DAY_W}px"></div>`;
            });

            const dHoy = Math.round((hoy - minFecha) / 86400000);
            if (dHoy >= 0 && dHoy < totalDias) {
                html += `<div class="gt-hoy-line" style="left:${dHoy*DAY_W}px"></div>`;
            }

            html += `<div class="gt-bar${esReal?' gt-bar-real':''}"
                          style="left:${barL}px;width:${barW}px;background:${color}"
                          onclick="abrirInfo('${t.id}')"
                          title="${t.equipo} · ${t.sector}\n${t.descripcion}">
                        <span class="gt-bar-label">${t.equipo}</span>
                     </div>`;

            html += `</div></div>`;
        });

        html += `</div>`;
        inner.innerHTML = html;
        initGanttDrag(scroll);
    });
}

function initGanttDrag(el) {
    // Scroll nativo en mobile (touch)
    el.style.webkitOverflowScrolling = 'touch';
    el.style.overflowX = 'auto';
    el.style.overflowY = 'auto';

    // Drag con mouse en desktop
    let isDown = false, startX, startY, scrollLeft, scrollTop;

    el.addEventListener('mousedown', e => {
        if (e.target.closest('.gt-bar')) return;
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
}

// ─────────────────────────────────────────
// GANTT FULLSCREEN
// ─────────────────────────────────────────
function toggleGanttFS() {
    const wrapper = document.querySelector('.gantt-wrapper');
    const btn     = document.getElementById('ganttFsBtn');
    if (!wrapper) return;

    const isFS = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement
    );

    if (!isFS) {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
        const req = wrapper.requestFullscreen || wrapper.webkitRequestFullscreen;
        if (req) req.call(wrapper);
        if (btn) { btn.innerHTML = '✕ Salir'; btn.classList.add('fs-active'); }
    } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        if (btn) { btn.innerHTML = '⛶ Pantalla completa'; btn.classList.remove('fs-active'); }
    }
}

document.addEventListener('fullscreenchange',       _syncFsBtn);
document.addEventListener('webkitfullscreenchange', _syncFsBtn);
function _syncFsBtn() {
    const btn = document.getElementById('ganttFsBtn');
    if (!btn) return;
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (isFS) {
        btn.innerHTML = '✕ Salir';
        btn.classList.add('fs-active');
    } else {
        btn.innerHTML = '⛶ Pantalla completa';
        btn.classList.remove('fs-active');
    }
}

// ─────────────────────────────────────────
// HELPERS DE FECHA
// ─────────────────────────────────────────
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
// MODAL INFO (desde Gantt)
// ─────────────────────────────────────────
let _infoIdActual = null;

function abrirInfo(id) {
    db.ref('tareas/'+id).once('value', snapshot => {
        const t = snapshot.val();
        if (!t) return;
        _infoIdActual = id;

        document.getElementById('info-titulo').textContent      = `${t.equipo} · ${t.sector}`;
        document.getElementById('info-descripcion').textContent = t.descripcion;

        const iconos = { Pendiente:'🟡', 'En progreso':'🔵', Finalizada:'🟢', Demorada:'🔴' };
        const claseEstado = (t.estado||'Pendiente').replace(' ','-');
        document.getElementById('info-estado-badge').innerHTML =
            `<span class="info-estado ${claseEstado}">${iconos[t.estado]||'⚪'} ${t.estado}</span>`;

        let fechas = '';
        if (t.inicioEst) fechas += `📅 Estimado: <strong>${formatFecha(t.inicioEst)}${t.finEst?' → '+formatFecha(t.finEst):''}</strong><br>`;
        if (t.inicioReal) fechas += `✅ Real: <strong>${formatFecha(t.inicioReal)}${t.finReal?' → '+formatFecha(t.finReal):''}</strong>`;
        document.getElementById('info-fechas').innerHTML = fechas || '<em>Sin fechas cargadas</em>';

        const btnEditar = document.getElementById('info-btn-editar');
        if (btnEditar) btnEditar.style.display = rolActual === 'admin' ? 'block' : 'none';

        document.getElementById('info-overlay').classList.remove('hidden');
    });
}

function cerrarInfo() {
    document.getElementById('info-overlay').classList.add('hidden');
    _infoIdActual = null;
}

function pasarAEditar() {
    cerrarInfo();
    if (_infoIdActual) setTimeout(() => abrirModal(_infoIdActual), 100);
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

    const infoOverlay = document.getElementById('info-overlay');
    if (infoOverlay) infoOverlay.addEventListener('click', e => { if (e.target===infoOverlay) cerrarInfo(); });

    actualizarBadgeNotif();
    if (!document.getElementById('vista-cargar')) {
        mostrarVista('estados');
    }
});
