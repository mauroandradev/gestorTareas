import React, { useState } from 'react';

export default function CalendarView({ tasks, onEditTask, onOpenCreateModal }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now.getDate());
  };

  // Build calendar matrix
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const daysArray = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push({ day: null, isCurrentMonth: false });
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.due_date === dateStr);
    daysArray.push({ day: d, isCurrentMonth: true, dateStr, tasks: dayTasks });
  }

  // Selected day tasks
  const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const agendaTasks = tasks.filter(t => t.due_date === selectedDateStr);

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      {/* Calendar Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-md">
        {/* Month Selector */}
        <div className="flex items-center gap-space-md flex-wrap">
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl shadow-sm border border-surface-container-low">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              title="Mes Anterior"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="px-4 py-1 text-center min-w-[160px]">
              <span className="text-base font-bold text-on-surface tracking-tight">
                {monthNames[month]} {year}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              title="Mes Siguiente"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold shadow-sm transition-colors border border-surface-container-low"
          >
            Hoy
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-primary-container/90 text-on-primary rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Programar Tarea</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Calendar Grid + Agenda Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* Calendar Grid (9 Cols) */}
        <div className="xl:col-span-8 flex flex-col bg-surface-container-lowest rounded-2xl p-space-md shadow-xl border border-surface-container-low">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(w => (
              <div key={w} className="py-1 text-xs font-bold uppercase tracking-wider text-outline">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {daysArray.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="min-h-[100px] p-2 rounded-xl bg-surface-container-low/30 opacity-20 border border-transparent"
                  ></div>
                );
              }

              const isSelected = item.day === selectedDay;
              const hasTasks = item.tasks && item.tasks.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(item.day)}
                  className={`min-h-[110px] p-2 rounded-xl flex flex-col justify-between transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-surface-container-high border-primary/50 shadow-md ring-1 ring-primary/40'
                      : 'bg-surface-container-low hover:bg-surface-container border-surface-variant/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {item.day}
                    </span>
                    {hasTasks && (
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                    )}
                  </div>

                  {/* Day task preview chips */}
                  <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                    {item.tasks?.slice(0, 2).map(t => (
                      <div
                        key={t.id}
                        onClick={(e) => { e.stopPropagation(); onEditTask(t); }}
                        className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] truncate hover:bg-primary-container hover:text-on-primary transition-colors"
                      >
                        {t.title}
                      </div>
                    ))}
                    {item.tasks?.length > 2 && (
                      <span className="text-[9px] text-outline">+{item.tasks.length - 2} más</span>
                    )}
                  </div>
                  <div className="h-1"></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agenda Sidebar (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col bg-surface-container-low rounded-2xl p-space-lg shadow-xl border border-surface-container-low gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Agenda del Día</span>
              <span className="text-sm font-semibold text-on-surface">
                {selectedDay} de {monthNames[month]} {year}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-xs font-bold text-on-surface">
              {agendaTasks.length} {agendaTasks.length === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto">
            {agendaTasks.length === 0 ? (
              <div className="text-center py-10 text-xs text-outline italic">
                No hay tareas programadas para este día.
              </div>
            ) : (
              agendaTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onEditTask(t)}
                  className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-surface-variant/20 cursor-pointer flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary font-mono">{t.code}</span>
                    <span className="text-[10px] text-outline font-semibold">🕒 {t.due_time || '18:00'}</span>
                  </div>
                  <span className="text-xs font-semibold text-on-surface">{t.title}</span>
                  {t.assignee && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-on-surface-variant">
                      <img className="w-4 h-4 rounded-full object-cover" src={t.assignee.avatar_url} alt={t.assignee.name} />
                      <span>{t.assignee.name}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
