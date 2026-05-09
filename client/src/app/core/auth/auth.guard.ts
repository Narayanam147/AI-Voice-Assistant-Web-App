import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { supabaseClient } from '../supabase/supabase.client';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const { data } = await supabaseClient.auth.getSession();
  
  if (data.session) {
    return true;
  }
  
  return router.parseUrl('/auth/login');
};
