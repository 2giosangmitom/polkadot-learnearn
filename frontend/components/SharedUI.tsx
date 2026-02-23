'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Card Component
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'warning';
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, disabled, ...props }, ref) => {
    const baseStyles =
      'px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500';

    const variantStyles = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-600/20',
      secondary:
        'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 active:scale-95',
      outline:
        'bg-transparent border border-neutral-700 text-neutral-300 hover:bg-neutral-900 hover:border-neutral-600',
      warning:
        'bg-amber-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/30',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// Badge Component
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'default';
  className?: string;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      primary:
        'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30',
      success: 'bg-green-600/20 text-green-300 border border-green-600/30',
      warning: 'bg-amber-600/20 text-amber-300 border border-amber-600/30',
      default: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

// Input Component
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

// Textarea Component
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

// Label Component
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'block text-sm font-medium text-neutral-300 mb-2',
      className
    )}
    {...props}
  />
));
Label.displayName = 'Label';

// ProgressBar Component
interface ProgressBarProps {
  progress: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className,
}) => (
  <div
    className={cn(
      'w-full h-2 bg-neutral-800/50 rounded-full overflow-hidden border border-neutral-700/50',
      className
    )}
  >
    <div
      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500 ease-out shadow-lg shadow-indigo-500/30"
      style={{ width: `${progress}%` }}
    />
  </div>
);
