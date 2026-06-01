import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useRoomByCode, useRoomTeams } from "../../hooks/useRooms";
import { useSidebarNavigation } from "../../hooks/useSidebarNavigation";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import MatchedTeamView from "../../components/teams/MatchedTeamView";
import { getInitials } from "../../utils/teamHelpers";

export default function MatchedRoomOverview() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();

  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const roomQuery = useRoomByCode(roomCode);
  const teamsQuery = useRoomTeams(roomCode, { enabled: roomQuery.data?.room?.status === "ongoing" });

  const { activeNav, handleNavClick } = useSidebarNavigation("My Rooms");
  const [loggingOut, setLoggingOut] = useState(false);

  const room = roomQuery.data?.room ?? null;
  const access = roomQuery.data?.access ?? { is_owner: false, is_member: false };
  const teams = teamsQuery.data?.teams ?? [];

  const myTeam = useMemo(() => {
    if (!user?.id) return null;
    for (const team of teams) {
      const hasMember = team.members.some((member) => String(member.user?.id) === String(user.id));
      if (hasMember) return team;
    }
    return null;
  }, [teams, user?.id]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    return getInitials(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (!room || roomQuery.isLoading) return;
    if (access.is_owner || room.status !== "ongoing") {
      navigate(`/rooms/${roomCode}`, { replace: true });
    }
  }, [access.is_owner, navigate, room, roomCode, roomQuery.isLoading]);

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

  const isLoading = roomQuery.isLoading || teamsQuery.isLoading;
  const queryErr = roomQuery.error instanceof Error ? roomQuery.error.message : "";

  return (
    <div className="flex h-screen bg-pp-bg text-white overflow-hidden font-sans">
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
            { label: "My Rooms", to: "/my-rooms" },
            { label: room?.project_theme ?? roomCode ?? "Room" },
            { label: "Matched", muted: true },
          ]}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="bg-pp-card border border-pp-border rounded-2xl px-6 py-12 text-center text-slate-500 text-sm">
              Loading room data...
            </div>
          )}

          {!isLoading && queryErr && (
            <div className="bg-pp-card border border-red-500 rounded-2xl px-6 py-8 text-center text-red-400 text-sm">
              {queryErr}
            </div>
          )}

          {!isLoading && !queryErr && room && !myTeam && (
            <div className="bg-pp-card border border-pp-border rounded-2xl px-6 py-12 text-center text-slate-500 text-sm">
              Kamu belum masuk ke team manapun.
            </div>
          )}

          {!isLoading && !queryErr && room && myTeam && roomCode && (
            <MatchedTeamView
              team={myTeam}
              roomCode={roomCode}
              roomRoles={(room.roles as string[] | undefined) ?? []}
              roomInfo={{
                project_theme: room.project_theme,
                room_code: room.room_code,
                status: room.status,
                environments: room.environments as string[] | undefined,
                created_at: room.created_at,
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
