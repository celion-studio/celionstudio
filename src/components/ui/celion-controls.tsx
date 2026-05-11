"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";

type CelionButtonVariant = "primary" | "secondary" | "ghost";
type CelionButtonSize = "sm" | "md";
type CelionSegmentTone = "dark" | "soft";

function joinClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CelionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  size?: CelionButtonSize;
  variant?: CelionButtonVariant;
};

export function CelionButton({
  children,
  className,
  disabled,
  fullWidth,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: CelionButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={joinClassNames("celion-button", className)}
      data-full-width={fullWidth ? "true" : "false"}
      data-size={size}
      data-variant={variant}
    >
      {children}
    </button>
  );
}

type CelionIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
};

export function CelionIconButton({
  children,
  className,
  disabled,
  label,
  type = "button",
  ...props
}: CelionIconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      disabled={disabled}
      className={joinClassNames("celion-icon-button", className)}
    >
      {children}
    </button>
  );
}

type CelionButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
  fullWidth?: boolean;
  href: LinkProps<string>["href"];
  size?: CelionButtonSize;
  variant?: CelionButtonVariant;
};

export function CelionButtonLink({
  children,
  className,
  fullWidth,
  href,
  size = "md",
  variant = "secondary",
  ...props
}: CelionButtonLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      className={joinClassNames("celion-button", className)}
      data-full-width={fullWidth ? "true" : "false"}
      data-size={size}
      data-variant={variant}
    >
      {children}
    </Link>
  );
}

export type CelionSegmentedOption<T extends string> = {
  ariaLabel?: string;
  disabled?: boolean;
  label: ReactNode;
  title?: string;
  value: T;
};

type CelionSegmentedControlProps<T extends string> = {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: CelionSegmentedOption<T>[];
  tone?: CelionSegmentTone;
  value: T;
  width?: string;
};

export function CelionSegmentedControl<T extends string>({
  ariaLabel,
  onChange,
  options,
  tone = "soft",
  value,
  width,
}: CelionSegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="celion-segmented"
      data-tone={tone}
      style={{
        "--celion-segment-count": options.length,
        "--celion-segment-width": width ?? "auto",
      } as CSSProperties}
    >
      {options.map((option, index) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.ariaLabel}
            aria-pressed={active}
            disabled={option.disabled}
            title={option.title}
            onClick={() => {
              if (!option.disabled) {
                onChange(option.value);
              }
            }}
            className="celion-segmented-option"
            data-active={active}
            data-index={index}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
