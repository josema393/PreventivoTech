import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { AuthScreen, FamilyReports, AuthorityReports, type ReportRecord } from "./SupabaseFeatures";

type Role = "family" | "authority" | "specialist";
type Page =
  | "family-home"
  | "learn"
  | "plan"
  | "family-reports"
  | "authority-reports"
  | "authority-summary"
  | "review"
  | "communications"
  | "specialist-follow"
  | "sources"
  | "analysis";
type Scenario = "example" | "variation" | "missing";
type IncidentStatus = "pending" | "in_review" | "reviewed" | "discarded";
type DemoSeverity = "high" | "medium" | "low";
type ResourceStatus = "yes" | "no" | "unknown";
type ResourceKey = "personnel" | "communications" | "vehicles" | "rescue" | "shelters" | "supplies";
type IconName =
  | "home"
  | "review"
  | "learn"
  | "plan"
  | "info"
  | "arrow"
  | "check"
  | "copy"
  | "print"
  | "trash"
  | "clock"
  | "bell"
  | "signal"
  | "close"
  | "chevron";

type Incident = {
  id: number;
  code: string;
  eventCode: string;
  source: string;
  origin: "initial" | "simulation";
  type: string;
  status: IncidentStatus;
  time: string;
  description: string;
  observation?: string;
  reviewComment?: string;
  previousValue?: string;
  newValue?: string;
  history?: string[];
  reviewer?: string;
  reviewStartedAt?: string;
  decision?: string;
  completedAt?: string;
  discardReason?: string;
  severity: DemoSeverity;
  location: string;
  infoQuality: string;
  action?: string;
  resources: Record<ResourceKey, ResourceStatus>;
};
type IncidentChanges = Partial<
  Pick<
    Incident,
    | "status"
    | "observation"
    | "reviewComment"
    | "reviewer"
    | "reviewStartedAt"
    | "decision"
    | "completedAt"
    | "discardReason"
    | "severity"
    | "location"
    | "infoQuality"
    | "action"
    | "resources"
  >
>;

type FamilyNotification = {
  id: number;
  communicationId: string;
  title: string;
  message: string;
  read: boolean;
  time: string;
  sender: string;
  recipient: string;
  availableAt: string;
  readAt?: string;
  caseRef?: string;
};

const statusLabels: Record<IncidentStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  reviewed: "Revisión culminada",
  discarded: "Descartada",
};

const initialIncidents: Incident[] = [
  {
    id: 101,
    code: "INC-101",
    eventCode: "E-101",
    source: "DEMO-01",
    origin: "initial",
    type: "Variación ficticia",
    status: "pending",
    time: "17 nov. 2026 · 10:00 h",
    description: "Cambio de demostración en la secuencia de DEMO-01.",
    observation: "Comparar con la lectura ficticia anterior.",
    previousValue: "10 mm / 1 h",
    newValue: "12 mm / 1 h",
    history: ["Creada como caso inicial de demostración."],
    severity: "high",
    location: "Laredo, Trujillo · zona conceptual A · por verificar",
    infoQuality: "Variación simulada pendiente de verificación",
    resources: {
      personnel: "yes",
      communications: "yes",
      vehicles: "unknown",
      rescue: "unknown",
      shelters: "no",
      supplies: "unknown",
    },
  },
  {
    id: 102,
    code: "INC-102",
    eventCode: "E-102",
    source: "DEMO-02",
    origin: "initial",
    type: "Pérdida de transmisión",
    status: "in_review",
    time: "16 nov. 2026 · 16:40 h",
    description: "La fuente ficticia DEMO-02 dejó de transmitir.",
    observation: "Último registro ficticio disponible a las 16:40 h.",
    previousValue: "Fuente disponible",
    newValue: "Sin transmisión",
    history: ["Creada.", "Abierta para revisión hipotética."],
    reviewer: "Autoridad de prueba",
    reviewStartedAt: "16 nov. 2026 · 16:45 h",
    severity: "medium",
    location: "Laredo, Trujillo · zona conceptual B · por verificar",
    infoQuality: "Sin transmisión; información insuficiente",
    action: "Mantener monitoreo",
    resources: {
      personnel: "unknown",
      communications: "yes",
      vehicles: "yes",
      rescue: "unknown",
      shelters: "unknown",
      supplies: "yes",
    },
  },
  {
    id: 103,
    code: "INC-103",
    eventCode: "E-103",
    source: "DEMO-03",
    origin: "initial",
    type: "Registro incompleto",
    status: "reviewed",
    time: "15 nov. 2026 · 11:20 h",
    description: "Secuencia ficticia con intervalos faltantes.",
    observation: "Se identificaron espacios sin información.",
    reviewComment: "Revisión de ejemplo completada.",
    previousValue: "Secuencia parcial",
    newValue: "Registro documentado",
    history: ["Creada.", "Marcada como revisada en datos iniciales."],
    reviewer: "Autoridad de prueba",
    reviewStartedAt: "15 nov. 2026 · 11:30 h",
    decision: "Registro documentado como secuencia incompleta de demostración.",
    completedAt: "15 nov. 2026 · 11:45 h",
    severity: "low",
    location: "Laredo, Trujillo · zona conceptual C · por verificar",
    infoQuality: "Registro incompleto con limitaciones",
    action: "Evaluar la situación",
    resources: {
      personnel: "yes",
      communications: "yes",
      vehicles: "no",
      rescue: "unknown",
      shelters: "unknown",
      supplies: "yes",
    },
  },
  {
    id: 104,
    code: "INC-104",
    eventCode: "E-104",
    source: "DEMO-01",
    origin: "initial",
    type: "Registro duplicado",
    status: "discarded",
    time: "14 nov. 2026 · 09:00 h",
    description: "Registro duplicado creado para la demostración.",
    observation: "Coincide con otro registro ficticio.",
    reviewComment: "Descartado por duplicidad simulada.",
    previousValue: "Registro original",
    newValue: "Copia identificada",
    history: ["Creada.", "Descartada con justificación de ejemplo."],
    reviewer: "Autoridad de prueba",
    discardReason: "Duplicidad confirmada dentro del conjunto de prueba.",
    severity: "low",
    location: "Laredo, Trujillo · referencia territorial general",
    infoQuality: "Duplicidad identificada en datos de prueba",
    action: "Mantener monitoreo",
    resources: {
      personnel: "unknown",
      communications: "unknown",
      vehicles: "unknown",
      rescue: "unknown",
      shelters: "unknown",
      supplies: "unknown",
    },
  },
];

// Registros exclusivamente ficticios para los accesos rápidos de la presentación.
const initialDemoReports: ReportRecord[] = [
  {
    id: "demo-001", usuario_id: "FAMILIA-DEMO", tipo: "Zona con acumulación de agua",
    descripcion: "Ejemplo ficticio: agua acumulada cerca de una vía de Laredo.",
    ubicacion: "Sector de ejemplo A, Laredo", estado: "pendiente",
    observacion_autoridad: null, creado_en: "2026-11-17T13:00:00-05:00",
  },
  {
    id: "demo-002", usuario_id: "FAMILIA-DEMO", tipo: "Problema de drenaje",
    descripcion: "Ejemplo ficticio: canal obstruido que requiere inspección.",
    ubicacion: "Sector de ejemplo B, Laredo", estado: "en_revision",
    observacion_autoridad: "Inspección simulada pendiente.", creado_en: "2026-11-17T12:00:00-05:00",
  },
];

const initialNotifications: FamilyNotification[] = [
  {
    id: 201,
    communicationId: "COM-101",
    title: "Un momento para prepararnos",
    message: "Revisa tus acuerdos familiares.",
    read: true,
    time: "Demostración · 17 nov. 2026",
    sender: "Autoridad de prueba",
    recipient: "Familia de prueba",
    availableAt: "17 nov. 2026 · 10:20 h",
    readAt: "17 nov. 2026 · 10:25 h",
    caseRef: "INC-103",
  },
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

type PlanData = {
  contact: string;
  phone: string;
  agreement: string;
  notes: string;
  checks: boolean[];
};

const initialPlan: PlanData = {
  contact: "",
  phone: "",
  agreement: "",
  notes: "",
  checks: [false, false, false, false],
};

const roleNames: Record<Role, string> = {
  family: "Familias y vecinos",
  authority: "Autoridad",
  specialist: "Especialista",
};

const navItems: Record<Role, { id: Page; label: string; icon: IconName }[]> = {
  family: [
    { id: "family-home", label: "Inicio", icon: "home" },
    { id: "learn", label: "Aprende", icon: "learn" },
    { id: "plan", label: "Mi plan", icon: "plan" },
    { id: "family-reports", label: "Reportar", icon: "review" },
  ],
  authority: [
    { id: "authority-summary", label: "Resumen", icon: "home" },
    { id: "review", label: "Incidencias demo", icon: "review" },
    { id: "authority-reports", label: "Reportes reales", icon: "review" },
    { id: "communications", label: "Comunicaciones", icon: "learn" },
  ],
  specialist: [
    { id: "specialist-follow", label: "Seguimiento", icon: "signal" },
    { id: "sources", label: "Fuentes", icon: "review" },
    { id: "analysis", label: "Análisis", icon: "plan" },
  ],
};

const preparedness = [
  "Sé dónde consultar información oficial.",
  "Conversé con mi familia sobre cómo comunicarnos.",
  "Revisamos documentos y artículos esenciales.",
  "Verificaremos procedimientos con fuentes competentes.",
];

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    review: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
        <path d="M8 11h6M11 8v6" />
      </>
    ),
    learn: (
      <>
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z" />
        <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z" />
      </>
    ),
    plan: (
      <>
        <path d="M9 5h6M9 3v4M15 3v4" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="m8 13 2 2 5-5" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="7" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    signal: (
      <>
        <path d="M4 17a11 11 0 0 1 16 0M7 14a7 7 0 0 1 10 0M10 11a3 3 0 0 1 4 0" />
        <circle cx="12" cy="18" r="1" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 42 42">
          <path d="M8 21c5-1 8-5 13-10 5 5 8 9 13 10" />
          <path d="M8 21c4 2 8 5 13 10 5-5 9-8 13-10" />
          <path d="M13 20c3 1 5 3 8 6 3-3 5-5 8-6" />
        </svg>
      </span>
      {!compact && (
        <span>
          <strong>Preventivo</strong>
          <b>Tech</b>
          <small>Prototipo académico</small>
        </span>
      )}
    </div>
  );
}

function DemoTag() {
  return (
    <span className="demo-tag">
      <span /> Demo · Datos simulados
    </span>
  );
}

function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}

function App() {
  // El rol REAL se obtiene exclusivamente de Supabase. Las vistas rápidas son demos
  // locales sin autorización de base de datos, no cambios de privilegios reales.
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const observedUserId = useRef<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [registeredRole, setRegisteredRole] = useState<Role | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [demoReports, setDemoReports] = useState<ReportRecord[]>(() => [...initialDemoReports]);
  const [userLabel, setUserLabel] = useState("");
  const [page, setPage] = useState<Page>("family-home");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [scenario, setScenario] = useState<Scenario>(() =>
    readLocal<Scenario>("preventivo-scenario", "example"),
  );
  const [incidents, setIncidents] = useState<Incident[]>(() =>
    readLocal(
      "preventivo-incidents-v2",
      initialIncidents.map((item) => ({ ...item, history: [...(item.history || [])] })),
    ),
  );
  const [selectedIncident, setSelectedIncident] = useState<number | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState(
    "Tienes un nuevo recordatorio educativo. Revisa tus acuerdos familiares.",
  );
  const [communicationShared, setCommunicationShared] = useState(() =>
    readLocal("preventivo-communication-shared", true),
  );
  const [notifications, setNotifications] = useState<FamilyNotification[]>(() =>
    readLocal(
      "preventivo-notifications",
      initialNotifications.map((item) => ({ ...item })),
    ),
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [plan, setPlan] = useState<PlanData>(initialPlan);
  const [loadedPlanFor, setLoadedPlanFor] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data.user) {
        if (!observedUserId.current) setAuthLoading(false);
      } else if (observedUserId.current !== data.user.id) {
        observedUserId.current = data.user.id;
        setAuthUserId(data.user.id);
        setAuthLoading(true);
      }
    };
    void checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user?.id ?? null;
      // TOKEN_REFRESHED / SIGNED_IN repetidos no deben mostrar un spinner infinito.
      if (observedUserId.current !== nextUser) {
        observedUserId.current = nextUser;
        setAuthUserId(nextUser);
        setRole(null);
        setRegisteredRole(null);
        setDemoMode(false);
        setRolePickerOpen(false);
        setAuthLoading(Boolean(nextUser));
      }
      if (!nextUser) {
        setReports([]);
        setAuthLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !authUserId) return;
    let active = true;
    const getProfile = async () => {
      const { data, error } = await supabase.from("perfiles")
        .select("nombre, rol").eq("id", authUserId).single();
      if (!active) return;
      if (error || !data) {
        setRole(null);
        setAuthError("No se pudo leer tu perfil. Comprueba la configuración de la base de datos y vuelve a iniciar sesión.");
        setAuthLoading(false);
        return;
      }
      const next: Role | null = data.rol === "familia" ? "family"
        : data.rol === "autoridad" ? "authority"
        : data.rol === "especialista" ? "specialist" : null;
      if (!next) {
        setAuthError("El perfil tiene un rol desconocido. Contacta al administrador.");
        setRole(null);
        setAuthLoading(false);
        return;
      }
      setRegisteredRole(next);
      setRole(next);
      setDemoMode(false);
      setUserLabel(data.nombre?.trim() || "Cuenta " + (next === "family" ? "familiar" : "del equipo"));
      setPage(next === "family" ? "family-home" : next === "authority" ? "authority-summary" : "specialist-follow");
      setAuthError("");
      setAuthLoading(false);
    };
    void getProfile();
    return () => { active = false; };
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId) {
      setPlan(initialPlan);
      setLoadedPlanFor(null);
      return;
    }
    setPlan(readLocal<PlanData>(`preventivo-family-plan-${authUserId}`, initialPlan));
    setLoadedPlanFor(authUserId);
  }, [authUserId]);

  useEffect(() => {
    if (authUserId && loadedPlanFor === authUserId) {
      localStorage.setItem(`preventivo-family-plan-${authUserId}`, JSON.stringify(plan));
    }
  }, [plan, authUserId, loadedPlanFor]);

  useEffect(() => {
    if (demoMode || !supabase || !authUserId || !role || role === "specialist") return;
    let active = true;
    setReportsLoading(true);
    const fetchReports = async () => {
      const { data, error } = await supabase.from("reportes")
        .select("id,usuario_id,tipo,descripcion,ubicacion,estado,observacion_autoridad,creado_en")
        .order("creado_en", { ascending: false });
      if (!active) return;
      setReportsLoading(false);
      if (error) { setToast(`No se pudieron cargar los reportes: ${error.message}`); return; }
      setReports((data ?? []) as ReportRecord[]);
    };
    void fetchReports();
    return () => { active = false; };
  }, [authUserId, role, demoMode]);

  const reloadReports = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("reportes")
      .select("id,usuario_id,tipo,descripcion,ubicacion,estado,observacion_autoridad,creado_en")
      .order("creado_en", { ascending: false });
    if (error) { setToast(`No se pudieron actualizar los reportes: ${error.message}`); return; }
    setReports((data ?? []) as ReportRecord[]);
  };

  const sendReport = async (input: { tipo: string; descripcion: string; ubicacion: string }) => {
    if (demoMode && role === "family") {
      const created: ReportRecord = {
        id: `demo-${Date.now()}`, usuario_id: "FAMILIA-DEMO",
        tipo: input.tipo, descripcion: input.descripcion, ubicacion: input.ubicacion,
        estado: "pendiente", observacion_autoridad: null, creado_en: new Date().toISOString(),
      };
      setDemoReports(current => [created, ...current]);
      setToast("Reporte de demostración guardado solo en esta sesión");
      return;
    }
    if (!supabase || !authUserId || role !== "family") throw new Error("Acceso no autorizado");
    const { error } = await supabase.from("reportes").insert({
      usuario_id: authUserId, tipo: input.tipo, descripcion: input.descripcion,
      ubicacion: input.ubicacion, estado: "pendiente",
    });
    if (error) throw error;
    await reloadReports();
    setToast("Reporte enviado para revisión de la autoridad");
  };

  const reviewReport = async (id: string, estado: "en_revision" | "revision_culminada", observacion_autoridad: string) => {
    if (demoMode && role === "authority") {
      setDemoReports(current => current.map(report => report.id === id ? {
        ...report, estado, observacion_autoridad: observacion_autoridad.trim() || null,
      } : report));
      setToast("Revisión simulada guardada solo en esta sesión");
      return;
    }
    if (!supabase || role !== "authority") throw new Error("Acceso no autorizado");
    const { error } = await supabase.from("reportes")
      .update({ estado, observacion_autoridad: observacion_autoridad.trim() || null, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await reloadReports();
    setToast("Estado del reporte actualizado");
  };

  const enterDemo = (next: Role) => {
    setDemoMode(true);
    setRole(next);
    setRolePickerOpen(false);
    setAuthError("");
    setAuthLoading(false);
    setPage(next === "family" ? "family-home" : next === "authority" ? "authority-summary" : "specialist-follow");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToAccount = () => {
    if (!authUserId || !registeredRole) return;
    setDemoMode(false);
    setRole(registeredRole);
    setRolePickerOpen(false);
    setPage(registeredRole === "family" ? "family-home" : registeredRole === "authority" ? "authority-summary" : "specialist-follow");
  };

  const signOut = async () => {
    // Salir de una vista demo no requiere una cuenta ni una llamada al servidor.
    if (authUserId && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) { setToast(`No se pudo cerrar la sesión: ${error.message}`); return; }
    }
    observedUserId.current = null;
    setDemoMode(false);
    setRolePickerOpen(false);
    setRegisteredRole(null);
    setAuthUserId(null);
    setRole(null);
    setReports([]);
    setUserLabel("");
  };

  useEffect(() => {
    localStorage.setItem("preventivo-incidents-v2", JSON.stringify(incidents));
  }, [incidents]);
  useEffect(() => {
    localStorage.setItem("preventivo-notifications", JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem("preventivo-scenario", JSON.stringify(scenario));
    localStorage.setItem("preventivo-communication-shared", JSON.stringify(communicationShared));
  }, [scenario, communicationShared]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = (next: Page) => {
    if (!role || !navItems[role].some((item) => item.id === next)) {
      setToast("No tienes permiso para abrir esta sección");
      return;
    }
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activateScenario = (next: Scenario) => {
    setScenario(next);
    if (next !== "example") {
      const type = next === "variation" ? "Variación simulada" : "Pérdida de datos";
      setIncidents((current) => {
        const existing = current.find((item) => item.type === type && item.origin === "simulation");
        if (existing) return current;
        return [
          ...current,
          {
            id: Date.now(),
            code: `INC-D${String(current.filter((item) => item.origin === "simulation").length + 1).padStart(2, "0")}`,
            eventCode: `E-D${String(current.filter((item) => item.origin === "simulation").length + 1).padStart(2, "0")}`,
            source: "DEMO-01",
            origin: "simulation",
            type,
            status: "pending",
            time: "17 nov. 2026 · 10:00 h · ejemplo",
            description:
              next === "variation"
                ? "Cambio ficticio en la secuencia de lecturas de demostración."
                : "La fuente simulada dejó de entregar información.",
            previousValue: next === "variation" ? "12 mm / 1 h" : "Fuente disponible",
            newValue: next === "variation" ? "22 mm / 1 h" : "Sin transmisión",
            history: ["Creada automáticamente por una simulación del especialista."],
            severity: next === "variation" ? "medium" : "low",
            location: "Laredo, Trujillo · referencia conceptual por verificar",
            infoQuality:
              next === "variation"
                ? "Cambio simulado pendiente de revisión"
                : "Sin datos suficientes para evaluar",
            resources: {
              personnel: "unknown",
              communications: "unknown",
              vehicles: "unknown",
              rescue: "unknown",
              shelters: "unknown",
              supplies: "unknown",
            },
          },
        ];
      });
      setToast(
        next === "variation" ? "Cambio simulado registrado" : "Pérdida de conexión registrada",
      );
    } else {
      setToast("Escenario de ejemplo activado");
    }
  };

  const updateIncident = (id: number, changes: IncidentChanges) => {
    setIncidents((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
              history: [
                ...(item.history || []),
                `Actualización de demostración: ${
                  changes.status
                    ? statusLabels[changes.status]
                    : changes.action
                      ? `acción registrada: ${changes.action}`
                      : changes.resources
                        ? "disponibilidad de recursos actualizada"
                        : "observación guardada"
                }.`,
              ],
            }
          : item,
      ),
    );
  };

  const copyMessage = async () => {
    const text =
      "Prepararnos también es protegernos. Conversemos en familia, revisemos artículos esenciales y consultemos siempre fuentes oficiales verificadas.";
    try {
      await navigator.clipboard.writeText(text);
      setToast("Mensaje educativo copiado");
    } catch {
      setToast("No se pudo copiar. Mantén pulsado el texto.");
    }
  };

  const clearPlan = () => {
    if (!window.confirm("¿Borrar toda la información guardada en esta ficha?")) return;
    setPlan(initialPlan);
    if (authUserId) localStorage.removeItem(`preventivo-family-plan-${authUserId}`);
    setToast("Ficha borrada de este dispositivo");
  };

  const addAnalysis = (observation: string) => {
    setIncidents((current) => [
      ...current,
      {
        id: Date.now(),
        code: `INC-D${String(incidents.filter((item) => item.origin === "simulation").length + 1).padStart(2, "0")}`,
        eventCode: `E-D${String(incidents.filter((item) => item.origin === "simulation").length + 1).padStart(2, "0")}`,
        source: "DEMO-01",
        origin: "simulation",
        type: "Observación técnica",
        status: "pending",
        time: "Ejemplo · ahora",
        description: "Observación registrada durante un análisis técnico simulado.",
        observation,
        previousValue: "Secuencia de ejemplo",
        newValue: "Observación añadida",
        history: ["Creada manualmente por el especialista."],
        severity: "low",
        location: "Laredo, Trujillo · referencia conceptual por verificar",
        infoQuality: "Observación técnica sin verificación institucional",
        resources: {
          personnel: "unknown",
          communications: "unknown",
          vehicles: "unknown",
          rescue: "unknown",
          shelters: "unknown",
          supplies: "unknown",
        },
      },
    ]);
    setToast("Incidencia interna enviada a Autoridades");
  };

  const shareCommunication = () => {
    const message =
      draft.trim() || "Tienes un nuevo recordatorio educativo. Revisa tus acuerdos familiares.";
    setNotifications((current) => [
      {
        id: Date.now(),
        communicationId: `COM-${Date.now().toString().slice(-5)}`,
        title: "Recordatorio para tu familia",
        message,
        read: false,
        time: "Demostración · ahora",
        sender: "Autoridad de prueba",
        recipient: "Familia de prueba",
        availableAt: "17 nov. 2026 · 10:30 h",
        caseRef: incidents.find((item) => item.status === "reviewed")?.code,
      },
      ...current,
    ]);
    setCommunicationShared(true);
    setToast(
      role === "family"
        ? "Nuevo recordatorio educativo"
        : "Recordatorio compartido en la demostración",
    );
  };

  const readNotification = (id: number) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true, readAt: "17 nov. 2026 · 10:35 h" } : item,
      ),
    );
  };

  const resetDemo = () => {
    if (!window.confirm("¿Reiniciar escenarios, casos, comunicaciones y notificaciones?")) return;
    setScenario("example");
    setIncidents(initialIncidents.map((item) => ({ ...item, history: [...(item.history || [])] })));
    setDraft("Tienes un nuevo recordatorio educativo. Revisa tus acuerdos familiares.");
    setCommunicationShared(true);
    setNotifications(initialNotifications.map((item) => ({ ...item })));
    setDemoReports([...initialDemoReports]);
    setSelectedIncident(null);
    setNotificationsOpen(false);
    setToast("Demostración reiniciada");
  };

  const clearDemo = () => {
    if (
      !window.confirm("¿Eliminar todos los registros técnicos y administrativos de demostración?")
    )
      return;
    setScenario("example");
    setIncidents([]);
    setCommunicationShared(false);
    setNotifications([]);
    setDemoReports([]);
    setSelectedIncident(null);
    setNotificationsOpen(false);
    setToast("Datos de demostración eliminados");
  };

  if (authLoading) {
    return <main className="access-screen auth-loading"><Logo /><p>Verificando sesión segura...</p></main>;
  }
  if (!role) {
    return <>
      <AuthScreen brand={<Logo />} configured={isSupabaseConfigured} externalError={authError}
        onReset={() => { void signOut(); }} openScope={() => setScopeOpen(true)}
        onDemoSelect={enterDemo} />
      {scopeOpen && <ScopeModal close={() => setScopeOpen(false)} />}
    </>;
  }

  const currentNav = navItems[role];

  return (
    <div className={`app-shell role-${role}`}>
      <aside className="sidebar">
        <Logo />
        <ProfileBadge role={role} change={() => setRolePickerOpen(true)} />
        <p className="nav-label">Espacio de trabajo</p>
        <nav aria-label="Navegación principal">
          {currentNav.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "review" &&
                incidents.some((i) => i.status === "pending" || i.status === "in_review") && (
                  <i>
                    {
                      incidents.filter((i) => i.status === "pending" || i.status === "in_review")
                        .length
                    }
                  </i>
                )}
            </button>
          ))}
        </nav>
        <button className="scope-link" onClick={() => setScopeOpen(true)}>
          <Icon name="info" size={18} /> Conoce el alcance
        </button>
        <button className="reset-link" onClick={resetDemo}>
          <Icon name="clock" size={17} /> Restablecer demostración
        </button>
        <button className="reset-link clear-demo-link" onClick={clearDemo}>
          <Icon name="trash" size={17} /> Limpiar datos de demostración
        </button>
        <div className="place-note">
          <span />{" "}
          <p>
            <strong>Laredo, Trujillo</strong>
            <small>Ámbito conceptual por verificar</small>
          </p>
        </div>
      </aside>

      <header className="mobile-header">
        <Logo />
        <div className="mobile-header-actions">
          {role === "family" && (
            <button
              className="notification-bell"
              aria-label="Abrir notificaciones"
              onClick={() => setNotificationsOpen(true)}
            >
              <Icon name="bell" size={20} />
              {notifications.some((item) => !item.read) && <i />}
            </button>
          )}
          <button
            className="scope-icon"
            aria-label="Ver alcance de la demostración"
            onClick={() => setScopeOpen(true)}
          >
            <Icon name="info" size={20} />
          </button>
          <button className="mobile-profile" onClick={() => setRolePickerOpen(true)}>
            <span>
              {role === "family" ? "Familia" : role === "authority" ? "Autoridad" : "Especialista"}
            </span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </header>

      <main>
        <div className="top-strip">
          <span className="active-profile">
            {demoMode ? `Modo demostración · ${roleNames[role]}` : `Sesión autenticada · ${userLabel}`}
          </span>
          <DemoTag />
          <button type="button" className="role-switch-link" onClick={() => setRolePickerOpen(true)}>Cambiar perfil (demo)</button>
          {role === "family" && (
            <button className="desktop-bell" onClick={() => setNotificationsOpen(true)}>
              <Icon name="bell" size={18} />
              Notificaciones
              {notifications.some((item) => !item.read) && <i />}
            </button>
          )}
          <button onClick={() => { void signOut(); }}>
            Cerrar sesión
          </button>
        </div>
        {page === "family-home" && (
          <FamilyHome
            plan={plan}
            navigate={navigate}
            openScope={() => setScopeOpen(true)}
            latestNotification={notifications[0]}
            openNotifications={() => setNotificationsOpen(true)}
          />
        )}
        {page === "authority-summary" && (
          <AuthoritySummary
            incidents={incidents}
            navigate={navigate}
            sharedCount={notifications.length}
            updateIncident={updateIncident}
            openIncident={(id) => {
              setSelectedIncident(id);
            }}
          />
        )}
        {page === "family-reports" && (
          <FamilyReports reports={demoMode ? demoReports : reports} loading={demoMode ? false : reportsLoading} onSubmit={sendReport} demo={demoMode} />
        )}
        {page === "authority-reports" && (
          <AuthorityReports reports={demoMode ? demoReports : reports} loading={demoMode ? false : reportsLoading} onReview={reviewReport} demo={demoMode} />
        )}
        {page === "communications" && (
          <Communications
            draft={draft}
            setDraft={(value) => {
              setDraft(value);
              setCommunicationShared(false);
            }}
            shared={communicationShared}
            share={shareCommunication}
            notify={setToast}
            notifications={notifications}
          />
        )}
        {page === "specialist-follow" && (
          <Home
            scenario={scenario}
            activateScenario={activateScenario}
            navigate={navigate}
            incidents={incidents}
          />
        )}
        {page === "sources" && (
          <Sources scenario={scenario} navigate={navigate} incidents={incidents} />
        )}
        {page === "analysis" && (
          <Analysis
            incidents={incidents}
            addAnalysis={addAnalysis}
            updateIncident={updateIncident}
            navigate={navigate}
          />
        )}
        {page === "review" && (
          <Review
            incidents={incidents}
            navigate={navigate}
            openIncident={(id) => {
              setSelectedIncident(id);
            }}
          />
        )}
        {page === "learn" && (
          <Learn
            copyMessage={copyMessage}
            navigate={navigate}
            plan={plan}
            setPlan={setPlan}
            notify={setToast}
          />
        )}
        {page === "plan" && (
          <Plan plan={plan} setPlan={setPlan} clearPlan={clearPlan} notify={setToast} />
        )}
        <footer>
          PreventivoTech · Desafío UPAO 2026{" "}
          <span>Proyecto académico, sin conexión institucional</span>
        </footer>
      </main>

      <nav className="bottom-nav" aria-label="Navegación principal">
        {currentNav.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? "active" : ""}
            onClick={() => navigate(item.id)}
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
              {item.id === "review" &&
                incidents.some((i) => i.status === "pending" || i.status === "in_review") && <i />}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {selectedIncident && (
        <IncidentModal
          incident={incidents.find((item) => item.id === selectedIncident)!}
          close={() => setSelectedIncident(null)}
          update={updateIncident}
          prepare={() => {
            setSelectedIncident(null);
            navigate("communications");
          }}
          notify={setToast}
        />
      )}
      {notificationsOpen && (
        <NotificationCenter
          notifications={notifications}
          close={() => setNotificationsOpen(false)}
          read={readNotification}
          readAll={() =>
            setNotifications((current) => current.map((item) => ({ ...item, read: true })))
          }
          openPlan={() => {
            setNotificationsOpen(false);
            navigate("plan");
          }}
        />
      )}
      {scopeOpen && <ScopeModal close={() => setScopeOpen(false)} />}
      {rolePickerOpen && (
        <div className="demo-role-overlay" role="presentation" onClick={() => setRolePickerOpen(false)}>
          <section className="demo-role-dialog" role="dialog" aria-modal="true" aria-label="Cambiar perfil de demostración" onClick={event => event.stopPropagation()}>
            <div className="demo-role-header"><h2>Cambiar perfil</h2><button type="button" onClick={() => setRolePickerOpen(false)} aria-label="Cerrar">×</button></div>
            <p>Elige qué panel quieres mostrar sin crear otra cuenta. Las vistas demo no tienen permisos sobre Supabase.</p>
            <div className="demo-quick-buttons demo-picker-buttons">
              <button type="button" onClick={() => enterDemo("family")}>Familia<span>Simulación</span></button>
              <button type="button" onClick={() => enterDemo("specialist")}>Especialista<span>Simulación</span></button>
              <button type="button" onClick={() => enterDemo("authority")}>Autoridad<span>Simulación</span></button>
            </div>
            {demoMode && registeredRole && <button className="access-switch" type="button" onClick={returnToAccount}>Volver a mi cuenta real ({roleNames[registeredRole]})</button>}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function ProfileBadge({ role, change }: { role: Role; change: () => void }) {
  return (
    <button className="profile-badge" onClick={change}>
      <span className={`profile-avatar ${role}`}>
        <Icon
          name={role === "family" ? "home" : role === "authority" ? "review" : "signal"}
          size={18}
        />
      </span>
      <span>
        <small>Perfil activo</small>
        <strong>{roleNames[role]}</strong>
      </span>
      <Icon name="chevron" size={16} />
    </button>
  );
}

function FamilyHome({
  plan,
  navigate,
  openScope,
  latestNotification,
  openNotifications,
}: {
  plan: PlanData;
  navigate: (page: Page) => void;
  openScope: () => void;
  latestNotification?: FamilyNotification;
  openNotifications: () => void;
}) {
  const completed =
    [plan.contact, plan.phone, plan.agreement, plan.notes].filter((value) => value.trim()).length +
    plan.checks.filter(Boolean).length;
  return (
    <div className="page family-page">
      <section className="family-hero">
        <p className="eyebrow light">BIENVENIDOS</p>
        <h1>Prepararnos empieza en casa.</h1>
        <p>Organiza acuerdos sencillos con tu familia.</p>
        <DemoTag />
        <div className="family-hero-art" aria-hidden="true">
          <span />
          <svg viewBox="0 0 230 160">
            <path d="m35 89 80-62 80 62" />
            <path d="M55 79v65h120V79M95 144v-42h40v42" />
            <circle cx="184" cy="39" r="22" />
          </svg>
        </div>
      </section>

      <section className="family-tip">
        <span className="tip-number">01</span>
        <div>
          <p className="eyebrow">IDEA PARA HOY</p>
          <h2>Elijan una persona de contacto</h2>
          <p>Acuerden a quién llamar y anoten sus datos también en papel.</p>
        </div>
      </section>

      <section className="plan-resume">
        <div>
          <p className="eyebrow">TU FICHA PRIVADA</p>
          <h2>{completed ? "Continúa tu plan familiar" : "Crea tu plan familiar"}</h2>
          <p>
            {completed
              ? `Has completado ${completed} de 8 pasos.`
              : "Guarda contactos, acuerdos y una lista de preparación."}
          </p>
        </div>
        <button className="primary-button" onClick={() => navigate("plan")}>
          {completed ? "Continuar plan" : "Comenzar"} <Icon name="arrow" size={18} />
        </button>
      </section>

      <div className="family-links">
        <button onClick={() => navigate("learn")}>
          <span>
            <Icon name="learn" />
          </span>
          <strong>Completa las actividades</strong>
          <p>Cuatro ejercicios breves y prácticos.</p>
          <Icon name="chevron" size={18} />
        </button>
        <button onClick={openScope}>
          <span>
            <Icon name="info" />
          </span>
          <strong>¿Dónde consultar información?</strong>
          <p>Revisa siempre los canales de autoridades competentes.</p>
          <Icon name="chevron" size={18} />
        </button>
      </div>
      {latestNotification && (
        <button
          className={`family-message ${latestNotification.read ? "read" : ""}`}
          onClick={openNotifications}
        >
          <span>
            <Icon name="bell" size={20} />
          </span>
          <span>
            <small>{latestNotification.read ? "Recordatorio" : "Nuevo recordatorio"}</small>
            <strong>{latestNotification.title}</strong>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}
      <p className="family-clarity">
        Esta vista no muestra un estado actual de seguridad o peligro porque el prototipo no está
        conectado a fuentes oficiales.
      </p>
    </div>
  );
}

function AuthoritySummary({
  incidents,
  navigate,
  sharedCount,
  openIncident,
  updateIncident,
}: {
  incidents: Incident[];
  navigate: (page: Page) => void;
  sharedCount: number;
  openIncident: (id: number) => void;
  updateIncident: (id: number, changes: IncidentChanges) => void;
}) {
  const attention = incidents.filter(
    (item) => item.status === "pending" || item.status === "in_review",
  );
  const pending = incidents.filter((item) => item.status === "pending").length;
  const reviewed = incidents.filter((item) => item.status === "reviewed").length;
  const inReview = incidents.filter((item) => item.status === "in_review").length;
  const discarded = incidents.filter((item) => item.status === "discarded").length;
  return (
    <div className="page workspace-page">
      <PageIntro eyebrow="AUTORIDAD · DEMOSTRACIÓN" title="Resumen">
        Revisa casos y prepara orientación educativa.
      </PageIntro>
      <section className="metric-band">
        <button onClick={() => navigate("review")}>
          <strong>{pending}</strong>
          <span>Pendientes</span>
          <Icon name="arrow" size={18} />
        </button>
        <button onClick={() => navigate("review")}>
          <strong>{reviewed}</strong>
          <span>Revisión culminada</span>
          <Icon name="arrow" size={18} />
        </button>
        <button onClick={() => navigate("review")}>
          <strong>{inReview}</strong>
          <span>En revisión</span>
          <Icon name="arrow" size={18} />
        </button>
        <button onClick={() => navigate("review")}>
          <strong>{discarded}</strong>
          <span>Descartados</span>
          <Icon name="arrow" size={18} />
        </button>
      </section>
      <AuthoritySituation
        incidents={incidents}
        updateIncident={updateIncident}
        openIncident={openIncident}
      />
      <div className="workspace-grid">
        <section className="activity-list">
          <div className="section-title">
            <div>
              <p className="eyebrow">PRIORIDAD</p>
              <h2>Necesita revisión</h2>
            </div>
            <span>Ejemplo</span>
          </div>
          {attention.length ? (
            attention.map((item) => (
              <button key={item.id} onClick={() => openIncident(item.id)}>
                <span className={`activity-dot ${item.status}`} />
                <span>
                  <strong>
                    {item.eventCode} · {item.type}
                  </strong>
                  <small>
                    {item.source} · {item.time} ·{" "}
                    {item.origin === "initial" ? "Ejemplo inicial" : "Creado en sesión"}
                  </small>
                </span>
                <Icon name="chevron" size={18} />
              </button>
            ))
          ) : (
            <div className="quiet-state">
              <Icon name="check" />
              <p>
                <strong>Sin actividad registrada</strong>
                <small>Activa un escenario desde el perfil Especialista.</small>
              </p>
            </div>
          )}
        </section>
        <section className="draft-preview">
          <p className="eyebrow">COMUNICACIÓN PREVENTIVA</p>
          <h2>{sharedCount ? "Recordatorio compartido" : "Borrador educativo"}</h2>
          <p>Solo actualiza la experiencia familiar de esta demostración.</p>
          <button className="text-button" onClick={() => navigate("communications")}>
            Abrir comunicaciones <Icon name="arrow" size={18} />
          </button>
        </section>
      </div>
    </div>
  );
}

function AuthoritySituation({
  incidents,
  updateIncident,
  openIncident,
}: {
  incidents: Incident[];
  updateIncident: (id: number, changes: IncidentChanges) => void;
  openIncident: (id: number) => void;
}) {
  const [level, setLevel] = useState<DemoSeverity | "all">("all");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const decisions = [
    "Coordinar con instituciones responsables",
    "Solicitar inspección en campo",
    "Evaluar la situación",
    "Evaluar la necesidad de evacuación",
    "Coordinar medidas preventivas",
    "Mantener monitoreo",
    "Otras acciones",
  ];
  const resourceLabels: Record<ResourceKey, string> = {
    personnel: "Personal de emergencia",
    communications: "Equipos de comunicación",
    vehicles: "Vehículos de apoyo",
    rescue: "Equipos de rescate",
    shelters: "Refugios temporales",
    supplies: "Suministros básicos",
  };
  const visible = incidents.filter(
    (item) =>
      (level === "all" || item.severity === level) &&
      (location === "all" || item.location === location) &&
      (status === "all" || item.status === status),
  );
  const resourceText = (resources: Incident["resources"]) => {
    const yes = Object.values(resources).filter((value) => value === "yes").length;
    const unknown = Object.values(resources).filter((value) => value === "unknown").length;
    return `${yes} disponibles · ${unknown} sin confirmar`;
  };
  return (
    <section className="authority-situation">
      <div className="situation-heading">
        <div>
          <p className="eyebrow">CLASIFICACIÓN MANUAL · DEMOSTRACIÓN</p>
          <h2>Situación y toma de decisiones</h2>
        </div>
        <span>
          <Icon name="info" size={16} /> No es una alerta oficial
        </span>
      </div>
      <div className="situation-filters">
        <label>
          Nivel
          <select value={level} onChange={(e) => setLevel(e.target.value as DemoSeverity | "all")}>
            <option value="all">Todos</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>
        <label>
          Ubicación
          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="all">Todas</option>
            {[...new Set(incidents.map((item) => item.location))].map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>
        </label>
        <label>
          Revisión
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as IncidentStatus | "all")}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_review">En revisión</option>
            <option value="reviewed">Culminada</option>
            <option value="discarded">Descartada</option>
          </select>
        </label>
      </div>
      <div className="situation-list">
        {visible.map((item) => (
          <article key={item.id} className="situation-card">
            <div className="situation-card-head">
              <span className={`severity ${item.severity}`}>
                {item.severity === "high" ? "Alta" : item.severity === "medium" ? "Media" : "Baja"}
              </span>
              <small>{item.code} · Datos simulados</small>
            </div>
            <h3>{item.type}</h3>
            <p className="situation-location">{item.location}</p>
            <p className="situation-description">{item.description}</p>
            <dl>
              <div>
                <dt>Actualización</dt>
                <dd>{item.time}</dd>
              </div>
              <div>
                <dt>Revisión</dt>
                <dd>{statusLabels[item.status]}</dd>
              </div>
              <div>
                <dt>Decisión registrada</dt>
                <dd>{item.action || "Pendiente de registrar"}</dd>
              </div>
              <div>
                <dt>Recursos</dt>
                <dd>{resourceText(item.resources)}</dd>
              </div>
              <div>
                <dt>Información</dt>
                <dd>{item.infoQuality}</dd>
              </div>
            </dl>
            <label className="decision-select">
              Tipo de decisión o acción
              <select
                value={item.action || ""}
                onChange={(e) => {
                  if (window.confirm("¿Registrar esta acción para el caso de demostración?"))
                    updateIncident(item.id, { action: e.target.value });
                }}
              >
                <option value="">Seleccionar...</option>
                {decisions.map((decision) => (
                  <option key={decision}>{decision}</option>
                ))}
              </select>
            </label>
            <details className="resource-editor">
              <summary>Recursos disponibles</summary>
              {(Object.keys(resourceLabels) as ResourceKey[]).map((key) => (
                <label key={key}>
                  <span>{resourceLabels[key]}</span>
                  <select
                    value={item.resources[key]}
                    onChange={(e) =>
                      updateIncident(item.id, {
                        resources: { ...item.resources, [key]: e.target.value as ResourceStatus },
                      })
                    }
                  >
                    <option value="unknown">Sin información</option>
                    <option value="yes">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>
              ))}
            </details>
            <button className="text-button" onClick={() => openIncident(item.id)}>
              Consultar detalles y revisión <Icon name="arrow" size={17} />
            </button>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="quiet-state">
          <Icon name="review" />
          <p>
            <strong>Sin casos para estos filtros</strong>
            <small>Ajusta los criterios para continuar.</small>
          </p>
        </div>
      )}
    </section>
  );
}

function Communications({
  draft,
  setDraft,
  shared,
  share,
  notify,
  notifications,
}: {
  draft: string;
  setDraft: (value: string) => void;
  shared: boolean;
  share: () => void;
  notify: (value: string) => void;
  notifications: FamilyNotification[];
}) {
  const reminders = [
    "Tienes un nuevo recordatorio educativo. Revisa tus acuerdos familiares.",
    "Dedica unos minutos a preparar tus documentos importantes.",
    "Recuerda consultar información únicamente en fuentes oficiales.",
  ];
  return (
    <div className="page workspace-page">
      <PageIntro eyebrow="AUTORIDAD · BORRADOR HIPOTÉTICO" title="Comunicaciones">
        Comparte recordatorios únicamente dentro del prototipo.
      </PageIntro>
      <div className="communication-layout">
        <section className="draft-editor">
          <div className="draft-head">
            <div>
              <p className="eyebrow">BORRADOR DE ORIENTACIÓN</p>
              <h2>Mensaje comunitario</h2>
            </div>
            <span className={shared ? "reviewed" : ""}>
              {shared ? "Compartida en demo" : "Borrador educativo"}
            </span>
          </div>
          <div className="reminder-options">
            {reminders.map((reminder, index) => (
              <button
                key={reminder}
                className={draft === reminder ? "active" : ""}
                onClick={() => setDraft(reminder)}
              >
                <span>
                  <Icon name="check" size={15} />
                </span>
                <b>{reminder}</b>
                <em>{index === 0 && shared ? "Compartida de ejemplo" : "Borrador editable"}</em>
              </button>
            ))}
          </div>
          <label>
            Contenido del borrador
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
          </label>
          <div className="draft-actions">
            <button
              className="secondary-button"
              onClick={() => notify("Borrador guardado en esta demostración")}
            >
              Guardar borrador
            </button>
            <button className="primary-button" onClick={share}>
              <Icon name="arrow" size={18} /> Compartir en demostración
            </button>
          </div>
        </section>
        <aside className="protocol-note">
          <span>
            <Icon name="info" />
          </span>
          <p className="eyebrow">ANTES DE COMUNICAR</p>
          <h2>No realiza envíos reales</h2>
          <p>La acción solo crea una notificación dentro de la vista familiar.</p>
          <ul>
            <li>No envía mensajes.</li>
            <li>No publica contenido.</li>
            <li>No genera alertas oficiales.</li>
          </ul>
        </aside>
      </div>
      <section className="communication-tracking">
        <div className="section-title">
          <div>
            <p className="eyebrow">SEGUIMIENTO LOCAL</p>
            <h2>Mensajes compartidos</h2>
          </div>
          <span>{notifications.length}</span>
        </div>
        {notifications.map((item) => (
          <details key={item.id}>
            <summary>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.recipient} · {item.availableAt}
                </small>
              </span>
              <b className={item.read ? "read" : ""}>
                {item.read ? "Leído" : "Disponible para la familia"}
              </b>
            </summary>
            <div className="tracking-history">
              <p>
                <span>Compartido en demostración</span>
                <strong>{item.availableAt}</strong>
              </p>
              <p>
                <span>Disponible en bandeja</span>
                <strong>{item.availableAt}</strong>
              </p>
              <p>
                <span>Lectura individual</span>
                <strong>{item.readAt || "Pendiente"}</strong>
              </p>
              <p>
                <span>Emisor</span>
                <strong>{item.sender}</strong>
              </p>
              {item.caseRef && (
                <p>
                  <span>Incidencia relacionada</span>
                  <strong>{item.caseRef}</strong>
                </p>
              )}
              <small>Seguimiento de demostración local; no representa entrega a un teléfono.</small>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

function Sources({
  scenario,
  navigate,
  incidents,
}: {
  scenario: Scenario;
  navigate: (page: Page) => void;
  incidents: Incident[];
}) {
  const [selected, setSelected] = useState("DEMO-01");
  const [full, setFull] = useState(false);
  const sources = [
    {
      id: "DEMO-01",
      name: "Pluviómetro ficticio",
      type: "Fuente automática simulada",
      description: "Proporciona lecturas simuladas de precipitación.",
      variable: "Precipitación ficticia",
      unit: "mm / 1 h",
      place: "Laredo, Trujillo",
      sector: "Sector conceptual de estudio · por verificar",
      responsible: "Equipo técnico ficticio",
      entity: "Equipo académico ficticio",
      connectivity:
        scenario === "missing" ? "Sin transmisión simulada" : "Disponible en simulación",
      quality:
        scenario === "variation"
          ? "Datos con variación documentada"
          : "Datos consistentes en prueba",
      last: "17 nov. 2026 · 10:00 h",
      review: "17 nov. 2026 · 10:15 h",
      tone: scenario === "missing" ? "missing" : "available",
      readings: "7 acumulados diarios y lecturas horarias de ejemplo",
      notes: "No existe sensor real conectado.",
    },
    {
      id: "DEMO-02",
      name: "Pluviómetro ficticio",
      type: "Fuente automática simulada",
      description: "Proporciona registros simulados de precipitación.",
      variable: "Precipitación ficticia",
      unit: "mm / 1 h",
      place: "Laredo, Trujillo",
      sector: "Referencia territorial conceptual",
      responsible: "Equipo técnico ficticio",
      entity: "Equipo académico ficticio",
      connectivity: "Transmisión interrumpida",
      quality: "Sin datos suficientes para evaluar",
      last: "16 nov. 2026 · 16:40 h",
      review: "16 nov. 2026 · 17:00 h",
      tone: "missing",
      readings: "Último registro anterior disponible",
      notes: "Interrupción creada para demostrar indisponibilidad.",
    },
    {
      id: "DEMO-03",
      name: "Registro técnico ficticio",
      type: "Fuente manual simulada",
      description: "Proporciona observaciones y registros manuales de prueba.",
      variable: "Observaciones técnicas",
      unit: "Registro descriptivo",
      place: "Laredo, Trujillo",
      sector: "Referencia territorial conceptual",
      responsible: "Equipo técnico ficticio",
      entity: "Equipo académico ficticio",
      connectivity: "Carga manual disponible",
      quality: "Datos con limitaciones",
      last: "15 nov. 2026 · 11:20 h",
      review: "15 nov. 2026 · 12:00 h",
      tone: "partial",
      readings: "Secuencia incompleta con intervalos faltantes",
      notes: "La información incompleta no se interpreta como valor cero.",
    },
  ];
  const current = sources.find((source) => source.id === selected)!;
  const related = incidents.filter((item) => item.source === current.id);
  return (
    <div className="page workspace-page">
      <PageIntro eyebrow="ESPECIALISTA · FUENTES FICTICIAS" title="Fuentes">
        Consulta identificación, calidad y trazabilidad.
      </PageIntro>
      <div className="sources-layout">
        <section className="source-list">
          {sources.map((source) => (
            <button
              key={source.id}
              className={selected === source.id ? "active" : ""}
              onClick={() => {
                setSelected(source.id);
                setFull(false);
              }}
            >
              <span className={`source-indicator ${source.tone}`} />
              <span>
                <strong>
                  {source.id} · {source.name}
                </strong>
                <small>
                  {source.connectivity} · {source.quality}
                </small>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </section>
        <section className="source-sheet">
          <div className="source-sheet-head">
            <div>
              <p className="eyebrow">FICHA DE FUENTE</p>
              <h2>{current.id}</h2>
              <small>{current.name}</small>
            </div>
            <span className={current.tone}>{current.connectivity}</span>
          </div>
          <div className="source-summary">
            <span>
              <small>Variable</small>
              <strong>{current.variable}</strong>
            </span>
            <span>
              <small>Unidad</small>
              <strong>{current.unit}</strong>
            </span>
            <span>
              <small>Calidad</small>
              <strong>{current.quality}</strong>
            </span>
          </div>
          {!full ? (
            <>
              <p className="source-description">{current.description}</p>
              <button className="primary-button" onClick={() => setFull(true)}>
                Ver ficha completa
              </button>
            </>
          ) : (
            <div className="full-source-sheet">
              <SourceSection
                title="1. Información general"
                rows={[
                  ["Identificador", current.id],
                  ["Nombre", current.name],
                  ["Tipo", current.type],
                  ["Descripción", current.description],
                  ["Variable y unidad", `${current.variable} · ${current.unit}`],
                ]}
              />
              <SourceSection
                title="2. Ubicación y responsable"
                rows={[
                  ["Referencia geográfica", current.place],
                  ["Sector", current.sector],
                  ["Coordenadas", "No disponibles · sin verificar"],
                  ["Responsable", current.responsible],
                  ["Tipo de entidad", current.entity],
                ]}
              />
              <SourceSection
                title="3. Conectividad y calidad"
                rows={[
                  ["Última lectura", current.last],
                  ["Conectividad", current.connectivity],
                  ["Última revisión técnica", current.review],
                  ["Calidad", current.quality],
                  ["Observación", current.notes],
                ]}
              />
              <section className="source-section">
                <h3>4. Historial de incidencias</h3>
                {related.length ? (
                  related.map((item) => (
                    <button
                      className="related-case"
                      key={item.id}
                      onClick={() => navigate("analysis")}
                    >
                      <span>
                        <strong>
                          {item.code} · {item.type}
                        </strong>
                        <small>
                          {item.eventCode} · {item.time}
                        </small>
                      </span>
                      <b className={item.status}>{statusLabels[item.status]}</b>
                    </button>
                  ))
                ) : (
                  <p className="source-description">
                    Sin incidencias relacionadas en este entorno.
                  </p>
                )}
                <p className="source-caution">
                  <Icon name="info" size={17} />
                  {current.readings}
                </p>
              </section>
              <button className="text-button" onClick={() => setFull(false)}>
                Ver resumen
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SourceSection({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="source-section">
      <h3>{title}</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Analysis({
  incidents,
  addAnalysis,
  updateIncident,
  navigate,
}: {
  incidents: Incident[];
  addAnalysis: (observation: string) => void;
  updateIncident: (id: number, changes: IncidentChanges) => void;
  navigate: (page: Page) => void;
}) {
  const [selected, setSelected] = useState<number | null>(incidents[0]?.id ?? null);
  const [observation, setObservation] = useState("");
  const current = incidents.find((item) => item.id === selected);
  const submit = () => {
    if (!observation.trim()) return;
    if (current) {
      updateIncident(current.id, { observation: observation.trim(), status: "pending" });
    } else {
      addAnalysis(observation.trim());
    }
    setObservation("");
  };
  return (
    <div className="page workspace-page">
      <PageIntro eyebrow="ESPECIALISTA · DATOS SIMULADOS" title="Análisis">
        Revisa eventos y añade una observación técnica.
      </PageIntro>
      <div className="analysis-layout">
        <section className="analysis-history event-list">
          <div className="section-title">
            <div>
              <p className="eyebrow">HISTORIAL TÉCNICO</p>
              <h2>Eventos</h2>
            </div>
            <span>{incidents.length}</span>
          </div>
          {incidents.length ? (
            incidents
              .slice()
              .reverse()
              .map((item) => (
                <button
                  key={item.id}
                  className={selected === item.id ? "active" : ""}
                  onClick={() => {
                    setSelected(item.id);
                    setObservation(item.observation || "");
                  }}
                >
                  <span className={`activity-dot ${item.status}`} />
                  <span>
                    <strong>{item.type}</strong>
                    <small>
                      {item.time} · {statusLabels[item.status]}
                    </small>
                  </span>
                  <Icon name="chevron" size={17} />
                </button>
              ))
          ) : (
            <div className="quiet-state">
              <Icon name="check" />
              <p>
                <strong>Sin eventos</strong>
                <small>Activa un escenario en Seguimiento.</small>
              </p>
            </div>
          )}
        </section>
        <section className="analysis-editor">
          <p className="eyebrow">DETALLE DEL EVENTO</p>
          <h2>{current ? `${current.eventCode} · ${current.type}` : "Nueva observación"}</h2>
          {current && (
            <dl className="value-change">
              <div>
                <dt>Anterior</dt>
                <dd>{current.previousValue || "—"}</dd>
              </div>
              <div>
                <dt>Nuevo</dt>
                <dd>{current.newValue || "—"}</dd>
              </div>
              <div>
                <dt>Origen</dt>
                <dd>{current.source} · ficticio</dd>
              </div>
              <div>
                <dt>Incidencia</dt>
                <dd>{current.code}</dd>
              </div>
            </dl>
          )}
          <label>
            Observación técnica
            <textarea
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Describe la variación o limitación observada..."
            />
          </label>
          <button className="primary-button" disabled={!observation.trim()} onClick={submit}>
            {current ? "Guardar y enviar a revisión" : "Crear incidencia interna"}{" "}
            <Icon name="arrow" size={18} />
          </button>
          <p className="form-hint">
            <Icon name="info" size={16} /> No calcula amenazas ni genera alertas automáticas.
          </p>
          {!!incidents.length && (
            <button
              className="text-button analysis-authority-link"
              onClick={() => navigate("review")}
            >
              Abrir revisión de autoridad <Icon name="arrow" size={18} />
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function Home({
  scenario,
  activateScenario,
  navigate,
  incidents,
}: {
  scenario: Scenario;
  activateScenario: (scenario: Scenario) => void;
  navigate: (page: Page) => void;
  incidents: Incident[];
}) {
  const [comparison, setComparison] = useState<"daily" | "weekly">("daily");
  const [selectedBar, setSelectedBar] = useState(6);
  const [startDate, setStartDate] = useState("2026-10-21");
  const [endDate, setEndDate] = useState("2026-11-17");
  const [appliedRange, setAppliedRange] = useState({ start: "2026-10-21", end: "2026-11-17" });
  const descriptions: Record<Scenario, string> = {
    example: "Muestra lecturas ficticias de referencia.",
    variation: "Modifica una medición ficticia y registra un caso para revisión.",
    missing: "Simula una interrupción de datos. No significa ausencia de peligro.",
  };
  const baseDaily = [4, 17, 8, 11, 13, 9, 12];
  const dailyValues: (number | null)[] =
    scenario === "variation"
      ? [...baseDaily.slice(0, 6), 22]
      : scenario === "missing"
        ? [...baseDaily.slice(0, 6), null]
        : baseDaily;
  const currentWeek = dailyValues.every((value) => value !== null)
    ? dailyValues.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
  const dailyData = [
    "11 nov.",
    "12 nov.",
    "13 nov.",
    "14 nov.",
    "15 nov.",
    "16 nov.",
    "17 nov.",
  ].map((label, index) => ({
    label,
    period: `${label} 2026`,
    value: dailyValues[index],
    start: `2026-11-${String(index + 11).padStart(2, "0")}`,
    end: `2026-11-${String(index + 11).padStart(2, "0")}`,
  }));
  const weeklyData = [
    {
      label: "Sem. 1",
      period: "21 – 27 oct. 2026",
      value: 42,
      start: "2026-10-21",
      end: "2026-10-27",
    },
    {
      label: "Sem. 2",
      period: "28 oct. – 3 nov. 2026",
      value: 59,
      start: "2026-10-28",
      end: "2026-11-03",
    },
    {
      label: "Sem. 3",
      period: "4 – 10 nov. 2026",
      value: 51,
      start: "2026-11-04",
      end: "2026-11-10",
    },
    {
      label: "Sem. 4",
      period: "11 – 17 nov. 2026",
      value: currentWeek,
      start: "2026-11-11",
      end: "2026-11-17",
    },
  ];
  const inRange = (item: { start: string; end: string }) =>
    item.end >= appliedRange.start && item.start <= appliedRange.end;
  const data = (comparison === "daily" ? dailyData : weeklyData).filter(inRange).map((item) => ({
    ...item,
    incomplete: appliedRange.start > item.start || appliedRange.end < item.end,
  }));
  const eventDate = (item: Incident) =>
    item.code === "INC-104"
      ? "2026-11-14"
      : item.code === "INC-103"
        ? "2026-11-15"
        : item.code === "INC-102"
          ? "2026-11-16"
          : "2026-11-17";
  const filteredEvents = incidents.filter((item) => {
    const date = eventDate(item);
    return date >= appliedRange.start && date <= appliedRange.end;
  });
  const safeIndex = data.length ? Math.min(selectedBar, data.length - 1) : 0;
  const selected = data[safeIndex];
  const max = Math.max(...data.map((item) => item.value ?? 0), 1);
  const selectComparison = (next: "daily" | "weekly") => {
    setComparison(next);
    setSelectedBar(next === "daily" ? 6 : 3);
  };
  const resetDates = () => {
    setStartDate("2026-10-21");
    setEndDate("2026-11-17");
    setAppliedRange({ start: "2026-10-21", end: "2026-11-17" });
  };

  return (
    <div className="page home-page specialist-followup">
      <PageIntro eyebrow="ESPECIALISTA · DATOS SIMULADOS" title="Seguimiento">
        Compara mediciones ficticias y documenta cambios.
      </PageIntro>

      <section className={`measurement-panel ${scenario}`}>
        <div className="measurement-main">
          <p>Precipitación simulada</p>
          <div className="measurement-value">
            <strong>
              {scenario === "missing" ? "Sin datos" : scenario === "variation" ? "22" : "12"}
            </strong>
            {scenario !== "missing" && <span>mm / 1 h</span>}
          </div>
        </div>
        <div className="measurement-meta">
          <span>
            <Icon name="clock" size={18} />
            <strong>17 nov. 2026</strong>
            <small>Fecha ficticia</small>
          </span>
          <span>
            <Icon name="clock" size={18} />
            <strong>10:00 h</strong>
            <small>Hora ficticia</small>
          </span>
          <span>
            <Icon name="signal" size={18} />
            <strong>{scenario === "missing" ? "No transmite" : "Disponible"}</strong>
            <small>Fuente DEMO-01</small>
          </span>
          <span>
            <Icon name="review" size={18} />
            <strong>{filteredEvents.length}</strong>
            <small>Eventos técnicos</small>
          </span>
        </div>
        {scenario === "missing" && (
          <p className="connection-note">
            Última lectura conocida: 12 mm / 1 h · anterior a la interrupción. La falta de datos no
            indica ausencia de peligro.
          </p>
        )}
      </section>

      <section className="scenario-section specialist-scenarios">
        <div>
          <p className="eyebrow">ESCENARIOS</p>
          <h2>Simulación de la fuente</h2>
        </div>
        <div className="scenario-tabs" role="group" aria-label="Escenarios simulados">
          <button
            className={scenario === "example" ? "active" : ""}
            onClick={() => activateScenario("example")}
          >
            Datos de ejemplo
          </button>
          <button
            className={scenario === "variation" ? "active" : ""}
            onClick={() => activateScenario("variation")}
          >
            Simular variación
          </button>
          <button
            className={scenario === "missing" ? "active" : ""}
            onClick={() => activateScenario("missing")}
          >
            Pérdida de conexión
          </button>
        </div>
        <p className="scenario-description">
          <Icon name="info" size={17} />
          {descriptions[scenario]}
        </p>
      </section>

      <section className="date-filter">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">PERIODO DE CONSULTA</p>
            <h2>Filtrar por fecha</h2>
          </div>
          <small>America/Lima</small>
        </div>
        <div className="quick-dates">
          <button
            onClick={() => {
              setStartDate("2026-11-17");
              setEndDate("2026-11-17");
            }}
          >
            Hoy
          </button>
          <button
            onClick={() => {
              setStartDate("2026-11-11");
              setEndDate("2026-11-17");
            }}
          >
            Últimos 7 días
          </button>
          <button
            onClick={() => {
              setStartDate("2026-10-19");
              setEndDate("2026-11-17");
            }}
          >
            Últimos 30 días
          </button>
        </div>
        <div className="date-fields">
          <label>
            Fecha inicial
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            Fecha final
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <div className="filter-actions">
          <button
            className="primary-button"
            disabled={!startDate || !endDate || startDate > endDate}
            onClick={() => {
              setAppliedRange({ start: startDate, end: endDate });
              setSelectedBar(0);
            }}
          >
            Aplicar filtros
          </button>
          <button className="text-button" onClick={resetDates}>
            Restablecer
          </button>
        </div>
      </section>

      <section className="comparison-section">
        <div className="comparison-head">
          <div>
            <p className="eyebrow">HISTÓRICO COMPARATIVO</p>
            <h2>Acumulados ficticios</h2>
          </div>
          <div className="comparison-toggle" role="group" aria-label="Periodo de comparación">
            <button
              className={comparison === "daily" ? "active" : ""}
              onClick={() => selectComparison("daily")}
            >
              7 días
            </button>
            <button
              className={comparison === "weekly" ? "active" : ""}
              onClick={() => selectComparison("weekly")}
            >
              4 semanas
            </button>
          </div>
        </div>
        <p className="comparison-unit">
          {comparison === "daily"
            ? "Precipitación acumulada · mm por día"
            : "Precipitación acumulada · mm por semana"}
        </p>
        {data.length ? (
          <>
            <div
              className={`bar-chart ${comparison}`}
              role="img"
              aria-label={`Gráfico de barras de acumulados ${comparison === "daily" ? "diarios" : "semanales"} simulados`}
            >
              {data.map((item, index) => (
                <button
                  key={item.label}
                  className={`${safeIndex === index ? "selected" : ""} ${item.value === null ? "missing" : ""}`}
                  onClick={() => setSelectedBar(index)}
                  aria-label={`${item.period}: ${item.value === null ? "sin información" : `${item.value} milímetros`}`}
                >
                  <span className="bar-value">{item.value === null ? "—" : item.value}</span>
                  <i
                    style={{
                      height:
                        item.value === null ? "8%" : `${Math.max(12, (item.value / max) * 100)}%`,
                    }}
                  />
                  <small>{item.label}</small>
                </button>
              ))}
            </div>
            <div className="selected-period">
              <span>
                <small>Periodo seleccionado</small>
                <strong>
                  {selected.period}
                  {selected.incomplete ? " · Periodo parcial" : ""}
                </strong>
              </span>
              <span>
                <small>Valor ficticio</small>
                <strong>
                  {selected.value === null
                    ? "Sin información"
                    : `${selected.value} ${comparison === "daily" ? "mm / día" : "mm / semana"}`}
                </strong>
              </span>
            </div>
            <p className="chart-disclaimer">
              Acumulados de demostración. No representan una tendencia real ni un nivel de peligro.
            </p>
          </>
        ) : (
          <div className="filter-empty">
            <Icon name="review" size={28} />
            <h3>No encontramos mediciones para este periodo</h3>
            <button className="secondary-button" onClick={resetDates}>
              Restablecer filtros
            </button>
          </div>
        )}
        <div className="filtered-event-list">
          <div>
            <strong>Eventos del periodo</strong>
            <span>{filteredEvents.length}</span>
          </div>
          {filteredEvents.slice(0, 3).map((item) => (
            <button key={item.id} onClick={() => navigate("analysis")}>
              <span>
                <b>{item.eventCode}</b>
                <small>
                  {item.source} · {item.type}
                </small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
          ))}
          {!filteredEvents.length && <p>Sin eventos técnicos registrados en el periodo.</p>}
        </div>
      </section>

      <section className="specialist-next">
        <div>
          <p className="eyebrow">TRAZABILIDAD</p>
          <h2>Documenta el evento</h2>
          <p>Consulta valores anteriores y añade una observación técnica.</p>
        </div>
        <button className="primary-button" onClick={() => navigate("analysis")}>
          Abrir análisis <Icon name="arrow" size={18} />
        </button>
      </section>
    </div>
  );
}

function Review({
  incidents,
  navigate,
  openIncident,
}: {
  incidents: Incident[];
  navigate: (page: Page) => void;
  openIncident: (id: number) => void;
}) {
  const [filter, setFilter] = useState<IncidentStatus | "all">("all");
  const pending = incidents.filter(
    (item) => item.status === "pending" || item.status === "in_review",
  ).length;
  const visibleIncidents =
    filter === "all" ? incidents : incidents.filter((item) => item.status === filter);
  return (
    <div className="page">
      <PageIntro eyebrow="AUTORIDAD · DEMOSTRACIÓN" title="Incidencias">
        Consulta y resuelve casos ficticios.
      </PageIntro>
      <div className="summary-line">
        <div>
          <strong>{pending}</strong>
          <span>casos por revisar</span>
        </div>
        <p>Ninguna decisión produce una alerta pública.</p>
      </div>
      <div className="case-filters" role="group" aria-label="Filtrar incidencias">
        {(
          [
            ["all", "Todas"],
            ["pending", "Pendientes"],
            ["in_review", "En revisión"],
            ["reviewed", "Culminadas"],
            ["discarded", "Descartadas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {incidents.length === 0 ? (
        <section className="empty-state">
          <div className="empty-illustration" aria-hidden="true">
            <span />
            <span />
            <i>
              <Icon name="check" size={28} />
            </i>
          </div>
          <p className="eyebrow">BANDEJA DE DEMOSTRACIÓN</p>
          <h2>Aún no hay casos ficticios</h2>
          <p>
            Activa una variación o pérdida de datos en Inicio para conocer el flujo de revisión
            humana.
          </p>
          <button className="primary-button" onClick={() => navigate("specialist-follow")}>
            Ir al seguimiento técnico <Icon name="arrow" size={18} />
          </button>
        </section>
      ) : (
        <section className="case-list">
          <div className="list-heading">
            <h2>Casos generados</h2>
            <span>{incidents.length} en total</span>
          </div>
          {visibleIncidents.map((item) => (
            <button key={item.id} className="case-row" onClick={() => openIncident(item.id)}>
              <span className={`case-icon ${item.status}`}>
                <Icon name={item.status === "reviewed" ? "check" : "review"} />
              </span>
              <span className="case-main">
                <strong>
                  {item.code} · {item.type}
                </strong>
                <small>
                  {item.source} · {item.time} ·{" "}
                  {item.origin === "initial" ? "Ejemplo inicial" : "Creado en sesión"}
                </small>
              </span>
              <span className={`case-status ${item.status}`}>{statusLabels[item.status]}</span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </section>
      )}
      <details className="safety-details">
        <summary>Alcance de esta revisión</summary>
        <p>Los casos son ficticios. Revisarlos no crea alertas, pronósticos ni publicaciones.</p>
      </details>
    </div>
  );
}

function Learn({
  copyMessage,
  navigate,
  plan,
  setPlan,
  notify,
}: {
  copyMessage: () => void;
  navigate: (page: Page) => void;
  plan: PlanData;
  setPlan: React.Dispatch<React.SetStateAction<PlanData>>;
  notify: (message: string) => void;
}) {
  const [open, setOpen] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("preventivo-activities") || "[false,false,false,false]",
      );
    } catch {
      return [false, false, false, false];
    }
  });
  const [contact, setContact] = useState(plan.contact);
  const [phone, setPhone] = useState(plan.phone);
  const essentials = [
    "Documentos importantes",
    "Agua",
    "Linterna",
    "Medicamentos personales",
    "Contactos escritos en papel",
  ];
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false, false]);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [customChecked, setCustomChecked] = useState<boolean[]>([]);
  const [custom, setCustom] = useState("");
  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState<"a" | "b" | null>(null);
  const [offline, setOffline] = useState([false, false, false]);
  useEffect(() => {
    localStorage.setItem("preventivo-activities", JSON.stringify(completed));
  }, [completed]);
  const complete = (index: number) =>
    setCompleted((current) => current.map((value, i) => (i === index ? true : value)));
  const addContact = () => {
    if (!contact.trim()) {
      notify("Escribe un nombre o referencia");
      return;
    }
    setPlan((current) => ({ ...current, contact: contact.trim(), phone: phone.trim() }));
    complete(0);
    notify("Contacto agregado a Mi plan");
  };
  const questions = [
    [
      "Un mensaje reenviado sin fuente identificada",
      "Una publicación verificable de una entidad competente",
    ],
    ["Una captura sin fecha ni autor", "Información que puede comprobarse en un canal oficial"],
  ];
  return (
    <div className="page learn-page activities-page">
      <PageIntro eyebrow="FAMILIA · ACTIVIDADES BREVES" title="Aprende haciendo">
        Cuatro actividades para completar a tu ritmo.
      </PageIntro>
      <div className="activity-progress">
        <span>
          <strong>{completed.filter(Boolean).length}</strong> de 4 actividades realizadas
        </span>
        <div>
          <i style={{ width: `${completed.filter(Boolean).length * 25}%` }} />
        </div>
      </div>
      <section className="micro-activities">
        <article className={open === 0 ? "open" : ""}>
          <button className="activity-heading" onClick={() => setOpen(open === 0 ? -1 : 0)}>
            <span className={completed[0] ? "done" : ""}>
              {completed[0] ? <Icon name="check" size={17} /> : "01"}
            </span>
            <div>
              <small>Contacto familiar</small>
              <strong>¿Con quién nos comunicamos?</strong>
            </div>
            <i>+</i>
          </button>
          {open === 0 && (
            <div className="activity-body">
              <div className="short-fields">
                <label>
                  Nombre o referencia
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Ej. Tía Rosa"
                  />
                </label>
                <label>
                  Número opcional
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="Número de contacto"
                  />
                </label>
              </div>
              <button className="primary-button" onClick={addContact}>
                Agregar a mi plan
              </button>
              <p className="privacy-line">Se guarda solo en este dispositivo.</p>
            </div>
          )}
        </article>
        <article className={open === 1 ? "open" : ""}>
          <button className="activity-heading" onClick={() => setOpen(open === 1 ? -1 : 1)}>
            <span className={completed[1] ? "done" : ""}>
              {completed[1] ? <Icon name="check" size={17} /> : "02"}
            </span>
            <div>
              <small>Lista práctica</small>
              <strong>¿Qué tenemos preparado?</strong>
            </div>
            <i>+</i>
          </button>
          {open === 1 && (
            <div className="activity-body">
              <p className="activity-counter">
                {checked.filter(Boolean).length + customChecked.filter(Boolean).length} de{" "}
                {essentials.length + customItems.length} marcados
              </p>
              <div className="mini-checklist">
                {essentials.map((item, index) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={checked[index]}
                      onChange={(e) =>
                        setChecked((current) =>
                          current.map((value, i) => (i === index ? e.target.checked : value)),
                        )
                      }
                    />
                    <span>
                      <Icon name="check" size={15} />
                    </span>
                    {item}
                  </label>
                ))}
                {customItems.map((item, index) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={customChecked[index]}
                      onChange={(e) =>
                        setCustomChecked((current) =>
                          current.map((value, i) => (i === index ? e.target.checked : value)),
                        )
                      }
                    />
                    <span>
                      <Icon name="check" size={15} />
                    </span>
                    {item}
                  </label>
                ))}
              </div>
              <div className="add-item">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Agregar otro elemento"
                />
                <button
                  onClick={() => {
                    if (custom.trim()) {
                      setCustomItems((current) => [...current, custom.trim()]);
                      setCustomChecked((current) => [...current, false]);
                      setCustom("");
                    }
                  }}
                >
                  Agregar
                </button>
              </div>
              <button className="secondary-button" onClick={() => complete(1)}>
                Completar actividad
              </button>
            </div>
          )}
        </article>
        <article className={open === 2 ? "open" : ""}>
          <button className="activity-heading" onClick={() => setOpen(open === 2 ? -1 : 2)}>
            <span className={completed[2] ? "done" : ""}>
              {completed[2] ? <Icon name="check" size={17} /> : "03"}
            </span>
            <div>
              <small>Fuentes confiables</small>
              <strong>¿En cuál confiarías?</strong>
            </div>
            <i>+</i>
          </button>
          {open === 2 && (
            <div className="activity-body trust-activity">
              <button className={answer === "a" ? "selected" : ""} onClick={() => setAnswer("a")}>
                <b>A</b>
                {questions[question][0]}
              </button>
              <button
                className={answer === "b" ? "selected correct" : ""}
                onClick={() => {
                  setAnswer("b");
                  complete(2);
                }}
              >
                <b>B</b>
                {questions[question][1]}
              </button>
              {answer && (
                <div className={`answer-feedback ${answer === "b" ? "correct" : ""}`}>
                  <strong>{answer === "b" ? "Buena elección" : "Conviene comprobarlo"}</strong>
                  <p>Una fuente identificable permite verificar el origen y el contexto.</p>
                </div>
              )}
              <button
                className="text-button"
                onClick={() => {
                  setQuestion((question + 1) % 2);
                  setAnswer(null);
                }}
              >
                Probar otra pregunta <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
        </article>
        <article className={open === 3 ? "open" : ""}>
          <button className="activity-heading" onClick={() => setOpen(open === 3 ? -1 : 3)}>
            <span className={completed[3] ? "done" : ""}>
              {completed[3] ? <Icon name="check" size={17} /> : "04"}
            </span>
            <div>
              <small>Sin conexión</small>
              <strong>¿Y si perdemos internet?</strong>
            </div>
            <i>+</i>
          </button>
          {open === 3 && (
            <div className="activity-body">
              <div className="mini-checklist">
                {[
                  "Guardar contactos en papel",
                  "Imprimir el plan familiar",
                  "Identificar canales oficiales alternativos",
                ].map((item, index) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={offline[index]}
                      onChange={(e) =>
                        setOffline((current) =>
                          current.map((value, i) => (i === index ? e.target.checked : value)),
                        )
                      }
                    />
                    <span>
                      <Icon name="check" size={15} />
                    </span>
                    {item}
                  </label>
                ))}
              </div>
              <div className="activity-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    navigate("plan");
                    window.setTimeout(() => window.print(), 300);
                  }}
                >
                  <Icon name="print" size={17} /> Abrir e imprimir plan
                </button>
                <button className="primary-button" onClick={() => complete(3)}>
                  Completar
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
      <div className="activities-footer">
        <button className="text-button" onClick={copyMessage}>
          <Icon name="copy" size={17} /> Copiar recordatorio
        </button>
        <button className="wide-cta" onClick={() => navigate("plan")}>
          <span>
            <small>Siguiente paso</small>Continuar con Mi plan
          </span>
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

function Plan({
  plan,
  setPlan,
  clearPlan,
  notify,
}: {
  plan: PlanData;
  setPlan: React.Dispatch<React.SetStateAction<PlanData>>;
  clearPlan: () => void;
  notify: (message: string) => void;
}) {
  const fields = [plan.contact, plan.phone, plan.agreement, plan.notes];
  const completed =
    fields.filter((value) => value.trim()).length + plan.checks.filter(Boolean).length;
  const progress = Math.round((completed / 8) * 100);
  const update = (key: keyof PlanData, value: string) =>
    setPlan((current) => ({ ...current, [key]: value }));

  return (
    <div className="page plan-page">
      <PageIntro eyebrow="PREPARACIÓN EN EL HOGAR" title="Mi plan familiar">
        Una ficha sencilla para conversar, completar juntos e imprimir.
      </PageIntro>
      <section className="progress-block">
        <div className="progress-label">
          <span>
            <strong>{progress}%</strong> de la ficha completada
          </span>
          <small>No mide tu nivel de seguridad</small>
        </div>
        <div className="progress-track">
          <i style={{ width: `${progress}%` }} />
        </div>
      </section>

      <div className="plan-layout">
        <form className="plan-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-intro">
            <p className="eyebrow">ACUERDOS FAMILIARES</p>
            <h2>Organicemos lo esencial</h2>
            <p>La información se guarda únicamente en este navegador.</p>
          </div>
          <div className="field-row">
            <label>
              Persona de contacto
              <input
                value={plan.contact}
                onChange={(e) => update("contact", e.target.value)}
                placeholder="Nombre o referencia familiar"
                autoComplete="name"
              />
            </label>
            <label>
              Teléfono de contacto
              <input
                value={plan.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="Número para el ejercicio"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>
          <label>
            Acuerdo familiar de comunicación
            <textarea
              value={plan.agreement}
              onChange={(e) => update("agreement", e.target.value)}
              placeholder="¿Cómo nos comunicaremos si falla internet?"
            />
          </label>
          <label>
            Notas sobre procedimientos oficiales verificados
            <textarea
              value={plan.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anota solo procedimientos confirmados con fuentes competentes"
            />
          </label>

          <fieldset>
            <legend>Lista de preparación</legend>
            {preparedness.map((item, index) => (
              <label className="check-row" key={item}>
                <input
                  type="checkbox"
                  checked={plan.checks[index]}
                  onChange={(e) =>
                    setPlan((current) => ({
                      ...current,
                      checks: current.checks.map((value, i) =>
                        i === index ? e.target.checked : value,
                      ),
                    }))
                  }
                />
                <span>
                  <Icon name="check" size={16} />
                </span>
                {item}
              </label>
            ))}
          </fieldset>
          <div className="form-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => notify("Plan guardado en este dispositivo")}
            >
              <Icon name="check" size={18} /> Guardar plan
            </button>
            <button className="primary-button" type="button" onClick={() => window.print()}>
              <Icon name="print" size={18} /> Imprimir o guardar
            </button>
            <button className="danger-button" type="button" onClick={clearPlan}>
              <Icon name="trash" size={18} /> Limpiar ficha
            </button>
          </div>
        </form>

        <aside className="offline-note">
          <div className="offline-art" aria-hidden="true">
            <span>
              <Icon name="signal" size={30} />
            </span>
            <i />
          </div>
          <p className="eyebrow">PENSADO PARA FALLAS DE CONEXIÓN</p>
          <h2>¿Y si no tengo internet?</h2>
          <p>
            Imprime esta ficha y conserva los acuerdos familiares en un lugar fácil de recordar.
          </p>
          <ol>
            <li>
              <span>1</span>Guarda un contacto acordado.
            </li>
            <li>
              <span>2</span>Consulta medios oficiales previamente validados.
            </li>
            <li>
              <span>3</span>Sigue instrucciones de autoridades competentes.
            </li>
          </ol>
          <div className="local-note">
            <Icon name="info" size={18} />
            Tus datos no se envían a servidores. Puedes borrarlos con “Limpiar ficha”.
          </div>
        </aside>
      </div>
    </div>
  );
}

function IncidentModal({
  incident,
  close,
  update,
  prepare,
  notify,
}: {
  incident: Incident;
  close: () => void;
  update: (id: number, changes: IncidentChanges) => void;
  prepare: () => void;
  notify: (message: string) => void;
}) {
  const [comment, setComment] = useState(incident.reviewComment || "");
  const [decision, setDecision] = useState(incident.decision || "");
  const startReview = () => {
    if (!window.confirm("¿Iniciar la revisión hipotética de este caso?")) return;
    update(incident.id, {
      status: "in_review",
      reviewer: "Autoridad de prueba",
      reviewStartedAt: "17 nov. 2026 · 10:40 h",
    });
    notify("Revisión iniciada");
  };
  const completeReview = () => {
    if (!decision.trim()) {
      notify("Registra una conclusión antes de culminar");
      return;
    }
    if (!window.confirm("¿Culminar la revisión con esta conclusión?")) return;
    update(incident.id, {
      status: "reviewed",
      reviewComment: comment.trim(),
      decision: decision.trim(),
      completedAt: "17 nov. 2026 · 10:50 h",
      reviewer: "Autoridad de prueba",
    });
    notify("Revisión culminada");
    close();
  };
  const discard = () => {
    if (!comment.trim()) {
      notify("Añade una justificación para descartar");
      return;
    }
    if (!window.confirm("¿Descartar este caso dentro de la demostración?")) return;
    update(incident.id, {
      status: "discarded",
      discardReason: comment.trim(),
      reviewComment: comment.trim(),
      reviewer: "Autoridad de prueba",
    });
    notify("Caso descartado");
    close();
  };
  const reopen = () => {
    if (!comment.trim()) {
      notify("Escribe una justificación para reabrir");
      return;
    }
    if (!window.confirm("¿Reabrir este caso para una nueva revisión?")) return;
    update(incident.id, {
      status: "in_review",
      reviewComment: comment.trim(),
      reviewStartedAt: "17 nov. 2026 · 11:00 h",
      reviewer: "Autoridad de prueba",
    });
    notify("Caso reabierto");
    close();
  };
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.currentTarget === e.target && close()}
    >
      <section
        className="modal incident-workflow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
      >
        <button className="modal-close" onClick={close} aria-label="Cerrar">
          <Icon name="close" />
        </button>
        <span className={`modal-icon ${incident.status}`}>
          <Icon name={incident.status === "reviewed" ? "check" : "review"} size={28} />
        </span>
        <p className="eyebrow">
          {incident.code} · {incident.eventCode}
        </p>
        <h2 id="case-title">{incident.type}</h2>
        <span className={`case-status ${incident.status}`}>{statusLabels[incident.status]}</span>
        <p>{incident.description}</p>
        {incident.observation && (
          <div className="case-observation">
            <small>Observación del especialista</small>
            <p>{incident.observation}</p>
          </div>
        )}
        <dl>
          <div>
            <dt>Fuente</dt>
            <dd>{incident.source}</dd>
          </div>
          <div>
            <dt>Creación</dt>
            <dd>{incident.time}</dd>
          </div>
          {incident.reviewer && (
            <div>
              <dt>Responsable</dt>
              <dd>{incident.reviewer}</dd>
            </div>
          )}
          {incident.reviewStartedAt && (
            <div>
              <dt>Inicio de revisión</dt>
              <dd>{incident.reviewStartedAt}</dd>
            </div>
          )}
          {incident.completedAt && (
            <div>
              <dt>Culminación</dt>
              <dd>{incident.completedAt}</dd>
            </div>
          )}
        </dl>
        <details className="technical-details">
          <summary>Consultar información técnica</summary>
          <dl>
            <div>
              <dt>Valor anterior</dt>
              <dd>{incident.previousValue || "—"}</dd>
            </div>
            <div>
              <dt>Valor nuevo</dt>
              <dd>{incident.newValue || "—"}</dd>
            </div>
          </dl>
        </details>
        {incident.status === "reviewed" && (
          <div className="review-result">
            <small>Resultado documentado</small>
            <p>{incident.decision}</p>
          </div>
        )}
        {incident.status === "discarded" && (
          <div className="review-result discarded">
            <small>Motivo del descarte</small>
            <p>{incident.discardReason || incident.reviewComment}</p>
          </div>
        )}
        <details className="technical-details">
          <summary>Historial de acciones</summary>
          <ol className="case-history">
            {(incident.history || []).map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ol>
        </details>
        {incident.status === "pending" && (
          <div className="workflow-actions">
            <button className="primary-button full" onClick={startReview}>
              Iniciar revisión
            </button>
          </div>
        )}
        {incident.status === "in_review" && (
          <div className="review-form">
            <label>
              Observaciones de revisión
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Añade observaciones..."
              />
            </label>
            <label>
              Conclusión obligatoria
              <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                placeholder="Documenta la decisión antes de culminar..."
              />
            </label>
            <div className="workflow-actions">
              <button className="primary-button" onClick={completeReview}>
                <Icon name="check" size={17} /> Culminar revisión
              </button>
              <button className="danger-button" onClick={discard}>
                Descartar
              </button>
            </div>
          </div>
        )}
        {incident.status === "pending" && (
          <div className="review-form">
            <label>
              Justificación para descartar
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Obligatoria para descartar..."
              />
            </label>
            <button className="danger-button" onClick={discard}>
              Descartar justificadamente
            </button>
          </div>
        )}
        {incident.status === "discarded" && (
          <div className="review-form">
            <label>
              Justificación para reabrir
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explica por qué debe reabrirse..."
              />
            </label>
            <button className="primary-button full" onClick={reopen}>
              Reabrir caso
            </button>
          </div>
        )}
        <div className="modal-warning">
          <Icon name="info" size={18} /> Culminar una revisión no emite alertas ni comparte
          mensajes.
        </div>
        <button className="secondary-button full" onClick={prepare}>
          Preparar orientación por separado
        </button>
      </section>
    </div>
  );
}

function NotificationCenter({
  notifications,
  close,
  read,
  readAll,
  openPlan,
}: {
  notifications: FamilyNotification[];
  close: () => void;
  read: (id: number) => void;
  readAll: () => void;
  openPlan: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <div
      className="modal-backdrop notification-backdrop"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && close()}
    >
      <section
        className="notification-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
      >
        <div className="notification-head">
          <div>
            <p className="eyebrow">FAMILIA · DEMOSTRACIÓN</p>
            <h2 id="notifications-title">Notificaciones</h2>
          </div>
          <button onClick={close} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        {!!notifications.length && (
          <button className="read-all" onClick={readAll}>
            Marcar todas como leídas
          </button>
        )}
        {!notifications.length ? (
          <div className="notification-empty">
            <span>
              <Icon name="bell" />
            </span>
            <h3>Todo al día</h3>
            <p>Los recordatorios educativos compartidos aparecerán aquí.</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((item) => (
              <article key={item.id} className={item.read ? "read" : ""}>
                <button
                  onClick={() => {
                    read(item.id);
                    setOpenId(openId === item.id ? null : item.id);
                  }}
                >
                  <i />
                  <span>
                    <small>{item.time}</small>
                    <strong>{item.title}</strong>
                    <small>{item.sender}</small>
                  </span>
                  <Icon name="chevron" size={17} />
                </button>
                {openId === item.id && (
                  <div className="notification-body">
                    <p>{item.message}</p>
                    <span>Orientación educativa · No es una alerta</span>
                    <button className="primary-button" onClick={openPlan}>
                      Ver mi plan
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ScopeModal({ close }: { close: () => void }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.currentTarget === e.target && close()}
    >
      <section
        className="modal scope-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scope-title"
      >
        <button className="modal-close" onClick={close} aria-label="Cerrar">
          <Icon name="close" />
        </button>
        <Logo compact />
        <p className="eyebrow">ALCANCE DEL PROYECTO</p>
        <h2 id="scope-title">Un ejercicio académico, no un sistema de alerta</h2>
        <p>
          PreventivoTech es una propuesta del Desafío UPAO 2026 para explorar seguimiento
          preventivo, revisión humana y preparación familiar.
        </p>
        <ul>
          <li>
            <Icon name="check" size={17} /> Todas las lecturas e incidencias son simuladas.
          </li>
          <li>
            <Icon name="check" size={17} /> No existe conexión con sensores o instituciones.
          </li>
          <li>
            <Icon name="check" size={17} /> No emite pronósticos ni alertas oficiales.
          </li>
          <li>
            <Icon name="check" size={17} /> Laredo Alto / San Carlos está por verificar.
          </li>
        </ul>
        <button className="primary-button full" onClick={close}>
          Entendido
        </button>
      </section>
    </div>
  );
}

export default App;
