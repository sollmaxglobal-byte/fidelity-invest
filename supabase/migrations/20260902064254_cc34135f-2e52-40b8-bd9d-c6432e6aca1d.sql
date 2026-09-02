ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS deposit_min_amount numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS deposit_max_amount numeric NOT NULL DEFAULT 10000000,
  ADD COLUMN IF NOT EXISTS withdraw_min_amount numeric NOT NULL DEFAULT 250;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _account_name text, _account_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur numeric;
  new_id uuid;
  min_amt numeric;
  clean_name text := trim(COALESCE(_account_name, ''));
  clean_number text := trim(COALESCE(_account_number, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT COALESCE(withdraw_min_amount, 250) INTO min_amt FROM public.app_settings WHERE id = 1;
  min_amt := COALESCE(min_amt, 250);
  IF _amount IS NULL OR _amount < min_amt THEN RAISE EXCEPTION 'Minimum withdrawal is % XAF', min_amt; END IF;
  IF _amount <> trunc(_amount) THEN RAISE EXCEPTION 'Withdrawal amount must be a whole number'; END IF;
  IF _method NOT IN ('mobile_money','bank_transfer','crypto') THEN RAISE EXCEPTION 'Invalid method'; END IF;
  IF length(clean_name) < 2 OR length(clean_name) > 120 THEN RAISE EXCEPTION 'Enter a valid account name'; END IF;
  IF length(clean_number) < 4 OR length(clean_number) > 120 THEN RAISE EXCEPTION 'Enter a valid account number'; END IF;

  SELECT balance INTO cur FROM public.profiles WHERE id = uid FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'Account profile not found'; END IF;
  IF cur < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  INSERT INTO public.withdrawals(user_id, amount, method, account_name, account_number, status)
  VALUES (uid, _amount, _method::public.payment_method_type, clean_name, clean_number, 'pending')
  RETURNING id INTO new_id;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET balance = balance - _amount WHERE id = uid;

  INSERT INTO public.transactions(user_id, type, amount, description, ref_id)
  VALUES (uid, 'withdrawal_hold'::public.transaction_type, -_amount, 'Withdrawal request submitted (funds held)', new_id);

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) TO authenticated, service_role;