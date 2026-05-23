import { ReactNode } from "react";

interface NavItem {
  label: string;
  icon: ReactNode;
}

export interface SidebarProps {
  activeNav: string;
  onNavClick: (label: string) => void;
  loggingOut: boolean;
  onLogout: () => void;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" />
        <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" />
        <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" />
        <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Create Room",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    label: "Join Room",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4" />
        <line x1="19" y1="11" x2="19" y2="17" />
        <line x1="16" y1="14" x2="22" y2="14" />
      </svg>
    ),
  },
  {
    label: "My Rooms",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="9" x2="9" y2="21" />
      </svg>
    ),
  },
  {
    label: "History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
];

const BOTTOM_NAV: NavItem[] = [
  {
    label: "Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeNav, onNavClick, loggingOut, onLogout }: SidebarProps) {
  return (
    <aside className="w-[230px] min-w-[230px] bg-pp-bg border-r border-pp-border flex flex-col py-6">
      {/* Logo */}
      <div className="px-6 pb-7">
        <div className="font-bold text-[17px] text-white tracking-tight">ProjectPals</div>
        <div className="text-[11px] text-slate-500 mt-0.5">Precision Collaboration</div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.label;
          return (
            <button
              key={item.label}
              onClick={() => onNavClick(item.label)}
              className={`relative flex items-center gap-3 px-3 py-[9px] rounded-lg text-sm w-full text-left transition-colors duration-150 ${
                isActive
                  ? "bg-pp-active text-blue-500 font-semibold"
                  : "text-slate-500 font-normal hover:bg-pp-elevated hover:text-slate-400"
              }`}
            >
              {isActive && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-l-sm" />
              )}
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="border-t border-pp-border mx-6 my-3" />

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 px-3">
        {BOTTOM_NAV.map((item) => {
          const isActive = activeNav === item.label;
          return (
            <button
              key={item.label}
              onClick={() => onNavClick(item.label)}
              className={`relative flex items-center gap-3 px-3 py-[9px] rounded-lg text-sm w-full text-left transition-colors duration-150 ${
                isActive
                  ? "bg-pp-active text-blue-500 font-semibold"
                  : "text-slate-500 font-normal hover:bg-pp-elevated hover:text-slate-400"
              }`}
            >
              {isActive && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-l-sm" />
              )}
              {item.icon}
              {item.label}
            </button>
          );
        })}

        {/* Logout */}
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className={`flex items-center gap-3 px-3 py-[9px] rounded-lg text-sm w-full text-left transition-colors duration-150 ${
            loggingOut
              ? "text-slate-400 cursor-not-allowed opacity-60"
              : "text-red-500 hover:bg-pp-logout cursor-pointer"
          }`}
        >
          {loggingOut ? (
            <>
              <svg
                className="animate-spin"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Logging out...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
