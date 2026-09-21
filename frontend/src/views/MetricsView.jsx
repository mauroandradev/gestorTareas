import React, { useState, useEffect } from 'react';
import { TaskPulseAPI } from '../services/api';

export default function MetricsView() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await TaskPulseAPI.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-xs text-outline">Calculando métricas y KPIs en tiempo real...</div>;
  }

  if (!metrics) {
    return <div className="text-center py-20 text-xs text-error">No se pudieron cargar las métricas.</div>;
  }

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm text-primary text-xs uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>Analítica Operativa en Tiempo Real</span>
            <span className="text-outline">/</span>
            <span className="text-on-surface-variant font-mono">SPRINT-ACTIVO</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Métricas de Rendimiento y Carga de Trabajo
          </h1>
          <p className="text-xs text-on-surface-variant">
            Supervisa el ritmo de entrega de los equipos, el equilibrio de capacidad técnica y la resolución de incidentes críticos.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Actualizar KPIs</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Total Tareas */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-md border border-surface-container-low flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-outline uppercase tracking-wider font-semibold">Volumen Global</span>
              <span className="text-sm font-semibold text-on-surface">Total Tareas</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-space-md">
            <span className="text-3xl font-bold text-on-surface">{metrics.total_tasks}</span>
            <span className="text-xs text-secondary font-semibold bg-secondary/10 px-2 py-0.5 rounded-full">
              {metrics.active_tasks} activas
            </span>
          </div>
        </div>

        {/* Card 2: Tasa de Completitud */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-md border border-surface-container-low flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-outline uppercase tracking-wider font-semibold">Efectividad</span>
              <span className="text-sm font-semibold text-on-surface">Tasa de Completitud</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">donut_large</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-space-md">
            <span className="text-3xl font-bold text-on-surface">{metrics.completion_rate}%</span>
            <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
              {metrics.completed_tasks} finalizadas
            </span>
          </div>
        </div>

        {/* Card 3: Story Points */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-md border border-surface-container-low flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-outline uppercase tracking-wider font-semibold">Velocidad Técnica</span>
              <span className="text-sm font-semibold text-on-surface">Story Points</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary-fixed/20 flex items-center justify-center text-primary-fixed">
              <span className="material-symbols-outlined text-[20px]">speed</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-space-md">
            <span className="text-3xl font-bold text-on-surface">{metrics.total_story_points} <span className="text-xs text-outline font-normal">pts</span></span>
            <span className="text-xs text-secondary font-semibold bg-secondary/10 px-2 py-0.5 rounded-full">
              {metrics.completed_story_points} logrados
            </span>
          </div>
        </div>

        {/* Card 4: Tareas Vencidas */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-md border border-surface-container-low flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-outline uppercase tracking-wider font-semibold">Atención / Alerta</span>
              <span className="text-sm font-semibold text-on-surface">Tareas Vencidas</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-error-container/20 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[20px]">alarm_off</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-space-md">
            <span className="text-3xl font-bold text-on-surface">{metrics.overdue_tasks}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${metrics.overdue_tasks > 0 ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-outline'}`}>
              {metrics.overdue_tasks > 0 ? 'Requiere Acción' : 'Al día'}
            </span>
          </div>
        </div>
      </div>

      {/* Team Workload Table */}
      <section className="flex flex-col rounded-xl bg-surface-container-lowest shadow-md overflow-hidden border border-surface-container-low">
        <div className="flex items-center justify-between px-space-lg py-3.5 bg-surface-container-low border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
            <h2 className="text-sm font-bold text-on-surface">Carga de Trabajo y Desempeño por Colaborador</h2>
          </div>
          <span className="text-[11px] text-outline">Capacidad del Equipo</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest text-outline text-[11px] font-semibold uppercase tracking-wider border-b border-surface-container-low">
                <th className="py-2.5 px-space-md">Colaborador</th>
                <th className="py-2.5 px-space-md">Rol / Especialidad</th>
                <th className="py-2.5 px-space-md text-center">Total Tareas</th>
                <th className="py-2.5 px-space-md text-center">En Progreso</th>
                <th className="py-2.5 px-space-md text-center">Completadas</th>
                <th className="py-2.5 px-space-md text-center">Story Points</th>
                <th className="py-2.5 px-space-md">Índice Eficiencia</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-surface-container-low/40">
              {metrics.members_workload?.map((m) => (
                <tr key={m.user_id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-2.5">
                      <img
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-primary/30"
                        src={m.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkBq4PVTX3Y0GZ9LEr12SMzoRhKLZOP51w-CZ_7aZaYRQftOTQOz0ZZ8HkllW6VEDNICYTHLF9Xh3B8CP5QYHpVKj3XtrXw4B5ahLxcHvkB7x8HDzzc0far9Ol1wqM_Woz8wTteMRl7JnXvfaEV9JduwZTRPYGwVIaH1ec6QqaVHCdzRERMpBEmg5rN_cpq5kr5arDlPTwLMHi3neLwkHCwMJF5AwiPkisqMcHWuQ61Mfco1QJiVMgGA'}
                        alt={m.name}
                      />
                      <span className="font-semibold text-on-surface">{m.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-space-md text-on-surface-variant font-medium">
                    {m.role}
                  </td>
                  <td className="py-3 px-space-md text-center font-bold text-on-surface">
                    {m.total_tasks}
                  </td>
                  <td className="py-3 px-space-md text-center text-secondary font-semibold">
                    {m.in_progress_tasks}
                  </td>
                  <td className="py-3 px-space-md text-center text-primary font-semibold">
                    {m.completed_tasks}
                  </td>
                  <td className="py-3 px-space-md text-center font-mono text-outline">
                    {m.story_points_total} pts
                  </td>
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-surface-container-highest h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary-container h-full transition-all duration-300"
                          style={{ width: `${m.efficiency_score}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] font-bold text-on-surface">{m.efficiency_score}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
