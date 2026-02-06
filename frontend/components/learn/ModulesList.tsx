import { Module } from '@/constants/modules';
import { ModuleCard } from './ModuleCard';

interface ModulesListProps {
  modules: Module[];
  currentModule: string | null;
  paidModules: Set<string>;
  completedModules: Set<string>;
  onModuleSelect: (moduleId: string) => void;
}

export function ModulesList({
  modules,
  currentModule,
  paidModules,
  completedModules,
  onModuleSelect,
}: ModulesListProps) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800">
      <h3 className="text-xl font-bold text-slate-50 mb-4 pb-3 border-b border-slate-800">
        Courses
      </h3>
      <div className="space-y-3">
        {modules.map((module) => {
          const isPaid = paidModules.has(module.id);
          const isCompleted = completedModules.has(module.id);
          const isCurrent = module.id === currentModule;

          return (
            <ModuleCard
              key={module.id}
              module={module}
              isPaid={isPaid}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              onClick={() => onModuleSelect(module.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
