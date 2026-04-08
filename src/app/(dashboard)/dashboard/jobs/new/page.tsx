import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreateJobForm } from '@/components/jobs/create-job-form';

export default async function NewJobPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
  if (!isAdmin) redirect('/dashboard');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#141d1c]">Create Job</h1>
        <p className="text-sm text-[#8fa8a6] mt-1">
          Step 1 of 2 — Job details
        </p>
      </div>
      <CreateJobForm />
    </div>
  );
}
