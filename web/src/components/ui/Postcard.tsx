import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import clsx from 'clsx';

type Tone = 'primary' | 'secondary' | 'quiet';
const toneClasses: Record<Tone, string> = { primary: '', secondary: 'pc-button-secondary', quiet: 'pc-button-quiet' };
const toneClass = (tone: Tone) => toneClasses[tone];

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }>(
  function Button({ tone = 'primary', className, type = 'button', ...props }, ref) {
    return <button ref={ref} type={type} className={clsx('pc-button', toneClass(tone), className)} {...props} />;
  },
);

export function ActionLink({ tone = 'primary', className, ...props }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return <Link className={clsx('pc-button', toneClass(tone), className)} {...props} />;
}

export function IconButton({ className, ...props }: ComponentProps<typeof Button> & { 'aria-label': string }) {
  return <Button className={clsx('pc-icon-button', className)} {...props} />;
}

export function Card({ className, elevated = false, ...props }: HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return <div className={clsx(elevated ? 'pc-card' : 'pc-surface', className)} {...props} />;
}

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="pc-page-header"><h1 className="font-display font-bold">{title}</h1>{children}</header>;
}

export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Field({ className, ...props }, ref) {
    return <input ref={ref} className={clsx('pc-field', className)} {...props} />;
  },
);

export function StatusPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="status" className={clsx('pc-status', className)} {...props}>{children}</div>;
}
