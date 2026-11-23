import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiRequest } from "../lib/api";
import { useToast } from "../context/ToastContext";

interface FriendUser {
  _id: string;
  name: string;
  joinedAt: string;
  activityStatus?: "Focusing" | "On Break" | "Offline";
}

interface FriendItem {
  friendshipId: string;
  user: FriendUser;
  stats: {
    todayMinutes: number;
    weeklyMinutes: number;
    todaySessions: number;
    totalSessions: number;
    streak: number;
    tasksCompletedToday: number;
    totalTasksToday: number;
    completionPercentage: number;
  };
}

interface FriendRequestItem {
  _id: string;
  requester?: { _id: string; name: string };
  recipient?: { _id: string; name: string };
  createdAt: string;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  isCurrentUser: boolean;
  todayMinutes: number;
  weeklyMinutes: number;
  streak: number;
  todaySessions: number;
  totalSessions: number;
  tasksCompletedToday: number;
  activityStatus?: "Focusing" | "On Break" | "Offline";
  rank: number;
}

interface LeaderboardData {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  myRanks: {
    daily: number;
    weekly: number;
    totalCompetitors: number;
  };
}

interface SharedTask {
  _id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  deadline: string;
}

interface OwnTaskOption {
  _id: string;
  title: string;
}

type TabType = "friends" | "leaderboard";
type LeaderboardView = "daily" | "weekly";

export default function FriendsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const token = localStorage.getItem("focusage-token");

  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [leaderboardView, setLeaderboardView] = useState<LeaderboardView>("daily");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [ownTasks, setOwnTasks] = useState<OwnTaskOption[]>([]);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [sharedTaskIds, setSharedTaskIds] = useState<string[]>([]);
  const [savingSharing, setSavingSharing] = useState(false);


  const [viewingFriendTasks, setViewingFriendTasks] = useState<{
    friendName: string;
    friendId: string;
    tasks: SharedTask[];
    loading: boolean;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ _id: string; name: string; username: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  //load friends and leaderboard data with timezone offset
  async function loadData() {
    try {
      setLoading(true);
      const tzOffset = new Date().getTimezoneOffset();
      const [friendsData, lbData, tasksData, sharingData] = await Promise.all([
        apiRequest<{
          friends: FriendItem[];
          incomingRequests: FriendRequestItem[];
          outgoingRequests: FriendRequestItem[];
        }>(`/api/friends?tzOffset=${tzOffset}`),
        apiRequest<LeaderboardData>(`/api/friends/leaderboard?tzOffset=${tzOffset}`),
        apiRequest<{ tasks: OwnTaskOption[] }>("/api/tasks"),
        apiRequest<{ sharing: { enabled: boolean; taskIds: string[] } }>("/api/friends/sharing"),
      ]);

      setFriends(friendsData.friends);
      setIncoming(friendsData.incomingRequests);
      setOutgoing(friendsData.outgoingRequests);
      setLeaderboard(lbData);
      setOwnTasks(tasksData.tasks);
      setSharingEnabled(sharingData.sharing.enabled);
      setSharedTaskIds(sharingData.sharing.taskIds);
    } catch (err) {
      console.error("Failed to load friends overview:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSharing(enabled: boolean, taskIds = sharedTaskIds) {
    try {
      setSavingSharing(true);
      const result = await apiRequest<{ sharing: { enabled: boolean; taskIds: string[] } }>("/api/friends/sharing", {
        method: "PATCH",
        body: JSON.stringify({ enabled, taskIds }),
      });
      setSharingEnabled(result.sharing.enabled);
      setSharedTaskIds(result.sharing.taskIds);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not update task sharing", variant: "error" });
    } finally {
      setSavingSharing(false);
    }
  }

  useEffect(() => {
    if (token) void loadData();
  }, [token]);

  //viewing friends shared tasks
  async function openSharedTasks(friendId: string, friendName: string) {
    setViewingFriendTasks({
      friendId,
      friendName,
      tasks: [],
      loading: true,
    });

    try {
      const res = await apiRequest<{
        friend: { _id: string; name: string };
        tasks: SharedTask[];
      }>(`/api/friends/${friendId}/tasks`);

      setViewingFriendTasks({
        friendId,
        friendName: res.friend.name || friendName,
        tasks: res.tasks,
        loading: false,
      });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Failed to load friend's tasks", variant: "error" });
      setViewingFriendTasks(null);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    try {
      setSearching(true);
      const res = await apiRequest<{ results: Array<{ _id: string; name: string; username: string }> }>(
        `/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      setSearchResults(res.results);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Search failed", variant: "error" });
    } finally {
      setSearching(false);
    }
  }


  async function handleSendRequest(targetUserId: string) {
    try {
      await apiRequest("/api/friends/request", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      setStatusMessage("Friend request sent!");
      setSearchResults((prev) => prev.filter((u) => u._id !== targetUserId));
      void loadData();
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not send friend request", variant: "error" });
    }
  }

  async function handleRespond(requestId: string, action: "accept" | "reject") {
    try {
      await apiRequest(`/api/friends/respond/${requestId}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      void loadData();
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not process request", variant: "error" });
    }
  }

  async function handleRemoveFriend(friendshipId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from your study circle?`)) return;
    try {
      await apiRequest(`/api/friends/${friendshipId}`, { method: "DELETE" });
      void loadData();
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Could not remove friend", variant: "error" });
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120, color: "var(--text-muted)", fontSize: 15 }}>
          Loading your study circle…
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Navbar />

      <main className="page-content friends-page-content" style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "40px 24px 64px", display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Page Header */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
            Social Productivity & Accountability
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Friends & Leaderboard
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
            Share goals with friends, track live study presence and compete on verified Pomodoro focus minutes.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="friends-tab-list" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
          {[
            { id: "friends", label: `Friends & Daily Progress (${friends.length})` },
            { id: "leaderboard", label: "Study Leaderboard & Rankings" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  padding: "10px 20px",
                  borderRadius: "6px 6px 0 0",
                  border: "none",
                  borderBottom: active ? "2.5px solid var(--accent)" : "2.5px solid transparent",
                  backgroundColor: "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {statusMessage && (
          <div style={{ padding: "12px 18px", borderRadius: 8, backgroundColor: "var(--success-bg)", color: "var(--success)", fontSize: 14, fontWeight: 500, border: "1px solid #c7e5d3" }}>
            {statusMessage}
          </div>
        )}

        {/* TAB 1: FRIENDS LIST & PROFILES */}
        {activeTab === "friends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <section style={{ backgroundColor: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Task sharing</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Sharing is off by default. Friends can only see tasks you select while sharing is enabled.</p>
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", fontSize: 13, color: "var(--text-primary)" }}>
                  <input
                    type="checkbox"
                    checked={sharingEnabled}
                    disabled={savingSharing}
                    onChange={(event) => void saveSharing(event.target.checked)}
                  />
                  Share selected tasks
                </label>
              </div>
              {ownTasks.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "14px 0 0" }}>Add tasks before selecting any to share.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 16px", marginTop: 14 }}>
                  {ownTasks.map((task) => (
                    <label key={task._id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-primary)" }}>
                      <input
                        type="checkbox"
                        checked={sharedTaskIds.includes(task._id)}
                        disabled={savingSharing}
                        onChange={(event) => {
                          const nextIds = event.target.checked
                            ? [...sharedTaskIds, task._id]
                            : sharedTaskIds.filter((id) => id !== task._id);
                          void saveSharing(sharingEnabled, nextIds);
                        }}
                      />
                      <span>{task.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Search and Add Friends Box */}
            <section
              style={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "24px 28px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Find Study Partners
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
                Search by username to send a friend request
              </p>

              <form onSubmit={handleSearch} style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by @username…"
                  style={{
                    flex: 1,
                    fontSize: 14,
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    backgroundColor: "var(--bg)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 8,
                    backgroundColor: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: searching ? "not-allowed" : "pointer",
                  }}
                >
                  {searching ? "Searching…" : "Search"}
                </button>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Matching Users:
                  </span>
                  {searchResults.map((u) => (
                    <div
                      key={u._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 8,
                        backgroundColor: "var(--bg)",
                        border: "1px solid var(--border-soft)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{u.name}</span>
                        <span style={{ display: "block", marginTop: 2, fontSize: 13, color: "var(--text-muted)" }}>@{u.username}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendRequest(u._id)}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          padding: "6px 14px",
                          borderRadius: 6,
                          backgroundColor: "var(--accent-light)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-ring)",
                          cursor: "pointer",
                        }}
                      >
                        + Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Pending Incoming Requests */}
            {incoming.length > 0 && (
              <section
                style={{
                  backgroundColor: "var(--accent-light)",
                  border: "1px solid var(--accent-ring)",
                  borderRadius: 12,
                  padding: "20px 24px",
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
                  Incoming Friend Requests ({incoming.length})
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {incoming.map((req) => (
                    <div
                      key={req._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: 8,
                        backgroundColor: "var(--surface-raised)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {req.requester?.name || "A fellow student"}
                      </span>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleRespond(req._id, "accept")}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            padding: "6px 14px",
                            borderRadius: 6,
                            backgroundColor: "var(--success)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespond(req._id, "reject")}
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            padding: "6px 12px",
                            borderRadius: 6,
                            backgroundColor: "transparent",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                            cursor: "pointer",
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Outgoing Pending Requests */}
            {outgoing.length > 0 && (
              <section
                style={{
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "18px 22px",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>
                  Sent Requests Pending ({outgoing.length})
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {outgoing.map((req) => (
                    <div
                      key={req._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 8,
                        backgroundColor: "var(--bg)",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>Request sent to <strong>{req.recipient?.name || "User"}</strong></span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Awaiting response</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Confirmed Friends Grid */}
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  Accepted Friends ({friends.length})
                </h2>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Live activity & daily productivity stats
                </span>
              </div>

              {friends.length === 0 ? (
                <div
                  style={{
                    backgroundColor: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "48px 24px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                    No friends added yet
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
                    Search for friends by username above to see each other's live activity, shared tasks, and study progress!
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                  {friends.map((item) => {
                    const status = item.user.activityStatus || "Offline";
                    const isFocusing = status === "Focusing";
                    const isOnBreak = status === "On Break";

                    return (
                      <div
                        key={item.friendshipId}
                        style={{
                          backgroundColor: "var(--surface-raised)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "20px 22px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 16,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        }}
                      >
                        {/* Friend Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {/* Avatar */}
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                backgroundColor: "var(--accent-light)",
                                color: "var(--accent)",
                                border: "1.5px solid var(--accent-ring)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                            >
                              {item.user.name.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                  {item.user.name}
                                </h3>

                                {/* Activity Status Badge */}
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    backgroundColor: isFocusing
                                      ? "rgba(114, 96, 200, 0.12)"
                                      : isOnBreak
                                      ? "rgba(224, 163, 106, 0.16)"
                                      : "var(--bg-inset)",
                                    color: isFocusing
                                      ? "var(--accent)"
                                      : isOnBreak
                                      ? "#b45309"
                                      : "var(--text-muted)",
                                    border: isFocusing
                                      ? "1px solid var(--accent-ring)"
                                      : "1px solid transparent",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      backgroundColor: isFocusing
                                        ? "var(--accent)"
                                        : isOnBreak
                                        ? "#f59e0b"
                                        : "var(--text-placeholder)",
                                    }}
                                  />
                                  {status}
                                </span>
                              </div>

                              <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                                🔥 {item.stats.streak} day focus streak
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(item.friendshipId, item.user.name)}
                            title="Remove Friend"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-placeholder)",
                              fontSize: 18,
                              cursor: "pointer",
                              padding: "2px 6px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--danger)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--text-placeholder)";
                            }}
                          >
                            ×
                          </button>
                        </div>

                        {/* Verified Productivity Statistics Grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 10,
                            padding: "12px 14px",
                            borderRadius: 10,
                            backgroundColor: "var(--bg)",
                            border: "1px solid var(--border-soft)",
                          }}
                        >
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                              Focus Today
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                              {item.stats.todayMinutes} <span style={{ fontSize: 12, fontWeight: 400 }}>min</span>
                            </p>
                          </div>

                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                              Pomodoros
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>
                              {item.stats.todaySessions} <span style={{ fontSize: 12, fontWeight: 400 }}>done</span>
                            </p>
                          </div>

                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                              Tasks Done
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                              {item.stats.tasksCompletedToday} / {item.stats.totalTasksToday}
                            </p>
                          </div>
                        </div>

                        {/* Task Progress Bar */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                              Today's Task Completion
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                              {item.stats.completionPercentage}%
                            </span>
                          </div>
                          <div style={{ height: 6, backgroundColor: "var(--border-soft)", borderRadius: 3, overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, Math.max(0, item.stats.completionPercentage))}%`,
                                backgroundColor: "var(--accent)",
                                borderRadius: 3,
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>

                        {/* View Shared Tasks Button */}
                        <button
                          type="button"
                          onClick={() => openSharedTasks(item.user._id, item.user.name)}
                          style={{
                            width: "100%",
                            padding: "9px 0",
                            borderRadius: 8,
                            backgroundColor: "var(--bg-inset)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--accent-light)";
                            e.currentTarget.style.borderColor = "var(--accent-ring)";
                            e.currentTarget.style.color = "var(--accent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--bg-inset)";
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }}
                        >
                          <span>📋</span>
                          <span>View Shared Tasks</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/*STUDY COMPETITION & LEADERBOARD */}
        {activeTab === "leaderboard" && leaderboard && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* user personal ranking*/}
            <section className="friends-leaderboard-summary"
              style={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "24px 28px",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
              }}
            >
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  Daily Ranking
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", marginTop: 4 }}>
                  #{leaderboard.myRanks.daily}{" "}
                  <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>
                    of {leaderboard.myRanks.totalCompetitors}
                  </span>
                </p>
              </div>

              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  Weekly Ranking
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
                  #{leaderboard.myRanks.weekly}{" "}
                  <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>
                    of {leaderboard.myRanks.totalCompetitors}
                  </span>
                </p>
              </div>

              
            </section>

            {/* leaderboard table container*/}
            <section
              style={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Study Competition Standings
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                    {leaderboardView === "daily" ? "Today's Focus Minutes" : "This Week's Focus Minutes (Mon–Sun)"}
                  </span>
                </div>

                {/* View Switch: Daily vs Weekly */}
                <div style={{ display: "inline-flex", gap: 4, backgroundColor: "var(--bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setLeaderboardView("daily")}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: leaderboardView === "daily" ? 600 : 500,
                      backgroundColor: leaderboardView === "daily" ? "var(--surface-raised)" : "transparent",
                      color: leaderboardView === "daily" ? "var(--text-primary)" : "var(--text-muted)",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: leaderboardView === "daily" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardView("weekly")}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: leaderboardView === "weekly" ? 600 : 500,
                      backgroundColor: leaderboardView === "weekly" ? "var(--surface-raised)" : "transparent",
                      color: leaderboardView === "weekly" ? "var(--text-primary)" : "var(--text-muted)",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: leaderboardView === "weekly" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    This Week
                  </button>
                </div>
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(leaderboardView === "daily" ? leaderboard.daily : leaderboard.weekly).map((entry) => {
                  const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`;
                  const isFocusing = entry.activityStatus === "Focusing";

                  return (
                    <div
                      key={entry.userId}
                      style={{
                        padding: "16px 24px",
                        borderBottom: "1px solid var(--border-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: entry.isCurrentUser ? "var(--accent-light)" : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, width: 32, textAlign: "center", color: entry.rank <= 3 ? "inherit" : "var(--text-muted)" }}>
                          {medal}
                        </span>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                              {entry.name}
                            </p>
                            {entry.isCurrentUser && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", padding: "1px 6px", borderRadius: 4, backgroundColor: "#fff" }}>
                                You
                              </span>
                            )}
                            {isFocusing && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--accent)" }} />
                                Focusing now
                              </span>
                            )}
                          </div>

                          <span style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, display: "block" }}>
                            🔥 {entry.streak} day streak · {entry.todaySessions} sessions today · {entry.tasksCompletedToday} tasks done
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
                          {leaderboardView === "daily" ? `${entry.todayMinutes} min` : `${entry.weeklyMinutes} min`}
                        </p>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {leaderboardView === "daily" ? `${entry.weeklyMinutes}m this week` : `${entry.todayMinutes}m today`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Shared Task Viewer Modal (Read-Only) */}
      {viewingFriendTasks && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              maxWidth: 600,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px 28px",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-soft)", paddingBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    {viewingFriendTasks.friendName}'s Tasks
                  </h3>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, backgroundColor: "var(--bg-inset)", color: "var(--text-muted)" }}>
                    Read-Only
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, margin: 0 }}>
                  Shared study goals so you can hold each other accountable.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingFriendTasks(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {viewingFriendTasks.loading ? (
              <div style={{ padding: "36px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                Loading shared tasks…
              </div>
            ) : viewingFriendTasks.tasks.length === 0 ? (
              <div style={{ padding: "36px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                {viewingFriendTasks.friendName} does not have any active tasks right now.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Pending Tasks Section */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                    Pending Goals ({viewingFriendTasks.tasks.filter((t) => !t.completed).length})
                  </h4>

                  {viewingFriendTasks.tasks.filter((t) => !t.completed).length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: "4px 0" }}>
                      No pending tasks remaining.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {viewingFriendTasks.tasks
                        .filter((t) => !t.completed)
                        .map((task) => (
                          <div
                            key={task._id}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 8,
                              backgroundColor: "var(--bg)",
                              border: "1px solid var(--border-soft)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                              {task.title}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 4,
                                textTransform: "uppercase",
                                backgroundColor:
                                  task.priority === "high"
                                    ? "#fdf0f0"
                                    : task.priority === "medium"
                                    ? "#fdf5e6"
                                    : "#ebf5ef",
                                color:
                                  task.priority === "high"
                                    ? "#c0392b"
                                    : task.priority === "medium"
                                    ? "#c07d2b"
                                    : "#3a8a62",
                              }}
                            >
                              {task.priority}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Completed Tasks Section */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                    Completed Goals ({viewingFriendTasks.tasks.filter((t) => t.completed).length})
                  </h4>

                  {viewingFriendTasks.tasks.filter((t) => t.completed).length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: "4px 0" }}>
                      No completed tasks yet.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {viewingFriendTasks.tasks
                        .filter((t) => t.completed)
                        .map((task) => (
                          <div
                            key={task._id}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 8,
                              backgroundColor: "rgba(63, 122, 90, 0.05)",
                              border: "1px solid rgba(63, 122, 90, 0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)", textDecoration: "line-through" }}>
                              {task.title}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--success)" }}>
                              ✓ Done
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
