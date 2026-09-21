import React, { useState, useEffect } from 'react';
import { TaskPulseAPI } from '../services/api';

export default function PriorityMatrixView({ onEditTask, onOpenCreateModal, selectedProject }) {
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const data = await TaskPulseAPI.getPriorityMatrix(selectedProject);
      setMatrixData(data);
    } catch (err) {
      console.error('Error fetching priority matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedProject]);

  const handleStatusChange = async (taskId, nextStatus) => {
    try {
      await TaskPulseAPI.updateTaskStatus(taskId, nextStatus);
      fetchMatrix();
    } catch (err) {
      console.error(err);
    }
  };

  const quadrants = [
    {
      key: 'urgent',
      title: 'Q1: Urgente & Crítico',
      subtitle: 'Resolver Inmediatamente (< 24h)',
      border: 'border-tertiary/40',
      headerBg: 'bg-tertiary-container/10',
      badge: 'bg-tertiary-container text-on-tertiary-container',
      icon: 'error'
    },
    {
      key: 'high',
      title: 'Q2: Alta Importancia',
      subtitle: 'Planificar y Ejecutar en Sprint',
      border: 'border-secondary-fixed/40',
      headerBg: 'bg-secondary-fixed/10',
      badge: 'bg-secondary-fixed text-on-secondary-fixed',
      icon: 'warning'
    },
    {
      key: 'medium',
      title: 'Q3: Media Prioridad',
      subtitle: 'Progreso y Flujo Continuo',
      border: 'border-secondary/30',
      headerBg: 'bg-secondary/10',
      badge: 'bg-secondary-container text-on-secondary-container',
      icon: 'flag'
    },
    {
      key: 'low',
      title: 'Q4: Baja Prioridad',
      subtitle: 'Backlog y Tareas Opcionales',
      border: 'border-surface-variant/40',
      headerBg: 'bg-surface-container-high/40',
      badge: 'bg-surface-container-highest text-outline',
      icon: 'low_priority'
    }
  ];

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm text-secondary text-xs uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span>Matriz Táctica de Eisenhower</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Matriz y Distribución de Prioridades
          </h1>
          <p className="text-xs text-on-surface-variant">
            Ponderación visual del impacto vs urgencia para maximizar la efectividad del equipo técnico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMatrix}
            className="flex items-center gap-1 px-3 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg text-xs font-medium transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Actualizar</span>
          </button>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-primary-container/90 text-on-primary rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Quadrants Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {quadrants.map(q => {
          const quadInfo = matrixData?.quadrants?.[q.key];
          const items = quadInfo?.items || [];

          return (
            <div
              key={q.key}
              className={`rounded-2xl bg-surface-container-lowest border ${q.border} flex flex-col min-h-[380px] shadow-lg overflow-hidden`}
            >
              {/* Quadrant Header */}
              <div className={`p-space-md ${q.headerBg} border-b border-surface-container-low flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">{q.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wide">{q.title}</span>
                    <span className="text-[10px] text-on-surface-variant">{q.subtitle}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${q.badge}`}>
                  {items.length} {items.length === 1 ? 'tarea' : 'tareas'}
                </span>
              </div>

              {/* Tasks List */}
              <div className="p-space-md flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-[420px]">
                {loading ? (
                  <div className="text-center py-12 text-xs text-outline">Cargando matriz...</div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12 text-xs text-outline italic">
                    Sin tareas en este cuadrante
                  </div>
                ) : (
                  items.map(task => {
                    const isDone = task.is_completed || task.status === 'done';
                    return (
                      <div
                        key={task.id}
                        className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all border border-surface-variant/20 flex flex-col gap-2 group shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => handleStatusChange(task.id, isDone ? 'todo' : 'done')}
                              className="w-4 h-4 rounded bg-surface-container-highest cursor-pointer accent-primary-container shrink-0"
                            />
                            <span
                              onClick={() => onEditTask(task)}
                              className={`text-xs font-semibold cursor-pointer hover:text-primary transition-colors truncate ${
                                isDone ? 'line-through text-on-surface-variant' : 'text-on-surface'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-primary shrink-0">
                            {task.code}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-surface-container-low">
                          <div className="flex items-center gap-2">
                            {task.assignee && (
                              <div className="flex items-center gap-1">
                                <img
                                  className="w-5 h-5 rounded-full object-cover"
                                  src={task.assignee.avatar_url}
                                  alt={task.assignee.name}
                                />
                                <span className="text-xs text-on-surface-variant truncate max-w-[90px]">
                                  {task.assignee.name.split(' ')[0]}
                                </span>
                              </div>
                            )}
                            <span className="text-[10px] text-outline">📅 {task.due_date || 'Sin fecha'}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-container-highest text-secondary font-semibold">
                              {task.progress_percent || 0}%
                            </span>
                            <button
                              onClick={() => onEditTask(task)}
                              className="text-outline hover:text-on-surface opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
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
    </div>
  );
}
