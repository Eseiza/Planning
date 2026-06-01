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
const autenticado = sessionStorage.getItem('autenticado');
const rolActual   = sessionStorage.getItem('rol');
const usuarioNombre = sessionStorage.getItem('usuario');

if (!autenticado) {
    window.location.href = './index.html';
}

// Mostrar nombre de usuario en navbar
const spanUsuario = document.getElementById('usuarioActual');
if (spanUsuario) {
    spanUsuario.textContent = usuarioNombre || '';
}

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
function logout() {
    sessionStorage.clear();
    window.location.href = './index.html';
}

// ─────────────────────────────────────────
// NAVEGACIÓN ENTRE VISTAS
// ─────────────────────────────────────────
function mostrarVista(nombre) {
    // Ocultar todas las vistas
    document.querySelectorAll('.vista').forEach(v => v.classList.add('hidden'));
    // Quitar activo de todos los botones
    document.querySelectorAll('.nav-center button').forEach(b => b.classList.remove('active'));

    // Mostrar la vista pedida
    const vista = document.getElementById('vista-' + nombre);
    if (vista) vista.classList.remove('hidden');

    // Activar el botón correspondiente
    const btnMap = {
        'cargar':    'btnCarga',
        'estados':   'btnEstados',
        'calendario':'btnCalendario'
    };
    const btn = document.getElementById(btnMap[nombre]);
    if (btn) btn.classList.add('active');

    // Inicializar calendario solo cuando se muestra esa vista
    if (nombre === 'calendario') {
        setTimeout(iniciarCalendario, 100);
    }

    // Cargar estados cuando se muestra esa vista
    if (nombre === 'estados') {
        cargarEstados();
    }
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
    const inicioReal  = document.getElementById('inicioReal')?.value;
    const finReal     = document.getElementById('finReal')?.value;
    const estado      = document.getElementById('estado')?.value;

    if (!sector || !equipo || !descripcion) {
        alert('Completá al menos sector, equipo y descripción.');
        return;
    }

    const tarea = {
        sector,
        equipo,
        descripcion,
        inicioEst:  inicioEst  || '',
        finEst:     finEst     || '',
        inicioReal: inicioReal || '',
        finReal:    finReal    || '',
        estado,
        creadoPor: usuarioNombre,
        timestamp: Date.now()
    };

    db.ref('tareas').push(tarea)
        .then(() => {
            alert('Tarea guardada correctamente.');
            // Limpiar formulario
            ['sector','equipo','descripcion','inicioEst','finEst','inicioReal','finReal'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('estado').value = 'Pendiente';
        })
        .catch(err => {
            alert('Error al guardar: ' + err.message);
        });
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

    // Limpiar
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
                ${rolActual === 'admin' ? `<br><button class="eliminar" onclick="eliminarTarea('${id}')">Eliminar</button>` : ''}
            `;
            contenedor.appendChild(div);
        });
    });
}

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

    // Si ya existe, destruirlo y recrear para refrescar eventos
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
                const inicio = tarea.inicioEst || tarea.inicioReal;
                const fin    = tarea.finEst    || tarea.finReal;
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
            buttonText: {
                today:     'Hoy',
                month:     'Mes',
                week:      'Semana',
                list:      'Lista'
            },
            events: eventos,
            eventClick: function(info) {
                alert(
                    info.event.title + '\n' +
                    (info.event.extendedProps.descripcion || '')
                );
            }
        });

        calendarInstance.render();
    });
}

// ─────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Cargar estados al inicio en visor (que empieza en vista-estados)
    if (document.getElementById('vista-estados') && !document.getElementById('vista-cargar')) {
        cargarEstados();
    }
});
