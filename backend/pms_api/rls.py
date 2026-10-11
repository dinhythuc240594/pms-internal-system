"""Migration-only helpers. Context settings are LOCAL to each transaction."""

import re

from alembic import op

SYSTEM = "coalesce(current_setting('app.is_system', true),'') = 'true'"
TENANT = "tenant_id = nullif(current_setting('app.tenant_id', true),'')"


def protect_table(table):
    if not re.fullmatch(r"[a-z_]+", table):
        raise ValueError("Invalid migration identifier")
    op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
    op.execute(f'ALTER TABLE "{table}" FORCE ROW LEVEL SECURITY')
    op.execute(
        f'CREATE POLICY tenant_scope ON "{table}" USING ({TENANT} OR {SYSTEM}) WITH CHECK ({TENANT} OR {SYSTEM})'
    )


def unprotect_table(table):
    if not re.fullmatch(r"[a-z_]+", table):
        raise ValueError("Invalid migration identifier")
    op.execute(f'DROP POLICY IF EXISTS tenant_scope ON "{table}"')
    op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')


def append_only(table):
    if not re.fullmatch(r"[a-z_]+", table):
        raise ValueError("Invalid migration identifier")
    op.execute("""CREATE OR REPLACE FUNCTION pms_reject_mutation() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Append-only record' USING ERRCODE='42501'; END $$""")
    op.execute(
        f'CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON "{table}" FOR EACH ROW EXECUTE FUNCTION pms_reject_mutation()'
    )
