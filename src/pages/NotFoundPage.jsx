import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/NotFoundPage.css';

function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 — 페이지를 찾을 수 없습니다 | Foresto Compass</title>
      </Helmet>
      <div className="notfound-container">
        <div className="notfound-card">
          <span className="notfound-code">404</span>
          <h1 className="notfound-title">페이지를 찾을 수 없습니다</h1>
          <p className="notfound-description">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
          <Link to="/" className="notfound-home-btn">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </>
  );
}

export default NotFoundPage;
