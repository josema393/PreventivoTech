-- EJECUTAR UNA SOLA VEZ EN SUPABASE > SQL EDITOR, DESPUÉS DEL SQL INICIAL.
-- Limita la consulta global de reportes solo a autoridad (no especialista).
-- Las familias ven únicamente los reportes de su usuario.
drop policy if exists reportes_leer on public.reportes;
create policy reportes_leer on public.reportes
  for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_autoridad()));
