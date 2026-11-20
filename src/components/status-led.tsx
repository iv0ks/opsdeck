import { cn } from '@/lib/utils';

const tone = {
  operational: { led: 'bg-primary', text: 'text-primary', label: 'operational', pulse: false },
  degraded: { led: 'bg-warning', text: 'text-warning', label: 'degraded', pulse: true },
  outage: { led: 'bg-destructive', text: 'text-destructive', label: 'outage', pulse: true },
} as const;

export type StatusKey = keyof typeof tone;

export function StatusLed({ status, className }: { status: string; className?: string }) {
  const t = tone[status as StatusKey] ?? tone.operational;
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs uppercase', t.text, className)}>
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 rounded-full shadow-[0_0_8px_currentColor]',
          t.led,
          t.pulse && 'led-pulse',
        )}
      />
      {t.label}
    </span>
  );
}
