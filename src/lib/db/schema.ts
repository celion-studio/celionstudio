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
    `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects, project_profiles, source_items, app_migrations TO ${role}`,
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
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS ebook_style text
  `;

  await sql`
    ALTER TABLE project_profiles
    ADD COLUMN IF NOT EXISTS ebook_html text
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
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM app_migrations
          WHERE name = '2026_04_28_backfill_existing_tiptap_projects_as_documents'
        ) THEN
          UPDATE projects AS p
          SET project_type = 'document'
          FROM project_profiles AS pp
          WHERE pp.project_id = p.id
            AND p.project_type = 'product'
            AND pp.ebook_html IS NULL
            AND pp.ebook_style IS NULL
            AND (
              pp.plan IS NOT NULL
              OR pp.document::text ~ '"text"\\s*:\\s*"[^"]+'
            );

          INSERT INTO app_migrations (name)
          VALUES ('2026_04_28_backfill_existing_tiptap_projects_as_documents');
        END IF;
      END $$;
    `,
  );

  await executeStatement(
    sql,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM app_migrations
          WHERE name = '2026_04_28_reclassify_html_ebook_projects_as_products'
        ) THEN
          UPDATE projects AS p
          SET project_type = 'product'
          FROM project_profiles AS pp
          WHERE pp.project_id = p.id
            AND p.project_type = 'document'
            AND (
              pp.ebook_html IS NOT NULL
              OR pp.ebook_style IS NOT NULL
            );

          INSERT INTO app_migrations (name)
          VALUES ('2026_04_28_reclassify_html_ebook_projects_as_products');
        END IF;
      END $$;
    `,
  );

  await executeStatement(
    sql,
    `
      UPDATE projects
      SET project_type = 'product'
      WHERE project_type IS NULL
        OR project_type NOT IN ('product', 'document')
    `,
  );

  await executeStatement(
    sql,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'projects_project_type_check'
            AND conrelid = 'public.projects'::regclass
        ) THEN
          ALTER TABLE projects
          ADD CONSTRAINT projects_project_type_check
          CHECK (project_type IN ('product', 'document'));
        END IF;
      END $$;
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

  if (options.appRole) {
    await grantAppPrivileges(sql, options.appRole);
  }
}
