import React, { useState, useEffect } from 'react';
import { TaskPulseAPI } from '../services/api';

export default function HistoryView() {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await TaskPulseAPI.getActivityHistory(50);
      setHistoryLogs(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'created':
        return { label: 'Creación', bg: 'bg-primary/20 text-primary', icon: 'add_circle' };
      case 'status_changed':
        return { label: 'Cambio Estado', bg: 'bg-secondary/20 text-secondary', icon: 'published_with_changes' };
      case 'subtask_toggled':
      case 'subtask_added':
        return { label: 'Subtarea', bg: 'bg-secondary-fixed/20 text-secondary-fixed', icon: 'task' };
      case 'priority_changed':
        return { label: 'Prioridad', bg: 'bg-tertiary-container/20 text-tertiary', icon: 'flag' };
      case 'deleted':
        return { label: 'Eliminada', bg: 'bg-error-container/20 text-error', icon: 'delete' };
      default:
        return { label: 'Actualización', bg: 'bg-surface-container-high text-on-surface-variant', icon: 'edit' };
    }
  };

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm text-secondary text-xs uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span>Trazabilidad y Auditoría</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Historial de Actividades del Equipo
          </h1>
          <p className="text-xs text-on-surface-variant">
            Bitácora cronológica inmutable de todas las acciones, transiciones de estado y entregables.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Actualizar Bitácora</span>
        </button>
      </div>

      {/* Timeline Section */}
      <section className="flex flex-col rounded-2xl bg-surface-container-lowest p-space-lg shadow-xl border border-surface-container-low">
        {loading ? (
          <div className="text-center py-16 text-xs text-outline">Cargando bitácora de auditoría...</div>
        ) : historyLogs.length === 0 ? (
          <div className="text-center py-16 text-xs text-outline italic">No hay registros de actividad aún.</div>
        ) : (
          <div className="relative border-l border-surface-container-high ml-4 flex flex-col gap-6 py-2">
            {historyLogs.map((log) => {
              const badge = getActionBadge(log.action);

              return (
                <div key={log.id} className="relative pl-6 flex flex-col gap-1.5 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-surface-container-low border border-surface-container-high flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[16px]">{badge.icon}</span>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold text-on-surface">{log.title}</span>
                    </div>
                    <span className="text-[11px] text-outline font-mono">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>

                  {log.details && (
                    <p className="text-xs text-on-surface-variant bg-surface-container-low/60 p-2.5 rounded-lg border border-surface-container-low font-sans">
                      {log.details}
                    </p>
                  )}

                  {log.user && (
                    <div className="flex items-center gap-1.5 text-[11px] text-outline pt-0.5">
                      <img className="w-4 h-4 rounded-full object-cover" src={log.user.avatar_url} alt={log.user.name} />
                      <span>{log.user.name}</span>
                      <span>•</span>
                      <span>{log.user.role}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
