-- Diagnóstico opcional en SQL Editor. Solo lectura; no modifica tablas ni usuarios.
-- Comprueba que exista un trigger de creación de perfil al insertar en auth.users.
select t.tgname, pg_get_triggerdef(t.oid) as definicion,
       p.proname, p.prosecdef as security_definer, p.proconfig,
       pg_get_functiondef(p.oid) as funcion
from pg_trigger t join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;

-- Revisar que el perfil se asigne como familia en el servidor, sin confiar en un rol del navegador.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('perfiles', 'reportes')
order by table_name, ordinal_position;

select c.relname, c.relrowsecurity as rls_activa
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('perfiles', 'reportes');

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('perfiles', 'reportes')
order by tablename, policyname;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public' and routine_name = 'es_autoridad';
