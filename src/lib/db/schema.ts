type SqlClient = (
  strings: TemplateStringsArray,
  ...params: unknown[]
) => Promise<unknown>;

type SqlClientWithQuery = SqlClient & {
  query?: (statement: string, params?: unknown[]) => Promise<unknown>;
};

type ApplyAppSchemaOptions = {
  appRole?: string;
};

function quoteIdentifier(identifier: string) {
  if (!identifier.trim()) {
    throw new Error("Database role name cannot be empty.");
  }

  return `"${identifier.replace(/"/g, '""')}"`;
}

async function executeStatement(sql: SqlClientWithQuery, statement: string) {
  if (sql.query) {
    await sql.query(statement);
    return;
  }

  await sql([statement] as unknown as TemplateStringsArray);
}

async function grantAppPrivileges(sql: SqlClientWithQuery, appRole: string) {
  const role = quoteIdentifier(appRole);

  await executeStatement(sql, `GRANT USAGE ON SCHEMA public TO ${role}`);
  await executeStatement(
    sql,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects, project_profiles, source_items TO ${role}`,
  );
  await executeStatement(
    sql,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
  );
}

export async function applyAppSchema(
  sql: SqlClientWithQuery,
  options: ApplyAppSchemaOptions = {},
) {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      title text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE projects
    DROP COLUMN IF EXISTS current_html_version_id
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS project_profiles (
      project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      target_audience text NOT NULL,
      tone text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS goal
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS depth
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS structure_style
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS reader_level
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS outline
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT ''
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS core_message text NOT NULL DEFAULT ''
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS design_mode text NOT NULL DEFAULT 'balanced'
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS plan jsonb
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS document jsonb NOT NULL DEFAULT '[]'::jsonb
  `;

  await executeStatement(
    sql,
    `
      ALTER TABLE project_profiles
      ALTER COLUMN plan DROP DEFAULT,
      ALTER COLUMN plan DROP NOT NULL,
      ALTER COLUMN plan TYPE jsonb USING
        CASE
          WHEN plan IS NULL OR plan::text = '' THEN NULL
          ELSE plan::jsonb
        END
    `,
  );

  await executeStatement(
    sql,
    `
      ALTER TABLE project_profiles
      ALTER COLUMN document DROP DEFAULT,
      ALTER COLUMN document TYPE jsonb USING
        CASE
          WHEN document IS NULL OR document::text = '' THEN '[]'::jsonb
          ELSE document::jsonb
        END,
      ALTER COLUMN document SET DEFAULT '[]'::jsonb,
      ALTER COLUMN document SET NOT NULL
    `,
  );

  await executeStatement(
    sql,
    `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'project_profiles'
            AND column_name = 'blocks'
        ) THEN
          UPDATE project_profiles
          SET document = blocks::jsonb
          WHERE (document IS NULL OR document = '[]'::jsonb)
            AND blocks IS NOT NULL
            AND blocks::text <> '';

          ALTER TABLE project_profiles DROP COLUMN blocks;
        END IF;
      END $$;
    `,
  );

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS page_format text NOT NULL DEFAULT 'ebook'
  `;

  await sql`
    ALTER TABLE project_profiles
    ALTER COLUMN page_format SET DEFAULT 'ebook'
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS page_width_mm numeric NOT NULL DEFAULT 152
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS page_height_mm numeric NOT NULL DEFAULT 229
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS source_items (
      id text PRIMARY KEY,
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      source_type text NOT NULL,
      original_filename text,
      raw_text text NOT NULL,
      normalized_text text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await executeStatement(sql, "DROP TABLE IF EXISTS html_versions");

  await sql`
    CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx
    ON projects (user_id, updated_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS source_items_project_id_created_at_idx
    ON source_items (project_id, created_at DESC)
  `;

  if (options.appRole) {
    await grantAppPrivileges(sql, options.appRole);
  }
}
