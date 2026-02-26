
import React, { useState, useEffect, useRef } from 'react';
import { Map, Users, Plus, Camera, Send, Sparkles, X, ChevronLeft, MapPin, CheckCircle, Home, Sprout, CircleUser, Navigation, ArrowRight, Mail, Share2, Copy, Search, Building2, Calendar, Clock, HandHeart, MessageSquare, Lock, Bell, SlidersHorizontal, Download, ExternalLink, QrCode, Printer, UserPlus, Repeat, Info, Globe, LogOut, Mic, Paperclip, BarChart3, StopCircle, Smile, FileText, Image as ImageIcon, Music2, Play, Pause } from 'lucide-react';
// Added AppStage to the import list from types.ts
import { Plot, PlotStatus, ViewState, Comment, Notification, AppStage } from './types';
import { PlotCard } from './components/PlotCard';
import { Button } from './components/Button';
import { generatePlotVisualization } from './services/geminiService';
import { auth, db } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- GOOGLE MAPS TYPES ---
declare global {
  interface Window {
    google: any;
    initMap: () => void;
    gm_authFailure: () => void;
  }
}

let googleMapsAuthFailed = false;

const CURRENT_USER_ID = 'current-user';
const CURRENT_USER_NAME = 'Ashwin';

const COMMUNITY_GROUPS = [
  { id: 'g1', name: 'NCAD Student Union', type: 'College' },
  { id: 'g2', name: 'Liberties Green Group', type: 'Community' },
  { id: 'g3', name: 'Dublin City Council', type: 'Gov' },
  { id: 'g4', name: 'Trinity Environmental Soc', type: 'College' },
  { id: 'g5', name: 'Weaver Park Volunteers', type: 'Community' },
  { id: 'g6', name: 'TU Dublin Arch Soc', type: 'College' },
  { id: 'g7', name: 'Bridgefoot St. Gardeners', type: 'Community' },
  { id: 'g8', name: 'BIMM Institute Dublin', type: 'College' }
];

type Language = 'English' | 'Malayalam' | 'Irish';

const TRANSLATIONS: Record<Language, any> = {
  English: {
    transformCity: 'Transform Your City',
    reclaimNeglected: 'Reclaim neglected corners. Turn wasted urban spaces into vibrant community micro-plots.',
    getStarted: 'Get Started',
    capture: 'Capture',
    captureDesc: 'Snap a photo of an unused space and drop a pin.',
    discuss: 'Discuss',
    discussDesc: 'Chat with neighbors, vote on ideas, and visualize changes.',
    collaborate: 'Collaborate',
    collaborateDesc: 'Call for volunteers and students to help build.',
    welcomeBack: 'Welcome Back',
    createAccount: 'Create an Account',
    enterDetails: 'Enter your details to access your plots.',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    continueWithGoogle: 'Continue with Google',
    alreadyHaveAccount: 'Already have an account? Sign In',
    dontHaveAccount: "Don't have an account? Sign Up",
    profile: 'Profile',
    settings: 'Settings',
    language: 'Language',
    logout: 'Log Out',
    community: 'Community',
    map: 'Map'
  },
  Malayalam: {
    transformCity: 'നിങ്ങളുടെ നഗരത്തെ മാറ്റുക',
    reclaimNeglected: 'ഉപേക്ഷിത കോണുകൾ വീണ്ടെടുക്കുക. പാഴായ നഗര ഇടങ്ങളെ സജീവമായ കമ്മ്യൂണിറ്റി മൈക്രോ-പ്ലോട്ടുകളാക്കി മാറ്റുക.',
    getStarted: 'ആരംഭിക്കുക',
    capture: 'ചിത്രീകരിക്കുക',
    captureDesc: 'ഉപയോഗിക്കാത്ത സ്ഥലത്തിന്റെ ഫോട്ടോ എടുത്ത് ഒരു പിൻ ഇടുക.',
    discuss: 'ചർച്ച ചെയ്യുക',
    discussDesc: 'അയൽക്കാരുമായി സംസാരിക്കുക, ആശയങ്ങളിൽ വോട്ട് ചെയ്യുക, മാറ്റങ്ങൾ സങ്കൽപ്പിക്കുക.',
    collaborate: 'സഹകരിക്കുക',
    collaborateDesc: 'നിർമ്മാണത്തിന് സഹായിക്കാൻ സന്നദ്ധപ്രവർത്തകരെയും വിദ്യാർത്ഥികളെയും വിളിക്കുക.',
    welcomeBack: 'വീണ്ടും സ്വാഗതം',
    createAccount: 'ഒരു അക്കൗണ്ട് സൃഷ്ടിക്കുക',
    enterDetails: 'നിങ്ങളുടെ പ്ലോട്ടുകൾ ആക്സസ് ചെയ്യുന്നതിന് നിങ്ങളുടെ വിശദാംശങ്ങൾ നൽകുക.',
    email: 'ഇമെയിൽ',
    password: 'പാസ്‌വേഡ്',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    continueWithGoogle: 'Google ഉപയോഗിച്ച് തുടരുക',
    alreadyHaveAccount: 'അക്കൗണ്ട് ഉണ്ടോ? സൈൻ ഇൻ ചെയ്യുക',
    dontHaveAccount: "അക്കൗണ്ട് ഇല്ലേ? സൈൻ അപ്പ് ചെയ്യുക",
    profile: 'പ്രൊഫൈൽ',
    settings: 'ക്രമീകരണങ്ങൾ',
    language: 'ഭാഷ',
    logout: 'ലോഗ് ഔട്ട്',
    community: 'കമ്മ്യൂണിറ്റി',
    map: 'മാപ്പ്'
  },
  Irish: {
    transformCity: 'Trasfhoirmigh do Chathair',
    reclaimNeglected: 'Aisghabh coirnéil neamhshuime. Déan spásanna uirbeacha amú ina bplotaí micrea-phobail bríomhara.',
    getStarted: 'Tosaigh',
    capture: 'Gabháil',
    captureDesc: 'Tóg grianghraf de spás nach n-úsáidtear agus scaoil bioráin.',
    discuss: 'Pléigh',
    discussDesc: 'Comhrá le comharsana, vótáil ar smaointe, agus léirshamhlú athruithe.',
    collaborate: 'Comhoibriú',
    collaborateDesc: 'Glaoch ar oibrithe deonacha agus ar mhic léinn chun cabhrú le tógáil.',
    welcomeBack: 'Fáilte Ar Ais',
    createAccount: 'Cruthaigh Cuntas',
    enterDetails: 'Cuir isteach do chuid sonraí chun rochtain a fháil ar do phlotaí.',
    email: 'Ríomhphost',
    password: 'Pasfhocal',
    signIn: 'Sínigh Isteach',
    signUp: 'Cláraigh',
    continueWithGoogle: 'Lean ar aghaidh le Google',
    alreadyHaveAccount: 'An bhfuil cuntas agat cheana? Sínigh Isteach',
    dontHaveAccount: "Nach bhfuil cuntas agat? Cláraigh",
    profile: 'Próifíl',
    settings: 'Socruithe',
    language: 'Teanga',
    logout: 'Logáil Amach',
    community: 'Pobal',
    map: 'Léarscáil'
  }
};

const INITIAL_PLOTS: Plot[] = [
  {
    id: '1',
    creatorId: 'other-1',
    title: "Overgrown patch near St. Patrick's",
    description: "Small triangular verge completely ignored. Full of weeds but gets great morning sun.",
    locationName: "Corner of Patrick St & Dean St",
    coordinates: { x: 30, y: 40 },
    imageUrl: "https://picsum.photos/800/600?random=1",
    status: PlotStatus.IDENTIFIED,
    tags: ["Good Sun", "Potential", "Messy"],
    ideas: ["wildflower garden", "bench"],
    existingPractices: ["Neighbors organize informal litter picks once a month"],
    comments: [
      { id: 'c1', author: 'Sarah', text: 'I walk past this every day. It could be lovely.', timestamp: Date.now() - 100000 },
    ],
    volunteerRequestSent: false,
    generatedImages: [],
    spottedBy: "Marie"
  },
  {
    id: '2',
    creatorId: 'other-2',
    title: "Empty planter box",
    description: "Old concrete planter that just collects trash now. Structurally sound.",
    locationName: "Meath Street",
    coordinates: { x: 60, y: 20 },
    imageUrl: "https://picsum.photos/800/600?random=2",
    status: PlotStatus.IDEAS_FORMING,
    tags: ["Small", "Quick Fix"],
    ideas: ["herbs", "community veggies"],
    existingPractices: ["DCC watered this last year, but stopped"],
    comments: [
      { id: 'c2', author: 'Mike', text: 'Does anyone have soil? I can bring seeds.', timestamp: Date.now() - 50000 }
    ],
    volunteerRequestSent: false,
    generatedImages: []
  },
  {
    id: '3',
    creatorId: 'other-3',
    title: "Walled alley space",
    description: "Safe enclosed space but currently a dumping ground.",
    locationName: "Off Thomas Ct",
    coordinates: { x: 75, y: 70 },
    imageUrl: "https://picsum.photos/800/600?random=3",
    status: PlotStatus.IN_PROGRESS,
    tags: ["Safety Issue", "Kids pass here"],
    ideas: ["mural", "play corner"],
    existingPractices: ["Children use this space as a shortcut to school"],
    comments: [],
    volunteerRequestSent: true,
    generatedImages: []
  }
];

const QUICK_TAGS = [
  'Safety Issue', 'Good Sun', 'Messy',
  'Kids pass here', 'Close to homes', 'Noisy',
  'Flood prone', 'Shaded', 'High footfall',
  'Wildlife', 'Potential Garden', 'Art Space',
  'Seating needed', 'Accessibility'
];

const PLOTS_STORAGE_KEY = 'spot_to_plot_plots_v1';

const loadPersistedPlots = (): Plot[] | null => {
  try {
    const raw = localStorage.getItem(PLOTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Plot[];
  } catch {
    return null;
  }
};

export default function App() {
  // Use imported AppStage type to resolve the "Cannot find name 'AppStage'" error
  const [appStage, setAppStage] = useState<AppStage>('SPLASH');
  const [view, setView] = useState<ViewState>('FEED');
  const [plots, setPlots] = useState<Plot[]>(() => {
    const persisted = loadPersistedPlots();
    return persisted && persisted.length > 0 ? persisted : INITIAL_PLOTS;
  });
  const [activePlot, setActivePlot] = useState<Plot | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'n1',
      title: 'Help Accepted! 🎉',
      message: 'NCAD Student Union has accepted your volunteer request for "Overgrown patch". They can help next Tuesday!',
      timestamp: Date.now() - 3600000,
      read: false,
      type: 'success',
      relatedPlotId: '1'
    }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Map View State
  const [mapPreviewPlot, setMapPreviewPlot] = useState<Plot | null>(null);

  // We are using Leaflet now to show the map
  const mapCenter: L.LatLngTuple = [53.338, -6.275];
  const mapBounds = {
    minLat: 53.338,
    maxLat: 53.350,
    minLng: -6.285,
    maxLng: -6.265
  };

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const projectLatLngToDemoXY = (lat: number, lng: number) => {
    const normalizedX = (lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng);
    const normalizedY = (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat);
    return {
      x: clamp(normalizedX * 100, 0, 100),
      y: clamp(normalizedY * 100, 0, 100)
    };
  };

  const resolvePlotLatLng = (plot: Plot): L.LatLngTuple => {
    if (typeof plot.coordinates.lat === 'number' && typeof plot.coordinates.lng === 'number') {
      return [plot.coordinates.lat, plot.coordinates.lng];
    }
    const lat = mapBounds.minLat + (plot.coordinates.y / 100) * (mapBounds.maxLat - mapBounds.minLat);
    const lng = mapBounds.minLng + (plot.coordinates.x / 100) * (mapBounds.maxLng - mapBounds.minLng);
    return [lat, lng];
  };

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const VoiceNotePlayer = ({ url, mine }: { url: string; mine: boolean }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const onLoadedMetadata = () => setDuration(audio.duration || 0);
      const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
      const onEnded = () => setIsPlaying(false);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      return () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
      };
    }, []);

    const togglePlay = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }
      await audio.play();
      setIsPlaying(true);
    };

    const scrub = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const nextTime = Number(e.target.value);
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    };

    return (
      <div className={`mt-3 rounded-2xl px-3 py-2.5 border ${mine ? 'bg-emerald-500/20 border-emerald-300/40' : 'bg-gray-50 border-gray-200'}`}>
        <audio ref={audioRef} src={url} preload="metadata" />
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${mine ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'}`}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={scrub}
              className="w-full accent-emerald-600"
            />
            <div className={`text-[10px] font-semibold ${mine ? 'text-emerald-700' : 'text-gray-500'}`}>
              {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Custom marker icons based on status
  const getMarkerIcon = (status: PlotStatus) => {
    let colorClass = 'hue-rotate-[140deg]'; // Default redish
    if (status === PlotStatus.IDEAS_FORMING) colorClass = 'hue-rotate-[20deg]'; // yellow
    if (status === PlotStatus.IN_PROGRESS) colorClass = 'hue-rotate-[280deg]'; // emerald/green
    if (status === PlotStatus.COMPLETED) colorClass = 'hue-rotate-0'; // blue

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg shadow-black/30 flex items-center justify-center bg-white"><img src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png" class="w-full h-full object-cover filter ${colorClass}" style="opacity: 0.8" /></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  };

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('English');

  const t = (key: string) => TRANSLATIONS[language][key] || key;

  // Form State
  const [newPlotTitle, setNewPlotTitle] = useState('');
  const [newPlotDesc, setNewPlotDesc] = useState('');
  const [newPlotLocation, setNewPlotLocation] = useState('');
  const [newPlotCoordinates, setNewPlotCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [newPlotImage, setNewPlotImage] = useState<string | null>(null);
  const [newPlotTags, setNewPlotTags] = useState<string[]>([]);
  const [newPlotPractices, setNewPlotPractices] = useState('');
  const [logOnBehalf, setLogOnBehalf] = useState(false);
  const [spottedByInput, setSpottedByInput] = useState('');

  // Location Input State
  const [locationMode, setLocationMode] = useState<'MANUAL' | 'GPS'>('MANUAL');
  const [isLocating, setIsLocating] = useState(false);

  // Detail View State
  const [commentText, setCommentText] = useState('');
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionA, setPollOptionA] = useState('');
  const [pollOptionB, setPollOptionB] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [visualizePrompt, setVisualizePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualizeStyle, setVisualizeStyle] = useState('Photorealistic');
  const [visualizeAspectRatio, setVisualizeAspectRatio] = useState('1:1');
  const [showAiOptions, setShowAiOptions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Volunteer Modal State
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [volunteerEmail, setVolunteerEmail] = useState('agirish421@gmail.com');
  const [volunteerMessage, setVolunteerMessage] = useState('');
  const [volunteerDate, setVolunteerDate] = useState('');
  const [volunteerTime, setVolunteerTime] = useState('');
  const [volunteerCount, setVolunteerCount] = useState('');
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  // Poster State
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [mapFocusTarget, setMapFocusTarget] = useState<L.LatLngTuple | null>(null);

  // --- LIFECYCLE ---
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      // Keep stage in sync with auth using functional updates to avoid stale closures.
      setAppStage((prevStage) => {
        if (user) return 'APP';
        if (prevStage === 'APP') return 'LOGIN';
        return prevStage;
      });
    });
    return () => {
      isMountedRef.current = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (appStage === 'SPLASH') {
      const timer = setTimeout(() => {
        setAppStage('ONBOARDING');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [appStage]);

  useEffect(() => {
    setMapPreviewPlot(null);
  }, [view]);

  useEffect(() => {
    if (!isRecordingAudio) return;
    const timer = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecordingAudio]);

  useEffect(() => {
    try {
      localStorage.setItem(PLOTS_STORAGE_KEY, JSON.stringify(plots));
    } catch {
      // Ignore storage write errors (private mode, quota exceeded, etc.)
    }
  }, [plots]);

  // --- HANDLERS ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginEmail || !loginPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
      setAppStage('APP');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAppStage('APP');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      setAppStage('LOGIN');
      setView('FEED');
    });
  };

  const handleOpenPlot = (plot: Plot) => {
    let updatedPlot = plot;
    if (plot.status === PlotStatus.IDENTIFIED) {
      updatedPlot = { ...plot, status: PlotStatus.IDEAS_FORMING };
      setPlots(prev => prev.map(p => p.id === updatedPlot.id ? updatedPlot : p));
    }
    setActivePlot(updatedPlot);
    setView('PLOT_DETAIL');
    setShowNotifications(false);
  };

  const handleAddPlot = () => {
    if (!newPlotTitle || !newPlotDesc || !newPlotLocation) {
      alert("Please fill in the title, description and location.");
      return;
    }
    if (locationMode === 'GPS' && !newPlotCoordinates) {
      alert("Please tap GPS Pin to capture your current location.");
      return;
    }

    const coordinates = locationMode === 'GPS' && newPlotCoordinates
      ? {
          ...projectLatLngToDemoXY(newPlotCoordinates.lat, newPlotCoordinates.lng),
          lat: newPlotCoordinates.lat,
          lng: newPlotCoordinates.lng
        }
      : { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 };

    const newPlot: Plot = {
      id: Date.now().toString(),
      creatorId: CURRENT_USER_ID,
      title: newPlotTitle,
      description: newPlotDesc,
      locationName: newPlotLocation,
      coordinates,
      imageUrl: newPlotImage || "https://picsum.photos/800/600?random=99",
      status: PlotStatus.IDENTIFIED,
      tags: newPlotTags.length > 0 ? newPlotTags : ["New"],
      ideas: [],
      existingPractices: newPlotPractices ? [newPlotPractices] : [],
      comments: [],
      volunteerRequestSent: false,
      generatedImages: [],
      spottedBy: logOnBehalf ? spottedByInput : undefined
    };

    setPlots(prev => [newPlot, ...prev]);
    if (locationMode === 'GPS' && newPlotCoordinates) {
      setMapPreviewPlot(newPlot);
      setMapFocusTarget([newPlotCoordinates.lat, newPlotCoordinates.lng]);
      setView('MAP');
    } else {
      setView('FEED');
    }
    setNewPlotTitle('');
    setNewPlotDesc('');
    setNewPlotLocation('');
    setNewPlotCoordinates(null);
    setNewPlotTags([]);
    setNewPlotImage(null);
    setNewPlotPractices('');
    setLogOnBehalf(false);
    setSpottedByInput('');
    setLocationMode('MANUAL');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPlotImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag: string) => {
    if (newPlotTags.includes(tag)) {
      setNewPlotTags(newPlotTags.filter(t => t !== tag));
    } else {
      if (newPlotTags.length >= 3) return;
      setNewPlotTags([...newPlotTags, tag]);
    }
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setNewPlotCoordinates({ lat, lng });
          setNewPlotLocation(`Pin at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setIsLocating(false);
        },
        () => {
          setTimeout(() => {
            const fallbackLat = 53.3438;
            const fallbackLng = -6.2546;
            setNewPlotCoordinates({ lat: fallbackLat, lng: fallbackLng });
            setNewPlotLocation(`Pin at ${fallbackLat.toFixed(5)}, ${fallbackLng.toFixed(5)}`);
            setIsLocating(false);
          }, 800);
        }
      );
    } else {
      setIsLocating(false);
      alert("Geolocation is not supported in this browser.");
    }
  };

  const appendCommentToActivePlot = (newComment: Comment) => {
    if (!activePlot) return;
    let newStatus = activePlot.status;
    if (activePlot.status === PlotStatus.IDEAS_FORMING) newStatus = PlotStatus.IN_PROGRESS;
    const updatedPlot = {
      ...activePlot,
      status: newStatus,
      comments: [...activePlot.comments, newComment]
    };
    updatePlot(updatedPlot);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
  };

  const handlePostComment = () => {
    if (!activePlot || !commentText.trim()) return;
    appendCommentToActivePlot({
      id: Date.now().toString(),
      author: CURRENT_USER_NAME,
      text: commentText.trim(),
      timestamp: Date.now()
    });
    setCommentText('');
    setShowAttachMenu(false);
  };

  const handleAttachDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePlot) return;
    const file = e.target.files?.[0];
    if (!file) return;
    appendCommentToActivePlot({
      id: Date.now().toString(),
      author: CURRENT_USER_NAME,
      text: file.name,
      timestamp: Date.now(),
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileUrl: URL.createObjectURL(file)
    });
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const handleAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePlot) return;
    const file = e.target.files?.[0];
    if (!file) return;
    appendCommentToActivePlot({
      id: Date.now().toString(),
      author: CURRENT_USER_NAME,
      text: commentText.trim() || 'Photo',
      timestamp: Date.now(),
      imageUrl: URL.createObjectURL(file)
    });
    setCommentText('');
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const handleAttachAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePlot) return;
    const file = e.target.files?.[0];
    if (!file) return;
    appendCommentToActivePlot({
      id: Date.now().toString(),
      author: CURRENT_USER_NAME,
      text: file.name,
      timestamp: Date.now(),
      audioUrl: URL.createObjectURL(file)
    });
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const handleToggleRecording = async () => {
    if (!activePlot) return;
    if (isRecordingAudio && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      setRecordingSeconds(0);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        appendCommentToActivePlot({
          id: Date.now().toString(),
          author: CURRENT_USER_NAME,
          text: 'Voice note',
          timestamp: Date.now(),
          audioUrl: URL.createObjectURL(audioBlob)
        });
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setRecordingSeconds(0);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
      setShowAttachMenu(false);
    } catch {
      alert('Microphone permission denied or unavailable.');
    }
  };

  const handleCreatePoll = () => {
    if (!activePlot) return;
    const question = pollQuestion.trim();
    const optionA = pollOptionA.trim();
    const optionB = pollOptionB.trim();
    if (!question || !optionA || !optionB) {
      alert('Please add a poll question and two options.');
      return;
    }
    appendCommentToActivePlot({
      id: Date.now().toString(),
      author: CURRENT_USER_NAME,
      text: 'Poll created',
      timestamp: Date.now(),
      poll: {
        question,
        options: [
          { label: optionA, votes: 0 },
          { label: optionB, votes: 0 }
        ]
      }
    });
    setShowPollComposer(false);
    setShowAttachMenu(false);
    setPollQuestion('');
    setPollOptionA('');
    setPollOptionB('');
  };

  const handleVoteOnPoll = (commentId: string, optionIndex: number) => {
    if (!activePlot) return;
    const updatedPlot = {
      ...activePlot,
      comments: activePlot.comments.map((comment) => {
        if (!comment.poll || comment.id !== commentId) return comment;
        return {
          ...comment,
          poll: {
            ...comment.poll,
            options: comment.poll.options.map((option, idx) =>
              idx === optionIndex ? { ...option, votes: option.votes + 1 } : option
            )
          }
        };
      })
    };
    updatePlot(updatedPlot);
  };

  const handleOpenVolunteerModal = () => {
    if (!activePlot) return;
    setVolunteerMessage(`Hey! We need help transforming a micro-plot at ${activePlot.locationName}.\n\nProject: ${activePlot.title}\nNeeds: ${activePlot.tags.join(', ')}\n\nCheck it out on Spot-to-Plot!`);
    setShowVolunteerModal(true);
    setOrgSearchQuery('');
    setSelectedOrgs([]);
    setVolunteerDate('');
    setVolunteerTime('');
    setVolunteerCount('');
  };

  const toggleOrgSelection = (orgName: string) => {
    if (selectedOrgs.includes(orgName)) {
      setSelectedOrgs(selectedOrgs.filter(o => o !== orgName));
    } else {
      setSelectedOrgs([...selectedOrgs, orgName]);
    }
  };

  const handleConfirmVolunteerRequest = () => {
    if (!activePlot) return;
    const updatedPlot = {
      ...activePlot,
      volunteerRequestSent: true,
      status: activePlot.status === PlotStatus.IDENTIFIED || activePlot.status === PlotStatus.IDEAS_FORMING
        ? PlotStatus.IN_PROGRESS
        : activePlot.status
    };
    const timeText = volunteerDate ? ` for ${volunteerDate}` : '';
    const sysComment: Comment = {
      id: Date.now().toString(),
      author: 'System',
      text: `📢 Volunteer request sent to ${volunteerEmail}${timeText}!`,
      timestamp: Date.now(),
      isSystem: true
    };
    updatedPlot.comments.push(sysComment);
    updatePlot(updatedPlot);
    setShowVolunteerModal(false);
  };

  const handleGenerateAI = async () => {
    if (!activePlot) return;
    setIsGenerating(true);
    try {
      const basePrompt = visualizePrompt || "A greener, cleaner version";
      const imageUrl = await generatePlotVisualization(
        activePlot.imageUrl,
        activePlot.description,
        activePlot.ideas,
        basePrompt,
        visualizeStyle,
        visualizeAspectRatio
      );
      let newStatus = activePlot.status;
      if (activePlot.status === PlotStatus.IDEAS_FORMING) newStatus = PlotStatus.IN_PROGRESS;
      const updatedPlot = {
        ...activePlot,
        status: newStatus,
        generatedImages: [imageUrl, ...activePlot.generatedImages]
      };
      updatedPlot.comments.push({
        id: Date.now().toString(),
        author: 'AI Assistant',
        text: `Here is a ${visualizeStyle.toLowerCase()} visualization for: "${basePrompt}"`,
        timestamp: Date.now(),
        isSystem: true,
        imageUrl: imageUrl,
        isAiGenerated: true
      });
      updatePlot(updatedPlot);
      setVisualizePrompt('');
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    } catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setIsGenerating(false); }
  };

  const handleMarkCompleted = () => {
    if (!activePlot) return;
    const updatedPlot = { ...activePlot, status: PlotStatus.COMPLETED };
    updatedPlot.comments.push({
      id: Date.now().toString(),
      author: 'System',
      text: '🏆 This plot has been marked as Completed! Great job everyone.',
      timestamp: Date.now(),
      isSystem: true
    });
    updatePlot(updatedPlot);
  };

  const updatePlot = (updated: Plot) => {
    setPlots(plots.map(p => p.id === updated.id ? updated : p));
    setActivePlot(updated);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handlePrintPoster = () => {
    window.print();
  };

  // --- RENDERERS ---

  const renderSplashScreen = () => (
    <div className="absolute inset-0 z-[60] bg-emerald-600 flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
      <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-sm mb-6 animate-pulse">
        <Sprout size={64} className="text-white drop-shadow-lg" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Spot-to-Plot</h1>
      <p className="text-emerald-100 font-medium tracking-widest uppercase text-xs">Collective</p>
    </div>
  );

  const renderOnboarding = () => (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-500">
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <Sprout size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('transformCity')}</h2>
        <p className="text-gray-500 mb-10 leading-relaxed">{t('reclaimNeglected')}</p>
        <div className="w-full space-y-6 text-left">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500"><Camera size={20} /></div>
            <div><h3 className="font-bold text-gray-900 text-sm">1. {t('capture')}</h3><p className="text-xs text-gray-500 mt-1">{t('captureDesc')}</p></div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="bg-white p-2 rounded-lg shadow-sm text-violet-500"><MessageSquare size={20} /></div>
            <div><h3 className="font-bold text-gray-900 text-sm">2. {t('discuss')}</h3><p className="text-xs text-gray-500 mt-1">{t('discussDesc')}</p></div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="bg-white p-2 rounded-lg shadow-sm text-orange-500"><HandHeart size={20} /></div>
            <div><h3 className="font-bold text-gray-900 text-sm">3. {t('collaborate')}</h3><p className="text-xs text-gray-500 mt-1">{t('collaborateDesc')}</p></div>
          </div>
        </div>
      </div>
      <div className="p-6 bg-white border-t border-gray-50">
        <Button onClick={() => setAppStage('LOGIN')} className="w-full shadow-emerald-200 shadow-lg">{t('getStarted')} <ArrowRight size={18} /></Button>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Sprout className="text-white" size={28} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{isSignUp ? t('createAccount') : t('welcomeBack')}</h2>
          <p className="text-gray-500 mt-2">{t('enterDetails')}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          {authError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{authError}</div>}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="email" required className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="name@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="password" required className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Enter password (min 6 chars)" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
            </div>
          </div>
          <div className="pt-4"><Button type="submit" className="w-full shadow-xl shadow-emerald-200/50 py-4 text-base">{isSignUp ? t('signUp') : t('signIn')}</Button></div>
          <div className="pt-2"><Button type="button" onClick={handleGoogleSignIn} variant="secondary" className="w-full shadow flex items-center justify-center gap-2 py-4 text-base">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            {t('continueWithGoogle')}
          </Button></div>
          <div className="text-center pt-2">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-emerald-600 font-semibold hover:underline">
              {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderNotifications = () => {
    if (!showNotifications) return null;
    return (
      <div className="absolute top-16 right-4 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-sm text-gray-700">Notifications</h3>
          {unreadCount > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
        </div>
        <div className="max-h-80 overflow-y-auto no-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No notifications yet.</div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer relative ${!n.read ? 'bg-emerald-50/30' : ''}`}
                onClick={() => handleDismissNotification(n.id)}
              >
                {!n.read && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500"></div>}
                <div className="flex gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {n.type === 'success' ? <CheckCircle size={14} /> : <MessageSquare size={14} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 leading-tight mb-1">{n.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed mb-1.5">{n.message}</p>
                    <span className="text-[10px] text-gray-400">{Math.floor((Date.now() - n.timestamp) / 60000)} mins ago</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderFab = () => {
    if (view === 'ADD_PLOT' || view === 'PLOT_DETAIL' || view === 'PROFILE') return null;
    if (view === 'MAP' && mapPreviewPlot) return null;
    return (
      <button onClick={() => setView('ADD_PLOT')} className="absolute bottom-24 right-6 w-14 h-14 bg-emerald-600 rounded-full shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform z-50 hover:bg-emerald-700">
        <Plus size={28} />
      </button>
    );
  };

  const renderNavBar = () => {
    if (view === 'PLOT_DETAIL' || view === 'ADD_PLOT' || view === 'PROFILE') return null;
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-gray-200 py-3 px-8 rounded-full shadow-xl z-40 flex items-center gap-12">
        <button onClick={() => setView('FEED')} className={`flex flex-col items-center transition-colors ${view === 'FEED' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Users size={24} /><span className="text-[10px] font-bold mt-1 uppercase tracking-wide">{t('community')}</span>
        </button>
        <button onClick={() => setView('MAP')} className={`flex flex-col items-center transition-colors ${view === 'MAP' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Map size={24} /><span className="text-[10px] font-bold mt-1 uppercase tracking-wide">{t('map')}</span>
        </button>
      </div>
    );
  };

  const renderFeed = () => (
    <div className="h-full flex flex-col bg-gray-50 relative">
      <header className="px-5 py-4 bg-white border-b border-gray-100 z-40 shrink-0 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20"><Sprout className="text-white" size={22} /></div>
          <div><h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Spot-to-Plot</h1><span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">The Liberties</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-gray-50 transition-colors relative" onClick={() => setShowNotifications(!showNotifications)}><Bell size={24} className="text-gray-400" strokeWidth={1.5} />{unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</button>
          <button className="p-1 rounded-full hover:bg-gray-50 transition-colors" onClick={() => setView('PROFILE')} title="Profile"><CircleUser size={28} className="text-gray-400" strokeWidth={1.5} /></button>
        </div>
      </header>
      {renderNotifications()}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-32" onClick={() => setShowNotifications(false)}>
        <div className="max-w-lg mx-auto space-y-4">{plots.map(plot => <PlotCard key={plot.id} plot={plot} onClick={handleOpenPlot} />)}</div>
      </div>
    </div>
  );

  // A component to handle programmatic map zooming and panning
  const MapContent = ({ plots, getMarkerIcon, setMapPreviewPlot }: any) => {
    const map = useMap();

    return (
      <>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {plots.map((plot: Plot) => {
          // Calculate realistic lat/long mapping (simulating an area in Dublin based on the random x/y)
          const [lat, lng] = resolvePlotLatLng(plot);

          return (
            <Marker
              key={plot.id}
              position={[lat, lng]}
              icon={getMarkerIcon(plot.status)}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation();
                  setMapPreviewPlot(plot);
                  map.flyTo([lat, lng], 17, {
                    animate: true,
                    duration: 1.5
                  });
                }
              }}
            />
          );
        })}
      </>
    );
  };

  const MapClickHandler = ({ onMapClick }: { onMapClick: () => void }) => {
    useMapEvents({
      click: () => onMapClick()
    });
    return null;
  };

  const MapFocusController = ({ target }: { target: L.LatLngTuple | null }) => {
    const map = useMap();
    useEffect(() => {
      if (!target) return;
      map.flyTo(target, 17, { animate: true, duration: 1.2 });
    }, [map, target]);
    return null;
  };

  const renderMap = () => (
    <div className="h-full w-full relative bg-gray-100 z-0">
      <MapContainer
        center={mapCenter}
        zoom={14}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapClickHandler onMapClick={() => setMapPreviewPlot(null)} />
        <MapFocusController target={mapFocusTarget} />
        <MapContent
          plots={plots}
          getMarkerIcon={getMarkerIcon}
          setMapPreviewPlot={setMapPreviewPlot}
        />
      </MapContainer>

      {/* Map Preview Overlay */}
      {mapPreviewPlot && (
        <div className="absolute bottom-28 left-4 right-4 rounded-[36px] bg-white/85 backdrop-blur-sm p-2.5 shadow-[0_18px_35px_rgba(15,23,42,0.16)] z-[1000]" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-3 items-center rounded-3xl bg-white p-2.5 shadow-sm">
            <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100">
              <img src={mapPreviewPlot.imageUrl} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-2">
              <div className="min-w-0">
                <h3 className="font-extrabold text-base text-gray-900 leading-tight truncate">{mapPreviewPlot.title}</h3>
                <p className="mt-0.5 text-sm text-gray-500 flex items-center gap-1 truncate">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  {mapPreviewPlot.locationName}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-3 py-1 bg-gray-100 rounded-full text-gray-600 uppercase tracking-wide">
                  {mapPreviewPlot.status.replace(/_/g, ' ')}
                </span>
                <button onClick={() => handleOpenPlot(mapPreviewPlot)} className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-1 hover:bg-emerald-700">
                  View
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPosterModal = () => {
    if (!showPosterModal || !activePlot) return null;
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm print:hidden">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-200">
          <button onClick={() => setShowPosterModal(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
          <div className="p-8 overflow-y-auto no-scrollbar" id="printable-poster">
            <div className="border-[12px] border-emerald-600 p-8 min-h-[600px] flex flex-col items-center text-center font-sans bg-white">
              <div className="bg-emerald-600 text-white px-6 py-2 rounded-full font-black text-xl mb-6 tracking-tighter uppercase">Spot-to-Plot Project</div>
              <h2 className="text-4xl font-black text-gray-900 mb-2 leading-none">{activePlot.title}</h2>
              <div className="flex items-center text-emerald-600 gap-1 font-bold text-lg mb-8 uppercase tracking-widest"><MapPin size={24} /> {activePlot.locationName}</div>

              <div className="w-full h-64 rounded-2xl overflow-hidden mb-8 shadow-xl border-4 border-emerald-100">
                <img src={activePlot.imageUrl} className="w-full h-full object-cover" />
              </div>

              <p className="text-xl text-gray-600 font-medium leading-relaxed mb-10 italic">"Something beautiful is happening here. Join your neighbors in transforming this neglected corner into a vibrant community micro-plot."</p>

              <div className="flex flex-col items-center gap-4 bg-gray-50 p-6 rounded-3xl w-full border-2 border-dashed border-gray-200">
                <div className="bg-white p-4 rounded-2xl shadow-md">
                  <QrCode size={120} className="text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-lg uppercase">Scan to Join the Room</h4>
                  <p className="text-gray-500 text-sm font-semibold">See ideas, vote, and volunteer online.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
            <Button onClick={handlePrintPoster} className="flex-1 bg-emerald-600"><Printer size={20} /> Print Poster</Button>
            <Button variant="secondary" onClick={() => setShowPosterModal(false)} className="flex-1">Close</Button>
          </div>
        </div>

        <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-poster, #printable-poster * { visibility: visible; }
                    #printable-poster { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; padding: 0; margin: 0; border: none; }
                }
            `}</style>
      </div>
    );
  };

  const renderAddPlot = () => (
    <div className="p-4 h-full bg-white flex flex-col max-w-lg mx-auto">
      <div className="flex items-center mb-6"><button onClick={() => setView('FEED')} className="p-2 -ml-2 text-gray-600"><X /></button><h2 className="text-xl font-bold ml-2">Capture a Plot</h2></div>
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
        <div className="space-y-2">
          <label className="block font-bold text-[10px] uppercase text-gray-400 tracking-widest">Photo</label>
          <div className="h-48 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group" onClick={() => document.getElementById('plot-upload')?.click()}>
            {newPlotImage ? <img src={newPlotImage} className="absolute inset-0 w-full h-full object-cover" /> : <><Camera size={32} className="mb-2 text-gray-300" /><span className="text-sm text-gray-400 font-medium">Tap to take photo</span></>}
            <input id="plot-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>
        <div className="space-y-4">
          <div><label className="block font-bold text-[10px] uppercase text-gray-400 tracking-widest mb-1">Brief Description</label><input type="text" placeholder="e.g. Wasted corner near X street" className="w-full p-4 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-medium" value={newPlotTitle} onChange={(e) => setNewPlotTitle(e.target.value)} /></div>
          <div><label className="block font-bold text-[10px] uppercase text-gray-400 tracking-widest mb-1">Details & Context</label><textarea rows={2} placeholder="Describe the issues or potential..." className="w-full p-4 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none font-medium" value={newPlotDesc} onChange={(e) => setNewPlotDesc(e.target.value)} /></div>

          <div>
            <label className="block font-bold text-[10px] uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1"><Repeat size={10} /> What we already do here</label>
            <input
              type="text"
              placeholder="e.g. Residents organize cleanups..."
              className="w-full p-4 bg-amber-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all outline-none font-medium placeholder:text-amber-300 text-amber-900"
              value={newPlotPractices}
              onChange={(e) => setNewPlotPractices(e.target.value)}
            />
          </div>

          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm"><UserPlus size={18} /> Log on behalf of someone?</div>
              <button
                onClick={() => setLogOnBehalf(!logOnBehalf)}
                className={`w-10 h-6 rounded-full transition-colors relative ${logOnBehalf ? 'bg-emerald-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${logOnBehalf ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            {logOnBehalf && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="text"
                  placeholder="Who spotted this? (e.g. Marie)"
                  className="w-full p-3 bg-white border-2 border-emerald-100 rounded-xl outline-none focus:border-emerald-500 text-sm font-semibold text-emerald-900"
                  value={spottedByInput}
                  onChange={(e) => setSpottedByInput(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-[10px] uppercase text-gray-400 tracking-widest mb-2">Location</label>
            <div className="bg-gray-50 p-1.5 rounded-xl mb-3 flex gap-1">
              <button
                onClick={() => {
                  setLocationMode('MANUAL');
                  setNewPlotCoordinates(null);
                  setNewPlotLocation('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${locationMode === 'MANUAL' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                Address
              </button>
              <button
                onClick={() => {
                  setLocationMode('GPS');
                  setNewPlotLocation('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${locationMode === 'GPS' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                GPS Pin
              </button>
            </div>
            {locationMode === 'MANUAL' ? (
              <input
                type="text"
                placeholder="Street name, landmark..."
                className="w-full p-4 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-medium"
                value={newPlotLocation}
                onChange={e => setNewPlotLocation(e.target.value)}
              />
            ) : (
              <button
                onClick={handleGetLocation}
                className={`w-full py-4 border-2 border-dashed rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${newPlotCoordinates ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
              >
                {isLocating ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Navigation size={18} />}
                {newPlotCoordinates ? `Pin at ${newPlotCoordinates.lat.toFixed(5)}, ${newPlotCoordinates.lng.toFixed(5)}` : "Tap to Drop Pin"}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="pt-4 mt-auto"><Button onClick={handleAddPlot} className="w-full py-4 text-lg font-bold">Create Room</Button></div>
    </div>
  );

  const renderPlotDetail = () => {
    if (!activePlot) return null;
    const isOwner = activePlot.creatorId === CURRENT_USER_ID;
    const isInProgress = activePlot.status === PlotStatus.IN_PROGRESS;

    return (
      <div className="flex flex-col h-full bg-white max-w-lg mx-auto relative overflow-hidden">
        {renderVolunteerModal()}
        {renderPosterModal()}

        <div className="relative h-64 shrink-0 bg-gray-900">
          <img src={activePlot.imageUrl} alt="Plot" className={`w-full h-full object-cover opacity-90 ${activePlot.status === PlotStatus.COMPLETED ? 'grayscale-[50%]' : ''}`} />
          <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent z-20">
            <button onClick={() => setView('FEED')} className="text-white p-2 rounded-xl bg-black/20 backdrop-blur"><ChevronLeft size={24} /></button>
            {isOwner && activePlot.status !== PlotStatus.COMPLETED && (
              <button
                onClick={handleMarkCompleted}
                className="px-3 py-2 rounded-xl bg-white/85 text-gray-800 border border-white/60 backdrop-blur font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-white"
              >
                Project Completed
              </button>
            )}
          </div>
          {activePlot.status === PlotStatus.COMPLETED && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
              <div className="bg-white px-8 py-4 rounded-2xl shadow-2xl flex flex-col items-center transform rotate-[-3deg]">
                <CheckCircle className="text-blue-500 w-12 h-12 mb-2" /><span className="text-2xl font-black text-gray-800 uppercase tracking-widest">Completed</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50" ref={scrollRef}>
          <div className="p-6 bg-white mb-2 shadow-sm relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                Spotted by: {activePlot.spottedBy || (isOwner ? "Me" : "Resident")}
              </div>
              {activePlot.spottedBy && (
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <ArrowRight size={10} /> Logged by: {isOwner ? "Me" : "Ashwin"}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight leading-none">{activePlot.title}</h1>
            <p className="text-gray-400 text-sm font-bold flex items-center mb-4 uppercase tracking-wider"><MapPin size={14} className="mr-1" /> {activePlot.locationName}</p>
            <p className="text-gray-700 leading-relaxed mb-6 font-medium">{activePlot.description}</p>

            {/* FOREGROUNDING PRACTICES SECTION */}
            {activePlot.existingPractices && activePlot.existingPractices.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 shadow-sm">
                <div className="flex items-center gap-2 text-amber-800 font-black text-[10px] uppercase tracking-widest mb-2">
                  <Repeat size={12} /> What we already do here
                </div>
                {activePlot.existingPractices.map((practice, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                      <Info size={12} className="text-amber-500" />
                    </div>
                    <p className="text-xs font-bold text-amber-900 leading-relaxed italic">"{practice}"</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={activePlot.volunteerRequestSent ? undefined : handleOpenVolunteerModal}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${activePlot.volunteerRequestSent ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-emerald-50 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
              >
                <Users size={24} className={activePlot.volunteerRequestSent ? "text-emerald-700" : "text-emerald-600"} />
                <span className="text-xs font-black uppercase tracking-widest">{activePlot.volunteerRequestSent ? 'Requested' : 'Request Help'}</span>
              </button>

              <button
                onClick={() => setShowAiOptions(!showAiOptions)}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${showAiOptions ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-violet-50 text-violet-600 hover:border-violet-100 hover:bg-violet-50/30'}`}
              >
                <Sparkles size={24} />
                <span className="text-xs font-black uppercase tracking-widest">Visualize</span>
              </button>
            </div>

            {isInProgress && (
              <div className="mb-6 animate-in slide-in-from-right-4 duration-300">
                <button
                  onClick={() => setShowPosterModal(true)}
                  className="w-full bg-gradient-to-r from-orange-400 to-amber-500 p-4 rounded-2xl text-white shadow-lg shadow-orange-200 flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform"><QrCode size={24} /></div>
                    <div className="text-left">
                      <h4 className="font-black text-sm uppercase leading-none mb-1">Print Project Poster</h4>
                      <p className="text-xs font-bold opacity-90">Spread the word with a QR code!</p>
                    </div>
                  </div>
                  <Download size={20} />
                </button>
              </div>
            )}

            {showAiOptions && (
              <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl mb-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-violet-800 text-xs uppercase tracking-widest">AI Visualization</span>
                  <button onClick={() => setShowAiOptions(false)} className="text-violet-400 hover:text-violet-600"><X size={18} /></button>
                </div>
                <div className="relative mb-4">
                  <input type="text" value={visualizePrompt} onChange={(e) => setVisualizePrompt(e.target.value)} placeholder="e.g. urban garden with solar lights..." className="w-full p-4 pr-12 bg-white rounded-xl border-none shadow-sm text-sm font-bold focus:ring-2 focus:ring-violet-300 outline-none" />
                  <button onClick={handleGenerateAI} disabled={isGenerating} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">{isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={18} />}</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={visualizeStyle} onChange={(e) => setVisualizeStyle(e.target.value)} className="bg-white p-3 rounded-lg text-xs font-bold text-violet-800 shadow-sm outline-none border-none"><option value="Photorealistic">Realistic</option><option value="Sketch">Sketch</option><option value="Nature-Takeover">Nature</option></select>
                  <select value={visualizeAspectRatio} onChange={(e) => setVisualizeAspectRatio(e.target.value)} className="bg-white p-3 rounded-lg text-xs font-bold text-violet-800 shadow-sm outline-none border-none"><option value="1:1">1:1 Square</option><option value="16:9">16:9 Wide</option></select>
                </div>
              </div>
            )}

          </div>

          <div className="p-6">
            <h3 className="font-black text-gray-900 text-lg mb-6 uppercase tracking-tight">Room Discussion</h3>
            <div className="space-y-6 mb-12">
              {activePlot.comments.map(comment => {
                const isAi = comment.isAiGenerated;
                const isMe = comment.author === CURRENT_USER_NAME;
                const isSystemText = comment.isSystem && !isAi;
                return (
                  <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                    <div className={`max-w-[85%] rounded-3xl overflow-hidden relative shadow-sm ${isSystemText ? 'bg-blue-50 text-blue-800 text-xs w-full text-center py-2 px-4 rounded-xl border border-blue-100 font-bold' : isAi ? 'bg-white border border-violet-100 rounded-bl-none' : isMe ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-gray-100 rounded-bl-none'}`}>
                      {comment.imageUrl && (
                        <div className="relative w-full h-48 bg-gray-100 group">
                          <img src={comment.imageUrl} className="w-full h-full object-cover" />
                          {isAi && (
                            <div className="absolute top-2 left-2 bg-violet-600/90 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm z-10"><Sparkles size={10} /> AI Generated</div>
                          )}
                          <div className="absolute bottom-2 right-2 flex gap-2 z-10 sm:opacity-0 opacity-100 group-hover:opacity-100 transition-opacity"><button onClick={() => window.open(comment.imageUrl, '_blank')} className="p-2 bg-black/40 text-white rounded-full backdrop-blur-md border border-white/20"><ExternalLink size={14} /></button></div>
                        </div>
                      )}
                      <div className="p-4">
                        {!isSystemText && !isMe && <div className={`text-[10px] font-black mb-1 uppercase tracking-widest ${isAi ? 'text-violet-600' : 'text-gray-400'}`}>{comment.author}</div>}
                        <p className={`text-sm ${isMe ? 'font-medium' : 'font-semibold text-gray-800'}`}>{comment.text}</p>
                        {comment.audioUrl && <VoiceNotePlayer url={comment.audioUrl} mine={isMe} />}
                        {comment.fileUrl && comment.fileName && (
                          <div className="mt-3">
                            <a
                              href={comment.fileUrl}
                              download={comment.fileName}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-xs font-bold text-gray-700 border border-gray-200"
                            >
                              <Paperclip size={12} />
                              {comment.fileName}
                            </a>
                          </div>
                        )}
                        {comment.poll && (
                          <div className="mt-3 bg-white/80 border border-gray-200 rounded-xl p-3">
                            <p className="text-xs font-black text-gray-700 uppercase tracking-widest mb-2">{comment.poll.question}</p>
                            <div className="space-y-2">
                              {comment.poll.options.map((option, idx) => (
                                <button
                                  key={`${comment.id}-${idx}`}
                                  onClick={() => handleVoteOnPoll(comment.id, idx)}
                                  className="w-full flex justify-between items-center px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700"
                                >
                                  <span>{option.label}</span>
                                  <span>{option.votes}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#f0f2f5] border-t border-gray-200 relative">
          {showAttachMenu && (
            <div className="absolute bottom-[70px] left-3 right-3 bg-white rounded-2xl border border-gray-200 shadow-2xl p-3 z-20">
              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Camera size={18} /></span>
                  Camera
                </button>
                <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><ImageIcon size={18} /></span>
                  Gallery
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-11 h-11 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center"><FileText size={18} /></span>
                  Document
                </button>
                <button onClick={() => audioFileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-11 h-11 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><Music2 size={18} /></span>
                  Audio
                </button>
              </div>
              <button onClick={() => { setShowAttachMenu(false); setShowPollComposer(true); }} className="w-full mt-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 flex items-center justify-center gap-2">
                <BarChart3 size={16} />
                Create Poll
              </button>
            </div>
          )}

          {showPollComposer && (
            <div className="mb-3 p-3 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
              <input
                type="text"
                placeholder="Ask a question"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
              <input
                type="text"
                placeholder="Option 1"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={pollOptionA}
                onChange={(e) => setPollOptionA(e.target.value)}
              />
              <input
                type="text"
                placeholder="Option 2"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={pollOptionB}
                onChange={(e) => setPollOptionB(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleCreatePoll} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">Send Poll</button>
                <button onClick={() => setShowPollComposer(false)} className="px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachDocument} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAttachImage} />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleAttachImage} />
          <input ref={audioFileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAttachAudioFile} />

          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-3xl bg-white border border-gray-200 px-3 py-2 flex items-center gap-2 min-h-11">
              <Smile size={18} className="text-gray-400 shrink-0" />
              {isRecordingAudio ? (
                <div className="flex-1 flex items-center justify-between text-sm font-semibold text-red-600">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />Recording audio</span>
                  <span>{formatDuration(recordingSeconds)}</span>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Message"
                  className="flex-1 text-sm font-semibold outline-none bg-transparent"
                  value={commentText}
                  onFocus={() => setShowAttachMenu(false)}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                />
              )}
              <button onClick={() => setShowAttachMenu((prev) => !prev)} className="text-gray-400 shrink-0" aria-label="Open attachments">
                <Paperclip size={18} />
              </button>
              <button onClick={() => cameraInputRef.current?.click()} className="text-gray-400 shrink-0" aria-label="Open camera">
                <Camera size={18} />
              </button>
            </div>

            <button
              onClick={commentText.trim() ? handlePostComment : handleToggleRecording}
              className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg ${isRecordingAudio ? 'bg-red-500' : 'bg-emerald-600'}`}
              aria-label={commentText.trim() ? 'Send message' : (isRecordingAudio ? 'Stop recording' : 'Record audio')}
            >
              {commentText.trim() ? <Send size={20} /> : isRecordingAudio ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="h-full flex flex-col bg-gray-50 animate-in slide-in-from-right duration-300">
      <header className="px-5 py-4 bg-white border-b border-gray-100 z-40 shrink-0 flex items-center gap-4 shadow-sm">
        <button onClick={() => setView('FEED')} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition-colors"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('profile')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto p-6 space-y-6">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-sm border border-gray-100">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-4 relative ring-4 ring-white shadow-lg">
              <CircleUser size={64} className="text-emerald-600" strokeWidth={1} />
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{currentUser?.email?.split('@')[0] || 'User'}</h2>
            <p className="text-sm text-gray-400 font-medium mb-6">{currentUser?.email || 'user@example.com'}</p>
            <div className="flex gap-4 w-full">
              <div className="flex-1 bg-gray-50 py-3 rounded-2xl">
                <div className="text-lg font-bold text-gray-900">12</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spots</div>
              </div>
              <div className="flex-1 bg-gray-50 py-3 rounded-2xl">
                <div className="text-lg font-bold text-gray-900">4</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plots</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><SlidersHorizontal size={14} /> {t('settings')}</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><Globe size={18} className="text-gray-400" /> {t('language')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['English', 'Malayalam', 'Irish'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${language === lang ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}
                    >
                      <span className="font-bold">{lang}</span>
                      {language === lang && <CheckCircle size={18} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors active:scale-95"
                >
                  <LogOut size={18} />
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVolunteerModal = () => {
    if (!showVolunteerModal || !activePlot) return null;
    return (
      <div className="absolute inset-0 z-[120] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-white rounded-[24px] border border-gray-200 shadow-[0_24px_60px_rgba(2,8,23,0.35)] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          <div className="h-16 px-5 bg-emerald-600 text-white flex justify-between items-center">
            <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2"><Users size={19} /> Call for Help</h3>
            <button onClick={() => setShowVolunteerModal(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={20} /></button>
          </div>
          <div className="p-5 space-y-4 max-h-[calc(100dvh-8rem)] overflow-y-auto no-scrollbar">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.18em] mb-2">Target Email</label>
              <input type="email" value={volunteerEmail} onChange={(e) => setVolunteerEmail(e.target.value)} className="h-14 w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 text-base font-semibold outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.18em] mb-2">People Needed</label>
              <input type="number" min="1" placeholder="How many? (e.g. 5)" value={volunteerCount} onChange={(e) => setVolunteerCount(e.target.value)} className="h-14 w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 text-base font-semibold outline-none focus:border-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.18em] mb-2">Date</label>
                <input type="date" value={volunteerDate} onChange={(e) => setVolunteerDate(e.target.value)} className="h-14 w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 text-sm font-semibold outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.18em] mb-2">Time</label>
                <input type="time" value={volunteerTime} onChange={(e) => setVolunteerTime(e.target.value)} className="h-14 w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 text-sm font-semibold outline-none focus:border-emerald-500" />
              </div>
            </div>
            <Button onClick={handleConfirmVolunteerRequest} className="w-full h-14 text-base font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20">Send Help Request</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveStage = () => {
    if (appStage === 'SPLASH') return renderSplashScreen();
    if (appStage === 'ONBOARDING') return renderOnboarding();
    if (appStage === 'LOGIN') return renderLogin();
    return (
      <>
        {view === 'FEED' && renderFeed()}
        {view === 'MAP' && renderMap()}
        {view === 'ADD_PLOT' && renderAddPlot()}
        {view === 'PLOT_DETAIL' && renderPlotDetail()}
        {view === 'PROFILE' && renderProfile()}
        {renderFab()}
        {renderNavBar()}
      </>
    );
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-100">
      <div className="relative h-full w-full max-w-md mx-auto bg-white sm:shadow-2xl sm:rounded-3xl overflow-hidden">
        {renderActiveStage()}
      </div>
    </div>
  );
}
