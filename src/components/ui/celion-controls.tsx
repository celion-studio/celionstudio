"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from "react";
import { useState } from "react";
import {
  CELION_COLOR,
  CELION_FONT,
  CELION_RADIUS,
} from "@/components/ui/celion-style";

type CelionButtonVariant = "primary" | "secondary" | "ghost";
type CelionButtonSize = "sm" | "md";
type CelionSegmentTone = "dark" | "soft";

type CelionButtonStyleOptions = {
  variant?: CelionButtonVariant;
  size?: CelionButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  hovered?: boolean;
};

const variantStyles: Record<CelionButtonVariant, {
  background: string;
  border: string;
  color: string;
  hoverBackground: string;
  hoverBorder: string;
  hoverColor: string;
}> = {
  primary: {
    background: CELION_COLOR.textStrong,
    border: CELION_COLOR.textStrong,
    color: CELION_COLOR.white,
    hoverBackground: "#2f3034",
    hoverBorder: "#2f3034",
    hoverColor: CELION_COLOR.white,
  },
  secondary: {
    background: CELION_COLOR.panel,
    border: "#dfe3e8",
    color: "#4f5661",
    hoverBackground: "#f4f4f5",
    hoverBorder: "#c5cad1",
    hoverColor: CELION_COLOR.textStrong,
  },
  ghost: {
    background: "transparent",
    border: "transparent",
    color: CELION_COLOR.muted,
    hoverBackground: "#f4f4f5",
    hoverBorder: "#f4f4f5",
    hoverColor: CELION_COLOR.textStrong,
  },
};

const sizeStyles: Record<CelionButtonSize, {
  minHeight: string;
  padding: string;
  fontSize: string;
}> = {
  sm: {
    minHeight: "30px",
    padding: "0 11px",
    fontSize: "12.5px",
  },
  md: {
    minHeight: "34px",
    padding: "0 14px",
    fontSize: "13px",
  },
};

export function getCelionButtonStyle({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  disabled = false,
  hovered = false,
}: CelionButtonStyleOptions = {}): CSSProperties {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const activeHover = hovered && !disabled;

  return {
    alignItems: "center",
    background: activeHover ? variantStyle.hoverBackground : variantStyle.background,
    border: `1px solid ${activeHover ? variantStyle.hoverBorder : variantStyle.border}`,
    borderRadius: CELION_RADIUS.control,
    color: activeHover ? variantStyle.hoverColor : variantStyle.color,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    fontFamily: CELION_FONT.display,
    fontSize: sizeStyle.fontSize,
    fontWeight: 500,
    gap: "6px",
    justifyContent: "center",
    lineHeight: 1,
    minHeight: sizeStyle.minHeight,
    opacity: disabled ? 0.5 : 1,
    padding: sizeStyle.padding,
    textDecorationLine: "none",
    width: fullWidth ? "100%" : undefined,
  };
}

type CelionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  size?: CelionButtonSize;
  variant?: CelionButtonVariant;
};

export function CelionButton({
  children,
  disabled,
  fullWidth,
  onMouseEnter,
  onMouseLeave,
  size = "md",
  style,
  type = "button",
  variant = "secondary",
  ...props
}: CelionButtonProps) {
  const [hovered, setHovered] = useState(false);

  function handleMouseEnter(event: MouseEvent<HTMLButtonElement>) {
    setHovered(true);
    onMouseEnter?.(event);
  }

  function handleMouseLeave(event: MouseEvent<HTMLButtonElement>) {
    setHovered(false);
    onMouseLeave?.(event);
  }

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...getCelionButtonStyle({ variant, size, fullWidth, disabled, hovered }),
        ...style,
      }}
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
  disabled,
  label,
  onMouseEnter,
  onMouseLeave,
  style,
  type = "button",
  ...props
}: CelionIconButtonProps) {
  const [hovered, setHovered] = useState(false);

  function handleMouseEnter(event: MouseEvent<HTMLButtonElement>) {
    setHovered(true);
    onMouseEnter?.(event);
  }

  function handleMouseLeave(event: MouseEvent<HTMLButtonElement>) {
    setHovered(false);
    onMouseLeave?.(event);
  }

  const activeHover = hovered && !disabled;

  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        alignItems: "center",
        background: activeHover ? CELION_COLOR.panelSoft : "transparent",
        border: `1px solid ${activeHover ? CELION_COLOR.lineSoft : "transparent"}`,
        borderRadius: CELION_RADIUS.control,
        color: disabled ? "#C9C3B8" : activeHover ? CELION_COLOR.text : CELION_COLOR.mutedSoft,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        height: "30px",
        justifyContent: "center",
        opacity: disabled ? 0.55 : 1,
        padding: 0,
        width: "30px",
        ...style,
      }}
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
  fullWidth,
  href,
  onMouseEnter,
  onMouseLeave,
  size = "md",
  style,
  variant = "secondary",
  ...props
}: CelionButtonLinkProps) {
  const [hovered, setHovered] = useState(false);

  function handleMouseEnter(event: MouseEvent<HTMLAnchorElement>) {
    setHovered(true);
    onMouseEnter?.(event);
  }

  function handleMouseLeave(event: MouseEvent<HTMLAnchorElement>) {
    setHovered(false);
    onMouseLeave?.(event);
  }

  return (
    <Link
      {...props}
      href={href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...getCelionButtonStyle({ variant, size, fullWidth, hovered }),
        ...style,
      }}
    >
      {children}
    </Link>
  );
}

export type CelionSegmentedOption<T extends string> = {
  ariaLabel?: string;
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
  const [hoveredValue, setHoveredValue] = useState<T | null>(null);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        background: CELION_COLOR.panel,
        border: "1px solid #dedee3",
        borderRadius: CELION_RADIUS.control,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        height: "30px",
        overflow: "hidden",
        padding: tone === "dark" ? "2px" : 0,
        width,
      }}
    >
      {options.map((option, index) => {
        const active = value === option.value;
        const hovered = hoveredValue === option.value;
        const activeBackground = tone === "dark" ? CELION_COLOR.textStrong : "#eeeeef";
        const activeColor = tone === "dark" ? CELION_COLOR.white : CELION_COLOR.textStrong;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.ariaLabel}
            aria-pressed={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            onMouseEnter={() => setHoveredValue(option.value)}
            onMouseLeave={() => setHoveredValue(null)}
            style={{
              alignItems: "center",
              background: active ? activeBackground : hovered ? "#f4f4f5" : "transparent",
              border: "none",
              borderLeft: tone === "soft" && index > 0 ? "1px solid #eeeeef" : "none",
              borderRadius: tone === "dark" ? "4px" : 0,
              color: active ? activeColor : "#52525b",
              cursor: "pointer",
              display: "inline-flex",
              fontFamily: CELION_FONT.display,
              fontSize: "12px",
              fontWeight: 500,
              justifyContent: "center",
              padding: 0,
              width: "100%",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
