import { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Wand2, Loader2, Download, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_STYLES = [
  { id: 'cyberpunk', label: '赛博朋克', prompt: 'convert this image to a cyberpunk style' },
  { id: 'watercolor', label: '水彩画', prompt: 'convert this image to a watercolor painting style' },
  { id: 'anime', label: '动漫', prompt: 'convert this image to a high-quality anime style' },
  { id: 'oil-painting', label: '油画', prompt: 'convert this image to an oil painting style' },
  { id: 'sketch', label: '素描', prompt: 'convert this image to a pencil sketch style' },
];

export default function App() {
  const [originalImage, setOriginalImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(PRESET_STYLES[0].id);
  const [customStyle, setCustomStyle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      setOriginalImage({
        url: result,
        base64,
        mimeType: file.type,
      });
      setGeneratedImage(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      setOriginalImage({
        url: result,
        base64,
        mimeType: file.type,
      });
      setGeneratedImage(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let prompt = '';
      if (selectedStyle === 'custom') {
        prompt = `convert this image to ${customStyle} style`;
      } else {
        prompt = PRESET_STYLES.find(s => s.id === selectedStyle)?.prompt || '';
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: originalImage.base64,
                mimeType: originalImage.mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          setGeneratedImage(imageUrl);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('No image was generated. Please try a different prompt or image.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the image.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `styled-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Wand2 size={18} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">AI 风格转换器</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!originalImage ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto"
          >
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center hover:bg-zinc-100 hover:border-indigo-400 transition-colors cursor-pointer bg-white shadow-sm"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-medium mb-2">点击或拖拽上传图片</h3>
              <p className="text-sm text-zinc-500">支持 JPG, PNG 等常见格式</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar / Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">选择风格</h3>
                <div className="space-y-2">
                  {PRESET_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedStyle === style.id
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium'
                          : 'bg-zinc-50 text-zinc-700 border border-transparent hover:bg-zinc-100'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedStyle('custom')}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all mb-2 ${
                        selectedStyle === 'custom'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium'
                          : 'bg-zinc-50 text-zinc-700 border border-transparent hover:bg-zinc-100'
                      }`}
                    >
                      自定义风格
                    </button>
                    <AnimatePresence>
                      {selectedStyle === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <input
                            type="text"
                            value={customStyle}
                            onChange={(e) => setCustomStyle(e.target.value)}
                            placeholder="例如：梵高星空、赛博朋克..."
                            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-100">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || (selectedStyle === 'custom' && !customStyle.trim())}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Wand2 size={18} />
                        开始转换
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  setOriginalImage(null);
                  setGeneratedImage(null);
                  setError(null);
                }}
                className="w-full py-3 px-4 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <RefreshCw size={18} />
                重新上传图片
              </button>
            </div>

            {/* Image Display Area */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Image */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                    <ImageIcon size={16} /> 原图
                  </h3>
                  <div className="bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 aspect-square relative flex items-center justify-center">
                    <img
                      src={originalImage.url}
                      alt="Original"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>

                {/* Generated Image */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                      <Wand2 size={16} /> 转换结果
                    </h3>
                    {generatedImage && (
                      <button
                        onClick={handleDownload}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Download size={14} /> 下载
                      </button>
                    )}
                  </div>
                  <div className="bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 aspect-square relative flex items-center justify-center">
                    {isGenerating ? (
                      <div className="flex flex-col items-center text-zinc-400 gap-3">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <p className="text-sm font-medium">AI 正在施展魔法...</p>
                      </div>
                    ) : generatedImage ? (
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={generatedImage}
                        alt="Generated"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-zinc-400 text-sm flex flex-col items-center gap-2">
                        <ImageIcon size={32} className="opacity-50" />
                        <p>点击左侧按钮开始转换</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
