/**
 * Weekly duties: recurring chores that one person claims each week
 * (first one: getting eggs on Thursdays).
 *
 * duty_claims holds at most one row per duty per week. A row with
 * claimed_by = NULL means nobody has taken that week yet.
 *
 * day_of_week follows Postgres EXTRACT(DOW) / JS Date.getDay():
 * 0 = Sunday … 6 = Saturday.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.duties (
        id serial PRIMARY KEY,
        name character varying(100) NOT NULL UNIQUE,
        day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)
    );

    CREATE TABLE public.duty_claims (
        duty_id integer NOT NULL REFERENCES public.duties(id) ON DELETE CASCADE,
        week_start date NOT NULL,
        claimed_by integer REFERENCES public.users(id) ON DELETE SET NULL,
        claimed_at timestamp with time zone,
        PRIMARY KEY (duty_id, week_start)
    );

    INSERT INTO public.duties (name, day_of_week) VALUES ('Eggs', 4);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE public.duty_claims;
    DROP TABLE public.duties;
  `);
};
