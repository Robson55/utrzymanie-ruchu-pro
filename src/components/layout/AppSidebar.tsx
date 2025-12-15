import { Link, useLocation, useSearchParams } from 'react-router-dom';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  ChevronRight,
  Circle,
  CircleCheck,
  PlayCircle,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react';
import { ROLE_LABELS } from '@/types/database';

export function AppSidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, roles, signOut, hasRole, isManager } = useAuth();

  const currentStatus = searchParams.get('status');

  const issueStatusItems = [
    { title: 'Wszystkie', status: null, icon: AlertCircle },
    { title: 'Nowe', status: 'nowe', icon: Circle },
    { title: 'Zaakceptowane', status: 'zaakceptowane', icon: CircleCheck },
    { title: 'W realizacji', status: 'w_realizacji', icon: PlayCircle },
    { title: 'Zakończone', status: 'zakonczone', icon: CheckCircle2 },
  ];

  const mainMenuItems = [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboard,
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
      title: 'Planowane prace',
      url: '/planned-works',
      icon: CalendarClock,
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

  const isIssuesActive = location.pathname === '/issues' || location.pathname.startsWith('/issues');

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
              <SidebarMenuItem key="dashboard">
                <SidebarMenuButton asChild isActive={location.pathname === '/'}>
                  <Link to="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Tablica</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Zgłoszenia with submenu */}
              <Collapsible asChild defaultOpen={isIssuesActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isIssuesActive}>
                      <AlertCircle className="h-4 w-4" />
                      <span>Zgłoszenia</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {issueStatusItems.map((item) => (
                        <SidebarMenuSubItem key={item.status || 'all'}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={
                              location.pathname === '/issues' &&
                              (item.status === null ? !currentStatus : currentStatus === item.status)
                            }
                          >
                            <Link to={item.status ? `/issues?status=${item.status}` : '/issues'}>
                              <item.icon className="h-3 w-3" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

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
