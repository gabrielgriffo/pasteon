// src/features/auto-docs/StatsCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export function StatsCard({ title, value, description, icon: Icon, variant = 'default' }: StatsCardProps) {
  const colorClasses = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className="py-2 gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-1 pt-2 gap-0">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        <div className={`p-1 rounded-md ${colorClasses[variant]}`}>
          <Icon className="h-3 w-3" />
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2">
        <div className="text-lg font-bold">{value}</div>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
