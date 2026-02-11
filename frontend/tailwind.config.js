/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'fade-in': 'fade-in 0.3s ease-out both',
                'fade-in-up': 'fade-in-up 0.4s ease-out both',
            },
        },
    },
    plugins: [],
}
