CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.bypass_profile_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.balance := OLD.balance;
  NEW.total_invested := OLD.total_invested;
  NEW.total_earned := OLD.total_earned;
  NEW.referral_earnings := OLD.referral_earnings;
  NEW.kyc_status := OLD.kyc_status;
  NEW.is_suspended := OLD.is_suspended;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.id := OLD.id;
  RETURN NEW;
END;
$function$;