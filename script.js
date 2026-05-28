// ─────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────

const USUARIOS = [

  {
    usuario: "admin",
    contrasena: "admin.2026",
    rol: "admin"
  },

  {
    usuario: "visor",
    contrasena: "visor.2026",
    rol: "visor"
  }

];

let usuarioActual = null;


// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────

window.login = function(){

  const usuario =
    document.getElementById('usuario').value;

  const contrasena =
    document.getElementById('password').value;

  const encontrado =
    USUARIOS.find(u =>
      u.usuario === usuario &&
      u.contrasena === contrasena
    );

  if(!encontrado){

    Swal.fire({
      icon:'error',
      title:'Error',
      text:'Usuario o contraseña incorrectos'
    });

    return;

  }

  usuarioActual = encontrado;

  iniciarSistema();

}


// ─────────────────────────────────────────
// INICIAR SISTEMA
// ─────────────────────────────────────────

function iniciarSistema(){

  document
    .getElementById('loginContainer')
    .classList.add('hidden');

  document
    .getElementById('app')
    .classList.remove('hidden');

  document
    .getElementById('usuarioRol')
    .innerText =
      usuarioActual.usuario.toUpperCase();

  // SI ES VISOR

  if(usuarioActual.rol === 'visor'){

    document
      .getElementById('btnCarga')
      .style.display = 'none';

  }

  mostrarVista('calendario');

  cargarTareas();

}


// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────

window.logout = function(){

  location.reload();

}
