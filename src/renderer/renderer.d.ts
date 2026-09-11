import { workspaceApi } from '../../src/preload/main-preload';
import { overlayApi } from '../../src/preload/overlay-preload';

declare global {
  interface Window {
    workspaceApi: typeof workspaceApi;
    overlayApi: typeof overlayApi;
  }
}
