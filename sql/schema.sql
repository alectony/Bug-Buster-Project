-- Python Garden schema. Run first in the Supabase SQL Editor.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'user' check (role in ('user','admin')),
  xp int not null default 0, seeds int not null default 0, streak int not null default 0,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now());
create table chapters (
  id serial primary key, slug text unique not null, title text not null,
  blurb text, sort_order int not null default 0, is_published boolean not null default true);
create table lessons (
  id serial primary key, chapter_id int references chapters(id) on delete cascade,
  title text not null, concept text, goals jsonb default '[]', starter_code text default '',
  expected_output text, rules jsonb default '{}',
  reward_seeds int default 15, reward_xp int default 40, sort_order int default 0);
create table user_progress (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id int references lessons(id) on delete cascade,
  status text not null default 'open' check (status in ('locked','open','done')),
  best_code text, attempts int default 0, completed_at timestamptz,
  primary key (user_id, lesson_id));
create table shop_items (
  id serial primary key, name text not null, kind text check (kind in ('seed','tool','decor')),
  cost_seeds int not null, sprite text, is_active boolean default true);
create table garden_plots (
  id serial primary key, user_id uuid references profiles(id) on delete cascade,
  slot int not null check (slot between 0 and 11), item_id int references shop_items(id),
  planted_at timestamptz default now(), unique (user_id, slot));
create table toolbox_topics (
  id serial primary key, title text not null, summary text, example_code text,
  unlock_lesson_id int references lessons(id) on delete set null);
create table achievements (
  id serial primary key, title text, description text, rule_key text, threshold int);
create table user_achievements (
  user_id uuid references profiles(id) on delete cascade,
  achievement_id int references achievements(id) on delete cascade,
  earned_at timestamptz default now(), primary key (user_id, achievement_id));

-- Row Level Security on, no policies: only the PHP service key can read or write.
alter table profiles enable row level security;
alter table chapters enable row level security;
alter table lessons enable row level security;
alter table user_progress enable row level security;
alter table shop_items enable row level security;
alter table garden_plots enable row level security;
alter table toolbox_topics enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
