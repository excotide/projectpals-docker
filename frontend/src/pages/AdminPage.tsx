import { useEffect, useMemo, useState } from "react"
import "./AdminPage.css"

type PageId =
  | "dashboard"
  | "users"
  | "rooms"
  | "matching"
  | "analytics"
  | "logs"
  | "feedback"
  | "settings"

type FeedbackTab = "reviews" | "reports"
type UserStatus = "Active" | "Inactive" | "Banned"
type RoomStatus = "Open" | "In progress" | "Completed" | "Flagged"
type LogType = "user" | "room" | "system" | "security"

interface UserRow {
  av: string
  avBg: string
  avColor: string
  name: string
  email: string
  joined: string
  rooms: number
  status: UserStatus
}

interface RoomRow {
  name: string
  creator: string
  members: string
  skills: string
  status: RoomStatus
  date: string
}

interface LogRow {
  type: LogType
  dot: string
  text: string
  meta: string
}

interface ReviewRow {
  user: string
  avatar: string
  avBg: string
  avColor: string
  rating: number
  comment: string
  room: string
  date: string
}

interface ReportRow {
  reporter: string
  target: string
  reason: string
  severity: "High" | "Medium"
  status: "Open" | "Resolved"
}

interface AdminRow {
  avatar: string
  avBg: string
  avColor: string
  name: string
  email: string
  role: "Super admin" | "Moderator"
  lastActive: string
}

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  users: "Users",
  rooms: "Rooms",
  matching: "Matching",
  analytics: "Analytics",
  logs: "Activity logs",
  feedback: "Feedback",
  settings: "Settings",
}

const USERS: UserRow[] = [
  { av: "ZD", avBg: "#1a3a5c", avColor: "#5aacff", name: "zidan.dev", email: "zidan@email.com", joined: "Apr 15, 2024", rooms: 3, status: "Active" },
  { av: "AR", avBg: "#2a1a5c", avColor: "#b88aff", name: "aryanpm", email: "aryan@email.com", joined: "Apr 14, 2024", rooms: 2, status: "Active" },
  { av: "NS", avBg: "#3a2a0a", avColor: "#e8b84f", name: "nadya.s", email: "nadya@email.com", joined: "Apr 13, 2024", rooms: 1, status: "Inactive" },
  { av: "MR", avBg: "#3a0a0a", avColor: "#ff7070", name: "mirza_r", email: "mirza@email.com", joined: "Apr 12, 2024", rooms: 4, status: "Banned" },
  { av: "BW", avBg: "#0a2a1a", avColor: "#5adaa0", name: "bwahyudi", email: "budi@email.com", joined: "Apr 11, 2024", rooms: 2, status: "Active" },
  { av: "KL", avBg: "#1a2a3a", avColor: "#7ac0ff", name: "khalid_lm", email: "khalid@email.com", joined: "Apr 10, 2024", rooms: 1, status: "Active" },
  { av: "FS", avBg: "#2a0a2a", avColor: "#e07af5", name: "fika.sari", email: "fika@email.com", joined: "Apr 9, 2024", rooms: 2, status: "Inactive" },
  { av: "RP", avBg: "#0a1a2a", avColor: "#4ab3e8", name: "rizky_p", email: "rizky@email.com", joined: "Apr 8, 2024", rooms: 3, status: "Active" },
]

const ROOMS: RoomRow[] = [
  { name: "Mobile App Sprint", creator: "zidan.dev", members: "3/5", skills: "Flutter, Laravel", status: "Open", date: "Apr 15" },
  { name: "E-Commerce MVP", creator: "aryanpm", members: "4/4", skills: "React, Node.js", status: "In progress", date: "Apr 12" },
  { name: "AI Chatbot Research", creator: "nadya.s", members: "2/3", skills: "Python, ML", status: "Open", date: "Apr 10" },
  { name: "Dashboard Redesign", creator: "bwahyudi", members: "5/5", skills: "Figma, Vue.js", status: "In progress", date: "Apr 9" },
  { name: "Blockchain Pilot", creator: "khalid_lm", members: "1/4", skills: "Solidity, Web3", status: "Flagged", date: "Apr 8" },
  { name: "Data Pipeline", creator: "fika.sari", members: "3/3", skills: "Python, Spark", status: "Completed", date: "Apr 4" },
  { name: "Mobile Game MVP", creator: "rizky_p", members: "3/6", skills: "Unity, C#", status: "Open", date: "Apr 3" },
  { name: "Social Platform v2", creator: "zidan.dev", members: "4/5", skills: "React, Laravel", status: "Completed", date: "Mar 28" },
]

const LOGS: LogRow[] = [
  { type: "security", dot: "#F85149", text: "Multiple failed login attempts from IP 103.x.x.x", meta: "Security - 2 min ago" },
  { type: "room", dot: "#2F80ED", text: "New room created: Mobile App Sprint by zidan.dev", meta: "Room - 5 min ago" },
  { type: "user", dot: "#34D399", text: "User bwahyudi completed onboarding and joined room #47", meta: "User - 12 min ago" },
  { type: "security", dot: "#F85149", text: "User mirza_r reported for spam - report #1048", meta: "Security - 18 min ago" },
  { type: "room", dot: "#E3B341", text: "Room Blockchain Pilot flagged for review by moderator", meta: "Room - 31 min ago" },
  { type: "system", dot: "#A371F7", text: "Matching algorithm run completed: 3 rooms processed", meta: "System - 45 min ago" },
  { type: "user", dot: "#34D399", text: "New user registered: khalid_lm", meta: "User - 1 hr ago" },
  { type: "room", dot: "#2F80ED", text: "Room Data Pipeline marked as Completed by fika.sari", meta: "Room - 2 hr ago" },
]

const REVIEWS: ReviewRow[] = [
  { user: "zidan.dev", avatar: "ZD", avBg: "#1a3a5c", avColor: "#5aacff", rating: 5, comment: "Great matching, found a solid team fast!", room: "Mobile App Sprint", date: "Apr 15" },
  { user: "aryanpm", avatar: "AR", avBg: "#2a1a5c", avColor: "#b88aff", rating: 4, comment: "Algorithm worked well but UX needs work", room: "E-Commerce MVP", date: "Apr 13" },
  { user: "bwahyudi", avatar: "BW", avBg: "#0a2a1a", avColor: "#5adaa0", rating: 5, comment: "Really useful platform for finding teammates", room: "Dashboard Redesign", date: "Apr 11" },
  { user: "nadya.s", avatar: "NS", avBg: "#3a2a0a", avColor: "#e8b84f", rating: 3, comment: "Matching was okay but skill detection was off", room: "AI Chatbot", date: "Apr 10" },
]

const REPORTS: ReportRow[] = [
  { reporter: "zidan.dev", target: "mirza_r", reason: "Spam in room chat", severity: "High", status: "Open" },
  { reporter: "aryanpm", target: "ghost_user", reason: "Inactive and blocking spot", severity: "Medium", status: "Open" },
  { reporter: "nadya.s", target: "anon_99", reason: "Inappropriate username", severity: "Medium", status: "Open" },
  { reporter: "bwahyudi", target: "test_account", reason: "Bot-like behavior", severity: "High", status: "Open" },
  { reporter: "system", target: "spam_001", reason: "Multiple failed logins", severity: "High", status: "Resolved" },
]

const ADMINS: AdminRow[] = [
  { avatar: "AD", avBg: "linear-gradient(135deg,#2F80ED,#A371F7)", avColor: "#ffffff", name: "Super Admin", email: "admin@projectpals.id", role: "Super admin", lastActive: "Now" },
  { avatar: "RZ", avBg: "#1a3a5c", avColor: "#5aacff", name: "Rizky M.", email: "rizky@projectpals.id", role: "Moderator", lastActive: "Apr 15" },
  { avatar: "DA", avBg: "#2a1a5c", avColor: "#b88aff", name: "Dina A.", email: "dina@projectpals.id", role: "Moderator", lastActive: "Apr 14" },
]

function MiniLineChart({ points, color }: { points: number[]; color: string }) {
  const width = 680
  const height = 180
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const stepX = width / (points.length - 1)
  const path = points
    .map((value, index) => {
      const x = index * stepX
      const y = height - ((value - min) / range) * (height - 24) - 12
      return `${index === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")

  return (
    <svg className="admin-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="chart">
      <path d={path} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function stars(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`
}

function userChip(status: UserStatus) {
  if (status === "Active") return "chip-green"
  if (status === "Inactive") return "chip-amber"
  return "chip-red"
}

function roomChip(status: RoomStatus) {
  if (status === "Open") return "chip-blue"
  if (status === "In progress") return "chip-green"
  if (status === "Flagged") return "chip-red"
  return "chip-gray"
}

function severityChip(severity: "High" | "Medium") {
  return severity === "High" ? "chip-red" : "chip-amber"
}

export default function AdminPage() {
  const [activePage, setActivePage] = useState<PageId>("dashboard")
  const [clock, setClock] = useState("")
  const [toastMessage, setToastMessage] = useState("")
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [feedbackTab, setFeedbackTab] = useState<FeedbackTab>("reviews")

  const [userFilter, setUserFilter] = useState<"all" | UserStatus>("all")
  const [userSearch, setUserSearch] = useState("")
  const [roomFilter, setRoomFilter] = useState<"all" | RoomStatus>("all")
  const [roomSearch, setRoomSearch] = useState("")
  const [logFilter, setLogFilter] = useState<"all" | LogType>("all")

  const [weightSkills, setWeightSkills] = useState(60)
  const [weightActivity, setWeightActivity] = useState(30)
  const [weightTimezone, setWeightTimezone] = useState(10)

  const [smartMatching, setSmartMatching] = useState(true)
  const [publicRooms, setPublicRooms] = useState(true)
  const [registration, setRegistration] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!toastMessage) return
    const id = window.setTimeout(() => setToastMessage(""), 2500)
    return () => window.clearTimeout(id)
  }, [toastMessage])

  const filteredUsers = useMemo(() => {
    return USERS.filter((user) => {
      const byFilter = userFilter === "all" || user.status === userFilter
      const q = userSearch.trim().toLowerCase()
      const bySearch = q.length === 0 || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      return byFilter && bySearch
    })
  }, [userFilter, userSearch])

  const filteredRooms = useMemo(() => {
    return ROOMS.filter((room) => {
      const byFilter = roomFilter === "all" || room.status === roomFilter
      const q = roomSearch.trim().toLowerCase()
      const bySearch = q.length === 0 || room.name.toLowerCase().includes(q) || room.creator.toLowerCase().includes(q)
      return byFilter && bySearch
    })
  }, [roomFilter, roomSearch])

  const filteredLogs = useMemo(() => {
    if (logFilter === "all") return LOGS
    return LOGS.filter((log) => log.type === logFilter)
  }, [logFilter])

  const liveLogs = LOGS.slice(0, 5)

  const notify = (message: string) => setToastMessage(`OK ${message}`)

  return (
    <div className="admin-root">
      <nav className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-icon">PP</div>
          <div>
            <div className="brand-name">ProjectPals</div>
            <div className="brand-badge">ADMIN</div>
          </div>
        </div>

        <div className="admin-nav-wrap">
          <div className="admin-nav-section">Overview</div>
          <button className={`admin-nav-item ${activePage === "dashboard" ? "active" : ""}`} onClick={() => setActivePage("dashboard")}>Dashboard</button>

          <div className="admin-nav-section">Management</div>
          <button className={`admin-nav-item ${activePage === "users" ? "active" : ""}`} onClick={() => setActivePage("users")}>Users <span className="nav-badge">3</span></button>
          <button className={`admin-nav-item ${activePage === "rooms" ? "active" : ""}`} onClick={() => setActivePage("rooms")}>Rooms</button>
          <button className={`admin-nav-item ${activePage === "matching" ? "active" : ""}`} onClick={() => setActivePage("matching")}>Matching</button>

          <div className="admin-nav-section">Reports</div>
          <button className={`admin-nav-item ${activePage === "analytics" ? "active" : ""}`} onClick={() => setActivePage("analytics")}>Analytics</button>
          <button className={`admin-nav-item ${activePage === "logs" ? "active" : ""}`} onClick={() => setActivePage("logs")}>Activity logs <span className="nav-badge">5</span></button>
          <button className={`admin-nav-item ${activePage === "feedback" ? "active" : ""}`} onClick={() => setActivePage("feedback")}>Feedback</button>

          <div className="admin-nav-section">System</div>
          <button className={`admin-nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => setActivePage("settings")}>Settings</button>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">AD</div>
          <div>
            <div className="admin-profile-name">Super Admin</div>
            <div className="admin-profile-email">admin@projectpals.id</div>
          </div>
        </div>
      </nav>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">ProjectPals / <span>{PAGE_TITLES[activePage]}</span></div>
          <div className="admin-topbar-right">
            <div className="sys-badge"><span className="sys-dot" /> All systems normal</div>
            <div className="clock">{clock}</div>
          </div>
        </header>

        <main className="admin-content">
          {activePage === "dashboard" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Dashboard</h1>
                  <p className="page-sub">Welcome back. Here is what is happening today.</p>
                </div>
                <button className="btn btn-primary" onClick={() => notify("Data refreshed")}>Refresh</button>
              </div>

              <div className="stats-grid">
                <div className="stat-card blue"><div className="stat-label">TOTAL USERS</div><div className="stat-value">1,284</div><div className="stat-change up">+12 this week</div></div>
                <div className="stat-card mint"><div className="stat-label">ACTIVE ROOMS</div><div className="stat-value">47</div><div className="stat-change up">+3 today</div></div>
                <div className="stat-card amber"><div className="stat-label">MATCHES MADE</div><div className="stat-value">318</div><div className="stat-change up">+28 this month</div></div>
                <div className="stat-card red"><div className="stat-label">FLAGGED REPORTS</div><div className="stat-value">5</div><div className="stat-change down">needs review</div></div>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-head"><div><div className="card-title">User growth</div><div className="card-sub">Last 7 days</div></div></div>
                  <div className="card-body"><MiniLineChart points={[142, 156, 139, 168, 174, 161, 183]} color="#2F80ED" /></div>
                </div>
                <div className="card">
                  <div className="card-head"><div className="card-title">Room status breakdown</div></div>
                  <div className="card-body">
                    <div className="bar-row"><span>Open</span><div className="bar-track"><div className="bar-fill blue" style={{ width: "60%" }} /></div><span>28</span></div>
                    <div className="bar-row"><span>In progress</span><div className="bar-track"><div className="bar-fill mint" style={{ width: "40%" }} /></div><span>19</span></div>
                    <div className="bar-row"><span>Completed</span><div className="bar-track"><div className="bar-fill gray" style={{ width: "85%" }} /></div><span>84</span></div>
                    <div className="bar-row"><span>Flagged</span><div className="bar-track"><div className="bar-fill red" style={{ width: "6%" }} /></div><span>3</span></div>
                  </div>
                </div>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Recent users</div>
                    <button className="btn btn-sm" onClick={() => setActivePage("users")}>View all</button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>User</th><th>Joined</th><th>Status</th></tr></thead>
                      <tbody>
                        {USERS.slice(0, 5).map((user) => (
                          <tr key={user.email}>
                            <td><div className="user-cell"><span className="avatar" style={{ background: user.avBg, color: user.avColor }}>{user.av}</span>{user.name}</div></td>
                            <td className="muted">{user.joined.split(",")[0]}</td>
                            <td><span className={`chip ${userChip(user.status)}`}>{user.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card">
                  <div className="card-head"><div className="card-title">Live activity log</div></div>
                  <div className="card-body">
                    {liveLogs.map((log) => (
                      <div className="log-item" key={log.text}>
                        <span className="log-dot" style={{ background: log.dot }} />
                        <div>
                          <div className="log-text">{log.text}</div>
                          <div className="log-meta">{log.meta}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activePage === "users" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">User management</h1>
                  <p className="page-sub">Manage all registered users</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddUserModal(true)}>+ Add user</button>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">All users</div>
                  <select value={userFilter} onChange={(event) => setUserFilter(event.target.value as "all" | UserStatus)}>
                    <option value="all">All status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Banned">Banned</option>
                  </select>
                </div>
                <div className="card-body thin">
                  <input className="search-input" placeholder="Search username or email..." value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>User</th><th>Email</th><th>Joined</th><th>Rooms</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.email}>
                          <td><div className="user-cell"><span className="avatar" style={{ background: user.avBg, color: user.avColor }}>{user.av}</span>{user.name}</div></td>
                          <td className="muted">{user.email}</td>
                          <td className="muted">{user.joined}</td>
                          <td>{user.rooms}</td>
                          <td><span className={`chip ${userChip(user.status)}`}>{user.status}</span></td>
                          <td>
                            <button className={`btn btn-sm ${user.status === "Banned" ? "btn-success" : "btn-danger"}`} onClick={() => notify(user.status === "Banned" ? "User unbanned" : "User banned")}>{user.status === "Banned" ? "Unban" : "Ban"}</button>
                            <button className="btn btn-sm" onClick={() => notify("User removed")}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activePage === "rooms" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Room management</h1>
                  <p className="page-sub">Monitor all project rooms</p>
                </div>
              </div>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">All rooms</div>
                  <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value as "all" | RoomStatus)}>
                    <option value="all">All status</option>
                    <option value="Open">Open</option>
                    <option value="In progress">In progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Flagged">Flagged</option>
                  </select>
                </div>
                <div className="card-body thin">
                  <input className="search-input" placeholder="Search room name or creator..." value={roomSearch} onChange={(event) => setRoomSearch(event.target.value)} />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Room name</th><th>Creator</th><th>Members</th><th>Skills</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
                    <tbody>
                      {filteredRooms.map((room) => (
                        <tr key={room.name}>
                          <td>{room.name}</td>
                          <td className="muted">{room.creator}</td>
                          <td>{room.members}</td>
                          <td className="muted">{room.skills}</td>
                          <td><span className={`chip ${roomChip(room.status)}`}>{room.status}</span></td>
                          <td className="muted">{room.date}</td>
                          <td>
                            <button className="btn btn-sm" onClick={() => notify("Room details opened")}>View</button>
                            {room.status === "Flagged" && (
                              <button className="btn btn-sm btn-danger" onClick={() => notify("Room removed")}>Remove</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activePage === "matching" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Matching engine</h1>
                  <p className="page-sub">Monitor smart matching algorithm performance</p>
                </div>
                <button className="btn btn-primary" onClick={() => notify("Matching algorithm re-run triggered")}>Run matching</button>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-head"><div className="card-title">Match history</div></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Room</th><th>Groups</th><th>Result</th><th>Date</th></tr></thead>
                      <tbody>
                        <tr><td>Mobile App Sprint</td><td>2 groups</td><td><span className="chip chip-green">Success</span></td><td className="muted">Apr 15</td></tr>
                        <tr><td>E-Commerce MVP</td><td>1 group</td><td><span className="chip chip-green">Success</span></td><td className="muted">Apr 12</td></tr>
                        <tr><td>AI Research #3</td><td>3 groups</td><td><span className="chip chip-amber">Partial</span></td><td className="muted">Apr 10</td></tr>
                        <tr><td>Blockchain Pilot</td><td>-</td><td><span className="chip chip-red">Failed</span></td><td className="muted">Apr 8</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card">
                  <div className="card-head"><div className="card-title">Algorithm config</div></div>
                  <div className="card-body">
                    <label className="form-label">Priority weight - Skills</label>
                    <input type="range" min={0} max={100} value={weightSkills} onChange={(event) => setWeightSkills(Number(event.target.value))} />
                    <div className="muted">Current: {weightSkills}%</div>

                    <label className="form-label">Priority weight - Activity level</label>
                    <input type="range" min={0} max={100} value={weightActivity} onChange={(event) => setWeightActivity(Number(event.target.value))} />
                    <div className="muted">Current: {weightActivity}%</div>

                    <label className="form-label">Priority weight - Timezone</label>
                    <input type="range" min={0} max={100} value={weightTimezone} onChange={(event) => setWeightTimezone(Number(event.target.value))} />
                    <div className="muted">Current: {weightTimezone}%</div>

                    <button className="btn btn-primary wide" onClick={() => notify("Config saved successfully")}>Save config</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activePage === "analytics" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Analytics</h1>
                  <p className="page-sub">Platform performance and growth metrics</p>
                </div>
                <select>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                </select>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-head"><div className="card-title">Monthly active users</div></div>
                  <div className="card-body"><MiniLineChart points={[620, 710, 680, 820, 890, 950, 1040]} color="#34D399" /></div>
                </div>
                <div className="card">
                  <div className="card-head"><div className="card-title">Top skills in demand</div></div>
                  <div className="card-body">
                    <div className="bar-row"><span>React</span><div className="bar-track"><div className="bar-fill blue" style={{ width: "78%" }} /></div><span>78%</span></div>
                    <div className="bar-row"><span>Laravel</span><div className="bar-track"><div className="bar-fill mint" style={{ width: "65%" }} /></div><span>65%</span></div>
                    <div className="bar-row"><span>Flutter</span><div className="bar-track"><div className="bar-fill blue" style={{ width: "54%" }} /></div><span>54%</span></div>
                    <div className="bar-row"><span>Python</span><div className="bar-track"><div className="bar-fill amber" style={{ width: "49%" }} /></div><span>49%</span></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activePage === "logs" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Activity logs</h1>
                  <p className="page-sub">Full audit trail of platform events</p>
                </div>
                <button className="btn" onClick={() => notify("Logs exported as CSV")}>Export CSV</button>
              </div>

              <div className="alert alert-red">
                <div>
                  <strong>5 events</strong> require admin attention - user reports and suspicious login attempts detected.
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">All events</div>
                  <select value={logFilter} onChange={(event) => setLogFilter(event.target.value as "all" | LogType)}>
                    <option value="all">All types</option>
                    <option value="user">User</option>
                    <option value="room">Room</option>
                    <option value="system">System</option>
                    <option value="security">Security</option>
                  </select>
                </div>
                <div className="card-body">
                  {filteredLogs.map((log) => (
                    <div className="log-item" key={`${log.meta}${log.text}`}>
                      <span className="log-dot" style={{ background: log.dot }} />
                      <div>
                        <div className="log-text">{log.text}</div>
                        <div className="log-meta">{log.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activePage === "feedback" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Feedback and reports</h1>
                  <p className="page-sub">User-submitted feedback and flagged reports</p>
                </div>
              </div>

              <div className="tabs">
                <button className={`tab ${feedbackTab === "reviews" ? "active" : ""}`} onClick={() => setFeedbackTab("reviews")}>User reviews</button>
                <button className={`tab ${feedbackTab === "reports" ? "active" : ""}`} onClick={() => setFeedbackTab("reports")}>Flagged reports</button>
              </div>

              {feedbackTab === "reviews" && (
                <div className="card">
                  <div className="card-head"><div className="card-title">Recent reviews</div></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>User</th><th>Rating</th><th>Comment</th><th>Room</th><th>Date</th></tr></thead>
                      <tbody>
                        {REVIEWS.map((review) => (
                          <tr key={`${review.user}${review.date}`}>
                            <td><div className="user-cell"><span className="avatar" style={{ background: review.avBg, color: review.avColor }}>{review.avatar}</span>{review.user}</div></td>
                            <td className="stars">{stars(review.rating)}</td>
                            <td className="muted">{review.comment}</td>
                            <td>{review.room}</td>
                            <td className="muted">{review.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {feedbackTab === "reports" && (
                <div className="card">
                  <div className="card-head"><div className="card-title">Flagged reports</div><div className="card-sub">5 open - requires action</div></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Reporter</th><th>Target</th><th>Reason</th><th>Severity</th><th>Status</th><th>Action</th></tr></thead>
                      <tbody>
                        {REPORTS.map((report) => (
                          <tr key={`${report.reporter}${report.target}${report.reason}`}>
                            <td>{report.reporter}</td>
                            <td>{report.target}</td>
                            <td>{report.reason}</td>
                            <td><span className={`chip ${severityChip(report.severity)}`}>{report.severity}</span></td>
                            <td><span className={`chip ${report.status === "Resolved" ? "chip-green" : "chip-amber"}`}>{report.status}</span></td>
                            <td>
                              <button className={`btn btn-sm ${report.severity === "High" ? "btn-danger" : ""}`} onClick={() => notify("Action completed")}>{report.severity === "High" ? "Ban user" : "Review"}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {activePage === "settings" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Settings</h1>
                  <p className="page-sub">Platform configuration and admin preferences</p>
                </div>
                <button className="btn btn-primary" onClick={() => notify("Settings saved")}>Save changes</button>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-head"><div className="card-title">General settings</div></div>
                  <div className="card-body">
                    <label className="form-label">Platform name</label>
                    <input className="form-input" defaultValue="ProjectPals" />
                    <label className="form-label">Support email</label>
                    <input className="form-input" defaultValue="support@projectpals.id" />
                    <label className="form-label">Max users per room</label>
                    <input className="form-input" type="number" defaultValue="6" />
                    <label className="form-label">Max groups per room</label>
                    <input className="form-input" type="number" defaultValue="4" />
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><div className="card-title">Feature toggles</div></div>
                  <div className="card-body toggle-list">
                    <label className="toggle-row"><span>Smart matching</span><input type="checkbox" checked={smartMatching} onChange={() => { setSmartMatching((value) => !value); notify("Setting updated") }} /></label>
                    <label className="toggle-row"><span>Public rooms</span><input type="checkbox" checked={publicRooms} onChange={() => { setPublicRooms((value) => !value); notify("Setting updated") }} /></label>
                    <label className="toggle-row"><span>User registration</span><input type="checkbox" checked={registration} onChange={() => { setRegistration((value) => !value); notify("Setting updated") }} /></label>
                    <label className="toggle-row"><span>Email notifications</span><input type="checkbox" checked={emailNotifications} onChange={() => { setEmailNotifications((value) => !value); notify("Setting updated") }} /></label>
                    <label className="toggle-row"><span>Maintenance mode</span><input type="checkbox" checked={maintenanceMode} onChange={() => { setMaintenanceMode((value) => !value); notify("Maintenance mode toggled") }} /></label>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title">Admin accounts</div><button className="btn btn-sm btn-primary" onClick={() => notify("Invite sent")}>+ Invite admin</button></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last active</th><th>Action</th></tr></thead>
                    <tbody>
                      {ADMINS.map((admin) => (
                        <tr key={admin.email}>
                          <td><div className="user-cell"><span className="avatar" style={{ background: admin.avBg, color: admin.avColor }}>{admin.avatar}</span>{admin.name}</div></td>
                          <td className="muted">{admin.email}</td>
                          <td><span className={`chip ${admin.role === "Super admin" ? "chip-purple" : "chip-blue"}`}>{admin.role}</span></td>
                          <td className="muted">{admin.lastActive}</td>
                          <td>{admin.role === "Super admin" ? "-" : <button className="btn btn-sm btn-danger" onClick={() => notify("Admin access revoked")}>Revoke</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal-title">Add new user</h2>
            <p className="modal-sub">Manually create a user account</p>
            <label className="form-label">Full name</label>
            <input className="form-input" placeholder="e.g. Zidan Prakoso" />
            <label className="form-label">Username</label>
            <input className="form-input" placeholder="e.g. zidan.dev" />
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="e.g. zidan@email.com" />
            <label className="form-label">Role</label>
            <select className="form-input"><option>Member</option><option>Moderator</option></select>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowAddUserModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setShowAddUserModal(false); notify("User added successfully") }}>Create user</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toastMessage ? "show" : ""}`}>{toastMessage}</div>
    </div>
  )
}
