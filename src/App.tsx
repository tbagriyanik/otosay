/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { Scan, AlertCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const BASE_CATEGORIES: Record<string, string[]> = {
  vehicle: ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'boat', 'train', 'airplane'],
  human: ['person'],
  animal: ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'],
  plant: ['potted plant'],
  electronics: ['tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone'],
  food: ['banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake'],
  furniture: ['chair', 'couch', 'bed', 'dining table', 'toilet'],
  sports: ['frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket'],
  kitchen: ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator'],
  accessories: ['backpack', 'umbrella', 'handbag', 'tie', 'suitcase'],
  outdoor: ['traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench'],
  misc: ['book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush']
};

const CATEGORIES: Record<string, string[]> = {
  all: Object.values(BASE_CATEGORIES).flat(),
  ...BASE_CATEGORIES
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Tümü',
  vehicle: 'Araç',
  human: 'İnsan',
  animal: 'Hayvan',
  plant: 'Bitki',
  electronics: 'Elektronik',
  food: 'Yiyecek',
  furniture: 'Mobilya',
  sports: 'Spor',
  kitchen: 'Mutfak',
  accessories: 'Aksesuar',
  outdoor: 'Dış Mekan',
  misc: 'Diğer'
};

const CLASS_METADATA: Record<string, { color: string; bg: string; label: string }> = {
  car: { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.2)', label: 'Otomobil' },
  truck: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', label: 'Kamyon' },
  bus: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'Otobüs' },
  motorcycle: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'Motosiklet' },
  bicycle: { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.2)', label: 'Bisiklet' },
  boat: { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.2)', label: 'Tekne' },
  train: { color: '#84cc16', bg: 'rgba(132, 204, 22, 0.2)', label: 'Tren' },
  airplane: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', label: 'Uçak' },
  person: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)', label: 'İnsan' },
  bird: { color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.2)', label: 'Kuş' },
  cat: { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.2)', label: 'Kedi' },
  dog: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.2)', label: 'Köpek' },
  horse: { color: '#d946ef', bg: 'rgba(217, 70, 239, 0.2)', label: 'At' },
  sheep: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.2)', label: 'Koyun' },
  cow: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)', label: 'İnek' },
  elephant: { color: '#475569', bg: 'rgba(71, 85, 105, 0.2)', label: 'Fil' },
  bear: { color: '#a16207', bg: 'rgba(161, 98, 7, 0.2)', label: 'Ayı' },
  zebra: { color: '#1e293b', bg: 'rgba(30, 41, 59, 0.2)', label: 'Zebra' },
  giraffe: { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.2)', label: 'Zürafa' },
  'potted plant': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)', label: 'Bitki' },
  tv: { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.2)', label: 'Televizyon' },
  laptop: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)', label: 'Laptop' },
  mouse: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.2)', label: 'Fare' },
  remote: { color: '#d946ef', bg: 'rgba(217, 70, 239, 0.2)', label: 'Kumanda' },
  keyboard: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'Klavye' },
  'cell phone': { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.2)', label: 'Telefon' },
  banana: { color: '#facc15', bg: 'rgba(250, 204, 21, 0.2)', label: 'Muz' },
  apple: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', label: 'Elma' },
  sandwich: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'Sandviç' },
  orange: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', label: 'Portakal' },
  broccoli: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)', label: 'Brokoli' },
  carrot: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', label: 'Havuç' },
  'hot dog': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', label: 'Sosisli' },
  pizza: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'Pizza' },
  donut: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'Donut' },
  cake: { color: '#d946ef', bg: 'rgba(217, 70, 239, 0.2)', label: 'Kek' },
  chair: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.2)', label: 'Sandalye' },
  couch: { color: '#78716c', bg: 'rgba(120, 113, 108, 0.2)', label: 'Koltuk' },
  bed: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)', label: 'Yatak' },
  'dining table': { color: '#a8a29e', bg: 'rgba(168, 162, 158, 0.2)', label: 'Masa' },
  toilet: { color: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.2)', label: 'Tuvalet' },
  frisbee: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', label: 'Frizbi' },
  skis: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', label: 'Kayak' },
  snowboard: { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.2)', label: 'Snowboard' },
  'sports ball': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'Top' },
  kite: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', label: 'Uçurtma' },
  'baseball bat': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)', label: 'Beyzbol Sopası' },
  'baseball glove': { color: '#d946ef', bg: 'rgba(217, 70, 239, 0.2)', label: 'Beyzbol Eldiveni' },
  skateboard: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'Kaykay' },
  surfboard: { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.2)', label: 'Sörf Tahtası' },
  'tennis racket': { color: '#84cc16', bg: 'rgba(132, 204, 22, 0.2)', label: 'Tenis Raketi' },
  bottle: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.2)', label: 'Şişe' },
  'wine glass': { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.2)', label: 'Kadeh' },
  cup: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.2)', label: 'Fincan' },
  fork: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)', label: 'Çatal' },
  knife: { color: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.2)', label: 'Bıçak' },
  spoon: { color: '#a8a29e', bg: 'rgba(168, 162, 158, 0.2)', label: 'Kaşık' },
  bowl: { color: '#fdba74', bg: 'rgba(253, 186, 116, 0.2)', label: 'Kase' },
  microwave: { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.2)', label: 'Mikrodalga' },
  oven: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', label: 'Fırın' },
  toaster: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', label: 'Tost Makinesi' },
  sink: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)', label: 'Lavabo' },
  refrigerator: { color: '#e2e8f0', bg: 'rgba(226, 232, 240, 0.2)', label: 'Buzdolabı' },
  backpack: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'Sırt Çantası' },
  umbrella: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'Şemsiye' },
  handbag: { color: '#d946ef', bg: 'rgba(217, 70, 239, 0.2)', label: 'El Çantası' },
  tie: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', label: 'Kravat' },
  suitcase: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.2)', label: 'Valiz' },
  'traffic light': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', label: 'Trafik Işığı' },
  'fire hydrant': { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.2)', label: 'Yangın Musluğu' },
  'stop sign': { color: '#b91c1c', bg: 'rgba(185, 28, 28, 0.2)', label: 'Dur Tabelası' },
  'parking meter': { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.2)', label: 'Park Metre' },
  bench: { color: '#78716c', bg: 'rgba(120, 113, 108, 0.2)', label: 'Bank' },
  book: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', label: 'Kitap' },
  clock: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'Saat' },
  vase: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', label: 'Vazo' },
  scissors: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)', label: 'Makas' },
  'teddy bear': { color: '#a16207', bg: 'rgba(161, 98, 7, 0.2)', label: 'Oyuncak Ayı' },
  'hair drier': { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', label: 'Saç Kurutma' },
  toothbrush: { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.2)', label: 'Diş Fırçası' }
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastDetectTimeRef = useRef<number>(0);
  
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const activeCategoryRef = useRef<string>('all');

  const [objectCounts, setObjectCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [history, setHistory] = useState<{ time: string, count: number }[]>([]);

  const modelRef = useRef<cocossd.ObjectDetection | null>(null);
  const isDetectingRef = useRef(false);

  // Update ref when state changes so detectFrame uses latest value
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
    setObjectCounts({});
    setTotalCount(0);
    setHistory([]);
  }, [activeCategory]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (!modelRef.current) {
        modelRef.current = await cocossd.load();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        isDetectingRef.current = true;
        detectFrame();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError("Kamera başlatılamadı veya izin verilmedi.");
    }
  };

  const stopCamera = () => {
    isDetectingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    setObjectCounts({});
    setTotalCount(0);
  };

  const detectFrame = async (timestamp: number = 0) => {
    if (!isDetectingRef.current || !videoRef.current || !canvasRef.current || !modelRef.current) {
        return;
    }

    if (timestamp - lastDetectTimeRef.current >= 300) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState >= 2) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');

          if (ctx) {
              const predictions = await modelRef.current.detect(video, 200, 0.3);
              
              const currentCategoryClasses = CATEGORIES[activeCategoryRef.current];
              const detectedObjects = predictions.filter(p => currentCategoryClasses.includes(p.class));

              const currentCounts: Record<string, number> = {};
              detectedObjects.forEach(v => {
                currentCounts[v.class] = (currentCounts[v.class] || 0) + 1;
              });

              setObjectCounts(currentCounts);
              setTotalCount(detectedObjects.length);
              
              setHistory(prev => {
                const now = new Date();
                const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                const newHistory = [...prev, { time, count: detectedObjects.length }];
                if (newHistory.length > 60) {
                  return newHistory.slice(newHistory.length - 60);
                }
                return newHistory;
              });

              ctx.clearRect(0, 0, canvas.width, canvas.height);
              detectedObjects.forEach(prediction => {
                const [x, y, width, height] = prediction.bbox;
                const meta = CLASS_METADATA[prediction.class] || { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: prediction.class };

                ctx.beginPath();
                ctx.rect(x, y, width, height);
                
                ctx.fillStyle = meta.bg;
                ctx.fill();

                ctx.strokeStyle = meta.color;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Corner accents
                const cornerLength = 15;
                ctx.beginPath();
                // Top-left
                ctx.moveTo(x, y + cornerLength);
                ctx.lineTo(x, y);
                ctx.lineTo(x + cornerLength, y);
                // Top-right
                ctx.moveTo(x + width - cornerLength, y);
                ctx.lineTo(x + width, y);
                ctx.lineTo(x + width, y + cornerLength);
                // Bottom-right
                ctx.moveTo(x + width, y + height - cornerLength);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x + width - cornerLength, y + height);
                // Bottom-left
                ctx.moveTo(x + cornerLength, y + height);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x, y + height - cornerLength);
                
                ctx.strokeStyle = meta.color;
                ctx.lineWidth = 5;
                ctx.stroke();

                // Label
                ctx.font = 'bold 14px Inter, sans-serif';
                const textWidth = ctx.measureText(meta.label).width;
                
                // Draw label background
                ctx.fillStyle = meta.color;
                ctx.fillRect(x - 1.5, y - 24, textWidth + 12, 24);
                
                // Draw label text
                ctx.fillStyle = '#0f172a'; // slate-950
                ctx.textBaseline = 'middle';
                ctx.fillText(meta.label, x + 4.5, y - 12);
              });
          }
      }
      lastDetectTimeRef.current = timestamp;
    }

    if (isDetectingRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadModel() {
      await tf.ready();
      const model = await cocossd.load();
      if (mounted) {
        modelRef.current = model;
        setModelLoaded(true);
      }
    }
    loadModel();
    
    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 font-sans relative overflow-hidden z-0">
      {/* Ambient background meshes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full bg-emerald-600/10 blur-[100px] -z-10 pointer-events-none" />

      <header className="w-full max-w-4xl flex items-center justify-between border-b border-white/10 pb-4 mb-4 z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              OtoSay
            </h1>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              {totalCount} {activeCategory === 'all' ? 'nesne' : CATEGORY_LABELS[activeCategory].toLowerCase()} tespit edildi
            </p>
          </div>
        </div>

        <button
          onClick={() => cameraActive ? stopCamera() : startCamera()}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all backdrop-blur-md ${
            cameraActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${
            cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`} />
          <span className="text-xs font-mono font-medium text-slate-300">
            {!modelLoaded ? 'Yükleniyor...' : cameraActive ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
          </span>
        </button>
      </header>

      <div className="w-full max-w-4xl flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide z-10">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all backdrop-blur-md ${
              activeCategory === key 
                ? 'bg-cyan-500/90 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400' 
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="w-full max-w-4xl flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 items-start my-2 z-10">
        <div className="md:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative group">
          {cameraError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6">
              <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
              <p className="text-sm font-semibold text-rose-300">{cameraError}</p>
            </div>
          )}

          <div className="relative w-full aspect-video bg-black/40 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover select-none" muted playsInline />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl">
            <h3 className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-2">Detaylar</h3>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto scrollbar-hide">
              {CATEGORIES[activeCategory]
                .filter(key => activeCategory !== 'all' || (objectCounts[key] && objectCounts[key] > 0))
                .map(key => {
                const meta = CLASS_METADATA[key] || { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: key };
                const count = objectCounts[key] || 0;
                return (
                  <div key={key} className={`flex items-center justify-between px-1.5 py-0.5 rounded ${count > 0 ? 'bg-slate-800/50' : 'bg-transparent'}`}>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className={`text-[10px] font-medium truncate ${count > 0 ? 'text-slate-200' : 'text-slate-600'}`}>{meta.label}</span>
                    </span>
                    <span className={`text-[10px] font-bold font-mono px-1 rounded ${count > 0 ? 'bg-slate-950 text-white' : 'text-slate-700'}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl">
            <h3 className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-2">Yoğunluk (Son 1 Dk)</h3>
            <div className="h-24 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <YAxis domain={[0, 'dataMax + 2']} hide />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#06b6d4" 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
