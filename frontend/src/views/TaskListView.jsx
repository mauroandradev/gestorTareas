import React, { useState } from 'react';
import { TaskPulseAPI } from '../services/api';

export default function TaskListView({
  tasks,
  users,
  projects,
  onRefresh,
  onEditTask,
  onOpenCreateModal,
  selectedProject,
  currentUser
}) {
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // all, my_tasks, matrix, overdue
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('priority'); // priority or none

  const handleToggleTaskStatus = async (task) => {
    try {
      const nextStatus = task.status === 'done' ? 'todo' : 'done';
      await TaskPulseAPI.updateTaskStatus(task.id, nextStatus);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado de la tarea');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta tarea permanentemente?')) return;
    try {
      await TaskPulseAPI.deleteTask(taskId);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la tarea');
    }
  };

  // Filter computation
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter(t => {
    // Project filter
    if (selectedProject && t.project_id !== selectedProject) return false;

    // Filter tab
    if (activeFilterTab === 'my_tasks') {
      if (t.assignee_id !== (currentUser?.id || 1)) return false;
    } else if (activeFilterTab === 'overdue') {
      if (t.is_completed || t.status === 'done' || !t.due_date || t.due_date >= todayStr) return false;
    }

    // Dropdowns
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (assigneeFilter !== 'all' && String(t.assignee_id) !== String(assigneeFilter)) return false;

    return true;
  });

  const activeTasksCount = filteredTasks.filter(t => !t.is_completed && t.status !== 'done').length;
  const overdueCount = tasks.filter(t => !t.is_completed && t.status !== 'done' && t.due_date && t.due_date < todayStr).length;
  const myTasksCount = tasks.filter(t => t.assignee_id === (currentUser?.id || 1)).length;

  // Grouping by priority
  const priorityGroups = [
    { id: 'urgent', label: 'Urgente', desc: 'Impacto Inmediato en Producción', color: 'error', count: filteredTasks.filter(t => t.priority === 'urgent').length },
    { id: 'high', label: 'Alta', desc: 'Prioridad del Sprint Actual', color: 'secondary-fixed', count: filteredTasks.filter(t => t.priority === 'high').length },
    { id: 'medium', label: 'Media', desc: 'Progreso y Tareas Regulares', color: 'secondary', count: filteredTasks.filter(t => t.priority === 'medium').length },
    { id: 'low', label: 'Baja', desc: 'Backlog y Mejoras Secundarias', color: 'outline', count: filteredTasks.filter(t => t.priority === 'low').length }
  ];

  const renderTaskTable = (taskList) => {
    if (taskList.length === 0) {
      return (
        <div className="p-space-lg text-center text-xs text-outline italic">
          No hay tareas en esta categoría.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-lowest text-outline text-[11px] font-semibold uppercase tracking-wider border-b border-surface-container-low">
              <th className="py-2.5 px-space-md w-10 text-center">Estado</th>
              <th className="py-2.5 px-space-md">Tarea / Requerimiento</th>
              <th className="py-2.5 px-space-md">Proyecto</th>
              <th className="py-2.5 px-space-md">Responsable</th>
              <th className="py-2.5 px-space-md">Vencimiento</th>
              <th className="py-2.5 px-space-md">Progreso</th>
              <th className="py-2.5 px-space-md">Etiquetas</th>
              <th className="py-2.5 px-space-md text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-surface-container-low/40">
            {taskList.map((task) => {
              const isDone = task.is_completed || task.status === 'done';
              const isOverdue = !isDone && task.due_date && task.due_date < todayStr;

              return (
                <tr key={task.id} className="hover:bg-surface-container-low transition-colors group">
                  {/* Status Checkbox */}
                  <td className="py-3 px-space-md text-center">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggleTaskStatus(task)}
                      className="w-4 h-4 rounded bg-surface-container-highest cursor-pointer accent-primary-container"
                    />
                  </td>

                  {/* Title & Code */}
                  <td className="py-3 px-space-md font-medium text-on-surface">
                    <div className="flex flex-col">
                      <span
                        onClick={() => onEditTask(task)}
                        className={`font-semibold cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5 ${
                          isDone ? 'line-through text-on-surface-variant' : 'text-on-surface'
                        }`}
                      >
                        {task.priority === 'urgent' && (
                          <span className="material-symbols-outlined text-[16px] text-error">error</span>
                        )}
                        {task.title}
                      </span>
                      <span className="text-[11px] text-outline">
                        <strong className="text-primary font-mono">{task.code}</strong> • {task.estimated_hours || '4h'} • {task.story_points || 1} SP
                      </span>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="py-3 px-space-md">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${task.project?.color === 'secondary' ? 'bg-secondary' : 'bg-tertiary'}`}></span>
                      {task.project?.name || 'General'}
                    </span>
                  </td>

                  {/* Assignee */}
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-2">
                      <img
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-primary-container/30"
                        src={task.assignee?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkBq4PVTX3Y0GZ9LEr12SMzoRhKLZOP51w-CZ_7aZaYRQftOTQOz0ZZ8HkllW6VEDNICYTHLF9Xh3B8CP5QYHpVKj3XtrXw4B5ahLxcHvkB7x8HDzzc0far9Ol1wqM_Woz8wTteMRl7JnXvfaEV9JduwZTRPYGwVIaH1ec6QqaVHCdzRERMpBEmg5rN_cpq5kr5arDlPTwLMHi3neLwkHCwMJF5AwiPkisqMcHWuQ61Mfco1QJiVMgGA'}
                        alt={task.assignee?.name || 'Asignado'}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs text-on-surface">{task.assignee?.name || 'Sin asignar'}</span>
                        <span className="text-[10px] text-on-surface-variant truncate max-w-[120px]">{task.assignee?.role || ''}</span>
                      </div>
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-space-md">
                    <div className="flex flex-col">
                      <span className={`text-xs font-semibold ${isOverdue ? 'text-error' : 'text-on-surface'}`}>
                        {task.due_date || 'Sin fecha'}
                      </span>
                      <span className="text-[10px] text-outline">{task.due_time || '18:00'}</span>
                    </div>
                  </td>

                  {/* Progress Bar */}
                  <td className="py-3 px-space-md">
                    <div className="flex flex-col gap-1 w-24">
                      <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-medium">
                        <span>{task.progress_percent || 0}%</span>
                        <span className="text-outline">{task.subtasks?.length || 0} sub</span>
                      </div>
                      <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${isDone ? 'bg-primary' : 'bg-secondary'}`}
                          style={{ width: `${task.progress_percent || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>

                  {/* Tags */}
                  <td className="py-3 px-space-md">
                    <div className="flex flex-wrap gap-1">
                      {task.tags && task.tags.map(t => (
                        <span key={t.id} className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-mono">
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-space-md text-right">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTask(task)}
                        title="Editar tarea"
                        className="p-1.5 rounded hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        title="Eliminar tarea"
                        className="p-1.5 rounded hover:bg-surface-container-high text-outline hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      {/* Top Banner & Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-md">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gestión y Lista de Tareas</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary text-xs font-semibold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              {activeTasksCount} tareas activas
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            Central de control de sprints, asignaciones prioritarias y flujo de trabajo del equipo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-3 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg text-xs font-medium transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refrescar</span>
          </button>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-primary-container/90 text-on-primary rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Crear Registro</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1 bg-surface-container-lowest p-1 rounded-xl shadow-inner max-w-fit border border-surface-container-low">
        <button
          onClick={() => setActiveFilterTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeFilterTab === 'all'
              ? 'bg-surface-container-high text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] text-primary">view_list</span>
          Todas las tareas ({tasks.length})
        </button>

        <button
          onClick={() => setActiveFilterTab('my_tasks')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeFilterTab === 'my_tasks'
              ? 'bg-surface-container-high text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">person</span>
          Mis asignaciones
          <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-on-surface text-[10px]">{myTasksCount}</span>
        </button>

        <button
          onClick={() => setActiveFilterTab('overdue')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeFilterTab === 'overdue'
              ? 'bg-surface-container-high text-error shadow-sm'
              : 'text-on-surface-variant hover:text-error hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] text-error">alarm_off</span>
          Vencidas
          <span className="px-1.5 py-0.2 rounded bg-tertiary-container text-on-tertiary-container text-[10px]">{overdueCount}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm bg-surface-container-low p-space-md rounded-xl shadow-sm border border-surface-container-low">
        <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-2">
            {/* Responsable Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-2 border border-surface-variant/30 focus:outline-none cursor-pointer"
            >
              <option value="all">Responsable: Todos</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            {/* Prioridad Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-2 border border-surface-variant/30 focus:outline-none cursor-pointer"
            >
              <option value="all">Prioridad: Todas</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>

            {/* Estado Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-2 border border-surface-variant/30 focus:outline-none cursor-pointer"
            >
              <option value="all">Estado: Todos</option>
              <option value="todo">Por Hacer</option>
              <option value="in_progress">En Progreso</option>
              <option value="review">En Revisión</option>
              <option value="done">Completada</option>
            </select>
          </div>

          {/* Grouping switch */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-outline uppercase font-semibold">Agrupar:</span>
            <button
              onClick={() => setGroupBy(groupBy === 'priority' ? 'none' : 'priority')}
              className="px-3 py-1.5 bg-surface-container-high rounded-lg text-on-surface text-xs font-semibold flex items-center gap-1"
            >
              <span>{groupBy === 'priority' ? 'Por Nivel de Prioridad' : 'Lista Continua'}</span>
              <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task Sections */}
      {groupBy === 'priority' ? (
        <div className="flex flex-col gap-space-lg">
          {priorityGroups.map((group) => {
            const groupTasks = filteredTasks.filter(t => t.priority === group.id);
            if (groupTasks.length === 0 && (priorityFilter !== 'all' || activeFilterTab !== 'all')) return null;

            return (
              <section key={group.id} className="flex flex-col rounded-xl bg-surface-container-lowest shadow-md overflow-hidden border border-surface-container-low">
                <div className="flex items-center justify-between px-space-lg py-3 bg-surface-container-low border-b border-surface-container-low">
                  <div className="flex items-center gap-space-sm">
                    <span className={`w-3 h-3 rounded-full ${group.id === 'urgent' ? 'bg-error' : group.id === 'high' ? 'bg-secondary-fixed' : group.id === 'medium' ? 'bg-secondary' : 'bg-outline'}`}></span>
                    <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      {group.label}
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px]">
                        {groupTasks.length} {groupTasks.length === 1 ? 'tarea' : 'tareas'}
                      </span>
                    </h2>
                  </div>
                  <span className="text-[11px] text-outline hidden sm:inline">{group.desc}</span>
                </div>
                {renderTaskTable(groupTasks)}
              </section>
            );
          })}
        </div>
      ) : (
        <section className="flex flex-col rounded-xl bg-surface-container-lowest shadow-md overflow-hidden border border-surface-container-low">
          {renderTaskTable(filteredTasks)}
        </section>
      )}
    </div>
  );
}
