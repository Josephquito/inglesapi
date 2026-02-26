# Sistema de cuestinonarios con NestJS + PostgreSQL

Este proyecto es un backend básico con autenticación JWT usando NestJS, TypeORM y PostgreSQL. Permite el registro y autenticación de usuarios, asignación de roles y gestión de estados.

## Requisitos

- Node.js (>= 18)
- PostgreSQL
- Postman (opcional para pruebas)

---

## Estructura de la Base de Datos

se debe restaurar la base con una de las replicas.

---

## Configuración

Crea o modifica el archivo .env en la raíz del proyecto con el siguiente contenido:

# .env

    DB_HOST=localhost
    DB_PORT=5432
    DB_USERNAME=postgres
    DB_PASSWORD=postgres
    DB_NAME=testapp

# Opcional

    NODE_ENV=development

# JWT

    JWT_SECRET=012628883001
    JWT_EXPIRES_IN=1d

# Email

    MAIL_HOST=smtp.gmail.com
    MAIL_PORT=587
    MAIL_USER=nocode593@gmail.com
    MAIL_PASS=aaayykrmqefqaxfy
    MAIL_FROM="TestApp" <nocode593@gmail.com>

---

## Instala las dependencias:

    npm install

---

## Inicia el servidor:

    npm run start:dev

---

## Registro de Usuario (POSTMAN)

Para registrar un usuario (por ejemplo, un administrador), usa Postman con:

URL: http://localhost:3000/entidad/crear

Método: POST

Body (JSON):

    {
      "ruc": "0999999999001",
      "nombre_comercial": "Colegio SudAmericado test",
      "razon_social": "Colegio tecnologioc Sudamericano",
      "direccion": "Av. Principal 1234, Ciudad",
      "imagen_logo": "https://example.com/logo.png",
      "activo": true
    }

---

URL: http://localhost:3000/auth/register

Método: POST

Body (JSON):

    {
      "username": "admin",
      "password": "0",
      "identificacion": "000000001",
      "nombres": "Admin",
      "apellidos": "Sistema",
      "rol": "ADMIN",
      "id_entidad": 1
    }

---

URL: http://localhost:3000/auth/login

Método: POST

Body (JSON):

    {
      "username": "admin",
      "password": "0"
    }

---

## Estructura de Carpetas

src/
├── controllers/
├── entities/
├── services/
├── guards/
├── strategies/
├── dto/
├── modules/
├── main.ts

---

## Notas

El campo rol debe coincidir con el código del rol existente (por ejemplo: "ADMIN").
El backend incluye validaciones, encriptación de contraseñas y guardias JWT por ende se debe usar Authorization: Bearer <token> para acceder a cualquier endpoint que no sea el login o el register.
