// Reactのフックなどをグローバルから取得
const { useState, useEffect, useRef, useMemo } = React;

// --- Icon Component (共通パーツ) ---
const Icon = ({ name, size = 18, className = "" }) => {
    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, [name]); 
    return <i data-lucide={name} width={size} height={size} className={className}></i>;
};

// グローバルにIconを公開
window.Icon = Icon;

// --- Share Modal Component ---
const ShareModal = ({ record, onClose }) => {
    const captureRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);

    // スマホ判定
    const isMobile = useMemo(() => {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }, []);

    const captureImage = async () => {
        if (!captureRef.current) return null;
        
        const element = captureRef.current;
        // 要素のスクロールを含めた全体のサイズを取得
        const { scrollWidth, scrollHeight } = element;

        return await html2canvas(element, { 
            scale: 3, 
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            width: scrollWidth,
            height: scrollHeight,
            windowWidth: scrollWidth,
            windowHeight: scrollHeight
        });
    };

    const downloadImage = async () => {
        try {
            const canvas = await captureImage();
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = `mtg_result_${record.date}_${record.deckName.replace(/\s+/g,'_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error(err);
            alert("画像の保存に失敗しました。");
        }
    };

    // スマホ専用: Web Share APIで画像付きシェア
    const shareToX = async () => {
        setIsSharing(true);
        const text = `MTG Result: ${record.deckName} (${record.format || 'Modern'})\n${record.eventWins}-${record.eventLosses}\n#MTG #MTGBattleDiary`;
        
        try {
            const canvas = await captureImage();
            if (!canvas) throw new Error("Canvas generation failed");

            if (navigator.share && navigator.canShare) {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], "result.png", { type: "image/png" });
                
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        text: text,
                        files: [file]
                    });
                } else {
                    alert("お使いの環境は画像の直接共有に対応していません。画像を保存して手動で投稿してください。");
                }
            } else {
                alert("Web Share APIがサポートされていません。");
            }
        } catch (err) {
            console.error("Share failed or cancelled", err);
        } finally {
            setIsSharing(false);
        }
    };

    const scoreColor = record.eventWins > record.eventLosses ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                       record.eventLosses > record.eventWins ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-600 bg-slate-100';

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Icon name="share-2" size={18}/> 結果をシェア
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={20}/></button>
                </div>
                
                <div className="p-6 bg-slate-200 overflow-auto flex-1 flex justify-center items-start">
                    <div ref={captureRef} className="w-[600px] min-w-[600px] bg-white p-8 rounded-xl shadow-lg text-slate-800 font-sans border border-slate-200 box-border">
                        
                        {/* Header */}
                        <div className="flex justify-between items-stretch mb-8 h-20">
                            <div className="flex flex-col justify-between">
                                <div className="flex items-center gap-3 text-slate-500 text-sm font-bold">
                                    <span className="flex items-center gap-1 h-6"><Icon name="calendar" size={16}/> {record.date}</span>
                                    {/* フォーマット表示を追加 */}
                                    <span className="bg-slate-800 text-white px-2 rounded-full flex items-center gap-1 h-6 uppercase text-xs">{record.format || 'Format?'}</span>
                                    {record.location && <span className="bg-slate-100 px-2 rounded-full flex items-center gap-1 border border-slate-200 h-6"><Icon name="map-pin" size={14}/> {record.location}</span>}
