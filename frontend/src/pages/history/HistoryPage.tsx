import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useTeamHistory } from "../../hooks/useRooms";
import { useSidebarNavigation } from "../../hooks/useSidebarNavigation";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

type TeamHistoryItem = {
  team_id: number | string;
  team_number: number;
  status: string;
  finished_at: string | null;
  average_rating: number | null;
  feedback_count: number;
  room: {
    id: number | string | null;
    room_code: string | null;
    project_theme: string | null;
    status: string | null;
  };
};

function formatDate(dateString: string | null) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (Number.isNaN(date.valueOf())) return "Recently";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function ratingLabel(rating: number | null) {
  if (rating === null) return "No rating";
  return rating.toFixed(1);
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const { data: historyData, isLoading, error } = useTeamHistory();

  const { activeNav, handleNavClick } = useSidebarNavigation("History");
  const [loggingOut, setLoggingOut] = useState(false);

  const historyItems = (historyData ?? []) as TeamHistoryItem[];

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  const summary = useMemo(() => {
    const completedTeams = historyItems.length;
    const ratedTeams = historyItems.filter((item) => item.average_rating !== null);
    const ratingAverage = ratedTeams.length === 0
      ? null
      : ratedTeams.reduce((sum, item) => sum + (item.average_rating ?? 0), 0) / ratedTeams.length;

    return {
      completedTeams,
      ratedTeams: ratedTeams.length,
      ratingAverage: ratingAverage === null ? null : Number(ratingAverage.toFixed(1)),
    };
  }, [historyItems]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
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
            { label: "History" },
          ]}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-10">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-[28px] font-bold m-0 text-slate-50">History</h1>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Completed teams you were part of, plus the average rating you gave inside each team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-pp-card border border-pp-border rounded-2xl p-5">
              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Completed teams</div>
              <div className="mt-2 text-3xl font-bold text-slate-50">{summary.completedTeams}</div>
            </div>
            <div className="bg-pp-card border border-pp-border rounded-2xl p-5">
              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Rated teams</div>
              <div className="mt-2 text-3xl font-bold text-slate-50">{summary.ratedTeams}</div>
            </div>
            <div className="bg-pp-card border border-pp-border rounded-2xl p-5">
              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Average rating</div>
              <div className="mt-2 text-3xl font-bold text-slate-50">
                {summary.ratingAverage === null ? "-" : summary.ratingAverage.toFixed(1)}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="bg-pp-card border border-pp-border rounded-2xl px-6 py-10 text-center text-slate-500 text-sm">
              Loading history...
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-pp-card border border-red-500 rounded-2xl px-6 py-10 text-center text-red-400 text-sm">
              Failed to load history.
            </div>
          )}

          {!isLoading && !error && historyItems.length === 0 && (
            <div className="bg-pp-card border border-pp-border rounded-2xl px-6 py-10 text-center text-slate-500 text-sm">
              No completed teams yet.
            </div>
          )}

          <div className="space-y-4">
            {historyItems.map((item) => (
              <div
                key={item.team_id}
                className="bg-pp-card border border-pp-border rounded-2xl p-5 hover:border-blue-500/40 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] border border-emerald-400/40 text-emerald-300 bg-emerald-400/10">
                        {item.status}
                      </span>
                      <span className="text-[11px] text-slate-500">Team #{item.team_number}</span>
                    </div>
                    <div className="text-base font-semibold text-slate-50 truncate">
                      {item.room.project_theme ?? "Untitled room"}
                    </div>
                    <div className="text-[12px] text-slate-500">
                      Room <span className="font-mono text-slate-300">{item.room.room_code ?? "-"}</span> · Finished {formatDate(item.finished_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Your average rating</div>
                      <div className="mt-1 text-2xl font-bold text-slate-50">{ratingLabel(item.average_rating)}</div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#12243b,#1e3758)] border border-pp-border flex items-center justify-center text-lg font-bold text-blue-200">
                      {item.room.project_theme?.slice(0, 2).toUpperCase() ?? "PP"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
                  <span className="px-2.5 py-1 rounded-full border border-pp-border bg-pp-elevated">
                    {item.feedback_count} feedbacks given
                  </span>
                  <span className="px-2.5 py-1 rounded-full border border-pp-border bg-pp-elevated">
                    Room status: {item.room.status ?? "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}