-- Sample time entries for testing
INSERT INTO time_entries (entry_id, name, description, category, start_time, end_time, elapsed_time) VALUES
(
  'entry_demo_1',
  'Morning Planning',
  'Planning tasks for the day and reviewing priorities',
  'work',
  '2024-01-15 09:00:00',
  '2024-01-15 09:30:00',
  1800
),
(
  'entry_demo_2',
  'Code Review',
  'Reviewing pull requests from the team',
  'work',
  '2024-01-15 10:00:00',
  '2024-01-15 11:15:00',
  4500
),
(
  'entry_demo_3',
  'Learning React',
  'Working through React documentation and tutorials',
  'learning',
  '2024-01-15 14:00:00',
  '2024-01-15 15:30:00',
  5400
),
(
  'entry_demo_4',
  'Exercise',
  'Running in the park',
  'exercise',
  '2024-01-15 18:00:00',
  '2024-01-15 18:45:00',
  2700
); 