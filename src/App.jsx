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
import { refreshTournamentData } from './services/dataFetcher';
import { retrainModel } from './analytics/mlEngine';
import { getAllMatches } from './data/matchHistory';

// Default tournament data (used for initial seeding only)
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
        const stored = await getAllTournaments();
        
        if (stored.length === 0) {
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
      } catch (e) {
        console.error("DB init failed, using in-memory defaults:", e);
        setTournamentData(DEFAULT_TOURNAMENTS);
        setDbReady(true);
      }
    }
    initDB();
  }, []);

  // ===== REAL DATA REFRESH =====
  const handleRefresh = useCallback(async (tournamentId) => {
    setRefreshing(true);
    setRefreshStatus(null);

    const existing = tournamentData[tournamentId];
    if (!existing) { setRefreshing(false); return; }

    try {
      const result = await refreshTournamentData(tournamentId, existing);
      
      if (result.data) {
        const updatedData = { ...result.data, id: tournamentId, lastRefresh: new Date().toISOString() };
        setTournamentData(prev => ({ ...prev, [tournamentId]: updatedData }));
        await saveTournament(updatedData);
        if (updatedData.teams) retrainModel(updatedData.teams);
        if (result.matches && result.matches.length > 0) await saveMatches(result.matches);
        await logRefresh(tournamentId, result.success, result.source, result.error || "");

        setRefreshStatus({
          success: result.success,
          message: result.error || (result.success ? `Data refreshed from ${result.source}` : "Refresh failed"),
        });
      }
    } catch (error) {
      setRefreshStatus({ success: false, message: `Refresh error: ${error.message}` });
      await logRefresh(tournamentId, false, "", error.message);
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

// Tournament route component — reads :id and :tab from URL
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
