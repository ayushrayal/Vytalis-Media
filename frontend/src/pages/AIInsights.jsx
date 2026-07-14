import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Video, MessageSquare, AlertTriangle, FileText, Send } from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const AIInsights = () => {
  const [activeTab, setActiveTab] = useState('script'); // 'script' or 'hooks'

  // Script Generator States
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [scriptAngle, setScriptAngle] = useState('Problem-Agitate-Solve');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptResult, setScriptResult] = useState('');
  const [scriptError, setScriptError] = useState('');

  // Hook Generator States
  const [originalCopy, setOriginalCopy] = useState('');
  const [hookCategory, setHookCategory] = useState('UGC Unboxing');
  const [hooksLoading, setHooksLoading] = useState(false);
  const [hooksResult, setHooksResult] = useState('');
  const [hooksError, setHooksError] = useState('');

  // Generate UGC Script handler
  const handleGenerateScript = async (e) => {
    e.preventDefault();
    if (!productName || !productDesc) return;
    
    setScriptLoading(true);
    setScriptError('');
    setScriptResult('');
    try {
      const response = await axios.post('http://localhost:5000/api/analysis/script', {
        productName,
        productDescription: productDesc,
        angle: scriptAngle
      });
      setScriptResult(response.data.data.script);
    } catch (err) {
      setScriptError(getFriendlyErrorMessage(err));
    } finally {
      setScriptLoading(false);
    }
  };

  // Generate Copy hooks handler
  const handleGenerateHooks = async (e) => {
    e.preventDefault();
    if (!originalCopy) return;

    setHooksLoading(true);
    setHooksError('');
    setHooksResult('');
    try {
      const response = await axios.post('http://localhost:5000/api/analysis/hooks', {
        copyText: originalCopy,
        category: hookCategory
      });
      setHooksResult(response.data.data.hooks);
    } catch (err) {
      setHooksError(getFriendlyErrorMessage(err));
    } finally {
      setHooksLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={28} color="var(--primary)" />
          <span>AI Creative & Copy Ideas Hub</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Leverage OpenAI GPT capabilities to write UGC concepts, storyboards, and CTR-maximizing scroll stoppers.
        </p>
      </div>

      {/* Tabs list bar */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => setActiveTab('script')}
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: activeTab === 'script' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'script' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Video size={16} />
          <span>UGC Video Script Writer</span>
        </button>

        <button
          onClick={() => setActiveTab('hooks')}
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: activeTab === 'hooks' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'hooks' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <MessageSquare size={16} />
          <span>Hook & Scroll-Stopper Generator</span>
        </button>
      </div>

      {/* UGC Script Section */}
      {activeTab === 'script' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem'
        }} id="ai-script-grid">
          {/* Inputs form */}
          <div className="card fade-in">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--primary)" />
              <span>Generate UGC Storyboard Concept</span>
            </h3>
            <form onSubmit={handleGenerateScript} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              .<div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pink Cotton Kurta Set"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Product Description / Audience Offer</label>
                <textarea
                  placeholder="Describe your product's core value proposition, key pain points solved, and target audience..."
                  value={productDesc}
                  rows={4}
                  onChange={(e) => setProductDesc(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>UGC Storytelling Hook Angle</label>
                <select
                  value={scriptAngle}
                  onChange={(e) => setScriptAngle(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value="Problem-Agitate-Solve">Problem-Agitate-Solve (Pain point first)</option>
                  <option value="Social Proof / Testimonial">UGC Social Proof / Testimonial</option>
                  <option value="Unboxing & First Impression">Unboxing & First Impression</option>
                  <option value="Comedy Hook / Skit">Comedy Hook / Skit</option>
                  <option value="Did You Know? (Educational)">"Did You Know?" (Educational / Curiosity)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={scriptLoading || !productName || !productDesc}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={14} />
                <span>{scriptLoading ? 'Writing Script...' : 'Generate UGC Concept'}</span>
              </button>
            </form>
          </div>

          {/* Results display */}
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>AI UGC Script Output</h3>
            
            {scriptLoading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '3rem', color: 'var(--primary)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                Generating storyboard script copy...
              </div>
            )}

            {scriptError && (
              <div style={{ padding: '1rem', background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <AlertTriangle size={18} />
                <span>{scriptError}</span>
              </div>
            )}

            {scriptResult ? (
              <pre style={{
                flex: 1,
                background: 'var(--bg-tertiary)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                lineHeight: '1.7',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border-color)',
                overflowY: 'auto'
              }}>{scriptResult}</pre>
            ) : !scriptLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', minHeight: '300px', flexDirection: 'column', gap: '0.5rem' }}>
                <Video size={32} />
                <p>Fill out the parameters and click Generate to write video scripts.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Hook Generator Section */}
      {activeTab === 'hooks' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem'
        }} id="ai-hooks-grid">
          {/* Inputs form */}
          <div className="card fade-in">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} color="var(--primary)" />
              <span>Generate High-CTR Copy Hooks</span>
            </h3>
            <form onSubmit={handleGenerateHooks} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Original Ad Copy / Core Offer Context</label>
                <textarea
                  placeholder="Paste your existing ad primary copy, email copy, or basic benefit points here..."
                  value={originalCopy}
                  rows={6}
                  onChange={(e) => setOriginalCopy(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Hook Concept Angle</label>
                <select
                  value={hookCategory}
                  onChange={(e) => setHookCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value="UGC Unboxing">UGC Unboxing ("I tried this...")</option>
                  <option value="Bold Statement / Question">Bold Statement / Direct Question</option>
                  <option value="Us vs Them (Comparison)">Us vs Them (Comparison angle)</option>
                  <option value="Authority Proof / Case Study">Authority Proof / Customer Statistic</option>
                  <option value="Scarcity / Offer-Driven">Urgent / Scarcity / Special Offer</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={hooksLoading || !originalCopy}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={14} />
                <span>{hooksLoading ? 'Generating Hooks...' : 'Write Scroll-Stoppers'}</span>
              </button>
            </form>
          </div>

          {/* Results display */}
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>AI Hook Concepts Output</h3>
            
            {hooksLoading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '3rem', color: 'var(--primary)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                Analyzing copy and generating hooks...
              </div>
            )}

            {hooksError && (
              <div style={{ padding: '1rem', background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <AlertTriangle size={18} />
                <span>{hooksError}</span>
              </div>
            )}

            {hooksResult ? (
              <pre style={{
                flex: 1,
                background: 'var(--bg-tertiary)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                lineHeight: '1.7',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border-color)',
                overflowY: 'auto'
              }}>{hooksResult}</pre>
            ) : !hooksLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', minHeight: '300px', flexDirection: 'column', gap: '0.5rem' }}>
                <MessageSquare size={32} />
                <p>Paste original ad copy and click Generate to see scroll-stopping hook options.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (min-width: 1024px) {
          #ai-script-grid, #ai-hooks-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AIInsights;
