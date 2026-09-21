import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, projects, selectedProject, setSelectedProject, onOpenCreateModal }) {
  const navItems = [
    { id: 'lista', label: 'Lista de Tareas', icon: 'checklist' },
    { id: 'matriz', label: 'Matriz Prioridades', icon: 'grid_view' },
    { id: 'calendario', label: 'Calendario', icon: 'calendar_month' },
    { id: 'metricas', label: 'Métricas de Equipo', icon: 'insights' },
    { id: 'historial', label: 'Historial / Auditoría', icon: 'history' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.4)] border-r border-surface-container-low">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Logo & Brand */}
        <div className="h-16 px-space-lg flex items-center gap-space-sm border-b border-surface-container-low/50">
          <img
            alt="TaskPulse Logo"
            className="h-8 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AEtjO1URpY6_v6dN4qWs8G7HguK6-N82jAfZqi9dDzw_ShbeS_52dDdTiuSOTUD3XO2JQdkd7r3L66APv7udS14jl4cLomoNPBJh787sUfvuo5Big2EBmTTSdzYlS7c1Vb34HW3BeLrMf6OJLbc2AGj6-UeL_6z2ySeoUeZ8822VlE9DsHiQO8kJyl0M7-CWcN2nA-KCumbdr4C8M-4lZjW2_5plu9IQINQYMVire4dsVYd0a7M14h-ZOBsC2xcp"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-on-surface">TaskPulse</span>
            <span className="text-[10px] uppercase font-semibold text-primary tracking-widest">Enterprise MVP</span>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="px-space-md my-space-md">
          <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer border border-surface-variant/30">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-7 h-7 rounded bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs shadow-sm">
                OP
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs text-on-surface truncate font-semibold">Equipo de Operaciones</span>
                <span className="text-[10px] text-on-surface-variant truncate">Sede Central</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">unfold_more</span>
          </div>
        </div>

        {/* Main Platform Navigation */}
        <div className="px-space-md mb-space-xs">
          <span className="px-space-sm text-[11px] font-semibold uppercase tracking-wider text-outline">Plataforma</span>
        </div>
        <nav className="px-space-md flex flex-col gap-1 mb-space-lg">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'lista') setSelectedProject(null);
                }}
                className={`flex items-center gap-space-md px-space-md py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold shadow-md shadow-primary-container/20'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-on-primary' : 'text-outline'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-space-md px-space-md py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-secondary/10 transition-all text-left mt-1 border border-secondary/20"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary">add_task</span>
            <span>+ Nueva Tarea</span>
          </button>
        </nav>

        {/* Active Projects Navigation */}
        <div className="px-space-md mb-space-xs flex items-center justify-between">
          <span className="px-space-sm text-[11px] font-semibold uppercase tracking-wider text-outline">Proyectos Activos</span>
          {selectedProject && (
            <button
              onClick={() => setSelectedProject(null)}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              Ver todos
            </button>
          )}
        </div>
        <div className="px-space-md flex flex-col gap-1">
          {projects.map((proj) => {
            const isSelected = selectedProject === proj.id;
            const colorClass =
              proj.color === 'secondary'
                ? 'bg-secondary'
                : proj.color === 'tertiary'
                ? 'bg-tertiary'
                : 'bg-primary-fixed';

            return (
              <button
                key={proj.id}
                onClick={() => {
                  setSelectedProject(isSelected ? null : proj.id);
                  setActiveTab('lista');
                }}
                className={`flex items-center justify-between px-space-md py-2 rounded-lg text-xs transition-colors text-left ${
                  isSelected
                    ? 'bg-surface-container-high text-on-surface font-semibold border border-primary/30'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${colorClass} shrink-0`}></span>
                  <span className="truncate">{proj.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-semibold">
                  {proj.active_count || proj.task_count || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage / System Status Widget */}
      <div className="p-space-md bg-surface-container-lowest border-t border-surface-container-low">
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs border border-surface-variant/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              FastAPI + SQLite
            </span>
            <span className="text-[11px] text-primary font-bold">Online</span>
          </div>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary-container h-full w-[85%]"></div>
          </div>
          <span className="text-[10px] text-outline text-right">MVC Architecture</span>
        </div>
      </div>
    </aside>
  );
}
