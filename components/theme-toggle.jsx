"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle({ onToggle }) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-9 h-9" /> // Placeholder to prevent layout shift
    }

    const handleClick = () => {
        onToggle?.();
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <button
            onClick={handleClick}
            className="p-2 rounded-lg bg-transparent transition-transform hover:scale-110"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            ) : (
                <Moon className="h-5 w-5 text-[#030712] fill-white" />
            )}
        </button>
    )
}
