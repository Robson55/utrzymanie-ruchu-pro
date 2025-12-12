export type AppRole = 'kierownik_zmiany' | 'kontrola_jakosci' | 'kierownik_ur' | 'mechanik' | 'admin';

export type IssueStatus = 'nowe' | 'zaakceptowane' | 'w_realizacji' | 'zakonczone' | 'usuniete';

export type IssueSubstatus = 'aktywne' | 'wstrzymane' | 'przerwa' | 'brak_czesci';

export type IssuePriority = 'niski' | 'sredni' | 'wysoki' | 'krytyczny';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Machine {
  id: string;
  name: string;
  machine_number: string;
  location: string | null;
  machine_type: string | null;
  manufacturer: string | null;
  installation_date: string | null;
  description: string | null;
  documentation_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  machine_id: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  substatus: IssueSubstatus | null;
  reported_by: string;
  accepted_by: string | null;
  assigned_to: string | null;
  reported_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  reaction_time_minutes: number | null;
  assignment_time_minutes: number | null;
  work_time_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  machine?: Machine;
  reporter?: Profile;
  acceptor?: Profile;
  assignee?: Profile;
}

export interface IssueStatusHistory {
  id: string;
  issue_id: string;
  status: IssueStatus;
  substatus: IssueSubstatus | null;
  changed_by: string;
  comment: string | null;
  changed_at: string;
  // Joined data
  changer?: Profile;
}

export interface IssueAttachment {
  id: string;
  issue_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export const STATUS_LABELS: Record<IssueStatus, string> = {
  nowe: 'Nowe',
  zaakceptowane: 'Zaakceptowane',
  w_realizacji: 'W realizacji',
  zakonczone: 'Zakończone',
  usuniete: 'Usunięte',
};

export const SUBSTATUS_LABELS: Record<IssueSubstatus, string> = {
  aktywne: 'Aktywne',
  wstrzymane: 'Wstrzymane',
  przerwa: 'Przerwa',
  brak_czesci: 'Brak części',
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  niski: 'Niski',
  sredni: 'Średni',
  wysoki: 'Wysoki',
  krytyczny: 'Krytyczny',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  kierownik_zmiany: 'Kierownik zmiany',
  kontrola_jakosci: 'Kontrola jakości',
  kierownik_ur: 'Kierownik UR',
  mechanik: 'Mechanik',
  admin: 'Administrator',
};
