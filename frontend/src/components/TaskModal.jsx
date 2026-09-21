import React, { useState, useEffect } from 'react';
import { TaskPulseAPI } from '../services/api';

export default function TaskModal({ isOpen, onClose, onTaskCreated, users, projects, initialTask = null }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('high');
  const [assigneeId, setAssigneeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('18:00');
  const [estimatedHours, setEstimatedHours] = useState('4h 00m');
  const [storyPoints, setStoryPoints] = useState(3);
  const [description, setDescription] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskTag, setNewSubtaskTag] = useState('Backend');
  const [tags, setTags] = useState(['Seguridad', 'Frontend']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setPriority(initialTask.priority || 'medium');
      setAssigneeId(initialTask.assignee_id ? String(initialTask.assignee_id) : (users[0]?.id ? String(users[0].id) : ''));
      setProjectId(initialTask.project_id ? String(initialTask.project_id) : (projects[0]?.id ? String(projects[0].id) : ''));
      setDueDate(initialTask.due_date || '');
      setDueTime(initialTask.due_time || '18:00');
      setEstimatedHours(initialTask.estimated_hours || '4h 00m');
      setStoryPoints(initialTask.story_points || 3);
      setDescription(initialTask.description || '');
      setSubtasks(initialTask.subtasks || []);
      setTags(initialTask.tags ? initialTask.tags.map(t => t.name) : ['Seguridad']);
    } else {
      // Default new task setup
      setTitle('');
      setPriority('high');
      if (users.length > 0) setAssigneeId(String(users[0].id));
      if (projects.length > 0) setProjectId(String(projects[0].id));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      setDueDate(tomorrow.toISOString().split('T')[0]);
      
      setDueTime('18:00');
      setEstimatedHours('5h 00m');
      setStoryPoints(3);
      setDescription('### Alcance Técnico\n1. Diseñar flujo e integración de componentes.\n2. Validar respuestas en tiempo real.\n3. Ejecutar pruebas de carga.');
      setSubtasks([
        { title: 'Definir especificaciones técnicas y esquema DB', tag: 'Backend', is_completed: true },
        { title: 'Implementar llamadas asíncronas en frontend', tag: 'Frontend', is_completed: false },
        { title: 'Escribir suite de pruebas de integración', tag: 'QA', is_completed: false }
      ]);
      setTags(['Seguridad', 'Frontend', 'Core-Auth']);
    }
  }, [isOpen, initialTask, users, projects]);

  if (!isOpen) return null;

  const selectedUser = users.find(u => String(u.id) === String(assigneeId)) || users[0];

  const handleQuickDate = (type) => {
    const d = new Date();
    if (type === 'Hoy') {
      // today
    } else if (type === 'Mañana') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'Viernes') {
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
    }
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), tag: newSubtaskTag, is_completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (index) => {
    const updated = [...subtasks];
    updated[index].is_completed = !updated[index].is_completed;
    setSubtasks(updated);
  };

  const handleRemoveSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const completedSubtasks = subtasks.filter(s => s.is_completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Por favor, ingresa el título de la tarea.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        description,
        priority,
        status: initialTask ? initialTask.status : 'todo',
        due_date: dueDate,
        due_time: dueTime,
        estimated_hours: estimatedHours,
        story_points: Number(storyPoints),
        project_id: projectId ? Number(projectId) : null,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        tag_names: tags,
        subtasks: subtasks.map(s => ({ title: s.title, tag: s.tag, is_completed: s.is_completed }))
      };

      if (initialTask) {
        await TaskPulseAPI.updateTask(initialTask.id, payload);
      } else {
        await TaskPulseAPI.createTask(payload);
      }

      onTaskCreated(initialTask ? 'Tarea actualizada con éxito' : 'Tarea creada y asignada al equipo');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la tarea. Revisa que el backend esté en ejecución.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-4xl bg-surface-container-low rounded-2xl shadow-2xl border border-surface-variant/40 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="relative overflow-hidden bg-surface-container-lowest p-space-xl border-b border-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="absolute -right-16 -top-24 w-80 h-80 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>
          <div className="flex flex-col gap-1 z-10">
            <div className="flex items-center gap-space-sm text-primary">
              <span className="material-symbols-outlined text-[20px]">assignment_add</span>
              <span className="text-xs font-mono tracking-wider uppercase font-semibold text-primary">
                TaskPulse / {initialTask ? `Editar ${initialTask.code}` : 'Nuevo Registro'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              {initialTask ? 'Modificar Registro de Tarea' : 'Registrar Nueva Tarea del Equipo'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              Asigna, prioriza y sincroniza entregables con los colaboradores en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-2 z-10">
            <span className="px-3 py-1 rounded-full bg-surface-container text-secondary text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-sm border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              API CONECTADA
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-space-xl flex flex-col gap-space-lg max-h-[75vh] overflow-y-auto">
          
          {/* Title Field */}
          <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface-variant uppercase" htmlFor="taskTitle">
                Título de la Tarea
              </label>
              <span className="text-[11px] text-outline font-mono">{title.length}/120 caracteres</span>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-primary text-[20px]">terminal</span>
              <input
                id="taskTitle"
                maxLength={120}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Implementar autenticación OAuth 2.0 con soporte Multi-Tenant..."
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline text-sm rounded-lg pl-10 pr-space-md py-3 focus:outline-none focus:ring-2 focus:ring-primary-container border border-surface-variant/30"
                type="text"
              />
            </div>
          </div>

          {/* Priority Quadrants */}
          <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-3">
            <label className="text-xs font-semibold text-on-surface-variant uppercase flex items-center gap-1">
              <span>Nivel de Prioridad y Urgencia</span>
              <span className="material-symbols-outlined text-[16px] text-outline" title="Ponderación en matriz y dashboard">info</span>
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'urgent', label: 'Urgente', desc: 'Bloqueante / < 24h', icon: 'error', color: 'text-tertiary-container', dot: 'bg-tertiary-container', shadow: 'shadow-error/10' },
                { id: 'high', label: 'Alta', desc: 'Importante / Esta semana', icon: 'warning', color: 'text-secondary-fixed', dot: 'bg-secondary-fixed', shadow: 'shadow-secondary/10' },
                { id: 'medium', label: 'Media', desc: 'Progreso regular', icon: 'flag', color: 'text-secondary', dot: 'bg-secondary', shadow: 'shadow-secondary/10' },
                { id: 'low', label: 'Baja', desc: 'Backlog / Sin prisa', icon: 'low_priority', color: 'text-outline', dot: 'bg-outline', shadow: 'shadow-outline/10' }
              ].map((p) => {
                const isSelected = priority === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={`cursor-pointer p-space-md rounded-xl transition-all duration-150 flex flex-col gap-1 border ${
                      isSelected
                        ? 'bg-surface-container-high border-primary/50 shadow-lg ' + p.shadow
                        : 'bg-surface-container-low hover:bg-surface-container border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`material-symbols-outlined text-[20px] ${p.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {p.icon}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? p.dot : 'bg-surface-variant'}`}></span>
                    </div>
                    <span className="text-sm font-bold text-on-surface">{p.label}</span>
                    <span className="text-[11px] text-on-surface-variant truncate">{p.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignee & Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            
            {/* Assignee */}
            <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-2 relative">
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Asignar a Colaborador</label>
              <div
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full bg-surface-container-lowest p-2.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface-container-high border border-surface-variant/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedUser?.avatar_url ? (
                    <img className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-primary/30" src={selectedUser.avatar_url} alt={selectedUser.name} />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                      {selectedUser?.name?.substring(0, 2) || 'US'}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-xs font-semibold text-on-surface truncate">{selectedUser?.name || 'Seleccionar colaborador'}</span>
                    <span className="text-[10px] text-on-surface-variant truncate">{selectedUser?.role || 'Miembro del equipo'}</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">keyboard_arrow_down</span>
              </div>

              {/* Dropdown Options */}
              {showAssigneeDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-high rounded-xl p-1 shadow-2xl z-40 flex flex-col gap-1 border border-surface-variant/50">
                  {users.map(u => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setAssigneeId(String(u.id));
                        setShowAssigneeDropdown(false);
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        String(u.id) === String(assigneeId) ? 'bg-surface-container-highest font-medium' : 'hover:bg-surface-container'
                      }`}
                    >
                      <img className="w-6 h-6 rounded-full object-cover shrink-0" src={u.avatar_url} alt={u.name} />
                      <div className="flex flex-col text-left">
                        <span className="text-xs text-on-surface">{u.name}</span>
                        <span className="text-[10px] text-on-surface-variant">{u.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Linked */}
            <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Proyecto Vinculado</label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-lg p-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-container border border-surface-variant/30 cursor-pointer"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Date, Time & Effort Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            
            {/* Due Date & Time */}
            <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-on-surface-variant uppercase">Fecha Límite</label>
                <div className="flex items-center gap-1">
                  {['Hoy', 'Mañana', 'Viernes'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickDate(preset)}
                      className="px-2 py-0.5 rounded bg-surface-container-lowest hover:bg-surface-container-high text-outline text-[10px] hover:text-on-surface transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">calendar_today</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-lg pl-8 pr-2 py-2.5 border border-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="relative w-28">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">schedule</span>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-lg pl-8 pr-2 py-2.5 border border-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Story Points & Estimated Hours */}
            <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Estimación de Esfuerzo</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">timelapse</span>
                  <input
                    type="text"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="Ej: 4h 30m"
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-lg pl-8 pr-2 py-2.5 border border-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">speed</span>
                  <select
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-lg pl-8 pr-6 py-2.5 appearance-none border border-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="1">1 Story Point</option>
                    <option value="2">2 Story Points</option>
                    <option value="3">3 Story Points</option>
                    <option value="5">5 Story Points</option>
                    <option value="8">8 Story Points</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description Editor */}
          <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Descripción y Especificaciones</label>
              <div className="flex items-center gap-1 text-outline text-[11px]">
                <span className="material-symbols-outlined text-[14px]">markdown</span>
                <span>Markdown habilitado</span>
              </div>
            </div>
            <div className="rounded-lg bg-surface-container-lowest border border-surface-variant/30 overflow-hidden flex flex-col">
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla los requerimientos o criterios de aceptación..."
                className="w-full bg-transparent p-3 text-on-surface placeholder:text-outline text-xs focus:outline-none resize-y font-mono"
              />
            </div>
          </div>

          {/* Subtasks & Deliverables */}
          <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface-variant uppercase">Subtareas y Entregables</span>
                <span className="text-[10px] text-outline">Divide la tarea en hitos verificables</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full border border-surface-variant/30">
                <span className="text-xs font-bold text-on-surface">{completedSubtasks} de {subtasks.length} completadas</span>
                <div className="w-16 bg-surface-container-highest h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-1.5">
              {subtasks.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors group border border-surface-variant/20"
                >
                  <input
                    type="checkbox"
                    checked={st.is_completed}
                    onChange={() => handleToggleSubtask(idx)}
                    className="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                  />
                  <span className={`text-xs flex-1 ${st.is_completed ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                    {st.title}
                  </span>
                  {st.tag && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-medium">
                      {st.tag}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(idx)}
                    className="text-outline hover:text-tertiary transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Add new subtask input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                placeholder="+ Escribir nueva subtarea y presionar Enter..."
                className="flex-1 bg-surface-container-lowest text-on-surface text-xs rounded-lg px-3 py-2 border border-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={newSubtaskTag}
                onChange={(e) => setNewSubtaskTag(e.target.value)}
                className="bg-surface-container-lowest text-on-surface text-[11px] rounded-lg px-2 py-2 border border-surface-variant/30 focus:outline-none cursor-pointer"
              >
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="DevOps">DevOps</option>
                <option value="QA">QA</option>
                <option value="DB">DB</option>
              </select>
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-surface-container-high hover:bg-surface-bright text-on-surface rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Añadir
              </button>
            </div>
          </div>

          {/* System Tags */}
          <div className="rounded-xl bg-surface-container p-space-lg shadow-sm border border-surface-variant/20 flex flex-col gap-2">
            <label className="text-xs font-semibold text-on-surface-variant uppercase">Etiquetas del Sistema</label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full bg-surface-container-highest text-secondary text-xs font-medium flex items-center gap-1 shadow-sm border border-secondary/20"
                >
                  <span>#{t}</span>
                  <button type="button" onClick={() => handleRemoveTag(t)} className="text-outline hover:text-on-surface">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              ))}

              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="Nombre de etiqueta..."
                    className="px-3 py-1 rounded-full bg-surface-container-lowest text-on-surface text-xs focus:outline-none border border-primary"
                  />
                  <button type="button" onClick={handleAddTag} className="text-primary hover:underline text-xs font-medium">OK</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTagInput(true)}
                  className="px-2.5 py-1 rounded-full bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-medium transition-colors flex items-center gap-1 border border-surface-variant/30"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Agregar etiqueta
                </button>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-variant/30 sticky bottom-0 bg-surface-container-low py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-space-lg py-2.5 rounded-lg bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-space-xl py-2.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary text-xs font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.45)] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{loading ? 'Guardando...' : (initialTask ? 'Guardar Cambios' : 'Crear y Sincronizar')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
