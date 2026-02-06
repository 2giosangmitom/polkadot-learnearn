import { CheckCircle2 } from 'lucide-react';
import { Module } from '@/constants/modules';

interface ModuleCardProps {
  module: Module;
  isPaid: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  onClick: () => void;
}

export function ModuleCard({
  module,
  isPaid,
  isCompleted,
  isCurrent,
  onClick,
}: ModuleCardProps) {
  return (
    <div
      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${
        isCurrent
          ? 'border-slate-400 bg-slate-900'
          : isCompleted
          ? 'border-emerald-300 bg-emerald-900/20'
          : isPaid
          ? 'border-slate-700 bg-slate-900'
          : 'border-slate-800 bg-slate-900'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-slate-50">{module.title}</h4>
          <p className="text-xs text-slate-300">Tuition: {module.tuition} PAS</p>
          {typeof module.lessonsCount === 'number' && (
            <p className="text-[11px] text-slate-400">Lessons: {module.lessonsCount}</p>
          )}
        </div>
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : isPaid ? (
          <span className="text-[11px] px-2 py-[2px] rounded-full bg-slate-800 text-slate-100 font-semibold">
            Paid
          </span>
        ) : null}
      </div>
      <p className="text-sm text-slate-200">{module.description}</p>
    </div>
  );
}
