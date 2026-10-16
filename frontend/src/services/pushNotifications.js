import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { authFetch, API_BASE_URL } from "./api";

export const initPushNotifications = async (onNotificationReceived) => {
  // Solo se ejecuta en dispositivo móvil nativo (Android / iOS)
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 1. Solicitar permisos (obligatorio en Android 13+)
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== "granted") {
      console.warn("Permisos de notificaciones no otorgados.");
      return;
    }

    // 2. Registrarse con FCM
    await PushNotifications.register();

    // 3. Listener cuando Firebase entrega el Token FCM al teléfono
    await PushNotifications.addListener("registration", async (token) => {
      try {
        await authFetch(`${API_BASE_URL}/notifications/register-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fcm_token: token.value,
            platform: Capacitor.getPlatform(),
          }),
        });
      } catch (err) {
        console.error("Error guardando token FCM en servidor:", err);
      }
    });

    // 4. Listener cuando falla el registro
    await PushNotifications.addListener("registrationError", (err) => {
      console.error("Error de registro push en FCM:", err);
    });

    // 5. Listener cuando llega notificación con la app abierta en primer plano
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // 6. Listener cuando el usuario toca la notificación
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Notificación abierta:", action.notification);
    });
  } catch (e) {
    console.error("Error al inicializar PushNotifications:", e);
  }
};
