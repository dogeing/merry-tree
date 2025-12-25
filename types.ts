
export enum TreeState {
  GATHERED = 'GATHERED',
  SCATTERED = 'SCATTERED',
  FOCUS = 'FOCUS'
}

export interface ParticleConfig {
  count: number;
  size: number;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  ambientColor: string;
  brightness: number;
  starBrightness: number;
}

export interface AppState {
  treeState: TreeState;
  useGestures: boolean;
  currentGesture: string;
  photos: string[];
  bgmUrl: string | null;
  focusedPhotoIndex: number | null;
  customText: string;
}