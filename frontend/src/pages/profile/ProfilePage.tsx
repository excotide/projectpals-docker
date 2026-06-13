import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useMyRooms, useMyFeedbackSummary } from "../../hooks/useRooms";
import { useSidebarNavigation } from "../../hooks/useSidebarNavigation";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

type RoomStatus = "open" | "matching" | "ongoing" | "closed";

type RoomItem = {
  id: number | string;
  project_theme?: string;
  room_code?: string;
  status?: RoomStatus;
  created_at?: string;
};

const STATUS_BADGE: Record<RoomStatus, { label: string; className: string }> = {
  open: {
    label: "Active",
    className: "border-emerald-400 text-emerald-400 bg-emerald-400/10",
  },
  matching: {
    label: "Matching",
    className: "border-violet-400 text-violet-400 bg-violet-400/10",
  },
  ongoing: {
    label: "Ongoing",
    className: "border-blue-400 text-blue-400 bg-blue-400/10",
  },
  closed: {
    label: "Completed",
    className: "border-slate-500 text-slate-400 bg-slate-500/10",
  },
};

function getBadge(status?: RoomStatus) {
  const fallback = { label: "Unknown", className: "border-slate-500 text-slate-400 bg-slate-500/10" };
  return status ? STATUS_BADGE[status] ?? fallback : fallback;
}

function formatDate(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="text-amber-400 text-sm leading-none" aria-label={`${value} of 5`}>
      {"★".repeat(rounded)}
      <span className="text-slate-600">{"★".repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: roomsData, isLoading: roomsLoading, error: roomsError } = useMyRooms();
  const { data: feedbackSummary, isLoading: feedbackLoading } = useMyFeedbackSummary();
  const logoutMutation = useLogout();

  const { activeNav, handleNavClick } = useSidebarNavigation("Profile");
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "user@projectpals.id";
  const displayHandle = displayEmail.includes("@")
    ? `@${displayEmail.split("@")[0]}`
    : "@projectpals";
  const displayId = user?.id ?? "-";

  const initials = useMemo(() => {
    if (!displayName) return "U";
    const parts = displayName.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [displayName]);

  const rooms = (roomsData ?? []) as RoomItem[];
  const historyItems = rooms.slice(0, 4);

  const roleRatings = feedbackSummary?.role_ratings ?? [];
  const feedbacks = feedbackSummary?.feedbacks ?? [];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutMutation.mutateAsync(); }
    finally { navigate("/login", { replace: true }); setLoggingOut(false); }
  };

  return (
    <div className="flex h-screen bg-pp-bg font-sans text-slate-100 overflow-hidden">
      <Sidebar
        activeNav={activeNav}
        onNavClick={handleNavClick}
        loggingOut={loggingOut}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          initials={initials}
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Profile" },
          ]}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-10">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
            <div className="space-y-6">
              <section className="bg-pp-card border border-pp-border rounded-2xl px-6 py-7">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="relative">
                    <div className="w-[92px] h-[92px] rounded-2xl bg-[linear-gradient(135deg,#1f2a44,#3759a6)] border border-blue-500/40 flex items-center justify-center text-2xl font-bold text-blue-100">
                      {initials}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-blue-600 border-2 border-pp-card flex items-center justify-center text-[11px] font-bold text-white">
                      +
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h1 className="text-xl font-semibold text-slate-50">{displayName}</h1>
                    <div className="text-sm text-blue-400 font-medium">{displayHandle}</div>
                    <p className="text-xs text-slate-500">{displayEmail}</p>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="uppercase tracking-[0.3em]">User ID</span>
                    <span className="font-mono text-slate-200">{displayId}</span>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-[220px] py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </section>

              <section className="bg-pp-card border border-pp-border rounded-2xl px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-50">Project History</h2>
                  <div className="flex items-center gap-2">
                    <button className="w-8 h-8 rounded-lg border border-pp-border bg-pp-elevated text-slate-400 hover:text-slate-200">#</button>
                    <button className="w-8 h-8 rounded-lg border border-pp-border bg-blue-600 text-white hover:bg-blue-500">+</button>
                  </div>
                </div>

                {roomsLoading && (
                  <div className="text-sm text-slate-500">Loading history...</div>
                )}

                {!roomsLoading && roomsError && (
                  <div className="text-sm text-red-400">Failed to load history.</div>
                )}

                {!roomsLoading && !roomsError && historyItems.length === 0 && (
                  <div className="text-sm text-slate-500">No projects yet.</div>
                )}

                <div className="space-y-3">
                  {historyItems.map((room) => {
                    const badge = getBadge(room.status);
                    return (
                      <button
                        key={room.id}
                        onClick={() => room.room_code && navigate(`/rooms/${room.room_code}`)}
                        className="w-full text-left flex items-center gap-4 bg-pp-elevated border border-pp-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors"
                      >
                        <div className="w-[70px] h-[70px] rounded-xl bg-[linear-gradient(135deg,#1a2335,#2b3652)] border border-pp-border flex items-center justify-center text-xs font-semibold text-slate-300">
                          {room.project_theme?.slice(0, 2).toUpperCase() ?? "PP"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-slate-100 truncate">
                            {room.project_theme ?? "Untitled Room"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatDate(room.created_at) || "Recently"}
                          </div>
                        </div>

                        <div className="text-slate-500">&gt;</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="bg-pp-card border border-pp-border rounded-2xl p-5">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Average Rating by Role</div>
                {feedbackLoading && (
                  <div className="text-sm text-slate-500">Loading...</div>
                )}
                {!feedbackLoading && roleRatings.length === 0 && (
                  <div className="text-sm text-slate-500">Belum ada rating.</div>
                )}
                <div className="space-y-2">
                  {roleRatings.map((r) => (
                    <div
                      key={r.role}
                      className="flex items-center justify-between bg-pp-elevated border border-pp-border rounded-xl px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-100 truncate">{r.role}</div>
                        <div className="text-[10px] text-slate-500">{r.count} feedback</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Stars value={r.avg_rating} />
                        <span className="text-sm font-semibold text-blue-200">{r.avg_rating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-pp-card border border-pp-border rounded-2xl p-5">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Feedback from Teammates</div>
                {feedbackLoading && (
                  <div className="text-sm text-slate-500">Loading...</div>
                )}
                {!feedbackLoading && feedbacks.length === 0 && (
                  <div className="text-sm text-slate-500">Belum ada feedback.</div>
                )}
                <div className="space-y-3">
                  {feedbacks.map((f) => (
                    <div key={f.id} className="bg-pp-elevated border border-pp-border rounded-xl p-3">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,#1f2a44,#3759a6)] border border-blue-500/40 flex items-center justify-center text-[11px] font-bold text-blue-100 shrink-0">
                          {initialsOf(f.from_user?.name ?? "?")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-100 truncate">{f.from_user?.name ?? "Anonymous"}</div>
                          {f.to_assigned_role && (
                            <div className="text-[10px] text-slate-500">as {f.to_assigned_role}</div>
                          )}
                        </div>
                        {f.rating != null && <Stars value={f.rating} />}
                      </div>
                      {f.content && (
                        <p className="text-[12px] text-slate-400 leading-relaxed">{f.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
