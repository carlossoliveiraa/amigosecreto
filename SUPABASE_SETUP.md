Supabase quick setup

1. Install the client library:

```bash
npm install @supabase/supabase-js
```

2. Create a local `.env` (or set your Vite env) using `.env.example` as reference. Required frontend vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_REVEAL_URL` — URL of an Edge Function that runs server-side reveal logic (recommended).

3. If you deploy a Supabase Edge Function, configure server-only env vars there (do NOT expose service role key in the frontend):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (if using SMS)

4. Database helpers: the frontend `src/api.ts` will call `VITE_REVEAL_URL` if set; otherwise it tries to call a Supabase RPC named `get_random_unrevealed_name`.

5. After setting envs, run the dev server:

```bash
npm install
npm run dev
```

If you want, I can generate the SQL DDL for the tables and the RPC function, and help with Edge Function deployment steps.

-- Deployment & usage quick guide

1) Apply the SQL schema

- Open the Supabase project -> SQL Editor and paste the contents of `supabase/schema.sql`, then run it. This creates the tables and RPC.

2) Seed data

- Insert names into the `names` table (in SQL Editor):

```sql
insert into names (name) values
('Adilson'),('Beatriz'),('Beto'),('Carlinhos'); -- etc
```

3) Deploy Edge Function (recommended for secure operations + SMS)

- Install Supabase CLI if needed: `npm install -g supabase`.
- Authenticate: `supabase login` (this opens browser to authenticate).
- Link your local repo to a Supabase project (optional):
	```bash
	supabase link --project-ref <your-project-ref>
	```
- Build & deploy the function located at `supabase/functions/reveal`:
	```bash
	cd supabase/functions/reveal
	npm install
	npm run build   # if the function has a build step
	supabase functions deploy reveal --project-ref <your-project-ref>
	```

4) Configure function environment variables (in Supabase dashboard > Settings or via CLI):

- `SUPABASE_URL` = your project URL
- `SUPABASE_SERVICE_ROLE_KEY` = service role key (server-side only)
- Optional Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`

5) Update your frontend `.env` with

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_REVEAL_URL=https://<your-edge-function-url>
```

6) Rotate exposed keys

- If you accidentally exposed keys (e.g., placed them in repo or posted publicly), go to Supabase Dashboard → Settings → API and rotate the key(s). Then update your `.env` and server secrets accordingly.

7) Test locally

```bash
npm install
npm run dev
```

If you want, I can now:
- run through creating the SQL in your Supabase project step-by-step, or
- prepare a deploy script and `env` template to deploy the function automatically.