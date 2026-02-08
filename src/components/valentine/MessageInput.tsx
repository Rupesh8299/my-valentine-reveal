import { useState, useRef } from 'react';
import { Send, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface MessageInputProps {
  dayName: string;
  partnerName: string;
  placeholder?: string;
}

const MessageInput = ({ dayName, partnerName, placeholder }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // REPLACE WITH YOUR EMAIL (using standard endpoint for better file support)
  const FORM_ENDPOINT = "https://formsubmit.co/Rupesh8299@gmail.com";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('message', message);
    formData.append('day', dayName);
    formData.append('sender', partnerName || 'Anonymous');
    if (selectedFile) {
      formData.append('Image', selectedFile); // Using 'Image' instead of 'attachment'
    }
    // FormSubmit configuration
    formData.append('_subject', `New Message from ${partnerName} on ${dayName}!`);
    formData.append('_captcha', 'false');
    formData.append('_template', 'table');

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
      });

      if (response.ok) {
        toast.success("Message sent successfully! 💌");
        setMessage('');
        clearFile();
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mt-4 flex justify-center z-40 px-2 pointer-events-auto">
      <form 
        onSubmit={handleSubmit}
        className="w-full glass-card p-2 rounded-xl border border-white/20 shadow-inner bg-black/20 focus-within:bg-black/40 transition-all duration-300"
      >
        {previewUrl && (
          <div className="relative mb-2 mx-2 mt-2 w-20 h-20 rounded-lg overflow-hidden border border-white/20 group">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-0 right-0 bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
            title="Attach photo"
          >
            <ImageIcon size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder || `Write a message for ${dayName}...`}
            className="flex-1 bg-transparent border-none text-white placeholder:text-white/50 focus:outline-none text-sm md:text-base py-2 min-w-0"
            disabled={isSubmitting}
          />

          <button
            type="submit"
            disabled={(!message.trim() && !selectedFile) || isSubmitting}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-1"
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
