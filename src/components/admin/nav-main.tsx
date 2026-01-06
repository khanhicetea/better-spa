import { Link } from "@tanstack/react-router";
import { Briefcase, LayoutDashboard, type LucideIcon, UsersIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain() {
  const items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[] = [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: UsersIcon,
    },
    {
      title: "Jobs",
      url: "/admin/jobs",
      icon: Briefcase,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Admin Navigation</SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              render={
                <Link
                  viewTransition
                  to={item.url}
                  activeProps={{
                    "data-active": "true",
                  }}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              }
            ></SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
