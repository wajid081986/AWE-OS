ALTER TABLE tools
ADD COLUMN IF NOT EXISTS saas_tool_id UUID;

CREATE INDEX IF NOT EXISTS idx_tools_saas_tool_id
  ON tools(saas_tool_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tools_saas_tool_id_unique
  ON tools(saas_tool_id)
  WHERE saas_tool_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tools_saas_tool_id_fkey'
  ) THEN
    ALTER TABLE tools
    ADD CONSTRAINT tools_saas_tool_id_fkey
    FOREIGN KEY (saas_tool_id)
    REFERENCES saas_tools(id)
    ON DELETE SET NULL;
  END IF;
END $$;
