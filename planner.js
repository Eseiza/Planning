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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ─────────────────────────────────────────
// AUTH GUARD
// ─────────────────────────────────────────
const autenticado   = sessionStorage.getItem('autenticado');
const rolActual     = sessionStorage.getItem('rol');
const usuarioNombre = sessionStorage.getItem('usuario');

if (!autenticado) {
    window.location.href = './index.html';
}

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
// NAVEGACIÓN
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
    if (nombre === 'estados')    cargarEstados();
}

// ─────────────────────────────────────────
// GUARDAR TAREA (solo admin)
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

    const tarea = {
        sector, equipo, descripcion,
        inicioEst:  inicioEst  || '',
        finEst:     finEst     || '',
        inicioReal: '',
        finReal:    '',
        estado,
        creadoPor: usuarioNombre,
        timestamp: Date.now()
    };

    db.ref('tareas').push(tarea)
        .then(() => {
            alert('Tarea guardada correctamente.');
            ['sector','equipo','descripcion','inicioEst','finEst'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('estado').value = 'Pendiente';
        })
        .catch(err => alert('Error al guardar: ' + err.message));
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

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        if (!data) return;

        Object.entries(data).forEach(([id, tarea]) => {
            const contenedor = contenedores[tarea.estado];
            if (!contenedor) return;

            const div = document.createElement('div');
            div.className = 'tarea';
            div.innerHTML = `
                <h4>${tarea.equipo} · ${tarea.sector}</h4>
                <p>${tarea.descripcion}</p>
                <small>
                    ${tarea.inicioEst ? '📅 Est: ' + tarea.inicioEst + (tarea.finEst ? ' → ' + tarea.finEst : '') : ''}
                    ${tarea.inicioReal ? '<br>✅ Real: ' + tarea.inicioReal + (tarea.finReal ? ' → ' + tarea.finReal : '') : ''}
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
// MODAL DE EDICIÓN
// ─────────────────────────────────────────
function abrirModal(id) {
    db.ref('tareas/' + id).once('value', snapshot => {
        const tarea = snapshot.val();
        if (!tarea) return;

        document.getElementById('modal-titulo').textContent     = `${tarea.equipo} · ${tarea.sector}`;
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
        .then(() => {
            cerrarModal();
            cargarEstados();
        })
        .catch(err => alert('Error al guardar: ' + err.message));
}

// Cerrar modal al hacer click fuera
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) cerrarModal();
        });
    }
    if (document.getElementById('vista-estados') && !document.getElementById('vista-cargar')) {
        cargarEstados();
    }
});

// ─────────────────────────────────────────
// ELIMINAR TAREA (solo admin)
// ─────────────────────────────────────────
function eliminarTarea(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    db.ref('tareas/' + id).remove()
        .then(() => cargarEstados())
        .catch(err => alert('Error: ' + err.message));
}

// ─────────────────────────────────────────
// CALENDARIO
// ─────────────────────────────────────────
let calendarInstance = null;

function iniciarCalendario() {
    const el = document.getElementById('calendar');
    if (!el) return;

    if (calendarInstance) {
        calendarInstance.destroy();
        calendarInstance = null;
    }

    db.ref('tareas').once('value', snapshot => {
        const data = snapshot.val();
        const eventos = [];

        if (data) {
            const colores = {
                'Pendiente':   '#f1c40f',
                'En progreso': '#2980b9',
                'Finalizada':  '#27ae60',
                'Demorada':    '#c0392b'
            };
            Object.values(data).forEach(tarea => {
                const inicio = tarea.inicioReal || tarea.inicioEst;
                const fin    = tarea.finReal    || tarea.finEst;
                if (!inicio) return;
                eventos.push({
                    title: `${tarea.equipo} · ${tarea.sector}`,
                    start: inicio,
                    end:   fin || inicio,
                    color: colores[tarea.estado] || '#999',
                    extendedProps: { descripcion: tarea.descripcion }
                });
            });
        }

        calendarInstance = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: '100%',
            headerToolbar: {
                left:   'prev,next today',
                center: 'title',
                right:  'dayGridMonth,timeGridWeek,listMonth'
            },
            buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Lista' },
            events: eventos,
            eventClick: function(info) {
                alert(info.event.title + '\n' + (info.event.extendedProps.descripcion || ''));
            }
        });
        calendarInstance.render();
    });
}
