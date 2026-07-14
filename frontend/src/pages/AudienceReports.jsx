import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { KpiSkeleton } from '../components/LoadingSkeleton';
import { Users, AlertCircle, ArrowRight, ShieldCheck, MapPin, Calendar, Award } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import SectionError from '../components/SectionError';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const AudienceReports = () => {
  const { datePreset, customRange, refreshTrigger } = useDashboard();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaries, setSummaries] = useState({
    bestAge: null,
    bestPlacement: null,
    highestSpendAge: null,
    highestSpendPlacement: null
  });

  const fetchDemographics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/dashboard/breakdowns?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      const { age = [], placement = [] } = response.data.data;

      // 1. Process age metrics
      let bestAge = null;
      let highestSpendAge = null;
      if (age.length > 0) {
        // Best ROAS (with spend > $5 to filter noise)
        const ageFiltered = age.filter(a => a.spend > 5);
        if (ageFiltered.length > 0) {
          bestAge = ageFiltered.reduce((prev, current) => (prev.roas > current.roas) ? prev : current);
        }
        highestSpendAge = age.reduce((prev, current) => (prev.spend > current.spend) ? prev : current);
      }

      // 2. Process placement metrics
      let bestPlacement = null;
      let highestSpendPlacement = null;
      if (placement.length > 0) {
        const placementFiltered = placement.filter(p => p.spend > 5);
        if (placementFiltered.length > 0) {
          bestPlacement = placementFiltered.reduce((prev, current) => (prev.roas > current.roas) ? prev : current);
        }
        highestSpendPlacement = placement.reduce((prev, current) => (prev.spend > current.spend) ? prev : current);
      }

      setSummaries({
        bestAge,
        bestPlacement,
        highestSpendAge,
        highestSpendPlacement
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, refreshTrigger]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchDemographics();
  }, [fetchDemographics, datePreset, customRange]);

  // formatCurrency imported from formatter.js

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={28} color="var(--primary)" />
          <span>Demographics & Audience Hub</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          High-level overview of age and platform placement distribution performance
        </p>
      </div>

      {error && (
        <SectionError
          message={error}
          onRetry={fetchDemographics}
          isRetrying={loading}
        />
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, idx) => <KpiSkeleton key={idx} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Summary KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Top performing Age Bracket */}
            <div className="card fade-in" style={{ borderLeft: '4px solid var(--success)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Top ROI Age Bracket</span>
              {summaries.bestAge ? (
                <>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summaries.bestAge.age_range}</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    ROAS: <strong style={{ color: 'var(--success)' }}>{summaries.bestAge.roas.toFixed(2)}x</strong> | Spend: {formatCurrency(summaries.bestAge.spend)}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No data available.</p>
              )}
            </div>

            {/* Top performing Placement Position */}
            <div className="card fade-in" style={{ borderLeft: '4px solid var(--success)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Top ROI Placement</span>
              {summaries.bestPlacement ? (
                <>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {summaries.bestPlacement.placement.replace(/_/g, ' ')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    ROAS: <strong style={{ color: 'var(--success)' }}>{summaries.bestPlacement.roas.toFixed(2)}x</strong> | Spend: {formatCurrency(summaries.bestPlacement.spend)}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No data available.</p>
              )}
            </div>

            {/* Highest Spend Age Bracket */}
            <div className="card fade-in" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Highest Spend Age Group</span>
              {summaries.highestSpendAge ? (
                <>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summaries.highestSpendAge.age_range}</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Spend: <strong>{formatCurrency(summaries.highestSpendAge.spend)}</strong> | ROAS: {summaries.highestSpendAge.roas.toFixed(2)}x
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No data available.</p>
              )}
            </div>

            {/* Highest Spend Placement */}
            <div className="card fade-in" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Highest Spend Placement</span>
              {summaries.highestSpendPlacement ? (
                <>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {summaries.highestSpendPlacement.placement.replace(/_/g, ' ')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Spend: <strong>{formatCurrency(summaries.highestSpendPlacement.spend)}</strong> | ROAS: {summaries.highestSpendPlacement.roas.toFixed(2)}x
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No data available.</p>
              )}
            </div>
          </div>

          {/* Navigational Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2.5rem'
          }} id="demographic-nav-grid">
            
            {/* Age Card */}
            <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}>
                  <Calendar size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem' }}>Age Bracket Demographics</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Analyze cost-per-purchase, CTR, and conversion volume across age groups. Optimize bidding and targeting exclusions.
              </p>
              <button
                onClick={() => navigate('/age-breakdown')}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
              >
                <span>View Detailed Age Reports</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Placements Card */}
            <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
                  <MapPin size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem' }}>Placement Position Reports</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Identify performance between Facebook/Instagram Reels, Feed positioning, Messenger placements, and Stories.
              </p>
              <button
                onClick={() => navigate('/placements')}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
              >
                <span>View Detailed Placements</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>

        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          #demographic-nav-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AudienceReports;
