import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'

export interface Room {
  id: number | string
  room_code?: string
  project_theme?: string
  max_per_group?: number
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
  number_of_groups?: number
  name?: string
  roles?: string[]
  maxPerGroup?: number
  numGroups?: number
  [key: string]: unknown
}

export interface JoinRoomPayload {
  room_code?: string
  primary_role?: string
  backup_role?: string
  productivity_windows?: string[]
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
  backupRole?: string
  productivityWindows: string[]
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

export type RoomStatus = 'open' | 'matching' | 'ongoing' | 'closed' | 'matched'

export interface UpdateRoomPayload {
  roomCode: string
  project_theme: string
  roles: string[]
  max_per_group: number
  number_of_groups: number
  status: RoomStatus
}

export interface RoomTeamMember {
  room_member_id: number | string
  assigned_role: string
  score: number
  primary_role: string | null
  backup_role: string | null
  user: RoomMemberUser | null
}

export interface RoomTeam {
  team_number: number
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
    team_number: number
    members: Array<{
      room_member_id: number | string
      assigned_role: string
      score: number
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
  productivity_windows: string[] | null
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

const roomKeys = {
  all: ['rooms'] as const,
  list: () => [...roomKeys.all, 'list'] as const,
  mine: () => [...roomKeys.all, 'mine'] as const,
  detail: (id: number | string) => [...roomKeys.all, 'detail', id] as const,
  codeDetail: (roomCode: string) => [...roomKeys.all, 'code-detail', roomCode] as const,
  joinPreview: (roomCode: string) => [...roomKeys.all, 'join-preview', roomCode] as const,
  members: (roomCode: string) => [...roomKeys.all, 'members', roomCode] as const,
  teams: (roomCode: string) => [...roomKeys.all, 'teams', roomCode] as const,
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

export { roomKeys }
