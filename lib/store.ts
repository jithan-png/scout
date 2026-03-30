import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Opportunity, Alert, AgentUpdate, DataConnection, SearchIntent, User, ScoutOpportunity } from "./types";
import {
  MOCK_OPPORTUNITIES,
  MOCK_ALERTS,
  MOCK_AGENT_UPDATES,
  MOCK_DATA_CONNECTIONS,
  MOCK_SEARCH_INTENTS,
} from "./mock-data";

// ── Setup wizard state ──────────────────────────────────────────────────────

export type SetupStep =
  | "what_you_sell"
  | "where_you_operate"
  | "project_types"
  | "whatsapp"
  | "contacts"
  | "email";

interface SetupState {
  currentStep: SetupStep;
  completed: boolean;
  whatISell: string[];
  whereIOperate: string[];
  projectTypes: string[];
  whatsappConnected: boolean;
  contactsConnected: boolean;
  emailConnected: boolean;
}

// ── App store ───────────────────────────────────────────────────────────────

interface AppStore {
  // User
  user: User | null;
  setUser: (user: User) => void;
  whatsappPhone: string | null;
  setWhatsappPhone: (phone: string) => void;

  // Setup
  setup: SetupState;
  setSetupStep: (step: SetupStep) => void;
  completeSetup: () => void;
  toggleWhatISell: (item: string) => void;
  toggleWhereIOperate: (city: string) => void;
  toggleProjectType: (type: string) => void;
  setWhatsappConnected: (v: boolean) => void;
  setContactsConnected: (v: boolean) => void;
  setEmailConnected: (v: boolean) => void;

  // Agent working state
  isAgentWorking: boolean;
  agentUpdates: AgentUpdate[];
  agentProgress: number; // 0–100
  startAgent: () => void;
  finishAgent: (realOpportunities?: Opportunity[]) => void;
  addAgentUpdate: (update: AgentUpdate) => void;

  // Search intent
  intents: SearchIntent[];
  activeIntent: string | null;
  setActiveIntent: (intentText: string) => void;
  clearIntent: () => void;

  // Opportunities
  opportunities: Opportunity[];
  isLoadingOpportunities: boolean;
  setOpportunities: (opps: Opportunity[]) => void;
  savedOpportunityIds: Set<string>;
  selectedOpportunityId: string | null;
  selectOpportunity: (id: string | null) => void;
  saveOpportunity: (id: string) => void;
  unsaveOpportunity: (id: string) => void;

  // Scout briefing + coverage
  scoutBriefing: string | null;
  setScoutBriefing: (text: string) => void;
  coverageNote: string | null;
  setCoverageNote: (note: string) => void;

  // Alerts
  alerts: Alert[];
  unreadCount: number;
  markAlertRead: (id: string) => void;
  markAllRead: () => void;

  // Data connections
  connections: DataConnection[];
  updateConnection: (id: string, status: DataConnection["status"]) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── User ────────────────────────────────────────────────────────────────
      user: null,
      setUser: (user) => set({ user }),
      whatsappPhone: null,
      setWhatsappPhone: (phone) => set({ whatsappPhone: phone }),

      // ── Setup ───────────────────────────────────────────────────────────────
      setup: {
        currentStep: "what_you_sell",
        completed: false,
        whatISell: [],
        whereIOperate: [],
        projectTypes: [],
        whatsappConnected: false,
        contactsConnected: false,
        emailConnected: false,
      },

      setSetupStep: (step) =>
        set((s) => ({ setup: { ...s.setup, currentStep: step } })),

      completeSetup: () => {
        const { setup } = get();
        set({
          setup: { ...setup, completed: true },
          user: {
            id: "user-1",
            whatISell: setup.whatISell,
            whereIOperate: setup.whereIOperate,
            projectTypes: setup.projectTypes,
            whatsappConnected: setup.whatsappConnected,
            contactsConnected: setup.contactsConnected,
            emailConnected: setup.emailConnected,
          },
        });
      },

      toggleWhatISell: (item) =>
        set((s) => {
          const current = s.setup.whatISell;
          const next = current.includes(item)
            ? current.filter((i) => i !== item)
            : [...current, item];
          return { setup: { ...s.setup, whatISell: next } };
        }),

      toggleWhereIOperate: (city) =>
        set((s) => {
          const current = s.setup.whereIOperate;
          const next = current.includes(city)
            ? current.filter((c) => c !== city)
            : [...current, city];
          return { setup: { ...s.setup, whereIOperate: next } };
        }),

      toggleProjectType: (type) =>
        set((s) => {
          const current = s.setup.projectTypes;
          const next = current.includes(type)
            ? current.filter((t) => t !== type)
            : [...current, type];
          return { setup: { ...s.setup, projectTypes: next } };
        }),

      setWhatsappConnected: (v) =>
        set((s) => ({ setup: { ...s.setup, whatsappConnected: v } })),

      setContactsConnected: (v) =>
        set((s) => ({ setup: { ...s.setup, contactsConnected: v } })),

      setEmailConnected: (v) =>
        set((s) => ({ setup: { ...s.setup, emailConnected: v } })),

      // ── Agent ────────────────────────────────────────────────────────────────
      isAgentWorking: false,
      agentUpdates: [],
      agentProgress: 0,

      startAgent: () =>
        set({
          isAgentWorking: true,
          agentUpdates: [],
          agentProgress: 0,
          isLoadingOpportunities: true,
        }),

      finishAgent: (realOpportunities?: Opportunity[] | ScoutOpportunity[]) =>
        set((s) => ({
          isAgentWorking: false,
          agentProgress: 100,
          agentUpdates: MOCK_AGENT_UPDATES,
          opportunities: realOpportunities ?? s.opportunities,
          isLoadingOpportunities: false,
        })),

      addAgentUpdate: (update) =>
        set((s) => ({
          agentUpdates: [...s.agentUpdates, update],
          agentProgress: Math.min(s.agentProgress + 20, 95),
        })),

      // ── Intent ───────────────────────────────────────────────────────────────
      intents: MOCK_SEARCH_INTENTS,
      activeIntent: null,

      setActiveIntent: (intentText) => set({ activeIntent: intentText }),
      clearIntent: () => set({ activeIntent: null }),

      // ── Opportunities ────────────────────────────────────────────────────────
      opportunities: MOCK_OPPORTUNITIES,
      isLoadingOpportunities: false,
      setOpportunities: (opps) => set({ opportunities: opps, isLoadingOpportunities: false }),
      savedOpportunityIds: new Set(),
      selectedOpportunityId: null,

      selectOpportunity: (id) => set({ selectedOpportunityId: id }),

      // ── Scout briefing + coverage ─────────────────────────────────────────────
      scoutBriefing: null,
      setScoutBriefing: (text) => set({ scoutBriefing: text }),
      coverageNote: null,
      setCoverageNote: (note) => set({ coverageNote: note }),

      saveOpportunity: (id) =>
        set((s) => {
          const next = new Set(s.savedOpportunityIds);
          next.add(id);
          return { savedOpportunityIds: next };
        }),

      unsaveOpportunity: (id) =>
        set((s) => {
          const next = new Set(s.savedOpportunityIds);
          next.delete(id);
          return { savedOpportunityIds: next };
        }),

      // ── Alerts ───────────────────────────────────────────────────────────────
      alerts: MOCK_ALERTS,
      unreadCount: MOCK_ALERTS.filter((a) => !a.read).length,

      markAlertRead: (id) =>
        set((s) => {
          const alerts = s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a));
          return { alerts, unreadCount: alerts.filter((a) => !a.read).length };
        }),

      markAllRead: () =>
        set((s) => ({
          alerts: s.alerts.map((a) => ({ ...a, read: true })),
          unreadCount: 0,
        })),

      // ── Data connections ──────────────────────────────────────────────────────
      connections: MOCK_DATA_CONNECTIONS,

      updateConnection: (id, status) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, status } : c
          ),
        })),
    }),
    {
      name: "buildmapper-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist what should survive a page refresh
      partialize: (state) => ({
        user: state.user,
        setup: state.setup,
        whatsappPhone: state.whatsappPhone,
        savedOpportunityIds: [...state.savedOpportunityIds], // Set → Array for JSON
        alerts: state.alerts,
        unreadCount: state.unreadCount,
      }),
      // Rehydrate: convert saved Array back to Set
      merge: (persisted, current) => {
        const p = persisted as Partial<AppStore> & { savedOpportunityIds?: string[] };
        return {
          ...current,
          ...p,
          savedOpportunityIds: new Set(p.savedOpportunityIds ?? []),
        };
      },
    }
  )
);
