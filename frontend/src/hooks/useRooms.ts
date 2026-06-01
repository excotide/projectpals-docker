import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'

export interface Room {
  id: number | string
  room_code?: string
  project_theme?: string
  max_per_group?: number
  max_members?: number
  status?: string
  [key: string]: unknown
}

export interface RoomOwner {
  id: number | string
  name: string
  username: string
}

export interface RoomDetail extends Room {
  roles?: string[]
  productivity_windows?: string[]
  environments?: string[]
  number_of_groups?: number
  created_at?: string
  owner?: RoomOwner
}

export interface RoomAccess {
  is_owner: boolean
  is_member: boolean
}

export interface RoomDetailResponse {
  room: RoomDetail
  access: RoomAccess
}

export interface CreateRoomPayload {
  project_theme?: string
  max_per_group?: number
  max_members?: number
  number_of_groups?: number
  name?: string
  roles?: string[]
  maxPerGroup?: number
  maxMembers?: number
  numGroups?: number
  createRoomOnly?: boolean
  create_room_only?: boolean
  [key: string]: unknown
}

export interface JoinRoomPayload {
  room_code?: string
  primary_role?: string
  backup_role?: string
  backup_roles?: string[]
  productivity_windows?: string[]
  environments?: string[]
  group_name?: string
  [key: string]: unknown
}

export interface JoinRoomVariables {
  roomId: number | string
  payload?: JoinRoomPayload
}

export interface JoinPreviewResponse {
  roles?: string[]
}

export interface FinalizeJoinPayload {
  roomCode: string
  primaryRole?: string
  backupRoles?: string[]
  productivityWindows: string[]
  environments: string[]
}

export interface FinalizeJoinResult {
  room: RoomDetail
  member: {
    id: number | string
    user_id: number | string
    room_id: number | string
    [key: string]: unknown
  }
}

export type RoomStatus = 'open' | 'matching' | 'ongoing'

export interface UpdateRoomPayload {
  roomCode: string
  project_theme: string
  roles: string[]
  max_members: number
  number_of_groups: number
  status: RoomStatus
}

export interface RoomTeamMember {
  room_member_id: number | string
  assigned_role: string
  score: number
  is_leader: boolean
  primary_role: string | null
  backup_role: string | null
  user: RoomMemberUser | null
}

export interface RoomTeam {
  id: number | string
  team_number: number
  project_name: string | null
  description: string | null
  deadline: string | null
  finished_at: string | null
  members: RoomTeamMember[]
}

export interface RoomUnassigned {
  room_member_id: number | string
  primary_role: string | null
  backup_role: string | null
  user: RoomMemberUser | null
}

export interface RoomTeamsResponse {
  room: {
    id: number | string
    room_code: string
    project_theme: string
    status: string
    max_per_group: number
    number_of_groups: number
  }
  teams: RoomTeam[]
  unassigned: RoomUnassigned[]
}

export interface MatchResult {
  teams: Array<{
    id: number | string
    team_number: number
    members: Array<{
      room_member_id: number | string
      assigned_role: string
      score: number
      is_leader: boolean
      user: { id: number | string; name: string; username: string } | null
    }>
  }>
  unassigned: number[]
  meta: {
    c: number
    k_teams: number
    max_per_group: number
    total_members: number
    total_picks: number
  }
}

export interface TransferLeaderPayload {
  teamId: number | string
  newLeaderRoomMemberId: number | string
  roomCode?: string
}

export interface TransferLeaderResponse {
  team_number: number
  members: RoomTeamMember[]
}

export interface ChangeMemberRolePayload {
  teamId: number | string
  roomMemberId: number | string
  assignedRole: string
  roomCode?: string
}

export interface TeamRoleTarget {
  id: number | string
  team_id: number | string
  role: string
  title: string
  is_done: boolean
  sort_order: number
  deadline: string | null
  completed_at: string | null
}

export interface TeamTargetsResponse {
  team_id: number | string
  targets: TeamRoleTarget[]
}

export interface CreateTeamTargetPayload {
  teamId: number | string
  role: string
  title: string
  deadline?: string | null
}

export interface UpdateTeamTargetPayload {
  teamId: number | string
  targetId: number | string
  title?: string
  deadline?: string | null
}

export interface UpdateTeamPayload {
  teamId: number | string
  projectName?: string | null
  description?: string | null
  deadline?: string | null
  roomCode?: string
}

export interface FinishTeamPayload {
  teamId: number | string
  roomCode?: string
}

export interface DeleteTeamTargetPayload {
  teamId: number | string
  targetId: number | string
}

export interface ToggleTeamTargetPayload {
  teamId: number | string
  targetId: number | string
}

export interface DeleteOrLeaveRoomPayload {
  roomCode: string
}

export interface RoomMemberUser {
  id: number | string
  name: string
  username: string
  email: string
}

export interface RoomMemberItem {
  id: number | string
  joined_at: string | null
  primary_role: string | null
  backup_role: string | null
  backup_roles: string[] | null
  productivity_windows: string[] | null
  environments: string[] | null
  user: RoomMemberUser | null
}

export interface RoomMembersResponse {
  room: {
    id: number | string
    room_code: string
    project_theme: string
    status: string
  }
  members: RoomMemberItem[]
}

export interface TeamHistoryItem {
  team_id: number | string
  team_number: number
  status: string
  finished_at: string | null
  average_rating: number | null
  feedback_count: number
  my_room_member_id: number | string | null
  room: {
    id: number | string | null
    room_code: string | null
    project_theme: string | null
    status: string | null
  }
}

export interface TeamHistoryResponse {
  items: TeamHistoryItem[]
}

const roomKeys = {
  all: ['rooms'] as const,
  list: () => [...roomKeys.all, 'list'] as const,
  mine: () => [...roomKeys.all, 'mine'] as const,
  detail: (id: number | string) => [...roomKeys.all, 'detail', id] as const,
  codeDetail: (roomCode: string) => [...roomKeys.all, 'code-detail', roomCode] as const,
  joinPreview: (roomCode: string) => [...roomKeys.all, 'join-preview', roomCode] as const,
  members: (roomCode: string) => [...roomKeys.all, 'members', roomCode] as const,
  teams: (roomCode: string) => [...roomKeys.all, 'teams', roomCode] as const,
  targets: (teamId: number | string) => [...roomKeys.all, 'targets', String(teamId)] as const,
  feedbackStatus: (teamId: number | string) => [...roomKeys.all, 'feedback-status', String(teamId)] as const,
  feedbacksGiven: (teamId: number | string) => [...roomKeys.all, 'feedbacks-given', String(teamId)] as const,
  feedbacksReceived: (teamId: number | string, roomMemberId: number | string) =>
    [...roomKeys.all, 'feedbacks-received', String(teamId), String(roomMemberId)] as const,
  history: () => [...roomKeys.all, 'history'] as const,
}

export function useRooms() {
  return useQuery({
    queryKey: roomKeys.list(),
    queryFn: async () => {
      const response = await apiGet<Room[]>('/rooms/my-rooms')
      return response.data
    },
  })
}

export function useRoom(id?: number | string) {
  return useQuery({
    queryKey: roomKeys.detail(id ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<RoomDetailResponse | Room>(`/rooms/${id}`)

      if (response.data && typeof response.data === 'object' && 'room' in response.data) {
        return (response.data as RoomDetailResponse).room
      }

      return response.data as Room
    },
    enabled: id !== undefined && id !== null && String(id).length > 0,
  })
}

export function useMyRooms() {
  return useQuery({
    queryKey: roomKeys.mine(),
    queryFn: async () => {
      const response = await apiGet<Room[]>('/rooms/my-rooms')
      return response.data
    },
  })
}

export function useRoomByCode(roomCode?: string) {
  return useQuery({
    queryKey: roomKeys.codeDetail(roomCode ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<RoomDetail | RoomDetailResponse>(`/rooms/${roomCode}`)

      if (response.data && typeof response.data === 'object' && 'room' in response.data) {
        return response.data as RoomDetailResponse
      }

      return {
        room: response.data as RoomDetail,
        access: {
          is_owner: true,
          is_member: true,
        },
      } satisfies RoomDetailResponse
    },
    enabled: Boolean(roomCode),
  })
}

export function useRoomMembers(roomCode?: string) {
  return useQuery({
    queryKey: roomKeys.members(roomCode ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<RoomMembersResponse>(`/rooms/${roomCode}/members`)
      return response.data
    },
    enabled: Boolean(roomCode),
  })
}

export function useJoinRoomPreview(roomCode?: string) {
  return useQuery({
    queryKey: roomKeys.joinPreview(roomCode ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<JoinPreviewResponse>(`/rooms/${roomCode}/join-preview`)
      return response.data
    },
    enabled: false,
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateRoomPayload) => {
      const response = await apiPost<Room>('/rooms', payload)
      return response.data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomKeys.list() }),
        queryClient.invalidateQueries({ queryKey: roomKeys.mine() }),
      ])
    },
  })
}

export function useJoinRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, payload }: JoinRoomVariables) => {
      const response = await apiPost<Room>('/rooms/join', {
        room_code: String(roomId),
        ...(payload ?? {}),
      })
      return response.data
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomKeys.list() }),
        queryClient.invalidateQueries({ queryKey: roomKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: roomKeys.codeDetail(String(variables.roomId)) }),
      ])
    },
  })
}

export function useFinalizeJoinRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: FinalizeJoinPayload) => {
      const response = await apiPost<FinalizeJoinResult>('/rooms/join', payload)
      return response.data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomKeys.list() }),
        queryClient.invalidateQueries({ queryKey: roomKeys.mine() }),
      ])
    },
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomCode, ...payload }: UpdateRoomPayload) => {
      const response = await apiPatch<RoomDetail>(`/rooms/${roomCode}`, payload)
      return {
        roomCode,
        data: response.data,
      }
    },
    onSuccess: async ({ roomCode }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomKeys.codeDetail(roomCode) }),
        queryClient.invalidateQueries({ queryKey: roomKeys.mine() }),
      ])
    },
  })
}

export interface RemoveMemberPayload {
  roomCode: string
  memberId: number | string
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomCode, memberId }: RemoveMemberPayload) => {
      await apiDelete<null>(`/rooms/${roomCode}/members/${memberId}`)
    },
    onSuccess: async (_, { roomCode }) => {
      await queryClient.invalidateQueries({ queryKey: roomKeys.members(roomCode) })
    },
  })
}

export function useDeleteOrLeaveRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomCode }: DeleteOrLeaveRoomPayload) => {
      await apiDelete<null>(`/rooms/${roomCode}`)
      return roomCode
    },
    onSuccess: async (roomCode) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomKeys.codeDetail(roomCode) }),
        queryClient.invalidateQueries({ queryKey: roomKeys.mine() }),
      ])
    },
  })
}

export function useRoomTeams(roomCode?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roomKeys.teams(roomCode ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<RoomTeamsResponse>(`/rooms/${roomCode}/teams`)
      return response.data
    },
    enabled: Boolean(roomCode) && (options?.enabled ?? true),
  })
}

export function useStartMatching() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomCode }: { roomCode: string }) => {
      const response = await apiPost<MatchResult>(`/rooms/${roomCode}/match`)
      return { roomCode, data: response.data }
    },
    onSuccess: async ({ roomCode }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomKeys.codeDetail(roomCode) }),
        queryClient.invalidateQueries({ queryKey: roomKeys.members(roomCode) }),
        queryClient.invalidateQueries({ queryKey: roomKeys.teams(roomCode) }),
        queryClient.invalidateQueries({ queryKey: roomKeys.mine() }),
      ])
    },
  })
}

export function useTransferLeader() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, newLeaderRoomMemberId }: TransferLeaderPayload) => {
      const response = await apiPost<TransferLeaderResponse>(`/teams/${teamId}/transfer-leader`, {
        new_leader_room_member_id: newLeaderRoomMemberId,
      })
      return response.data
    },
    onSuccess: async (_data, { roomCode }) => {
      if (roomCode) {
        await queryClient.invalidateQueries({ queryKey: roomKeys.teams(roomCode) })
      } else {
        await queryClient.invalidateQueries({ queryKey: roomKeys.all })
      }
    },
  })
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, roomMemberId, assignedRole }: ChangeMemberRolePayload) => {
      const response = await apiPatch<{ room_member_id: number | string; assigned_role: string }>(
        `/teams/${teamId}/members/${roomMemberId}/role`,
        { assigned_role: assignedRole },
      )
      return response.data
    },
    onSuccess: async (_data, { roomCode }) => {
      if (roomCode) {
        await queryClient.invalidateQueries({ queryKey: roomKeys.teams(roomCode) })
      } else {
        await queryClient.invalidateQueries({ queryKey: roomKeys.all })
      }
    },
  })
}

export function useTeamTargets(teamId?: number | string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roomKeys.targets(teamId ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<TeamTargetsResponse>(`/teams/${teamId}/targets`)
      return response.data
    },
    enabled: Boolean(teamId) && (options?.enabled ?? true),
  })
}

export function useCreateTeamTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, role, title, deadline }: CreateTeamTargetPayload) => {
      const body: Record<string, unknown> = { role, title }
      if (deadline !== undefined) body.deadline = deadline
      const response = await apiPost<TeamRoleTarget>(`/teams/${teamId}/targets`, body)
      return response.data
    },
    onSuccess: async (_data, { teamId }) => {
      await queryClient.invalidateQueries({ queryKey: roomKeys.targets(teamId) })
    },
  })
}

export function useUpdateTeamTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, targetId, title, deadline }: UpdateTeamTargetPayload) => {
      const body: Record<string, unknown> = {}
      if (title !== undefined) body.title = title
      if (deadline !== undefined) body.deadline = deadline
      const response = await apiPatch<TeamRoleTarget>(`/teams/${teamId}/targets/${targetId}`, body)
      return response.data
    },
    onSuccess: async (_data, { teamId }) => {
      await queryClient.invalidateQueries({ queryKey: roomKeys.targets(teamId) })
    },
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, projectName, description, deadline }: UpdateTeamPayload) => {
      const body: Record<string, unknown> = {}
      if (projectName !== undefined) body.project_name = projectName
      if (description !== undefined) body.description = description
      if (deadline !== undefined) body.deadline = deadline
      const response = await apiPatch<{
        id: number | string
        project_name: string | null
        description: string | null
        deadline: string | null
        finished_at: string | null
      }>(`/teams/${teamId}`, body)
      return response.data
    },
    onSuccess: async (_data, { roomCode }) => {
      if (roomCode) {
        await queryClient.invalidateQueries({ queryKey: roomKeys.teams(roomCode) })
      } else {
        await queryClient.invalidateQueries({ queryKey: roomKeys.all })
      }
    },
  })
}

export function useFinishTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId }: FinishTeamPayload) => {
      const response = await apiPost<{ id: number | string; finished_at: string | null; deadline: string | null }>(
        `/teams/${teamId}/finish`,
      )
      return response.data
    },
    onSuccess: async (_data, { roomCode }) => {
      if (roomCode) {
        await queryClient.invalidateQueries({ queryKey: roomKeys.teams(roomCode) })
      } else {
        await queryClient.invalidateQueries({ queryKey: roomKeys.all })
      }
    },
  })
}

export function useDeleteTeamTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, targetId }: DeleteTeamTargetPayload) => {
      await apiDelete<null>(`/teams/${teamId}/targets/${targetId}`)
    },
    onSuccess: async (_data, { teamId }) => {
      await queryClient.invalidateQueries({ queryKey: roomKeys.targets(teamId) })
    },
  })
}

export interface FeedbackStatusResponse {
  team_id: number | string
  total_required: number
  total_given: number
  complete: boolean
  my_room_member_id: number | string | null
  my_complete: boolean
  my_missing_targets: Array<number | string>
  missing_contributors: Array<number | string>
}

export interface TeamFeedback {
  id: number | string
  team_id: number | string
  from_room_member_id: number | string
  to_room_member_id: number | string
  to_assigned_role?: string | null
  rating: number | null
  content: string
  created_at: string | null
  updated_at: string | null
  from_user?: { id: number | string; name: string; username: string } | null
}

export function useFeedbackStatus(teamId?: number | string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roomKeys.feedbackStatus(teamId ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<FeedbackStatusResponse>(`/teams/${teamId}/feedbacks/status`)
      return response.data
    },
    enabled: Boolean(teamId) && (options?.enabled ?? true),
  })
}

export function useFeedbacksGiven(teamId?: number | string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roomKeys.feedbacksGiven(teamId ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<{ team_id: number | string; feedbacks: TeamFeedback[] }>(`/teams/${teamId}/feedbacks/given`)
      return response.data
    },
    enabled: Boolean(teamId) && (options?.enabled ?? true),
  })
}

export function useFeedbacksReceived(
  teamId?: number | string,
  roomMemberId?: number | string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: roomKeys.feedbacksReceived(teamId ?? 'unknown', roomMemberId ?? 'unknown'),
    queryFn: async () => {
      const response = await apiGet<{ team_id: number | string; room_member_id: number | string; feedbacks: TeamFeedback[] }>(
        `/teams/${teamId}/members/${roomMemberId}/feedbacks`,
      )
      return response.data
    },
    enabled: Boolean(teamId) && Boolean(roomMemberId) && (options?.enabled ?? true),
  })
}

export function useTeamHistory() {
  return useQuery({
    queryKey: roomKeys.history(),
    queryFn: async () => {
      const response = await apiGet<TeamHistoryItem[]>('/history/teams')
      return response.data
    },
  })
}

export interface ProfileRoleRating {
  role: string
  avg_rating: number
  count: number
}

export interface ProfileFeedbackItem {
  id: number | string
  to_assigned_role?: string | null
  rating: number | null
  content: string | null
  created_at: string | null
  from_user?: { id: number | string; name: string; username: string } | null
}

export interface FeedbackSummary {
  role_ratings: ProfileRoleRating[]
  feedbacks: ProfileFeedbackItem[]
}

export function useMyFeedbackSummary() {
  return useQuery({
    queryKey: ['me', 'feedback-summary'],
    queryFn: async () => {
      const response = await apiGet<FeedbackSummary>('/me/feedback-summary')
      return response.data
    },
  })
}

export interface GiveFeedbackPayload {
  teamId: number | string
  toRoomMemberId: number | string
  rating: number
  content?: string
}

export function useGiveFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, toRoomMemberId, rating, content }: GiveFeedbackPayload) => {
      const response = await apiPost<TeamFeedback>(`/teams/${teamId}/feedbacks`, {
        to_room_member_id: toRoomMemberId,
        rating,
        content: content ?? '',
      })
      return response.data
    },
    onSuccess: async (_data, { teamId, toRoomMemberId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomKeys.feedbackStatus(teamId) }),
        queryClient.invalidateQueries({ queryKey: roomKeys.feedbacksGiven(teamId) }),
        queryClient.invalidateQueries({ queryKey: roomKeys.feedbacksReceived(teamId, toRoomMemberId) }),
      ])
    },
  })
}

export function useToggleTeamTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, targetId }: ToggleTeamTargetPayload) => {
      const response = await apiPost<TeamRoleTarget>(`/teams/${teamId}/targets/${targetId}/toggle`)
      return response.data
    },
    onSuccess: async (_data, { teamId }) => {
      await queryClient.invalidateQueries({ queryKey: roomKeys.targets(teamId) })
    },
  })
}

export { roomKeys }
