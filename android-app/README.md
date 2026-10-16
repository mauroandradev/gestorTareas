# TaskPulse — App Android Nativa (Capacitor + Firebase FCM)

Esta carpeta contiene el proyecto nativo de Android para la aplicación móvil de **TaskPulse**.

---

## 📁 Estructura del proyecto

- `android/`: Proyecto nativo de Android (abrir con Android Studio).
- `android/app/google-services.json`: Configuración de Firebase Cloud Messaging vinculada al proyecto `task-963f6` (`com.losandestx.tasks`).
- `capacitor.config.json`: Configuración de Capacitor que apunta al frontend (`../frontend/dist`) y a la API (`https://tasks.losandestx.com/api`).

---

## 🚀 Pasos para generar el archivo APK instalable

### 1. Requisito previo
Tener instalado **[Android Studio](https://developer.android.com/studio)**. (Instalación estándar de siguiente, siguiente).

### 2. Abrir el proyecto en Android Studio
1. Abre **Android Studio**.
2. Selecciona **Open** (Abrir proyecto).
3. Selecciona la carpeta:
   `c:\Users\mauro\Desktop\Mauro\sistemaTareas\android-app\android`
4. Espera 1 a 2 minutos la primera vez mientras Gradle descarga los paquetes necesarios automáticamente.

### 3. Generar el archivo `.apk` (En 2 clics)
1. En el menú superior de Android Studio, haz clic en:
   **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2. Cuando termine la compilación (unos 30 segundos), aparecerá una notificación abajo a la derecha diciendo:
   `APK(s) generated successfully for 1 module`.
3. Haz clic en **locate**. Se abrirá la carpeta con el archivo:
   `app-debug.apk` (o renómbralo a `TaskPulse.apk`).

¡Ese archivo `.apk` es el que envías por mensaje o subes para que tu equipo lo instale en sus teléfonos Android!

---

## 🔄 Cómo actualizar la app si cambias el diseño o el código

Cada vez que hagas cambios en el código de `frontend`:
1. Compilar el frontend:
   ```bash
   cd ../frontend
   npm run build
   ```
2. Sincronizar los cambios a la app Android:
   ```bash
   cd ../android-app
   npm run sync
   ```
3. En Android Studio, presiona **Build > Build APK(s)** para generar el nuevo APK.

---

## 🔔 Notificaciones Push en el Teléfono

1. El teléfono solicita permisos de notificación la primera vez que se abre la app.
2. Al iniciar sesión, la app registra el token FCM del dispositivo en el backend (`/api/notifications/register-token`).
3. El backend notifica automáticamente al teléfono cuando:
   - Se crea y asigna una tarea a un usuario.
   - Un usuario solicita la eliminación de una tarea (notifica a los administradores).
   - Un administrador aprueba o rechaza una solicitud (notifica al solicitante).
