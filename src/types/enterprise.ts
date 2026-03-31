export type EnterpriseRole = "owner" | "admin" | "member";

export type EmployeeCount =
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "500+";

export interface Enterprise {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  employee_count: EmployeeCount | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
}

export interface EnterpriseMember {
  id: string;
  enterprise_id: string;
  user_id: string;
  role: EnterpriseRole;
  created_at: string;
}

export interface CreateEnterpriseInput {
  name: string;
  website_url?: string;
  employee_count: EmployeeCount;
  city: string;
  state: string;
  country: string;
}
