import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { theme } from './styles/theme';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import TournamentDashboard from './pages/TournamentDashboard';
import DomesticTournament from './pages/DomesticTournament';
import AnalyticsTheory from './pages/AnalyticsTheory';
import { SUPER_RUGBY_2026 } from './data/superRugby2026';
import { NATIONS_CHAMPIONSHIP_2026 } from './data/nationsChampionship2026';
import { RUGBY_CHAMPIONSHIP_2026 } from './data/rugbyChampionship2026';
import { 
  saveTournament, getAllTournaments,
  saveCustomTournament, getAllCustomTournaments, updateCustomTournament,
  logRefresh, saveMatches, seedMatchHistory
} from './db';
import { fetchFromServer, startLiveSync, onLiveEvent } from './services/liveSync';
import { retrainModel } from './analytics/mlEngine';
import { getAllMatches } from './data/matchHistory';

// Default tournament data (fallback only if server + IndexedDB are both empty)
const DEFAULT_TOURNAMENTS = {
  srp2026: SUPER_RUGBY_2026,
  nc2026: NATIONS_CHAMPIONSHIP_2026,
  trc2026: RUGBY_CHAMPIONSHIP_2026,
};

export default function App() {
  const [domesticTournaments, setDomesticTournaments] = useState([]);
  const [tournamentData, setTournamentData] = useState(DEFAULT_TOURNAMENTS);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tournament from URL
  const getActiveTournamentId = () => {
    const match = location.pathname.match(/^\/tournament\/([^/]+)/);
    return match ? match[1] : "nc2026";
  };

  // ===== DATABASE INITIALIZATION =====
  useEffect(() => {
    async function initDB() {
      try {
        // STRATEGY: Server (Neon Postgres) → IndexedDB cache → Hardcoded fallback
        let fromServer = {};
        let usedServer = false;

        // 1. Try fetching from shared server (Neon Postgres via /api/tournaments)
        try {
          const serverTournaments = await fetch('/api/tournaments', { signal: AbortSignal.timeout(8000) });
          if (serverTournaments.ok) {
            const list = await serverTournaments.json();
            if (Array.isArray(list) && list.length > 0) {
              // Fetch full data for each tournament
              for (const t of list) {
                if (t.id) {
                  const full = await fetch(`/api/tournaments?id=${t.id}`, { signal: AbortSignal.timeout(8000) });
                  if (full.ok) {
                    const data = await full.json();
                    if (data && data.teams && Object.keys(data.teams).length > 0) {
                      // Map Postgres column names to app format
                      fromServer[data.id] = {
                        ...data,
                        dataVersion: data.data_version || data.dataVersion,
                        totalRounds: data.total_rounds || data.totalRounds,
                        dataUrl: data.data_url || data.dataUrl,
                      };
                    }
                  }
                }
              }
              if (Object.keys(fromServer).length > 0) {
                usedServer = true;
              }
            }
          }
        } catch (e) {
          console.warn("Server fetch failed, falling back to local:", e.message);
        }

        if (usedServer) {
          // Server had data - use it as source of truth
          // Also fill in any tournaments the server doesn't have yet (from hardcoded)
          for (const [id, data] of Object.entries(DEFAULT_TOURNAMENTS)) {
            if (!fromServer[id]) {
              fromServer[id] = data;
            }
          }
          setTournamentData(fromServer);
          // Cache to IndexedDB for offline access
          for (const [id, data] of Object.entries(fromServer)) {
            await saveTournament({ ...data, id });
          }
        } else {
          // 2. Fall back to IndexedDB (local cache)
          const stored = await getAllTournaments();
          
          if (stored.length === 0) {
            // 3. Last resort: use hardcoded data
            for (const [id, data] of Object.entries(DEFAULT_TOURNAMENTS)) {
              await saveTournament({ ...data, id });
            }
            setTournamentData(DEFAULT_TOURNAMENTS);
          } else {
            const fromDB = {};
            for (const t of stored) {
              const codeDefault = DEFAULT_TOURNAMENTS[t.id];
              if (codeDefault) {
                const codeVersion = codeDefault.dataVersion || 0;
                const dbVersion = t.dataVersion || 0;
                if (codeVersion > dbVersion) {
                  fromDB[t.id] = { ...codeDefault, id: t.id };
                  await saveTournament({ ...codeDefault, id: t.id });
                } else {
                  fromDB[t.id] = t;
                }
              } else {
                fromDB[t.id] = t;
              }
            }
            for (const [id, data] of Object.entries(DEFAULT_TOURNAMENTS)) {
              if (!fromDB[id]) {
                fromDB[id] = data;
                await saveTournament({ ...data, id });
              }
            }
            setTournamentData(fromDB);
          }
        }

        const customStored = await getAllCustomTournaments();
        if (customStored.length > 0) {
          setDomesticTournaments(customStored);
        }

        const staticMatches = getAllMatches().map(([home, away, hs, as, year, comp]) => ({
          homeTeam: home, awayTeam: away, homeScore: hs, awayScore: as,
          date: year + "-01-01", competition: comp, tournamentId: comp === "SRP" ? "srp2026" : "nc2026"
        }));
        await seedMatchHistory(staticMatches);

        setDbReady(true);

        // Start live sync polling (checks for match_completed events)
        startLiveSync();
      } catch (e) {
        console.error("DB init failed, using in-memory defaults:", e);
        setTournamentData(DEFAULT_TOURNAMENTS);
        setDbReady(true);
      }
    }
    initDB();
  }, []);

  // ===== LIVE EVENT LISTENER =====
  useEffect(() => {
    const unsubscribe = onLiveEvent((event) => {
      if (event.type === 'match_completed' && event.payload?.tournamentId) {
        // A match completed - refetch that tournament from server
        const tid = event.payload.tournamentId;
        fetch(`/api/tournaments?id=${tid}`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data && data.teams) {
              const mapped = { ...data, dataVersion: data.data_version, totalRounds: data.total_rounds, dataUrl: data.data_url };
              setTournamentData(prev => ({ ...prev, [tid]: mapped }));
              saveTournament({ ...mapped, id: tid });
            }
          })
          .catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  // ===== REAL DATA REFRESH =====
  const handleRefresh = useCallback(async (tournamentId) => {
    setRefreshing(true);
    setRefreshStatus(null);

    try {
      // Trigger server-side cron pipeline (Crawl4AI + full recompute)
      const cronRes = await fetch('/api/cron/check-matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${window.__CRON_SECRET || 'SportsMetricsCronLive'}` },
        signal: AbortSignal.timeout(90000),
      });
      
      let cronResult = { checked: 0, completed: 0 };
      if (cronRes.ok) {
        cronResult = await cronRes.json();
      }

      // Fetch updated tournament data from server (regardless of cron result)
      const tournamentRes = await fetch(`/api/tournaments?id=${tournamentId}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (tournamentRes.ok) {
        const serverData = await tournamentRes.json();
        if (serverData && serverData.teams && Object.keys(serverData.teams).length > 0) {
          const mapped = {
            ...serverData,
            id: tournamentId,
            dataVersion: serverData.data_version || serverData.dataVersion,
            totalRounds: serverData.total_rounds || serverData.totalRounds,
            dataUrl: serverData.data_url || serverData.dataUrl,
            lastRefresh: new Date().toISOString(),
          };
          setTournamentData(prev => ({ ...prev, [tournamentId]: mapped }));
          await saveTournament(mapped);
          if (mapped.teams) retrainModel(mapped.teams);
        }
      }

      const message = cronResult.completed > 0
        ? `Updated ${cronResult.completed} match(es) via Crawl4AI`
        : cronResult.checked > 0
          ? `Checked ${cronResult.checked} matches - no new completions found`
          : 'Data refreshed from server';

      setRefreshStatus({ success: true, message });
    } catch (error) {
      // Even if cron fails, try fetching latest data from server
      try {
        const fallbackRes = await fetch(`/api/tournaments?id=${tournamentId}`, { signal: AbortSignal.timeout(10000) });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (data && data.teams) {
            const mapped = { ...data, id: tournamentId, dataVersion: data.data_version, totalRounds: data.total_rounds, dataUrl: data.data_url, lastRefresh: new Date().toISOString() };
            setTournamentData(prev => ({ ...prev, [tournamentId]: mapped }));
            await saveTournament(mapped);
          }
        }
      } catch { /* silent */ }
      setRefreshStatus({ success: false, message: `Refresh error: ${error.message}` });
    }

    setRefreshing(false);
    setTimeout(() => setRefreshStatus(null), 5000);
  }, [tournamentData]);

  // ===== DOMESTIC TOURNAMENT MANAGEMENT =====
  const handleCreateDomestic = useCallback(async (tournament) => {
    const id = `domestic_${Date.now()}`;
    const newTournament = { ...tournament, id, createdAt: new Date().toISOString() };
    setDomesticTournaments(prev => [...prev, newTournament]);
    await saveCustomTournament(newTournament);
    navigate(`/domestic/${id}`);
  }, [navigate]);

  const handleUpdateDomestic = useCallback(async (id, data) => {
    setDomesticTournaments(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    await updateCustomTournament(id, data);
  }, []);

  // Show loading state while DB initializes
  if (!dbReady) {
    return (
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: theme.bg, color: theme.textPrimary,
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏉</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>SportsMetrics</div>
          <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>Loading database...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", minHeight: "100vh", background: theme.bg, 
      color: theme.textPrimary, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Mobile menu button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 999,
            width: 36, height: 36, borderRadius: 8,
            background: theme.surface, border: `1px solid ${theme.border}`,
            color: theme.textPrimary, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
          }}
        >☰</button>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <div
            onClick={() => { if (window.innerWidth <= 768) setSidebarOpen(false); }}
            style={{
              display: window.innerWidth <= 768 ? "block" : "none",
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998
            }}
          />
          <Sidebar
            tournaments={tournamentData}
            activeTournament={getActiveTournamentId()}
            activeView={location.pathname.startsWith('/domestic') ? 'domestic' : location.pathname.startsWith('/analytics') ? 'theory' : 'tournament'}
            domesticTournaments={domesticTournaments}
            activeDomesticId={null}
            onSelectTournament={(id) => { navigate(`/tournament/${id}`); if(window.innerWidth<=768) setSidebarOpen(false); }}
            onSelectDomestic={(id) => { navigate(`/domestic/${id}`); if(window.innerWidth<=768) setSidebarOpen(false); }}
            onCreateDomestic={() => { navigate('/domestic/new'); if(window.innerWidth<=768) setSidebarOpen(false); }}
            onSelectTheory={() => { navigate('/analytics'); if(window.innerWidth<=768) setSidebarOpen(false); }}
            onOpenSettings={() => setSettingsOpen(true)}
            onClose={() => setSidebarOpen(false)}
          />
        </>
      )}
      
      <main style={{ flex: 1, overflow: "auto", padding: window.innerWidth <= 768 ? "16px 12px" : "24px 28px", paddingTop: !sidebarOpen && window.innerWidth <= 768 ? 56 : undefined }}>
        {/* Refresh Status Toast */}
        {refreshStatus && (
          <div style={{
            position: "fixed", top: 16, right: 16, zIndex: 9999,
            padding: "12px 20px", borderRadius: 10,
            background: refreshStatus.success ? theme.greenDark : theme.redDark,
            border: `1px solid ${refreshStatus.success ? theme.green : theme.red}`,
            color: refreshStatus.success ? theme.greenText : theme.redText,
            fontSize: 11, fontWeight: 600, maxWidth: 400,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
          }}>
            {refreshStatus.success ? "✓" : "⚠"} {refreshStatus.message}
          </div>
        )}

        <Routes>
          <Route path="/" element={<Navigate to="/tournament/nc2026" replace />} />
          <Route path="/tournament/:id/:tab?" element={
            <TournamentRoute 
              tournamentData={tournamentData} 
              onRefresh={handleRefresh} 
              refreshing={refreshing} 
            />
          } />
          <Route path="/domestic/:id?" element={
            <DomesticTournament
              tournaments={domesticTournaments}
              activeId={location.pathname.split('/domestic/')[1] || null}
              onCreate={handleCreateDomestic}
              onUpdate={handleUpdateDomestic}
              onSelect={(id) => navigate(`/domestic/${id}`)}
              isCreating={location.pathname === '/domestic/new'}
            />
          } />
          <Route path="/analytics" element={<AnalyticsTheory />} />
          <Route path="*" element={<Navigate to="/tournament/nc2026" replace />} />
        </Routes>
      </main>

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Analytics />
    </div>
  );
}

// Tournament route component - reads :id and :tab from URL
function TournamentRoute({ tournamentData, onRefresh, refreshing }) {
  const { id, tab } = useParams();
  const tournament = tournamentData[id];

  if (!tournament) {
    return <Navigate to="/tournament/nc2026" replace />;
  }

  return (
    <TournamentDashboard
      tournament={tournament}
      onRefresh={() => onRefresh(id)}
      refreshing={refreshing}
      initialTab={tab || "standings"}
    />
  );
}
