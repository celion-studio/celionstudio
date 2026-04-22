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
    `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects, project_profiles, source_items, html_versions TO ${role}`,
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
      current_html_version_id text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS project_profiles (
      project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      target_audience text NOT NULL,
      goal text NOT NULL,
      depth text NOT NULL,
      tone text NOT NULL,
      structure_style text NOT NULL,
      reader_level text NOT NULL,
      outline text NOT NULL DEFAULT '[]',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS outline text NOT NULL DEFAULT '[]'
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
    ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT ''
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS blocks text NOT NULL DEFAULT '[]'
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS page_format text NOT NULL DEFAULT 'ebook'
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

  await sql`
    CREATE TABLE IF NOT EXISTS html_versions (
      id text PRIMARY KEY,
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      html text NOT NULL,
      version_number integer NOT NULL DEFAULT 1,
      created_by_run_id text,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx
    ON projects (user_id, updated_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS source_items_project_id_created_at_idx
    ON source_items (project_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS html_versions_project_id_version_number_idx
    ON html_versions (project_id, version_number DESC)
  `;

  if (options.appRole) {
    await grantAppPrivileges(sql, options.appRole);
  }
}
