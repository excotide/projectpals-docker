import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useMyRooms } from "../../hooks/useRooms";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

// ============================================================
// TYPES
// ============================================================
type RoomOwner = {
  id: number | string;
  name: string;
  username: string;
};

type RoomItem = {
  id: number | string;
  created_by?: number;
  project_theme?: string;
  room_code?: string;
  roles?: string[];
  productivity_windows?: string[];
  environments?: string[];
  max_per_group?: number;
  max_members?: number;
  number_of_groups?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  owner?: RoomOwner;
};

const STATUS_BADGE: Record<string, { border: string; text: string; label: string }> = {
  open:     { border: "border-green-500",   text: "text-green-500",   label: "Open" },
  matching: { border: "border-purple-400",  text: "text-purple-400",  label: "Matching" },
  ongoing:  { border: "border-blue-500",    text: "text-blue-500",    label: "Ongoing" },
  matched:  { border: "border-emerald-500", text: "text-emerald-400", label: "Matched" },
  closed:   { border: "border-slate-500",   text: "text-slate-500",   label: "Closed" },
};

const FILTER_TABS = [
  { key: "all",      label: "All" },
  { key: "open",     label: "Open" },
  { key: "matching", label: "Matching" },
  { key: "ongoing",  label: "Ongoing" },
] as const;
type FilterKey = typeof FILTER_TABS[number]["key"];

// ============================================================
// SUB-COMPONENT: StatusBadge
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { border: "border-slate-500", text: "text-slate-400", label: status };
  return (
    <span className={`border ${s.border} ${s.text} rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.2px] capitalize`}>
      {s.label}
    </span>
  );
}

// ============================================================
// SUB-COMPONENT: RoomCard
// ============================================================
function RoomCard({ room, onOpen }: { room: RoomItem; onOpen: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!room.room_code) return;
    navigator.clipboard.writeText(room.room_code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = room.created_at
    ? new Date(room.created_at).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : null;

  const visibleRoles = (room.roles ?? []).slice(0, 3);
  const extraRoles   = (room.roles ?? []).length - visibleRoles.length;

  return (
    <div className="bg-pp-card border border-pp-border rounded-[14px] p-5 flex flex-col gap-3.5 hover:border-blue-600 transition-colors duration-200">
      {/* Status + room code */}
      <div className="flex items-center justify-between">
        <StatusBadge status={room.status ?? ""} />
        <span className="font-mono text-[10px] text-slate-600 bg-pp-border px-2 py-0.5 rounded tracking-[0.08em]">
          {room.room_code ?? "—"}
        </span>
      </div>

      {/* Title + meta */}
      <div>
        <p className="font-semibold text-[15px] text-slate-100 mb-0.5">
          {room.project_theme ?? "Untitled Room"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {room.owner && (
            <span className="text-[11px] text-blue-500 font-medium">
              {room.owner.username}
            </span>
          )}
          {room.owner && formattedDate && (
            <span className="text-[11px] text-slate-700">·</span>
          )}
          {formattedDate && (
            <span className="text-[11px] text-slate-600">{formattedDate}</span>
          )}
        </div>
      </div>

      {/* Capacity */}
      {((room.max_members ?? room.max_per_group) || room.number_of_groups) && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {(room.max_members ?? room.max_per_group) && <span>{room.max_members ?? room.max_per_group} max members</span>}
          {(room.max_members ?? room.max_per_group) && room.number_of_groups && (
            <span className="text-slate-700">·</span>
          )}
          {room.number_of_groups && <span>{room.number_of_groups} teams</span>}
        </div>
      )}

      {/* Roles chips */}
      {visibleRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleRoles.map((role) => (
            <span
              key={role}
              className="px-2 py-0.5 bg-pp-elevated border border-pp-border rounded text-[11px] text-slate-400"
            >
              {role}
            </span>
          ))}
          {extraRoles > 0 && (
            <span className="px-2 py-0.5 bg-pp-elevated border border-pp-border rounded text-[11px] text-slate-600">
              +{extraRoles} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={handleCopy}
          className={`flex-1 py-2 border-none rounded-lg text-[13px] font-medium cursor-pointer transition-colors duration-200 ${
            copied
              ? "bg-emerald-900 text-emerald-400"
              : "bg-pp-border text-slate-400 hover:text-slate-200"
          }`}
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
        <button
          onClick={onOpen}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-white text-[13px] font-medium cursor-pointer transition-colors duration-200"
        >
          Open Room
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT: MyRooms
// ============================================================
export default function MyRooms() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const { data: roomsData, isLoading: roomsLoading, error: roomsQueryError } = useMyRooms();

  const [activeNav, setActiveNav] = useState("My Rooms");
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const rooms = (roomsData ?? []) as RoomItem[];
  const roomsError = roomsQueryError instanceof Error ? roomsQueryError.message : "";

  const filteredRooms = activeFilter === "all"
    ? rooms
    : rooms.filter((r) => r.status === activeFilter);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [user?.name]);

  const handleNavClick = (label: string) => {
    setActiveNav(label);
    if (label === "Dashboard")   navigate("/dashboard");
    if (label === "Create Room") navigate("/create-room");
    if (label === "Join Room")   navigate("/join-room");
    if (label === "Profile")     navigate("/profile");
    if (label === "History")     navigate("/history");
  };

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
            { label: "My Rooms" },
          ]}
        />

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-8 pb-10">
          {/* Header */}
          <div className="mb-7">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[28px] font-bold m-0 text-slate-50">My Rooms</h1>
              {!roomsLoading && !roomsError && (
                <span className="bg-pp-border text-slate-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {rooms.length}
                </span>
              )}
            </div>
            <p className="mt-0 text-[13px] text-slate-500">
              All the rooms you own or are a member of.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {FILTER_TABS.map(({ key, label }) => {
              const count = key === "all" ? rooms.length : rooms.filter((r) => r.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-colors duration-150 ${
                    activeFilter === key
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-transparent border-pp-border text-slate-500 hover:border-blue-500/50 hover:text-slate-400"
                  }`}
                >
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeFilter === key ? "bg-blue-500 text-white" : "bg-pp-border text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Loading */}
          {roomsLoading && (
            <div className="bg-pp-elevated border border-pp-border rounded-[14px] px-6 py-10 text-center text-slate-500 text-sm">
              Loading your rooms...
            </div>
          )}

          {/* Error */}
          {!roomsLoading && roomsError && (
            <div className="bg-pp-elevated border border-red-500 rounded-[14px] px-6 py-10 text-center text-red-400 text-sm">
              {roomsError}
            </div>
          )}

          {/* Empty */}
          {!roomsLoading && !roomsError && filteredRooms.length === 0 && (
            <div className="bg-pp-elevated border border-dashed border-pp-border rounded-[14px] px-6 py-12 text-center">
              <p className="text-slate-500 text-sm mb-4">
                {activeFilter === "all"
                  ? "You have no rooms yet."
                  : `No ${activeFilter} rooms found.`}
              </p>
              {activeFilter === "all" && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => navigate("/create-room")}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-white text-[13px] font-semibold cursor-pointer transition-colors"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => navigate("/join-room")}
                    className="px-5 py-2 bg-transparent border border-pp-border hover:border-blue-500 rounded-lg text-slate-400 hover:text-slate-200 text-[13px] font-semibold cursor-pointer transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Grid */}
          {!roomsLoading && !roomsError && filteredRooms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onOpen={() => navigate(`/rooms/${room.room_code}`)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
