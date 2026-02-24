import { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Shield, ArrowRight, AlertCircle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Markdown from 'react-markdown';
import { Product, AuthAction, AuthState } from './types';
import { supabase } from './lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PRODUCTS: { id: Product; name: string; description: string; url: string }[] = [
  { id: 'AnnoNest', name: 'AnnoNest', description: 'Annotation & data intelligence platform', url: 'https://anno.labelnest.in' },
  { id: 'NestLens', name: 'NestLens', description: 'Research & data intelligence platform', url: 'https://lens.labelnest.in' },
  { id: 'NestResolve', name: 'NestResolve', description: 'Issue, quality & resolution workflows', url: 'https://resolve.labelnest.in' },
];

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ type: 'unknown', error: 'none' });
  const [conciergeMessage, setConciergeMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Initialize Auth State from URL and Supabase
  useEffect(() => {
    async function initializeAuth() {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Check for Supabase error in hash or query
      const error = params.get('error') || hashParams.get('error');
      const errorDescription = params.get('error_description') || hashParams.get('error_description');
      
      const appParam = params.get('app') as Product;
      // Supabase often uses 'type' in the hash for recovery/signup
      const typeParam = (params.get('type') || hashParams.get('type') || 'unknown') as AuthAction;
      
      const validApp = PRODUCTS.find(p => p.id === appParam)?.id;

      setAuthState({
        app: validApp,
        type: typeParam,
        error: error ? 'invalid' : 'none'
      });

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }

    initializeAuth();
  }, []);

  // Gemini Concierge Logic
  useEffect(() => {
    async function fetchConciergeMessage() {
      if (authState.type === 'unknown' && !authState.app && authState.error === 'none') {
        return;
      }

      setIsLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `
            Current Auth State:
            - Product: ${authState.app || 'Unknown'}
            - Action: ${authState.type}
            - Error: ${authState.error}
            - User Logged In: ${user ? 'Yes' : 'No'}

            Generate a concise, professional, and reassuring concierge message for this user.
            Follow these rules:
            - If user is logged in and product is known, confirm they are ready to go.
            - If it's a 'recovery' (password reset), explain they've successfully verified and are heading to the product to set a new password.
            - If product is missing, ask them to select which LabelNest tool they were using.
            - Tone: Enterprise-grade, calm, minimal.
            - No emojis. No technical jargon.
            - Output only the markdown text.
          `,
          config: {
            systemInstruction: "You are the UI concierge for LabelNest Identity. Your role is to guide users during authentication handoff across LabelNest products: AnnoNest, NestLens, and NestResolve. Keep tone professional, calm, and reassuring.",
          }
        });

        setConciergeMessage(response.text || 'Preparing your secure access...');
      } catch (error) {
        setConciergeMessage("We're preparing your secure access to LabelNest Identity.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchConciergeMessage();
  }, [authState, user]);

  const handleProductSelect = (product: Product) => {
    setAuthState(prev => ({ ...prev, app: product }));
  };

  const handleContinue = () => {
    setIsRedirecting(true);
    const product = PRODUCTS.find(p => p.id === authState.app);
    if (product) {
      // In a real production environment with shared cookies:
      // window.location.href = product.url;
      
      // For demo/preview purposes:
      setTimeout(() => {
        setIsRedirecting(false);
        alert(`In production, you would now be redirected to: ${product.url}`);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Shield className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">LabelNest Identity</h1>
            <p className="text-xs text-black/40 uppercase tracking-widest font-medium">Auth Router</p>
          </div>
        </div>

        <div className="bg-white border border-black/5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-8 sm:p-10">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-12"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-black/20 mb-4" />
                  <p className="text-sm text-black/40 font-medium">Verifying session...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex justify-center">
                    {authState.error !== 'none' ? (
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="text-red-500 w-6 h-6" />
                      </div>
                    ) : user ? (
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <Shield className="text-blue-500 w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-3">
                    <div className="prose prose-sm max-w-none text-black/70 leading-relaxed">
                      <Markdown>{conciergeMessage}</Markdown>
                    </div>
                    {user && (
                      <p className="text-[10px] text-black/30 font-medium uppercase tracking-tighter">
                        Authenticated as {user.email}
                      </p>
                    )}
                  </div>

                  {!authState.app && authState.error === 'none' && (
                    <div className="space-y-3 pt-4">
                      <p className="text-[11px] font-semibold text-black/30 uppercase tracking-wider text-center mb-4">
                        Select your destination
                      </p>
                      {PRODUCTS.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductSelect(product.id)}
                          className="w-full flex items-center justify-between p-4 rounded-2xl border border-black/5 hover:border-black/20 hover:bg-black/[0.01] transition-all group text-left"
                        >
                          <div>
                            <h3 className="text-sm font-medium text-black">{product.name}</h3>
                            <p className="text-xs text-black/40">{product.description}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-black/20 group-hover:text-black/60 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {authState.app && authState.error === 'none' && (
                    <button
                      onClick={handleContinue}
                      disabled={isRedirecting}
                      className="w-full bg-black text-white rounded-2xl py-4 font-medium text-sm flex items-center justify-center gap-2 hover:bg-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRedirecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Redirecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to {authState.app}</span>
                          <ExternalLink className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}

                  {authState.error !== 'none' && (
                    <button
                      onClick={() => window.location.href = '/'}
                      className="w-full border border-black/10 text-black rounded-2xl py-4 font-medium text-sm hover:bg-black/[0.02] transition-all"
                    >
                      Return to Home
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-black/[0.02] border-t border-black/5 px-8 py-4 flex items-center justify-between">
            <span className="text-[10px] font-medium text-black/30 uppercase tracking-widest">
              {user ? 'Active Session' : 'Secure Gateway'}
            </span>
            <div className="flex gap-4">
              <span className="text-[10px] font-medium text-black/30 uppercase tracking-widest cursor-pointer hover:text-black/60">
                Privacy
              </span>
              <span className="text-[10px] font-medium text-black/30 uppercase tracking-widest cursor-pointer hover:text-black/60">
                Support
              </span>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-xs text-black/30">
          LabelNest Identity provides unified access across the LabelNest ecosystem.
        </p>
      </motion.div>
    </div>
  );
}
