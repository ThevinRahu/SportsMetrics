import { useState, useCallback, useEffect } from 'react';
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
import db, { 
  saveTournament, getAllTournaments,
  saveCustomTournament, getAllCustomTournaments, updateCustomTournament,
  logRefresh, saveMatches, seedMatchHistory, getAllMatchesFromDB
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
  const [activeTournament, setActiveTournament] = useState("srp2026");
  const [activeView, setActiveView] = useState("tournament");
  const [domesticTournaments, setDomesticTournaments] = useState([]);
  const [activeDomesticId, setActiveDomesticId] = useState(null);
  const [tournamentData, setTournamentData] = useState(DEFAULT_TOURNAMENTS);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  // ===== DATABASE INITIALIZATION =====
  // On first load, seed DB with defaults if empty, then load from DB
  useEffect(() => {
    async function initDB() {
      try {
        // Check if DB has tournament data
        const stored = await getAllTournaments();
        
        if (stored.length === 0) {
          // First run: seed database with default data
          for (const [id, data] of Object.entries(DEFAULT_TOURNAMENTS)) {
            await saveTournament({ ...data, id });
          }
          setTournamentData(DEFAULT_TOURNAMENTS);
        } else {
          // Load from DB- but merge with code defaults to pick up corrections
          const fromDB = {};
          for (const t of stored) {
            const codeDefault = DEFAULT_TOURNAMENTS[t.id];
            if (codeDefault && (!t.lastRefreshSource)) {
              // No manual refresh has happened- use latest code data (it has corrections)
              fromDB[t.id] = { ...codeDefault, id: t.id, lastRefresh: t.lastRefresh };
              await saveTournament({ ...codeDefault, id: t.id, lastRefresh: t.lastRefresh });
            } else {
              // User has refreshed this tournament- keep their refreshed data
              fromDB[t.id] = t;
            }
          }
          // Add any new tournaments from code that aren't in DB yet
          for (const [id, data] of Object.entries(DEFAULT_TOURNAMENTS)) {
            if (!fromDB[id]) {
              fromDB[id] = data;
              await saveTournament({ ...data, id });
            }
          }
          setTournamentData(fromDB);
        }

        // Load custom tournaments
        const customStored = await getAllCustomTournaments();
        if (customStored.length > 0) {
          setDomesticTournaments(customStored);
        }

        // Seed match history from static file (first load only)
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
    if (!existing) {
      setRefreshing(false);
      return;
    }

    try {
      // Call real data fetcher (fetches from live URLs)
      const result = await refreshTournamentData(tournamentId, existing);
      
      if (result.data) {
        const updatedData = {
          ...result.data,
          id: tournamentId,
          lastRefresh: new Date().toISOString(),
        };

        // Update state
        setTournamentData(prev => ({
          ...prev,
          [tournamentId]: updatedData
        }));

        // Persist to IndexedDB
        await saveTournament(updatedData);
        
        // Retrain ML model on updated data
        if (updatedData.teams) {
          retrainModel(updatedData.teams);
        }

        // Save extracted match results to DB
        if (result.matches && result.matches.length > 0) {
          await saveMatches(result.matches);
        }

        // Log the refresh
        await logRefresh(tournamentId, result.success, result.source, result.error || "");

        setRefreshStatus({
          success: result.success,
          message: result.error || (result.success ? `Data refreshed from ${result.source}` : "Refresh failed"),
          source: result.source,
        });
      }
    } catch (error) {
      setRefreshStatus({
        success: false,
        message: `Refresh error: ${error.message}`,
        source: "",
      });
      await logRefresh(tournamentId, false, "", error.message);
    }

    setRefreshing(false);
    
    // Clear status after 5 seconds
    setTimeout(() => setRefreshStatus(null), 5000);
  }, [tournamentData]);

  // ===== DOMESTIC TOURNAMENT MANAGEMENT =====
  const handleCreateDomestic = useCallback(async (tournament) => {
    const id = `domestic_${Date.now()}`;
    const newTournament = { ...tournament, id, createdAt: new Date().toISOString() };
    
    setDomesticTournaments(prev => [...prev, newTournament]);
    setActiveDomesticId(id);
    setActiveView("domestic");

    // Persist
    await saveCustomTournament(newTournament);
  }, []);

  const handleUpdateDomestic = useCallback(async (id, data) => {
    setDomesticTournaments(prev => 
      prev.map(t => t.id === id ? { ...t, ...data } : t)
    );
    // Persist
    await updateCustomTournament(id, data);
  }, []);

  const currentTournament = tournamentData[activeTournament];

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
      display: "flex", 
      minHeight: "100vh", 
      background: theme.bg, 
      color: theme.textPrimary,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
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

      {/* Sidebar with overlay on mobile */}
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
            activeTournament={activeTournament}
            activeView={activeView}
            domesticTournaments={domesticTournaments}
            activeDomesticId={activeDomesticId}
            onSelectTournament={(id) => { setActiveTournament(id); setActiveView("tournament"); if(window.innerWidth<=768) setSidebarOpen(false); }}
            onSelectDomestic={(id) => { setActiveDomesticId(id); setActiveView("domestic"); if(window.innerWidth<=768) setSidebarOpen(false); }}
            onCreateDomestic={() => { setActiveView("domestic-create"); if(window.innerWidth<=768) setSidebarOpen(false); }}
            onSelectTheory={() => { setActiveView("theory"); if(window.innerWidth<=768) setSidebarOpen(false); }}
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

        {activeView === "tournament" && currentTournament && (
          <TournamentDashboard
            tournament={currentTournament}
            onRefresh={() => handleRefresh(activeTournament)}
            refreshing={refreshing}
          />
        )}
        
        {(activeView === "domestic" || activeView === "domestic-create") && (
          <DomesticTournament
            tournaments={domesticTournaments}
            activeId={activeDomesticId}
            onCreate={handleCreateDomestic}
            onUpdate={handleUpdateDomestic}
            onSelect={(id) => setActiveDomesticId(id)}
            isCreating={activeView === "domestic-create"}
          />
        )}
        
        {activeView === "theory" && <AnalyticsTheory />}
      </main>

      {/* Settings Modal */}
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}
