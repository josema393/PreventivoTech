export function getAuthErrorMessage(error: unknown): string {
  const detail = error && typeof error === "object" ? error as { name?: string; message?: string; status?: number; code?: string } : {};
  const message = typeof detail.message === "string" ? detail.message : "";
  if (detail.name === "AuthRetryableFetchError" || /failed to fetch|error al obtener|networkerror|load failed|fetch failed|network request failed/i.test(message)) {
    return "No se pudo conectar con Supabase. Comprueba tu conexión y la URL del proyecto; si cambiaste .env.local, reinicia la aplicación.";
  }
  if (detail.status === 401 && /api.?key/i.test(message) || /invalid api key/i.test(message)) return "Supabase rechazó la clave publicable. Copia la clave completa del mismo proyecto que la URL y reinicia la aplicación.";
  const messages: Record<string, string> = {
    invalid_credentials: "Correo o contraseña incorrectos.",
    email_not_confirmed: "Confirma tu correo antes de iniciar sesión.",
    signup_disabled: "El registro de usuarios está deshabilitado en Supabase. Contacta al administrador.",
    email_provider_disabled: "El acceso por correo está deshabilitado en Supabase. Contacta al administrador.",
    weak_password: "La contraseña no cumple los requisitos de Supabase. Usa una contraseña más larga y segura.",
    validation_failed: "Revisa el correo y la contraseña: Supabase no pudo validar esos datos.",
    email_address_invalid: "Introduce un correo electrónico válido.",
    user_already_exists: "La cuenta ya existe. Prueba iniciar sesión.",
    over_email_send_rate_limit: "Supabase alcanzó el límite de envío de correos. Espera unos minutos antes de volver a intentar.",
    over_request_rate_limit: "Se realizaron demasiados intentos. Espera unos minutos.",
    captcha_failed: "Supabase exige una verificación CAPTCHA que debe configurarse en el formulario. Contacta al administrador.",
    unexpected_failure: "Supabase no pudo completar el registro. El administrador debe revisar los registros de Auth y el trigger que crea el perfil familiar.",
  };
  if (detail.code && messages[detail.code]) return messages[detail.code];
  if (detail.status === 429) return "Se alcanzó el límite de intentos de Supabase. Espera unos minutos.";
  if (/database error saving new user/i.test(message)) return messages.unexpected_failure;
  if (detail.status && detail.status >= 500) return "Supabase devolvió un error del servidor. Contacta al administrador para revisar los registros de Auth.";
  // No mostrar respuestas arbitrarias, claves ni datos internos del servidor.
  return "No se pudo completar la autenticación. Revisa los datos e inténtalo de nuevo.";
}
