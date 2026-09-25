import React, { useState, useEffect } from "react";
import { TaskAPI, AuthAPI, RoleAPI, ProjectAPI } from "./services/api";

export default function App() {
  // ----------------- AUTHENTICATION STATE -----------------
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Purge any residual items in localStorage
  useEffect(() => {
    try {
      localStorage.removeItem("taskpulse_user");
      localStorage.removeItem("taskpulse_deleted_projects");
      localStorage.removeItem("taskpulse_custom_projects");
    } catch {}
  }, []);

  // ----------------- MAIN APP STATE -----------------
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    en_progreso: 0,
    completadas: 0,
    urgentes: 0,
    proyectos: [],
    project_counts: {},
  });
  const [loading, setLoading] = useState(true);

  // Selected Project / Workspace ('Todos' or a specific project name)
  const [currentProject, setCurrentProject] = useState("Todos");

  // Active View per Project: 'kanban', 'list', 'calendar'
  const [viewMode, setViewMode] = useState("kanban");

  // Mobile menu / drawer toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [priorityFilter, setPriorityFilter] = useState("Todas");
  const [assigneeFilter, setAssigneeFilter] = useState("Todas");

  // Date Filters
  const [datePreset, setDatePreset] = useState("all"); // 'all', 'today', 'week', 'month', 'overdue', 'custom'
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(
    new Date().getDate(),
  );

  // Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Media",
    status: "Pendiente",
    project: "Q3 Lanzamiento",
    assignees: ["Administrador Principal"],
    assignee: "Administrador Principal",
    start_date: "",
    due_date: "",
  });

  // Project Creation & Edit / Member Management Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: "",
    description: "",
    members: [],
  });

  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: "",
    description: "",
    owner_name: "",
    members: [],
  });

  // User & Roles Management Modal State (Admin Only)
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [adminTab, setAdminTab] = useState("users"); // 'users' | 'roles'
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Desarrollador",
    is_admin: false,
  });

  // Role Form Modal State (Admin Only)
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    name: "",
    description: "",
  });

  // Delete Confirmation Modal State (Custom UI Modal)
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: "task", // 'task' | 'user' | 'project' | 'role'
    id: null,
    title: "",
    subtitle: "",
  });

  // Toast State
  const [toast, setToast] = useState(null);

  // Check if current user has Admin privileges
  const isAdmin = Boolean(
    currentUser?.is_admin || currentUser?.role === "Administrador",
  );

  // Derive project names list from project objects
  const projectList = projects.map((p) => p.name);

  const priorities = ["Baja", "Media", "Alta", "Urgente"];
  const statuses = ["Pendiente", "En Progreso", "Completada"];
  const availableRoles =
    roles.length > 0
      ? roles.map((r) => r.name)
      : [
          "Administrador",
          "Líder de Proyecto",
          "Desarrollador",
          "Diseñador UI/UX",
          "QA Engineer",
          "DevOps Engineer",
          "Miembro",
        ];

  // ----------------- DATE RANGE CALCULATION -----------------
  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (datePreset === "today") {
      return { from: todayStr, to: todayStr, overdueOnly: false };
    }
    if (datePreset === "week") {
      const startOfWeek = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        from: startOfWeek.toISOString().split("T")[0],
        to: endOfWeek.toISOString().split("T")[0],
        overdueOnly: false,
      };
    }
    if (datePreset === "month") {
      const year = today.getFullYear();
      const month = today.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];
      return { from: firstDay, to: lastDay, overdueOnly: false };
    }
    if (datePreset === "overdue") {
      return { from: "", to: todayStr, overdueOnly: true };
    }
    if (datePreset === "custom") {
      return { from: fromDate, to: toDate, overdueOnly: false };
    }
    return { from: "", to: "", overdueOnly: false };
  };

  // ----------------- DATA LOADING -----------------
  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const dateParams = getDateRange();

      const [taskList, statsData, usersData, rolesData, projectsData] =
        await Promise.all([
          TaskAPI.getTasks({
            search,
            status: statusFilter,
            project: currentProject,
            priority: priorityFilter,
            assignee: assigneeFilter !== "Todas" ? assigneeFilter : undefined,
            fromDate: dateParams.from,
            toDate: dateParams.overdueOnly ? "" : dateParams.to,
            user_name: currentUser.name,
            is_admin: isAdmin,
          }),
          TaskAPI.getStats({
            user_name: currentUser.name,
            is_admin: isAdmin,
          }),
          AuthAPI.getUsers().catch(() => []),
          RoleAPI.getRoles().catch(() => []),
          ProjectAPI.getProjects({
            user_name: currentUser.name,
            is_admin: isAdmin,
          }).catch(() => []),
        ]);

      let finalTasks = taskList || [];
      if (dateParams.overdueOnly) {
        const todayStr = new Date().toISOString().split("T")[0];
        finalTasks = finalTasks.filter(
          (t) =>
            t.status !== "Completada" && t.due_date && t.due_date < todayStr,
        );
      }

      setTasks(finalTasks);
      setRoles(rolesData || []);
      setProjects(projectsData || []);
      setStats(
        statsData || {
          total: 0,
          pendientes: 0,
          en_progreso: 0,
          completadas: 0,
          urgentes: 0,
          proyectos: [],
          project_counts: {},
        },
      );
      setUsers(usersData || []);
    } catch (err) {
      console.error(err);
      showToast("Error de conexión con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [
    currentUser,
    search,
    currentProject,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    datePreset,
    fromDate,
    toDate,
  ]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("Todas");
    setPriorityFilter("Todas");
    setAssigneeFilter("Todas");
    setDatePreset("all");
    setFromDate("");
    setToDate("");
  };

  // ----------------- AUTH HANDLERS -----------------
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Por favor ingresa tu correo y contraseña");
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError("");
      const data = await AuthAPI.login(loginEmail, loginPassword);
      setCurrentUser(data.user);
      showToast(`¡Bienvenido de nuevo, ${data.user.name}!`);
    } catch (err) {
      setAuthError(err.message || "Credenciales incorrectas");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast("Sesión cerrada correctamente");
  };

  // ----------------- USER MANAGEMENT (ADMIN) -----------------
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: "",
      email: "",
      password: "",
      role: "Desarrollador",
      is_admin: false,
    });
    setIsUserFormOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      is_admin: user.is_admin,
    });
    setIsUserFormOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email) {
      showToast("Nombre y correo son obligatorios", "error");
      return;
    }
    try {
      if (editingUser) {
        const payload = {
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role,
          is_admin:
            userFormData.is_admin || userFormData.role === "Administrador",
        };
        if (userFormData.password) {
          payload.password = userFormData.password;
        }
        await AuthAPI.updateUser(editingUser.id, payload);
        showToast("Usuario actualizado correctamente");
      } else {
        if (!userFormData.password) {
          showToast(
            "La contraseña inicial es requerida para nuevos usuarios",
            "error",
          );
          return;
        }
        await AuthAPI.createUser({
          name: userFormData.name,
          email: userFormData.email,
          password: userFormData.password,
          role: userFormData.role,
          is_admin:
            userFormData.is_admin || userFormData.role === "Administrador",
        });
        showToast("Nuevo usuario creado exitosamente");
      }
      setIsUserFormOpen(false);
      const updatedUsers = await AuthAPI.getUsers();
      setUsers(updatedUsers);
    } catch (err) {
      showToast(err.message || "Error al guardar usuario", "error");
    }
  };

  // ----------------- PROJECT ACTIONS & MEMBER MANAGEMENT -----------------
  const handleOpenCreateProject = () => {
    setNewProjectForm({
      name: "",
      description: "",
      members: currentUser?.name ? [currentUser.name] : [],
    });
    setIsNewProjectModalOpen(true);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const cleanName = newProjectForm.name.trim();
    if (!cleanName) {
      showToast("El nombre del proyecto es obligatorio", "error");
      return;
    }
    if (projectList.includes(cleanName)) {
      showToast("Ya existe un proyecto con ese nombre", "error");
      return;
    }

    try {
      const payload = {
        name: cleanName,
        description: newProjectForm.description?.trim() || null,
        owner_name: currentUser?.name || "Administrador Principal",
        members: Array.from(
          new Set([currentUser?.name, ...(newProjectForm.members || [])]),
        ).filter(Boolean),
      };
      await ProjectAPI.createProject(payload, currentUser?.name);
      setCurrentProject(cleanName);
      setIsNewProjectModalOpen(false);
      showToast(
        `Proyecto "${cleanName}" creado correctamente con sus miembros`,
      );
      loadData();
    } catch (err) {
      showToast(err.message || "Error al crear proyecto", "error");
    }
  };

  const handleOpenEditProject = (proj) => {
    const projObj =
      typeof proj === "object"
        ? proj
        : projects.find((p) => p.name === proj) || {
            name: proj,
            description: "",
            owner_name: currentUser?.name,
            members: [],
          };
    setEditingProject(projObj);
    setEditProjectForm({
      name: projObj.name,
      description: projObj.description || "",
      owner_name: projObj.owner_name || currentUser?.name,
      members: Array.isArray(projObj.members) ? [...projObj.members] : [],
    });
    setIsEditProjectModalOpen(true);
  };

  const handleSaveEditProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    const oldName = editingProject.name;
    const newName = editProjectForm.name.trim();
    if (!newName) {
      showToast("El nombre del proyecto no puede estar vacío", "error");
      return;
    }

    try {
      const payload = {
        name: newName,
        description: editProjectForm.description?.trim() || null,
        owner_name: editProjectForm.owner_name || editingProject.owner_name,
        members: editProjectForm.members || [],
      };
      await ProjectAPI.updateProject(
        oldName,
        payload,
        currentUser?.name,
        isAdmin,
      );

      if (currentProject === oldName) {
        setCurrentProject(newName);
      }
      setIsEditProjectModalOpen(false);
      showToast(`Proyecto "${newName}" y miembros actualizados`);
      loadData();
    } catch (err) {
      showToast(err.message || "Error al actualizar proyecto", "error");
    }
  };

  // ----------------- ROLE MANAGEMENT HANDLERS -----------------
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleFormData({ name: "", description: "" });
    setIsRoleFormOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || "",
    });
    setIsRoleFormOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    const nameClean = roleFormData.name.trim();
    if (!nameClean) {
      showToast("El nombre del rol es obligatorio", "error");
      return;
    }

    try {
      if (editingRole) {
        await RoleAPI.updateRole(editingRole.id, {
          name: nameClean,
          description: roleFormData.description,
        });
        showToast("Rol actualizado correctamente");
      } else {
        await RoleAPI.createRole({
          name: nameClean,
          description: roleFormData.description,
        });
        showToast("Nuevo rol creado exitosamente");
      }
      setIsRoleFormOpen(false);
      const [updatedRoles, updatedUsers] = await Promise.all([
        RoleAPI.getRoles().catch(() => []),
        AuthAPI.getUsers().catch(() => []),
      ]);
      setRoles(updatedRoles);
      setUsers(updatedUsers);
    } catch (err) {
      showToast(err.message || "Error al guardar el rol", "error");
    }
  };

  const openDeleteRoleModal = (role) => {
    if (role.name.toLowerCase() === "administrador") {
      showToast("No se puede eliminar el rol Administrador", "error");
      return;
    }
    setDeleteModal({
      isOpen: true,
      type: "role",
      id: role.id,
      title: role.name,
      subtitle: "Los usuarios asignados a este rol pasarán automáticamente al rol 'Miembro'.",
    });
  };

  // ----------------- DELETE MODAL HANDLERS (MODAL PERSONALIZADO) -----------------
  const openDeleteTaskModal = (task) => {
    setDeleteModal({
      isOpen: true,
      type: "task",
      id: task.id,
      title: task.title,
      subtitle: `Proyecto: ${task.project || "General"} • Responsable: ${task.assignee || "Sin asignar"}`,
    });
  };

  const openDeleteProjectModal = (projectName, taskCount = 0) => {
    setDeleteModal({
      isOpen: true,
      type: "project",
      id: projectName,
      title: projectName,
      subtitle: `Se eliminarán permanentemente el proyecto y todas sus tareas asociadas (${taskCount} tareas).`,
    });
  };

  const openDeleteUserModal = (user) => {
    if (user.id === currentUser.id) {
      showToast("No puedes eliminar tu propia cuenta de sesión", "error");
      return;
    }
    setDeleteModal({
      isOpen: true,
      type: "user",
      id: user.id,
      title: user.name,
      subtitle: `Rol: ${user.role} • Correo: ${user.email}`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      if (deleteModal.type === "task") {
        await TaskAPI.deleteTask(deleteModal.id);
        showToast("Tarea eliminada correctamente");
        if (isModalOpen && editingTask?.id === deleteModal.id) {
          setIsModalOpen(false);
        }
        loadData();
      } else if (deleteModal.type === "project") {
        await ProjectAPI.deleteProject(
          deleteModal.id,
          currentUser?.name,
          isAdmin,
        );
        if (currentProject === deleteModal.id) {
          setCurrentProject("Todos");
        }
        showToast(`Proyecto "${deleteModal.id}" eliminado correctamente`);
        loadData();
      } else if (deleteModal.type === "role") {
        await RoleAPI.deleteRole(deleteModal.id);
        showToast("Rol eliminado correctamente");
        const [updatedRoles, updatedUsers] = await Promise.all([
          RoleAPI.getRoles().catch(() => []),
          AuthAPI.getUsers().catch(() => []),
        ]);
        setRoles(updatedRoles);
        setUsers(updatedUsers);
      } else if (deleteModal.type === "user") {
        await AuthAPI.deleteUser(deleteModal.id);
        showToast("Usuario eliminado correctamente");
        const updatedUsers = await AuthAPI.getUsers();
        setUsers(updatedUsers);
      }
      setDeleteModal({
        isOpen: false,
        type: "task",
        id: null,
        title: "",
        subtitle: "",
      });
    } catch (err) {
      showToast(err.message || "Error al eliminar", "error");
    }
  };

  // ----------------- TASK ACTIONS -----------------
  const handleOpenCreate = (prefilledDate = null) => {
    setEditingTask(null);
    const today = new Date().toISOString().split("T")[0];
    const defaultAssigneeList =
      users.length > 0
        ? [users[0].name]
        : currentUser?.name
          ? [currentUser.name]
          : ["Administrador Principal"];

    const selectedProj =
      currentProject !== "Todos" && projectList.includes(currentProject)
        ? currentProject
        : projectList[0] || (isAdmin ? "Q3 Lanzamiento" : "General");

    setFormData({
      title: "",
      description: "",
      priority: "Media",
      status: "Pendiente",
      project: selectedProj,
      assignees: defaultAssigneeList,
      assignee: defaultAssigneeList.join(", "),
      start_date: today,
      due_date: prefilledDate || today,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    let parsedAssignees = [];
    if (Array.isArray(task.assignees) && task.assignees.length > 0) {
      parsedAssignees = task.assignees;
    } else if (task.assignee) {
      parsedAssignees = task.assignee
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (parsedAssignees.length === 0 && users.length > 0) {
      parsedAssignees = [users[0].name];
    }

    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "Media",
      status: task.status || "Pendiente",
      project: task.project || "General",
      assignees: parsedAssignees,
      assignee: parsedAssignees.join(", "),
      start_date: task.start_date || "",
      due_date: task.due_date || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("El título de la tarea es obligatorio", "error");
      return;
    }
    if (!formData.assignees || formData.assignees.length === 0) {
      showToast("Debes asignar al menos un responsable a la tarea", "error");
      return;
    }

    const payload = {
      ...formData,
      assignees: formData.assignees,
      assignee: formData.assignees.join(", "),
    };

    try {
      if (editingTask) {
        await TaskAPI.updateTask(editingTask.id, payload);
        showToast("Tarea actualizada correctamente");
      } else {
        await TaskAPI.createTask(payload);
        showToast("Tarea creada exitosamente");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast("Error al guardar la tarea", "error");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await TaskAPI.updateStatus(taskId, newStatus);
      showToast(`Tarea movida a "${newStatus}"`);
      loadData();
    } catch (err) {
      showToast("Error al actualizar el estado", "error");
    }
  };


  // ----------------- DRAG & DROP HANDLERS -----------------
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId =
      draggedTaskId || parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      await handleStatusChange(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  // ----------------- CALENDAR HELPERS -----------------
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const getCalendarDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
    ).getDate();
    const totalDaysPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: totalDaysPrevMonth - i, isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    return days;
  };

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "Urgente":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "Alta":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Media":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  // Color Theme by Status for Kanban Cards
  const getCardStatusTheme = (status) => {
    switch (status) {
      case "Pendiente":
        return {
          cardBg: "bg-[#1e1910]",
          border: "border-amber-500/50 hover:border-amber-400",
          accent: "text-amber-400",
          glow: "hover:shadow-[0_0_15px_rgba(251,191,36,0.25)]",
        };
      case "En Progreso":
        return {
          cardBg: "bg-[#0f1d2e]",
          border: "border-cyan-500/50 hover:border-cyan-400",
          accent: "text-cyan-400",
          glow: "hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]",
        };
      case "Completada":
        return {
          cardBg: "bg-[#0e241c]",
          border: "border-emerald-500/50 hover:border-emerald-400",
          accent: "text-emerald-400",
          glow: "hover:shadow-[0_0_15px_rgba(52,211,153,0.25)]",
        };
      default:
        return {
          cardBg: "bg-[#131b2e]",
          border: "border-[#2d3449]",
          accent: "text-slate-300",
          glow: "",
        };
    }
  };

  // Color Theme by Status for Desktop List Rows (Solid, Fixed, High-Contrast Colors)
  const getTableRowStatusStyle = (status) => {
    switch (status) {
      case "Pendiente":
        return {
          rowClass:
            "border-l-[6px] border-l-amber-400 bg-[#231a0b] hover:bg-[#2d210e] border-b border-[#3d2b0e]",
          dotColor: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
          titleColor: "text-amber-100 hover:text-amber-300 font-bold",
          projectBadge: "bg-[#171005] text-amber-200 border-amber-500/40",
          dateColor: "text-amber-200/80",
          statusTooltip: "Pendiente",
        };
      case "En Progreso":
        return {
          rowClass:
            "border-l-[6px] border-l-cyan-400 bg-[#0a233a] hover:bg-[#0e2f4e] border-b border-[#143c5e]",
          dotColor: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]",
          titleColor: "text-cyan-100 hover:text-cyan-300 font-bold",
          projectBadge: "bg-[#051524] text-cyan-200 border-cyan-500/40",
          dateColor: "text-cyan-200/80",
          statusTooltip: "En Progreso",
        };
      case "Completada":
        return {
          rowClass:
            "border-l-[6px] border-l-emerald-400 bg-[#09281a] hover:bg-[#0e3523] border-b border-[#154632]",
          dotColor: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
          titleColor:
            "text-emerald-200 line-through opacity-85 hover:text-emerald-300 font-semibold",
          projectBadge: "bg-[#041910] text-emerald-200 border-emerald-500/40",
          dateColor: "text-emerald-300/80",
          statusTooltip: "Completada",
        };
      default:
        return {
          rowClass:
            "border-l-[6px] border-l-slate-600 bg-[#0b1326] hover:bg-[#131b2e] border-b border-[#222a3d]",
          dotColor: "bg-slate-400",
          titleColor: "text-white hover:text-indigo-400 font-bold",
          projectBadge: "bg-[#060e20] text-indigo-300 border-[#222a3d]",
          dateColor: "text-slate-400",
          statusTooltip: "Sin estado",
        };
    }
  };

  // ----------------- MULTI-ASSIGNEE AVATARS & PARSING HELPERS -----------------
  const parseAssignees = (task) => {
    if (Array.isArray(task?.assignees) && task.assignees.length > 0) {
      return task.assignees;
    }
    if (task?.assignee) {
      return task.assignee
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const renderAssigneeAvatars = (task, maxShow = 3, showNames = true) => {
    const list = parseAssignees(task);
    if (list.length === 0) {
      return (
        <span className="text-slate-500 italic text-[11px]">Sin asignar</span>
      );
    }

    const visible = list.slice(0, maxShow);
    const extraCount = list.length - maxShow;

    const colors = [
      "bg-indigo-950 border-indigo-400/40 text-indigo-200",
      "bg-emerald-950 border-emerald-400/40 text-emerald-200",
      "bg-purple-950 border-purple-400/40 text-purple-200",
      "bg-amber-950 border-amber-400/40 text-amber-200",
      "bg-cyan-950 border-cyan-400/40 text-cyan-200",
      "bg-rose-950 border-rose-400/40 text-rose-200",
    ];

    return (
      <div className="flex items-center gap-1.5 min-w-0" title={list.join(", ")}>
        <div className="flex -space-x-1.5 items-center shrink-0">
          {visible.map((name, idx) => {
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shadow-sm ${colorClass}`}
                title={name}>
                {name.charAt(0).toUpperCase()}
              </div>
            );
          })}
          {extraCount > 0 && (
            <div
              className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[8px] font-bold text-slate-300 shadow-sm"
              title={`+${extraCount} más: ${list.slice(maxShow).join(", ")}`}>
              +{extraCount}
            </div>
          )}
        </div>
        {showNames && (
          <span className="text-[11px] text-slate-300 font-medium truncate max-w-[130px]">
            {list.length === 1 ? list[0] : `${list.length} asignados`}
          </span>
        )}
      </div>
    );
  };

  const hasActiveFilters =
    search ||
    statusFilter !== "Todas" ||
    priorityFilter !== "Todas" ||
    assigneeFilter !== "Todas" ||
    datePreset !== "all" ||
    fromDate ||
    toDate;

  // Selected Day Tasks for Agenda
  const selectedDayFormatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedCalendarDay).padStart(2, "0")}`;
  const dayTasks = tasks.filter(
    (t) =>
      t.due_date === selectedDayFormatted ||
      t.start_date === selectedDayFormatted,
  );
  const calendarDays = getCalendarDays();

  // =========================================================================
  // 1. PANTALLA DE LOGIN (SI NO HAY SESIÓN ACTIVA)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#060e20] flex items-center justify-center p-4 text-slate-100 font-sans relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#0b1326]/90 backdrop-blur-xl border border-[#222a3d] p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10 flex flex-col gap-6">
          {/* Logo & Header */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-1">
              <span className="material-symbols-outlined text-white text-3xl font-bold">
                task_alt
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              TAREAS TS
            </h1>
            <p className="text-xs text-slate-400">
              Gestor de Tareas de Equipo • Acceso al Sistema
            </p>
          </div>

          {/* Error alert */}
          {authError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">
                error
              </span>
              <span>{authError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-500 text-lg">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  placeholder="correo@ejemplo.com"
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#060e20] text-white text-sm pl-10 pr-3 py-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-500 text-lg">
                  lock
                </span>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="w-full bg-[#060e20] text-white text-sm pl-10 pr-3 py-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="mt-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {authLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar</span>
                  <span className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Admin initial account hint
          <div className="p-3 bg-[#131b2e] border border-[#222a3d] rounded-xl text-xs text-slate-400 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <span className="material-symbols-outlined text-[16px]">
                info
              </span>
              <span>Cuenta Administrador Inicial:</span>
            </div>
            <div className="flex flex-col gap-0.5 text-[11px] text-slate-300 pl-5">
              <span>
                <strong>Email:</strong> admin@taskpulse.io
              </span>
              <span>
                <strong>Password:</strong> admin123
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 pl-5">
              * El Administrador puede crear nuevos usuarios y asignar roles
              desde el panel.
            </span>
          </div> */}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. APLICACIÓN PRINCIPAL RESPONSIVA (CON SESIÓN ACTIVA)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#060e20] text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold transition-all animate-bounce ${
            toast.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-emerald-600 text-white"
          }`}>
          <span className="material-symbols-outlined text-lg">
            {toast.type === "error" ? "error" : "check_circle"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ----------------- TOP NAVBAR PRINCIPAL (LIMPIO Y ESPACIOSO) ----------------- */}
      <header className="sticky top-0 z-40 bg-[#0b1326]/95 backdrop-blur-md border-b border-[#222a3d] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Drawer Trigger + Brand Logo + Project Tag */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-200 focus:outline-none transition-colors"
            title="Menú de Proyectos">
            <span className="material-symbols-outlined text-xl">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>

          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCurrentProject("Todos")}>
            <span className="font-extrabold text-base tracking-tight text-white">
              Tareas TS
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#131b2e] border border-[#222a3d] text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold max-w-[140px] truncate">
              {currentProject === "Todos" ? "Panel General" : currentProject}
            </span>
          </div>
        </div>

        {/* Center: Desktop View Switcher (Hidden on Mobile, shown smoothly on Desktop) */}
        <div className="hidden md:flex items-center bg-[#060e20] p-1 rounded-xl border border-[#222a3d]">
          <button
            onClick={() => setViewMode("kanban")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "kanban"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}>
            <span className="material-symbols-outlined text-[16px]">
              view_kanban
            </span>
            <span>Tablero</span>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "list"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}>
            <span className="material-symbols-outlined text-[16px]">
              format_list_bulleted
            </span>
            <span>Lista</span>
          </button>

          <button
            onClick={() => setViewMode("calendar")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "calendar"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}>
            <span className="material-symbols-outlined text-[16px]">
              calendar_month
            </span>
            <span>Calendario</span>
          </button>
        </div>

        {/* Right: Actions, Admin Button & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Admin User Management Button */}
          {currentUser?.is_admin && (
            <button
              onClick={() => setIsUserManagementOpen(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-[#131b2e] hover:bg-[#222a3d] text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Gestión de Cuentas y Roles">
              <span className="material-symbols-outlined text-[16px]">
                manage_accounts
              </span>
              <span className="hidden sm:inline">Usuarios</span>
            </button>
          )}

          {/* New Task Button */}
          <button
            onClick={() => handleOpenCreate()}
            className="px-2.5 sm:px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">Nueva Tarea</span>
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 border-l border-[#222a3d]">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white border border-indigo-400/40 shrink-0"
                title={`${currentUser.name} (${currentUser.role})`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight max-w-[110px] truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-indigo-300 font-medium truncate">
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Cerrar sesión">
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ----------------- SUB-NAVBAR MÓVIL (CÓMODO Y FLUIDO PARA CELULARES) ----------------- */}
      <div className="md:hidden bg-[#0b1326] border-b border-[#222a3d] px-3 py-2 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-1 bg-[#060e20] p-1 rounded-xl border border-[#222a3d] w-full max-w-sm">
          <button
            onClick={() => setViewMode("kanban")}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "kanban"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}>
            <span className="material-symbols-outlined text-[16px]">
              view_kanban
            </span>
            <span>Tablero</span>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "list"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}>
            <span className="material-symbols-outlined text-[16px]">
              format_list_bulleted
            </span>
            <span>Lista</span>
          </button>

          <button
            onClick={() => setViewMode("calendar")}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "calendar"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}>
            <span className="material-symbols-outlined text-[16px]">
              calendar_month
            </span>
            <span>Calendario</span>
          </button>
        </div>
      </div>

      {/* ----------------- CONTENEDOR PRINCIPAL: SIDEBAR + VISTAS ----------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* BACKDROP FOR MOBILE SIDEBAR */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"></div>
        )}

        {/* ----------------- SIDEBAR DE PROYECTOS (RESPONSIVO) ----------------- */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-[#0b1326] border-r border-[#222a3d] p-4 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out ${
            isMobileMenuOpen
              ? "translate-x-0 top-[88px] md:top-14 h-[calc(100vh-5.5rem)] md:h-[calc(100vh-3.5rem)] shadow-2xl"
              : "-translate-x-full md:translate-x-0"
          }`}>
          <div className="flex flex-col gap-5 overflow-y-auto">
            {/* General Workspace Switcher */}
            <div>
              <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block px-2 mb-2">
                Espacios de Trabajo
              </span>
              <button
                onClick={() => {
                  setCurrentProject("Todos");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentProject === "Todos"
                    ? "bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-white border border-indigo-500/30 shadow-inner"
                    : "text-slate-300 hover:bg-[#131b2e]"
                }`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-indigo-400">
                    dashboard
                  </span>
                  <span>Panel General</span>
                </div>
                <span className="text-[11px] bg-[#171f33] px-2 py-0.5 rounded-full text-slate-300 font-semibold">
                  {stats.total}
                </span>
              </button>
            </div>

            {/* Project List */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                  {isAdmin ? "Todos los Proyectos" : "Mis Proyectos"}
                </span>
                <button
                  type="button"
                  onClick={handleOpenCreateProject}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-0.5 hover:bg-indigo-500/10 px-1.5 py-0.5 rounded-lg transition-colors"
                  title="Crear nuevo proyecto">
                  <span className="material-symbols-outlined text-[14px]">
                    add
                  </span>
                  <span>Nuevo</span>
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400 italic bg-[#060e20] rounded-xl border border-[#222a3d]">
                  {isAdmin
                    ? "No hay proyectos creados."
                    : "No tienes proyectos asignados actualmente."}
                </div>
              ) : (
                projects.map((proj) => {
                  const isSelected = currentProject === proj.name;
                  const projCount =
                    stats.project_counts?.[proj.name] ??
                    (proj.task_count ?? 0);
                  const isOwner = proj.owner_name === currentUser?.name;
                  const canManage = isAdmin || isOwner;

                  return (
                    <div
                      key={proj.id || proj.name}
                      className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20"
                          : "text-slate-300 hover:bg-[#131b2e]"
                      }`}>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentProject(proj.name);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-2 truncate flex-1 text-left min-w-0 pr-1">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-indigo-400"}`}></span>
                        <span className="truncate">{proj.name}</span>
                        {isOwner && (
                          <span
                            className="inline-flex items-center text-[10px] text-amber-300 shrink-0"
                            title="Eres el dueño de este proyecto">
                            👑
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-[#171f33] text-slate-400"
                          }`}>
                          {projCount}
                        </span>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditProject(proj);
                              }}
                              className={`p-1 rounded-lg transition-all ${
                                isSelected
                                  ? "text-white/80 hover:text-white hover:bg-white/20"
                                  : "text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 md:opacity-0 md:group-hover:opacity-100"
                              }`}
                              title={
                                isOwner
                                  ? `Gestionar personas y miembros de "${proj.name}"`
                                  : `Modificar proyecto "${proj.name}" (Admin)`
                              }>
                              <span className="material-symbols-outlined text-[15px]">
                                group_add
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteProjectModal(proj.name, projCount);
                              }}
                              className={`p-1 rounded-lg transition-all ${
                                isSelected
                                  ? "text-white/80 hover:text-white hover:bg-white/20"
                                  : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 md:opacity-0 md:group-hover:opacity-100"
                              }`}
                              title={`Eliminar proyecto "${proj.name}"`}>
                              <span className="material-symbols-outlined text-[15px]">
                                delete
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Metrics in Sidebar */}
            <div className="p-3.5 bg-[#060e20] border border-[#222a3d] rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                Resumen Rápido
              </span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#131b2e] p-2 rounded-xl border border-[#222a3d]">
                  <span className="block text-xs font-bold text-amber-400">
                    {stats.pendientes}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Pendientes
                  </span>
                </div>
                <div className="bg-[#131b2e] p-2 rounded-xl border border-[#222a3d]">
                  <span className="block text-xs font-bold text-cyan-400">
                    {stats.en_progreso}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">
                    En Curso
                  </span>
                </div>
                <div className="bg-[#131b2e] p-2 rounded-xl border border-[#222a3d]">
                  <span className="block text-xs font-bold text-emerald-400">
                    {stats.completadas}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Completas
                  </span>
                </div>
                <div className="bg-[#131b2e] p-2 rounded-xl border border-[#222a3d]">
                  <span className="block text-xs font-bold text-rose-400">
                    {stats.urgentes}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Urgentes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User info & mobile admin button at bottom of sidebar */}
          <div className="pt-4 border-t border-[#222a3d] flex flex-col gap-2">
            {currentUser?.is_admin && (
              <button
                onClick={() => {
                  setIsUserManagementOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#131b2e] hover:bg-[#222a3d] text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all">
                <span className="material-symbols-outlined text-[16px]">
                  manage_accounts
                </span>
                <span>Gestión de Usuarios</span>
              </button>
            )}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="truncate">{currentUser.name}</span>
              <span className="text-[10px] text-indigo-400 font-bold">
                {currentUser.role}
              </span>
            </div>
          </div>
        </aside>

        {/* ----------------- CONTENIDO PRINCIPAL: VISTAS Y FILTROS ----------------- */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-28 sm:pb-8 flex flex-col gap-4 sm:gap-6">
          {/* ----------------- BARRA SUPERIOR DE FILTROS RESPONSIVA ----------------- */}
          <div className="bg-[#0b1326] p-3 sm:p-4 rounded-2xl border border-[#222a3d] flex flex-col gap-3 shadow-lg">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por título, descripción, proyecto o responsable..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#060e20] text-white text-xs pl-9 pr-3 py-2 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors"
                />
              </div>

              {/* Filter Dropdowns Grid */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-[#060e20] px-2.5 py-1 rounded-xl border border-[#2d3449]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Estado:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 py-1 pl-1 pr-2 focus:outline-none cursor-pointer font-semibold">
                    <option value="Todas" className="bg-[#131b2e]">
                      Todas
                    </option>
                    <option value="Pendiente" className="bg-[#131b2e]">
                      Pendiente
                    </option>
                    <option value="En Progreso" className="bg-[#131b2e]">
                      En Progreso
                    </option>
                    <option value="Completada" className="bg-[#131b2e]">
                      Completada
                    </option>
                  </select>
                </div>

                {/* Date Preset Filter */}
                <div className="flex items-center gap-1 bg-[#060e20] px-2.5 py-1 rounded-xl border border-[#2d3449]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Fechas:
                  </span>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 py-1 pl-1 pr-2 focus:outline-none cursor-pointer font-semibold">
                    <option value="all" className="bg-[#131b2e]">
                      Todas las fechas
                    </option>
                    <option value="today" className="bg-[#131b2e]">
                      Hoy
                    </option>
                    <option value="week" className="bg-[#131b2e]">
                      Esta semana
                    </option>
                    <option value="month" className="bg-[#131b2e]">
                      Este mes
                    </option>
                    <option value="overdue" className="bg-[#131b2e]">
                      ⚠️ Vencidas
                    </option>
                    <option value="custom" className="bg-[#131b2e]">
                      Rango personalizado
                    </option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1 bg-[#060e20] px-2.5 py-1 rounded-xl border border-[#2d3449]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Prioridad:
                  </span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 py-1 pl-1 pr-2 focus:outline-none cursor-pointer font-semibold">
                    <option value="Todas" className="bg-[#131b2e]">
                      Todas
                    </option>
                    {priorities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee Filter */}
                <div className="flex items-center gap-1 bg-[#060e20] px-2.5 py-1 rounded-xl border border-[#2d3449]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Responsable:
                  </span>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 py-1 pl-1 pr-2 focus:outline-none cursor-pointer font-semibold max-w-[130px] truncate">
                    <option value="Todas" className="bg-[#131b2e]">
                      Todos
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name} className="bg-[#131b2e]">
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-2.5 py-1.5 bg-[#222a3d] hover:bg-[#2d3449] text-xs font-semibold text-slate-300 rounded-xl transition-colors flex items-center gap-1"
                    title="Limpiar todos los filtros">
                    <span className="material-symbols-outlined text-[14px]">
                      filter_alt_off
                    </span>
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Range Picker (shown when 'custom' is selected) */}
            {datePreset === "custom" && (
              <div className="flex items-center gap-3 pt-2 border-t border-[#222a3d] flex-wrap animate-in fade-in duration-150">
                <span className="text-xs font-bold text-indigo-300">
                  Rango de fechas:
                </span>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Desde:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[#060e20] text-white text-xs px-2.5 py-1 rounded-lg border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Hasta:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[#060e20] text-white text-xs px-2.5 py-1 rounded-lg border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ----------------- 1. VISTA TABLERO KANBAN (OVERFLOW Y SCROLL INTERNO POR COLUMNA) ----------------- */}
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-sm flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
              <span>Cargando tareas...</span>
            </div>
          ) : viewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch h-[calc(100vh-230px)] min-h-[480px] max-h-[calc(100vh-230px)]">
              {statuses.map((colStatus) => {
                const colTasks = tasks.filter((t) => t.status === colStatus);
                const isDragTarget = dragOverColumn === colStatus;

                return (
                  <div
                    key={colStatus}
                    onDragOver={(e) => handleDragOver(e, colStatus)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, colStatus)}
                    className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col h-full max-h-full overflow-hidden transition-all ${
                      isDragTarget
                        ? "bg-[#17233d] border-indigo-400 ring-2 ring-indigo-500/50 scale-[1.01]"
                        : "bg-[#0b1326] border-[#222a3d]"
                    }`}>
                    {/* Column Header (Fixed) */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#222a3d] mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            colStatus === "Pendiente"
                              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                              : colStatus === "En Progreso"
                                ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                          }`}></span>
                        <span className="font-bold text-sm text-white">
                          {colStatus}
                        </span>
                      </div>
                      <span className="text-xs bg-[#171f33] text-slate-200 font-bold px-2 py-0.5 rounded-full border border-[#2d3449]">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Task Cards Container (Internal Smooth Overflow Scroll) */}
                    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1.5 scroll-smooth">
                      {colTasks.length === 0 ? (
                        <div
                          style={{
                            minHeight: "195px",
                            maxHeight: "195px",
                            height: "195px",
                          }}
                          className="w-full shrink-0 h-[195px] min-h-[195px] max-h-[195px] text-center text-xs text-slate-500 italic border-2 border-dashed border-[#1e293b] rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-slate-600 text-2xl">
                            drag_indicator
                          </span>
                          <span>Arrastra tareas aquí</span>
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const theme = getCardStatusTheme(task.status);
                          const isBeingDragged = draggedTaskId === task.id;

                          return (
                            /* Uniform Rigid Height Task Card (195px) with shrink-0 and explicit inline styles */
                            <div
                              key={task.id}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              style={{
                                minHeight: "195px",
                                maxHeight: "195px",
                                height: "195px",
                              }}
                              className={`w-full shrink-0 h-[195px] min-h-[195px] max-h-[195px] p-3.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-sm flex flex-col justify-between group ${
                                theme.cardBg
                              } ${theme.border} ${theme.glow} ${
                                isBeingDragged
                                  ? "opacity-40 scale-95 border-dashed border-indigo-400"
                                  : "opacity-100"
                              }`}>
                              {/* 1. Header (Fixed 42px height): Title (2-lines max) & Priority Badge */}
                              <div className="h-[42px] min-h-[42px] max-h-[42px] flex items-start justify-between gap-2 overflow-hidden">
                                <h4
                                  onClick={() => handleOpenEdit(task)}
                                  className="text-xs sm:text-sm font-bold text-white hover:text-indigo-300 transition-colors leading-snug cursor-pointer line-clamp-2"
                                  title={task.title}>
                                  {task.title}
                                </h4>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getPriorityBadge(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>

                              {/* 2. Body (Fixed 36px height): Description */}
                              <div className="h-[36px] min-h-[36px] max-h-[36px] overflow-hidden">
                                {task.description ? (
                                  <p className="text-xs text-slate-300/80 line-clamp-2 leading-relaxed">
                                    {task.description}
                                  </p>
                                ) : (
                                  <span className="text-[11px] text-slate-500 italic block">
                                    Sin descripción adicional
                                  </span>
                                )}
                              </div>

                              {/* 3. Metadata Tags (Fixed 26px height): Project & Dates */}
                              <div className="h-[26px] min-h-[26px] max-h-[26px] flex items-center gap-1.5 text-[10px] pt-1.5 border-t border-[#222a3d]/60 overflow-hidden truncate">
                                <span className="px-1.5 py-0.5 rounded bg-[#060e20] text-indigo-300 border border-[#222a3d] font-semibold truncate max-w-[105px]">
                                  📁 {task.project}
                                </span>

                                {task.due_date && (
                                  <span className="text-amber-300/90 flex items-center gap-0.5 shrink-0">
                                    <span className="material-symbols-outlined text-[12px]">
                                      schedule
                                    </span>
                                    {task.due_date}
                                  </span>
                                )}

                                {task.completed_at && (
                                  <span className="text-emerald-400 font-semibold truncate shrink-0">
                                    ✓ {task.completed_at}
                                  </span>
                                )}
                              </div>

                              {/* 4. Footer (Fixed 26px height): Multi-Assignees & Action Shortcuts */}
                              <div className="h-[26px] min-h-[26px] max-h-[26px] flex items-center justify-between text-xs text-slate-400 pt-1">
                                {renderAssigneeAvatars(task, 2, true)}

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleOpenEdit(task)}
                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                    title="Editar tarea">
                                    <span className="material-symbols-outlined text-[16px]">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => openDeleteTaskModal(task)}
                                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Eliminar tarea">
                                    <span className="material-symbols-outlined text-[16px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === "list" ? (
            /* ----------------- 2. VISTA DE LISTA (COLORES FIJOS SÓLIDOS POR ESTADO SIN COLUMNA ESTADO) ----------------- */
            <div className="bg-[#0b1326] rounded-2xl border border-[#222a3d] overflow-hidden shadow-lg flex flex-col">
              {/* Table Status Bar & Legend */}
              <div className="px-4 sm:px-5 py-3 bg-[#131b2e] border-b border-[#222a3d] flex items-center justify-between text-xs flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-400 text-[18px]">
                      table_rows
                    </span>
                    <span>
                      Mostrando {tasks.length}{" "}
                      {tasks.length === 1 ? "tarea" : "tareas"}
                    </span>
                  </span>

                  {/* Status Color Indicators Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-bold pl-2 border-l border-[#2d3449]">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#231a0b] text-amber-300 border border-amber-500/40">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"></span>
                      <span>Pendiente</span>
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#0a233a] text-cyan-300 border border-cyan-500/40">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                      <span>En Progreso</span>
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#09281a] text-emerald-300 border border-emerald-500/40">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                      <span>Completada</span>
                    </span>
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-indigo-400 hover:underline text-xs font-semibold">
                    Restablecer Filtros
                  </button>
                )}
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-16 text-slate-500 italic flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-slate-600 text-[36px]">
                    filter_list_off
                  </span>
                  <span>
                    No se encontraron tareas con los filtros seleccionados.
                  </span>
                  <button
                    onClick={resetFilters}
                    className="text-indigo-400 hover:underline text-xs font-bold mt-1">
                    Limpiar Filtros
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. VISTA MÓVIL / RESPONSIVE (< md): Lista de tarjetas verticales completa sin recortes */}
                  <div className="md:hidden flex flex-col divide-y divide-[#222a3d]/80">
                    {tasks.map((task) => {
                      const statusStyle = getTableRowStatusStyle(task.status);

                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 flex flex-col gap-2.5 transition-all ${statusStyle.rowClass}`}>
                          {/* Header: Title & Priority */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span
                                className={`w-3 h-3 rounded-full shrink-0 ${statusStyle.dotColor}`}
                                title={`Estado: ${task.status}`}></span>
                              <h4
                                onClick={() => handleOpenEdit(task)}
                                className={`text-xs sm:text-sm font-bold cursor-pointer transition-colors leading-snug break-words ${statusStyle.titleColor}`}>
                                {task.title}
                              </h4>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getPriorityBadge(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>

                          {/* Metadata: Project & Dates */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1 border-t border-black/20">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] border ${statusStyle.projectBadge}`}>
                              📁 {task.project || "General"}
                            </span>

                            {task.due_date && (
                              <span
                                className={`flex items-center gap-0.5 text-[10px] font-semibold ${statusStyle.dateColor}`}>
                                <span className="material-symbols-outlined text-[12px]">
                                  schedule
                                </span>
                                {task.due_date}
                              </span>
                            )}

                            {task.completed_at && (
                              <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">
                                  check_circle
                                </span>
                                {task.completed_at}
                              </span>
                            )}
                          </div>

                          {/* Footer: Multi-Assignees & Action Buttons */}
                          <div className="flex items-center justify-between text-xs text-slate-300 pt-1 flex-wrap gap-2">
                            {renderAssigneeAvatars(task, 3, true)}

                            <div className="flex items-center gap-1 shrink-0">
                              {task.status !== "Completada" && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(task.id, "Completada")
                                  }
                                  className="p-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors border border-emerald-500/40 flex items-center gap-1 text-[11px] font-bold"
                                  title="Marcar como Completada">
                                  <span className="material-symbols-outlined text-[14px]">
                                    done
                                  </span>
                                  <span>Completar</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(task)}
                                className="p-1.5 text-slate-300 hover:text-white transition-colors"
                                title="Editar tarea">
                                <span className="material-symbols-outlined text-[16px]">
                                  edit
                                </span>
                              </button>
                              <button
                                onClick={() => openDeleteTaskModal(task)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Eliminar tarea">
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. VISTA ESCRITORIO (>= md): Tabla completa con scroll vertical y horizontal */}
                  <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] scroll-smooth">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      {/* Header: Sticky on scroll */}
                      <thead className="bg-[#060e20] text-slate-300 text-xs uppercase font-bold border-b border-[#222a3d] sticky top-0 z-10">
                        <tr>
                          <th className="py-3.5 px-4">Tarea / Título</th>
                          <th className="py-3.5 px-4">Proyecto</th>
                          <th className="py-3.5 px-4">Responsables</th>
                          <th className="py-3.5 px-4">Prioridad</th>
                          <th className="py-3.5 px-4">Fecha Inicio</th>
                          <th className="py-3.5 px-4">Fecha Límite</th>
                          <th className="py-3.5 px-4">Fecha Completada</th>
                          <th className="py-3.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => {
                          const statusStyle = getTableRowStatusStyle(
                            task.status,
                          );

                          return (
                            <tr
                              key={task.id}
                              className={`transition-all ${statusStyle.rowClass}`}>
                              {/* Title with Solid Status Indicator Dot */}
                              <td className="py-3.5 px-4 max-w-[280px] truncate">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`w-3 h-3 rounded-full shrink-0 ${statusStyle.dotColor}`}
                                    title={`Estado: ${task.status}`}></span>
                                  <span
                                    onClick={() => handleOpenEdit(task)}
                                    className={`cursor-pointer truncate transition-colors ${statusStyle.titleColor}`}
                                    title={task.title}>
                                    {task.title}
                                  </span>
                                </div>
                              </td>

                              {/* Project */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${statusStyle.projectBadge}`}>
                                  {task.project || "General"}
                                </span>
                              </td>

                              {/* Multi-Assignees */}
                              <td className="py-3.5 px-4 text-slate-200 font-medium max-w-[220px]">
                                {renderAssigneeAvatars(task, 3, true)}
                              </td>

                              {/* Priority */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </td>

                              {/* Start Date */}
                              <td
                                className={`py-3.5 px-4 text-xs font-semibold ${statusStyle.dateColor}`}>
                                {task.start_date || "—"}
                              </td>

                              {/* Due Date */}
                              <td
                                className={`py-3.5 px-4 text-xs font-semibold ${statusStyle.dateColor}`}>
                                {task.due_date ? (
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px] opacity-70">
                                      event
                                    </span>
                                    {task.due_date}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>

                              {/* Completed At Date */}
                              <td className="py-3.5 px-4 text-xs font-bold">
                                {task.completed_at ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[15px]">
                                      check_circle
                                    </span>
                                    {task.completed_at}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-normal">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Action Buttons & Quick Status Switcher */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Quick complete button if not completed */}
                                  {task.status !== "Completada" && (
                                    <button
                                      onClick={() =>
                                        handleStatusChange(
                                          task.id,
                                          "Completada",
                                        )
                                      }
                                      className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors border border-emerald-500/40"
                                      title="Marcar como Completada">
                                      <span className="material-symbols-outlined text-[16px]">
                                        done
                                      </span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEdit(task)}
                                    className="p-1 text-slate-300 hover:text-white transition-colors"
                                    title="Editar tarea">
                                    <span className="material-symbols-outlined text-[16px]">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => openDeleteTaskModal(task)}
                                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Eliminar tarea">
                                    <span className="material-symbols-outlined text-[16px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ----------------- 3. VISTA DE CALENDARIO INTERACTIVO ----------------- */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
              {/* Calendar Grid (8 cols) */}
              <div className="lg:col-span-8 bg-[#0b1326] rounded-2xl border border-[#222a3d] p-4 sm:p-5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCalendarDate(
                          new Date(currentYear, currentMonth - 1, 1),
                        )
                      }
                      className="p-1.5 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">
                        chevron_left
                      </span>
                    </button>
                    <h3 className="text-sm sm:text-base font-bold text-white min-w-[140px] text-center">
                      {monthNames[currentMonth]} {currentYear}
                    </h3>
                    <button
                      onClick={() =>
                        setCalendarDate(
                          new Date(currentYear, currentMonth + 1, 1),
                        )
                      }
                      className="p-1.5 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">
                        chevron_right
                      </span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const now = new Date();
                      setCalendarDate(now);
                      setSelectedCalendarDay(now.getDate());
                    }}
                    className="px-3 py-1 bg-[#131b2e] hover:bg-[#222a3d] text-xs font-semibold text-slate-300 rounded-xl border border-[#222a3d]">
                    Hoy
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                    (d) => (
                      <div key={d} className="py-1">
                        {d}
                      </div>
                    ),
                  )}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((item, index) => {
                    if (!item.isCurrentMonth) {
                      return (
                        <div
                          key={index}
                          className="min-h-[75px] sm:min-h-[90px] rounded-xl bg-[#060e20]/40 opacity-20"></div>
                      );
                    }

                    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
                    const dayItemTasks = tasks.filter(
                      (t) => t.due_date === dayStr || t.start_date === dayStr,
                    );
                    const isSelected = selectedCalendarDay === item.day;
                    const isToday =
                      new Date().toISOString().split("T")[0] === dayStr;

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedCalendarDay(item.day)}
                        className={`min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#17233d] border-indigo-400 ring-2 ring-indigo-500/40"
                            : "bg-[#060e20] border-[#222a3d] hover:border-slate-500"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                              isToday
                                ? "bg-indigo-600 text-white"
                                : "text-slate-300"
                            }`}>
                            {item.day}
                          </span>
                          {dayItemTasks.length > 0 && (
                            <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1 rounded-full font-semibold">
                              {dayItemTasks.length}
                            </span>
                          )}
                        </div>

                        {/* Chips */}
                        <div className="flex flex-col gap-1 overflow-hidden mt-1">
                          {dayItemTasks.slice(0, 2).map((t) => (
                            <span
                              key={t.id}
                              className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                                t.status === "Completada"
                                  ? "bg-emerald-950 text-emerald-300"
                                  : t.status === "En Progreso"
                                    ? "bg-cyan-950 text-cyan-300"
                                    : "bg-amber-950 text-amber-300"
                              }`}>
                              {t.title}
                            </span>
                          ))}
                          {dayItemTasks.length > 2 && (
                            <span className="text-[8px] text-slate-400">
                              +{dayItemTasks.length - 2} más
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Agenda Drawer (4 cols) */}
              <div className="lg:col-span-4 bg-[#0b1326] rounded-2xl border border-[#222a3d] p-4 sm:p-5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Agenda: {selectedCalendarDay} de{" "}
                      {monthNames[currentMonth]}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {dayTasks.length}{" "}
                      {dayTasks.length === 1
                        ? "tarea programada"
                        : "tareas programadas"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenCreate(selectedDayFormatted)}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                    title="Añadir tarea en esta fecha">
                    <span className="material-symbols-outlined text-[16px]">
                      add
                    </span>
                  </button>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px]">
                  {dayTasks.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-500 italic">
                      No hay tareas programadas para este día.
                    </div>
                  ) : (
                    dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-[#060e20] border border-[#222a3d] rounded-xl flex flex-col gap-2 hover:border-slate-500 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            onClick={() => handleOpenEdit(task)}
                            className="text-xs font-bold text-white hover:text-indigo-300 cursor-pointer">
                            {task.title}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          {renderAssigneeAvatars(task, 2, true)}
                          <span className="text-indigo-400 font-semibold">
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL: CREAR / EDITAR TAREA (OPTIMIZADO RESPONSIVO)
      ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1326] border border-[#222a3d] rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed) */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222a3d] bg-[#0b1326] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <span className="material-symbols-outlined text-[20px]">
                    {editingTask ? "edit_note" : "add_task"}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {editingTask ? "Editar Tarea" : "Crear Nueva Tarea"}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    {editingTask
                      ? "Modifica los datos y requerimientos"
                      : "Completa los campos para registrar la tarea"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-[#131b2e] transition-colors"
                title="Cerrar modal">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body (Scrollable Form Fields) */}
            <form
              id="taskModalForm"
              onSubmit={handleSaveTask}
              className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3.5 text-xs">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">
                  Título de la Tarea *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Actualizar diseño de la página de inicio"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">Descripción</label>
                <textarea
                  rows="3"
                  placeholder="Detalles sobre lo que debe realizarse..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors resize-none"></textarea>
              </div>

              {/* Project Selection */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">Proyecto</label>
                <select
                  value={formData.project}
                  onChange={(e) =>
                    setFormData({ ...formData, project: e.target.value })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 cursor-pointer">
                  {projectList.length > 0 ? (
                    projectList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))
                  ) : (
                    <option value={formData.project || "General"}>
                      {formData.project || "General"}
                    </option>
                  )}
                </select>
              </div>

              {/* Multiple Assignees Selection */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span>Responsables Asignados</span>
                    <span className="text-[11px] font-normal text-indigo-400">
                      ({formData.assignees?.length || 0} seleccionados)
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allNames = users.length > 0 ? users.map((u) => u.name) : ["Administrador Principal"];
                        setFormData({
                          ...formData,
                          assignees: allNames,
                          assignee: allNames.join(", "),
                        });
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                      Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          assignees: [],
                          assignee: "",
                        });
                      }}
                      className="text-slate-400 hover:text-slate-300 hover:underline">
                      Desmarcar
                    </button>
                  </div>
                </div>

                {/* Selected Assignee Chips */}
                {formData.assignees && formData.assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#060e20] border border-[#2d3449] rounded-xl max-h-[72px] overflow-y-auto">
                    {formData.assignees.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950 border border-indigo-500/40 text-indigo-200 text-xs font-semibold animate-in fade-in">
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.assignees.filter((n) => n !== name);
                            setFormData({
                              ...formData,
                              assignees: updated,
                              assignee: updated.join(", "),
                            });
                          }}
                          className="hover:text-rose-400 transition-colors ml-0.5 font-bold"
                          title={`Quitar a ${name}`}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 bg-[#060e20] border border-amber-500/30 rounded-xl text-amber-300/80 text-[11px] italic">
                    ⚠️ Selecciona al menos un responsable del equipo abajo.
                  </div>
                )}

                {/* Member Checklist */}
                <div className="max-h-[140px] overflow-y-auto border border-[#222a3d] rounded-xl bg-[#060e20] p-1.5 flex flex-col gap-1">
                  {users.length > 0 ? (
                    users.map((u) => {
                      const isChecked = formData.assignees?.includes(u.name);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
                            isChecked
                              ? "bg-indigo-950/60 border border-indigo-500/30 text-white font-medium"
                              : "hover:bg-[#131b2e] text-slate-300 border border-transparent"
                          }`}>
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked || false}
                              onChange={() => {
                                const current = formData.assignees || [];
                                const updated = isChecked
                                  ? current.filter((n) => n !== u.name)
                                  : [...current, u.name];
                                setFormData({
                                  ...formData,
                                  assignees: updated,
                                  assignee: updated.join(", "),
                                });
                              }}
                              className="rounded border-[#2d3449] bg-[#0b1326] text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="w-5 h-5 rounded-full bg-indigo-900 border border-indigo-400/40 flex items-center justify-center text-[10px] font-bold text-indigo-200 shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <span className="truncate">{u.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-[#131b2e] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2">
                            {u.role}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 text-center py-2 italic text-[11px]">
                      No hay usuarios registrados
                    </div>
                  )}
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-300">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 cursor-pointer">
                    {priorities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-300">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 cursor-pointer">
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-300">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-300">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer (Fixed at bottom) */}
            <div className="px-5 py-3.5 border-t border-[#222a3d] bg-[#070e1e] flex items-center justify-between gap-2 shrink-0">
              <div>
                {editingTask && (
                  <button
                    type="button"
                    onClick={() => openDeleteTaskModal(editingTask)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                    title="Eliminar esta tarea">
                    <span className="material-symbols-outlined text-[15px]">
                      delete
                    </span>
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 font-semibold text-xs transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="taskModalForm"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95">
                  {editingTask ? "Guardar Cambios" : "Crear Tarea"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: GESTIÓN DE USUARIOS (SOLO ADMIN)
      ========================================================================= */}
      {isUserManagementOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1326] border border-[#222a3d] rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">
                  manage_accounts
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Gestión de Usuarios y Roles
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Administra el equipo, crea cuentas y asigna permisos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUserManagementOpen(false)}
                className="text-slate-400 hover:text-white p-1">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Navigation Tabs inside Admin Modal */}
            <div className="flex items-center gap-2 border-b border-[#222a3d] pb-2">
              <button
                type="button"
                onClick={() => setAdminTab("users")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminTab === "users"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white bg-[#131b2e]"
                }`}>
                <span className="material-symbols-outlined text-[16px]">group</span>
                <span>Usuarios ({users.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("roles")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminTab === "roles"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white bg-[#131b2e]"
                }`}>
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>Roles del Equipo ({roles.length})</span>
              </button>
            </div>

            {/* TAB: USUARIOS */}
            {adminTab === "users" && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">
                    Total de Usuarios: <strong>{users.length}</strong>
                  </span>
                  <button
                    onClick={handleOpenCreateUser}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-amber-600/20">
                    <span className="material-symbols-outlined text-[16px]">
                      person_add
                    </span>
                    <span>Nuevo Usuario</span>
                  </button>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto border border-[#222a3d] rounded-2xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-[#060e20] text-slate-400 uppercase font-semibold border-b border-[#222a3d]">
                      <tr>
                        <th className="py-2.5 px-3">Usuario</th>
                        <th className="py-2.5 px-3">Correo</th>
                        <th className="py-2.5 px-3">Rol Asignado</th>
                        <th className="py-2.5 px-3">Admin</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#171f33]">
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-[#131b2e] transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center font-bold text-indigo-200">
                              {u.name.charAt(0)}
                            </div>
                            <span>{u.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{u.email}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-[#060e20] border border-[#222a3d] text-indigo-300 font-semibold">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {u.is_admin ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                Sí
                              </span>
                            ) : (
                              <span className="text-slate-500">No</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1 text-slate-400 hover:text-white"
                                title="Editar usuario o rol">
                                <span className="material-symbols-outlined text-[16px]">
                                  edit
                                </span>
                              </button>
                              {u.id !== currentUser.id && (
                                <button
                                  onClick={() => openDeleteUserModal(u)}
                                  className="p-1 text-slate-400 hover:text-rose-400"
                                  title="Eliminar usuario">
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* TAB: ROLES */}
            {adminTab === "roles" && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">
                    Total de Roles: <strong>{roles.length}</strong>
                  </span>
                  <button
                    onClick={handleOpenCreateRole}
                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/20">
                    <span className="material-symbols-outlined text-[16px]">
                      add_circle
                    </span>
                    <span>Nuevo Rol</span>
                  </button>
                </div>

                {/* Roles Table */}
                <div className="overflow-x-auto border border-[#222a3d] rounded-2xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-[#060e20] text-slate-400 uppercase font-semibold border-b border-[#222a3d]">
                      <tr>
                        <th className="py-2.5 px-3">Nombre del Rol</th>
                        <th className="py-2.5 px-3">Descripción</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#171f33]">
                      {roles.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-[#131b2e] transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-400 text-[18px]">
                              badge
                            </span>
                            <span className="font-bold">{r.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                            {r.description || "Sin descripción"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditRole(r)}
                                className="p-1 text-slate-400 hover:text-white"
                                title="Editar nombre / descripción del rol">
                                <span className="material-symbols-outlined text-[16px]">
                                  edit
                                </span>
                              </button>
                              {r.name.toLowerCase() !== "administrador" && (
                                <button
                                  onClick={() => openDeleteRoleModal(r)}
                                  className="p-1 text-slate-400 hover:text-rose-400"
                                  title="Eliminar rol">
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREAR / EDITAR USUARIO (SOLO ADMIN)
      ========================================================================= */}
      {isUserFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1326] border border-[#222a3d] rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">
                  {editingUser ? "edit" : "person_add"}
                </span>
                <h3 className="text-base font-bold text-white">
                  {editingUser ? "Editar Usuario / Rol" : "Crear Nuevo Usuario"}
                </h3>
              </div>
              <button
                onClick={() => setIsUserFormOpen(false)}
                className="text-slate-400 hover:text-white p-1">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form
              onSubmit={handleSaveUser}
              className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Sofía Ramos"
                  value={userFormData.name}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, name: e.target.value })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ej. sofia@taskpulse.io"
                  value={userFormData.email}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, email: e.target.value })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">
                  {editingUser
                    ? "Nueva Contraseña (dejar en blanco para conservar actual)"
                    : "Contraseña Inicial *"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? "••••••••" : "Mínimo 6 caracteres"}
                  value={userFormData.password}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      password: e.target.value,
                    })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">
                  Rol en el Equipo
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    setUserFormData({
                      ...userFormData,
                      role: selectedRole,
                      is_admin:
                        selectedRole === "Administrador"
                          ? true
                          : userFormData.is_admin,
                    });
                  }}
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500">
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAdminCheckbox"
                  checked={
                    userFormData.is_admin ||
                    userFormData.role === "Administrador"
                  }
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      is_admin: e.target.checked,
                    })
                  }
                  className="rounded border-[#2d3449] bg-[#060e20] text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="isAdminCheckbox"
                  className="font-semibold text-slate-300 cursor-pointer">
                  Otorgar permisos de Administrador
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsUserFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 font-semibold">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold shadow-md shadow-amber-600/30">
                  {editingUser ? "Actualizar Usuario" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREAR / EDITAR ROL (SOLO ADMIN)
      ========================================================================= */}
      {isRoleFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1326] border border-[#222a3d] rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">
                  badge
                </span>
                <h3 className="text-base font-bold text-white">
                  {editingRole ? "Editar Rol" : "Crear Nuevo Rol"}
                </h3>
              </div>
              <button
                onClick={() => setIsRoleFormOpen(false)}
                className="text-slate-400 hover:text-white p-1">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form
              onSubmit={handleSaveRole}
              className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">
                  Nombre del Rol *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Diseñador 3D / DevOps"
                  value={roleFormData.name}
                  onChange={(e) =>
                    setRoleFormData({ ...roleFormData, name: e.target.value })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-300">
                  Descripción del Rol (Opcional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe las principales responsabilidades..."
                  value={roleFormData.description}
                  onChange={(e) =>
                    setRoleFormData({
                      ...roleFormData,
                      description: e.target.value,
                    })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsRoleFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 font-semibold">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30">
                  {editingRole ? "Guardar Cambios" : "Crear Rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREAR PROYECTO
      ========================================================================= */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1326] border border-[#222a3d] rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <span className="material-symbols-outlined text-xl">
                    create_new_folder
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Nuevo Proyecto
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Serás el dueño (👑) de este proyecto y podrás invitar a tu equipo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#131b2e] transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form
              onSubmit={handleCreateProject}
              className="flex flex-col gap-4 text-xs overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-300">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lanzamiento App Móvil"
                  value={newProjectForm.name}
                  onChange={(e) =>
                    setNewProjectForm({
                      ...newProjectForm,
                      name: e.target.value,
                    })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-300">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe el objetivo y alcance de este proyecto..."
                  value={newProjectForm.description}
                  onChange={(e) =>
                    setNewProjectForm({
                      ...newProjectForm,
                      description: e.target.value,
                    })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              {/* Members Selection */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-400">
                      group
                    </span>
                    <span>Miembros del Equipo</span>
                    <span className="text-[11px] font-normal text-indigo-400">
                      ({newProjectForm.members?.length || 0} asignados)
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allNames = users.map((u) => u.name);
                        setNewProjectForm({
                          ...newProjectForm,
                          members: allNames,
                        });
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                      Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewProjectForm({
                          ...newProjectForm,
                          members: currentUser?.name ? [currentUser.name] : [],
                        });
                      }}
                      className="text-slate-400 hover:text-slate-300 font-semibold hover:underline">
                      Solo yo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-[#060e20] rounded-xl border border-[#222a3d]">
                  {users.map((u) => {
                    const isSelected = newProjectForm.members.includes(u.name);
                    const isCurrentUser = u.name === currentUser?.name;

                    return (
                      <div
                        key={u.id || u.name}
                        onClick={() => {
                          const exists = newProjectForm.members.includes(u.name);
                          const nextMembers = exists
                            ? newProjectForm.members.filter((m) => m !== u.name)
                            : [...newProjectForm.members, u.name];
                          setNewProjectForm({
                            ...newProjectForm,
                            members: nextMembers,
                          });
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-500/40 text-white"
                            : "bg-[#0b1326] border-transparent hover:border-[#2d3449] text-slate-400"
                        }`}>
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-[#171f33] text-slate-300"
                            }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="truncate font-semibold text-slate-200">
                              {u.name}{" "}
                              {isCurrentUser && (
                                <span className="text-[10px] text-amber-400">
                                  (Dueño 👑)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {u.role}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`material-symbols-outlined text-[18px] shrink-0 ${
                            isSelected ? "text-indigo-400" : "text-slate-600"
                          }`}>
                          {isSelected
                            ? "check_box"
                            : "check_box_outline_blank"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 font-semibold transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    add_circle
                  </span>
                  <span>Crear Proyecto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: GESTIONAR PROYECTO & MIEMBROS DEL EQUIPO
      ========================================================================= */}
      {isEditProjectModalOpen && editingProject && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1326] border border-[#222a3d] rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined text-xl">
                    manage_accounts
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>Gestionar Proyecto & Miembros</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingProject.owner_name === currentUser?.name
                      ? "Como dueño del proyecto, puedes agregar o quitar personas."
                      : "Administración completa del proyecto y colaboradores."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProjectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#131b2e] transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form
              onSubmit={handleSaveEditProject}
              className="flex flex-col gap-4 text-xs overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-300">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Rediseño Web 2.0"
                  value={editProjectForm.name}
                  onChange={(e) =>
                    setEditProjectForm({
                      ...editProjectForm,
                      name: e.target.value,
                    })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-300">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Objetivos o detalles del proyecto..."
                  value={editProjectForm.description}
                  onChange={(e) =>
                    setEditProjectForm({
                      ...editProjectForm,
                      description: e.target.value,
                    })
                  }
                  className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              {/* Owner Info / Selector for Admin */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-300 flex items-center gap-1">
                  <span>Propietario / Dueño del Proyecto</span>
                  <span className="text-amber-400">👑</span>
                </label>
                {isAdmin ? (
                  <select
                    value={editProjectForm.owner_name}
                    onChange={(e) =>
                      setEditProjectForm({
                        ...editProjectForm,
                        owner_name: e.target.value,
                      })
                    }
                    className="bg-[#060e20] text-white p-2.5 rounded-xl border border-[#2d3449] focus:outline-none focus:border-indigo-500 cursor-pointer">
                    {users.map((u) => (
                      <option key={u.id || u.name} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#060e20] border border-[#222a3d] text-amber-300 font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      verified_user
                    </span>
                    <span>{editProjectForm.owner_name || currentUser?.name} (Tú)</span>
                  </div>
                )}
              </div>

              {/* Members Checklist */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-400">
                      group
                    </span>
                    <span>Personas Asignadas al Proyecto</span>
                    <span className="text-[11px] font-normal text-indigo-400">
                      ({editProjectForm.members?.length || 0} miembros)
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allNames = users.map((u) => u.name);
                        setEditProjectForm({
                          ...editProjectForm,
                          members: allNames,
                        });
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                      Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditProjectForm({
                          ...editProjectForm,
                          members: editProjectForm.owner_name
                            ? [editProjectForm.owner_name]
                            : [],
                        });
                      }}
                      className="text-slate-400 hover:text-slate-300 font-semibold hover:underline">
                      Solo Dueño
                    </button>
                  </div>
                </div>

                {/* Selected tags */}
                {editProjectForm.members?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#060e20]/80 rounded-xl border border-[#222a3d] max-h-24 overflow-y-auto">
                    {editProjectForm.members.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
                        <span>{m}</span>
                        {m === editProjectForm.owner_name && (
                          <span className="text-[10px]" title="Dueño">👑</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditProjectForm({
                              ...editProjectForm,
                              members: editProjectForm.members.filter(
                                (name) => name !== m,
                              ),
                            });
                          }}
                          className="hover:text-rose-400 ml-0.5">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* User checklist items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-[#060e20] rounded-xl border border-[#222a3d]">
                  {users.map((u) => {
                    const isMember = editProjectForm.members?.includes(u.name);
                    const isOwner = u.name === editProjectForm.owner_name;

                    return (
                      <div
                        key={u.id || u.name}
                        onClick={() => {
                          const currentMembers =
                            editProjectForm.members || [];
                          const nextMembers = currentMembers.includes(u.name)
                            ? currentMembers.filter((m) => m !== u.name)
                            : [...currentMembers, u.name];
                          setEditProjectForm({
                            ...editProjectForm,
                            members: nextMembers,
                          });
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                          isMember
                            ? "bg-indigo-600/15 border-indigo-500/40 text-white"
                            : "bg-[#0b1326] border-transparent hover:border-[#2d3449] text-slate-400"
                        }`}>
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isMember
                                ? "bg-indigo-600 text-white"
                                : "bg-[#171f33] text-slate-300"
                            }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="truncate font-semibold text-slate-200">
                              {u.name}{" "}
                              {isOwner && (
                                <span className="text-[10px] text-amber-400 font-bold">
                                  👑 Dueño
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {u.role}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`material-symbols-outlined text-[18px] shrink-0 ${
                            isMember ? "text-indigo-400" : "text-slate-600"
                          }`}>
                          {isMember
                            ? "check_box"
                            : "check_box_outline_blank"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsEditProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 font-semibold transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    save
                  </span>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRMACIÓN DE ELIMINACIÓN MODERNO (SUPERIOR A TODOS LOS MODALES)
      ========================================================================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1326] border border-rose-500/40 rounded-2xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150 relative overflow-hidden">
            {/* Ambient subtle red glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-600/25 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                <span className="material-symbols-outlined text-3xl">
                  delete_forever
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {deleteModal.type === "task"
                  ? "¿Eliminar Tarea?"
                  : deleteModal.type === "project"
                    ? "¿Eliminar Proyecto y sus Tareas?"
                    : deleteModal.type === "role"
                      ? "¿Eliminar Rol del Equipo?"
                      : "¿Eliminar Usuario?"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                ¿Estás seguro de que deseas eliminar permanentemente:
              </p>
              <div className="px-3 py-2 bg-[#060e20] border border-[#222a3d] rounded-xl text-xs font-bold text-rose-300 max-w-full break-words">
                "{deleteModal.title}"
              </div>
              {deleteModal.subtitle && (
                <span className="text-[11px] text-slate-400">
                  {deleteModal.subtitle}
                </span>
              )}
              <p className="text-[11px] text-slate-500 italic mt-1">
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#222a3d]">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    type: "task",
                    id: null,
                    title: "",
                    subtitle: "",
                  })
                }
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 text-xs font-bold transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">
                  delete
                </span>
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
