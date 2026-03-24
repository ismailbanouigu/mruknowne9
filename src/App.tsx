import React, { useState, useEffect, useCallback } from 'react';
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
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';

import { Toaster, toast } from 'sonner';

type Tab = 'html' | 'css' | 'js';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Live Preview</title>
</head>
<body>
  <div class="container">
    <h1>Hello MurUnknown09!</h1>
    <p>Start editing to see the magic happen.</p>
    <button id="btn">Click Me</button>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `body {
  font-family: 'Inter', sans-serif;
  background: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.container {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  text-align: center;
}

h1 { color: #2563eb; }

button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #1d4ed8;
}`;

const DEFAULT_JS = `document.getElementById('btn').addEventListener('click', () => {
  alert('Button clicked!');
});`;

export default function App() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [js, setJs] = useState(DEFAULT_JS);
  const [activeTab, setActiveTab] = useState<Tab>('html');
  const [srcDoc, setSrcDoc] = useState('');
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  // Firebase State
  const [user, setUser] = useState<User | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // Check for project in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    if (projectId) {
      loadProject(projectId);
    }
  }, []);

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

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handlePublish = async () => {
    if (!user) {
      toast.error("Please login to publish your project");
      handleLogin();
      return;
    }

    const publishPromise = new Promise(async (resolve, reject) => {
      try {
        const docRef = await addDoc(collection(db, 'projects'), {
          html,
          css,
          js,
          authorId: user.uid,
          authorName: user.displayName,
          createdAt: serverTimestamp(),
          slug: Math.random().toString(36).substring(7)
        });
        
        const url = `${window.location.origin}${window.location.pathname}?project=${docRef.id}`;
        setPublishedUrl(url);
        resolve(url);
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(publishPromise, {
      loading: 'Publishing your project...',
      success: 'Project published successfully!',
      error: 'Failed to publish project',
    });
  };

  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all code?')) {
      setHtml(DEFAULT_HTML);
      setCss(DEFAULT_CSS);
      setJs(DEFAULT_JS);
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden transition-colors duration-300",
      theme === 'vs-dark' ? "bg-[#1e1e1e] text-white" : "bg-gray-50 text-gray-900"
    )}>
      {/* Header */}
      <header className={cn(
        "flex items-center justify-between px-6 py-3 border-b",
        theme === 'vs-dark' ? "border-white/10" : "border-gray-200 bg-white"
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MurUnknown09 <span className="text-blue-500">SaaS</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-200/50 dark:bg-white/5 rounded-lg p-1">
            <button 
              onClick={() => setPreviewDevice('desktop')}
              className={cn("p-1.5 rounded", previewDevice === 'desktop' && "bg-white dark:bg-white/10 shadow-sm")}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPreviewDevice('tablet')}
              className={cn("p-1.5 rounded", previewDevice === 'tablet' && "bg-white dark:bg-white/10 shadow-sm")}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPreviewDevice('mobile')}
              className={cn("p-1.5 rounded", previewDevice === 'mobile' && "bg-white dark:bg-white/10 shadow-sm")}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-2" />

          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              isPublishing && "animate-pulse"
            )}
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>

          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <button 
            onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            {theme === 'vs-dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {isLoadingProject && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-white">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-lg font-medium">Loading Project...</p>
            </div>
          </div>
        )}

        {/* Editor Section */}
        <div className="w-1/2 flex flex-col border-r border-white/10">
          <div className={cn(
            "flex items-center gap-1 p-2 border-b",
            theme === 'vs-dark' ? "bg-[#252526] border-white/5" : "bg-gray-100 border-gray-200"
          )}>
            <button 
              onClick={() => setActiveTab('html')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'html' 
                  ? "bg-blue-600/10 text-blue-500" 
                  : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5"
              )}
            >
              <FileCode className="w-4 h-4" />
              HTML
            </button>
            <button 
              onClick={() => setActiveTab('css')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'css' 
                  ? "bg-blue-600/10 text-blue-500" 
                  : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5"
              )}
            >
              <Hash className="w-4 h-4" />
              CSS
            </button>
            <button 
              onClick={() => setActiveTab('js')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'js' 
                  ? "bg-blue-600/10 text-blue-500" 
                  : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5"
              )}
            >
              <FileJson className="w-4 h-4" />
              JS
            </button>

            <div className="flex-1" />

            <button 
              onClick={handleCopy}
              className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors"
              title="Copy all code"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={handleReset}
              className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
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
          "flex-1 flex flex-col p-6 transition-colors",
          theme === 'vs-dark' ? "bg-[#121212]" : "bg-gray-200"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Play className="w-4 h-4 text-green-500" />
              Live Preview
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">
              {previewDevice} view
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <motion.div 
              layout
              className={cn(
                "bg-white rounded-xl shadow-2xl overflow-hidden border border-white/10 transition-all duration-500",
                previewDevice === 'desktop' ? "w-full h-full" : 
                previewDevice === 'tablet' ? "w-[768px] h-[90%]" : 
                "w-[375px] h-[667px]"
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
      </main>

      {/* Published Success Modal */}
      <AnimatePresence>
        {publishedUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={cn(
                "w-full max-w-md p-8 rounded-2xl shadow-2xl border",
                theme === 'vs-dark' ? "bg-[#1e1e1e] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Project Published!</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  Your project is now live. Share this link with anyone to show off your work.
                </p>
                
                <div className={cn(
                  "w-full flex items-center gap-2 p-3 rounded-xl border mb-6 transition-all",
                  theme === 'vs-dark' ? "bg-black/20 border-white/5" : "bg-gray-50 border-gray-200",
                  copied && "border-green-500 ring-1 ring-green-500/50"
                )}>
                  <input 
                    readOnly 
                    value={publishedUrl}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono truncate"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors relative"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                        >
                          <Copy className="w-4 h-4 text-blue-500" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setPublishedUrl(null)}
                    className="flex-1 py-3 px-4 bg-gray-200/50 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 rounded-xl font-medium transition-all"
                  >
                    Close
                  </button>
                  <a 
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    Open Link
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="bottom-right" richColors theme={theme === 'vs-dark' ? 'dark' : 'light'} />

      {/* Footer Status Bar */}
      <footer className={cn(
        "px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold flex items-center justify-between border-t",
        theme === 'vs-dark' ? "bg-[#007acc] text-white border-white/10" : "bg-gray-100 text-gray-500 border-gray-200"
      )}>
        <div className="flex items-center gap-4">
          <span>{user ? `Logged in as ${user.displayName}` : 'Guest Mode'}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span>HTML5</span>
          <span>CSS3</span>
          <span>ES6+</span>
        </div>
      </footer>
    </div>
  );
}
