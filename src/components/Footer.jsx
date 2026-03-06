import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

/**
 * 공통 푸터 컴포넌트
 * 저작권 및 법적 고지사항 표시
 */
const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* 법적 고지 (한 줄 요약 — 상세 면책은 각 페이지 Disclaimer 컴포넌트) */}
        <div className="footer-legal">
          <p className="footer-legal-item">
            교육 목적 참고 정보이며 투자 권유가 아닙니다. 자본시장법 제6조에 의거, 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
        </div>

        {/* 사용 설명서 · 개발자 문서 링크 */}
        <div className="footer-guide">
          <Link to="/guide" className="footer-guide-link">사용 설명서</Link>
          <Link to="/developers" className="footer-guide-link">API 문서</Link>
        </div>

        {/* 저작권 */}
        <div className="footer-copyright">
          <p>
            © 2026 Foresto Compass. All rights reserved.
          </p>
          <p className="footer-copyright-sub">
            본 서비스는 교육 및 연구 목적으로 제작되었습니다.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
