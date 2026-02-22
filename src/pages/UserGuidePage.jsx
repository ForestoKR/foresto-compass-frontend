import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/UserGuidePage.css';

function UserGuidePage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/user-guide.md');
        if (!res.ok) throw new Error('failed');
        setContent(await res.text());
      } catch {
        setError('설명서를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="ug-page">
      <Helmet>
        <title>사용 설명서 — Foresto Compass</title>
        <meta
          name="description"
          content="Foresto Compass 사용 설명서 — 회원가입, 투자 성향 진단, 포트폴리오 시뮬레이션, Compass Score 활용법을 안내합니다. 교육 목적 참고 정보입니다."
        />
        <meta property="og:title" content="사용 설명서 — Foresto Compass" />
        <meta
          property="og:description"
          content="Foresto Compass 사용법을 단계별로 안내합니다."
        />
      </Helmet>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>불러오는 중...</p>
        </div>
      )}

      {error && <p className="ug-error">{error}</p>}

      {!loading && !error && (
        <article className="ug-article">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}

export default UserGuidePage;
