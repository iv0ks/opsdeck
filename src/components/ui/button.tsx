import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground hover:bg-primary/85',
        outline:
          'border-input bg-transparent text-foreground hover:border-primary hover:text-primary',
        secondary: 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'border-transparent bg-transparent hover:bg-secondary',
        destructive:
          'border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-7 px-3 text-[11px]',
        lg: 'h-11 px-6 text-sm',
        icon: 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
