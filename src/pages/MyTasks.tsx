import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Issue, IssueStatus, IssuePriority, IssueSubstatus } from '@/types/database';
import { CheckSquare, Loader2, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;

      try {
        // First get all issue IDs assigned to current user
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('issue_assignments')
          .select('issue_id')
          .eq('user_id', user.id);

        if (assignmentsError) throw assignmentsError;

        if (!assignmentsData || assignmentsData.length === 0) {
          setTasks([]);
          setIsLoading(false);
          return;
        }

        const issueIds = assignmentsData.map(a => a.issue_id);

        // Fetch issues for those IDs
        const { data, error } = await supabase
          .from('issues')
          .select(`
            *,
            machine:machines(name, machine_number)
          `)
          .in('id', issueIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTasks(data as unknown as Issue[]);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  const activeTasks = tasks.filter(
    (t) => t.status === 'zaakceptowane' || t.status === 'w_realizacji'
  );
  const completedTasks = tasks.filter((t) => t.status === 'zakonczone');

  const TaskList = ({ items }: { items: Issue[] }) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Brak zadań</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((task) => (
          <Link key={task.id} to={`/issues/${task.id}`}>
            <Card className="border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {task.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {(task.machine as any)?.name} ({(task.machine as any)?.machine_number})
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(task.reported_at), {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={task.priority as IssuePriority} />
                    <StatusBadge
                      status={task.status as IssueStatus}
                      substatus={task.substatus as IssueSubstatus}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Moje zadania</h1>
        <p className="text-muted-foreground">
          Zadania przypisane do Ciebie
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Aktywne ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Zakończone ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <TaskList items={activeTasks} />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <TaskList items={completedTasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
