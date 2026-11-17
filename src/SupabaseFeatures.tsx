import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "./supabaseClient";

export type ReportRecord = {
  id: string;
  usuario_id: string;
  tipo: string;
  descripcion: string;
  ubicacion: string;
  estado: "pendiente" | "en_revision" | "revision_culminada";
  observacion_autoridad: string | null;
  creado_en: string;
};

export function AuthScreen({ brand, configured, externalError, openScope, onReset, onDemoSelect }: {
  brand: ReactNode; configured: boolean; externalError: string;
  openScope: () => void; onReset: () => void;
  onDemoSelect: (role: "family" | "specialist" | "authority") => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") {
        if (!name.trim()) throw new Error("Escribe tu nombre.");
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { nombre: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Revisa tu correo y confirma tu cuenta. Luego inicia sesión. Tu rol inicial será familia.");
        } else {
          setMessage("Cuenta familiar creada. Ingresando...");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error de autenticación.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="access-screen demo-welcome">
    <header className="access-header">{brand}<span className="demo-mode-tag">Prototipo académico</span></header>
    <div className="access-layout">
      <section className="access-intro"><p className="eyebrow light">PREVENTIVOTECH</p>
        <h1>Información clara para prepararnos.</h1>
        <p>Laredo, Trujillo · Plataforma preventiva académica</p>
      </section>
      <section className="access-panel">
        <span className="demo-mode-tag">Acceso por roles</span>
        <h2>{mode === "login" ? "Iniciar sesión" : "Crear cuenta familiar"}</h2>
        <p className="access-summary">El registro familiar sigue conectado a Supabase. Para presentar la aplicación, puedes recorrer los tres paneles sin crear cuentas adicionales.</p>
        <div className="demo-quick-access" aria-label="Entrar en modo demostración">
          <strong>Acceso rápido para la presentación</strong>
          <div className="demo-quick-buttons">
            <button type="button" onClick={() => onDemoSelect("family")}>Familia<span>Vista de ejemplo</span></button>
            <button type="button" onClick={() => onDemoSelect("specialist")}>Especialista<span>Vista de ejemplo</span></button>
            <button type="button" onClick={() => onDemoSelect("authority")}>Autoridad<span>Vista de ejemplo</span></button>
          </div>
          <small>Modo demostración: sin inicio de sesión, sin permisos administrativos ni acceso a los reportes reales de Supabase.</small>
        </div>
        <p className="account-access-label">O inicia sesión con tu cuenta familiar</p>
        {!configured ? <p className="auth-error" role="alert">Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Consulta README.md.</p>
          : <form onSubmit={(e) => { void submit(e); }}>
            {mode === "register" && <label>Nombre completo<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={120} /></label>}
            <label>Correo electrónico<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>Contraseña<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></label>
            {(error || externalError) && <p className="auth-error" role="alert">{error || externalError}</p>}
            {message && <p className="auth-success" role="status">{message}</p>}
            <button className="primary-button full" type="submit" disabled={busy}>{busy ? "Procesando..." : mode === "login" ? "Ingresar" : "Registrarme"}</button>
          </form>}
        {externalError && <button className="access-switch" onClick={onReset}>Cerrar sesión y volver a intentar</button>}
        <button className="access-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); }}>
          {mode === "login" ? "¿No tienes cuenta? Regístrate como familia" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
        <p className="simulated-access">El acceso real de especialista y autoridad requiere autorización en Supabase. Los accesos rápidos son solo vistas de demostración; las lecturas y alertas son simuladas.</p>
        <button className="welcome-scope" onClick={openScope}>Conoce el alcance del proyecto</button>
      </section>
    </div>
  </main>;
}

export function FamilyReports({ reports, loading, onSubmit, demo = false }: {
  reports: ReportRecord[];
  loading: boolean;
  demo?: boolean;
  onSubmit: (data: {tipo: string; descripcion: string; ubicacion: string}) => Promise<void>;
}) {
  const [tipo, setTipo] = useState("Zona con acumulación de agua");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await onSubmit({ tipo, ubicacion: ubicacion.trim(), descripcion: descripcion.trim() });
      setDescripcion(""); setUbicacion(""); setSuccess("Reporte registrado. Una autoridad podrá revisarlo.");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo enviar el reporte"); }
    finally { setSaving(false); }
  };
  return <div className="page online-reports">
    <header className="page-intro"><p className="eyebrow">{demo ? "FAMILIA · DEMOSTRACIÓN" : "FAMILIA · SUPABASE"}</p><h1>Reportar una situación</h1>
      <p>{demo ? "Ejemplo interactivo: los reportes se guardan solo mientras esta vista está abierta, nunca en Supabase." : "Envía observaciones locales para revisión humana. Esto no genera una alerta oficial ni pide evacuación."}</p></header>
    <section className="online-card"><h2>Nuevo reporte</h2><form onSubmit={e => { void submit(e); }}>
      <label>Tipo de situación<select value={tipo} onChange={e => setTipo(e.target.value)}>
        <option>Zona con acumulación de agua</option><option>Problema de drenaje</option>
        <option>Deslizamiento o erosión observada</option><option>Otra observación preventiva</option>
      </select></label>
      <label>Ubicación o referencia<input value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej.: calle, sector o punto de referencia" required maxLength={180} /></label>
      <label>Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Describe qué observaste, sin compartir datos sensibles." required minLength={10} maxLength={3000} rows={4}/></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {success && <p className="auth-success" role="status">{success}</p>}
      <button type="submit" className="primary-button" disabled={saving}>{saving ? "Enviando..." : "Enviar reporte"}</button>
    </form></section>
    <section className="online-card"><h2>Mis reportes</h2>
      {loading ? <p>Cargando...</p> : reports.length === 0 ? <p>Todavía no enviaste reportes.</p> :
        <div className="online-records">{reports.map(r => <article key={r.id}>
          <strong>{r.tipo}</strong><span className="report-state">{reportState(r.estado)}</span>
          <p>{r.descripcion}</p><small>{r.ubicacion} · {formatDate(r.creado_en)}</small>
          {r.observacion_autoridad && <p className="review-note">Observación: {r.observacion_autoridad}</p>}
        </article>)}</div>}
    </section>
  </div>;
}

export function AuthorityReports({ reports, loading, onReview, demo = false }: {
  reports: ReportRecord[];
  loading: boolean;
  demo?: boolean;
  onReview: (id: string, estado: "en_revision" | "revision_culminada", comentario: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? reports : reports.filter(r => r.estado === filter);
  const update = async (id: string, estado: "en_revision" | "revision_culminada", comentario: string) => {
    setSaving(id); setError("");
    try { await onReview(id, estado, comentario); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar"); }
    finally { setSaving(null); }
  };
  return <div className="page online-reports">
    <header className="page-intro"><p className="eyebrow">{demo ? "AUTORIDAD · DEMOSTRACIÓN" : "AUTORIDAD · DATOS REGISTRADOS"}</p><h1>Reportes de familias</h1>
      <p>{demo ? "Reportes ficticios para practicar la revisión. No se consultan ni modifican datos reales de Supabase." : "Reportes enviados a Supabase para revisión. No equivalen a alertas ni órdenes oficiales."}</p></header>
    <section className="online-card"><div className="online-filter"><strong>{reports.length} reportes</strong>
      <select aria-label="Filtrar estado" value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">Todos</option><option value="pendiente">Pendientes</option>
        <option value="en_revision">En revisión</option><option value="revision_culminada">Revisión culminada</option>
      </select></div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loading ? <p>Cargando...</p> : shown.length === 0 ? <p>No hay reportes para este filtro.</p> :
        <div className="online-records">{shown.map(r => <AuthorityReportItem key={r.id} report={r} busy={saving === r.id} update={update}/>)}</div>}
    </section>
  </div>;
}

function AuthorityReportItem({ report, busy, update }: {
  report: ReportRecord; busy: boolean;
  update: (id: string, status: "en_revision" | "revision_culminada", comment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState(report.observacion_autoridad ?? "");
  return <article>
    <strong>{report.tipo}</strong><span className="report-state">{reportState(report.estado)}</span>
    <p>{report.descripcion}</p><small>{report.ubicacion} · {formatDate(report.creado_en)} · usuario: {report.usuario_id.slice(0, 8)}…</small>
    <label>Observación de autoridad<textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Justifica la revisión" /></label>
    <div className="report-actions">
      <button disabled={busy} onClick={() => { void update(report.id, "en_revision", comment); }}>Marcar en revisión</button>
      <button disabled={busy} className="primary-button" onClick={() => { void update(report.id, "revision_culminada", comment); }}>Culminar revisión</button>
    </div>
  </article>;
}

function reportState(state: ReportRecord["estado"]) {
  return state === "en_revision" ? "En revisión" : state === "revision_culminada" ? "Revisión culminada" : "Pendiente";
}
function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}
