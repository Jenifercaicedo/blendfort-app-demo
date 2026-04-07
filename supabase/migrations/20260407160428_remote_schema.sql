


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



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."caja_chica_residente" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "rol" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_rol_check" CHECK (("rol" = ANY (ARRAY['ADMIN'::"text", 'RESIDENTE'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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
    CONSTRAINT "proyectos_nombre_not_blank_chk" CHECK (("length"(TRIM(BOTH FROM "nombre")) > 0)),
    CONSTRAINT "proyectos_presupuesto_nonnegative_chk" CHECK (("presupuesto" >= (0)::numeric))
);


ALTER TABLE "public"."proyectos" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."egresos"
    ADD CONSTRAINT "egresos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal"
    ADD CONSTRAINT "personal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proyectos"
    ADD CONSTRAINT "proyectos_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."proyectos"
    ADD CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_caja_chica_desembolsos_residente" ON "public"."caja_chica_desembolsos" USING "btree" ("residente");



CREATE INDEX "idx_caja_chica_residente_residente" ON "public"."caja_chica_residente" USING "btree" ("residente");



CREATE INDEX "idx_movimientos_caja_chica_residente" ON "public"."movimientos_caja_chica" USING "btree" ("residente");



CREATE INDEX "idx_movimientos_caja_chica_residente_id" ON "public"."movimientos_caja_chica" USING "btree" ("caja_chica_residente_id");



CREATE OR REPLACE TRIGGER "trg_egresos_updated_at" BEFORE UPDATE ON "public"."egresos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."caja_chica_desembolsos"
    ADD CONSTRAINT "caja_chica_desembolsos_caja_chica_residente_id_fkey" FOREIGN KEY ("caja_chica_residente_id") REFERENCES "public"."caja_chica_residente"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_caja_chica_proyecto_id_fkey" FOREIGN KEY ("caja_chica_proyecto_id") REFERENCES "public"."caja_chica_proyecto"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_caja_chica_residente_id_fkey" FOREIGN KEY ("caja_chica_residente_id") REFERENCES "public"."caja_chica_residente"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."movimientos_caja_chica"
    ADD CONSTRAINT "movimientos_caja_chica_egreso_id_fkey" FOREIGN KEY ("egreso_id") REFERENCES "public"."egresos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "allow_delete_caja_chica_desembolsos" ON "public"."caja_chica_desembolsos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "allow_delete_caja_chica_residente" ON "public"."caja_chica_residente" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "allow_delete_movimientos_caja_chica" ON "public"."movimientos_caja_chica" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "allow_insert_caja_chica_desembolsos" ON "public"."caja_chica_desembolsos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_insert_caja_chica_residente" ON "public"."caja_chica_residente" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_insert_movimientos_caja_chica" ON "public"."movimientos_caja_chica" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_select_caja_chica_desembolsos" ON "public"."caja_chica_desembolsos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_select_caja_chica_residente" ON "public"."caja_chica_residente" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_select_movimientos_caja_chica" ON "public"."movimientos_caja_chica" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_update_caja_chica_desembolsos" ON "public"."caja_chica_desembolsos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "allow_update_caja_chica_residente" ON "public"."caja_chica_residente" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "allow_update_movimientos_caja_chica" ON "public"."movimientos_caja_chica" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."caja_chica_desembolsos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caja_chica_desembolsos_insert_authenticated" ON "public"."caja_chica_desembolsos" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "caja_chica_desembolsos_select_authenticated" ON "public"."caja_chica_desembolsos" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."caja_chica_proyecto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "caja_chica_proyecto_insert_authenticated" ON "public"."caja_chica_proyecto" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "caja_chica_proyecto_select_authenticated" ON "public"."caja_chica_proyecto" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "caja_chica_proyecto_update_authenticated" ON "public"."caja_chica_proyecto" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."caja_chica_residente" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."egresos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "egresos_delete_authenticated" ON "public"."egresos" FOR DELETE TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "egresos_insert_authenticated" ON "public"."egresos" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "egresos_select_authenticated" ON "public"."egresos" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "egresos_update_authenticated" ON "public"."egresos" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."movimientos_caja_chica" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "movimientos_caja_chica_insert_authenticated" ON "public"."movimientos_caja_chica" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "movimientos_caja_chica_select_authenticated" ON "public"."movimientos_caja_chica" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."personal" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personal_delete_authenticated" ON "public"."personal" FOR DELETE TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "personal_insert_authenticated" ON "public"."personal" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "personal_select_authenticated" ON "public"."personal" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "personal_update_authenticated" ON "public"."personal" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."proyectos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "proyectos_delete_authenticated" ON "public"."proyectos" FOR DELETE TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "proyectos_insert_authenticated" ON "public"."proyectos" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "proyectos_select_authenticated" ON "public"."proyectos" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "proyectos_update_authenticated" ON "public"."proyectos" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."current_nombre"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_nombre"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_nombre"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















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



GRANT ALL ON TABLE "public"."egresos" TO "anon";
GRANT ALL ON TABLE "public"."egresos" TO "authenticated";
GRANT ALL ON TABLE "public"."egresos" TO "service_role";



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



GRANT ALL ON TABLE "public"."proyectos" TO "anon";
GRANT ALL ON TABLE "public"."proyectos" TO "authenticated";
GRANT ALL ON TABLE "public"."proyectos" TO "service_role";









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


