

export enum PlotStatus {
  IDENTIFIED = 'IDENTIFIED', // Red
  IDEAS_FORMING = 'IDEAS_FORMING', // Yellow
  IN_PROGRESS = 'IN_PROGRESS', // Green
  COMPLETED = 'COMPLETED' // Blue/Gray
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  imageUrl?: string;
  isAiGenerated?: boolean;
  audioUrl?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  poll?: {
    question: string;
    options: Array<{ label: string; votes: number }>;
  };
}

export interface Plot {
  id: string;
  creatorId: string; // To track ownership
  title: string; // e.g., "Wasted corner near X street"
  description: string;
  locationName: string; // Address
  coordinates: { x: number; y: number; lat?: number; lng?: number }; // Supports both demo x/y and real GPS lat/lng
  imageUrl: string;
  status: PlotStatus;
  tags: string[]; // e.g., "safety issue", "good sun"
  ideas: string[]; // e.g., "pollinators", "seating"
  existingPractices: string[]; // e.g., "Monthly cleanups", "Informal seating"
  comments: Comment[];
  volunteerRequestSent: boolean;
  generatedImages: string[]; // AI Visualizations
  spottedBy?: string; // Original person if logged on their behalf
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'success' | 'info' | 'alert';
  relatedPlotId?: string;
}

export type ViewState = 'FEED' | 'MAP' | 'ADD_PLOT' | 'PLOT_DETAIL' | 'PROFILE';

// Define AppStage for high-level application flow states
export type AppStage = 'SPLASH' | 'ONBOARDING' | 'LOGIN' | 'APP';
