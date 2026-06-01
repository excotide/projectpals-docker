import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

type SidebarNavLabel =
  | "Dashboard"
  | "Create Room"
  | "Join Room"
  | "My Rooms"
  | "Profile"
  | "History";

const NAV_ROUTES: Record<SidebarNavLabel, string> = {
  "Dashboard": "/dashboard",
  "Create Room": "/create-room",
  "Join Room": "/join-room",
  "My Rooms": "/my-rooms",
  "Profile": "/profile",
  "History": "/history",
};

export function useSidebarNavigation(initialActive: SidebarNavLabel) {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<string>(initialActive);

  const handleNavClick = useCallback(
    (label: string) => {
      setActiveNav(label);
      const route = NAV_ROUTES[label as SidebarNavLabel];
      if (route) navigate(route);
    },
    [navigate]
  );

  return { activeNav, setActiveNav, handleNavClick };
}
