import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase',
  {
    variants: {
      variant: {
        default: 'border-primary/40 bg-primary/10 text-primary',
        warning: 'border-warning/40 bg-warning/10 text-warning',
        destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
        accent: 'border-accent/40 bg-accent/10 text-accent',
        outline: 'border-input bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
