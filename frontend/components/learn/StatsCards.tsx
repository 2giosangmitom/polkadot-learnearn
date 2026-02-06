import { BookOpen, Trophy, Coins } from 'lucide-react';

interface StatsCardProps {
  modulesCount: number;
  totalModules: number;
  tuitionPaid: number;
  totalTuition: number;
  balance: string;
}

export function StatsCards({
  modulesCount,
  totalModules,
  tuitionPaid,
  totalTuition,
  balance,
}: StatsCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-card rounded-xl p-6 shadow-md border-2 border-secondary hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-lg">
            <BookOpen className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Modules unlocked</p>
            <p className="text-2xl font-bold text-primary">
              {modulesCount} / {totalModules}
            </p>
            <p className="text-xs text-muted-foreground">
              Tuition sent: {tuitionPaid.toFixed(2)} / {totalTuition} PAS
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-md border-2 border-secondary hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-lg">
            <Trophy className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rewards (coming soon)</p>
            <p className="text-2xl font-bold text-primary">SMOL402</p>
            <p className="text-xs text-muted-foreground">
              Earn unlocks once payment rails land
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-md border-2 border-secondary hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-lg">
            <Coins className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Wallet balance</p>
            <p className="text-2xl font-bold text-primary">{balance} PAS</p>
            <p className="text-xs text-muted-foreground">
              Rewards auto-sent via SMOL402
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
