import { useState, useEffect } from "react";

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: string;
  delay: number;
}

export default function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  delay,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="mb-5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <label
        className="block text-xs font-semibold tracking-widest uppercase mb-2"
        style={{ color: "#7ec8e3" }}
      >
        {label}
      </label>

      <div
        className="relative flex items-center rounded-xl overflow-hidden"
        style={{
          background: focused ? "rgba(126,200,227,0.08)" : "rgba(255,255,255,0.04)",
          border: focused
            ? "1.5px solid rgba(126,200,227,0.6)"
            : "1.5px solid rgba(255,255,255,0.08)",
          transition: "all 0.3s ease",
          boxShadow: focused
            ? "0 0 20px rgba(126,200,227,0.12), inset 0 0 20px rgba(126,200,227,0.03)"
            : "none",
        }}
      >
        <span
          className="pl-4 pr-2 text-base select-none"
          style={{ color: focused ? "#7ec8e3" : "#4a6a7a" }}
        >
          {icon}
        </span>

        <input
          type={type === "password" && showPass ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-3.5 pr-4 text-sm outline-none"
          style={{ color: "#e2f4fa", fontFamily: "'DM Sans', sans-serif" }}
        />

        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="pr-4 text-xs select-none cursor-pointer"
            style={{ color: "#4a6a7a", transition: "color 0.2s" }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#7ec8e3")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#4a6a7a")}
          >
            {showPass ? "👁️" : "🙈"}
          </button>
        )}
      </div>
    </div>
  );
}
