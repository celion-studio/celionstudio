type SqlClient = (
  strings: TemplateStringsArray,
  ...params: unknown[]
) => Promise<unknown>;

export async function applyAppSchema(sql: SqlClient) {
  await sql`
    CREATE TABLE IF NOT EXISTS guides (
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
    CREATE TABLE IF NOT EXISTS guide_profiles (
      guide_id text PRIMARY KEY REFERENCES guides(id) ON DELETE CASCADE,
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
    ALTER TABLE guide_profiles
    ADD COLUMN IF NOT EXISTS outline text NOT NULL DEFAULT '[]'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS source_items (
      id text PRIMARY KEY,
      guide_id text NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
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
      guide_id text NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      html text NOT NULL,
      version_number integer NOT NULL DEFAULT 1,
      created_by_run_id text,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS guides_user_id_updated_at_idx
    ON guides (user_id, updated_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS source_items_guide_id_created_at_idx
    ON source_items (guide_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS html_versions_guide_id_version_number_idx
    ON html_versions (guide_id, version_number DESC)
  `;
}
