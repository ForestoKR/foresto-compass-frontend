import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/TerminologyPage.css';

const parseMarkdown = (text) => {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let listItems = null;

  const flushList = () => {
    if (listItems) {
      blocks.push({ type: 'ul', items: listItems });
      listItems = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    if (trimmed === '---') {
      flushList();
      blocks.push({ type: 'hr' });
      return;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
      return;
    }
    if (trimmed.startsWith('- ')) {
      if (!listItems) {
        listItems = [];
      }
      listItems.push(trimmed.slice(2));
      return;
    }
    flushList();
    blocks.push({ type: 'p', text: trimmed });
  });

  flushList();
  return blocks;
};

const buildEntries = (blocks) => {
  const entries = [];
  let currentEntry = null;

  blocks.forEach((block) => {
    if (block.type === 'h3') {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {
        id: `term-${entries.length + 1}`,
        title: block.text,
        blocks: [],
      };
      return;
    }
    if (block.type === 'h2' || block.type === 'h1') {
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
      return;
    }
    if (currentEntry) {
      currentEntry.blocks.push(block);
    }
  });

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
};

const renderInline = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const match = part.match(/^\*\*(.+)\*\*$/);
    if (match) {
      return <strong key={index}>{match[1]}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};

function TerminologyPage() {
  const [blocks, setBlocks] = useState([]);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch('/terminology.md');
        if (!response.ok) {
          throw new Error('failed');
        }
        const text = await response.text();
        const parsed = parseMarkdown(text);
        setBlocks(parsed);
        setEntries(buildEntries(parsed));
      } catch {
        setError('용어 페이지를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = normalizedQuery
    ? entries.filter((entry) => entry.title.toLowerCase().includes(normalizedQuery))
    : entries;

  const handleJumpTo = (id) => {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    const elementTop = target.getBoundingClientRect().top + window.scrollY;
    const scrollTop = Math.max(0, elementTop - scrollOffset);
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
  };

  useEffect(() => {
    const headerOffset = 140;
    const searchHeight = searchRef.current ? searchRef.current.offsetHeight : 0;
    setScrollOffset(headerOffset + searchHeight + 12);
  }, [query, filteredEntries.length, loading, error]);

  useEffect(() => {
    const handleResize = () => {
      const headerOffset = 140;
      const searchHeight = searchRef.current ? searchRef.current.offsetHeight : 0;
      setScrollOffset(headerOffset + searchHeight + 12);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const jsonLd = useMemo(() => {
    if (!entries.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      'name': '투자 용어 사전',
      'description': 'Foresto Compass에서 사용되는 주요 투자 용어 설명',
      'url': 'https://foresto.co.kr/terminology',
      'inDefinedTermSet': entries.map(entry => ({
        '@type': 'DefinedTerm',
        'name': entry.title,
        'description': entry.blocks
          .filter(b => b.type === 'p')
          .map(b => b.text)
          .join(' ')
          .slice(0, 200),
      })),
    };
  }, [entries]);

  return (
    <div className="terminology-page">
      <Helmet>
        <title>투자 용어 사전 — Foresto Compass</title>
        <meta name="description" content="PER, PBR, ROE, CAGR, MDD, 샤프 비율 등 주요 투자 용어를 쉽게 이해하세요. 교육 목적 참고 정보입니다." />
        <meta property="og:title" content="투자 용어 사전 — Foresto Compass" />
        <meta property="og:description" content="투자 성향, 수익률, 리스크, 재무 지표, 포트폴리오 용어를 학습하세요." />
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>
      <div className="terminology-card">
        <div className="terminology-search" ref={searchRef}>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="용어를 검색하세요"
          />
          {!loading && !error && normalizedQuery && (
            <div className="terminology-results">
              {filteredEntries.length ? (
                filteredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="terminology-result"
                    onClick={() => handleJumpTo(entry.id)}
                  >
                    {entry.title}
                  </button>
                ))
              ) : (
                <p className="terminology-status">검색 결과가 없습니다.</p>
              )}
            </div>
          )}
        </div>
        {loading && <p className="terminology-status">불러오는 중...</p>}
        {error && <p className="terminology-error">{error}</p>}
        {!loading &&
          !error &&
          blocks.map((block, index) => {
            if (block.type === 'h1') {
              return <h1 key={index}>{block.text}</h1>;
            }
            if (block.type === 'h2') {
              return <h2 key={index}>{block.text}</h2>;
            }
            if (block.type === 'h3') {
              const entry = entries.find((item) => item.title === block.text);
              return (
                <h3 key={index} id={entry?.id} style={{ scrollMarginTop: `${scrollOffset}px` }}>
                  {block.text}
                </h3>
              );
            }
            if (block.type === 'ul') {
              return (
                <ul key={index}>
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{renderInline(item)}</li>
                  ))}
                </ul>
              );
            }
            if (block.type === 'hr') {
              return <hr key={index} />;
            }
            return (
              <p key={index} className="terminology-paragraph">
                {renderInline(block.text)}
              </p>
            );
          })}
      </div>
    </div>
  );
}

export default TerminologyPage;
