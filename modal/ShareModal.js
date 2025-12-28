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
const ShareModal = ({ records, onClose }) => { // propを record から records(配列) に変更
    const captureRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);

    // 単一レコードか複数レコードか判定
    const isMulti = Array.isArray(records) && records.length > 1;
    // 単一の場合は最初の要素を使用 (後方互換用)
    const singleRecord = Array.isArray(records) ? records[0] : records;

    // スマホ判定
    const isMobile = useMemo(() => {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }, []);

    const captureImage = async () => {
        if (!captureRef.current) return null;
        
        const element = captureRef.current;
        const { scrollWidth, scrollHeight } = element;

        return await html2canvas(element, { 
            scale: 2, // 複数行だと縦長になりすぎる可能性があるのでスケールを少し調整
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
            const fileName = isMulti 
                ? `mtg_summary_${new Date().toISOString().split('T')[0]}.png`
                : `mtg_result_${singleRecord.date}_${singleRecord.deckName.replace(/\s+/g,'_')}.png`;
                
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error(err);
            alert("画像の保存に失敗しました。");
        }
    };

    // スマホ専用: Web Share API (単一選択時のみ有効)
    const shareToX = async () => {
        if (isMulti) return; // 複数選択時は無効

        setIsSharing(true);
        const text = `MTG Result: ${singleRecord.deckName} (${singleRecord.format || 'Modern'})\n${singleRecord.eventWins}-${singleRecord.eventLosses}\n#MTG #MTGBattleDiary`;
        
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

    // --- レイアウトコンポーネント ---

    // 1. 既存の詳細レイアウト (単一レコード用)
    const SingleRecordView = ({ record }) => {
        const scoreColor = record.eventWins > record.eventLosses ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                           record.eventLosses > record.eventWins ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-600 bg-slate-100';

        return (
            <div className="w-[600px] min-w-[600px] bg-white p-8 rounded-xl shadow-lg text-slate-800 font-sans border border-slate-200 box-border">
                {/* Header */}
                <div className="flex justify-between items-stretch mb-8 h-20">
                    <div className="flex flex-col justify-between">
                        <div className="flex items-center gap-3 text-slate-500 text-sm font-bold">
                            <span className="flex items-center gap-1 h-6"><Icon name="calendar" size={16}/> {record.date}</span>
                            <span className="bg-slate-800 text-white px-2 rounded-full flex items-center gap-1 h-6 uppercase text-xs">{record.format || 'Format?'}</span>
                            {record.location && <span className="bg-slate-100 px-2 rounded-full flex items-center gap-1 border border-slate-200 h-6"><Icon name="map-pin" size={14}/> {record.location}</span>}
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 flex items-end leading-none pb-1">{record.deckName}</h1>
                    </div>
                    <div className={`text-5xl font-black px-6 rounded-xl border-4 ${scoreColor} h-full flex items-center justify-center leading-none ml-4`}>
                        {record.eventWins}-{record.eventLosses}
                    </div>
                </div>

                {/* Matches List */}
                <div className="space-y-4">
                    {record.matches.map((match, i) => (
                        <div key={i} className="border-2 border-slate-100 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex justify-between items-center h-14">
                                <div className="flex items-center gap-3 h-full">
                                    <span className="bg-slate-800 text-white text-sm font-bold px-2.5 rounded h-7 flex items-center justify-center leading-none">R{match.id}</span>
                                    <span className="font-bold text-xl text-slate-700 h-full flex items-center leading-none">{match.opponentDeck || "Unknown Deck"}</span>
                                </div>
                                <span className={`text-lg font-black uppercase h-full flex items-center leading-none ${match.matchResult === 'win' ? 'text-blue-600' : match.matchResult === 'loss' ? 'text-red-600' : 'text-slate-400'}`}>
                                    {match.matchResult === 'win' ? 'WIN' : match.matchResult === 'loss' ? 'LOSS' : 'DRAW'}
                                </span>
                            </div>
                            
                            <div className="bg-white p-4 space-y-2">
                                {match.games.map((g, j) => {
                                    if (!g.result && !g.memo && g.onPlay === null) return null;
                                    const isWin = g.result === 'win';
                                    const isLoss = g.result === 'loss';
                                    return (
                                        <div key={j} className="flex items-center gap-3 text-sm h-8">
                                            <div className="flex items-center justify-center w-8 h-6">
                                                {g.onPlay !== null && (
                                                    <span className={`text-[10px] font-bold px-1.5 rounded-sm text-center border w-full h-full flex items-center justify-center leading-none ${g.onPlay ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                                        {g.onPlay ? '先' : '後'}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`font-black font-mono w-6 h-6 text-center text-base flex justify-center items-center leading-none ${isWin ? 'text-blue-600' : isLoss ? 'text-red-600' : 'text-slate-300'}`}>
                                                {isWin ? 'W' : isLoss ? 'L' : '-'}
                                            </span>
                                            <span className="text-slate-600 flex-1 border-b border-slate-50 h-full flex items-center text-sm truncate leading-none">
                                                {g.memo || <span className="text-slate-300 italic text-xs">No memo</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 pt-4 border-t border-slate-100 text-right text-slate-400 text-xs font-bold flex justify-end items-center gap-1 uppercase h-8 leading-none">
                    <Icon name="pen-tool" size={12}/> MTG Battle Diary
                </div>
            </div>
        );
    };

    // 2. 新規のサマリーレイアウト (複数レコード用)
    const MultiRecordView = ({ records }) => {
        // 合計成績の計算
        const totalWins = records.reduce((acc, r) => acc + r.eventWins, 0);
        const totalLosses = records.reduce((acc, r) => acc + r.eventLosses, 0);
        const totalDraws = records.reduce((acc, r) => acc + r.eventDraws, 0);

        return (
            <div className="w-[600px] min-w-[600px] bg-white p-8 rounded-xl shadow-lg text-slate-800 font-sans border border-slate-200 box-border">
                {/* Header */}
                <div className="flex justify-between items-end mb-6 pb-4 border-b-2 border-slate-100">
                    <div>
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Icon name="layers" size={14}/> Battle History
                        </h2>
                        <h1 className="text-3xl font-black text-slate-800 leading-none">Performance Summary</h1>
                    </div>
                    <div className="text-right">
                         <div className="text-sm font-bold text-slate-500 uppercase mb-1">Total Record</div>
                         <div className="text-4xl font-black text-slate-800 leading-none">
                            <span className="text-blue-600">{totalWins}</span>
                            <span className="text-slate-300 mx-1">-</span>
                            <span className="text-red-600">{totalLosses}</span>
                            {totalDraws > 0 && <span className="text-slate-400 text-2xl ml-1">-{totalDraws}</span>}
                         </div>
                    </div>
                </div>

                {/* Records List */}
                <div className="space-y-3">
                    {records.map((rec, idx) => {
                         const scoreColor = rec.eventWins > rec.eventLosses ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                                            rec.eventLosses > rec.eventWins ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-600 bg-slate-100';
                         
                         return (
                            <div key={idx} className="flex items-stretch border border-slate-200 rounded-lg overflow-hidden h-16 bg-white shadow-sm">
                                {/* Date & Format */}
                                <div className="w-24 bg-slate-50 border-r border-slate-100 flex flex-col justify-center items-center p-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500">{rec.date}</span>
                                    <span className="text-[9px] font-bold uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded mt-1">{rec.format || 'Mod'}</span>
                                </div>
                                
                                {/* Deck Name */}
                                <div className="flex-1 flex flex-col justify-center px-4 overflow-hidden">
                                    <span className="font-bold text-slate-800 truncate text-lg leading-tight">{rec.deckName}</span>
                                    {rec.location && <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5"><Icon name="map-pin" size={10}/> {rec.location}</span>}
                                </div>

                                {/* Score */}
                                <div className={`w-20 flex justify-center items-center font-black text-2xl border-l ${scoreColor}`}>
                                    {rec.eventWins}-{rec.eventLosses}
                                </div>
                            </div>
                         );
                    })}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 text-right text-slate-400 text-xs font-bold flex justify-end items-center gap-1 uppercase h-8 leading-none">
                    <Icon name="pen-tool" size={12}/> MTG Battle Diary
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Icon name="share-2" size={18}/> 
                        {isMulti ? `まとめ画像を保存 (${records.length}件)` : "結果をシェア"}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={20}/></button>
                </div>
                
                <div className="p-6 bg-slate-200 overflow-auto flex-1 flex justify-center items-start">
                    <div ref={captureRef}>
                        {isMulti ? <MultiRecordView records={records} /> : <SingleRecordView record={singleRecord} />}
                    </div>
                </div>

                <div className="p-4 bg-white border-t space-y-3 shrink-0">
                    <button onClick={downloadImage} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 transition">
                        <Icon name="download" /> {isMulti ? "まとめ画像を保存" : "画像を保存"}
                    </button>
                    
                    {/* 複数選択時はXシェアボタンを表示しない */}
                    {!isMulti && isMobile ? (
                        <button onClick={shareToX} disabled={isSharing} className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 transition disabled:opacity-50">
                            {isSharing ? "準備中..." : <><Icon name="twitter" /> Xでシェア (画像付き)</>}
                        </button>
                    ) : !isMulti && (
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
