import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Dashboard.css";

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
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [room, setRoom] = useState<RoomDetailData | null>(null);
  const [access, setAccess] = useState<RoomAccess>({ is_owner: false, is_member: false });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [formData, setFormData] = useState<RoomFormData>({
    project_theme: "",
    roles: "",
    max_per_group: 2,
    number_of_groups: 2,
    status: "open",
  });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (!roomCode) {
      setErrorMessage("Room code tidak valid.");
      setLoading(false);
      return;
    }

    const loadRoom = async () => {
      try {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          navigate("/login", { replace: true });
          return;
        }

        const payload = (await response.json()) as {
          data?:
            | RoomDetailData
            | {
                room?: RoomDetailData;
                access?: RoomAccess;
              };
          message?: string;
        };

        if (!response.ok) {
          setErrorMessage(payload.message || "Gagal memuat detail room.");
          return;
        }

        const data = payload.data;
        const fetchedRoom = data && "room" in data ? data.room ?? null : (data as RoomDetailData | null);
        const fetchedAccess = data && "room" in data ? data.access ?? { is_owner: true, is_member: true } : { is_owner: true, is_member: true };

        setRoom(fetchedRoom);
        setAccess(fetchedAccess);

        if (fetchedRoom) {
          setFormData({
            project_theme: fetchedRoom.project_theme,
            roles: Array.isArray(fetchedRoom.roles) ? fetchedRoom.roles.join(", ") : "",
            max_per_group: fetchedRoom.max_per_group,
            number_of_groups: fetchedRoom.number_of_groups,
            status: fetchedRoom.status,
          });
        }
      } catch {
        setErrorMessage("Gagal memuat detail room.");
      } finally {
        setLoading(false);
      }
    };

    void loadRoom();
  }, [API_BASE_URL, navigate, roomCode]);

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

    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const parsedRoles = formData.roles
      .split(",")
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    if (parsedRoles.length < 2) {
      setActionError("Roles minimal 2 item, pisahkan dengan koma.");
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_theme: formData.project_theme.trim(),
          roles: parsedRoles,
          max_per_group: Number(formData.max_per_group),
          number_of_groups: Number(formData.number_of_groups),
          status: formData.status,
        }),
      });

      const payload = (await response.json()) as { data?: RoomDetailData; message?: string; errors?: Record<string, string[]> };

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const firstValidation = payload.errors ? Object.values(payload.errors)[0] : null;
        const firstValidationMessage = Array.isArray(firstValidation) ? firstValidation[0] : null;
        setActionError(firstValidationMessage || payload.message || "Gagal update room.");
        return;
      }

      if (payload.data) {
        setRoom(payload.data);
      }
      setEditing(false);
    } catch {
      setActionError("Gagal update room.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrLeave = async () => {
    if (!roomCode || actionLoading) return;

    const token = localStorage.getItem("auth_token");
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

    setActionLoading(true);
    setActionError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json()) as { message?: string };

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        setActionError(payload.message || "Aksi gagal diproses.");
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch {
      setActionError("Aksi gagal diproses.");
    } finally {
      setActionLoading(false);
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
                <button className="logout-btn" style={{ width: "auto" }} onClick={handleCancelEdit} disabled={saving}>
                  Batal
                </button>
                <button className="logout-btn" style={{ width: "auto" }} onClick={handleSaveUpdate} disabled={saving}>
                  {saving ? "Saving..." : "Simpan"}
                </button>
              </>
            )}

            <button
              className="logout-btn"
              style={{ width: "auto", background: access.is_owner ? "#b3261e" : undefined }}
              onClick={handleDeleteOrLeave}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : access.is_owner ? "Hapus Room" : "Leave Room"}
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
                <span>Room Code: {room.room_code}</span>
                <span className="badge">{access.is_owner ? "Owner View" : "Member View"}</span>
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
