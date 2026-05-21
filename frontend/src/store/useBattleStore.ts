import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_seed: string;
  created_at: string;
}

export interface Job {
  id: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timed_out' | null;
  error_message: string | null;
}

export interface CampaignContent {
  campaign_name: string;
  tagline: string;
  description: string;
  sensory_notes: string;
  visual_prompt: string;
}

export interface Submission {
  id: string;
  participant: User;
  user_prompt: string;
  generated_content: CampaignContent | null;
  image_url: string | null;
  score: number | null;
  rank: number | null;
  status: 'active' | 'eliminated';
  job: Job | null;
}

export interface ActiveRound {
  id: string;
  round_number: number;
  prompt_theme: string;
  status: 'accepting_submissions' | 'evaluating' | 'completed';
  submissions: Submission[];
}

export interface RoomState {
  room_id: string | null;
  room_name: string | null;
  room_status: 'waiting' | 'active' | 'completed' | null;
  host: User | null;
  user_role: 'host' | 'participant' | 'spectator' | null;
  active_round: ActiveRound | null;
}

interface BattleStore {
  // Authentication
  user: User | null;
  token: string | null;
  authLoading: boolean;
  authError: string | null;
  
  // Real-time Room State
  room: RoomState;
  ws: WebSocket | null;
  wsConnected: boolean;
  wsError: string | null;
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, avatar_seed?: string) => Promise<boolean>;
  logout: () => void;
  initAuth: () => Promise<void>;
  clearToast: () => void;
  setToast: (text: string, type?: 'success' | 'error' | 'info') => void;

  // Room REST Actions
  createRoom: (name: string) => Promise<string | null>;
  getRoomDetails: (room_id: string) => Promise<boolean>;
  
  // WebSocket Live Actions
  connectRoom: (room_code: string) => void;
  disconnectRoom: () => void;
  startRound: (theme: string) => void;
  submitPrompt: (prompt: string) => void;
  lockSubmissions: () => void;
  scoreSubmission: (submission_id: string, score: number, rank: number | null, status: 'active' | 'eliminated') => void;
  completeRound: () => void;
  endBattle: () => void;
}

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

export const useBattleStore = create<BattleStore>((set, get) => ({
  // Auth state
  user: null,
  token: null,
  authLoading: false,
  authError: null,

  // Room & WebSocket state
  room: {
    room_id: null,
    room_name: null,
    room_status: null,
    host: null,
    user_role: null,
    active_round: null
  },
  ws: null,
  wsConnected: false,
  wsError: null,
  toastMessage: null,

  clearToast: () => set({ toastMessage: null }),
  setToast: (text, type = 'info') => set({ toastMessage: { text, type } }),

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      
      localStorage.setItem('poiro_token', data.access_token);
      localStorage.setItem('poiro_user', JSON.stringify(data.user));
      
      set({ token: data.access_token, user: data.user, authLoading: false });
      get().setToast(`Logged in successfully! Welcome back, ${data.user.username}.`, 'success');
      return true;
    } catch (err: any) {
      set({ authError: err.message, authLoading: false });
      get().setToast(err.message, 'error');
      return false;
    }
  },

  register: async (username, email, password, avatar_seed) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, avatar_seed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');

      localStorage.setItem('poiro_token', data.access_token);
      localStorage.setItem('poiro_user', JSON.stringify(data.user));

      set({ token: data.access_token, user: data.user, authLoading: false });
      get().setToast(`Account created! Welcome, ${data.user.username}.`, 'success');
      return true;
    } catch (err: any) {
      set({ authError: err.message, authLoading: false });
      get().setToast(err.message, 'error');
      return false;
    }
  },

  logout: () => {
    get().disconnectRoom();
    localStorage.removeItem('poiro_token');
    localStorage.removeItem('poiro_user');
    set({
      user: null,
      token: null,
      room: {
        room_id: null,
        room_name: null,
        room_status: null,
        host: null,
        user_role: null,
        active_round: null
      }
    });
    get().setToast('Logged out cleanly.', 'info');
  },

  initAuth: async () => {
    const token = localStorage.getItem('poiro_token');
    const localUser = localStorage.getItem('poiro_user');
    if (!token || !localUser) return;

    try {
      set({ token, user: JSON.parse(localUser) });
      
      // Auto-reconnect active room from previous session if it exists!
      const activeRoomCode = localStorage.getItem('poiro_active_room_code');
      if (activeRoomCode) {
        get().connectRoom(activeRoomCode);
      }

      // Validate token silently with backend
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        // Token expired or invalid
        get().logout();
      } else {
        const validatedUser = await res.json();
        localStorage.setItem('poiro_user', JSON.stringify(validatedUser));
        set({ user: validatedUser });
      }
    } catch (e) {
      // Offline fallback: keep local storage session
      console.log('Backend connection offline, using cached credentials.');
    }
  },

  createRoom: async (name) => {
    const { token } = get();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Room creation failed');
      return data.id;
    } catch (err: any) {
      get().setToast(err.message, 'error');
      return null;
    }
  },

  getRoomDetails: async (room_id) => {
    const { token } = get();
    if (!token) return false;

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${room_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      return true;
    } catch (e) {
      return false;
    }
  },

  connectRoom: (room_code) => {
    const { token, ws } = get();
    if (!token) return;

    // Disconnect existing if any
    if (ws) {
      ws.close();
    }

    const socket = new WebSocket(`${WS_BASE}/ws/room/${room_code}?token=${token}`);

    socket.onopen = () => {
      set({ ws: socket, wsConnected: true, wsError: null });
      console.log(`WebSocket connected to room: ${room_code}`);
    };

    socket.onmessage = (event) => {
      const rawMessage = JSON.parse(event.data);
      const { event_type, payload } = rawMessage;

      console.log(`[WS Broadcast]: ${event_type}`, payload);

      switch (event_type) {
        case 'ROOM_STATE':
          set({
            room: {
              room_id: payload.room_id,
              room_name: payload.room_name,
              room_status: payload.room_status,
              host: payload.host,
              user_role: payload.user_role,
              active_round: payload.active_round
            }
          });
          
          // Save active room memory for instant auto-recovery on page refresh
          localStorage.setItem('poiro_active_room_code', payload.room_id);

          // Save to user-specific recent lobbies roster list (Fast Portal Access)
          const currentUserId = get().user?.id;
          if (currentUserId) {
            const key = `poiro_recent_rooms_${currentUserId}`;
            const existing = localStorage.getItem(key);
            let list = existing ? JSON.parse(existing) : [];
            list = list.filter((r: any) => r.code !== payload.room_id);
            list.unshift({
              code: payload.room_id,
              name: payload.room_name,
              role: payload.user_role,
              timestamp: Date.now()
            });
            list = list.slice(0, 5);
            localStorage.setItem(key, JSON.stringify(list));
          }
          break;

        case 'USER_JOINED':
          get().setToast(`User ${payload.user.username} entered the room as ${payload.role}.`, 'info');
          break;

        case 'USER_LEFT':
          get().setToast(`User ${payload.username} left the room.`, 'info');
          break;

        case 'ROUND_STARTED':
          set((state) => ({
            room: {
              ...state.room,
              room_status: 'active',
              active_round: {
                id: payload.id,
                round_number: payload.round_number,
                prompt_theme: payload.prompt_theme,
                status: payload.status,
                submissions: []
              }
            }
          }));
          get().setToast(`Round ${payload.round_number} has started! Objective: ${payload.prompt_theme}`, 'success');
          break;

        case 'SUBMISSION_SUBMITTED':
          set((state) => {
            if (!state.room.active_round) return {};
            // Prevent duplicate submissions
            const exists = state.room.active_round.submissions.some(s => s.id === payload.id);
            const subs = exists 
              ? state.room.active_round.submissions 
              : [...state.room.active_round.submissions, payload];
            return {
              room: {
                ...state.room,
                active_round: {
                  ...state.room.active_round,
                  submissions: subs
                }
              }
            };
          });
          get().setToast(`${payload.participant.username} submitted a prompt! Job is queued.`, 'info');
          break;

        case 'JOB_STATUS_UPDATED':
          set((state) => {
            if (!state.room.active_round) return {};
            const updatedSubmissions = state.room.active_round.submissions.map((sub) => {
              if (sub.id === payload.submission_id) {
                return {
                  ...sub,
                  job: {
                    id: payload.job_id,
                    status: payload.status,
                    error_message: payload.error_message || null
                  }
                };
              }
              return sub;
            });
            return {
              room: {
                ...state.room,
                active_round: {
                  ...state.room.active_round,
                  submissions: updatedSubmissions
                }
              }
            };
          });
          if (payload.status === 'failed') {
            get().setToast(`AI Generation failed for a prompt: ${payload.error_message}`, 'error');
          }
          break;

        case 'SUBMISSION_COMPLETED':
          set((state) => {
            if (!state.room.active_round) return {};
            const updatedSubmissions = state.room.active_round.submissions.map((sub) => {
              if (sub.id === payload.submission_id) {
                return {
                  ...sub,
                  generated_content: payload.generated_content,
                  image_url: payload.image_url,
                  job: payload.job
                };
              }
              return sub;
            });
            return {
              room: {
                ...state.room,
                active_round: {
                  ...state.room.active_round,
                  submissions: updatedSubmissions
                }
              }
            };
          });
          get().setToast(`AI Campaign Generation successfully completed! Ready for review.`, 'success');
          break;

        case 'ROUND_EVALUATING':
          set((state) => {
            if (!state.room.active_round) return {};
            return {
              room: {
                ...state.room,
                active_round: {
                  ...state.room.active_round,
                  status: 'evaluating'
                }
              }
            };
          });
          get().setToast('Submissions are locked! The host is now reviewing and scoring submissions.', 'info');
          break;

        case 'SUBMISSION_SCORED':
          set((state) => {
            if (!state.room.active_round) return {};
            const updatedSubmissions = state.room.active_round.submissions.map((sub) => {
              if (sub.id === payload.submission_id) {
                return {
                  ...sub,
                  score: payload.score,
                  rank: payload.rank,
                  status: payload.status
                };
              }
              return sub;
            });
            return {
              room: {
                ...state.room,
                active_round: {
                  ...state.room.active_round,
                  submissions: updatedSubmissions
                }
              }
            };
          });
          break;

        case 'ROUND_COMPLETED':
          set((state) => {
            if (!state.room.active_round) return {};
            return {
              room: {
                ...state.room,
                active_round: {
                  ...state.room.active_round,
                  status: 'completed'
                }
              }
            };
          });
          get().setToast('The round evaluation is complete! Scoring is finalized.', 'success');
          break;

        case 'BATTLE_COMPLETED':
          set((state) => ({
            room: {
              ...state.room,
              room_status: 'completed'
            }
          }));
          get().setToast('The Creative Battle Room session has finished! Long live the champions!', 'success');
          break;

        case 'ERROR':
          get().setToast(payload.message || 'An error occurred.', 'error');
          break;
      }
    };

    socket.onerror = () => {
      set({ wsError: 'WebSocket connection encountered a protocol error.', wsConnected: false });
      get().setToast('WebSocket connection error.', 'error');
    };

    socket.onclose = (event) => {
      set({ wsConnected: false, ws: null });
      console.log('WebSocket channel closed.', event.reason);
    };
  },

  disconnectRoom: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, wsConnected: false });
    }
    // Clear active room memory upon manual disconnect so it doesn't auto-reconnect
    localStorage.removeItem('poiro_active_room_code');
    // Force reset room state to dashboard view
    set({
      room: {
        room_id: null,
        room_name: null,
        room_status: null,
        host: null,
        user_role: null,
        active_round: null
      }
    });
  },

  // WS Emits
  startRound: (theme) => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        action: 'START_ROUND',
        payload: { prompt_theme: theme }
      }));
    }
  },

  submitPrompt: (prompt) => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        action: 'SUBMIT_PROMPT',
        payload: { user_prompt: prompt }
      }));
    }
  },

  lockSubmissions: () => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        action: 'EVALUATE_ROUND',
        payload: {}
      }));
    }
  },

  scoreSubmission: (submission_id, score, rank, status) => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        action: 'SCORE_SUBMISSION',
        payload: { submission_id, score, rank, status }
      }));
    }
  },

  completeRound: () => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        action: 'COMPLETE_ROUND',
        payload: {}
      }));
    }
  },

  endBattle: () => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        action: 'END_BATTLE',
        payload: {}
      }));
    }
  }
}));
