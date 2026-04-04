import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Opportunity, Alert, AgentUpdate, DataConnection, SearchIntent, User, ScoutOpportunity, ScoutPanelData, ConversationSession, LikeSignals } from "./types";
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

export type ChatBlock =
  | { type: "email_draft"; subject: string; body: string }
  | { type: "opportunity_preview"; opportunityId: string }
  | { type: "lead_list"; opportunityIds: string[] }
  | { type: "account_brief"; companyName: string; overview: string; recentActivity: string; yourAngle: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  blocks?: ChatBlock[];
  chips?: string[];          // suggestion chips shown below briefing messages
  panelData?: ScoutPanelData; // data for the side panel
}

interface AppStore {
  // User
  user: User | null;
  setUser: (user: User) => void;
  whatsappPhone: string | null;
  setWhatsappPhone: (phone: string | null) => void;

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

  // Chat
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // Conversation sessions (history)
  sessions: ConversationSession[];
  activeSessionId: string | null;
  startNewSession: () => void;
  loadSession: (id: string) => void;
  saveCurrentSession: () => void;

  // Daily briefing
  lastBriefingDate: string | null;
  setLastBriefingDate: (date: string) => void;

  // Permit-sourced opportunities
  addOrUpdateOpportunity: (opp: Opportunity) => void;
  contactedOpportunityIds: Set<string>;
  markContacted: (id: string) => void;

  // Dismiss
  dismissedOpportunityIds: Set<string>;
  dismissOpportunity: (id: string) => void;
  undoDismissOpportunity: (id: string) => void;

  // Like / recommendation signals
  likedOpportunityIds: Set<string>;
  likeSignals: LikeSignals;
  likeOpportunity: (opp: Opportunity) => void;

  // Pending Scout message (set from outside the chat page, e.g. permit panel)
  pendingScoutMessage: string | null;
  setPendingScoutMessage: (msg: string | null) => void;

  // Reset
  resetStore: () => void;
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

      addOrUpdateOpportunity: (opp) =>
        set((s) => {
          if (s.opportunities.find((o) => o.id === opp.id)) return s;
          return { opportunities: [opp, ...s.opportunities] };
        }),

      contactedOpportunityIds: new Set(),
      markContacted: (id) =>
        set((s) => {
          const next = new Set(s.contactedOpportunityIds);
          next.add(id);
          return { contactedOpportunityIds: next };
        }),

      pendingScoutMessage: null,
      setPendingScoutMessage: (msg) => set({ pendingScoutMessage: msg }),

      dismissedOpportunityIds: new Set(),
      dismissOpportunity: (id) =>
        set((s) => {
          const next = new Set(s.dismissedOpportunityIds);
          next.add(id);
          return { dismissedOpportunityIds: next };
        }),
      undoDismissOpportunity: (id) =>
        set((s) => {
          const next = new Set(s.dismissedOpportunityIds);
          next.delete(id);
          return { dismissedOpportunityIds: next };
        }),

      likedOpportunityIds: new Set(),
      likeSignals: { projectTypes: [], cities: [] },
      likeOpportunity: (opp) =>
        set((s) => {
          const likedIds = new Set(s.likedOpportunityIds);
          likedIds.add(opp.id);
          const pt = opp.project.type;
          const city = opp.project.city;
          const projectTypes = s.likeSignals.projectTypes.includes(pt)
            ? s.likeSignals.projectTypes
            : [...s.likeSignals.projectTypes, pt];
          const cities = city && !s.likeSignals.cities.includes(city)
            ? [...s.likeSignals.cities, city]
            : s.likeSignals.cities;
          return { likedOpportunityIds: likedIds, likeSignals: { projectTypes, cities } };
        }),

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

      // ── Chat ─────────────────────────────────────────────────────────────────
      chatMessages: [],
      isChatOpen: false,
      openChat: () => set({ isChatOpen: true }),
      closeChat: () => set({ isChatOpen: false }),
      addChatMessage: (msg) =>
        set((s) => {
          const next = [...s.chatMessages, msg];
          // cap at 200 messages to avoid localStorage bloat
          return { chatMessages: next.length > 200 ? next.slice(-200) : next };
        }),
      clearChat: () => {
        // Save current session before clearing
        get().saveCurrentSession();
        set({ chatMessages: [], activeSessionId: null });
      },

      // ── Conversation sessions ─────────────────────────────────────────────────
      sessions: [],
      activeSessionId: null,

      startNewSession: () => {
        get().saveCurrentSession();
        set({ chatMessages: [], activeSessionId: null });
      },

      loadSession: (id) => {
        get().saveCurrentSession();
        const session = get().sessions.find((s) => s.id === id);
        if (session) {
          set({ chatMessages: session.messages as ChatMessage[], activeSessionId: id });
        }
      },

      saveCurrentSession: () => {
        const { chatMessages, activeSessionId, sessions } = get();
        const userMessages = chatMessages.filter((m) => m.role === "user");
        if (userMessages.length === 0) return; // nothing to save

        const title = (userMessages[0].content ?? "").slice(0, 40) || "Conversation";
        const now = new Date().toISOString();

        if (activeSessionId) {
          // Update existing session
          set({
            sessions: sessions.map((s) =>
              s.id === activeSessionId ? { ...s, messages: chatMessages } : s
            ),
          });
        } else {
          // Create new session
          const newSession: ConversationSession = {
            id: `session-${Date.now()}`,
            title,
            date: now,
            messages: chatMessages,
          };
          // Keep only last 30 sessions
          const updated = [newSession, ...sessions].slice(0, 30);
          set({ sessions: updated, activeSessionId: newSession.id });
        }
      },

      // ── Daily briefing ────────────────────────────────────────────────────────
      lastBriefingDate: null,
      setLastBriefingDate: (date) => set({ lastBriefingDate: date }),

      resetStore: () =>
        set({
          user: null,
          whatsappPhone: null,
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
          isAgentWorking: false,
          agentUpdates: [],
          agentProgress: 0,
          activeIntent: null,
          opportunities: [],
          isLoadingOpportunities: false,
          savedOpportunityIds: new Set(),
          selectedOpportunityId: null,
          scoutBriefing: null,
          coverageNote: null,
          alerts: [],
          unreadCount: 0,
          chatMessages: [],
          isChatOpen: false,
          sessions: [],
          activeSessionId: null,
          lastBriefingDate: null,
          contactedOpportunityIds: new Set(),
          dismissedOpportunityIds: new Set(),
          likedOpportunityIds: new Set(),
          likeSignals: { projectTypes: [], cities: [] },
          pendingScoutMessage: null,
        }),
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
        contactedOpportunityIds: [...state.contactedOpportunityIds],
        dismissedOpportunityIds: [...state.dismissedOpportunityIds],
        likedOpportunityIds: [...state.likedOpportunityIds],
        likeSignals: state.likeSignals,
        alerts: state.alerts,
        unreadCount: state.unreadCount,
        lastBriefingDate: state.lastBriefingDate,
        chatMessages: state.chatMessages,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
      // Rehydrate: convert saved Array back to Set
      merge: (persisted, current) => {
        const p = persisted as Partial<AppStore> & { savedOpportunityIds?: string[]; contactedOpportunityIds?: string[]; dismissedOpportunityIds?: string[]; likedOpportunityIds?: string[] };
        return {
          ...current,
          ...p,
          savedOpportunityIds: new Set(p.savedOpportunityIds ?? []),
          contactedOpportunityIds: new Set(p.contactedOpportunityIds ?? []),
          dismissedOpportunityIds: new Set(p.dismissedOpportunityIds ?? []),
          likedOpportunityIds: new Set(p.likedOpportunityIds ?? []),
        };
      },
    }
  )
);
