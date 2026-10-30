import type { JSX } from 'react';
import { assetUrl } from '../asset-url';

export interface GuideScreenProps {
  onContinue(): void;
}

export function GuideScreen({ onContinue }: GuideScreenProps): JSX.Element {
  return (
    <section className="tutorial-screen" aria-labelledby="tutorial-title" style={{ backgroundImage: `linear-gradient(180deg, rgb(255 239 196 / 12%), rgb(114 75 39 / 18%)), url("${assetUrl('assets/backgrounds/stage-1.png')}")` }}>
      <header className="tutorial-header">
        <div className="tutorial-heading-copy">
          <p className="eyebrow">CHICKS CANNON · FIELD GUIDE</p>
          <h1 id="tutorial-title">첫 모험 가이드</h1>
          <p>조작법과 별을 얻는 방법을 확인하고 황금알을 되찾으러 가요.</p>
        </div>
        <img className="tutorial-mascot" src={assetUrl('assets/chicks/stage-1.png')} alt="모험을 안내하는 아기 병아리" />
      </header>

      <div className="tutorial-card-grid">
        <article className="tutorial-card">
          <div className="tutorial-card-heading">
            <h2>조준하고 발사하기</h2>
            <span className="tutorial-card-icon"><img src={assetUrl('assets/props/slingshot.png')} alt="" /></span>
          </div>
          <ul>
            <li>병아리를 뒤로 끌어당겨 조준하고 놓으면 발사돼요.</li>
            <li>당기는 길이로 힘을, 방향으로 궤적을 조절해요.</li>
            <li>드래그 중 <kbd>W</kbd>/<kbd>S</kbd> 또는 <kbd>↑</kbd>/<kbd>↓</kbd>로 힘을 미세 조정할 수 있어요.</li>
          </ul>
        </article>

        <article className="tutorial-card">
          <div className="tutorial-card-heading">
            <h2>목표와 기믹</h2>
            <span className="tutorial-card-icon"><img src={assetUrl('assets/cats/normal.png')} alt="" /></span>
          </div>
          <ul>
            <li>모든 고양이를 처치하면 스테이지를 클리어해요.</li>
            <li>나무·유리·돌은 충격을 주고, 바위·시소·기어 같은 기믹은 밀거나 튕겨 활용해요.</li>
            <li>황금알은 소중한 보물이에요. 1~3스테이지는 깨지면 감점, 4스테이지부터는 실패예요.</li>
          </ul>
        </article>

        <article className="tutorial-card">
          <div className="tutorial-card-heading">
            <h2>특수 능력과 아이템</h2>
            <span className="tutorial-card-icon"><img src={assetUrl('assets/chicks/stage-1.png')} alt="" /></span>
          </div>
          <ul>
            <li>비행 중 <kbd>Space</kbd> 또는 화면을 눌러 병아리 능력을 사용해요. 고양이 가까이에서만 발동해요.</li>
            <li>아래 아이템 보드를 누르거나 숫자 <kbd>1</kbd>~<kbd>4</kbd>를 눌러 아이템을 써요.</li>
            <li><kbd>R</kbd>은 다시 시작, 일시정지 버튼은 잠시 멈추기예요.</li>
          </ul>
        </article>
      </div>

      <section className="tutorial-stars" aria-labelledby="tutorial-stars-title">
        <div className="tutorial-stars-heading">
          <span className="tutorial-star-coin" aria-hidden="true">★</span>
          <div>
            <h2 id="tutorial-stars-title">별은 이렇게 모아요</h2>
            <p>스테이지마다 점수 목표가 달라요. 플레이 중 상단의 별 진행 막대에서 확인할 수 있어요.</p>
          </div>
        </div>
        <ol>
          <li><b>별 1개</b><span>모든 고양이를 처치해 클리어</span></li>
          <li><b>별 2개</b><span>클리어하고 스테이지 점수 목표 달성</span></li>
          <li><b>별 3개</b><span>점수 목표 달성 + 시작 탄환의 절반 이상 남기기</span></li>
        </ol>
        <p className="tutorial-star-note">제한시간 안에 클리어하면 시간 도전 보너스 점수와 배지를 받아요. 보너스 점수는 점수 목표에 합산되지만, 별 3개에는 탄환 절약도 필요해요.</p>
      </section>

      <footer className="tutorial-footer">
        <p>이 가이드는 홈 화면의 <strong>게임 방법</strong>에서 다시 볼 수 있어요.</p>
        <button className="button button-primary" onClick={onContinue}>가이드 확인 완료 · 계속하기</button>
      </footer>
    </section>
  );
}
