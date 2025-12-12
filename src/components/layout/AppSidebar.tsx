import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  AlertCircle,
  CheckSquare,
  Wrench,
  Settings,
  BarChart3,
  LogOut,
  Users,
  Cog,
  Monitor,
} from 'lucide-react';
import { ROLE_LABELS } from '@/types/database';

export function AppSidebar() {
  const location = useLocation();
  const { profile, roles, signOut, hasRole, isManager } = useAuth();

  const mainMenuItems = [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      title: 'Zgłoszenia',
      url: '/issues',
      icon: AlertCircle,
      visible: true,
    },
    {
      title: 'Moje zadania',
      url: '/my-tasks',
      icon: CheckSquare,
      visible: hasRole('mechanik'),
    },
    {
      title: 'Maszyny',
      url: '/machines',
      icon: Cog,
      visible: true,
    },
    {
      title: 'Raporty',
      url: '/reports',
      icon: BarChart3,
      visible: isManager(),
    },
  ];

  const adminMenuItems = [
    {
      title: 'Użytkownicy',
      url: '/users',
      icon: Users,
      visible: hasRole('admin'),
    },
    {
      title: 'Tablica zleceń',
      url: '/display',
      icon: Monitor,
      visible: isManager(),
      external: true,
    },
    {
      title: 'Ustawienia',
      url: '/settings',
      icon: Settings,
      visible: hasRole('admin'),
    },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">BERICAP</h1>
            <p className="text-xs text-sidebar-foreground/60">Utrzymanie Ruchu</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Menu główne</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems
                .filter((item) => item.visible)
                .map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminMenuItems.some((item) => item.visible) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Administracja</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems
                  .filter((item) => item.visible)
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.url}
                      >
                        {item.external ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </a>
                        ) : (
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="mb-3">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {profile?.full_name || 'Użytkownik'}
          </p>
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {roles.length > 0 ? roles.map((r) => ROLE_LABELS[r]).join(', ') : 'Brak roli'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Wyloguj się
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
