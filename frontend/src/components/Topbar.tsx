import { useNavigate } from "react-router-dom";

type BreadcrumbItem = {
  label: string;
  to?: string;
  mono?: boolean;
  muted?: boolean;
};

type TopbarProps = {
  initials: string;
  breadcrumbs: BreadcrumbItem[];
};

const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function Topbar({ initials, breadcrumbs }: TopbarProps) {
  const navigate = useNavigate();
  const visibleCrumbs = breadcrumbs.filter((item) => item.label.trim().length > 0);

  return (
    <header className="h-[60px] border-b border-pp-border flex items-center justify-between px-7 gap-6 bg-pp-bg shrink-0">
      <div className="flex items-center gap-2 text-sm text-[#8892a4] min-w-0">
        {visibleCrumbs.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2 min-w-0">
            {item.to ? (
              <button
                className={`border-none bg-transparent p-0 cursor-pointer hover:text-slate-300 transition-colors truncate ${
                  item.mono ? "font-mono" : ""
                } ${item.muted ? "text-slate-600" : "text-[#8892a4]"}`}
                onClick={() => navigate(item.to as string)}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`truncate ${item.mono ? "font-mono" : ""} ${
                  item.muted ? "text-slate-600" : "text-slate-200 font-semibold"
                }`}
              >
                {item.label}
              </span>
            )}
            {index < visibleCrumbs.length - 1 && <IconChevron />}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-pp-elevated border border-pp-border rounded-[24px] px-4 py-[7px] gap-2 w-[260px]">
          <IconSearch />
          <input
            placeholder="Search projects..."
            className="bg-transparent border-none outline-none text-slate-400 text-[13px] flex-1 placeholder:text-slate-600"
          />
        </div>
        <button className="bg-transparent border-none cursor-pointer text-slate-500 p-1 hover:text-slate-300 transition-colors">
          <IconBell />
        </button>
        <button className="bg-transparent border-none cursor-pointer text-slate-500 p-1 hover:text-slate-300 transition-colors">
          <IconHelp />
        </button>
        <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-[13px] font-bold text-white cursor-pointer border-2 border-blue-600">
          {initials}
        </div>
      </div>
    </header>
  );
}
