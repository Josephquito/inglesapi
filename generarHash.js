const bcrypt = require('bcrypt');

async function generarHash() {
  const password = 'admin123'; // contraseña que quieras
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Hash generado:', hash);
}

generarHash();
