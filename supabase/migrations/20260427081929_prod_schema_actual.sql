


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calc_caja_chica_estado"("p_monto" numeric, "p_gastado" numeric) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_monto numeric := coalesce(p_monto, 0);
  v_gastado numeric := coalesce(p_gastado, 0);
  v_saldo numeric := v_monto - v_gastado;
  v_ratio numeric := 0;
begin
  if v_monto <= 0 then
    return 'SIN FONDO';
  end if;

  if v_saldo < 0 then
    return 'EXCEDIDA';
  end if;

  if v_saldo = 0 then
    return 'AGOTADA';
  end if;

  v_ratio := case when v_monto > 0 then v_saldo / v_monto else 0 end;

  if v_ratio <= 0.20 then
    return 'POR AGOTARSE';
  end if;

  return 'DISPONIBLE';
end;
$$;


ALTER FUNCTION "public"."calc_caja_chica_estado"("p_monto" numeric, "p_gastado" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."catalogo_cargos_set_nombre_normalizado"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.nombre_normalizado :=
    upper(trim(unaccent(coalesce(new.nombre, ''))));
  return new;
end;
$$;


ALTER FUNCTION "public"."catalogo_cargos_set_nombre_normalizado"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_nombre"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select nombre::text
  from public.profiles
  where id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_nombre"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select rol::text
  from public.profiles
  where id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    case
      when new.email = 'admin@blendfortdemo.com' then 'ADMINISTRADOR'
      else upper(replace(split_part(new.email, '@', 1), '.', ' '))
    end,
    case
      when new.email = 'admin@blendfortdemo.com' then 'ADMIN'
      else 'RESIDENTE'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_caja_chica_residente_by_id"("p_caja_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_total_gastado numeric := 0;
  v_corte_at timestamptz;
begin
  if p_caja_id is null then
    return;
  end if;

  select ultimo_corte_at
    into v_corte_at
  from public.caja_chica_residente
  where id = p_caja_id;

  select coalesce(sum(valor), 0)
    into v_total_gastado
  from public.movimientos_caja_chica
  where caja_chica_residente_id = p_caja_id
    and (
      v_corte_at is null
      or created_at >= v_corte_at
    );

  update public.caja_chica_residente
  set
    gastado_actual = v_total_gastado,
    saldo_actual = coalesce(monto_actual_asignado, 0)
                 + coalesce(saldo_arrastrado, 0)
                 - v_total_gastado,
    estado = public.calc_caja_chica_estado(
      coalesce(monto_actual_asignado, 0) + coalesce(saldo_arrastrado, 0),
      v_total_gastado
    ),
    updated_at = now()
  where id = p_caja_id;
end;
$$;


ALTER FUNCTION "public"."recalc_caja_chica_residente_by_id"("p_caja_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_desembolso_residente"("p_residente" "text", "p_fecha_desembolso" "date", "p_monto" numeric, "p_observacion" "text", "p_creado_por" "text", "p_creado_por_rol" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_caja_id uuid;
  v_monto numeric := coalesce(p_monto, 0);
  v_estado_antes text;
  v_saldo_antes numeric := 0;
  v_corte_ts timestamptz := now();
begin
  if trim(coalesce(p_residente, '')) = '' then
    raise exception 'El residente es obligatorio';
  end if;

  if v_monto <= 0 then
    raise exception 'El monto del desembolso debe ser mayor a 0';
  end if;

  select id, estado, saldo_actual
    into v_caja_id, v_estado_antes, v_saldo_antes
  from public.caja_chica_residente
  where residente = p_residente
  limit 1;

  if v_caja_id is null then
    insert into public.caja_chica_residente (
      residente,
      monto_actual_asignado,
      saldo_arrastrado,
      gastado_actual,
      saldo_actual,
      estado,
      fecha_ultimo_desembolso,
      ultimo_corte_at,
      observacion,
      creado_por,
      creado_por_rol
    )
    values (
      p_residente,
      v_monto,
      0,
      0,
      v_monto,
      public.calc_caja_chica_estado(v_monto, 0),
      p_fecha_desembolso,
      v_corte_ts,
      p_observacion,
      p_creado_por,
      p_creado_por_rol
    )
    returning id into v_caja_id;

    v_estado_antes := 'SIN FONDO';
    v_saldo_antes := 0;
  else
    update public.caja_chica_residente
    set
      monto_actual_asignado = v_monto,
      saldo_arrastrado = v_saldo_antes,
      gastado_actual = 0,
      saldo_actual = v_monto + v_saldo_antes,
      estado = public.calc_caja_chica_estado(v_monto + v_saldo_antes, 0),
      fecha_ultimo_desembolso = p_fecha_desembolso,
      ultimo_corte_at = v_corte_ts,
      observacion = p_observacion,
      updated_at = now()
    where id = v_caja_id;
  end if;

  insert into public.caja_chica_desembolsos (
    proyecto,
    residente,
    fecha_desembolso,
    monto_desembolsado,
    saldo_final_antes_reposicion,
    estado_antes,
    estado_nuevo,
    observacion,
    creado_por,
    creado_por_rol,
    caja_chica_residente_id
  )
  select
    null,
    c.residente,
    p_fecha_desembolso,
    v_monto,
    v_saldo_antes,
    coalesce(v_estado_antes, 'SIN FONDO'),
    c.estado,
    p_observacion,
    p_creado_por,
    p_creado_por_rol,
    c.id
  from public.caja_chica_residente c
  where c.id = v_caja_id;
end;
$$;


ALTER FUNCTION "public"."registrar_desembolso_residente"("p_residente" "text", "p_fecha_desembolso" "date", "p_monto" numeric, "p_observacion" "text", "p_creado_por" "text", "p_creado_por_rol" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_cliente_accesos"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_cliente_accesos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_recalc_caja_chica_residente_from_mov"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.recalc_caja_chica_residente_by_id(new.caja_chica_residente_id);
    return new;
  elsif tg_op = 'UPDATE' then
    if old.caja_chica_residente_id is distinct from new.caja_chica_residente_id then
      perform public.recalc_caja_chica_residente_by_id(old.caja_chica_residente_id);
      perform public.recalc_caja_chica_residente_by_id(new.caja_chica_residente_id);
    else
      perform public.recalc_caja_chica_residente_by_id(new.caja_chica_residente_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.recalc_caja_chica_residente_by_id(old.caja_chica_residente_id);
    return old;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."tg_recalc_caja_chica_residente_from_mov"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_sync_caja_chica_residente_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  new.monto_actual_asignado := coalesce(new.monto_actual_asignado, 0);
  new.saldo_arrastrado := coalesce(new.saldo_arrastrado, 0);
  new.gastado_actual := coalesce(new.gastado_actual, 0);

  new.saldo_actual :=
    new.monto_actual_asignado + new.saldo_arrastrado - new.gastado_actual;

  -- El estado sigue calculándose sobre el fondo efectivo del corte:
  -- fondo efectivo = monto_actual_asignado + saldo_arrastrado
  new.estado := public.calc_caja_chica_estado(
    new.monto_actual_asignado + new.saldo_arrastrado,
    new.gastado_actual
  );

  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_sync_caja_chica_residente_fields"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."caja_chica_desembolsos" (
    "id" bigint NOT NULL,
    "proyecto" "text",
    "residente" "text",
    "fecha_desembolso" "date" NOT NULL,
    "monto_desembolsado" numeric(12,2) DEFAULT 0 NOT NULL,
    "saldo_final_antes_reposicion" numeric(12,2) DEFAULT 0 NOT NULL,
    "estado_antes" "text",
    "estado_nuevo" "text" DEFAULT 'DISPONIBLE'::"text" NOT NULL,
    "observacion" "text",
    "creado_por" "text",
    "creado_por_rol" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "caja_chica_residente_id" "uuid",
    CONSTRAINT "caja_chica_desembolsos_estado_antes_valid_chk" CHECK ((("estado_antes" IS NULL) OR ("estado_antes" = ANY (ARRAY['SIN FONDO'::"text", 'DISPONIBLE'::"text", 'POR AGOTARSE'::"text", 'AGOTADA'::"text", 'EXCEDIDA'::"text"])))),
    CONSTRAINT "caja_chica_desembolsos_estado_nuevo_valid_chk" CHECK (("estado_nuevo" = ANY (ARRAY['SIN FONDO'::"text", 'DISPONIBLE'::"text", 'POR AGOTARSE'::"text", 'AGOTADA'::"text", 'EXCEDIDA'::"text"]))),
    CONSTRAINT "caja_chica_desembolsos_monto_desembolsado_nonnegative_chk" CHECK (("monto_desembolsado" >= (0)::numeric)),
    CONSTRAINT "caja_chica_desembolsos_saldo_final_antes_reposicion_required" CHECK (("saldo_final_antes_reposicion" IS NOT NULL))
);


ALTER TABLE "public"."caja_chica_desembolsos" OWNER TO "postgres";


ALTER TABLE "public"."caja_chica_desembolsos" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."caja_chica_desembolsos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."caja_chica_proyecto" (
    "id" bigint NOT NULL,
    "proyecto" "text" NOT NULL,
    "residente" "text",
    "monto_actual_asignado" numeric(12,2) DEFAULT 0 NOT NULL,
    "gastado_actual" numeric(12,2) DEFAULT 0 NOT NULL,
    "saldo_actual" numeric(12,2) DEFAULT 0 NOT NULL,
    "estado" "text" DEFAULT 'SIN FONDO'::"text" NOT NULL,
    "fecha_ultimo_desembolso" "date",
    "observacion" "text",
    "creado_por" "text",
    "creado_por_rol" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."caja_chica_proyecto" OWNER TO "postgres";


ALTER TABLE "public"."caja_chica_proyecto" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."caja_chica_proyecto_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."caja_chica_residente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "residente" "text" NOT NULL,
    "monto_actual_asignado" numeric(12,2) DEFAULT 0 NOT NULL,
    "gastado_actual" numeric(12,2) DEFAULT 0 NOT NULL,
    "saldo_actual" numeric(12,2) DEFAULT 0 NOT NULL,
    "estado" "text" DEFAULT 'SIN FONDO'::"text" NOT NULL,
    "fecha_ultimo_desembolso" "date",
    "observacion" "text",
    "creado_por" "text",
    "creado_por_rol" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ultimo_corte_at" timestamp with time zone,
    "saldo_arrastrado" numeric(12,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."caja_chica_residente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalogo_cargos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "nombre_normalizado" "text",
    "tipo_personal" "text" DEFAULT 'CAMPO'::"text" NOT NULL,
    "tipo_pago" "text" DEFAULT 'DIARIO'::"text" NOT NULL,
    "valor_dia" numeric(12,2) DEFAULT 0 NOT NULL,
    "valor_hora_extra" numeric(12,2) DEFAULT 0 NOT NULL,
    "salario_mensual" numeric(12,2) DEFAULT 0 NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "catalogo_cargos_tipo_pago_chk" CHECK (("tipo_pago" = ANY (ARRAY['DIARIO'::"text", 'MENSUAL'::"text", 'MIXTO'::"text"]))),
    CONSTRAINT "catalogo_cargos_tipo_personal_chk" CHECK (("tipo_personal" = ANY (ARRAY['CAMPO'::"text", 'OFICINA'::"text", 'RESIDENTE'::"text", 'ADMINISTRATIVO'::"text"])))
);


ALTER TABLE "public"."catalogo_cargos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cliente_accesos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proyecto_id" "uuid" NOT NULL,
    "nombre_cliente" "text" NOT NULL,
    "codigo_acceso" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "ultimo_ingreso_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cliente_accesos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."egresos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proyecto" "text" NOT NULL,
    "residente" "text",
    "fecha" "date",
    "categoria" "text",
    "lugar" "text",
    "concepto" "text",
    "detalles" "text",
    "metodo_pago" "text",
    "pagado_por" "text",
    "valor" numeric DEFAULT 0,
    "tiene_factura" boolean DEFAULT false,
    "factura" "text",
    "estado" "text" DEFAULT 'PENDIENTE'::"text",
    "tipo_registro" "text" DEFAULT 'EGRESO'::"text",
    "cargo" "text",
    "asistio" boolean,
    "num_horas_extras" numeric DEFAULT 0,
    "valores_pendientes" numeric DEFAULT 0,
    "descuentos" numeric DEFAULT 0,
    "creado_por" "text",
    "creado_por_rol" "text",
    "creado_por_nombre" "text",
    "actualizado_por" "text",
    "actualizado_por_rol" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fuente_fondos" "text" DEFAULT 'GENERAL'::"text",
    "anulado_at" timestamp with time zone,
    "anulado_por" "text",
    "anulado_por_rol" "text",
    "motivo_anulacion" "text",
    CONSTRAINT "egresos_descuentos_nonnegative_chk" CHECK (("descuentos" >= (0)::numeric)),
    CONSTRAINT "egresos_estado_valid_chk" CHECK (("estado" = ANY (ARRAY['PENDIENTE'::"text", 'PAGADO'::"text", 'ANULADO'::"text", 'COMPLETADO'::"text"]))),
    CONSTRAINT "egresos_fuente_fondos_valid_chk" CHECK (("fuente_fondos" = ANY (ARRAY['GENERAL'::"text", 'CAJA_CHICA'::"text"]))),
    CONSTRAINT "egresos_num_horas_extras_nonnegative_chk" CHECK (("num_horas_extras" >= (0)::numeric)),
    CONSTRAINT "egresos_tipo_registro_valid_chk" CHECK (("tipo_registro" = ANY (ARRAY['EGRESO'::"text", 'REPORTE_DIARIO'::"text"]))),
    CONSTRAINT "egresos_valor_nonnegative_chk" CHECK (("valor" >= (0)::numeric)),
    CONSTRAINT "egresos_valores_pendientes_nonnegative_chk" CHECK (("valores_pendientes" >= (0)::numeric))
);


ALTER TABLE "public"."egresos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empleado_proyecto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empleado_id" "uuid" NOT NULL,
    "proyecto_id" "uuid" NOT NULL,
    "cargo_en_proyecto" "text",
    "rol_en_proyecto" "text",
    "tipo_en_proyecto" "text",
    "estado_asignacion" "text" DEFAULT 'ACTIVO'::"text" NOT NULL,
    "fecha_inicio" "date",
    "fecha_fin" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "empleado_proyecto_estado_asignacion_valid_chk" CHECK (("estado_asignacion" = ANY (ARRAY['ACTIVO'::"text", 'INACTIVO'::"text"]))),
    CONSTRAINT "empleado_proyecto_rol_valid_chk" CHECK ((("rol_en_proyecto" IS NULL) OR ("rol_en_proyecto" = ANY (ARRAY['OPERARIO'::"text", 'RESIDENTE'::"text", 'OFICINA'::"text"])))),
    CONSTRAINT "empleado_proyecto_tipo_valid_chk" CHECK ((("tipo_en_proyecto" IS NULL) OR ("tipo_en_proyecto" = ANY (ARRAY['CAMPO'::"text", 'OFICINA'::"text"]))))
);


ALTER TABLE "public"."empleado_proyecto" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empleados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "rol" "text" DEFAULT 'OPERARIO'::"text" NOT NULL,
    "cargo" "text",
    "tipo" "text" DEFAULT 'CAMPO'::"text" NOT NULL,
    "valor_dia" numeric(12,2) DEFAULT 0 NOT NULL,
    "salario_mensual" numeric(12,2) DEFAULT 0 NOT NULL,
    "valor_hora_extra" numeric(12,2) DEFAULT 0 NOT NULL,
    "fecha_contratacion" "date",
    "estado_general" "text" DEFAULT 'ACTIVO'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "empleados_estado_general_valid_chk" CHECK (("estado_general" = ANY (ARRAY['ACTIVO'::"text", 'INACTIVO'::"text"]))),
    CONSTRAINT "empleados_nombre_not_blank_chk" CHECK (("length"(TRIM(BOTH FROM "nombre")) > 0)),
    CONSTRAINT "empleados_rol_valid_chk" CHECK (("rol" = ANY (ARRAY['OPERARIO'::"text", 'RESIDENTE'::"text", 'OFICINA'::"text"]))),
    CONSTRAINT "empleados_salario_mensual_nonnegative_chk" CHECK (("salario_mensual" >= (0)::numeric)),
    CONSTRAINT "empleados_tipo_valid_chk" CHECK (("tipo" = ANY (ARRAY['CAMPO'::"text", 'OFICINA'::"text"]))),
    CONSTRAINT "empleados_valor_dia_nonnegative_chk" CHECK (("valor_dia" >= (0)::numeric)),
    CONSTRAINT "empleados_valor_hora_extra_nonnegative_chk" CHECK (("valor_hora_extra" >= (0)::numeric))
);


ALTER TABLE "public"."empleados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movimientos_caja_chica" (
    "id" bigint NOT NULL,
    "caja_chica_proyecto_id" bigint,
    "proyecto" "text" NOT NULL,
    "fecha" "date" NOT NULL,
    "concepto" "text",
    "categoria" "text",
    "valor" numeric(12,2) DEFAULT 0 NOT NULL,
    "creado_por" "text",
    "creado_por_rol" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "egreso_id" "uuid",
    "caja_chica_residente_id" "uuid",
    "residente" "text",
    CONSTRAINT "movimientos_caja_chica_valor_nonnegative_chk" CHECK (("valor" >= (0)::numeric))
);


ALTER TABLE "public"."movimientos_caja_chica" OWNER TO "postgres";


ALTER TABLE "public"."movimientos_caja_chica" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."movimientos_caja_chica_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."personal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "rol" "text",
    "cargo" "text",
    "tipo" "text" DEFAULT 'CAMPO'::"text",
    "proyecto" "text",
    "valor_dia" numeric DEFAULT 0,
    "valor_hora_extra" numeric DEFAULT 0,
    "estado" "text" DEFAULT 'ACTIVO'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "salario_mensual" numeric DEFAULT 0,
    "fecha_contratacion" "date",
    CONSTRAINT "personal_nombre_not_blank_chk" CHECK (("length"(TRIM(BOTH FROM "nombre")) > 0)),
    CONSTRAINT "personal_salario_mensual_nonnegative_chk" CHECK (("salario_mensual" >= (0)::numeric)),
    CONSTRAINT "personal_valor_dia_nonnegative_chk" CHECK (("valor_dia" >= (0)::numeric)),
    CONSTRAINT "personal_valor_hora_extra_nonnegative_chk" CHECK (("valor_hora_extra" >= (0)::numeric))
);


ALTER TABLE "public"."personal" OWNER TO "postgres";


COMMENT ON TABLE "public"."personal" IS 'LEGACY: tabla reemplazada funcionalmente por public.empleados + public.empleado_proyecto + public.v_empleado_asignaciones. Mantener solo como respaldo temporal y solo lectura admin.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "rol" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_rol_check" CHECK (("rol" = ANY (ARRAY['ADMIN'::"text", 'RESIDENTE'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proyecto_residentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proyecto_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "personal_id" "uuid",
    "es_principal" boolean DEFAULT false NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "origen" "text" DEFAULT 'MANUAL'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."proyecto_residentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proyectos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "residente" "text",
    "residentes" "text"[] DEFAULT '{}'::"text"[],
    "presupuesto" numeric DEFAULT 0,
    "dueno" "text",
    "ubicacion" "text",
    "tiempo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "residente_principal_id" "uuid",
    CONSTRAINT "proyectos_nombre_not_blank_chk" CHECK (("length"(TRIM(BOTH FROM "nombre")) > 0)),
    CONSTRAINT "proyectos_presupuesto_nonnegative_chk" CHECK (("presupuesto" >= (0)::numeric))
);


ALTER TABLE "public"."proyectos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_caja_chica_residente_resumen" AS
 WITH "residentes_base" AS (
         SELECT "upper"(TRIM(BOTH FROM COALESCE("t"."residente", ''::"text"))) AS "residente_key",
            "max"(TRIM(BOTH FROM COALESCE("t"."residente", ''::"text"))) AS "residente_nombre"
           FROM ( SELECT "caja_chica_desembolsos"."residente"
                   FROM "public"."caja_chica_desembolsos"
                UNION ALL
                 SELECT "egresos"."residente"
                   FROM "public"."egresos"
                UNION ALL
                 SELECT "caja_chica_residente"."residente"
                   FROM "public"."caja_chica_residente") "t"
          WHERE (TRIM(BOTH FROM COALESCE("t"."residente", ''::"text")) <> ''::"text")
          GROUP BY ("upper"(TRIM(BOTH FROM COALESCE("t"."residente", ''::"text"))))
        ), "ult_desembolso" AS (
         SELECT "upper"(TRIM(BOTH FROM COALESCE("caja_chica_desembolsos"."residente", ''::"text"))) AS "residente_key",
            "caja_chica_desembolsos"."monto_desembolsado" AS "ultimo_monto",
            "caja_chica_desembolsos"."fecha_desembolso" AS "fecha_ultimo_desembolso",
            "row_number"() OVER (PARTITION BY ("upper"(TRIM(BOTH FROM COALESCE("caja_chica_desembolsos"."residente", ''::"text")))) ORDER BY "caja_chica_desembolsos"."fecha_desembolso" DESC, "caja_chica_desembolsos"."id" DESC) AS "rn"
           FROM "public"."caja_chica_desembolsos"
          WHERE (TRIM(BOTH FROM COALESCE("caja_chica_desembolsos"."residente", ''::"text")) <> ''::"text")
        ), "total_desembolsado" AS (
         SELECT "upper"(TRIM(BOTH FROM COALESCE("caja_chica_desembolsos"."residente", ''::"text"))) AS "residente_key",
            (COALESCE("sum"("caja_chica_desembolsos"."monto_desembolsado"), (0)::numeric))::numeric(12,2) AS "total_desembolsado"
           FROM "public"."caja_chica_desembolsos"
          WHERE (TRIM(BOTH FROM COALESCE("caja_chica_desembolsos"."residente", ''::"text")) <> ''::"text")
          GROUP BY ("upper"(TRIM(BOTH FROM COALESCE("caja_chica_desembolsos"."residente", ''::"text"))))
        ), "gastos_caja" AS (
         SELECT "upper"(TRIM(BOTH FROM COALESCE("egresos"."residente", ''::"text"))) AS "residente_key",
            (COALESCE("sum"("egresos"."valor"), (0)::numeric))::numeric(12,2) AS "gastado_actual"
           FROM "public"."egresos"
          WHERE (("upper"(COALESCE("egresos"."fuente_fondos", ''::"text")) = 'CAJA_CHICA'::"text") AND ("upper"(COALESCE("egresos"."estado", ''::"text")) <> 'ANULADO'::"text") AND (TRIM(BOTH FROM COALESCE("egresos"."residente", ''::"text")) <> ''::"text"))
          GROUP BY ("upper"(TRIM(BOTH FROM COALESCE("egresos"."residente", ''::"text"))))
        )
 SELECT "rb"."residente_key",
    "rb"."residente_nombre",
    (COALESCE("ud"."ultimo_monto", (0)::numeric))::numeric(12,2) AS "monto_actual_asignado",
    (COALESCE("gc"."gastado_actual", (0)::numeric))::numeric(12,2) AS "gastado_actual",
    ((COALESCE("td"."total_desembolsado", (0)::numeric) - COALESCE("gc"."gastado_actual", (0)::numeric)))::numeric(12,2) AS "saldo_actual",
        CASE
            WHEN ((COALESCE("td"."total_desembolsado", (0)::numeric) <= (0)::numeric) AND (COALESCE("gc"."gastado_actual", (0)::numeric) <= (0)::numeric)) THEN 'SIN FONDO'::"text"
            WHEN ((COALESCE("td"."total_desembolsado", (0)::numeric) - COALESCE("gc"."gastado_actual", (0)::numeric)) < (0)::numeric) THEN 'EXCEDIDA'::"text"
            WHEN (((COALESCE("td"."total_desembolsado", (0)::numeric) - COALESCE("gc"."gastado_actual", (0)::numeric)) = (0)::numeric) AND (COALESCE("td"."total_desembolsado", (0)::numeric) > (0)::numeric)) THEN 'AGOTADA'::"text"
            WHEN ((COALESCE("ud"."ultimo_monto", (0)::numeric) > (0)::numeric) AND (((COALESCE("td"."total_desembolsado", (0)::numeric) - COALESCE("gc"."gastado_actual", (0)::numeric)) / NULLIF(COALESCE("ud"."ultimo_monto", (0)::numeric), (0)::numeric)) <= 0.2)) THEN 'POR AGOTARSE'::"text"
            ELSE 'DISPONIBLE'::"text"
        END AS "estado",
    "ud"."fecha_ultimo_desembolso"
   FROM ((("residentes_base" "rb"
     LEFT JOIN "total_desembolsado" "td" ON (("td"."residente_key" = "rb"."residente_key")))
     LEFT JOIN "gastos_caja" "gc" ON (("gc"."residente_key" = "rb"."residente_key")))
     LEFT JOIN ( SELECT "ult_desembolso"."residente_key",
            "ult_desembolso"."ultimo_monto",
            "ult_desembolso"."fecha_ultimo_desembolso"
           FROM "ult_desembolso"
          WHERE ("ult_desembolso"."rn" = 1)) "ud" ON (("ud"."residente_key" = "rb"."residente_key")));


ALTER VIEW "public"."v_caja_chica_residente_resumen" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_caja_chica_resumen" AS
 WITH "desembolsos" AS (
         SELECT (COALESCE("sum"("caja_chica_desembolsos"."monto_desembolsado"), (0)::numeric))::numeric(12,2) AS "total_desembolsado"
           FROM "public"."caja_chica_desembolsos"
        ), "gastos" AS (
         SELECT (COALESCE("sum"("egresos"."valor"), (0)::numeric))::numeric(12,2) AS "total_gastado"
           FROM "public"."egresos"
          WHERE (("upper"(COALESCE("egresos"."fuente_fondos", ''::"text")) = 'CAJA_CHICA'::"text") AND ("upper"(COALESCE("egresos"."estado", ''::"text")) <> 'ANULADO'::"text"))
        ), "residentes" AS (
         SELECT ("count"(*) FILTER (WHERE ((COALESCE("caja_chica_residente"."monto_actual_asignado", (0)::numeric) > (0)::numeric) OR (COALESCE("caja_chica_residente"."saldo_actual", (0)::numeric) > (0)::numeric))))::integer AS "fondos_activos",
            ("count"(*) FILTER (WHERE (("upper"(COALESCE("caja_chica_residente"."estado", ''::"text")) = ANY (ARRAY['EXCEDIDA'::"text", 'AGOTADA'::"text", 'POR AGOTARSE'::"text"])) OR (COALESCE("caja_chica_residente"."saldo_actual", (0)::numeric) < (0)::numeric))))::integer AS "residentes_en_alerta"
           FROM "public"."caja_chica_residente"
        )
 SELECT "d"."total_desembolsado",
    "g"."total_gastado",
    "r"."fondos_activos",
    "r"."residentes_en_alerta"
   FROM (("desembolsos" "d"
     CROSS JOIN "gastos" "g")
     CROSS JOIN "residentes" "r");


ALTER VIEW "public"."v_caja_chica_resumen" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_empleado_asignaciones" AS
 SELECT "ep"."id" AS "asignacion_id",
    "e"."id" AS "empleado_id",
    "e"."nombre",
    COALESCE("ep"."cargo_en_proyecto", "e"."cargo") AS "cargo",
    COALESCE("ep"."rol_en_proyecto", "e"."rol") AS "rol",
    COALESCE("ep"."tipo_en_proyecto", "e"."tipo") AS "tipo",
    "p"."id" AS "proyecto_id",
    "p"."nombre" AS "proyecto",
    "e"."valor_dia",
    "e"."salario_mensual",
    "e"."valor_hora_extra",
    "e"."fecha_contratacion",
    "e"."estado_general",
    "ep"."estado_asignacion",
    "ep"."fecha_inicio",
    "ep"."fecha_fin",
    "e"."created_at" AS "empleado_created_at",
    "ep"."created_at" AS "asignacion_created_at",
    "e"."updated_at" AS "empleado_updated_at",
    "ep"."updated_at" AS "asignacion_updated_at"
   FROM (("public"."empleado_proyecto" "ep"
     JOIN "public"."empleados" "e" ON (("e"."id" = "ep"."empleado_id")))
     JOIN "public"."proyectos" "p" ON (("p"."id" = "ep"."proyecto_id")));


ALTER VIEW "public"."v_empleado_asignaciones" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_proyecto_residentes_activos" AS
 SELECT "pr"."id",
    "pr"."proyecto_id",
    "p"."nombre" AS "proyecto_nombre",
    "pr"."profile_id",
    "pf"."nombre" AS "residente_nombre",
    "pr"."personal_id",
    "pe"."nombre" AS "personal_nombre",
    "pr"."es_principal",
    "pr"."activo",
    "pr"."origen",
    "pr"."created_at",
    "pr"."updated_at"
   FROM ((("public"."proyecto_residentes" "pr"
     JOIN "public"."proyectos" "p" ON (("p"."id" = "pr"."proyecto_id")))
     JOIN "public"."profiles" "pf" ON (("pf"."id" = "pr"."profile_id")))
     LEFT JOIN "public"."personal" "pe" ON (("pe"."id" = "pr"."personal_id")))
  WHERE ("pr"."activo" = true);


ALTER VIEW "public"."v_proyecto_residentes_activos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."caja_chica_desembolsos"
    ADD CONSTRAINT "caja_chica_desembolsos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."caja_chica_proyecto"
    ADD CONSTRAINT "caja_chica_proyecto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."caja_chica_proyecto"
    ADD CONSTRAINT "caja_chica_proyecto_proyecto_key" UNIQUE ("proyecto");



ALTER TABLE ONLY "public"."caja_chica_residente"
    ADD CONSTRAINT "caja_chica_residente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."caja_chica_residente"
    ADD CONSTRAINT "caja_chica_residente_residente_key" UNIQUE ("residente");



ALTER TABLE ONLY "public"."catalogo_cargos"
    ADD CONSTRAINT "catalogo_cargos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."catalogo_cargos"
    ADD CONSTRAINT "catalogo_cargos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cliente_accesos"
    ADD CONSTRAINT "cliente_accesos_codigo_acceso_key" UNIQUE ("codigo_acceso");



ALTER TABLE ONLY "public"."cliente_accesos"
    ADD CONSTRAINT "cliente_accesos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cliente_accesos"
    ADD CONSTRAINT "cliente_accesos_proyecto_id_key" UNIQUE ("proyecto_id");



ALTER TABLE ONLY "public"."egresos"
    ADD CONSTRAINT "egresos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empleado_proyecto"
    ADD CONSTRAINT "empleado_proyecto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empleado_proyecto"
    ADD CONSTRAINT "empleado_proyecto_unica_asignacion" UNIQUE ("empleado_id", "proyecto_id");



ALTER TABLE ONLY "public"."empleados"
    ADD CONSTRAINT "empleados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal"
    ADD CONSTRAINT "personal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proyecto_residentes"
    ADD CONSTRAINT "proyecto_residentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proyectos"
    ADD CONSTRAINT "proyectos_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."proyectos"
    ADD CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id");



CREATE INDEX "empleado_proyecto_created_at_idx" ON "public"."empleado_proyecto" USING "btree" ("created_at" DESC);



CREATE INDEX "empleado_proyecto_empleado_id_idx" ON "public"."empleado_proyecto" USING "btree" ("empleado_id");



CREATE INDEX "empleado_proyecto_estado_idx" ON "public"."empleado_proyecto" USING "btree" ("estado_asignacion");



CREATE INDEX "empleado_proyecto_proyecto_id_idx" ON "public"."empleado_proyecto" USING "btree" ("proyecto_id");



CREATE INDEX "empleados_created_at_idx" ON "public"."empleados" USING "btree" ("created_at" DESC);



CREATE INDEX "empleados_estado_general_idx" ON "public"."empleados" USING "btree" ("estado_general");



CREATE UNIQUE INDEX "empleados_nombre_unique_idx" ON "public"."empleados" USING "btree" ("upper"(TRIM(BOTH FROM "nombre")));



CREATE INDEX "empleados_rol_idx" ON "public"."empleados" USING "btree" ("rol");



CREATE INDEX "empleados_tipo_idx" ON "public"."empleados" USING "btree" ("tipo");



CREATE INDEX "idx_caja_chica_desembolsos_residente" ON "public"."caja_chica_desembolsos" USING "btree" ("residente");



CREATE INDEX "idx_caja_chica_residente_residente" ON "public"."caja_chica_residente" USING "btree" ("residente");



CREATE UNIQUE INDEX "idx_catalogo_cargos_nombre_normalizado" ON "public"."catalogo_cargos" USING "btree" ("nombre_normalizado");



CREATE INDEX "idx_cliente_accesos_proyecto_id" ON "public"."cliente_accesos" USING "btree" ("proyecto_id");



CREATE INDEX "idx_movimientos_caja_chica_residente" ON "public"."movimientos_caja_chica" USING "btree" ("residente");



CREATE INDEX "idx_movimientos_caja_chica_residente_id" ON "public"."movimientos_caja_chica" USING "btree" ("caja_chica_residente_id");



CREATE INDEX "idx_proyecto_residentes_personal_id" ON "public"."proyecto_residentes" USING "btree" ("personal_id");



CREATE INDEX "idx_proyecto_residentes_profile_id" ON "public"."proyecto_residentes" USING "btree" ("profile_id");



CREATE INDEX "idx_proyecto_residentes_proyecto_id" ON "public"."proyecto_residentes" USING "btree" ("proyecto_id");



CREATE INDEX "idx_proyectos_residente_principal_id" ON "public"."proyectos" USING "btree" ("residente_principal_id");



CREATE UNIQUE INDEX "uq_proyecto_residente_principal_activo" ON "public"."proyecto_residentes" USING "btree" ("proyecto_id") WHERE (("es_principal" = true) AND ("activo" = true));



CREATE UNIQUE INDEX "uq_proyecto_residentes_activo" ON "public"."proyecto_residentes" USING "btree" ("proyecto_id", "profile_id") WHERE ("activo" = true);



CREATE OR REPLACE TRIGGER "trg_catalogo_cargos_nombre_normalizado" BEFORE INSERT OR UPDATE OF "nombre" ON "public"."catalogo_cargos" FOR EACH ROW EXECUTE FUNCTION "public"."catalogo_cargos_set_nombre_normalizado"();



CREATE OR REPLACE TRIGGER "trg_catalogo_cargos_updated_at" BEFORE UPDATE ON "public"."catalogo_cargos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cliente_accesos_updated_at" BEFORE UPDATE ON "public"."cliente_accesos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_cliente_accesos"();



CREATE OR REPLACE TRIGGER "trg_egresos_updated_at" BEFORE UPDATE ON "public"."egresos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_empleado_proyecto_updated_at" BEFORE UPDATE ON "public"."empleado_proyecto" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_empleados_updated_at" BEFORE UPDATE ON "public"."empleados" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_proyecto_residentes_updated_at" BEFORE UPDATE ON "public"."proyecto_residentes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_recalc_caja_chica_residente_from_mov" AFTER INSERT OR DELETE OR UPDATE ON "public"."movimientos_caja_chica" FOR EACH ROW EXECUTE FUNCTION "public"."tg_recalc_caja_chica_residente_from_mov"();



CREATE OR REPLACE TRIGGER "trg_sync_caja_chica_residente_fields" BEFORE INSERT OR UPDATE ON "public"."caja_chica_residente" FOR EACH ROW EXECUTE FUNCTION "public"."tg_sync_caja_chica_residente_fields"();



ALTER TABLE ONLY "public"."caja_chica_desembolsos"
    ADD CONSTRAINT "caja_chica_desembolsos_caja_chica_residente_id_fkey" FOREIGN KEY ("caja_chica_residente_id") REFERENCES "public"."caja_chica_residente"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cliente_accesos"
    ADD CONSTRAINT "cliente_accesos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empleado_proyecto"
    ADD CONSTRAINT "empleado_proyecto_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empleado_proyecto"
    ADD CONSTRAINT "empleado_proyecto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_caja_chica_proyecto_id_fkey" FOREIGN KEY ("caja_chica_proyecto_id") REFERENCES "public"."caja_chica_proyecto"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_caja_chica_residente_id_fkey" FOREIGN KEY ("caja_chica_residente_id") REFERENCES "public"."caja_chica_residente"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_egreso_id_fkey" FOREIGN KEY ("egreso_id") REFERENCES "public"."egresos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proyecto_residentes"
    ADD CONSTRAINT "proyecto_residentes_personal_id_fkey" FOREIGN KEY ("personal_id") REFERENCES "public"."personal"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."proyecto_residentes"
    ADD CONSTRAINT "proyecto_residentes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proyecto_residentes"
    ADD CONSTRAINT "proyecto_residentes_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proyectos"
    ADD CONSTRAINT "proyectos_residente_principal_id_fkey" FOREIGN KEY ("residente_principal_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."caja_chica_desembolsos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caja_chica_desembolsos_delete_admin_only" ON "public"."caja_chica_desembolsos" FOR DELETE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "caja_chica_desembolsos_insert_admin_only" ON "public"."caja_chica_desembolsos" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "caja_chica_desembolsos_select_admin_or_self" ON "public"."caja_chica_desembolsos" FOR SELECT TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))))));



CREATE POLICY "caja_chica_desembolsos_update_admin_only" ON "public"."caja_chica_desembolsos" FOR UPDATE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text")) WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



ALTER TABLE "public"."caja_chica_proyecto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caja_chica_proyecto_insert_authenticated" ON "public"."caja_chica_proyecto" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "caja_chica_proyecto_select_authenticated" ON "public"."caja_chica_proyecto" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "caja_chica_proyecto_update_authenticated" ON "public"."caja_chica_proyecto" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."caja_chica_residente" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caja_chica_residente_delete_admin_only" ON "public"."caja_chica_residente" FOR DELETE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "caja_chica_residente_insert_admin_only" ON "public"."caja_chica_residente" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "caja_chica_residente_select_admin_or_self" ON "public"."caja_chica_residente" FOR SELECT TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))))));



CREATE POLICY "caja_chica_residente_update_admin_only" ON "public"."caja_chica_residente" FOR UPDATE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text")) WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



ALTER TABLE "public"."catalogo_cargos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalogo_cargos_insert_admin" ON "public"."catalogo_cargos" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) = 'admin@blendfortdemo.com'::"text")));



CREATE POLICY "catalogo_cargos_select_authenticated" ON "public"."catalogo_cargos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "catalogo_cargos_update_admin" ON "public"."catalogo_cargos" FOR UPDATE TO "authenticated" USING ((("auth"."role"() = 'authenticated'::"text") AND ("lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) = 'admin@blendfortdemo.com'::"text"))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) = 'admin@blendfortdemo.com'::"text")));



ALTER TABLE "public"."cliente_accesos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."egresos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "egresos_delete_admin_or_owner" ON "public"."egresos" FOR DELETE TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por_rol", ''::"text"))) = 'RESIDENTE'::"text"))));



CREATE POLICY "egresos_insert_admin_or_residente_assigned" ON "public"."egresos" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por_rol", ''::"text"))) = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."proyectos" "p"
  WHERE (("upper"(TRIM(BOTH FROM COALESCE("p"."nombre", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("egresos"."proyecto", ''::"text")))) AND (("upper"(TRIM(BOTH FROM COALESCE("p"."residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) OR ("upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text"))) IN ( SELECT "upper"(TRIM(BOTH FROM "x"."x")) AS "upper"
           FROM "unnest"(COALESCE("p"."residentes", '{}'::"text"[])) "x"("x"))))))))));



CREATE POLICY "egresos_select_admin_or_assigned_resident" ON "public"."egresos" FOR SELECT TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND (("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."proyectos" "p"
  WHERE (("upper"(TRIM(BOTH FROM COALESCE("p"."nombre", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("egresos"."proyecto", ''::"text")))) AND (("upper"(TRIM(BOTH FROM COALESCE("p"."residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) OR ("upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text"))) IN ( SELECT "upper"(TRIM(BOTH FROM "x"."x")) AS "upper"
           FROM "unnest"(COALESCE("p"."residentes", '{}'::"text"[])) "x"("x")))))))))));



CREATE POLICY "egresos_update_admin_or_owner" ON "public"."egresos" FOR UPDATE TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por_rol", ''::"text"))) = 'RESIDENTE'::"text")))) WITH CHECK ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) AND ("upper"(TRIM(BOTH FROM COALESCE("creado_por_rol", ''::"text"))) = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."proyectos" "p"
  WHERE (("upper"(TRIM(BOTH FROM COALESCE("p"."nombre", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("egresos"."proyecto", ''::"text")))) AND (("upper"(TRIM(BOTH FROM COALESCE("p"."residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) OR ("upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text"))) IN ( SELECT "upper"(TRIM(BOTH FROM "x"."x")) AS "upper"
           FROM "unnest"(COALESCE("p"."residentes", '{}'::"text"[])) "x"("x"))))))))));



ALTER TABLE "public"."empleado_proyecto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empleado_proyecto_delete_admin_only" ON "public"."empleado_proyecto" FOR DELETE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "empleado_proyecto_insert_admin_only" ON "public"."empleado_proyecto" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "empleado_proyecto_select_admin_or_assigned_resident" ON "public"."empleado_proyecto" FOR SELECT TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."proyectos" "p"
  WHERE (("p"."id" = "empleado_proyecto"."proyecto_id") AND (("upper"(TRIM(BOTH FROM COALESCE("p"."residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) OR ("upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text"))) IN ( SELECT "upper"(TRIM(BOTH FROM "x"."x")) AS "upper"
           FROM "unnest"(COALESCE("p"."residentes", '{}'::"text"[])) "x"("x"))))))))));



CREATE POLICY "empleado_proyecto_update_admin_only" ON "public"."empleado_proyecto" FOR UPDATE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text")) WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



ALTER TABLE "public"."empleados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empleados_delete_admin_only" ON "public"."empleados" FOR DELETE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "empleados_insert_admin_only" ON "public"."empleados" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "empleados_select_admin_or_assigned_resident" ON "public"."empleados" FOR SELECT TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."empleado_proyecto" "ep"
     JOIN "public"."proyectos" "p" ON (("p"."id" = "ep"."proyecto_id")))
  WHERE (("ep"."empleado_id" = "empleados"."id") AND (("upper"(TRIM(BOTH FROM COALESCE("p"."residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) OR ("upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text"))) IN ( SELECT "upper"(TRIM(BOTH FROM "x"."x")) AS "upper"
           FROM "unnest"(COALESCE("p"."residentes", '{}'::"text"[])) "x"("x"))))))))));



CREATE POLICY "empleados_update_admin_only" ON "public"."empleados" FOR UPDATE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text")) WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



ALTER TABLE "public"."movimientos_caja_chica" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "movimientos_caja_chica_delete_admin_or_self" ON "public"."movimientos_caja_chica" FOR DELETE TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))))));



CREATE POLICY "movimientos_caja_chica_insert_admin_or_self" ON "public"."movimientos_caja_chica" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."caja_chica_residente" "c"
  WHERE (("c"."id" = "movimientos_caja_chica"."caja_chica_residente_id") AND ("upper"(TRIM(BOTH FROM COALESCE("c"."residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text"))))))))));



CREATE POLICY "movimientos_caja_chica_select_admin_or_self" ON "public"."movimientos_caja_chica" FOR SELECT TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND ("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))))));



CREATE POLICY "movimientos_caja_chica_update_admin_only" ON "public"."movimientos_caja_chica" FOR UPDATE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text")) WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



ALTER TABLE "public"."personal" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personal_delete_block_legacy" ON "public"."personal" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "personal_insert_block_legacy" ON "public"."personal" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "personal_select_admin_only_legacy" ON "public"."personal" FOR SELECT TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "personal_update_block_legacy" ON "public"."personal" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."proyecto_residentes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proyectos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "proyectos_delete_admin_only" ON "public"."proyectos" FOR DELETE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "proyectos_insert_admin_only" ON "public"."proyectos" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));



CREATE POLICY "proyectos_select_admin_or_assigned_resident" ON "public"."proyectos" FOR SELECT TO "authenticated" USING ((("public"."current_role"() = 'ADMIN'::"text") OR (("public"."current_role"() = 'RESIDENTE'::"text") AND (("upper"(TRIM(BOTH FROM COALESCE("residente", ''::"text"))) = "upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text")))) OR ("upper"(TRIM(BOTH FROM COALESCE("public"."current_nombre"(), ''::"text"))) IN ( SELECT "upper"(TRIM(BOTH FROM "x"."x")) AS "upper"
   FROM "unnest"(COALESCE("proyectos"."residentes", '{}'::"text"[])) "x"("x")))))));



CREATE POLICY "proyectos_update_admin_only" ON "public"."proyectos" FOR UPDATE TO "authenticated" USING (("public"."current_role"() = 'ADMIN'::"text")) WITH CHECK (("public"."current_role"() = 'ADMIN'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."calc_caja_chica_estado"("p_monto" numeric, "p_gastado" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calc_caja_chica_estado"("p_monto" numeric, "p_gastado" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calc_caja_chica_estado"("p_monto" numeric, "p_gastado" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."catalogo_cargos_set_nombre_normalizado"() TO "anon";
GRANT ALL ON FUNCTION "public"."catalogo_cargos_set_nombre_normalizado"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."catalogo_cargos_set_nombre_normalizado"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_nombre"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_nombre"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_nombre"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_caja_chica_residente_by_id"("p_caja_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_caja_chica_residente_by_id"("p_caja_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_caja_chica_residente_by_id"("p_caja_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_desembolso_residente"("p_residente" "text", "p_fecha_desembolso" "date", "p_monto" numeric, "p_observacion" "text", "p_creado_por" "text", "p_creado_por_rol" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_desembolso_residente"("p_residente" "text", "p_fecha_desembolso" "date", "p_monto" numeric, "p_observacion" "text", "p_creado_por" "text", "p_creado_por_rol" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_desembolso_residente"("p_residente" "text", "p_fecha_desembolso" "date", "p_monto" numeric, "p_observacion" "text", "p_creado_por" "text", "p_creado_por_rol" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_cliente_accesos"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_cliente_accesos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_cliente_accesos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_recalc_caja_chica_residente_from_mov"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_recalc_caja_chica_residente_from_mov"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_recalc_caja_chica_residente_from_mov"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_sync_caja_chica_residente_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_sync_caja_chica_residente_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_sync_caja_chica_residente_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";


















GRANT ALL ON TABLE "public"."caja_chica_desembolsos" TO "anon";
GRANT ALL ON TABLE "public"."caja_chica_desembolsos" TO "authenticated";
GRANT ALL ON TABLE "public"."caja_chica_desembolsos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."caja_chica_desembolsos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."caja_chica_desembolsos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."caja_chica_desembolsos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."caja_chica_proyecto" TO "anon";
GRANT ALL ON TABLE "public"."caja_chica_proyecto" TO "authenticated";
GRANT ALL ON TABLE "public"."caja_chica_proyecto" TO "service_role";



GRANT ALL ON SEQUENCE "public"."caja_chica_proyecto_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."caja_chica_proyecto_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."caja_chica_proyecto_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."caja_chica_residente" TO "anon";
GRANT ALL ON TABLE "public"."caja_chica_residente" TO "authenticated";
GRANT ALL ON TABLE "public"."caja_chica_residente" TO "service_role";



GRANT ALL ON TABLE "public"."catalogo_cargos" TO "anon";
GRANT ALL ON TABLE "public"."catalogo_cargos" TO "authenticated";
GRANT ALL ON TABLE "public"."catalogo_cargos" TO "service_role";



GRANT ALL ON TABLE "public"."cliente_accesos" TO "anon";
GRANT ALL ON TABLE "public"."cliente_accesos" TO "authenticated";
GRANT ALL ON TABLE "public"."cliente_accesos" TO "service_role";



GRANT ALL ON TABLE "public"."egresos" TO "anon";
GRANT ALL ON TABLE "public"."egresos" TO "authenticated";
GRANT ALL ON TABLE "public"."egresos" TO "service_role";



GRANT ALL ON TABLE "public"."empleado_proyecto" TO "anon";
GRANT ALL ON TABLE "public"."empleado_proyecto" TO "authenticated";
GRANT ALL ON TABLE "public"."empleado_proyecto" TO "service_role";



GRANT ALL ON TABLE "public"."empleados" TO "anon";
GRANT ALL ON TABLE "public"."empleados" TO "authenticated";
GRANT ALL ON TABLE "public"."empleados" TO "service_role";



GRANT ALL ON TABLE "public"."movimientos_caja_chica" TO "anon";
GRANT ALL ON TABLE "public"."movimientos_caja_chica" TO "authenticated";
GRANT ALL ON TABLE "public"."movimientos_caja_chica" TO "service_role";



GRANT ALL ON SEQUENCE "public"."movimientos_caja_chica_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."movimientos_caja_chica_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."movimientos_caja_chica_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."personal" TO "anon";
GRANT ALL ON TABLE "public"."personal" TO "authenticated";
GRANT ALL ON TABLE "public"."personal" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."proyecto_residentes" TO "anon";
GRANT ALL ON TABLE "public"."proyecto_residentes" TO "authenticated";
GRANT ALL ON TABLE "public"."proyecto_residentes" TO "service_role";



GRANT ALL ON TABLE "public"."proyectos" TO "anon";
GRANT ALL ON TABLE "public"."proyectos" TO "authenticated";
GRANT ALL ON TABLE "public"."proyectos" TO "service_role";



GRANT ALL ON TABLE "public"."v_caja_chica_residente_resumen" TO "anon";
GRANT ALL ON TABLE "public"."v_caja_chica_residente_resumen" TO "authenticated";
GRANT ALL ON TABLE "public"."v_caja_chica_residente_resumen" TO "service_role";



GRANT ALL ON TABLE "public"."v_caja_chica_resumen" TO "anon";
GRANT ALL ON TABLE "public"."v_caja_chica_resumen" TO "authenticated";
GRANT ALL ON TABLE "public"."v_caja_chica_resumen" TO "service_role";



GRANT ALL ON TABLE "public"."v_empleado_asignaciones" TO "anon";
GRANT ALL ON TABLE "public"."v_empleado_asignaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."v_empleado_asignaciones" TO "service_role";



GRANT ALL ON TABLE "public"."v_proyecto_residentes_activos" TO "anon";
GRANT ALL ON TABLE "public"."v_proyecto_residentes_activos" TO "authenticated";
GRANT ALL ON TABLE "public"."v_proyecto_residentes_activos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created_profiles AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


