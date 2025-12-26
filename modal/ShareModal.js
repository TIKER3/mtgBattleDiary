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
        return await html2canvas(captureRef.current, { 
            scale: 2, 
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false
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
        const text = `MTG Result: ${record.deckName}\n${record.eventWins}-${record.eventLosses}\n#MTG #MTGBattleDiary`;
        
        try {
            const canvas = await captureImage();
            if (!canvas) throw new Error("Canvas generation failed");

            if (navigator.share && navigator.canShare) {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], "result.png", { type: "image/png" });
                
                if (navigator.canShare({ files: [file] })) {
                    // シェア実行 (ここでOSの画面が開く)
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
            // キャンセル時やエラー時
            console.error("Share failed or cancelled", err);
        } finally {
            // ★修正: シェア処理が終わってもモーダルを閉じない（キャンセル時の"空白画面"対策）
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
                        {/* Header: items-start -> items-center に変更して中央揃え */}
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <div className="flex items-center gap-3 text-slate-500 text-sm font-bold mb-2">
                                    <span className="flex items-center gap-1"><Icon name="calendar" size={16}/> {record.date}</span>
                                    {record.location && <span className="bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200"><Icon name="map-pin" size={14}/> {record.location}</span>}
                                </div>
                                <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">{record.deckName}</h1>
                            </div>
                            <div className={`text-5xl font-black px-6 py-4 rounded-xl border-4 ${scoreColor} tracking-tighter`}>
                                {record.eventWins}-{record.eventLosses}
                            </div>
                        </div>
                        <div className="space-y-4">
                            {record.matches.map((match, i) => (
                                <div key={i} className="border-2 border-slate-100 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-slate-800 text-white text-sm font-bold px-2.5 py-1 rounded">R{match.id}</span>
                                            <span className="font-bold text-xl text-slate-700 tracking-tight">{match.opponentDeck || "Unknown Deck"}</span>
                                        </div>
                                        <span className={`text-lg font-black uppercase ${match.matchResult === 'win' ? 'text-blue-600' : match.matchResult === 'loss' ? 'text-red-600' : 'text-slate-400'}`}>
                                            {match.matchResult === 'win' ? 'WIN' : match.matchResult === 'loss' ? 'LOSS' : 'DRAW'}
                                        </span>
                                    </div>
                                    <div className="bg-white p-4 space-y-2">
                                        {match.games.map((g, j) => {
                                            if (!g.result && !g.memo && g.onPlay === null) return null;
                                            const isWin = g.result === 'win';
                                            const isLoss = g.result === 'loss';
                                            return (
                                                /* List Item: items-start -> items-center に変更して中央揃え */
                                                <div key={j} className="flex items-center gap-3 text-sm">
                                                    <div className="flex flex-col gap-1 mt-0.5">
                                                        {g.onPlay !== null && (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-center border ${g.onPlay ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                                                {g.onPlay ? '先' : '後'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`font-black font-mono w-5 text-center text-base ${isWin ? 'text-blue-600' : isLoss ? 'text-red-600' : 'text-slate-300'}`}>
                                                        {isWin ? 'W' : isLoss ? 'L' : '-'}
                                                    </span>
                                                    <span className="text-slate-600 flex-1 leading-relaxed border-b border-slate-50 pb-1 text-base">
                                                        {g.memo || <span className="text-slate-300 italic text-xs">No memo</span>}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-4 border-t border-slate-100 text-right text-slate-400 text-xs font-bold flex justify-end items-center gap-1 uppercase tracking-widest">
                            <Icon name="pen-tool" size={12}/> MTG Battle Diary
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t space-y-3 shrink-0">
                    <button onClick={downloadImage} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 transition">
                        <Icon name="download" /> 画像を保存
                    </button>
                    
                    {/* スマホの場合のみXシェアボタンを表示 */}
                    {isMobile ? (
                        <button onClick={shareToX} disabled={isSharing} className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 transition disabled:opacity-50">
                            {isSharing ? "準備中..." : <><Icon name="twitter" /> Xでシェア (画像付き)</>}
                        </button>
                    ) : (
                        <p className="text-center text-[10px] text-slate-400">
                            ※ PCでは画像を保存し、X等へ手動で投稿してください。
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// グローバルにShareModalを公開
window.ShareModal = ShareModal;
