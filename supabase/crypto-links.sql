-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : liens courts crypto (CTA « Achat XXX »), éditables par les admins
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.crypto_links (
  symbol text primary key,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.crypto_links enable row level security;

drop policy if exists "crypto_links_select_approved" on public.crypto_links;
create policy "crypto_links_select_approved"
  on public.crypto_links for select
  to authenticated
  using (public.current_user_is_approved());

drop policy if exists "crypto_links_insert_admin" on public.crypto_links;
create policy "crypto_links_insert_admin"
  on public.crypto_links for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "crypto_links_update_admin" on public.crypto_links;
create policy "crypto_links_update_admin"
  on public.crypto_links for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "crypto_links_delete_admin" on public.crypto_links;
create policy "crypto_links_delete_admin"
  on public.crypto_links for delete
  to authenticated
  using (public.current_user_is_admin());

drop trigger if exists crypto_links_touch on public.crypto_links;
create trigger crypto_links_touch
  before update on public.crypto_links
  for each row execute function public.touch_updated_at();

insert into public.crypto_links (symbol, url) values
  ('AAVE', 'https://coinhouse.onelink.me/bCWk/i7h1unto'),
  ('ADA', 'https://coinhouse.onelink.me/bCWk/5bftonjt'),
  ('AKT', 'https://coinhouse.onelink.me/bCWk/f7x6dmxg'),
  ('ALGO', 'https://coinhouse.onelink.me/bCWk/62kc3igx'),
  ('APE', 'https://coinhouse.onelink.me/bCWk/4huvbe1r'),
  ('APT', 'https://coinhouse.onelink.me/bCWk/f0pkuzfe'),
  ('AR', 'https://coinhouse.onelink.me/bCWk/ef8ho817'),
  ('ARB', 'https://coinhouse.onelink.me/bCWk/xhvy4he1'),
  ('ARRB', 'https://coinhouse.onelink.me/bCWk/e80u34ye'),
  ('ATOM', 'https://coinhouse.onelink.me/bCWk/fqi5ri12'),
  ('AVAX', 'https://coinhouse.onelink.me/bCWk/7p8w4kub'),
  ('AXS', 'https://coinhouse.onelink.me/bCWk/utv5ouuy'),
  ('BAT', 'https://coinhouse.onelink.me/bCWk/jxd0vtwl'),
  ('BCH', 'https://coinhouse.onelink.me/bCWk/hqapk6s2'),
  ('BONK', 'https://coinhouse.onelink.me/bCWk/jbacmcxs'),
  ('BTC', 'https://coinhouse.onelink.me/bCWk/qfxmehrr'),
  ('CC', 'https://coinhouse.onelink.me/bCWk/62zsz6s5'),
  ('CHZ', 'https://coinhouse.onelink.me/bCWk/3fa8v8sv'),
  ('CRV', 'https://coinhouse.onelink.me/bCWk/mhv7r0az'),
  ('DOGE', 'https://coinhouse.onelink.me/bCWk/jpl4l0wg'),
  ('DOT', 'https://coinhouse.onelink.me/bCWk/l9oau2nx'),
  ('DYDX', 'https://coinhouse.onelink.me/bCWk/byfajy46'),
  ('EGLD', 'https://coinhouse.onelink.me/bCWk/gorbtdjf'),
  ('ENA', 'https://coinhouse.onelink.me/bCWk/8kqwuapr'),
  ('ENJ', 'https://coinhouse.onelink.me/bCWk/msf3ft3s'),
  ('ENS', 'https://coinhouse.onelink.me/bCWk/xlv9kvjl'),
  ('EOS', 'https://coinhouse.onelink.me/bCWk/fk8gbusu'),
  ('ETH', 'https://coinhouse.onelink.me/bCWk/ajbp4kel'),
  ('EURCV', 'https://coinhouse.onelink.me/bCWk/ka3grm9k'),
  ('FET', 'https://coinhouse.onelink.me/bCWk/1powei2e'),
  ('FIL', 'https://coinhouse.onelink.me/bCWk/8aeit1t0'),
  ('FLOKI', 'https://coinhouse.onelink.me/bCWk/dvybyphf'),
  ('FTM', 'https://coinhouse.onelink.me/bCWk/cwvt0ln9'),
  ('GMX', 'https://coinhouse.onelink.me/bCWk/frvxv8sn'),
  ('GNO', 'https://coinhouse.onelink.me/bCWk/ooj5vn09'),
  ('GRT', 'https://coinhouse.onelink.me/bCWk/9qr2gq4d'),
  ('HYPE', 'https://coinhouse.onelink.me/bCWk/pqqujqru'),
  ('INJ', 'https://coinhouse.onelink.me/bCWk/h4r0ank6'),
  ('JUP', 'https://coinhouse.onelink.me/bCWk/8nfe53fx'),
  ('KAS', 'https://coinhouse.onelink.me/bCWk/ht429n5j'),
  ('LDO', 'https://coinhouse.onelink.me/bCWk/h19d5z5p'),
  ('LINK', 'https://coinhouse.onelink.me/bCWk/fppr09nb'),
  ('LRC', 'https://coinhouse.onelink.me/bCWk/amhpyzq1'),
  ('LTC', 'https://coinhouse.onelink.me/bCWk/iyns2s32'),
  ('MANA', 'https://coinhouse.onelink.me/bCWk/ch80qmbb'),
  ('MATIC', 'https://coinhouse.onelink.me/bCWk/53532h61'),
  ('MKR', 'https://coinhouse.onelink.me/bCWk/fb8drypg'),
  ('MORPHO', 'https://coinhouse.onelink.me/bCWk/d9acd9ys'),
  ('NEAR', 'https://coinhouse.onelink.me/bCWk/wfpwj5tj'),
  ('ONDO', 'https://coinhouse.onelink.me/bCWk/7tvdak79'),
  ('OP', 'https://coinhouse.onelink.me/bCWk/rr9o515z'),
  ('PEPE', 'https://coinhouse.onelink.me/bCWk/t8kf3nij'),
  ('POL', 'https://coinhouse.onelink.me/bCWk/8srgyjc6'),
  ('PYTH', 'https://coinhouse.onelink.me/bCWk/0j6avbd3'),
  ('RAY', 'https://coinhouse.onelink.me/bCWk/5al7tf8l'),
  ('RENDER', 'https://coinhouse.onelink.me/bCWk/0dzlntqb'),
  ('SAND', 'https://coinhouse.onelink.me/bCWk/dj512770'),
  ('SEI', 'https://coinhouse.onelink.me/bCWk/tsfy7bcd'),
  ('SHIB', 'https://coinhouse.onelink.me/bCWk/hbf01vu1'),
  ('SKY', 'https://coinhouse.onelink.me/bCWk/vnc6uvqj'),
  ('SOL', 'https://coinhouse.onelink.me/bCWk/7rrcj1a9'),
  ('SONIC', 'https://coinhouse.onelink.me/bCWk/99t46n1r'),
  ('STRK', 'https://coinhouse.onelink.me/bCWk/rxlukkw9'),
  ('SUI', 'https://coinhouse.onelink.me/bCWk/amxbe4fu'),
  ('SUSHI', 'https://coinhouse.onelink.me/bCWk/1ph9ytzh'),
  ('TAO', 'https://coinhouse.onelink.me/bCWk/jh7h01rf'),
  ('THETA', 'https://coinhouse.onelink.me/bCWk/b5wr6nw4'),
  ('TIA', 'https://coinhouse.onelink.me/bCWk/m9djbcxm'),
  ('TON', 'https://coinhouse.onelink.me/bCWk/64q1bjk1'),
  ('UNI', 'https://coinhouse.onelink.me/bCWk/c252rlpq'),
  ('VET', 'https://coinhouse.onelink.me/bCWk/s3cfq5o8'),
  ('WIF', 'https://coinhouse.onelink.me/bCWk/vfox7wt9'),
  ('XLM', 'https://coinhouse.onelink.me/bCWk/3h2o1lbp'),
  ('XRP', 'https://coinhouse.onelink.me/bCWk/yoiy24l9'),
  ('XTZ', 'https://coinhouse.onelink.me/bCWk/xkbvn1bb'),
  ('YFI', 'https://coinhouse.onelink.me/bCWk/y6ny723m')
on conflict (symbol) do nothing;
