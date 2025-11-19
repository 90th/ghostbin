/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                bg: {
                    DEFAULT: '#09090b', // zinc-950
                    surface: '#18181b', // zinc-900
                    dark: '#000000',
                },
                brand: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6', // violet-500
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                    950: '#2e1065',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
        },
    },
    plugins: [],
}
