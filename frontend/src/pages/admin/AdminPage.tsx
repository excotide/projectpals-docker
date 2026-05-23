import { useEffect, useMemo, useState } from "react"
import { adminApi } from "../../lib/adminApi"
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
  | "dev"

type ProductivityWindow = "morning" | "afternoon" | "evening" | "flexible"

interface DevMember {
  id: number
  primary_role: string
  backup_role: string
  productivity_windows: ProductivityWindow[]
}

interface SimTeamPick {
  member_id: number
  assigned_role: string
  score: number
}

interface SimTrace {
  pick: number
  team: number
  member_id: number
  role: string
  score: number
  counters_after: { N: number; n: Record<string, number> }
}

interface SimMeta {
  c: number
  k_teams: number
  max_per_group: number
  total_members: number
  total_picks: number
}

interface SimResult {
  score_matrix: Record<string, Record<string, number>>
  teams: Record<string, SimTeamPick[]>
  unassigned: number[]
  trace: SimTrace[]
  meta: SimMeta
}

interface DevUser {
  id: number
  name: string
  username: string | null
  email: string
}

type DevTab = "simulator" | "create" | "matched"

interface SetupMember {
  user_id: number
  primary_role: string
  backup_role: string
  productivity_windows: ProductivityWindow[]
}

interface CreatedRoomInfo {
  room_id: number
  room_code: string
  owner_id: number
  members_created: number
}

interface MatchedRoomTeamMember {
  room_member_id: number
  assigned_role: string
  score: number
  user: { id: number; name: string; username: string | null } | null
}

interface MatchedRoomTeam {
  team_number: number
  members: MatchedRoomTeamMember[]
}

interface MatchedRoomUnassigned {
  room_member_id: number
  primary_role: string | null
  backup_role: string | null
  user: { id: number; name: string; username: string | null } | null
}

interface MatchedRoom {
  id: number
  room_code: string
  project_theme: string
  status: string
  max_per_group: number
  number_of_groups: number
  owner: { id: number; name: string; username: string | null } | null
  teams: MatchedRoomTeam[]
  unassigned: MatchedRoomUnassigned[]
}

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
  dev: "Developer",
}

const WINDOW_OPTIONS: ProductivityWindow[] = ["morning", "afternoon", "evening", "flexible"]

const DEFAULT_DEV_ROLES = ["Frontend", "Backend", "Designer"]

function makeDevMember(id: number, primary = "", backup = ""): DevMember {
  return { id, primary_role: primary, backup_role: backup, productivity_windows: [] }
}

const DEFAULT_DEV_MEMBERS: DevMember[] = [
  { id: 1, primary_role: "Frontend", backup_role: "Designer", productivity_windows: ["morning"] },
  { id: 2, primary_role: "Backend", backup_role: "Frontend", productivity_windows: ["afternoon"] },
  { id: 3, primary_role: "Designer", backup_role: "Frontend", productivity_windows: ["flexible"] },
  { id: 4, primary_role: "Backend", backup_role: "Designer", productivity_windows: ["evening"] },
  { id: 5, primary_role: "Frontend", backup_role: "Backend", productivity_windows: ["morning"] },
  { id: 6, primary_role: "Designer", backup_role: "Backend", productivity_windows: ["afternoon"] },
]

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

  const [devRoles, setDevRoles] = useState<string[]>(DEFAULT_DEV_ROLES)
  const [devRoleInput, setDevRoleInput] = useState("")
  const [devMaxPerGroup, setDevMaxPerGroup] = useState(3)
  const [devNumberOfGroups, setDevNumberOfGroups] = useState(2)
  const [devRoomWindows, setDevRoomWindows] = useState<ProductivityWindow[]>(["flexible"])
  const [devMembers, setDevMembers] = useState<DevMember[]>(DEFAULT_DEV_MEMBERS)
  const [devNextId, setDevNextId] = useState(DEFAULT_DEV_MEMBERS.length + 1)
  const [devRunning, setDevRunning] = useState(false)
  const [devError, setDevError] = useState("")
  const [devResult, setDevResult] = useState<SimResult | null>(null)

  const [devUsers, setDevUsers] = useState<DevUser[]>([])
  const [devUsersLoading, setDevUsersLoading] = useState(false)
  const [devUsersError, setDevUsersError] = useState("")

  const [devTab, setDevTab] = useState<DevTab>("simulator")

  // — Setup test room tab —
  const [setupRoles, setSetupRoles] = useState<string[]>(DEFAULT_DEV_ROLES)
  const [setupRoleInput, setSetupRoleInput] = useState("")
  const [setupMaxPerGroup, setSetupMaxPerGroup] = useState(3)
  const [setupNumberOfGroups, setSetupNumberOfGroups] = useState(2)
  const [setupRoomWindows, setSetupRoomWindows] = useState<ProductivityWindow[]>(["flexible"])
  const [setupProjectTheme, setSetupProjectTheme] = useState("Dev test room")
  const [setupOwnerId, setSetupOwnerId] = useState<number | "">("")
  const [setupMembers, setSetupMembers] = useState<Record<number, SetupMember>>({})
  const [setupUserSearch, setSetupUserSearch] = useState("")
  const [setupRunning, setSetupRunning] = useState(false)
  const [setupError, setSetupError] = useState("")
  const [setupCreated, setSetupCreated] = useState<CreatedRoomInfo | null>(null)

  // — Matched teams tab —
  const [matchedRooms, setMatchedRooms] = useState<MatchedRoom[]>([])
  const [matchedLoading, setMatchedLoading] = useState(false)
  const [matchedError, setMatchedError] = useState("")
  const [matchedExpanded, setMatchedExpanded] = useState<Record<number, boolean>>({})

  const devCapacity = devMaxPerGroup * devNumberOfGroups
  const devOverCapacity = devMembers.length > devCapacity
  const setupCapacity = setupMaxPerGroup * setupNumberOfGroups
  const setupMemberCount = Object.keys(setupMembers).length
  const setupOverCapacity = setupMemberCount > setupCapacity

  const addDevRole = () => {
    const value = devRoleInput.trim()
    if (!value) return
    if (devRoles.includes(value)) {
      setDevRoleInput("")
      return
    }
    setDevRoles([...devRoles, value])
    setDevRoleInput("")
  }

  const removeDevRole = (role: string) => {
    setDevRoles(devRoles.filter((r) => r !== role))
    setDevMembers(devMembers.map((m) => ({
      ...m,
      primary_role: m.primary_role === role ? "" : m.primary_role,
      backup_role: m.backup_role === role ? "" : m.backup_role,
    })))
  }

  const toggleDevRoomWindow = (w: ProductivityWindow) => {
    setDevRoomWindows((current) =>
      current.includes(w) ? current.filter((x) => x !== w) : [...current, w],
    )
  }

  const updateDevMember = (id: number, patch: Partial<DevMember>) => {
    setDevMembers(devMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  const toggleDevMemberWindow = (id: number, w: ProductivityWindow) => {
    setDevMembers(devMembers.map((m) => {
      if (m.id !== id) return m
      const has = m.productivity_windows.includes(w)
      return {
        ...m,
        productivity_windows: has
          ? m.productivity_windows.filter((x) => x !== w)
          : [...m.productivity_windows, w],
      }
    }))
  }

  const addDevMember = () => {
    setDevMembers([...devMembers, makeDevMember(devNextId)])
    setDevNextId(devNextId + 1)
  }

  const removeDevMember = (id: number) => {
    setDevMembers(devMembers.filter((m) => m.id !== id))
  }

  const resetDev = () => {
    setDevRoles(DEFAULT_DEV_ROLES)
    setDevRoleInput("")
    setDevMaxPerGroup(3)
    setDevNumberOfGroups(2)
    setDevRoomWindows(["flexible"])
    setDevMembers(DEFAULT_DEV_MEMBERS)
    setDevNextId(DEFAULT_DEV_MEMBERS.length + 1)
    setDevResult(null)
    setDevError("")
  }

  const loadDevUsers = async () => {
    setDevUsersError("")
    setDevUsersLoading(true)
    try {
      const { data } = await adminApi.get<{ data: DevUser[] }>("/dev/users")
      setDevUsers(data.data)
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } } }
      setDevUsersError(anyErr?.response?.data?.message ?? "Failed to fetch users.")
    } finally {
      setDevUsersLoading(false)
    }
  }

  useEffect(() => {
    if (activePage === "dev" && devUsers.length === 0 && !devUsersLoading && !devUsersError) {
      void loadDevUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage])

  const autoFillDevMembers = (count: number) => {
    if (devRoles.length === 0) {
      setDevError("Add at least one role first to auto-fill members.")
      return
    }
    const list: DevMember[] = []
    for (let i = 0; i < count; i++) {
      const primary = devRoles[i % devRoles.length]
      const backup = devRoles[(i + 1) % devRoles.length]
      const w = WINDOW_OPTIONS[i % WINDOW_OPTIONS.length]
      list.push({
        id: i + 1,
        primary_role: primary,
        backup_role: backup,
        productivity_windows: [w],
      })
    }
    setDevMembers(list)
    setDevNextId(count + 1)
  }

  const runDevSimulation = async () => {
    setDevError("")
    setDevResult(null)

    if (devRoles.length < 1) {
      setDevError("Add at least one role.")
      return
    }
    if (devMembers.length < 1) {
      setDevError("Add at least one member.")
      return
    }
    const ids = devMembers.map((m) => m.id)
    if (new Set(ids).size !== ids.length) {
      setDevError("Member IDs must be unique.")
      return
    }

    setDevRunning(true)
    try {
      const payload = {
        roles: devRoles,
        max_per_group: devMaxPerGroup,
        number_of_groups: devNumberOfGroups,
        productivity_windows: devRoomWindows,
        members: devMembers.map((m) => ({
          id: m.id,
          primary_role: m.primary_role || null,
          backup_role: m.backup_role || null,
          productivity_windows: m.productivity_windows,
        })),
      }
      const { data } = await adminApi.post<{ data: SimResult; message: string }>(
        "/dev/simulate-matching",
        payload,
      )
      setDevResult(data.data)
      notify("Simulation finished")
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const apiMsg = anyErr?.response?.data?.message
      const firstFieldErr = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors)[0]?.[0]
        : undefined
      setDevError(firstFieldErr ?? apiMsg ?? "Simulation request failed.")
    } finally {
      setDevRunning(false)
    }
  }

  // ── Setup test room handlers ────────────────────────────────
  const addSetupRole = () => {
    const value = setupRoleInput.trim()
    if (!value || setupRoles.includes(value)) {
      setSetupRoleInput("")
      return
    }
    setSetupRoles([...setupRoles, value])
    setSetupRoleInput("")
  }

  const removeSetupRole = (role: string) => {
    setSetupRoles(setupRoles.filter((r) => r !== role))
    setSetupMembers((current) => {
      const next: Record<number, SetupMember> = {}
      for (const [uid, m] of Object.entries(current)) {
        next[Number(uid)] = {
          ...m,
          primary_role: m.primary_role === role ? "" : m.primary_role,
          backup_role: m.backup_role === role ? "" : m.backup_role,
        }
      }
      return next
    })
  }

  const toggleSetupRoomWindow = (w: ProductivityWindow) => {
    setSetupRoomWindows((current) =>
      current.includes(w) ? current.filter((x) => x !== w) : [...current, w],
    )
  }

  const toggleSetupMember = (userId: number) => {
    setSetupMembers((current) => {
      const next = { ...current }
      if (next[userId]) {
        delete next[userId]
        if (setupOwnerId === userId) setSetupOwnerId("")
      } else {
        next[userId] = { user_id: userId, primary_role: "", backup_role: "", productivity_windows: [] }
      }
      return next
    })
  }

  const selectAllFilteredAsMembers = () => {
    setSetupMembers((current) => {
      const next = { ...current }
      for (const u of filteredSetupUsers) {
        if (!next[u.id]) {
          next[u.id] = { user_id: u.id, primary_role: "", backup_role: "", productivity_windows: [] }
        }
      }
      return next
    })
  }

  const clearAllSetupMembers = () => {
    setSetupMembers({})
    setSetupOwnerId("")
  }

  const autoAssignSetupRoles = () => {
    if (setupRoles.length === 0) {
      setSetupError("Add at least one role before auto-assigning.")
      return
    }
    setSetupMembers((current) => {
      const ids = Object.keys(current).map(Number).sort((a, b) => a - b)
      const next: Record<number, SetupMember> = {}
      ids.forEach((uid, idx) => {
        const primary = setupRoles[idx % setupRoles.length]
        const backup = setupRoles[(idx + 1) % setupRoles.length]
        const window = WINDOW_OPTIONS[idx % WINDOW_OPTIONS.length]
        next[uid] = {
          user_id: uid,
          primary_role: primary,
          backup_role: backup,
          productivity_windows: [window],
        }
      })
      return next
    })
  }

  const updateSetupMember = (userId: number, patch: Partial<SetupMember>) => {
    setSetupMembers((current) => {
      if (!current[userId]) return current
      return { ...current, [userId]: { ...current[userId], ...patch } }
    })
  }

  const toggleSetupMemberWindow = (userId: number, w: ProductivityWindow) => {
    setSetupMembers((current) => {
      const m = current[userId]
      if (!m) return current
      const has = m.productivity_windows.includes(w)
      return {
        ...current,
        [userId]: {
          ...m,
          productivity_windows: has
            ? m.productivity_windows.filter((x) => x !== w)
            : [...m.productivity_windows, w],
        },
      }
    })
  }

  const resetSetup = () => {
    setSetupRoles(DEFAULT_DEV_ROLES)
    setSetupRoleInput("")
    setSetupMaxPerGroup(3)
    setSetupNumberOfGroups(2)
    setSetupRoomWindows(["flexible"])
    setSetupProjectTheme("Dev test room")
    setSetupOwnerId("")
    setSetupMembers({})
    setSetupUserSearch("")
    setSetupError("")
    setSetupCreated(null)
  }

  const submitSetupRoom = async () => {
    setSetupError("")
    setSetupCreated(null)

    if (setupRoles.length < 1) {
      setSetupError("Add at least one role.")
      return
    }
    if (!setupProjectTheme.trim()) {
      setSetupError("Project theme is required.")
      return
    }
    if (setupOwnerId === "") {
      setSetupError("Pick an owner.")
      return
    }
    const memberList = Object.values(setupMembers)
    if (memberList.length < 1) {
      setSetupError("Pick at least one member.")
      return
    }
    if (!setupMembers[Number(setupOwnerId)]) {
      setSetupError("Owner must also be in the members list.")
      return
    }

    setSetupRunning(true)
    try {
      const { data } = await adminApi.post<{ data: CreatedRoomInfo; message: string }>(
        "/dev/create-room",
        {
          owner_user_id: Number(setupOwnerId),
          project_theme: setupProjectTheme.trim(),
          roles: setupRoles,
          max_per_group: setupMaxPerGroup,
          number_of_groups: setupNumberOfGroups,
          productivity_windows: setupRoomWindows,
          members: memberList.map((m) => ({
            user_id: m.user_id,
            primary_role: m.primary_role || null,
            backup_role: m.backup_role || null,
            productivity_windows: m.productivity_windows,
          })),
        },
      )
      setSetupCreated(data.data)
      notify(`Room ${data.data.room_code} created`)
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const apiMsg = anyErr?.response?.data?.message
      const firstFieldErr = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors)[0]?.[0]
        : undefined
      setSetupError(firstFieldErr ?? apiMsg ?? "Create room request failed.")
    } finally {
      setSetupRunning(false)
    }
  }

  // ── Matched rooms handlers ─────────────────────────────────
  const loadMatchedRooms = async () => {
    setMatchedError("")
    setMatchedLoading(true)
    try {
      const { data } = await adminApi.get<{ data: MatchedRoom[] }>("/dev/matched-rooms")
      setMatchedRooms(data.data)
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } } }
      setMatchedError(anyErr?.response?.data?.message ?? "Failed to fetch matched rooms.")
    } finally {
      setMatchedLoading(false)
    }
  }

  const toggleMatchedExpanded = (roomId: number) => {
    setMatchedExpanded((current) => ({ ...current, [roomId]: !current[roomId] }))
  }

  useEffect(() => {
    if (devTab === "matched" && activePage === "dev" && matchedRooms.length === 0 && !matchedLoading && !matchedError) {
      void loadMatchedRooms()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devTab, activePage])

  const filteredSetupUsers = useMemo(() => {
    const q = setupUserSearch.trim().toLowerCase()
    if (!q) return devUsers
    return devUsers.filter((u) =>
      u.name.toLowerCase().includes(q)
      || (u.username ?? "").toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || String(u.id).includes(q),
    )
  }, [devUsers, setupUserSearch])

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

          <div className="admin-nav-section">Developer</div>
          <button className={`admin-nav-item ${activePage === "dev" ? "active" : ""}`} onClick={() => setActivePage("dev")}>Room logic tester <span className="nav-badge nav-badge-dev">DEV</span></button>
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

          {activePage === "dev" && (
            <section>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Developer tools</h1>
                  <p className="page-sub">Test the team-formation pipeline, seed test rooms, and inspect matched teams.</p>
                </div>
              </div>

              <div className="tabs" style={{ marginBottom: 14 }}>
                <button className={`tab ${devTab === "simulator" ? "active" : ""}`} onClick={() => setDevTab("simulator")}>Logic simulator</button>
                <button className={`tab ${devTab === "create" ? "active" : ""}`} onClick={() => setDevTab("create")}>Setup test room</button>
                <button className={`tab ${devTab === "matched" ? "active" : ""}`} onClick={() => setDevTab("matched")}>Matched teams</button>
              </div>

              {devTab === "simulator" && (
              <>
              <div className="page-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>Logic simulator</h2>
                  <p className="page-sub">In-memory run of ScoringService + SnakeDraft — no DB writes.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={resetDev} disabled={devRunning}>Reset</button>
                  <button className="btn btn-primary" onClick={runDevSimulation} disabled={devRunning}>{devRunning ? "Running..." : "Run simulation"}</button>
                </div>
              </div>

              {devError && (
                <div className="alert alert-red" style={{ marginBottom: 12 }}>
                  <div><strong>Error:</strong> {devError}</div>
                </div>
              )}

              {devOverCapacity && (
                <div className="alert alert-amber" style={{ marginBottom: 12 }}>
                  <div>
                    <strong>Over capacity:</strong> {devMembers.length} members vs only {devCapacity} slots ({devNumberOfGroups} × {devMaxPerGroup}).
                    {" "}<strong>{devMembers.length - devCapacity}</strong> member(s) will end up <em>unassigned</em>.
                    {" "}Increase <em>number of groups</em> or <em>max per group</em>, or remove some members.
                  </div>
                </div>
              )}

              <div className="grid2">
                <div className="card">
                  <div className="card-head"><div className="card-title">Room config</div></div>
                  <div className="card-body">
                    <label className="form-label">Roles</label>
                    <div className="dev-chips">
                      {devRoles.map((role) => (
                        <span className="dev-chip" key={role}>
                          {role}
                          <button type="button" onClick={() => removeDevRole(role)} aria-label={`Remove ${role}`}>×</button>
                        </span>
                      ))}
                      {devRoles.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No roles. Add at least one.</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input
                        className="form-input"
                        placeholder="e.g. Frontend"
                        value={devRoleInput}
                        onChange={(event) => setDevRoleInput(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDevRole() } }}
                      />
                      <button className="btn" onClick={addDevRole}>Add</button>
                    </div>

                    <div className="dev-grid2" style={{ marginTop: 14 }}>
                      <div>
                        <label className="form-label">Max per group</label>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          value={devMaxPerGroup}
                          onChange={(event) => setDevMaxPerGroup(Math.max(1, Number(event.target.value) || 1))}
                        />
                      </div>
                      <div>
                        <label className="form-label">Number of groups</label>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          value={devNumberOfGroups}
                          onChange={(event) => setDevNumberOfGroups(Math.max(1, Number(event.target.value) || 1))}
                        />
                      </div>
                    </div>

                    <label className="form-label" style={{ marginTop: 14 }}>Room productivity windows</label>
                    <div className="dev-checks">
                      {WINDOW_OPTIONS.map((w) => (
                        <label key={w} className="dev-check">
                          <input
                            type="checkbox"
                            checked={devRoomWindows.includes(w)}
                            onChange={() => toggleDevRoomWindow(w)}
                          />
                          <span>{w}</span>
                        </label>
                      ))}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      Capacity: {devNumberOfGroups} groups x {devMaxPerGroup} = <strong>{devNumberOfGroups * devMaxPerGroup}</strong> slots, {devMembers.length} members.
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Quick presets</div>
                  </div>
                  <div className="card-body">
                    <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
                      Generate members based on the current roles. Useful for stress-tests.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button className="btn btn-sm" onClick={() => autoFillDevMembers(4)}>Auto-fill 4</button>
                      <button className="btn btn-sm" onClick={() => autoFillDevMembers(6)}>Auto-fill 6</button>
                      <button className="btn btn-sm" onClick={() => autoFillDevMembers(8)}>Auto-fill 8</button>
                      <button className="btn btn-sm" onClick={() => autoFillDevMembers(12)}>Auto-fill 12</button>
                      <button className="btn btn-sm" onClick={() => autoFillDevMembers(20)}>Auto-fill 20</button>
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>
                      Algorithm constants (read-only): WEIGHT_ROLE_AFFINITY=0.6, WEIGHT_TIME_COMPATIBILITY=0.3, WEIGHT_EXPLORATION=0.1, c=0.5.
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-head">
                  <div className="card-title">Members ({devMembers.length})</div>
                  <button className="btn btn-sm btn-primary" onClick={addDevMember}>+ Add member</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>ID</th>
                        <th>Primary role</th>
                        <th>Backup role</th>
                        <th>Productivity windows</th>
                        <th style={{ width: 80 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devMembers.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <input
                              className="form-input dev-id-input"
                              type="number"
                              value={member.id}
                              onChange={(event) => updateDevMember(member.id, { id: Number(event.target.value) || 0 })}
                            />
                          </td>
                          <td>
                            <select
                              className="form-input"
                              value={member.primary_role}
                              onChange={(event) => updateDevMember(member.id, { primary_role: event.target.value })}
                            >
                              <option value="">— none —</option>
                              {devRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                            </select>
                          </td>
                          <td>
                            <select
                              className="form-input"
                              value={member.backup_role}
                              onChange={(event) => updateDevMember(member.id, { backup_role: event.target.value })}
                            >
                              <option value="">— none —</option>
                              {devRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                            </select>
                          </td>
                          <td>
                            <div className="dev-checks">
                              {WINDOW_OPTIONS.map((w) => (
                                <label key={w} className="dev-check">
                                  <input
                                    type="checkbox"
                                    checked={member.productivity_windows.includes(w)}
                                    onChange={() => toggleDevMemberWindow(member.id, w)}
                                  />
                                  <span>{w}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => removeDevMember(member.id)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                      {devMembers.length === 0 && (
                        <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>No members. Click "+ Add member" or use a preset.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {devResult && (
                <>
                  <div className="card" style={{ marginTop: 14 }}>
                    <div className="card-head"><div className="card-title">Run summary</div></div>
                    <div className="card-body">
                      <div className="dev-meta">
                        <div><div className="muted">Teams (k)</div><strong>{devResult.meta.k_teams}</strong></div>
                        <div><div className="muted">Max per group</div><strong>{devResult.meta.max_per_group}</strong></div>
                        <div><div className="muted">Members in</div><strong>{devResult.meta.total_members}</strong></div>
                        <div><div className="muted">Picks made</div><strong>{devResult.meta.total_picks}</strong></div>
                        <div><div className="muted">Unassigned</div><strong>{devResult.unassigned.length}</strong></div>
                        <div><div className="muted">c (exploration)</div><strong>{devResult.meta.c}</strong></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid2" style={{ marginTop: 14 }}>
                    <div className="card">
                      <div className="card-head"><div className="card-title">Teams formed</div></div>
                      <div className="card-body">
                        {Object.entries(devResult.teams).map(([teamNum, picks]) => (
                          <div className="dev-team-card" key={teamNum}>
                            <div className="dev-team-head">
                              <span className="chip chip-blue">Team {teamNum}</span>
                              <span className="muted" style={{ fontSize: 11 }}>{picks.length} / {devResult.meta.max_per_group}</span>
                            </div>
                            {picks.length === 0 && <div className="muted" style={{ fontSize: 12 }}>empty</div>}
                            {picks.map((pick) => (
                              <div className="dev-pick" key={`${teamNum}-${pick.member_id}`}>
                                <span className="dev-pick-id">#{pick.member_id}</span>
                                <span className="chip chip-purple">{pick.assigned_role}</span>
                                <span className="dev-pick-score">{pick.score.toFixed(3)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-head"><div className="card-title">Unassigned</div></div>
                      <div className="card-body">
                        {devResult.unassigned.length === 0 ? (
                          <span className="chip chip-green">All members placed</span>
                        ) : (
                          <div className="dev-chips">
                            {devResult.unassigned.map((id) => (
                              <span className="dev-chip dev-chip-warn" key={id}>#{id}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 14 }}>
                    <div className="card-head"><div className="card-title">Initial score matrix (member × role at N=0)</div></div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Member</th>
                            {devRoles.map((role) => <th key={role}>{role}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(devResult.score_matrix).map(([mid, scoresByRole]) => (
                            <tr key={mid}>
                              <td><strong>#{mid}</strong></td>
                              {devRoles.map((role) => {
                                const value = scoresByRole[role] ?? 0
                                return <td key={role} className="dev-score-cell">{value.toFixed(3)}</td>
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 14 }}>
                    <div className="card-head"><div className="card-title">Pick trace ({devResult.trace.length} picks)</div></div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>#</th>
                            <th>Team</th>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Score</th>
                            <th>N after</th>
                            <th>Role picks after</th>
                          </tr>
                        </thead>
                        <tbody>
                          {devResult.trace.map((step) => (
                            <tr key={step.pick}>
                              <td><strong>{step.pick}</strong></td>
                              <td><span className="chip chip-blue">T{step.team}</span></td>
                              <td>#{step.member_id}</td>
                              <td><span className="chip chip-purple">{step.role}</span></td>
                              <td className="dev-score-cell">{step.score.toFixed(3)}</td>
                              <td>{step.counters_after.N}</td>
                              <td className="muted" style={{ fontSize: 11 }}>
                                {Object.entries(step.counters_after.n).map(([r, c]) => `${r}:${c}`).join(", ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
              </>
              )}

              {devTab === "create" && (
              <>
              <div className="page-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>Setup test room</h2>
                  <p className="page-sub">Pick existing users to seed a Room + RoomMembers. The owner runs matching themselves from the normal UI.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={resetSetup} disabled={setupRunning}>Reset</button>
                  <button className="btn btn-primary" onClick={submitSetupRoom} disabled={setupRunning}>{setupRunning ? "Creating..." : "Create room"}</button>
                </div>
              </div>

              {setupError && (
                <div className="alert alert-red" style={{ marginBottom: 12 }}>
                  <div><strong>Error:</strong> {setupError}</div>
                </div>
              )}

              {setupOverCapacity && (
                <div className="alert alert-amber" style={{ marginBottom: 12 }}>
                  <div>
                    <strong>Over capacity:</strong> {setupMemberCount} members selected vs only {setupCapacity} slots ({setupNumberOfGroups} × {setupMaxPerGroup}).
                    {" "}When the owner runs matching, <strong>{setupMemberCount - setupCapacity}</strong> member(s) will be unassigned.
                  </div>
                </div>
              )}

              {setupCreated && (
                <div className="alert alert-mint" style={{ marginBottom: 12 }}>
                  <div>
                    <strong>Room created:</strong> <code>{setupCreated.room_code}</code>{" "}
                    (id={setupCreated.room_id}), owner=#{setupCreated.owner_id}, {setupCreated.members_created} members.
                    {" "}The owner can now login and run matching at <code>/rooms/{setupCreated.room_code}</code>.
                  </div>
                </div>
              )}

              <div className="grid2">
                <div className="card">
                  <div className="card-head"><div className="card-title">Room config</div></div>
                  <div className="card-body">
                    <label className="form-label">Project theme</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Mobile app sprint - dev test"
                      value={setupProjectTheme}
                      onChange={(event) => setSetupProjectTheme(event.target.value)}
                    />

                    <label className="form-label">Roles</label>
                    <div className="dev-chips">
                      {setupRoles.map((role) => (
                        <span className="dev-chip" key={role}>
                          {role}
                          <button type="button" onClick={() => removeSetupRole(role)} aria-label={`Remove ${role}`}>×</button>
                        </span>
                      ))}
                      {setupRoles.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No roles.</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input
                        className="form-input"
                        placeholder="e.g. Frontend"
                        value={setupRoleInput}
                        onChange={(event) => setSetupRoleInput(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSetupRole() } }}
                      />
                      <button className="btn" onClick={addSetupRole}>Add</button>
                    </div>

                    <div className="dev-grid2" style={{ marginTop: 14 }}>
                      <div>
                        <label className="form-label">Max per group</label>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          value={setupMaxPerGroup}
                          onChange={(event) => setSetupMaxPerGroup(Math.max(1, Number(event.target.value) || 1))}
                        />
                      </div>
                      <div>
                        <label className="form-label">Number of groups</label>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          value={setupNumberOfGroups}
                          onChange={(event) => setSetupNumberOfGroups(Math.max(1, Number(event.target.value) || 1))}
                        />
                      </div>
                    </div>

                    <label className="form-label" style={{ marginTop: 14 }}>Room productivity windows</label>
                    <div className="dev-checks">
                      {WINDOW_OPTIONS.map((w) => (
                        <label key={w} className="dev-check">
                          <input
                            type="checkbox"
                            checked={setupRoomWindows.includes(w)}
                            onChange={() => toggleSetupRoomWindow(w)}
                          />
                          <span>{w}</span>
                        </label>
                      ))}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      Capacity: {setupNumberOfGroups} × {setupMaxPerGroup} = <strong>{setupCapacity}</strong> slots, {setupMemberCount} selected.
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Selected members ({setupMemberCount})</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-sm"
                        onClick={autoAssignSetupRoles}
                        disabled={setupMemberCount === 0 || setupRoles.length === 0}
                        title="Round-robin assign primary/backup roles + windows to all selected members"
                      >
                        Auto-assign roles
                      </button>
                      <button className="btn btn-sm" onClick={loadDevUsers} disabled={devUsersLoading}>Refresh users</button>
                    </div>
                  </div>
                  <div className="card-body" style={{ maxHeight: 380, overflow: "auto" }}>
                    {Object.values(setupMembers).length === 0 && (
                      <p className="muted" style={{ fontSize: 12, margin: 0 }}>No users picked yet. Use the list below.</p>
                    )}
                    {Object.values(setupMembers).map((m) => {
                      const user = devUsers.find((u) => u.id === m.user_id)
                      const isOwner = Number(setupOwnerId) === m.user_id
                      return (
                        <div className="dev-team-card" key={m.user_id} style={{ borderColor: isOwner ? "rgba(163,113,247,0.5)" : undefined }}>
                          <div className="dev-team-head">
                            <span>
                              <strong className="dev-score-cell">#{m.user_id}</strong>{" "}
                              {user ? user.name : "(unknown user)"}{" "}
                              {isOwner && <span className="chip chip-purple">owner</span>}
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              {!isOwner && <button className="btn btn-sm" onClick={() => setSetupOwnerId(m.user_id)}>Set as owner</button>}
                              <button className="btn btn-sm btn-danger" onClick={() => toggleSetupMember(m.user_id)}>Remove</button>
                            </div>
                          </div>
                          <div className="dev-grid2">
                            <div>
                              <label className="form-label" style={{ marginTop: 0 }}>Primary role</label>
                              <select
                                className="form-input"
                                value={m.primary_role}
                                onChange={(event) => updateSetupMember(m.user_id, { primary_role: event.target.value })}
                              >
                                <option value="">— none —</option>
                                {setupRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="form-label" style={{ marginTop: 0 }}>Backup role</label>
                              <select
                                className="form-input"
                                value={m.backup_role}
                                onChange={(event) => updateSetupMember(m.user_id, { backup_role: event.target.value })}
                              >
                                <option value="">— none —</option>
                                {setupRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="dev-checks" style={{ marginTop: 8 }}>
                            {WINDOW_OPTIONS.map((w) => (
                              <label key={w} className="dev-check">
                                <input
                                  type="checkbox"
                                  checked={m.productivity_windows.includes(w)}
                                  onChange={() => toggleSetupMemberWindow(m.user_id, w)}
                                />
                                <span>{w}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-head">
                  <div className="card-title">Available users {devUsersLoading ? "(loading...)" : `(${filteredSetupUsers.length}/${devUsers.length})`}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <input
                      className="form-input"
                      placeholder="Search id / name / username / email..."
                      style={{ maxWidth: 240, margin: 0 }}
                      value={setupUserSearch}
                      onChange={(event) => setSetupUserSearch(event.target.value)}
                    />
                    <button
                      className="btn btn-sm"
                      onClick={() => selectAllFilteredAsMembers()}
                      disabled={filteredSetupUsers.length === 0}
                      title="Add all filtered users as members"
                    >
                      Select all{setupUserSearch ? " filtered" : ""} ({filteredSetupUsers.length})
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => clearAllSetupMembers()}
                      disabled={setupMemberCount === 0}
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
                <div className="card-body" style={{ maxHeight: 320, overflow: "auto" }}>
                  {devUsersError && <div className="muted" style={{ fontSize: 12, color: "var(--red)" }}>{devUsersError}</div>}
                  {!devUsersError && devUsers.length === 0 && !devUsersLoading && (
                    <div className="muted" style={{ fontSize: 12 }}>No users found. Register some via the normal /register flow first.</div>
                  )}
                  {filteredSetupUsers.length > 0 && (
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>Pick</th>
                          <th style={{ width: 60 }}>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th style={{ width: 100 }}>Owner?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSetupUsers.map((user) => {
                          const picked = !!setupMembers[user.id]
                          const isOwner = Number(setupOwnerId) === user.id
                          return (
                            <tr key={user.id} style={picked ? { background: "rgba(47,128,237,0.08)" } : undefined}>
                              <td><input type="checkbox" checked={picked} onChange={() => toggleSetupMember(user.id)} /></td>
                              <td><strong className="dev-score-cell">{user.id}</strong></td>
                              <td>{user.name}{user.username ? <span className="muted" style={{ fontSize: 11 }}> @{user.username}</span> : null}</td>
                              <td className="muted" style={{ fontSize: 11 }}>{user.email}</td>
                              <td>
                                <input
                                  type="radio"
                                  name="setup-owner"
                                  checked={isOwner}
                                  disabled={!picked}
                                  onChange={() => setSetupOwnerId(user.id)}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              </>
              )}

              {devTab === "matched" && (
              <>
              <div className="page-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>Matched teams</h2>
                  <p className="page-sub">Rooms that already have teams formed. Click a row to drill down.</p>
                </div>
                <button className="btn" onClick={loadMatchedRooms} disabled={matchedLoading}>{matchedLoading ? "Loading..." : "Refresh"}</button>
              </div>

              {matchedError && (
                <div className="alert alert-red" style={{ marginBottom: 12 }}>
                  <div><strong>Error:</strong> {matchedError}</div>
                </div>
              )}

              {!matchedLoading && !matchedError && matchedRooms.length === 0 && (
                <div className="card">
                  <div className="card-body">
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>No matched rooms yet. Create one via <strong>Setup test room</strong> and have the owner run matching.</p>
                  </div>
                </div>
              )}

              {matchedRooms.map((room) => {
                const expanded = !!matchedExpanded[room.id]
                const totalMembers = room.teams.reduce((acc, t) => acc + t.members.length, 0)
                return (
                  <div className="card" style={{ marginTop: 14 }} key={room.id}>
                    <div className="card-head" style={{ cursor: "pointer" }} onClick={() => toggleMatchedExpanded(room.id)}>
                      <div className="card-title">
                        <code>{room.room_code}</code> · {room.project_theme}{" "}
                        <span className={`chip ${room.status === "ongoing" ? "chip-green" : "chip-blue"}`}>{room.status}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span className="muted" style={{ fontSize: 11 }}>
                          owner: {room.owner ? `${room.owner.name} (#${room.owner.id})` : "—"}
                          {" · "}{room.teams.length} teams
                          {" · "}{totalMembers} placed
                          {" · "}{room.unassigned.length} unassigned
                        </span>
                        <span className="muted" style={{ fontSize: 11 }}>{expanded ? "▾" : "▸"}</span>
                      </div>
                    </div>
                    {expanded && (
                      <div className="card-body">
                        <div className="grid2">
                          <div>
                            {room.teams.map((team) => (
                              <div className="dev-team-card" key={team.team_number}>
                                <div className="dev-team-head">
                                  <span className="chip chip-blue">Team {team.team_number}</span>
                                  <span className="muted" style={{ fontSize: 11 }}>{team.members.length} / {room.max_per_group}</span>
                                </div>
                                {team.members.map((tm) => (
                                  <div className="dev-pick" key={tm.room_member_id}>
                                    <span className="dev-pick-id">{tm.user ? `#${tm.user.id} ${tm.user.name}` : `rm#${tm.room_member_id}`}</span>
                                    <span className="chip chip-purple">{tm.assigned_role}</span>
                                    <span className="dev-pick-score">{tm.score.toFixed(3)}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="card-title" style={{ fontSize: 13, marginBottom: 8 }}>Unassigned</div>
                            {room.unassigned.length === 0 && <span className="chip chip-green">All placed</span>}
                            {room.unassigned.map((u) => (
                              <div className="dev-pick" key={u.room_member_id}>
                                <span className="dev-pick-id">{u.user ? `#${u.user.id} ${u.user.name}` : `rm#${u.room_member_id}`}</span>
                                {u.primary_role && <span className="chip chip-blue">{u.primary_role}</span>}
                                {u.backup_role && <span className="chip" style={{ background: "var(--navy3)", color: "var(--text2)" }}>{u.backup_role}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              </>
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
