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
// AUTH GUARD
// ─────────────────────────────────────────
const autenticado   = sessionStorage.getItem('autenticado');
const rolActual     = sessionStorage.getItem('rol');
const usuarioNombre = sessionStorage.getItem('usuario');
if (!autenticado) window.location.href = './index.html';

const spanUsuario = document.getElementById('usuarioActual');
if (spanUsuario) spanUsuario.textContent = usuarioNombre || '';

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
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

    const btnMap = { 'cargar': 'btnCarga', 'estados': 'btnEstados', 'calendario': 'btnCalendario' };
    const btn = document.getElementById(btnMap[nombre]);
    if (btn) btn.classList.add('active');

    if (nombre === 'calendario') setTimeout(iniciarCalendario, 100);
    if (nombre === 'estados')    { filtroActivo = 'todas'; cargarEstados(); }

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
        inicioEst: inicioEst || '', finEst: finEst || '',
        inicioReal: '', finReal: '',
        estado, creadoPor: usuarioNombre, timestamp: Date.now()
    })
    .then(() => {
        alert('Tarea guardada correctamente.');
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
// FILTRO DEL SUB-NAV
// ─────────────────────────────────────────
let filtroActivo = 'todas';

function filtrarEstados(filtro) {
    filtroActivo = filtro;
    document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
    const tabId = {
        'todas':         'subTodas',
        'Pendiente':     'subPendiente',
        'En progreso':   'subProgreso',
        'Finalizada':    'subFinalizada',
        'Demorada':      'subDemorada'
    };
    const el = document.getElementById(tabId[filtro]);
    if (el) el.classList.add('active');

    cerrarPaneles();
    mostrarVista('estados');
}

// ─────────────────────────────────────────
// CARGAR ESTADOS
// ─────────────────────────────────────────
function cargarEstados() {
    const contenedores = {
        'Pendiente':   document.getElementById('pendientes'),
        'En progreso': document.getElementById('progreso'),
        'Finalizada':  document.getElementById('finalizadas'),
        'Demorada':    document.getElementById('demoradas')
    };
    Object.values(contenedores).forEach(c => { if (c) c.innerHTML = ''; });

    // Mostrar/ocultar columnas según filtro
    const estadoCards = document.querySelectorAll('.estado-card');
    estadoCards.forEach(card => {
        if (filtroActivo === 'todas') {
            card.style.display = '';
        } else {
            const titulo = card.querySelector('h3')?.textContent || '';
            const mapa = {
                'Pendiente': 'Pendientes',
                'En progreso': 'En progreso',
                'Finalizada': 'Finalizadas',
                'Demorada': 'Demoradas'
            };
            card.style.display = titulo.includes(mapa[filtroActivo]) ? '' : 'none';
        }
    });

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        if (!data) return;

        Object.entries(data).forEach(([id, tarea]) => {
            if (filtroActivo !== 'todas' && tarea.estado !== filtroActivo) return;
            const contenedor = contenedores[tarea.estado];
            if (!contenedor) return;

            const div = document.createElement('div');
            div.className = 'tarea';
            div.innerHTML = `
                <h4>${tarea.equipo} · ${tarea.sector}</h4>
                <p>${tarea.descripcion}</p>
                <small>
                    ${tarea.inicioEst ? '📅 Est: ' + formatFecha(tarea.inicioEst) + (tarea.finEst ? ' → ' + formatFecha(tarea.finEst) : '') : ''}
                    ${tarea.inicioReal ? '<br>✅ Real: ' + formatFecha(tarea.inicioReal) + (tarea.finReal ? ' → ' + formatFecha(tarea.finReal) : '') : ''}
                </small>
                <div class="tarea-acciones">
                    <button class="editar" onclick="abrirModal('${id}')">Editar</button>
                    ${rolActual === 'admin' ? `<button class="eliminar" onclick="eliminarTarea('${id}')">Eliminar</button>` : ''}
                </div>
            `;
            contenedor.appendChild(div);
        });
    });
}

// ─────────────────────────────────────────
// PANEL LISTA (dropdown desde sub-nav)
// ─────────────────────────────────────────
function togglePanel(tipo) {
    const panel = document.getElementById('panel-' + tipo);
    const overlay = document.getElementById('panel-overlay');
    if (!panel) return;

    const estaAbierto = panel.classList.contains('open');
    cerrarPaneles();
    if (!estaAbierto) {
        panel.classList.add('open');
        if (overlay) overlay.style.display = 'block';
        if (tipo === 'lista')  cargarPanelLista();
        if (tipo === 'notif')  cargarPanelNotif();
    }
}

function cerrarPaneles() {
    document.querySelectorAll('.panel-dropdown').forEach(p => p.classList.remove('open'));
    const overlay = document.getElementById('panel-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─────────────────────────────────────────
// PANEL: LISTA DE TAREAS
// ─────────────────────────────────────────
function cargarPanelLista() {
    const contenido = document.getElementById('panel-lista-body');
    if (!contenido) return;
    contenido.innerHTML = '<div class="panel-empty">Cargando...</div>';

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        contenido.innerHTML = '';

        if (!data) {
            contenido.innerHTML = '<div class="panel-empty">No hay tareas cargadas.</div>';
            return;
        }

        const colores = {
            'Pendiente':   '#f59e0b',
            'En progreso': '#3b82f6',
            'Finalizada':  '#22c55e',
            'Demorada':    '#ef4444'
        };

        Object.values(data).sort((a,b) => (b.timestamp||0) - (a.timestamp||0)).forEach(tarea => {
            const item = document.createElement('div');
            item.className = 'panel-item';
            item.innerHTML = `
                <div class="panel-item-titulo">${tarea.equipo} · ${tarea.sector}</div>
                <div class="panel-item-desc">${tarea.descripcion}</div>
                <div class="panel-item-meta">
                    <span class="panel-estado-dot" style="background:${colores[tarea.estado]||'#888'}"></span>
                    <span style="font-size:12px;color:var(--texto-soft);font-weight:600">${tarea.estado}</span>
                    ${tarea.inicioEst ? `<span class="panel-item-fecha">📅 ${formatFecha(tarea.inicioEst)}${tarea.finEst ? ' → '+formatFecha(tarea.finEst):''}</span>` : ''}
                </div>
            `;
            contenido.appendChild(item);
        });
    });
}

// ─────────────────────────────────────────
// PANEL: NOTIFICACIONES (próximos 5 días)
// ─────────────────────────────────────────
function cargarPanelNotif() {
    const contenido = document.getElementById('panel-notif-body');
    if (!contenido) return;
    contenido.innerHTML = '<div class="panel-empty">Cargando...</div>';

    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const limite = new Date(hoy); limite.setDate(hoy.getDate() + 5);

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        contenido.innerHTML = '';

        if (!data) {
            contenido.innerHTML = '<div class="panel-empty">No hay notificaciones.</div>';
            return;
        }

        const proximas = Object.values(data).filter(t => {
            if (!t.inicioEst) return false;
            const fecha = new Date(t.inicioEst + 'T00:00:00');
            return fecha >= hoy && fecha <= limite;
        }).sort((a,b) => new Date(a.inicioEst) - new Date(b.inicioEst));

        if (!proximas.length) {
            contenido.innerHTML = '<div class="panel-empty">Sin tareas en los próximos 5 días.</div>';
            return;
        }

        const colores = {
            'Pendiente':   '#f59e0b',
            'En progreso': '#3b82f6',
            'Finalizada':  '#22c55e',
            'Demorada':    '#ef4444'
        };

        proximas.forEach(tarea => {
            const fechaInicio = new Date(tarea.inicioEst + 'T00:00:00');
            const diffDias = Math.round((fechaInicio - hoy) / 86400000);
            const cuandoLabel = diffDias === 0 ? '🔴 Hoy'
                              : diffDias === 1 ? '🟠 Mañana'
                              : `🟡 En ${diffDias} días`;

            const item = document.createElement('div');
            item.className = 'panel-item';
            item.innerHTML = `
                <div class="panel-item-titulo">${tarea.equipo} · ${tarea.sector}</div>
                <div class="panel-item-desc">${tarea.descripcion}</div>
                <div class="panel-item-meta">
                    <span class="panel-estado-dot" style="background:${colores[tarea.estado]||'#888'}"></span>
                    <span style="font-size:12px;color:var(--texto-soft);font-weight:600">${tarea.estado}</span>
                    <span class="panel-item-fecha">${cuandoLabel} · ${formatFecha(tarea.inicioEst)}</span>
                </div>
            `;
            contenido.appendChild(item);
        });
    });
}

function actualizarBadgeNotif() {
    const badge = document.getElementById('badge-notif');
    if (!badge) return;

    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const limite = new Date(hoy); limite.setDate(hoy.getDate() + 5);

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        if (!data) { badge.textContent = '0'; badge.classList.add('empty'); return; }

        const count = Object.values(data).filter(t => {
            if (!t.inicioEst) return false;
            const fecha = new Date(t.inicioEst + 'T00:00:00');
            return fecha >= hoy && fecha <= limite;
        }).length;

        badge.textContent = count;
        count > 0 ? badge.classList.remove('empty') : badge.classList.add('empty');
    });
}

// ─────────────────────────────────────────
// MODAL EDICIÓN
// ─────────────────────────────────────────
function abrirModal(id) {
    db.ref('tareas/' + id).once('value', snapshot => {
        const tarea = snapshot.val();
        if (!tarea) return;
        document.getElementById('modal-titulo').textContent      = `${tarea.equipo} · ${tarea.sector}`;
        document.getElementById('modal-descripcion').textContent = tarea.descripcion;
        document.getElementById('modal-inicioReal').value        = tarea.inicioReal || '';
        document.getElementById('modal-finReal').value           = tarea.finReal    || '';
        document.getElementById('modal-estado').value            = tarea.estado     || 'Pendiente';
        document.getElementById('modal-id').value                = id;
        document.getElementById('modal-overlay').classList.remove('hidden');
    });
}

function cerrarModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

function guardarEdicion() {
    const id         = document.getElementById('modal-id').value;
    const inicioReal = document.getElementById('modal-inicioReal').value;
    const finReal    = document.getElementById('modal-finReal').value;
    const estado     = document.getElementById('modal-estado').value;

    db.ref('tareas/' + id).update({ inicioReal, finReal, estado })
        .then(() => { cerrarModal(); cargarEstados(); actualizarBadgeNotif(); })
        .catch(err => alert('Error: ' + err.message));
}

// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────
function eliminarTarea(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    db.ref('tareas/' + id).remove()
        .then(() => { cargarEstados(); actualizarBadgeNotif(); })
        .catch(err => alert('Error: ' + err.message));
}

// ─────────────────────────────────────────
// CALENDARIO
// ─────────────────────────────────────────
let calendarInstance = null;
function iniciarCalendario() {
    const el = document.getElementById('calendar');
    if (!el) return;
    if (calendarInstance) { calendarInstance.destroy(); calendarInstance = null; }

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        const eventos = [];
        const colores = { 'Pendiente':'#f59e0b','En progreso':'#3b82f6','Finalizada':'#22c55e','Demorada':'#ef4444' };

        if (data) {
            Object.values(data).forEach(tarea => {
                const inicio = tarea.inicioReal || tarea.inicioEst;
                const fin    = tarea.finReal    || tarea.finEst;
                if (!inicio) return;
                eventos.push({
                    title: `${tarea.equipo} · ${tarea.sector}`,
                    start: inicio, end: fin || inicio,
                    color: colores[tarea.estado] || '#888',
                    extendedProps: { descripcion: tarea.descripcion }
                });
            });
        }

        calendarInstance = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth', locale: 'es', height: '100%',
            headerToolbar: { left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,listMonth' },
            buttonText: { today:'Hoy', month:'Mes', week:'Semana', list:'Lista' },
            events: eventos,
            eventClick: info => alert(info.event.title + '\n' + (info.event.extendedProps.descripcion||''))
        });
        calendarInstance.render();
    });
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
    // Cerrar modal al click fuera
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(); });

    // Badge notificaciones al cargar
    actualizarBadgeNotif();

    // Visor arranca en estados
    if (!document.getElementById('vista-cargar')) cargarEstados();
});
