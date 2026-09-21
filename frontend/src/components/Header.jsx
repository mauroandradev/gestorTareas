import React from 'react';

export default function Header({ searchQuery, setSearchQuery, onOpenCreateModal, currentUser }) {
  const user = currentUser || {
    name: 'Elena Vega',
    role: 'Líder de Proyecto',
    avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkBq4PVTX3Y0GZ9LEr12SMzoRhKLZOP51w-CZ_7aZaYRQftOTQOz0ZZ8HkllW6VEDNICYTHLF9Xh3B8CP5QYHpVKj3XtrXw4B5ahLxcHvkB7x8HDzzc0far9Ol1wqM_Woz8wTteMRl7JnXvfaEV9JduwZTRPYGwVIaH1ec6QqaVHCdzRERMpBEmg5rN_cpq5kr5arDlPTwLMHi3neLwkHCwMJF5AwiPkisqMcHWuQ61Mfco1QJiVMgGA'
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-dim/80 backdrop-blur-xl z-40 px-space-xl flex items-center justify-between border-b border-surface-container-low shadow-sm">
      {/* Search Bar */}
      <div className="flex items-center flex-1 max-w-lg mr-space-lg">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            className="w-full pl-10 pr-space-md py-2 bg-surface-container-low text-on-surface placeholder-outline text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container border border-surface-variant/30 transition-all"
            placeholder="Buscar tareas por título, código o descripción..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-space-md">
        {/* Quick Action: New Task */}
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-space-lg py-2 bg-primary-container hover:bg-primary-container/90 text-on-primary rounded-lg text-sm font-medium transition-all shadow-[0_0_12px_rgba(79,70,229,0.35)] active:scale-[0.98]"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nueva Tarea</span>
        </button>

        {/* Notifications Icon */}
        <div className="relative flex items-center">
          <button
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors relative"
            type="button"
            title="Notificaciones"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary-container ring-2 ring-background"></span>
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-space-md pl-space-xs border-l border-surface-container-high">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-xs font-semibold text-on-surface">{user.name}</span>
            <span className="text-[10px] text-on-surface-variant">{user.role}</span>
          </div>
          <img
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-container/40"
            src={user.avatar_url}
          />
        </div>
      </div>
    </header>
  );
}
