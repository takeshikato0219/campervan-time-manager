import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation min-h-[44px] min-w-[44px]",
    {
        variants: {
            variant: {
                default: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 active:opacity-80",
                destructive: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:opacity-90 active:opacity-80",
                outline: "border border-[hsl(var(--input))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] active:opacity-80",
                secondary: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:opacity-80 active:opacity-70",
                ghost: "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] active:opacity-80",
                link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2 min-h-[44px]",
                sm: "h-9 rounded-md px-3 min-h-[44px] min-w-[44px]",
                lg: "h-11 rounded-md px-8 min-h-[44px]",
                icon: "h-10 w-10 min-h-[44px] min-w-[44px]",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp 
                className={cn(buttonVariants({ variant, size, className }))} 
                ref={ref} 
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', ...props.style }}
                {...props} 
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };

