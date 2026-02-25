/*
  # Create Tenancy and Rent Payment Tables

  1. New Tables
    - `tenancy_agreements` - Rental agreements between landlords and tenants
      - `id` (uuid, PK)
      - `landlord_id`, `tenant_id` (uuid, references members)
      - `hostel_id` (uuid, references hostels)
      - `property_address`, `monthly_rent`, `start_date`, `end_date`
      - `terms`, `status`, `ghana_rent_act_compliant`
    - `rent_invoices` - Monthly rent invoices
      - `id` (uuid, PK)
      - `agreement_id` (uuid, references tenancy_agreements)
      - `amount`, `due_date`, `period_start`, `period_end`
      - `status`, `invoice_number`, `paid_at`
    - `rent_payments` - Payment records for rent invoices
      - `id` (uuid, PK)
      - `invoice_id` (uuid, references rent_invoices)
      - `tenant_id` (uuid, references members)
      - `amount`, `payment_method`, `payment_reference`, `status`

  2. Security
    - RLS enabled on all tables
    - Landlords and tenants can view their own agreements/invoices/payments
*/

-- Tenancy agreements
CREATE TABLE IF NOT EXISTS tenancy_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  property_address text NOT NULL DEFAULT '',
  monthly_rent numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  terms text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'expired', 'terminated')),
  ghana_rent_act_compliant boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenancy_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view own agreements"
  ON tenancy_agreements FOR SELECT
  TO authenticated
  USING (landlord_id = auth.uid() OR tenant_id = auth.uid());

CREATE POLICY "Landlords can create agreements"
  ON tenancy_agreements FOR INSERT
  TO authenticated
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can update own agreements"
  ON tenancy_agreements FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Rent invoices
CREATE TABLE IF NOT EXISTS rent_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES tenancy_agreements(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'waived')),
  invoice_number text NOT NULL DEFAULT '',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rent_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agreement parties can view invoices"
  ON rent_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenancy_agreements ta
      WHERE ta.id = rent_invoices.agreement_id
      AND (ta.landlord_id = auth.uid() OR ta.tenant_id = auth.uid())
    )
  );

CREATE POLICY "Landlords can create invoices"
  ON rent_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancy_agreements ta
      WHERE ta.id = rent_invoices.agreement_id
      AND ta.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update invoices"
  ON rent_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenancy_agreements ta
      WHERE ta.id = rent_invoices.agreement_id
      AND ta.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancy_agreements ta
      WHERE ta.id = rent_invoices.agreement_id
      AND ta.landlord_id = auth.uid()
    )
  );

-- Rent payments
CREATE TABLE IF NOT EXISTS rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES rent_invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own payments"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Landlords can view payments on their invoices"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rent_invoices ri
      JOIN tenancy_agreements ta ON ta.id = ri.agreement_id
      WHERE ri.id = rent_payments.invoice_id
      AND ta.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create payments"
  ON rent_payments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can update own payments"
  ON rent_payments FOR UPDATE
  TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenancy_landlord ON tenancy_agreements(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_tenant ON tenancy_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_invoices_agreement ON rent_invoices(agreement_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_invoice ON rent_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant ON rent_payments(tenant_id);
