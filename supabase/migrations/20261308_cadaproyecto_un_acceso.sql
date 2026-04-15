DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cliente_accesos_proyecto_id_key'
  ) THEN
    ALTER TABLE public.cliente_accesos
    ADD CONSTRAINT cliente_accesos_proyecto_id_key UNIQUE (proyecto_id);
  END IF;
END
$$;