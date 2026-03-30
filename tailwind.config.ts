import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces — 4 levels of elevation
        base: "#09090B",
        surface: {
          DEFAULT: "#141418",
          raised: "#1C1C22",
          high: "#222230",
          overlay: "#2A2A38",
        },
        // Borders
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          subtle: "rgba(255,255,255,0.04)",
          medium: "rgba(255,255,255,0.12)",
          strong: "rgba(255,255,255,0.22)",
        },
        // Text hierarchy
        ink: {
          DEFAULT: "#F4F4F5",
          secondary: "#A1A1AA",
          tertiary: "#52525B",
          disabled: "#3F3F46",
        },
        // Signature green
        green: {
          DEFAULT: "#00C875",
          bright: "#34D399",
          glow: "rgba(0,200,117,0.12)",
          subtle: "rgba(0,200,117,0.06)",
          border: "rgba(0,200,117,0.25)",
        },
        // Warm path — amber
        amber: {
          DEFAULT: "#F59E0B",
          bright: "#FCD34D",
          glow: "rgba(245,158,11,0.10)",
          subtle: "rgba(245,158,11,0.05)",
          border: "rgba(245,158,11,0.22)",
        },
        // Hot priority — red
        hot: {
          DEFAULT: "#EF4444",
          glow: "rgba(239,68,68,0.10)",
          border: "rgba(239,68,68,0.22)",
        },
        // Warm compat (existing references)
        warm: {
          DEFAULT: "#F59E0B",
          light: "rgba(245,158,11,0.10)",
        },
        accent: {
          DEFAULT: "#00C875",
          light: "rgba(0,200,117,0.10)",
          bright: "#34D399",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.025em",
        snug: "-0.015em",
        normal: "0",
        wide: "0.02em",
        wider: "0.06em",
        widest: "0.12em",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        "4xl": "36px",
        full: "9999px",
      },
      boxShadow: {
        // Card elevation system
        card: "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        "card-hover":
          "0 2px 4px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-lg":
          "0 4px 8px rgba(0,0,0,0.5), 0 20px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        // Glow effects
        "glow-green":
          "0 0 0 1px rgba(0,200,117,0.35), 0 0 28px rgba(0,200,117,0.15)",
        "glow-green-sm": "0 0 16px rgba(0,200,117,0.2)",
        "glow-amber": "0 0 0 1px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.12)",
        "glow-hot": "0 0 16px rgba(239,68,68,0.2)",
        // Focus
        "focus-ring":
          "0 0 0 1px rgba(0,200,117,0.4), 0 0 24px rgba(0,200,117,0.12), 0 4px 20px rgba(0,0,0,0.4)",
        // Navigation
        nav: "0 -1px 0 rgba(255,255,255,0.05), 0 -12px 40px rgba(0,0,0,0.6)",
        // Inner top highlight
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      animation: {
        "fade-up":
          "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 0.35s ease both",
        "fade-in-slow": "fadeIn 0.7s ease both",
        "scale-in":
          "scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-up":
          "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-left":
          "slideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "glow-breathe": "glowBreathe 4s ease-in-out infinite",
        "orb-pulse": "orbPulse 2.4s ease-in-out infinite",
        "ring-1": "ringPulse 2.8s ease-in-out infinite",
        "ring-2": "ringPulse 2.8s ease-in-out 0.5s infinite",
        "ring-3": "ringPulse 2.8s ease-in-out 1s infinite",
        "status-enter":
          "statusEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        typing: "typing 1.4s ease infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "spin-slow": "spin 3s linear infinite",
        "count-up": "countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        float: "float 7s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.90)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideLeft: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        glowBreathe: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        orbPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.08)", opacity: "1" },
        },
        ringPulse: {
          "0%": { transform: "scale(0.85)", opacity: "0.7" },
          "50%": { transform: "scale(1.18)", opacity: "0.15" },
          "100%": { transform: "scale(0.85)", opacity: "0.7" },
        },
        statusEnter: {
          "0%": {
            opacity: "0",
            transform: "translateY(10px) translateX(-4px)",
          },
          "100%": { opacity: "1", transform: "translateY(0) translateX(0)" },
        },
        typing: {
          "0%, 60%, 100%": { opacity: "0.2" },
          "30%": { opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
