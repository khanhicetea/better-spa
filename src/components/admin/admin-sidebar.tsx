import type * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavLogo } from "../common/nav-logo";
import { NavUser } from "../common/nav-user";
import { ThemeToggle } from "../spa/theme-toggle";
import { NavMain } from "./nav-main";

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
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
