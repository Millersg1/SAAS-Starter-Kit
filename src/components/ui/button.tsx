import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ComponentProps<"button"> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "default";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
    asChild?: boolean;
}

function Button({ className, variant = "primary", size = "md", isLoading, children, disabled, asChild = false, ref, ...props }: ButtonProps) {
    const Comp = asChild ? Slot : "button";

    const baseStyles = `
      inline-flex items-center justify-center gap-2 font-medium rounded-lg
      transition-all duration-150 ease-in-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:pointer-events-none
    `;

    const variants: Record<string, string> = {
        primary: "bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-blue-500",
        secondary: "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500",
        outline: "border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white focus-visible:ring-blue-500",
        ghost: "text-foreground hover:bg-muted focus-visible:ring-blue-500",
        danger: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
        default: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary",
    };

    const sizes: Record<string, string> = {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
    };

    return (
        <Comp
            ref={ref}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
        </Comp>
    );
}

export { Button };
