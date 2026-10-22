import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jua/400.css';
import { App } from './App';
import { assetUrl } from './asset-url';
import './styles.css';

document.documentElement.style.setProperty('--stage-1-background', `url("${assetUrl('assets/backgrounds/stage-1.png')}")`);
document.documentElement.style.setProperty('--stage-5-background', `url("${assetUrl('assets/backgrounds/stage-5.png')}")`);
document.documentElement.style.setProperty('--stage-6-background', `url("${assetUrl('assets/backgrounds/stage-6.png')}")`);
document.documentElement.style.setProperty('--game-ui-icons', `url("${assetUrl('assets/ui/game-ui-icons.png')}")`);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('React root element #root was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
