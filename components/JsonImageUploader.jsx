import { useState, useRef } from 'react';
import { Loader2, Image as ImageIcon, Copy, CheckCircle2 } from 'lucide-react';

export default function JsonImageUploader({ csrfToken }) {
    const [uploading, setUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadedUrl('');
        setCopied(false);

        try {
            const headers = {};
            if (csrfToken) {
                headers['x-csrf-token'] = csrfToken;
            }
            const res = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                headers,
                body: file
            });
            const data = await res.json();
            if (data.url) {
                setUploadedUrl(data.url);
            } else {
                alert("Upload failed: " + JSON.stringify(data));
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = ''; // inputni tozalash
        }
    };

    const handleCopy = () => {
        if (!uploadedUrl) return;
        
        // Copy / Paste tizimda blocklangan bo'lsa ham navigator ishlaydi
        navigator.clipboard.writeText(uploadedUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }).catch(err => {
            alert("Nusxalash himoyasi sabab bloklandi, iltimos linkni o'zingiz belgilab (ctrl+c) qiling:\n" + uploadedUrl);
        });
    };

    return (
        <div className="bg-gray-100/50 dark:bg-gray-900/50 p-4 rounded-2xl flex flex-col gap-3 mb-5 border-2 border-dashed border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-3">
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleUpload} 
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                    {uploading ? "Yuklanmoqda..." : "Rasm qo'shish"}
                </button>

                {uploadedUrl && (
                    <div className="flex-1 flex items-center min-w-[300px] gap-2 bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-700 p-1.5 pl-4 rounded-xl shadow-inner">
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 font-mono select-all selection:bg-blue-200 selection:text-blue-900">
                            {uploadedUrl}
                        </span>
                        <button 
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                copied 
                                ? 'bg-green-500 text-white shadow-green-500/30' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 hover:shadow'
                            }`}
                        >
                            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                            {copied ? "Nusxalandi" : "Nusxalash"}
                        </button>
                    </div>
                )}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500 max-w-2xl leading-relaxed">
                <b className="text-gray-700 dark:text-gray-300">Qo'llash tartibi:</b> Rasmni yuklab linkini oling va JSON ichida savol yoxud variantlar orasiga <code>"image_url": "link"</code> deya chiroyli qo'shing. 
                <i> (Masalan: <code>{`{ "id": 1, "question": "Bu nima?", "image": "SizOlgannusxaLink" }`}</code>)</i>
            </div>
        </div>
    );
}
