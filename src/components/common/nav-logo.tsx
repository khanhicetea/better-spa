import { PanelRightClose, PanelRightOpen, RocketIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "../ui/button";

export function NavLogo() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex flex-row items-center data-[state=open]:space-x-2">
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <RocketIcon className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">BETTER SPA</span>
            <span className="truncate text-xs">Good balance app</span>
          </div>
        </SidebarMenuButton>
        <Button className="size-8" variant="ghost" onClick={toggleSidebar}>
          {open ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
        </Button>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
