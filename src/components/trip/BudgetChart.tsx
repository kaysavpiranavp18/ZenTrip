'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { BudgetBreakdown } from '@/types';

const categoryColors: Record<string, string> = {
  transport: '#7CFC9A',
  stay: '#FFB454',
  food: '#7CFC9A',
  activities: '#FFB454',
  buffer: '#F0C868',
};

interface BudgetChartProps {
  budget: BudgetBreakdown;
}

export default function BudgetChart({ budget }: BudgetChartProps) {
  const data = budget.items.map((item) => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.amount,
    color: categoryColors[item.category] || '#82958A',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="glass rounded-lg p-3 text-xs shadow-elevated">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-white font-medium">{d.name}</span>
          </div>
          <div className="text-[#82958A]">
            ₹{d.value.toLocaleString()} ({Math.round((d.value / budget.total) * 100)}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={1200}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {data.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#82958A] truncate">{item.name}</div>
              <div className="text-xs text-white font-medium">₹{item.value.toLocaleString()}</div>
            </div>
            <div className="text-[10px] text-[#82958A]">{Math.round((item.value / budget.total) * 100)}%</div>
          </div>
        ))}
      </div>

      {budget.warnings.length > 0 && (
        <div className="space-y-1">
          {budget.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#FFB454]/5 text-[10px] text-[#FFB454]">
              <span className="mt-0.5 shrink-0">⚠️</span>
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
