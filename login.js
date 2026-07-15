// ─────────────────────────────────────────
// FIREBASE
// ─────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyChA3HyR-wRvpQX1rYoFcpC4QBsMpmm2x8",
  authDomain: "planning-4c106.firebaseapp.com",
  databaseURL: "https://planning-4c106-default-rtdb.firebaseio.com",
  projectId: "planning-4c106",
  storageBucket: "planning-4c106.firebasestorage.app",
  messagingSenderId: "57138484731",
  appId: "1:57138484731:web:51703733ddf21ea018675e",
  measurementId: "G-BJZF7927BC"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ─────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────
const USUARIOS = [
    { usuario: "admin",  contrasena: "admin.2026",  rol: "admin",  redirige: "./admin.html" },
    { usuario: "visor",  contrasena: "visor.2026",  rol: "visor",  redirige: "./visor.html" }
];

// ─────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────
const ROLES = [
    { value: "admin", label: "Admin", icon: "🔑" },
    { value: "visor", label: "Visor", icon: "👁️" }
];
let rolSeleccionado = null;

// ─────────────────────────────────────────
// CREAR SELECT DE ROLES
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.roles-grid');
    if (!grid) return;

    const select = document.createElement('select');
    select.id = 'rolSelect';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = '-- Seleccioná un rol --';
    select.appendChild(placeholder);

    ROLES.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.value;
        opt.textContent = `${r.icon} ${r.label}`;
        select.appendChild(opt);
    });

    select.addEventListener('change', function () {
        seleccionarRol(this.value);
    });

    grid.parentNode.insertBefore(select, grid);
});

// ─────────────────────────────────────────
// SELECCIONAR ROL
// ─────────────────────────────────────────
window.seleccionarRol = function (rol) {
    rolSeleccionado = rol;
    document.getElementById('formBody').classList.add('visible');
};

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const inputUsername = document.getElementById('username').value.trim().toLowerCase();
    const inputPassword = document.getElementById('password').value.trim();
    const messageDisplay = document.getElementById('loginMessage');

    if (!rolSeleccionado) {
        messageDisplay.textContent = "Seleccioná un rol";
        messageDisplay.style.color = "red";
        return;
    }

    const usuarioEncontrado = USUARIOS.find(u =>
        u.usuario === inputUsername &&
        u.contrasena === inputPassword &&
        u.rol === rolSeleccionado
    );

    if (usuarioEncontrado) {
        sessionStorage.setItem('autenticado', 'true');
        sessionStorage.setItem('rol', usuarioEncontrado.rol);
        sessionStorage.setItem('usuario', usuarioEncontrado.usuario);
        messageDisplay.textContent = "Ingreso correcto ✓";
        messageDisplay.style.color = "green";
        setTimeout(() => {
            window.location.href = usuarioEncontrado.redirige;
        }, 1200);
    } else {
        messageDisplay.textContent = "Usuario o contraseña incorrectos";
        messageDisplay.style.color = "red";
    }
});
