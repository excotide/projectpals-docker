import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useMyRooms } from "../../hooks/useRooms";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

// ============================================================
// TYPES
// ============================================================
type RoomItem = {
  id: number;
  project_theme: string;
  room_code: string;
  status: "open" | "matching" | "ongoing";
};

type RoomDisplayStatus = "Ongoing" | "Waiting";

function mapRoomStatus(status: RoomItem["status"]): RoomDisplayStatus {
  if (status === "ongoing") return "Ongoing";
  return "Waiting";
}

const STATUS_BADGE_CLASSES: Record<RoomDisplayStatus, string> = {
  Ongoing:   "border-emerald-500 text-emerald-400",
  Waiting:   "border-slate-400 text-slate-400",
};

// ============================================================
// SUB-COMPONENT: StatusBadge
// ============================================================
function StatusBadge({ status }: { status: RoomDisplayStatus }) {
  return (
    <span
      className={`border ${STATUS_BADGE_CLASSES[status]} rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.2px]`}
    >
      {status}
    </span>
  );
}

// ============================================================
// SUB-COMPONENT: RoomCard
// ============================================================
function RoomCard({ room, onOpen }: { room: RoomItem; onOpen: () => void }) {
  const displayStatus = mapRoomStatus(room.status);
  return (
    <div className="bg-pp-elevated border border-pp-border rounded-[14px] px-5 pt-[18px] pb-5 flex flex-col gap-3.5 min-w-0 cursor-pointer hover:border-blue-600 transition-colors duration-200">
      {/* Status + room code */}
      <div className="flex items-center justify-between">
        <StatusBadge status={displayStatus} />
        <span className="font-mono text-[10px] text-slate-600 bg-pp-border px-2 py-0.5 rounded tracking-[0.08em]">
          {room.room_code}
        </span>
      </div>

      {/* Title */}
      <div>
        <p className="font-semibold text-[15px] text-slate-100 mb-1">{room.project_theme}</p>
        <p className="text-xs text-slate-500">Code: {room.room_code}</p>
      </div>

      {/* Open Room */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        className="w-full py-2.5 bg-pp-border hover:bg-blue-600 text-slate-300 hover:text-white border-none rounded-lg text-[13px] font-medium cursor-pointer transition-colors duration-200 mt-auto"
      >
        Open Room
      </button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT: Dashboard
// ============================================================
export default function Dashboard() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: user } = useCurrentUser();
  const { data: roomsData, isLoading: roomsLoading, error: roomsQueryError } = useMyRooms();
  const logoutMutation = useLogout();

  const rooms = (roomsData ?? []) as RoomItem[];
  const roomsError = roomsQueryError instanceof Error ? roomsQueryError.message : "";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [user?.name]);

  const displayName = user?.name || "User";
  const ongoingCount = rooms.filter((r) => r.status === "ongoing").length;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutMutation.mutateAsync(); }
    finally { navigate("/login", { replace: true }); setLoggingOut(false); }
  };

  const handleNavClick = (label: string) => {
    setActiveNav(label);
    if (label === "Create Room") navigate("/create-room");
    if (label === "Join Room")   navigate("/join-room");
    if (label === "My Rooms")    navigate("/my-rooms");
    if (label === "Profile")     navigate("/profile");
    if (label === "History")     navigate("/history");
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) navigate(`/rooms/${roomCode.trim()}`);
    else navigate("/join-room");
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
            { label: "ProjectPals", to: "/dashboard" },
            { label: "Dashboard" },
          ]}
        />

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto p-8 pb-10">
          {/* Welcome */}
          <div className="mb-7">
            <h1 className="text-[28px] font-bold m-0 text-slate-50">
              Welcome back, {displayName}!
            </h1>
            <p className="mt-1.5 text-[13px] text-slate-500">
              {today} &bull; You have {ongoingCount} Ongoing Project Today.
            </p>
          </div>

          {/* ── Action cards ── */}
          <div className="grid grid-cols-2 gap-5 mb-9">
            {/* Create Room card */}
            <div className="relative overflow-hidden rounded-2xl border border-pp-border p-7 bg-[linear-gradient(145deg,#101d36,#0f1c35)]">
              {/* Decorative ring */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-[130px] h-[130px] rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.25)" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>

              <div className="w-10 h-10 bg-blue-700 rounded-[10px] flex items-center justify-center mb-3.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>

              <h2 className="m-0 mb-2 text-[18px] font-bold text-slate-50">Create Room</h2>
              <p className="m-0 mb-5 text-[13px] text-slate-500 leading-relaxed max-w-[240px]">
                Start a new precision collaboration workspace with custom parameters.
              </p>

              <button
                onClick={() => navigate("/create-room")}
                className="bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-white text-[13px] font-semibold px-5 py-2.5 cursor-pointer flex items-center gap-1.5 transition-colors duration-200"
              >
                Create Room
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            {/* Join Room card */}
            <div className="bg-pp-card border border-pp-border rounded-2xl p-7">
              <div className="w-10 h-10 bg-emerald-900 rounded-[10px] flex items-center justify-center mb-3.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="11" x2="19" y2="17" />
                  <line x1="16" y1="14" x2="22" y2="14" />
                </svg>
              </div>

              <h2 className="m-0 mb-2 text-[18px] font-bold text-slate-50">Join Room</h2>
              <p className="m-0 mb-4 text-[13px] text-slate-500 leading-relaxed">
                Enter a unique invitation code to enter an existing workspace.
              </p>

              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                placeholder="Enter Room Code (e.g. PP-405)"
                className="w-full px-[14px] py-[10px] bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-[13px] outline-none mb-3 focus:border-blue-600 transition-colors duration-200 placeholder:text-slate-600"
              />

              <button
                onClick={handleJoinRoom}
                className="w-full py-[11px] bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-white text-sm font-semibold cursor-pointer transition-colors duration-200"
              >
                Join
              </button>
            </div>
          </div>

          {/* ── Active Rooms ── */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="m-0 text-[18px] font-bold text-slate-50">Your Active Rooms</h2>
              <button
                onClick={() => navigate("/my-rooms")}
                className="bg-transparent border-none text-blue-500 text-[13px] font-medium flex items-center gap-1 cursor-pointer p-0 hover:text-blue-400 transition-colors"
              >
                View all
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </div>

            {/* Loading */}
            {roomsLoading && (
              <div className="bg-pp-elevated border border-pp-border rounded-[14px] px-6 py-8 text-center text-slate-500 text-sm">
                Loading rooms...
              </div>
            )}

            {/* Error */}
            {!roomsLoading && roomsError && (
              <div className="bg-pp-elevated border border-red-500 rounded-[14px] px-6 py-8 text-center text-red-400 text-sm">
                {roomsError}
              </div>
            )}

            {/* Empty */}
            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <div className="bg-pp-elevated border border-dashed border-pp-border rounded-[14px] px-6 py-10 text-center text-slate-500 text-sm">
                No rooms yet — create or join one to get started.
              </div>
            )}

            {/* Grid */}
            {!roomsLoading && !roomsError && rooms.length > 0 && (
              <div className="grid grid-cols-3 gap-[18px]">
                {rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onOpen={() => navigate(`/rooms/${room.room_code}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
