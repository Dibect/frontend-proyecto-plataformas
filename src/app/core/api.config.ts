const API_BASE =
  window.location.port === '4200'
    ? `${window.location.protocol}//${window.location.hostname}:5000/api`
    : '/api';

export const API_URL = `${API_BASE}/autenticacion`;
export const API_TRABAJADORES_URL = `${API_BASE}/trabajadores`;

// El interceptor usa esta base para adjuntar el token a TODOS los endpoints de la API
export { API_BASE };