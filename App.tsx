
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { editImageWithGemini } from './services/geminiService';
import { useTranslations } from './hooks/useTranslations';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { PolaroidCard } from './components/PolaroidCard';
import { Footer } from './components/Footer';

const MAX_SELECTIONS = 5;

type AppView = 'upload' | 'customize' | 'results';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('upload');
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const { t, language, setLanguage } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'vi' : 'en');
  };

  const PHOTOSHOOT_STYLES = useMemo(() => ({
    [t('category_optional_presets')]: [
      { id: 'smiling_portrait', name: t('style_smiling_portrait'), prompt: 'A portrait of the person from the original photo, but they are smiling warmly at the camera. Maintain the exact same background, lighting, and overall style as the original image.' },
      { id: 'serious_close_up', name: t('style_serious_close_up'), prompt: "A dramatic close-up shot focusing on the person's face, with a serious and confident expression. Maintain the exact same background, clothing, lighting, and overall style as the original image." },
      { id: 'thoughtful_look', name: t('style_thoughtful_look'), prompt: 'A three-quarter portrait of the person from the original photo, but they are looking thoughtfully away from the camera, into the distance. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'side_profile', name: t('style_side_profile'), prompt: 'A portrait of the person from the original photo taken from a side profile angle. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'head_tilt', name: t('style_head_tilt'), prompt: 'A portrait of the person from the original photo, with their head tilted slightly, showing a curious and engaging expression. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'playful_wink', name: t('style_playful_wink'), prompt: 'A close-up portrait of the person from the original photo giving a playful wink to the camera. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'soft_smile', name: t('style_soft_smile'), prompt: 'A portrait of the person from the original photo with a soft, gentle, closed-mouth smile. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'over_shoulder_glance', name: t('style_over_shoulder_glance'), prompt: 'A close-up portrait of the person from the original photo, glancing over their shoulder towards the camera with a subtle expression. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'eyes_closed', name: t('style_eyes_closed'), prompt: 'A peaceful close-up portrait of the person from the original photo with their eyes gently closed, showing a serene or blissful expression. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'hand_on_chin', name: t('style_hand_on_chin'), prompt: 'A portrait of the person from the original photo with their hand resting thoughtfully on their chin, looking pensive or creative. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'peeking', name: t('style_peeking'), prompt: 'A playful portrait of the person from the original photo peeking through the gaps in their fingers, which are covering their face. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'hair_in_motion', name: t('style_hair_in_motion'), prompt: 'A dynamic photo of the person from the original photo where their hair is in motion, as if caught in a gentle breeze or during a turn. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'hand_towards_camera', name: t('style_hand_towards_camera'), prompt: 'A dynamic photo where the person from the original photo is reaching one hand out towards the camera in a friendly, inviting gesture. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'confident_full_body', name: t('style_confident_full_body'), prompt: 'A full-body shot of the person from the original photo, showing their complete outfit. They should be standing in a relaxed but confident pose. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'walking_pose', name: t('style_walking_pose'), prompt: 'A full-body shot of the person from the original photo, captured as if they are walking confidently. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'hands_in_pockets', name: t('style_hands_in_pockets'), prompt: 'A medium shot of the person from the original photo, standing casually with their hands in their pockets. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'arms_crossed', name: t('style_arms_crossed'), prompt: 'A medium shot of the person from the original photo, with their arms crossed confidently, looking directly at the camera. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'hand_on_hip', name: t('style_hand_on_hip'), prompt: 'A three-quarter shot of the person from the original photo with one hand placed confidently on their hip. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'leaning_pose', name: t('style_leaning_pose'), prompt: 'A full-body shot of the person from the original photo, leaning casually against an unseen object, looking relaxed. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'looking_down', name: t('style_looking_down'), prompt: 'A medium shot of the person from the original photo looking down with a gentle, introspective expression. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'sitting_on_floor', name: t('style_sitting_on_floor'), prompt: 'A full-body shot of the person from the original photo sitting casually on the floor, in a relaxed pose. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'jumping_in_air', name: t('style_jumping_in_air'), prompt: 'An energetic full-body shot of the person from the original photo captured mid-jump, expressing joy or excitement. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'leaning_forward', name: t('style_leaning_forward'), prompt: 'A medium shot of the person from the original photo leaning forward towards the camera, as if sharing a secret, with an engaging expression. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'fixing_hair', name: t('style_fixing_hair'), prompt: 'A candid medium shot of the person from the original photo in the middle of casually fixing or running a hand through their hair. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'dynamic_pose', name: t('style_dynamic_pose'), prompt: 'A photo of the person from the original photo in a more dynamic or active pose, like turning, walking, or interacting with the environment. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'candid_moment', name: t('style_candid_moment'), prompt: 'A candid-style photo of the person from the original photo, as if they were captured in a natural, unposed moment, perhaps adjusting their clothing or hair. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'looking_over_shoulder', name: t('style_looking_over_shoulder'), prompt: 'A photo of the person from the original photo, looking back over their shoulder at the camera with a slight smile. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'adjusting_jacket', name: t('style_adjusting_jacket'), prompt: 'A candid-style photo of the person from the original photo in the middle of adjusting their jacket, collar, or sleeve. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'dancing_pose', name: t('style_dancing_pose'), prompt: 'A dynamic full-body shot of the person from the original photo in a fluid dancing pose, expressing movement and joy. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'twirling_shot', name: t('style_twirling_shot'), prompt: 'A dynamic full-body shot of the person from the original photo captured mid-twirl, with their clothing and hair showing motion. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'shielding_eyes', name: t('style_shielding_eyes'), prompt: 'A photo of the person from the original photo using their hand to shield their eyes from a bright light source (like the sun), creating a natural, candid look. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
      { id: 'tying_shoelaces', name: t('style_tying_shoelaces'), prompt: 'A candid shot of the person from the original photo bending down or crouching to tie their shoelaces. Maintain the exact same background, clothing, lighting, and overall style as the original image.' },
    ],
    [t('category_trending')]: [
      { 
        id: 'mini_model', 
        name: t('style_mini_model'), 
        prompt: 'Create a 1/7 scale commercialized figurine of the characters in the picture, in a realistic style, in a real environment. The figurine is placed on a computer desk. The figurine has a round transparent acrylic base. The content on the computer screen is the Zbrush modeling process of this figurine. Next to the computer screen is a BANDAI-style toy packaging box printed with the original artwork. The packaging features two-dimensional flat illustrations.' 
      },
      {
        id: 'photoshoot_with_lotus',
        name: t('style_photoshoot_with_lotus'),
        prompt: 'Tạo một bức ảnh chụp chân thật và tự nhiên của người trong ảnh gốc, trong bối cảnh "Bên cạnh hoa sen hồng". YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của người trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt. Bức ảnh phải thể hiện được niềm tự hào dân tộc Việt Nam một cách sâu sắc. Ảnh phải có chất lượng cao, sắc nét, với tông màu đỏ của quốc kỳ làm chủ đạo nhưng vẫn giữ được sự hài hòa, tự nhiên. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.'
      },
      {
        id: 'mid_autumn_lantern',
        name: t('style_mid_autumn_lantern'),
        prompt: 'Tạo một bức ảnh chụp chân thật và tự nhiên của người trong ảnh gốc, trong bối cảnh "Cầm lồng đèn Trung Thu". YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của người trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt. Bức ảnh phải thể hiện được niềm tự hào dân tộc Việt Nam một cách sâu sắc. Ảnh phải có chất lượng cao, sắc nét, với tông màu đỏ của quốc kỳ làm chủ đạo nhưng vẫn giữ được sự hài hòa, tự nhiên. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.'
      }
    ],
    [t('category_artistic')]: [
      { id: 'oil_painting', name: t('style_oil_painting'), prompt: 'As an oil painting, with visible brushstrokes and a classic feel.' },
      { id: 'anime', name: t('style_anime'), prompt: 'In a vibrant anime style, with sharp lines and expressive features.' },
      { id: 'pixel_art', name: t('style_pixel_art'), prompt: 'As 16-bit pixel art.' },
      { id: 'ghibli', name: t('style_ghibli'), prompt: 'In the style of a Ghibli Studio animation, with a whimsical and hand-drawn look.' },
      { id: 'wuxia', name: t('style_wuxia'), prompt: 'In the style of a Wuxia film, with dramatic lighting, traditional Chinese martial arts attire, and an epic, cinematic feel.' },
      { id: 'gothic', name: t('style_gothic'), prompt: 'In a dark, gothic art style, with moody lighting, ornate details, and a mysterious, romantic atmosphere.' },
    ]
  }), [t]);

  const handleBackToCustomize = () => {
    setGeneratedImages([]);
    setError(null);
    setIsLoading(false);
    setView('customize');
  };

  const handleImageUpload = (file: File) => {
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl);
    }
    setGeneratedImages([]);
    setSelectedStyles([]);
    setCustomPrompt('');
    setError(null);
    setIsLoading(false);
    setOriginalImageFile(file);
    setOriginalImageUrl(URL.createObjectURL(file));
    setView('customize');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleImageUpload(event.target.files[0]);
    }
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleImageChangeClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectStyle = (styleId: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(styleId)) {
        return prev.filter(id => id !== styleId);
      }
      if (prev.length >= MAX_SELECTIONS) {
        setSelectionError(t('selectionLimitError', { max: MAX_SELECTIONS }));
        setTimeout(() => setSelectionError(null), 3000);
        return prev;
      }
      return [...prev, styleId];
    });
  };

  const handleClearSelection = () => setSelectedStyles([]);

  const handleGenerate = useCallback(async () => {
    if (!originalImageFile) {
      setError(t('error_no_image'));
      return;
    }

    setView('results');
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const stylePrompts = Object.values(PHOTOSHOOT_STYLES)
        .flat()
        .filter(option => selectedStyles.includes(option.id))
        .map(option => option.prompt);

      const allPrompts = [...stylePrompts];
      if (customPrompt.trim()) {
          allPrompts.push(customPrompt.trim());
      }
      
      if (allPrompts.length === 0) {
        allPrompts.push('A realistic, high-quality photograph.');
      }

      const generationPromises = allPrompts.map(prompt =>
        editImageWithGemini(originalImageFile, `Generate a photorealistic image. It is crucial to maintain the exact facial features, expression, and clothing of the person in the original photo. Apply the following style or pose: ${prompt}`)
      );

      const results = await Promise.all(generationPromises);
      const imageUrls = results.map(result => result.imageUrl);
      setGeneratedImages(imageUrls);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'error_unknown';
      setError(t(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [originalImageFile, selectedStyles, t, PHOTOSHOOT_STYLES, customPrompt]);

  const handleImageClick = (src: string) => setPreviewImageUrl(src);
  const handleClosePreview = () => setPreviewImageUrl(null);
  
  const handleDownloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `AuraAi_Image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const generationCount = selectedStyles.length + (customPrompt.trim() ? 1 : 0);
  const displayCount = generationCount === 0 ? 1 : generationCount;

  const renderContent = () => {
    switch (view) {
      case 'upload':
        return (
          <section className="w-full max-w-lg animate-fade-in mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-slate-100">1) {t('yourPhotoTitle')}</h2>
            <PolaroidCard
              status='idle'
              onImageUpload={handleImageUpload}
            />
            <p className="text-slate-400 mt-6 text-center">{t('uploadPrompt')}</p>
          </section>
        );
      case 'customize':
        return (
          <section className="animate-fade-in">
            <div className="w-full max-w-3xl mx-auto bg-slate-800 border border-slate-700 rounded-lg p-6 sm:p-8 shadow-sm flex flex-col">
              {/* Original Photo Display */}
              <div className="flex flex-col items-center gap-4 mb-8 pb-8 border-b border-slate-700">
                  <h2 className="text-xl md:text-2xl font-bold text-center w-full text-slate-100">{t('yourPhotoTitle')}</h2>
                  <div className="w-64 transform rotate-2">
                    <PolaroidCard
                      status="done"
                      imageUrl={originalImageUrl}
                      caption={originalImageFile?.name || t('yourSelectedPhoto')}
                    />
                  </div>
                  <button
                      onClick={handleImageChangeClick}
                      className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 font-medium py-2 px-4 rounded-md transition-colors text-sm whitespace-nowrap"
                  >
                      {t('changeImageButton')}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
              </div>

              {/* Customization Panel */}
              <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-2 text-slate-100">2) {t('customizeTitle')}</h2>
                  
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-400">{t('customizeSubtitle')}</p>
                    <span className="text-slate-300 font-medium">
                      {t('selectionCounter', { count: selectedStyles.length, max: MAX_SELECTIONS })}
                    </span>
                  </div>
                  
                  {selectionError && (
                    <div className="mb-4 text-center text-red-400 animate-fade-in">
                      {selectionError}
                    </div>
                  )}

                  <div className="flex justify-end gap-4 mb-4">
                      <button onClick={handleClearSelection} className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium">{t('clearSelection')}</button>
                  </div>

                  <div className="flex-grow space-y-6 overflow-y-auto pr-2 -mr-2 max-h-[50vh]">
                      {Object.entries(PHOTOSHOOT_STYLES).map(([category, styles], index) => (
                          <div 
                          key={category}
                          className="animate-slide-in-bottom"
                          style={{ animationDelay: `${index * 100}ms` }}
                          >
                          <h3 className="font-bold text-lg mb-3 text-slate-300 border-b border-slate-700 pb-2">{category}</h3>
                          {category === t('category_optional_presets') && (
                              <p className="text-sm text-slate-400 mb-3">{t('optionalPresetsNote')}</p>
                          )}
                          {category === t('category_artistic') && (
                              <p className="text-sm text-slate-400 italic mb-3">{t('realisticStyleNote')}</p>
                          )}
                          <div className="flex flex-wrap gap-3">
                              {styles.map(style => (
                              <button
                                  key={style.id}
                                  onClick={() => handleSelectStyle(style.id)}
                                  title={style.prompt}
                                  disabled={!selectedStyles.includes(style.id) && selectedStyles.length >= MAX_SELECTIONS}
                                  className={`px-4 py-2 rounded-md transition-all duration-200 text-sm border ${
                                  selectedStyles.includes(style.id)
                                      ? 'bg-[#D4AF37] text-black font-semibold border-[#D4AF37] shadow-lg shadow-amber-500/20'
                                      : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                  {style.name}
                              </button>
                              ))}
                          </div>
                          </div>
                      ))}

                      <div 
                          className="animate-slide-in-bottom"
                          style={{ animationDelay: `${Object.keys(PHOTOSHOOT_STYLES).length * 100}ms` }}
                      >
                          <h3 className="font-bold text-lg mb-3 text-slate-300 border-b border-slate-700 pb-2">{t('customPromptTitle')}</h3>
                          <textarea
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              placeholder={t('customPromptPlaceholder')}
                              className="w-full h-24 bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              aria-label={t('customPromptTitle')}
                          />
                      </div>
                  </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col items-center">
                  <button
                      onClick={handleGenerate}
                      disabled={isLoading || !originalImageFile || (generationCount === 0)}
                      className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100 w-full md:w-auto"
                  >
                      {isLoading ? t('generatingButton') : `${t('generateButton')} (${displayCount})`}
                  </button>
                  {error && <p className="mt-4 text-red-400 text-center animate-fade-in">{error}</p>}
              </div>

            </div>
          </section>
        );
      case 'results':
        return (
          <section className="w-full max-w-5xl mx-auto animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-slate-100">{t('generatedPortraitsTitle')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {isLoading && Array.from({ length: displayCount }).map((_, index) => (
                <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 150}ms` }}>
                  <PolaroidCard status='loading' caption={t('generatingPlaceholder')} />
                </div>
              ))}
              
              {!isLoading && error && (
                <div className="sm:col-span-2 lg:col-span-3 text-center bg-red-900/50 border border-red-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-red-300 mb-2">{t('errorPrefix')}</h3>
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {!isLoading && generatedImages.map((src, index) => (
                <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 150}ms` }}>
                  <PolaroidCard
                    status='done'
                    imageUrl={src}
                    caption={`${t('generatedImage')} #${index + 1}`}
                    onImageClick={() => handleImageClick(src)}
                    onDownload={() => handleDownloadImage(src)}
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <button onClick={handleBackToCustomize} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2 px-6 rounded-md transition-colors">
                {t('backToCustomizeButton')}
              </button>
            </div>
          </section>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center p-4 sm:p-6 md:p-8 pb-20">
      
      {/* Header */}
      <header className="text-center mb-8 md:mb-12 w-full animate-fade-in">
        <div className="flex justify-center items-center gap-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold title-aurora">{t('mainTitle')}</h1>
          <button onClick={toggleLanguage} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
            {language === 'en' ? 'VI' : 'EN'}
          </button>
        </div>
        <p className="text-slate-400 mt-2 text-base md:text-lg">{t('subtitle')}</p>
      </header>

      {/* Main Content */}
      <main className="w-full flex-grow flex items-start justify-center">
        {renderContent()}
      </main>

      {/* Preview Modal */}
      {previewImageUrl && <ImagePreviewModal src={previewImageUrl} onClose={handleClosePreview} />}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;
