import { Link } from "@tanstack/react-router";
import { HandFist, ListTodoIcon, type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
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
      title: "Hello",
      url: "/app/hello-form",
      icon: HandFist,
    },
    {
      title: "Todo Kanboard",
      url: "/app/todo",
      icon: ListTodoIcon,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-1">
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
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
