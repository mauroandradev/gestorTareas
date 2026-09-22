const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const AuthAPI = {
  // Iniciar sesión
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error de autenticación' }));
      throw new Error(err.detail || 'Credenciales incorrectas');
    }
    return res.json();
  },

  // Obtener lista de usuarios
  getUsers: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/users`);
    if (!res.ok) throw new Error('Error al obtener lista de usuarios');
    return res.json();
  },

  // Crear nuevo usuario (Admin)
  createUser: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al registrar usuario' }));
      throw new Error(err.detail || 'Error al crear usuario');
    }
    return res.json();
  },

  // Actualizar usuario / rol (Admin)
  updateUser: async (id, userData) => {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al actualizar usuario' }));
      throw new Error(err.detail || 'Error al actualizar usuario');
    }
    return res.json();
  },

  // Eliminar usuario (Admin)
  deleteUser: async (id) => {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al eliminar usuario' }));
      throw new Error(err.detail || 'Error al eliminar usuario');
    }
    return res.json();
  }
};

export const TaskAPI = {
  // Obtener tareas con filtros (búsqueda, estado, prioridad, proyecto, fechas)
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'Todas') params.append('status', filters.status);
    if (filters.priority && filters.priority !== 'Todas') params.append('priority', filters.priority);
    if (filters.project && filters.project !== 'Todos') params.append('project', filters.project);
    if (filters.assignee && filters.assignee !== 'Todos') params.append('assignee', filters.assignee);
    if (filters.fromDate) params.append('from_date', filters.fromDate);
    if (filters.toDate) params.append('to_date', filters.toDate);

    const res = await fetch(`${API_BASE_URL}/tasks?${params.toString()}`);
    return res.json();
  },

  // Obtener estadísticas rápidas y lista de proyectos
  getStats: async () => {
    const res = await fetch(`${API_BASE_URL}/stats`);
    return res.json();
  },

  // Crear tarea
  createTask: async (taskData) => {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error('Error al crear tarea');
    return res.json();
  },

  // Actualizar tarea completa
  updateTask: async (id, taskData) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error('Error al actualizar tarea');
    return res.json();
  },

  // Cambiar estado rápido
  updateStatus: async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Error al cambiar estado');
    return res.json();
  },

  // Eliminar tarea
  deleteTask: async (id) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar tarea');
    return res.json();
  }
};
