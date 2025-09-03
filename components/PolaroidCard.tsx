
import React, { useRef, useState, useCallback, DragEvent } from 'react';
import { useTranslations } from '../hooks/useTranslations';

type CardStatus = 'idle' | 'loading' | 'error' | 'done';

interface PolaroidCardProps {
  status: CardStatus;
  imageUrl?: string;
  caption?: string;
  error?: string;
  onImageUpload?: (file: File) => void;
  onImageClick?: (src: string) => void;
  onDownload?: () => void;
}

const CameraIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const PolaroidCard: React.FC<PolaroidCardProps> = ({ status, imageUrl, caption, error, onImageUpload, onImageClick, onDownload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslations();
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && onImageUpload) {
      onImageUpload(event.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    if (status === 'idle') {
      fileInputRef.current?.click();
    } else if (status === 'done' && imageUrl && onImageClick) {
      onImageClick(imageUrl);
    }
  };

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (status === 'idle' && e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
  }, [status]);
  const handleDragOut = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (status === 'idle' && e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImageUpload) {
      onImageUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onImageUpload, status]);

  const frameClasses = "bg-white p-4 pb-16 relative flex flex-col w-full shadow-lg rounded transition-transform duration-300 ease-in-out hover:scale-105 hover:rotate-2 hover:shadow-2xl";
  const contentClasses = "relative w-full aspect-square bg-slate-200 flex items-center justify-center group";
  const captionClasses = "absolute bottom-4 left-4 right-4 text-center font-['Caveat',_cursive] text-slate-800 text-xl";

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
            <div className={`${contentClasses} flex-col`}>
                <CameraIcon />
                <p className="font-sans text-lg font-medium text-slate-600 tracking-wider">UPLOAD PHOTO</p>
            </div>
        );
      case 'loading':
        return (
          <div className={`${contentClasses} animate-pulse`}>
            <Spinner />
          </div>
        );
      case 'error':
        return (
          <div className={`${contentClasses} bg-red-100`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        );
      case 'done':
        if (imageUrl) {
          return (
            <div className={contentClasses}>
              <img src={imageUrl} alt={caption} className="w-full h-full object-cover" />
              {onDownload && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownload();
                    }}
                    className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`${t('downloadButton')} ${caption}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
              )}
            </div>
          );
        }
        return <div className={contentClasses} />; // Placeholder if done but no image
    }
  };

  return (
    <div 
      className={frameClasses}
      onClick={handleButtonClick}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleButtonClick();
          }
      }}
    >
        {status === 'idle' && (
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
            />
        )}
      {renderContent()}
      <p className={captionClasses}>{caption || (status === 'idle' ? "Click to Begin" : "")}</p>
    </div>
  );
};
