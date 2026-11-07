-- Python Garden seed data. Run once in the Supabase SQL Editor, after sql/schema.sql.
-- Levels, items and toolbox topics mirror data/*.json.

insert into chapters (slug, title, blurb, sort_order, is_published) values ('first-sprouts', 'First sprouts', 'Print, variables, math, decisions and loops.', 1, true) on conflict (slug) do nothing;

insert into lessons (chapter_id, title, concept, goals, starter_code, expected_output, rules, reward_seeds, reward_xp, sort_order) values ((select id from chapters where slug='first-sprouts'), 'Say hello', 'Printing', '["Use print() to show a message", "Make the console say exactly: Hello, garden!"]'::jsonb, '# Say hello to your garden
', 'Hello, garden!', '{"mustContain": ["print("], "hint": "Text goes inside quotes: print(\"...\")"}'::jsonb, 15, 40, 1);
insert into lessons (chapter_id, title, concept, goals, starter_code, expected_output, rules, reward_seeds, reward_xp, sort_order) values ((select id from chapters where slug='first-sprouts'), 'Name your water', 'Variables', '["Create a variable named water and set it to 4", "Print the variable"]'::jsonb, '# Store a number in a variable, then print it
', '4', '{"mustContain": ["water", "print(water)"], "hint": "A variable is a name, an equals sign and a value: water = 4"}'::jsonb, 15, 40, 2);
insert into lessons (chapter_id, title, concept, goals, starter_code, expected_output, rules, reward_seeds, reward_xp, sort_order) values ((select id from chapters where slug='first-sprouts'), 'Count the seeds', 'Math', '["Multiply seeds by pots using *", "Print the total"]'::jsonb, 'seeds = 6
pots = 3
# Print how many seeds you need in total
', '18', '{"mustContain": ["*", "print("], "hint": "You can put a calculation inside print: print(a * b)"}'::jsonb, 15, 40, 3);
insert into lessons (chapter_id, title, concept, goals, starter_code, expected_output, rules, reward_seeds, reward_xp, sort_order) values ((select id from chapters where slug='first-sprouts'), 'Sunny or not', 'Decisions', '["Write an if that checks sun > 5", "Add an else for the other case", "Print Grow! when the sun is bright"]'::jsonb, 'sun = 8
# If sun is above 5, print Grow! Otherwise print Wait
', 'Grow!', '{"mustContain": ["if", "else", "print("], "hint": "End the if line with a colon and indent the next line by 4 spaces."}'::jsonb, 15, 40, 4);
insert into lessons (chapter_id, title, concept, goals, starter_code, expected_output, rules, reward_seeds, reward_xp, sort_order) values ((select id from chapters where slug='first-sprouts'), 'Water every plant', 'Loops', '["Use a for loop with range(3)", "Print Water plant 1, Water plant 2 and Water plant 3"]'::jsonb, '# Water 3 plants, one line each
', 'Water plant 1
Water plant 2
Water plant 3', '{"mustContain": ["for", "range"], "hint": "range(3) counts 0, 1, 2. Print i + 1 to start at 1."}'::jsonb, 15, 40, 5);

insert into shop_items (name, kind, cost_seeds, sprite) values ('Sunflower seed', 'seed', 20, 'sunflower');
insert into shop_items (name, kind, cost_seeds, sprite) values ('Tulip bulb', 'seed', 30, 'tulip');
insert into shop_items (name, kind, cost_seeds, sprite) values ('Mushroom spore', 'seed', 25, 'mushroom');
insert into shop_items (name, kind, cost_seeds, sprite) values ('Cactus sprout', 'seed', 35, 'cactus');
insert into shop_items (name, kind, cost_seeds, sprite) values ('Watering can', 'tool', 40, 'can');
insert into shop_items (name, kind, cost_seeds, sprite) values ('Picket fence', 'decor', 50, 'fence');
insert into shop_items (name, kind, cost_seeds, sprite) values ('Garden lantern', 'decor', 60, 'lantern');
insert into shop_items (name, kind, cost_seeds, sprite) values ('Lily pond', 'decor', 80, 'pond');

insert into toolbox_topics (title, summary, example_code, unlock_lesson_id) values ('Comments', 'Text after # is ignored by Python. Use it to leave notes for yourself.', '# This line is a note
print("Notes are free")  # so is this part', null);
insert into toolbox_topics (title, summary, example_code, unlock_lesson_id) values ('print()', 'print() shows text or values in the console. Text goes inside quotes. Several values can be separated with commas.', 'print("Hello, garden!")
print("Plants:", 3)', (select id from lessons where title='Say hello' limit 1));
insert into toolbox_topics (title, summary, example_code, unlock_lesson_id) values ('Variables', 'A variable stores a value under a name. Use = to store it, then use the name later.', 'water = 4
name = "Sprout"
print(name, water)', (select id from lessons where title='Name your water' limit 1));
insert into toolbox_topics (title, summary, example_code, unlock_lesson_id) values ('Math operators', 'Use + - * / for arithmetic. // divides and drops the decimals, % gives the remainder, ** is a power.', 'print(6 * 3)
print(7 // 2)
print(7 % 3)
print(2 ** 3)', (select id from lessons where title='Count the seeds' limit 1));
insert into toolbox_topics (title, summary, example_code, unlock_lesson_id) values ('if and else', 'if runs code only when a condition is true. else runs when it is not. Indent the code inside by 4 spaces.', 'sun = 8
if sun > 5:
    print("Grow!")
else:
    print("Wait")', (select id from lessons where title='Sunny or not' limit 1));
insert into toolbox_topics (title, summary, example_code, unlock_lesson_id) values ('for loops and range()', 'A for loop repeats code. range(3) gives 0, 1 and 2, so the loop body runs three times.', 'for i in range(3):
    print("Water plant", i + 1)', (select id from lessons where title='Water every plant' limit 1));

insert into achievements (title, description, rule_key, threshold) values ('First sprout', 'Finish your first level', 'lessons_done', 1);
insert into achievements (title, description, rule_key, threshold) values ('Green thumb', 'Finish 5 levels', 'lessons_done', 5);
insert into achievements (title, description, rule_key, threshold) values ('Getting started', 'Earn 100 XP', 'xp', 100);
insert into achievements (title, description, rule_key, threshold) values ('Gardener', 'Earn 250 XP', 'xp', 250);
insert into achievements (title, description, rule_key, threshold) values ('Three in a row', 'Reach a 3 day streak', 'streak', 3);
