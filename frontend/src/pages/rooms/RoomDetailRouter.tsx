import { Navigate, useParams } from "react-router-dom";
import { useRoomByCode } from "../../hooks/useRooms";
import DetailOwnerRoom from "./DetailOwnerRoom";
import DetailMemberRoom from "./DetailMemberRoom";

/**
 * Fetches room access info and renders the appropriate view:
 *   - Owner  → DetailOwnerRoom  (manage room, members, smart matching)
 *   - Member → DetailMemberRoom (view room info, edit own role & work time)
 *
 * React Query caches the result, so both child components calling
 * useRoomByCode internally will reuse the same cached request.
 */
export default function RoomDetailRouter() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { data, isLoading } = useRoomByCode(roomCode);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-pp-bg text-slate-500 text-sm font-sans">
        Loading room...
      </div>
    );
  }

  if (data?.access.is_owner) {
    return <DetailOwnerRoom />;
  }

  if (data?.room?.status === "ongoing") {
    return <Navigate to={`/rooms/${roomCode}/matched`} replace />;
  }

  return <DetailMemberRoom />;
}
