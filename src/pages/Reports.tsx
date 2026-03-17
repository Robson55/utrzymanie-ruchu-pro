import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorHandler';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, TrendingUp, Clock, Wrench, AlertCircle, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

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
            .gte('reported_at', daysAgo.toISOString()),
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

  // Work time per machine
  const machineWorkTimeData = machines
    .map((machine) => {
      const machineIssues = issues.filter(
        (i) => i.machine_id === machine.id && i.work_time_minutes
      );
      const totalWorkTime = machineIssues.reduce(
        (sum, i) => sum + (i.work_time_minutes || 0),
        0
      );
      const avgWorkTime =
        machineIssues.length > 0
          ? Math.round(totalWorkTime / machineIssues.length)
          : 0;
      return {
        name: machine.name,
        machine_number: machine.machine_number,
        totalMinutes: totalWorkTime,
        avgMinutes: avgWorkTime,
        issueCount: machineIssues.length,
      };
    })
    .filter((m) => m.totalMinutes > 0)
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 15);

  // Detailed work time per issue
  const issueWorkTimeData = issues
    .filter((i) => i.work_time_minutes && i.status === 'zakonczone')
    .map((issue) => {
      const machine = machines.find((m) => m.id === issue.machine_id);
      return {
        title: issue.title,
        machine: machine?.name || 'Nieznana',
        machine_number: machine?.machine_number || '-',
        workTime: issue.work_time_minutes || 0,
        completedAt: issue.completed_at,
      };
    })
    .sort((a, b) => b.workTime - a.workTime)
    .slice(0, 20);

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

      {/* Work Time by Machine Chart */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Czas pracy wg maszyny
          </CardTitle>
          <CardDescription>
            Łączny i średni czas realizacji zgłoszeń na maszynach
          </CardDescription>
        </CardHeader>
        <CardContent>
          {machineWorkTimeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak danych do wyświetlenia
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineWorkTimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${value}min`}
                  />
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
                    formatter={(value: number, name: string) => {
                      if (name === 'totalMinutes') {
                        return [
                          value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}min` : `${value}min`,
                          'Łączny czas',
                        ];
                      }
                      return [
                        value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}min` : `${value}min`,
                        'Średni czas',
                      ];
                    }}
                  />
                  <Legend 
                    formatter={(value) => value === 'totalMinutes' ? 'Łączny czas' : 'Średni czas'}
                  />
                  <Bar dataKey="totalMinutes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="totalMinutes" />
                  <Bar dataKey="avgMinutes" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} name="avgMinutes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Work Time Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Szczegóły czasów realizacji zgłoszeń
          </CardTitle>
          <CardDescription>
            Lista zakończonych zgłoszeń z czasami wykonania
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issueWorkTimeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak danych do wyświetlenia
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł zgłoszenia</TableHead>
                    <TableHead>Maszyna</TableHead>
                    <TableHead>Nr maszyny</TableHead>
                    <TableHead className="text-right">Czas realizacji</TableHead>
                    <TableHead>Data zakończenia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issueWorkTimeData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>{item.machine}</TableCell>
                      <TableCell>{item.machine_number}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.workTime >= 60
                          ? `${Math.floor(item.workTime / 60)}h ${item.workTime % 60}min`
                          : `${item.workTime}min`}
                      </TableCell>
                      <TableCell>
                        {item.completedAt
                          ? format(new Date(item.completedAt), 'dd MMM yyyy, HH:mm', { locale: pl })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
