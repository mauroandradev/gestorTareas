import React, { useState, useEffect } from 'react';
import { TaskAPI } from './services/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendientes: 0, en_progreso: 0, completadas: 0, urgentes: 0, proyectos: [] });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todas');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'list', 'calendar'

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(new Date().getDate());

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Media',
    status: 'Pendiente',
    project: 'Q3 Lanzamiento',
    assignee: 'Elena Vega',
    due_date: ''
  });

  // Toast
  const [toast, setToast] = useState(null);

  const teamMembers = [
    'Elena Vega',
    'Carlos Méndez',
    'Sofía Ramos',
    'Lucas Torres',
    'Mateo Morales'
  ];

  const defaultProjects = ['Q3 Lanzamiento', 'Soporte al Cliente', 'Rediseño Web', 'Infraestructura'];
  const projectList = Array.from(new Set([...defaultProjects, ...(stats.proyectos || [])]));

  const priorities = ['Baja', 'Media', 'Alta', 'Urgente'];
  const statuses = ['Pendiente', 'En Progreso', 'Completada'];

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskList, statsData] = await Promise.all([
        TaskAPI.getTasks({
          search,
          project: selectedProject,
          priority: priorityFilter
        }),
        TaskAPI.getStats()
      ]);
      setTasks(taskList || []);
      setStats(statsData || { total: 0, pendientes: 0, en_progreso: 0, completadas: 0, urgentes: 0, proyectos: [] });
    } catch (err) {
      console.error(err);
      showToast('Error de conexión con el backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedProject, priorityFilter]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenCreate = (prefilledDate = null) => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'Media',
      status: 'Pendiente',
      project: selectedProject !== 'Todos' ? selectedProject : 'Q3 Lanzamiento',
      assignee: 'Elena Vega',
      due_date: prefilledDate || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      project: task.project || 'General',
      assignee: task.assignee,
      due_date: task.due_date || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Por favor, ingresa el título de la tarea.');
      return;
    }

    try {
      if (editingTask) {
        await TaskAPI.updateTask(editingTask.id, formData);
        showToast('Tarea actualizada');
      } else {
        await TaskAPI.createTask(formData);
        showToast('Tarea creada con éxito');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar la tarea', 'error');
    }
  };

  const handleQuickStatusChange = async (task, nextStatus) => {
    try {
      await TaskAPI.updateStatus(task.id, nextStatus);
      showToast(`Estado: ${nextStatus}`);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Error al cambiar estado', 'error');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('¿Deseas eliminar esta tarea?')) return;
    try {
      await TaskAPI.deleteTask(taskId);
      showToast('Tarea eliminada');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar', 'error');
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'Urgente':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'Alta':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Media':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };

  // ----------------- CALENDAR HELPERS -----------------
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Mon = 0

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ day: null, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.due_date === dateStr);
    calendarDays.push({ day: d, isCurrentMonth: true, dateStr, tasks: dayTasks });
  }

  const selectedDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedCalendarDay).padStart(2, '0')}`;
  const selectedDayTasks = tasks.filter(t => t.due_date === selectedDateString);

  return (
    <div className="bg-[#0b1326] text-[#dae2fd] min-h-screen font-sans flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-[#060e20] border-b border-[#222a3d] px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <img
            alt="Logo"
            className="h-8 w-auto"
            src="https://lh3.googleusercontent.com/aida/AEtjO1URpY6_v6dN4qWs8G7HguK6-N82jAfZqi9dDzw_ShbeS_52dDdTiuSOTUD3XO2JQdkd7r3L66APv7udS14jl4cLomoNPBJh787sUfvuo5Big2EBmTTSdzYlS7c1Vb34HW3BeLrMf6OJLbc2AGj6-UeL_6z2ySeoUeZ8822VlE9DsHiQO8kJyl0M7-CWcN2nA-KCumbdr4C8M-4lZjW2_5plu9IQINQYMVire4dsVYd0a7M14h-ZOBsC2xcp"
          />
          <div className="flex flex-col">
            <span className="font-bold text-base text-white tracking-tight">TaskPulse</span>
            <span className="text-[10px] text-primary uppercase font-semibold">Gestor de Tareas & Proyectos</span>
          </div>
        </div>

        {/* Global Action Button */}
        <button
          onClick={() => handleOpenCreate()}
          className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nueva Tarea</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {/* Projects Tab / Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-indigo-400">folder</span>
            Proyectos:
          </span>
          <button
            onClick={() => setSelectedProject('Todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              selectedProject === 'Todos'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-[#131b2e] text-slate-400 hover:text-white border border-[#222a3d]'
            }`}
          >
            Todos ({stats.total})
          </button>
          {projectList.map((proj) => {
            const isSelected = selectedProject === proj;
            const count = tasks.filter(t => t.project === proj).length;
            return (
              <button
                key={proj}
                onClick={() => setSelectedProject(proj)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[#131b2e] text-slate-400 hover:text-white border border-[#222a3d]'
                }`}
              >
                <span>{proj}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded ${isSelected ? 'bg-indigo-800 text-white' : 'bg-[#222a3d] text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#131b2e] p-4 rounded-xl border border-[#222a3d] flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Total Tareas</span>
            <span className="text-2xl font-bold text-white mt-1">{tasks.length}</span>
          </div>
          <div className="bg-[#131b2e] p-4 rounded-xl border border-[#222a3d] flex flex-col">
            <span className="text-xs text-amber-400 font-medium">Pendientes</span>
            <span className="text-2xl font-bold text-white mt-1">{tasks.filter(t => t.status === 'Pendiente').length}</span>
          </div>
          <div className="bg-[#131b2e] p-4 rounded-xl border border-[#222a3d] flex flex-col">
            <span className="text-xs text-cyan-400 font-medium">En Progreso</span>
            <span className="text-2xl font-bold text-white mt-1">{tasks.filter(t => t.status === 'En Progreso').length}</span>
          </div>
          <div className="bg-[#131b2e] p-4 rounded-xl border border-[#222a3d] flex flex-col">
            <span className="text-xs text-emerald-400 font-medium">Completadas</span>
            <span className="text-2xl font-bold text-white mt-1">{tasks.filter(t => t.status === 'Completada').length}</span>
          </div>
        </div>

        {/* Toolbar: Search, Priority filter & View Mode Switcher */}
        <div className="bg-[#131b2e] p-4 rounded-xl border border-[#222a3d] flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar tareas, proyectos, responsables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0b1326] text-sm text-white pl-9 pr-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-[#0b1326] text-xs text-slate-200 px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none cursor-pointer"
            >
              <option value="Todas">Prioridad: Todas</option>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* View Mode Toggle: Kanban / Lista / Calendario */}
            <div className="flex items-center bg-[#0b1326] p-1 rounded-lg border border-[#2d3449]">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  viewMode === 'kanban' ? 'bg-[#4f46e5] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">view_kanban</span>
                Tablero
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-[#4f46e5] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">checklist</span>
                Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                  viewMode === 'calendar' ? 'bg-[#4f46e5] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                Calendario
              </button>
            </div>
          </div>
        </div>

        {/* ----------------- VIEWS ----------------- */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Cargando tareas...</div>
        ) : viewMode === 'kanban' ? (
          /* 1. Kanban Board */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {statuses.map((colStatus) => {
              const colTasks = tasks.filter(t => t.status === colStatus);

              return (
                <div key={colStatus} className="bg-[#060e20] rounded-xl border border-[#222a3d] p-4 flex flex-col gap-3 min-h-[450px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#222a3d]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        colStatus === 'Pendiente' ? 'bg-amber-400' : colStatus === 'En Progreso' ? 'bg-cyan-400' : 'bg-emerald-400'
                      }`}></span>
                      <span className="font-bold text-sm text-white">{colStatus}</span>
                    </div>
                    <span className="text-xs bg-[#171f33] text-slate-300 font-semibold px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards */}
                  <div className="flex flex-col gap-3 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-500 italic">
                        Sin tareas en {colStatus.toLowerCase()}
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-[#131b2e] hover:bg-[#171f33] p-4 rounded-xl border border-[#222a3d] transition-all shadow-sm flex flex-col gap-2 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              onClick={() => handleOpenEdit(task)}
                              className="text-sm font-semibold text-white cursor-pointer hover:text-indigo-400 transition-colors"
                            >
                              {task.title}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getPriorityBadge(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#222a3d]">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-[#0b1326] text-indigo-300 font-medium border border-[#222a3d]">
                              📁 {task.project || 'General'}
                            </span>
                            <span className="font-medium text-slate-300">👤 {task.assignee}</span>
                          </div>

                          {task.due_date && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span>📅 Vence: {task.due_date}</span>
                            </div>
                          )}

                          {/* Fast Action Buttons */}
                          <div className="flex items-center justify-between pt-1 opacity-75 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1">
                              {colStatus !== 'Pendiente' && (
                                <button
                                  onClick={() => handleQuickStatusChange(task, 'Pendiente')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#222a3d] hover:bg-[#2d3449] text-amber-300"
                                >
                                  ← Pendiente
                                </button>
                              )}
                              {colStatus !== 'En Progreso' && (
                                <button
                                  onClick={() => handleQuickStatusChange(task, 'En Progreso')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#222a3d] hover:bg-[#2d3449] text-cyan-300"
                                >
                                  {colStatus === 'Pendiente' ? 'En Progreso →' : '← En Progreso'}
                                </button>
                              )}
                              {colStatus !== 'Completada' && (
                                <button
                                  onClick={() => handleQuickStatusChange(task, 'Completada')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#222a3d] hover:bg-[#2d3449] text-emerald-300"
                                >
                                  Completar ✓
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(task)}
                                className="p-1 text-slate-400 hover:text-white"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="p-1 text-slate-400 hover:text-rose-400"
                                title="Eliminar"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'list' ? (
          /* 2. Table List View */
          <div className="bg-[#060e20] rounded-xl border border-[#222a3d] overflow-hidden shadow-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#131b2e] text-slate-400 text-xs uppercase font-semibold border-b border-[#222a3d]">
                <tr>
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4">Proyecto</th>
                  <th className="py-3 px-4">Responsable</th>
                  <th className="py-3 px-4">Prioridad</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Fecha Límite</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171f33]">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-[#131b2e] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <span onClick={() => handleOpenEdit(task)} className="cursor-pointer hover:text-indigo-400">
                        {task.title}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#131b2e] text-indigo-300 border border-[#222a3d]">
                        {task.project || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{task.assignee}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        task.status === 'Completada' ? 'bg-emerald-500/20 text-emerald-300' :
                        task.status === 'En Progreso' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{task.due_date || 'Sin fecha'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(task)} className="text-slate-400 hover:text-white">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(task.id)} className="text-slate-400 hover:text-rose-400">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* 3. Interactive Calendar View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Calendar Grid (8 cols) */}
            <div className="lg:col-span-8 bg-[#060e20] rounded-2xl border border-[#222a3d] p-5 shadow-xl flex flex-col gap-4">
              {/* Month Header controls */}
              <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                    className="p-1.5 rounded-lg bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <h3 className="text-base font-bold text-white min-w-[140px] text-center">
                    {monthNames[currentMonth]} {currentYear}
                  </h3>
                  <button
                    onClick={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                    className="p-1.5 rounded-lg bg-[#131b2e] hover:bg-[#222a3d] text-slate-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    const now = new Date();
                    setCalendarDate(now);
                    setSelectedCalendarDay(now.getDate());
                  }}
                  className="px-3 py-1 bg-[#131b2e] hover:bg-[#222a3d] text-xs font-semibold text-slate-300 rounded-lg border border-[#222a3d]"
                >
                  Hoy
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((item, index) => {
                  if (!item.isCurrentMonth) {
                    return <div key={index} className="min-h-[90px] rounded-lg bg-[#0b1326]/40 opacity-20"></div>;
                  }

                  const isSelected = item.day === selectedCalendarDay;
                  const hasTasks = item.tasks && item.tasks.length > 0;

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedCalendarDay(item.day)}
                      className={`min-h-[90px] p-2 rounded-xl flex flex-col justify-between transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#131b2e] border-indigo-500 shadow-lg ring-1 ring-indigo-500'
                          : 'bg-[#131b2e]/60 hover:bg-[#131b2e] border-[#222a3d]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-indigo-400' : 'text-slate-300'}`}>
                          {item.day}
                        </span>
                        {hasTasks && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        )}
                      </div>

                      {/* Task preview pills */}
                      <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                        {item.tasks?.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
                            className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                              t.status === 'Completada' ? 'bg-emerald-950 text-emerald-300' : 'bg-indigo-950 text-indigo-300'
                            }`}
                          >
                            {t.title}
                          </div>
                        ))}
                        {item.tasks?.length > 2 && (
                          <span className="text-[9px] text-slate-400">+{item.tasks.length - 2} más</span>
                        )}
                      </div>
                      <div className="h-0.5"></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda (4 cols) */}
            <div className="lg:col-span-4 bg-[#060e20] rounded-2xl border border-[#222a3d] p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
                <div className="flex flex-col">
                  <span className="text-xs text-indigo-400 font-bold uppercase tracking-wide">Agenda del Día</span>
                  <span className="text-sm font-bold text-white">
                    {selectedCalendarDay} de {monthNames[currentMonth]} {currentYear}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenCreate(selectedDateString)}
                  className="p-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg text-xs flex items-center gap-1 font-semibold"
                  title="Añadir tarea en esta fecha"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>

              {/* Day Tasks List */}
              <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto">
                {selectedDayTasks.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 italic flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-slate-600 text-[32px]">event_available</span>
                    <span>No hay tareas programadas para este día.</span>
                    <button
                      onClick={() => handleOpenCreate(selectedDateString)}
                      className="text-xs text-indigo-400 hover:underline mt-1 font-semibold"
                    >
                      + Programar una tarea aquí
                    </button>
                  </div>
                ) : (
                  selectedDayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-[#131b2e] hover:bg-[#171f33] rounded-xl border border-[#222a3d] transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          onClick={() => handleOpenEdit(task)}
                          className="text-xs font-semibold text-white cursor-pointer hover:text-indigo-400"
                        >
                          {task.title}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#222a3d]">
                        <span className="text-indigo-300">📁 {task.project || 'General'}</span>
                        <span className="text-slate-300">👤 {task.assignee}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleQuickStatusChange(task, task.status === 'Completada' ? 'Pendiente' : 'Completada')}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            task.status === 'Completada' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-[#222a3d] text-slate-300 hover:text-emerald-300'
                          }`}
                        >
                          {task.status === 'Completada' ? '✓ Completada' : 'Marcar Completada'}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Task Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#131b2e] border border-[#2d3449] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#060e20] border-b border-[#222a3d] flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingTask ? 'Editar Tarea' : 'Registrar Nueva Tarea'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTask} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Implementar balanceador de carga Nginx"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#0b1326] text-white text-sm px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles o requerimientos..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0b1326] text-white text-sm px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Project & Assignee */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">Proyecto Vinculado</label>
                  <select
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full bg-[#0b1326] text-white text-xs px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none cursor-pointer"
                  >
                    {projectList.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">Responsable</label>
                  <select
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className="w-full bg-[#0b1326] text-white text-xs px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none cursor-pointer"
                  >
                    {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-[#0b1326] text-white text-xs px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none cursor-pointer"
                  >
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#0b1326] text-white text-xs px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none cursor-pointer"
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase block mb-1">Fecha Límite</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full bg-[#0b1326] text-white text-xs px-3 py-2 rounded-lg border border-[#2d3449] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#222a3d] hover:bg-[#2d3449] text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-indigo-500/30"
                >
                  {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 z-50 ${
          toast.type === 'error' ? 'bg-rose-950 text-rose-200 border-rose-800' : 'bg-emerald-950 text-emerald-200 border-emerald-800'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
