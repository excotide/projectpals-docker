import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Dashboard.css";
import { useDeleteOrLeaveRoom, useRoomByCode, useUpdateRoom } from "../hooks/useRooms";

type RoomOwner = {
  id: number;
  name: string;
  username: string;
};

type RoomDetailData = {
  id: number;
  project_theme: string;
  room_code: string;
  roles: string[];
  productivity_windows: string[];
  environments: string[];
  max_per_group: number;
  number_of_groups: number;
  status: "open" | "matching" | "ongoing" | "closed";
  created_at: string;
  owner?: RoomOwner;
};

type RoomAccess = {
  is_owner: boolean;
  is_member: boolean;
};

type RoomFormData = {
  project_theme: string;
  roles: string;
  max_per_group: number;
  number_of_groups: number;
  status: "open" | "matching" | "ongoing" | "closed";
};

export default function RoomDetail() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();

  const roomQuery = useRoomByCode(roomCode);
  const updateRoomMutation = useUpdateRoom();
  const deleteRoomMutation = useDeleteOrLeaveRoom();

  const loading = roomQuery.isLoading;
  const errorMessage = roomQuery.error instanceof Error ? roomQuery.error.message : "";
  const room = (roomQuery.data?.room ?? null) as RoomDetailData | null;
  const access = (roomQuery.data?.access ?? { is_owner: false, is_member: false }) as RoomAccess;

  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [formData, setFormData] = useState<RoomFormData>({
    project_theme: "",
    roles: "",
    max_per_group: 2,
    number_of_groups: 2,
    status: "open",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!room || editing) {
      return;
    }

    setFormData({
      project_theme: room.project_theme,
      roles: room.roles.join(", "),
      max_per_group: room.max_per_group,
      number_of_groups: room.number_of_groups,
      status: room.status,
    });
  }, [editing, room]);

  const roleList = useMemo(() => {
    if (!room?.roles || room.roles.length === 0) return "-";
    return room.roles.join(", ");
  }, [room?.roles]);

  const windowsList = useMemo(() => {
    if (!room?.productivity_windows || room.productivity_windows.length === 0) return "-";
    return room.productivity_windows.join(", ");
  }, [room?.productivity_windows]);

  const envList = useMemo(() => {
    if (!room?.environments || room.environments.length === 0) return "-";
    return room.environments.join(", ");
  }, [room?.environments]);

  const handleFormChange = <K extends keyof RoomFormData>(key: K, value: RoomFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancelEdit = () => {
    if (!room) return;

    setFormData({
      project_theme: room.project_theme,
      roles: room.roles.join(", "),
      max_per_group: room.max_per_group,
      number_of_groups: room.number_of_groups,
      status: room.status,
    });
    setEditing(false);
    setActionError("");
  };

  const handleSaveUpdate = async () => {
    if (!roomCode) return;

    const parsedRoles = formData.roles
      .split(",")
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    if (parsedRoles.length < 2) {
      setActionError("Roles minimal 2 item, pisahkan dengan koma.");
      return;
    }

    setActionError("");

    try {
      await updateRoomMutation.mutateAsync({
        roomCode,
        project_theme: formData.project_theme.trim(),
        roles: parsedRoles,
        max_per_group: Number(formData.max_per_group),
        number_of_groups: Number(formData.number_of_groups),
        status: formData.status,
      });
      setEditing(false);
      await roomQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Gagal update room.");
    }
  };

  const handleDeleteOrLeave = async () => {
    if (!roomCode || deleteRoomMutation.isPending) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const confirmText = access.is_owner
      ? "Yakin ingin menghapus room ini? Semua member akan terhapus dari room."
      : "Yakin ingin keluar dari room ini?";

    if (!window.confirm(confirmText)) {
      return;
    }

    setActionError("");

    try {
      await deleteRoomMutation.mutateAsync({ roomCode });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Aksi gagal diproses.");
    }
  };

  return (
    <div className="dashboard-container">
      <main className="main" style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div className="header">
          <div className="user-meta">
            <p className="welcome">Room Detail</p>
            <h2>{editing ? formData.project_theme || "Project Room" : room?.project_theme ?? "Project Room"}</h2>
            <p className="user-email">Code: {room?.room_code ?? (roomCode || "-")}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {access.is_owner && !editing && (
              <button
                className="logout-btn"
                style={{ width: "auto" }}
                onClick={() => {
                  setEditing(true);
                  setActionError("");
                }}
              >
                Edit Room
              </button>
            )}

            {access.is_owner && editing && (
              <>
                <button className="logout-btn" style={{ width: "auto" }} onClick={handleCancelEdit} disabled={updateRoomMutation.isPending}>
                  Batal
                </button>
                <button className="logout-btn" style={{ width: "auto" }} onClick={handleSaveUpdate} disabled={updateRoomMutation.isPending}>
                  {updateRoomMutation.isPending ? "Saving..." : "Simpan"}
                </button>
              </>
            )}

            <button
              className="logout-btn"
              style={{ width: "auto", background: access.is_owner ? "#b3261e" : undefined }}
              onClick={handleDeleteOrLeave}
              disabled={deleteRoomMutation.isPending}
            >
              {deleteRoomMutation.isPending ? "Processing..." : access.is_owner ? "Hapus Room" : "Leave Room"}
            </button>

            <button className="logout-btn" style={{ width: "auto" }} onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
          </div>
        </div>

        {loading && (
          <div className="list-card">
            <div>
              <h4>Loading room...</h4>
              <p>Mengambil detail room dari server.</p>
            </div>
            <span className="badge">SYNC</span>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="list-card">
            <div>
              <h4>Room Unavailable</h4>
              <p>{errorMessage}</p>
            </div>
            <span className="badge">ERROR</span>
          </div>
        )}

        {!loading && !errorMessage && room && (
          <>
            {actionError && (
              <div className="list-card">
                <div>
                  <h4>Aksi Gagal</h4>
                  <p>{actionError}</p>
                </div>
                <span className="badge">ERROR</span>
              </div>
            )}

            <div className="active-project">
              <div className="row">
                <h3>{editing ? formData.project_theme || room.project_theme : room.project_theme}</h3>
                <span>{(editing ? formData.status : room.status).toUpperCase()}</span>
              </div>
              <div className="project-card">
                <div>
                  <span>Room Code: {room.room_code}</span>
                  {room.owner && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.6 }}>
                      Created by {room.owner.name}
                      <span style={{ marginLeft: 6, opacity: 0.7 }}>{room.owner.username}</span>
                    </p>
                  )}
                </div>
                <span className="badge">{access.is_owner ? "Owner" : "Member"}</span>
              </div>
            </div>

            {editing && access.is_owner && (
              <div className="section" style={{ marginBottom: 14 }}>
                <h3>Edit Room</h3>
                <div className="list-card" style={{ display: "block" }}>
                  <div style={{ display: "grid", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 12, opacity: 0.9 }}>Project Theme</span>
                      <input
                        value={formData.project_theme}
                        onChange={(event) => handleFormChange("project_theme", event.target.value)}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#fff",
                          padding: "10px 12px",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 12, opacity: 0.9 }}>Roles (pisahkan dengan koma)</span>
                      <input
                        value={formData.roles}
                        onChange={(event) => handleFormChange("roles", event.target.value)}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#fff",
                          padding: "10px 12px",
                        }}
                      />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, opacity: 0.9 }}>Max Per Group</span>
                        <input
                          type="number"
                          min={2}
                          max={20}
                          value={formData.max_per_group}
                          onChange={(event) => handleFormChange("max_per_group", Number(event.target.value))}
                          style={{
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "rgba(255,255,255,0.04)",
                            color: "#fff",
                            padding: "10px 12px",
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, opacity: 0.9 }}>Number of Groups</span>
                        <input
                          type="number"
                          min={2}
                          max={50}
                          value={formData.number_of_groups}
                          onChange={(event) => handleFormChange("number_of_groups", Number(event.target.value))}
                          style={{
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "rgba(255,255,255,0.04)",
                            color: "#fff",
                            padding: "10px 12px",
                          }}
                        />
                      </label>
                    </div>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 12, opacity: 0.9 }}>Status</span>
                      <select
                        value={formData.status}
                        onChange={(event) => handleFormChange("status", event.target.value as RoomFormData["status"])}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(20,22,25,0.95)",
                          color: "#fff",
                          padding: "10px 12px",
                        }}
                      >
                        <option value="open">OPEN</option>
                        <option value="matching">MATCHING</option>
                        <option value="ongoing">ONGOING</option>
                        <option value="closed">CLOSED</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="section">
              <h3>Configuration</h3>

              <div className="list-card">
                <div>
                  <h4>Roles</h4>
                  <p>{roleList}</p>
                </div>
                <span className="badge green">{room.roles?.length ?? 0}</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Max Member Per Group</h4>
                  <p>{room.max_per_group}</p>
                </div>
                <span className="badge green">LIMIT</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Number of Groups</h4>
                  <p>{room.number_of_groups}</p>
                </div>
                <span className="badge green">GROUPS</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Productivity Windows</h4>
                  <p>{windowsList}</p>
                </div>
                <span className="badge green">TIME</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Environments</h4>
                  <p>{envList}</p>
                </div>
                <span className="badge green">ENV</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
