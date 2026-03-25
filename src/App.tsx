import React, { useState, useEffect, useCallback, Component } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Code2, 
  Play, 
  Download, 
  Copy, 
  RotateCcw, 
  Monitor, 
  Smartphone, 
  Tablet,
  Layout,
  Moon,
  Sun,
  FileCode,
  Hash,
  FileJson,
  Share2,
  LogIn,
  LogOut,
  User as UserIcon,
  ExternalLink,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { auth, db, googleProvider, signInWithPopup, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs,
  setDoc,
  doc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';

import { Toaster, toast } from 'sonner';
import confetti from 'canvas-confetti';

type Tab = 'html' | 'css' | 'js';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
</head>
<body>
  <div class="container">
    <h1>Hello World!</h1>
    <p>Welcome to your new project. Start coding here!</p>
    <button id="click-me">Click Me</button>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `body {
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  background-color: #f0f2f5;
  color: #1c1e21;
}

.container {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #ff007f;
  margin-bottom: 1rem;
}

button {
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  font-weight: bold;
  background-color: #ff007f;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:hover {
  opacity: 0.9;
}
`;

const DEFAULT_JS = `const button = document.getElementById('click-me');

button.addEventListener('click', () => {
  alert('Hello! You clicked the button.');
});`;

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full p-10 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-anime-pink/20 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="p-4 bg-anime-pink/10 rounded-2xl mb-6 border border-anime-pink/20">
                <RotateCcw className="w-10 h-10 text-anime-pink" />
              </div>
              <h1 className="text-3xl font-display tracking-tight mb-3">System <span className="text-anime-pink italic">Error</span></h1>
              <p className="text-slate-400 text-sm mb-8">An unexpected error occurred. Our engineers have been notified. Please try refreshing the workspace.</p>
              
              <div className="w-full bg-slate-950/50 p-5 rounded-2xl border border-slate-800 mb-8 overflow-hidden">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 text-left">Error Details</p>
                <pre className="text-[11px] font-mono text-anime-blue overflow-auto max-h-32 text-left">
                  {this.state.error?.message || String(this.state.error)}
                </pre>
              </div>

              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-anime-pink hover:bg-anime-pink/90 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-anime-pink/20 transition-all active:scale-95"
              >
                Reload Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error('Permission Error: Please check if you are logged in or if the project name is valid.');
  throw new Error(JSON.stringify(errInfo));
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [js, setJs] = useState(DEFAULT_JS);
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('html');
  const [srcDoc, setSrcDoc] = useState('');
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isViewMode, setIsViewMode] = useState(false);
  
  // Firebase State
  const [user, setUser] = useState<User | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [freeAttempts, setFreeAttempts] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('free_attempts') || '0');
    }
    return 0;
  });

  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Check for project in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    const slugParam = params.get('s');
    const view = params.get('view');
    
    if (view === 'true') {
      setIsViewMode(true);
    }
    
    if (projectId) {
      setCurrentProjectId(projectId);
      loadProject(projectId);
      setShowLanding(false);
    } else if (slugParam) {
      loadProjectBySlug(slugParam);
      setShowLanding(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProjects([]);
      return;
    }

    const q = query(
      collection(db, 'projects'),
      where('authorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
        return dateB.getTime() - dateA.getTime();
      });
      setUserProjects(projects);
    }, (error) => {
      console.error("Error fetching projects:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Load draft on login
  useEffect(() => {
    if (user) {
      const loadDraft = async () => {
        try {
          const draftRef = doc(db, 'drafts', user.uid);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data();
            // Only load if current editors are default
            if (html === DEFAULT_HTML && css === DEFAULT_CSS && js === DEFAULT_JS) {
              setHtml(data.html);
              setCss(data.css);
              setJs(data.js);
              toast.info("Draft loaded from your last session!");
            }
          }
        } catch (error) {
          console.error("Error loading draft:", error);
        }
      };
      loadDraft();
    }
  }, [user]);

  // Autosave
  useEffect(() => {
    if (!user) return;
    
    const timeout = setTimeout(async () => {
      // Don't save if it's the default code
      if (html === DEFAULT_HTML && css === DEFAULT_CSS && js === DEFAULT_JS) return;

      setIsSavingDraft(true);
      try {
        await setDoc(doc(db, 'drafts', user.uid), {
          html,
          css,
          js,
          authorId: user.uid,
          updatedAt: serverTimestamp()
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error("Autosave failed:", error);
      } finally {
        setIsSavingDraft(false);
      }
    }, 5000); // Save after 5 seconds of inactivity

    return () => clearTimeout(timeout);
  }, [html, css, js, user]);

  const loadProjectBySlug = async (slug: string) => {
    setIsLoadingProject(true);
    try {
      const q = query(collection(db, 'projects'), where('slug', '==', slug), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        setHtml(data.html);
        setCss(data.css);
        setJs(data.js);
        setProjectName(data.projectName || '');
        setCurrentProjectId(docSnap.id);
        setUserSlug(data.slug);
      } else {
        toast.error("Project not found with this slug.");
      }
    } catch (error) {
      console.error("Error loading project by slug:", error);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const loadProject = async (id: string) => {
    setIsLoadingProject(true);
    try {
      const docRef = doc(db, 'projects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHtml(data.html);
        setCss(data.css);
        setJs(data.js);
        setProjectName(data.projectName || '');
        setCurrentProjectId(id);
      }
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const updatePreview = useCallback(() => {
    const combined = `
      <html>
        <style>${css}</style>
        <body>
          ${html}
          <script>${js}<\/script>
        </body>
      </html>
    `;
    setSrcDoc(combined);
  }, [html, css, js]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      updatePreview();
    }, 500);
    return () => clearTimeout(timeout);
  }, [html, css, js, updatePreview]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileLayout, setMobileLayout] = useState<'editor' | 'split' | 'preview'>('split');

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        toast.success(`Mar7ba bik ${result.user.displayName}!`, {
          description: "You are now logged in with Google."
        });
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error("Popup blocked! Please allow popups for this site to login.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const [projectName, setProjectName] = useState('');
  const [isNaming, setIsNaming] = useState(false);
  const [userSlug, setUserSlug] = useState('');

  const handlePublishClick = () => {
    if (!user) {
      if (freeAttempts >= 2) {
        toast.error("khonaa f lah dir login ila baghi tstafde", {
          description: "You've used your 2 free trial attempts.",
          duration: 5000,
        });
        handleLogin();
        return;
      }
      toast.info(`Free Trial: ${2 - freeAttempts} attempts left!`, {
        description: "Login to save unlimited projects and see them in your dashboard later."
      });
    }
    setIsNaming(true);
    if (!userSlug) {
      // Auto-generate a slug based on project name if it exists, otherwise random
      const initialSlug = projectName 
        ? projectName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : Math.random().toString(36).substring(7);
      setUserSlug(initialSlug);
    }
  };

  const handleConfirmPublish = async () => {
    if (!projectName.trim()) {
      toast.error("Veuillez donner un nom à votre projet");
      return;
    }
    if (!userSlug.trim()) {
      toast.error("Veuillez donner un slug à votre projet");
      return;
    }

    setIsNaming(false);
    setIsPublishing(true);
    
    const path = 'projects';
    try {
      // Check if slug is already taken (if changed from original)
      const q = query(collection(db, 'projects'), where('slug', '==', userSlug), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty && querySnapshot.docs[0].id !== currentProjectId) {
        toast.error("This slug is already taken. Please choose another one.");
        setIsNaming(true);
        setIsPublishing(false);
        return;
      }

      const payload = {
        html,
        css,
        js,
        projectName: projectName.trim(),
        authorId: user ? user.uid : 'guest',
        authorName: user ? user.displayName || 'Anonymous' : 'Guest User',
        isGuest: !user,
        createdAt: serverTimestamp(),
        slug: userSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      };

      const docRef = await addDoc(collection(db, path), payload);
      setCurrentProjectId(docRef.id);
      
      if (!user) {
        const newCount = freeAttempts + 1;
        setFreeAttempts(newCount);
        localStorage.setItem('free_attempts', newCount.toString());
      }

      const url = `${window.location.origin}${window.location.pathname}?s=${payload.slug}&view=true`;
      setPublishedUrl(url);
      
      // Trigger confetti for successful publish
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff007f', '#00ffff', '#9d00ff', '#ffffff']
      });

      toast.success('Project published successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsPublishing(false);
    }
  };

  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      
      // Trigger confetti effect
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff007f', '#00ffff', '#9d00ff', '#ffffff']
      });

      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveLinkFile = () => {
    if (publishedUrl) {
      const element = document.createElement("a");
      const file = new Blob([`Project: ${projectName}\nLink: ${publishedUrl}`], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${projectName.replace(/\s+/g, '_')}_link.txt`;
      document.body.appendChild(element);
      element.click();
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([srcDoc], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = "index.html";
    document.body.appendChild(element);
    element.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(srcDoc);
    
    // Small confetti for code copy
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.8 },
      colors: ['#ff007f', '#00ffff']
    });

    toast.success("Code copied to clipboard!");
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all code?')) {
      setHtml(DEFAULT_HTML);
      setCss(DEFAULT_CSS);
      setJs(DEFAULT_JS);
    }
  };

  if (isViewMode) {
    return (
      <div className="w-screen h-screen bg-white">
        {isLoadingProject ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-lg font-medium text-gray-900">Loading Project...</p>
          </div>
        ) : (
          <iframe
            srcDoc={srcDoc}
            title="preview"
            sandbox="allow-scripts"
            frameBorder="0"
            width="100%"
            height="100%"
            className="bg-white"
          />
        )}
      </div>
    );
  }

  const LandingPage = () => (
    <div className="fixed inset-0 z-[100] bg-anime-bg overflow-y-auto flex flex-col">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-anime-pink/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-anime-blue/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 md:py-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 bg-anime-pink rounded-xl shadow-[0_0_20px_rgba(255,0,127,0.4)]">
            <Code2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <span className="font-display text-2xl md:text-3xl text-white tracking-tight">MURUNKNOWN<span className="text-anime-pink">09</span></span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          {user ? (
            <div className="hidden sm:flex items-center gap-4">
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-anime-pink shadow-lg" />
              <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-white transition-colors font-medium">Logout</button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-6 md:px-8 py-2 md:py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-full text-white font-semibold transition-all"
            >
              Login
            </button>
          )}
          <button 
            onClick={() => setShowLanding(false)}
            className="px-6 md:px-10 py-2.5 md:py-3 bg-anime-pink hover:bg-anime-pink/90 text-white font-bold rounded-full shadow-[0_10px_25px_rgba(255,0,127,0.3)] transition-all active:scale-95 text-sm md:text-base"
          >
            START
          </button>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center min-h-[600px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl w-full"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 bg-anime-pink/10 border border-anime-pink/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-anime-pink animate-ping" />
            <span className="text-anime-pink text-[10px] font-bold tracking-[0.2em] uppercase">Next-Gen Development Platform</span>
          </div>
          <h1 className="font-display text-[12vw] sm:text-[10vw] md:text-[8vw] leading-[0.85] text-white mb-6 md:mb-8 select-none tracking-tighter break-words">
            MURUNKNOWN<span className="text-anime-pink">09</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto mb-8 md:mb-12 font-light leading-relaxed px-4">
            A powerful, cloud-based IDE designed for modern creators. 
            Write, preview, and deploy your web projects with unprecedented speed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8">
            <button 
              onClick={() => setShowLanding(false)}
              className="group relative w-full sm:w-auto px-8 md:px-14 py-4 md:py-6 bg-white text-slate-950 font-extrabold text-base md:text-xl rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl"
            >
              <span className="relative z-10 uppercase">Get Started</span>
              <div className="absolute inset-0 bg-anime-pink translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
            </button>
            <button className="w-full sm:w-auto px-8 md:px-14 py-4 md:py-6 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 text-white font-bold text-base md:text-xl rounded-2xl transition-all backdrop-blur-sm uppercase">
              Explore
            </button>
          </div>
        </motion.div>

        {/* Floating Visual Element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 1.5 }}
          className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[1000px] pointer-events-none select-none opacity-20 blur-3xl"
        >
          <div className="aspect-video anime-gradient rounded-full" />
        </motion.div>
      </div>

      {/* Footer Stats */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 px-6 md:px-16 py-8 md:py-14 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-2xl">
        {[
          { label: 'GLOBAL USERS', value: '25K+' },
          { label: 'PROJECTS DEPLOYED', value: '120K+' },
          { label: 'OPEN SOURCE', value: '100%' },
          { label: 'LATENCY', value: '< 20ms' },
        ].map((stat, i) => (
          <div key={i} className="text-center group">
            <div className="text-slate-500 text-[9px] md:text-[10px] font-bold tracking-[0.2em] mb-2 md:mb-3 group-hover:text-anime-pink transition-colors uppercase">{stat.label}</div>
            <div className="text-white text-2xl md:text-4xl font-display tracking-tight group-hover:scale-110 transition-transform duration-300">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden transition-colors duration-300",
      theme === 'vs-dark' ? "bg-anime-bg text-slate-200" : "bg-slate-50 text-slate-900"
    )}>
      <AnimatePresence>
        {showLanding && <LandingPage />}
      </AnimatePresence>

      {/* Free Attempts Badge for Guests */}
      {!user && !showLanding && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-16 right-6 z-30"
        >
          <div className={cn(
            "px-4 py-2 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-3 transition-all",
            theme === 'vs-dark' ? "bg-slate-900/80 border-slate-700 text-white" : "bg-white/80 border-slate-200 text-slate-900"
          )}>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Free Attempts</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[...Array(2)].map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-3 h-1.5 rounded-full transition-all duration-500",
                        i < (2 - freeAttempts) ? "bg-anime-pink shadow-[0_0_8px_rgba(255,0,127,0.5)]" : "bg-slate-700"
                      )} 
                    />
                  ))}
                </div>
                <span className="text-xs font-bold font-mono text-anime-pink">{2 - freeAttempts}/2</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700/50 mx-1" />
            <button 
              onClick={handleLogin}
              className="text-[10px] font-bold uppercase tracking-wider text-anime-blue hover:text-white transition-colors"
            >
              Login for more
            </button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <header className={cn(
        "flex items-center justify-between px-4 md:px-6 py-3 border-b relative z-20",
        theme === 'vs-dark' ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
      )}>
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setShowLanding(true)}
            className="p-1.5 md:p-2 bg-anime-pink rounded-xl shadow-lg hover:scale-110 transition-transform"
          >
            <Code2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <h1 className="text-lg md:text-xl font-display tracking-tight truncate max-w-[120px] md:max-w-none">
            {projectName ? (
              <span className="flex items-center gap-2 md:gap-3">
                <span className="text-anime-pink neon-text truncate">{projectName}</span>
                <span className="hidden sm:inline text-[10px] text-slate-500 font-sans uppercase tracking-[0.2em]">Project</span>
              </span>
            ) : (
              <span className="text-white">MURUNKNOWN<span className="text-anime-pink">09</span></span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center bg-slate-800/50 rounded-full p-1 border border-slate-700/50">
            <button 
              onClick={() => setPreviewDevice('desktop')}
              className={cn("p-2 rounded-full transition-all", previewDevice === 'desktop' ? "bg-anime-pink text-white shadow-lg" : "text-slate-400 hover:text-slate-200")}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPreviewDevice('tablet')}
              className={cn("p-2 rounded-full transition-all", previewDevice === 'tablet' ? "bg-anime-pink text-white shadow-lg" : "text-slate-400 hover:text-slate-200")}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPreviewDevice('mobile')}
              className={cn("p-2 rounded-full transition-all", previewDevice === 'mobile' ? "bg-anime-pink text-white shadow-lg" : "text-slate-400 hover:text-slate-200")}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={() => {
                if (!user) {
                  toast.info("Khassk t-login bach tchof mawa7il dyalk o t-tracki l'free attempts!", {
                    description: "Login to see your projects and manage your 2 free attempts.",
                    action: {
                      label: "Login Now",
                      onClick: handleLogin
                    }
                  });
                  return;
                }
                setShowProjects(!showProjects);
              }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] transition-all active:scale-95 border",
                theme === 'vs-dark' ? "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 text-slate-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
              )}
            >
              <Hash className="w-4 h-4 text-anime-pink" />
              # PROJECTS
            </button>

            <div className="h-6 w-px bg-slate-800 mx-1" />

            {currentProjectId && (
              <button 
                onClick={() => window.open(`${window.location.origin}${window.location.pathname}?project=${currentProjectId}&view=true`, '_blank')}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] transition-all active:scale-95 border",
                  theme === 'vs-dark' ? "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 text-slate-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                )}
              >
                <ExternalLink className="w-4 h-4 text-anime-blue" />
                Live
              </button>
            )}

            <button 
              onClick={handlePublishClick}
              disabled={isPublishing}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 bg-anime-pink hover:bg-anime-pink/90 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                isPublishing && "animate-pulse"
              )}
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {isPublishing ? 'Publishing...' : 'Publish'}
            </button>

            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-2.5 bg-anime-blue hover:bg-anime-blue/90 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
              className={cn(
                "p-2 md:p-2.5 rounded-xl transition-all border",
                theme === 'vs-dark' ? "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 text-yellow-400" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
              )}
            >
              {theme === 'vs-dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            {/* Mobile Menu Trigger */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <div className={cn("h-0.5 bg-white transition-all", isMobileMenuOpen ? "rotate-45 translate-y-1.5" : "")} />
                <div className={cn("h-0.5 bg-white transition-all", isMobileMenuOpen ? "opacity-0" : "")} />
                <div className={cn("h-0.5 bg-white transition-all", isMobileMenuOpen ? "-rotate-45 -translate-y-2" : "")} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 bg-slate-950 border-b border-slate-800 p-6 z-50 flex flex-col gap-4 shadow-2xl lg:hidden"
            >
              <button 
                onClick={() => {
                  setShowProjects(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl text-white font-bold text-xs uppercase tracking-widest"
              >
                <Hash className="w-5 h-5 text-anime-pink" />
                My Projects
              </button>
              <button 
                onClick={() => {
                  handlePublishClick();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 p-4 bg-anime-pink rounded-2xl text-white font-bold text-xs uppercase tracking-widest"
              >
                <Share2 className="w-5 h-5" />
                Publish Project
              </button>
              <button 
                onClick={() => {
                  handleDownload();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 p-4 bg-anime-blue rounded-2xl text-white font-bold text-xs uppercase tracking-widest"
              >
                <Download className="w-5 h-5" />
                Export index.html
              </button>
              {user ? (
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-anime-pink" />
                    <span className="text-white text-xs font-bold">{user.displayName}</span>
                  </div>
                  <button onClick={() => signOut(auth)} className="text-anime-pink text-[10px] font-bold uppercase">Logout</button>
                </div>
              ) : (
                <button onClick={handleLogin} className="p-4 bg-slate-800 rounded-2xl text-white font-bold text-xs uppercase tracking-widest">Login with Google</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative">
        {isLoadingProject && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-white">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-anime-pink" />
                <div className="absolute inset-0 blur-2xl bg-anime-pink/20 animate-pulse" />
              </div>
              <p className="text-xl font-display tracking-tight">Initializing <span className="text-anime-pink italic">Workspace...</span></p>
            </div>
          </div>
        )}

        {/* My Projects Sidebar */}
        <AnimatePresence>
          {showProjects && (
            <motion.div 
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              className={cn(
                "absolute left-0 top-0 bottom-0 w-80 z-40 border-r shadow-2xl flex flex-col",
                theme === 'vs-dark' ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"
              )}
            >
              <div className="p-6 border-b border-slate-900 flex items-center justify-between bg-slate-900/30">
                <h3 className="font-display text-xl tracking-tight uppercase"># My <span className="text-anime-pink italic">Projects</span></h3>
                <button onClick={() => setShowProjects(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {userProjects.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800">
                      <Hash className="w-10 h-10 text-slate-700" />
                    </div>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">No projects found</p>
                    <p className="text-[10px] text-slate-700 mt-3 uppercase tracking-widest">Publish something amazing!</p>
                  </div>
                ) : (
                  userProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        loadProject(project.id);
                        setShowProjects(false);
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl transition-all group border border-transparent",
                        theme === 'vs-dark' ? "hover:bg-slate-900/50 hover:border-slate-800" : "hover:bg-slate-50 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-anime-pink/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-anime-pink/10">
                          <FileCode className="w-6 h-6 text-anime-pink" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate group-hover:text-anime-pink transition-colors text-slate-200">{project.projectName}</p>
                          <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mt-1">
                            {project.createdAt?.toDate ? new Date(project.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Section */}
        <div className={cn(
          "flex flex-col border-b md:border-b-0 md:border-r border-white/10 transition-all duration-300",
          "w-full md:w-1/2",
          mobileLayout === 'editor' ? "h-full" : mobileLayout === 'preview' ? "hidden md:flex" : "h-[450px] md:h-full"
        )}>
          <div className={cn(
            "flex items-center gap-3 p-3 border-b",
            theme === 'vs-dark' ? "bg-slate-950 border-slate-900" : "bg-slate-50 border-slate-200"
          )}>
            <button 
              onClick={() => setActiveTab('html')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
                activeTab === 'html' 
                  ? "bg-anime-pink text-white shadow-lg shadow-anime-pink/20" 
                  : "text-slate-500 hover:bg-slate-900/50"
              )}
            >
              <FileCode className="w-4 h-4" />
              HTML
            </button>
            <button 
              onClick={() => setActiveTab('css')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
                activeTab === 'css' 
                  ? "bg-anime-blue text-white shadow-lg shadow-anime-blue/20" 
                  : "text-slate-500 hover:bg-slate-900/50"
              )}
            >
              <Hash className="w-4 h-4" />
              CSS
            </button>
            <button 
              onClick={() => setActiveTab('js')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
                activeTab === 'js' 
                  ? "bg-anime-pink text-white shadow-lg shadow-anime-pink/20" 
                  : "text-slate-500 hover:bg-slate-900/50"
              )}
            >
              <FileJson className="w-4 h-4" />
              JS
            </button>

            <div className="flex-1" />

            <button 
              onClick={handleCopy}
              className="p-2.5 text-slate-500 hover:text-anime-blue transition-colors"
              title="Copy all code"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={handleReset}
              className="p-2.5 text-slate-500 hover:text-anime-pink transition-colors"
              title="Reset code"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 relative">
            <Editor
              height="100%"
              theme={theme}
              language={activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript'}
              value={activeTab === 'html' ? html : activeTab === 'css' ? css : js}
              onChange={(value) => {
                if (activeTab === 'html') setHtml(value || '');
                if (activeTab === 'css') setCss(value || '');
                if (activeTab === 'js') setJs(value || '');
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 }
              }}
            />
          </div>
        </div>

        {/* Preview Section */}
        <div className={cn(
          "flex-1 flex flex-col p-4 md:p-6 transition-colors relative",
          theme === 'vs-dark' ? "bg-[#050505]" : "bg-gray-200",
          mobileLayout === 'preview' ? "min-h-full" : mobileLayout === 'editor' ? "hidden md:flex" : "min-h-[450px] md:min-h-0"
        )}>
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4 md:mb-5 relative z-10">
            <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <div className="w-2 h-2 rounded-full bg-anime-pink animate-pulse shadow-[0_0_12px_rgba(255,0,127,0.5)]" />
              Live Preview
            </div>
            <div className="text-[10px] text-slate-700 uppercase tracking-[0.2em] font-bold">
              {previewDevice} view
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden relative z-10">
            <motion.div 
              layout
              className={cn(
                "bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-white/5 transition-all duration-500",
                previewDevice === 'desktop' ? "w-full h-full" : 
                previewDevice === 'tablet' ? "w-full max-w-[768px] h-[90%]" : 
                "w-full max-w-[375px] h-full md:h-[667px]"
              )}
            >
              <iframe
                srcDoc={srcDoc}
                title="preview"
                sandbox="allow-scripts"
                frameBorder="0"
                width="100%"
                height="100%"
                className="bg-white"
              />
            </motion.div>
          </div>
        </div>

        {/* Mobile Layout Switcher */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex md:hidden items-center bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
          <button 
            onClick={() => setMobileLayout('editor')}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              mobileLayout === 'editor' ? "bg-anime-pink text-white shadow-lg shadow-anime-pink/20" : "text-slate-500 hover:text-slate-300"
            )}
            title="Editor Only"
          >
            <FileCode className="w-5 h-5" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button 
            onClick={() => setMobileLayout('split')}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              mobileLayout === 'split' ? "bg-anime-blue text-white shadow-lg shadow-anime-blue/20" : "text-slate-500 hover:text-slate-300"
            )}
            title="Split View"
          >
            <Layout className="w-5 h-5" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button 
            onClick={() => setMobileLayout('preview')}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              mobileLayout === 'preview' ? "bg-anime-pink text-white shadow-lg shadow-anime-pink/20" : "text-slate-500 hover:text-slate-300"
            )}
            title="Preview Only"
          >
            <Monitor className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Naming Modal */}
      <AnimatePresence>
        {isNaming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={cn(
                "w-full max-w-lg p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border relative overflow-hidden",
                theme === 'vs-dark' ? "bg-slate-900/80 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-anime-pink/20 blur-[80px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-anime-blue/20 blur-[80px] rounded-full pointer-events-none" />

              <div className="flex flex-col items-center text-center relative z-10">
                <div className="p-4 md:p-5 bg-anime-pink/10 rounded-3xl mb-6 md:mb-8 border border-anime-pink/20">
                  <FileCode className="w-10 h-10 md:w-12 md:h-12 text-anime-pink" />
                </div>
                <h2 className="text-3xl md:text-4xl font-display tracking-tight mb-2 md:mb-3">
                  Publish <span className="text-anime-pink italic">Project</span>
                </h2>
                <p className="text-slate-400 text-sm md:text-base mb-8 md:mb-10 max-w-sm">Ready to share your creation with the world? Choose a name and unique URL.</p>
                
                <div className="w-full space-y-4 md:space-y-6 mb-8 md:mb-10">
                  <div className="text-left">
                    <label className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 md:mb-3 block ml-1">Project Name</label>
                    <input 
                      autoFocus
                      type="text"
                      value={projectName}
                      onChange={(e) => {
                        setProjectName(e.target.value);
                        const newSlug = e.target.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                        setUserSlug(newSlug);
                      }}
                      placeholder="My Awesome Project"
                      className={cn(
                        "w-full p-4 md:p-5 rounded-2xl border focus:ring-2 focus:ring-anime-pink/20 outline-none transition-all font-medium text-base md:text-lg",
                        theme === 'vs-dark' ? "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      )}
                    />
                  </div>

                  <div className="text-left">
                    <label className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 md:mb-3 block ml-1">Project Slug (URL)</label>
                    <div className={cn(
                      "flex items-center rounded-2xl border overflow-hidden transition-all",
                      theme === 'vs-dark' ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="px-4 md:px-5 py-4 md:py-5 bg-slate-900/50 border-r border-slate-700 text-slate-500 text-[10px] md:text-xs font-mono truncate max-w-[150px] md:max-w-[200px] hidden sm:block">
                        {window.location.host}/s/
                      </div>
                      <div className="px-3 md:px-4 py-4 md:py-5 bg-slate-900/50 border-r border-slate-700 text-slate-500 text-[10px] md:text-xs font-mono sm:hidden">
                        /s/
                      </div>
                      <input 
                        type="text"
                        value={userSlug}
                        onChange={(e) => setUserSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                        placeholder="my-project"
                        className="flex-1 p-4 md:p-5 bg-transparent outline-none text-anime-blue font-mono text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex w-full gap-3 md:gap-4">
                  <button 
                    onClick={() => setIsNaming(false)}
                    className={cn(
                      "flex-1 py-3 md:py-4 rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all active:scale-95 border",
                      theme === 'vs-dark' ? "bg-slate-800/50 hover:bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                    )}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmPublish}
                    disabled={!projectName.trim() || !userSlug.trim()}
                    className="flex-1 py-3 md:py-4 bg-anime-pink hover:bg-anime-pink/90 text-white rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-anime-pink/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Publish
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Published Success Modal */}
      <AnimatePresence>
        {publishedUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={cn(
                "w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl border relative overflow-hidden",
                theme === 'vs-dark' ? "bg-slate-900/80 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-anime-blue/20 blur-[80px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-anime-pink/20 blur-[80px] rounded-full pointer-events-none" />

              <div className="flex flex-col items-center text-center relative z-10">
                <div className="p-4 md:p-5 bg-anime-blue/10 rounded-3xl mb-6 md:mb-8 border border-anime-blue/20">
                  <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-anime-blue" />
                </div>
                <h2 className="text-3xl md:text-4xl font-display tracking-tight mb-2 md:mb-3">
                  Mission <span className="text-anime-blue italic">Accomplished</span>
                </h2>
                <p className="text-slate-400 text-sm md:text-base mb-8 md:mb-10 max-w-sm">Your project is now live on the grid. Share it with your friends and colleagues!</p>
                
                <div className={cn(
                  "w-full flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl border mb-8 md:mb-10 transition-all group cursor-pointer",
                  theme === 'vs-dark' ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200",
                  copied && "border-anime-blue ring-4 ring-anime-blue/10"
                )} onClick={handleCopyLink}>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] md:text-[11px] uppercase font-bold text-slate-500 mb-1 md:mb-2 tracking-[0.2em]">Project Link</p>
                    <input 
                      readOnly 
                      value={publishedUrl}
                      className="w-full bg-transparent border-none focus:ring-0 text-sm md:text-base font-mono truncate text-anime-blue cursor-pointer font-medium"
                    />
                  </div>
                  <button 
                    className={cn(
                      "p-3 md:p-3.5 rounded-xl transition-all flex items-center gap-2 font-bold uppercase text-[9px] md:text-[10px] tracking-widest",
                      copied ? "bg-anime-blue text-white shadow-lg shadow-anime-blue/20" : "bg-slate-900/50 text-slate-400 hover:text-white"
                    )}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="flex flex-col w-full gap-3 md:gap-4">
                  <div className="flex w-full gap-3 md:gap-4">
                    <button 
                      onClick={() => setPublishedUrl(null)}
                      className={cn(
                        "flex-1 py-3 md:py-4 rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all active:scale-95 border",
                        theme === 'vs-dark' ? "bg-slate-800/50 hover:bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                      )}
                    >
                      Close
                    </button>
                    <a 
                      href={publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 md:py-4 bg-anime-blue hover:bg-anime-blue/90 text-white rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-anime-blue/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Site
                    </a>
                  </div>
                  
                  <button 
                    onClick={handleSaveLinkFile}
                    className="flex items-center justify-center gap-2 py-3 md:py-4 text-slate-500 hover:text-anime-pink transition-colors text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]"
                  >
                    <Download className="w-4 h-4" />
                    Save link as file
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="bottom-right" richColors theme={theme === 'vs-dark' ? 'dark' : 'light'} />

      {/* Footer Status Bar */}
      <footer className={cn(
        "px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold flex flex-col md:flex-row items-center justify-between border-t relative z-20 gap-2 md:gap-0",
        theme === 'vs-dark' ? "bg-slate-950 text-slate-500 border-slate-900" : "bg-slate-50 text-slate-400 border-slate-200"
      )}>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 md:gap-2.5">
            <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", isSavingDraft ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
            <span className={isSavingDraft ? "text-amber-400/80" : "text-emerald-400/80"}>
              {isSavingDraft ? "Syncing..." : "System Ready"}
            </span>
          </div>
          {lastSaved && <span className="hidden sm:inline text-slate-700">Last Sync: {lastSaved.toLocaleTimeString()}</span>}
          <div className="hidden md:block h-4 w-px bg-slate-800" />
          <span className="text-anime-pink font-display tracking-tight lowercase italic text-[10px] md:text-xs">{user ? user.displayName : 'Guest Mode'}</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8 font-mono">
          <span className="hover:text-anime-pink cursor-help transition-colors">HTML5</span>
          <span className="hover:text-anime-blue cursor-help transition-colors">CSS3</span>
          <span className="hover:text-anime-pink cursor-help transition-colors">JS/ES6+</span>
          <div className="hidden md:block h-4 w-px bg-slate-800" />
          <span className="hidden sm:inline text-slate-700">v2.0.0-PRO</span>
        </div>
      </footer>
    </div>
  );
}
