/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: '#0b0f1a',
                surface: '#161e2e',
                'surface-2': '#242f41',
                accent: '#38bdf8',
                'accent-dim': 'rgba(56, 189, 248, 0.1)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
