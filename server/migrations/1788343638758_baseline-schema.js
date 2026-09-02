/**
 * BASELINE MIGRATION — the full schema as it exists in production today.
 *
 * This is a snapshot, not a change. It only ever runs against a FRESH, EMPTY
 * database (a new developer machine, a test database, a rebuilt environment).
 *
 * On any database that already has this schema — production included — do NOT
 * run this. Baseline it instead, i.e. mark it as applied without executing it:
 *
 *     npm run migrate:up -- --fake 1
 *
 * After that, every environment shares the same starting point and all real
 * schema changes go into new migrations added after this one.
 *
 * Source: production-schema.sql (pg_dump), with SET statements, ownership and
 * dump comments stripped.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.batches (
        id integer NOT NULL,
        bull_id integer,
        slot_id integer,
        quantity integer DEFAULT 0 NOT NULL,
        sio_batch_code character varying(100),
        production_date date,
        status character varying(40) DEFAULT 'skew_ptm'::character varying,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT batches_status_check CHECK (((status)::text = ANY (ARRAY[('approved'::character varying)::text, ('skew_ptm'::character varying)::text, ('skew'::character varying)::text, ('disqualified'::character varying)::text, ('bacterial_contamination'::character varying)::text, ('c_ptb'::character varying)::text, ('ptm'::character varying)::text, ('reext'::character varying)::text, ('awaiting_response'::character varying)::text])))
    );

    CREATE SEQUENCE public.batches_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.batches_id_seq OWNED BY public.batches.id;

    CREATE TABLE public.bulls (
        id integer NOT NULL,
        name character varying(100) NOT NULL,
        bull_code character varying(50) NOT NULL,
        breed character varying(100),
        notes text,
        created_at timestamp with time zone DEFAULT now()
    );

    CREATE SEQUENCE public.bulls_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.bulls_id_seq OWNED BY public.bulls.id;

    CREATE TABLE public.containers (
        id integer NOT NULL,
        name character varying(50) NOT NULL,
        description text,
        sort_order integer
    );

    CREATE SEQUENCE public.containers_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.containers_id_seq OWNED BY public.containers.id;

    CREATE TABLE public.daily_logs (
        id integer NOT NULL,
        bull_id integer,
        slot_id integer,
        quantity_produced integer NOT NULL,
        log_date date NOT NULL,
        recorded_by integer,
        notes text,
        created_at timestamp with time zone DEFAULT now()
    );

    CREATE SEQUENCE public.daily_logs_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.daily_logs_id_seq OWNED BY public.daily_logs.id;

    CREATE TABLE public.invites (
        id integer NOT NULL,
        token character varying(64) NOT NULL,
        email character varying(255),
        created_by integer,
        used boolean DEFAULT false,
        expires_at timestamp without time zone NOT NULL,
        created_at timestamp without time zone DEFAULT now()
    );

    CREATE SEQUENCE public.invites_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.invites_id_seq OWNED BY public.invites.id;

    CREATE TABLE public.password_reset_tokens (
        id integer NOT NULL,
        user_id integer,
        token character varying(64) NOT NULL,
        expires_at timestamp without time zone NOT NULL,
        used boolean DEFAULT false,
        created_at timestamp without time zone DEFAULT now()
    );

    CREATE SEQUENCE public.password_reset_tokens_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;

    CREATE TABLE public.shipment_items (
        id integer NOT NULL,
        shipment_id integer,
        batch_id integer,
        quantity integer NOT NULL,
        override_by integer,
        override_at timestamp with time zone,
        original_status character varying(40)
    );

    CREATE SEQUENCE public.shipment_items_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.shipment_items_id_seq OWNED BY public.shipment_items.id;

    CREATE TABLE public.shipments (
        id integer NOT NULL,
        destination character varying(10) NOT NULL,
        shipment_date date NOT NULL,
        notes text,
        created_by integer,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT shipments_destination_check CHECK (((destination)::text = ANY ((ARRAY['north'::character varying, 'south'::character varying])::text[])))
    );

    CREATE SEQUENCE public.shipments_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.shipments_id_seq OWNED BY public.shipments.id;

    CREATE TABLE public.slots (
        id integer NOT NULL,
        container_id integer,
        slot_number integer NOT NULL,
        "position" character varying(10) NOT NULL,
        CONSTRAINT slots_position_check CHECK ((("position")::text = ANY ((ARRAY['UP'::character varying, 'DOWN'::character varying, 'UP_1'::character varying, 'UP_2'::character varying, 'DOWN_1'::character varying, 'DOWN_2'::character varying])::text[]))),
        CONSTRAINT slots_slot_number_check CHECK (((slot_number >= 1) AND (slot_number <= 10)))
    );

    CREATE SEQUENCE public.slots_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.slots_id_seq OWNED BY public.slots.id;

    CREATE TABLE public.stock_counts (
        id integer NOT NULL,
        stock_item_id integer,
        unit_type character varying(10) NOT NULL,
        quantity integer,
        is_full boolean DEFAULT false,
        notes text,
        counted_by integer,
        counted_at timestamp with time zone DEFAULT now(),
        CONSTRAINT stock_counts_unit_type_check CHECK (((unit_type)::text = ANY ((ARRAY['units'::character varying, 'boxes'::character varying])::text[])))
    );

    CREATE SEQUENCE public.stock_counts_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.stock_counts_id_seq OWNED BY public.stock_counts.id;

    CREATE TABLE public.stock_items (
        id integer NOT NULL,
        name character varying(200) NOT NULL,
        company character varying(200),
        barcode character varying(100),
        display_order integer NOT NULL
    );

    CREATE SEQUENCE public.stock_items_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.stock_items_id_seq OWNED BY public.stock_items.id;

    CREATE TABLE public.tasks (
        id integer NOT NULL,
        title character varying(200) NOT NULL,
        description text,
        assigned_to integer,
        created_by integer,
        completed_by integer,
        in_progress_by integer,
        status character varying(20) DEFAULT 'pending'::character varying,
        due_date date,
        completed_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'done'::character varying])::text[])))
    );

    CREATE SEQUENCE public.tasks_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;

    CREATE TABLE public.users (
        id integer NOT NULL,
        name character varying(100) NOT NULL,
        email character varying(150) NOT NULL,
        password_hash character varying(255) NOT NULL,
        role character varying(20) DEFAULT 'staff'::character varying,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'staff'::character varying])::text[])))
    );

    CREATE SEQUENCE public.users_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

    ALTER TABLE ONLY public.batches ALTER COLUMN id SET DEFAULT nextval('public.batches_id_seq'::regclass);
    ALTER TABLE ONLY public.bulls ALTER COLUMN id SET DEFAULT nextval('public.bulls_id_seq'::regclass);
    ALTER TABLE ONLY public.containers ALTER COLUMN id SET DEFAULT nextval('public.containers_id_seq'::regclass);
    ALTER TABLE ONLY public.daily_logs ALTER COLUMN id SET DEFAULT nextval('public.daily_logs_id_seq'::regclass);
    ALTER TABLE ONLY public.invites ALTER COLUMN id SET DEFAULT nextval('public.invites_id_seq'::regclass);
    ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);
    ALTER TABLE ONLY public.shipment_items ALTER COLUMN id SET DEFAULT nextval('public.shipment_items_id_seq'::regclass);
    ALTER TABLE ONLY public.shipments ALTER COLUMN id SET DEFAULT nextval('public.shipments_id_seq'::regclass);
    ALTER TABLE ONLY public.slots ALTER COLUMN id SET DEFAULT nextval('public.slots_id_seq'::regclass);
    ALTER TABLE ONLY public.stock_counts ALTER COLUMN id SET DEFAULT nextval('public.stock_counts_id_seq'::regclass);
    ALTER TABLE ONLY public.stock_items ALTER COLUMN id SET DEFAULT nextval('public.stock_items_id_seq'::regclass);
    ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);
    ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

    ALTER TABLE ONLY public.batches
        ADD CONSTRAINT batches_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.bulls
        ADD CONSTRAINT bulls_bull_code_key UNIQUE (bull_code);

    ALTER TABLE ONLY public.bulls
        ADD CONSTRAINT bulls_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.containers
        ADD CONSTRAINT containers_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.daily_logs
        ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.invites
        ADD CONSTRAINT invites_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.invites
        ADD CONSTRAINT invites_token_key UNIQUE (token);

    ALTER TABLE ONLY public.password_reset_tokens
        ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.password_reset_tokens
        ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);

    ALTER TABLE ONLY public.shipment_items
        ADD CONSTRAINT shipment_items_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.shipments
        ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.slots
        ADD CONSTRAINT slots_container_id_slot_number_position_key UNIQUE (container_id, slot_number, "position");

    ALTER TABLE ONLY public.slots
        ADD CONSTRAINT slots_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.stock_counts
        ADD CONSTRAINT stock_counts_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.stock_counts
        ADD CONSTRAINT stock_counts_stock_item_id_key UNIQUE (stock_item_id);

    ALTER TABLE ONLY public.stock_items
        ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.tasks
        ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.users
        ADD CONSTRAINT users_email_key UNIQUE (email);

    ALTER TABLE ONLY public.users
        ADD CONSTRAINT users_pkey PRIMARY KEY (id);

    ALTER TABLE ONLY public.batches
        ADD CONSTRAINT batches_bull_id_fkey FOREIGN KEY (bull_id) REFERENCES public.bulls(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.batches
        ADD CONSTRAINT batches_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.daily_logs
        ADD CONSTRAINT daily_logs_bull_id_fkey FOREIGN KEY (bull_id) REFERENCES public.bulls(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.daily_logs
        ADD CONSTRAINT daily_logs_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.daily_logs
        ADD CONSTRAINT daily_logs_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.invites
        ADD CONSTRAINT invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

    ALTER TABLE ONLY public.password_reset_tokens
        ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

    ALTER TABLE ONLY public.shipment_items
        ADD CONSTRAINT shipment_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.shipment_items
        ADD CONSTRAINT shipment_items_override_by_fkey FOREIGN KEY (override_by) REFERENCES public.users(id);

    ALTER TABLE ONLY public.shipment_items
        ADD CONSTRAINT shipment_items_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;

    ALTER TABLE ONLY public.shipments
        ADD CONSTRAINT shipments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.slots
        ADD CONSTRAINT slots_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON DELETE CASCADE;

    ALTER TABLE ONLY public.stock_counts
        ADD CONSTRAINT stock_counts_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.users(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.stock_counts
        ADD CONSTRAINT stock_counts_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE;

    ALTER TABLE ONLY public.tasks
        ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.tasks
        ADD CONSTRAINT tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.tasks
        ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

    ALTER TABLE ONLY public.tasks
        ADD CONSTRAINT tasks_in_progress_by_fkey FOREIGN KEY (in_progress_by) REFERENCES public.users(id) ON DELETE SET NULL;
  `);
};

exports.down = () => {
  throw new Error(
    'The baseline migration cannot be rolled back: it represents the entire ' +
      'existing schema, so reverting it would drop every table and all data. ' +
      'To reset a development database, drop and recreate it, then run ' +
      '`npm run migrate:up` again.'
  );
};
