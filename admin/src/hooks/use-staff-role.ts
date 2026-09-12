'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isStaffRole, type StaffRole } from '@/lib/rbac';

export function useStaffRole() {
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      const metaRole = user.app_metadata?.role as string | undefined;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      const next = (profile?.role as string | undefined) ?? metaRole;
      if (isStaffRole(next)) setRole(next);
    });
  }, []);

  return role;
}
