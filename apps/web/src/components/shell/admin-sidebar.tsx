import type * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AdminNavMain } from "./admin-nav-main";
import { NavLogo } from "./nav-logo";
import { NavUser } from "./nav-user";
import { ThemeToggle } from "./theme-toggle";

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavLogo />
      </SidebarHeader>
      <SidebarContent>
        <AdminNavMain />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-center space-x-2">
          <NavUser />
          <ThemeToggle className="group-data-[state=collapsed]:hidden" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
