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
    `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects, project_profiles, source_items, app_migrations, ebook_generation_logs TO ${role}`,
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
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'product'
  `;

  await sql`
    ALTER TABLE projects
    ALTER COLUMN project_type SET DEFAULT 'product'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name text PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ebook_generation_logs (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      project_id text REFERENCES projects(id) ON DELETE SET NULL,
      status text NOT NULL,
      stage text,
      blueprint_model text NOT NULL DEFAULT '',
      html_model text NOT NULL DEFAULT '',
      title text NOT NULL DEFAULT '',
      purpose text NOT NULL DEFAULT '',
      target_audience text NOT NULL DEFAULT '',
      ebook_style text,
      accent_color text,
      source_count integer NOT NULL DEFAULT 0,
      source_text_length integer NOT NULL DEFAULT 0,
      blueprint jsonb,
      validation jsonb,
      error_reason text,
      error_message text,
      error_status integer,
      html_length integer,
      slide_count integer,
      created_at timestamp NOT NULL DEFAULT now()
    )
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
    DROP COLUMN IF EXISTS plan
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS document
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS blocks
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS page_format
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS page_width_mm
  `;

  await sql`
    ALTER TABLE project_profiles
    DROP COLUMN IF EXISTS page_height_mm
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT ''
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT ''
  `;

  await executeStatement(
    sql,
    `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'project_profiles'
            AND column_name = 'core_message'
        ) THEN
          UPDATE project_profiles
          SET purpose = core_message
          WHERE purpose = ''
            AND core_message IS NOT NULL
            AND core_message <> '';

          ALTER TABLE project_profiles DROP COLUMN core_message;
        END IF;
      END $$;
    `,
  );

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS design_mode text NOT NULL DEFAULT 'balanced'
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS ebook_style text
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS ebook_html text
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS ebook_document jsonb
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS ebook_page_count integer NOT NULL DEFAULT 16
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#6366f1'
  `;

  await executeStatement(
    sql,
    `
      UPDATE projects
      SET project_type = 'product'
      WHERE project_type IS NULL
        OR project_type <> 'product'
    `,
  );

  await executeStatement(
    sql,
    `
      ALTER TABLE projects
      DROP CONSTRAINT IF EXISTS projects_project_type_check
    `,
  );

  await executeStatement(
    sql,
    `
      ALTER TABLE projects
      ADD CONSTRAINT projects_project_type_check
      CHECK (project_type = 'product')
    `,
  );

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
    CREATE INDEX IF NOT EXISTS projects_user_id_type_updated_at_idx
    ON projects (user_id, project_type, updated_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS source_items_project_id_created_at_idx
    ON source_items (project_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS ebook_generation_logs_user_id_created_at_idx
    ON ebook_generation_logs (user_id, created_at DESC)
  `;

  if (options.appRole) {
    await grantAppPrivileges(sql, options.appRole);
  }
}
