import * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-5 text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-base leading-tight', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
