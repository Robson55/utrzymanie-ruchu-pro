import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Issue, Machine, STATUS_LABELS, PRIORITY_LABELS } from '@/types/database';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Loader2, TrendingUp, Clock, Wrench, AlertCircle } from 'lucide-react';

export default function Reports() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

        const [issuesResult, machinesResult] = await Promise.all([
          supabase
            .from('issues')
            .select('*')
            .gte('created_at', daysAgo.toISOString()),
          supabase.from('machines').select('*'),
        ]);

        if (issuesResult.data) setIssues(issuesResult.data as Issue[]);
        if (machinesResult.data) setMachines(machinesResult.data as Machine[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  // Calculate stats
  const totalIssues = issues.length;
  const completedIssues = issues.filter((i) => i.status === 'zakonczone').length;
  const avgReactionTime =
    issues.filter((i) => i.reaction_time_minutes).length > 0
      ? Math.round(
          issues
            .filter((i) => i.reaction_time_minutes)
            .reduce((sum, i) => sum + (i.reaction_time_minutes || 0), 0) /
            issues.filter((i) => i.reaction_time_minutes).length
        )
      : 0;
  const avgWorkTime =
    issues.filter((i) => i.work_time_minutes).length > 0
      ? Math.round(
          issues
            .filter((i) => i.work_time_minutes)
            .reduce((sum, i) => sum + (i.work_time_minutes || 0), 0) /
            issues.filter((i) => i.work_time_minutes).length
        )
      : 0;

  // Issues by status
  const statusData = Object.entries(STATUS_LABELS).map(([status, label]) => ({
    name: label,
    value: issues.filter((i) => i.status === status).length,
  }));

  // Issues by priority
  const priorityData = Object.entries(PRIORITY_LABELS).map(([priority, label]) => ({
    name: label,
    value: issues.filter((i) => i.priority === priority).length,
  }));

  // Issues by machine
  const machineData = machines
    .map((machine) => ({
      name: machine.name,
      issues: issues.filter((i) => i.machine_id === machine.id).length,
    }))
    .filter((m) => m.issues > 0)
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 10);

  const COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(38, 92%, 50%)', 'hsl(142, 76%, 36%)'];
  const PRIORITY_COLORS = ['hsl(142, 76%, 36%)', 'hsl(217, 91%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Raporty</h1>
          <p className="text-muted-foreground">
            Statystyki i analizy zgłoszeń
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ostatnie 7 dni</SelectItem>
            <SelectItem value="30">Ostatnie 30 dni</SelectItem>
            <SelectItem value="90">Ostatnie 90 dni</SelectItem>
            <SelectItem value="365">Ostatni rok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wszystkie zgłoszenia
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalIssues}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zakończone
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedIssues}</div>
            <p className="text-xs text-muted-foreground">
              {totalIssues > 0
                ? `${Math.round((completedIssues / totalIssues) * 100)}% wszystkich`
                : '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Śr. czas reakcji
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgReactionTime > 0 ? `${avgReactionTime}min` : '-'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Śr. czas realizacji
            </CardTitle>
            <Wrench className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgWorkTime > 0
                ? avgWorkTime >= 60
                  ? `${Math.floor(avgWorkTime / 60)}h ${avgWorkTime % 60}min`
                  : `${avgWorkTime}min`
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Zgłoszenia wg statusu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Zgłoszenia wg priorytetu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine Chart */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Top 10 maszyn wg liczby zgłoszeń</CardTitle>
          <CardDescription>
            Maszyny z największą liczbą zgłoszeń
          </CardDescription>
        </CardHeader>
        <CardContent>
          {machineData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak danych do wyświetlenia
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="issues" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
