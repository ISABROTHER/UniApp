/*
  # Add RLS policies for rent_payments

  ## Changes
  - Add SELECT policy: tenants can read their own payment records
  - Add INSERT policy: tenants can create their own payment records
  - Add UPDATE policy: tenants can update their own payment records (e.g. status)

  ## Security
  - All policies use auth.uid() = tenant_id to restrict access to the record owner
  - No public access granted
*/

CREATE POLICY "Tenants can view own rent payments"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can insert own rent payments"
  ON rent_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update own rent payments"
  ON rent_payments FOR UPDATE
  TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);
