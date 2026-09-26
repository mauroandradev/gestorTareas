const isDev =
  typeof window !== "undefined" &&
  (window.location.port === "5173" || window.location.port === "3000");
const API_BASE_URL = isDev
  ? `http://${window.location.hostname}:8000/api`
  : "/api";

export const AuthAPI = {
  // Iniciar sesión
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error de autenticación" }));
      throw new Error(err.detail || "Credenciales incorrectas");
    }
    return res.json();
  },

  // Obtener lista de usuarios
  getUsers: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/users`);
    if (!res.ok) throw new Error("Error al obtener lista de usuarios");
    return res.json();
  },

  // Crear nuevo usuario (Admin)
  createUser: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al registrar usuario" }));
      throw new Error(err.detail || "Error al crear usuario");
    }
    return res.json();
  },

  // Actualizar usuario / rol (Admin)
  updateUser: async (id, userData) => {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al actualizar usuario" }));
      throw new Error(err.detail || "Error al actualizar usuario");
    }
    return res.json();
  },

  // Eliminar usuario (Admin)
  deleteUser: async (id) => {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al eliminar usuario" }));
      throw new Error(err.detail || "Error al eliminar usuario");
    }
    return res.json();
  },
};

export const TaskAPI = {
  // Obtener tareas con filtros (búsqueda, estado, prioridad, proyecto, fechas, usuario)
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.status && filters.status !== "Todas")
      params.append("status", filters.status);
    if (filters.priority && filters.priority !== "Todas")
      params.append("priority", filters.priority);
    if (filters.project && filters.project !== "Todos")
      params.append("project", filters.project);
    if (filters.assignee && filters.assignee !== "Todos")
      params.append("assignee", filters.assignee);
    if (filters.fromDate) params.append("from_date", filters.fromDate);
    if (filters.toDate) params.append("to_date", filters.toDate);
    if (filters.user_name) params.append("user_name", filters.user_name);
    if (filters.is_admin !== undefined) params.append("is_admin", String(filters.is_admin));

    const res = await fetch(`${API_BASE_URL}/tasks?${params.toString()}`);
    return res.json();
  },

  // Obtener estadísticas rápidas y lista de proyectos con permisos
  getStats: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.user_name) params.append("user_name", options.user_name);
    if (options.is_admin !== undefined) params.append("is_admin", String(options.is_admin));

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/stats${queryStr}`);
    return res.json();
  },

  // Crear tarea
  createTask: async (taskData) => {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error("Error al crear tarea");
    return res.json();
  },

  // Actualizar tarea completa
  updateTask: async (id, taskData) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error("Error al actualizar tarea");
    return res.json();
  },

  // Cambiar estado rápido
  updateStatus: async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Error al cambiar estado");
    return res.json();
  },

  // Eliminar tarea
  deleteTask: async (id) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Error al eliminar tarea");
    return res.json();
  },

  // Renombrar proyecto y sus tareas asociadas
  renameProject: async (projectName, newName, currentUser, isAdmin) => {
    return ProjectAPI.updateProject(
      projectName,
      { new_name: newName, name: newName },
      currentUser,
      isAdmin
    );
  },

  // Eliminar proyecto completo y sus tareas
  deleteProject: async (projectName, currentUser, isAdmin) => {
    return ProjectAPI.deleteProject(projectName, currentUser, isAdmin);
  },
};

export const ProjectAPI = {
  // Obtener lista completa de proyectos con permisos
  getProjects: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.user_name) params.append("user_name", options.user_name);
    if (options.is_admin !== undefined)
      params.append("is_admin", String(options.is_admin));

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/projects${queryStr}`);
    if (!res.ok) throw new Error("Error al obtener lista de proyectos");
    return res.json();
  },

  // Crear nuevo proyecto con dueño y miembros
  createProject: async (projectData, creatorName) => {
    const params = new URLSearchParams();
    if (creatorName) params.append("creator_name", creatorName);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/projects${queryStr}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al crear proyecto" }));
      throw new Error(err.detail || "Error al crear proyecto");
    }
    return res.json();
  },

  // Actualizar proyecto (nombre, descripción, dueño, miembros)
  updateProject: async (projectName, projectData, currentUser, isAdmin) => {
    const params = new URLSearchParams();
    if (currentUser) params.append("current_user", currentUser);
    if (isAdmin !== undefined) params.append("is_admin", String(isAdmin));

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(
      `${API_BASE_URL}/projects/${encodeURIComponent(projectName)}${queryStr}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      }
    );
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al actualizar proyecto" }));
      throw new Error(err.detail || "Error al actualizar proyecto");
    }
    return res.json();
  },

  // Agregar miembro al proyecto
  addMember: async (projectName, memberName, currentUser, isAdmin) => {
    const params = new URLSearchParams();
    if (currentUser) params.append("current_user", currentUser);
    if (isAdmin !== undefined) params.append("is_admin", String(isAdmin));

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(
      `${API_BASE_URL}/projects/${encodeURIComponent(projectName)}/members${queryStr}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_name: memberName }),
      }
    );
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al agregar miembro al proyecto" }));
      throw new Error(err.detail || "Error al agregar miembro al proyecto");
    }
    return res.json();
  },

  // Remover miembro del proyecto
  removeMember: async (projectName, memberName, currentUser, isAdmin) => {
    const params = new URLSearchParams();
    if (currentUser) params.append("current_user", currentUser);
    if (isAdmin !== undefined) params.append("is_admin", String(isAdmin));

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(
      `${API_BASE_URL}/projects/${encodeURIComponent(projectName)}/members/${encodeURIComponent(memberName)}${queryStr}`,
      {
        method: "DELETE",
      }
    );
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al remover miembro del proyecto" }));
      throw new Error(err.detail || "Error al remover miembro del proyecto");
    }
    return res.json();
  },

  // Eliminar proyecto completo y sus tareas
  deleteProject: async (projectName, currentUser, isAdmin) => {
    const params = new URLSearchParams();
    if (currentUser) params.append("current_user", currentUser);
    if (isAdmin !== undefined) params.append("is_admin", String(isAdmin));

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(
      `${API_BASE_URL}/projects/${encodeURIComponent(projectName)}${queryStr}`,
      {
        method: "DELETE",
      }
    );
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al eliminar el proyecto" }));
      throw new Error(err.detail || "Error al eliminar el proyecto");
    }
    return res.json();
  },
};

export const RoleAPI = {
  // Listar todos los roles
  getRoles: async () => {
    const res = await fetch(`${API_BASE_URL}/roles`);
    if (!res.ok) throw new Error("Error al obtener lista de roles");
    return res.json();
  },

  // Crear nuevo rol
  createRole: async (roleData) => {
    const res = await fetch(`${API_BASE_URL}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roleData),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al crear rol" }));
      throw new Error(err.detail || "Error al crear rol");
    }
    return res.json();
  },

  // Modificar rol existente
  updateRole: async (id, roleData) => {
    const res = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roleData),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al actualizar rol" }));
      throw new Error(err.detail || "Error al actualizar rol");
    }
    return res.json();
  },

  // Eliminar rol
  deleteRole: async (id) => {
    const res = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Error al eliminar rol" }));
      throw new Error(err.detail || "Error al eliminar rol");
    }
    return res.json();
  },
};
