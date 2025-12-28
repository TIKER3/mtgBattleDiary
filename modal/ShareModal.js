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
const ShareModal = ({ records, onClose }) => {
    const captureRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);

    // 単一レコードか複数レコードか判定
    const isMulti = Array.isArray(records) && records.length > 1;
    // 単一の場合は最初の要素を使用
    const singleRecord = Array.isArray(records) ? records[0] : records;

    // スマホ判定
    const isMobile = useMemo(() => {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }, []);

    const captureImage = async () => {
        if (!captureRef.current) return null;
        
        const element = captureRef.current;
        // スクロールが必要な要素全体のサイズを取得
        const { scrollWidth, scrollHeight } = element;

        // html2canvasの設定
        return await html2canvas(element, { 
            scale: 2, 
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            width: scrollWidth,
            height: scrollHeight,
            windowWidth: scrollWidth,
            windowHeight: scrollHeight,
            onclone: (clonedDoc) => {
                // 画像化時に文字切れを防ぐためのスタイル調整（念のため）
                const clonedElement = clonedDoc.querySelector('[data-capture-target]');
                if (clonedElement) {
                    clonedElement.style.height = 'auto';
                    clonedElement.style.overflow = 'visible';
                }
            }
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
        if (isMulti) return;

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

    // --- レイアウトコンポーネント: マッチ詳細リスト (共通化) ---
    const MatchesDetailList = ({ matches }) => {
        return (
            <div className="space-y-3">
                {matches.map((match, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                        {/* Match Header */}
                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-700 text-white text-xs font-bold px-2 py-0.5 rounded">R{match.id}</span>
                                <span className="font-bold text-sm text-slate-700">{match.opponentDeck || "Unknown Deck"}</span>
                            </div>
                            <span className={`text-sm font-black uppercase ${match.matchResult === 'win' ? 'text-blue-600' : match.matchResult === 'loss' ? 'text-red-600' : 'text-slate-400'}`}>
                                {match.matchResult === 'win' ? 'WIN' : match.matchResult === 'loss' ? 'LOSS' : 'DRAW'}
                            </span>
                        </div>
                        
                        {/* Games Body */}
                        <div className="bg-white px-4 py-2 space-y-1">
                            {match.games.map((g, j) => {
                                if (!g.result && !g.memo && g.onPlay === null) return null;
                                const isWin = g.result === 'win';
                                const isLoss = g.result === 'loss';
                                return (
                                    <div key={j} className="flex items-center gap-2 text-xs">
                                        <div className="w-6 text-center shrink-0">
                                            {g.onPlay !== null && (
                                                <span className={`inline-block w-full text-[9px] font-bold px-1 rounded-sm border ${g.onPlay ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                                    {g.onPlay ? '先' : '後'}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`font-black font-mono w-4 text-center ${isWin ? 'text-blue-600' : isLoss ? 'text-red-600' : 'text-slate-300'}`}>
                                            {isWin ? 'W' : isLoss ? 'L' : '-'}
                                        </span>
                                        <span className="text-slate-600 flex-1 truncate">
                                            {g.memo || <span className="text-slate-300 italic text-[10px]"></span>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // --- レイアウト 1: 単一レコード用 (詳細) ---
    const SingleRecordView = ({ record }) => {
        const scoreColor = record.eventWins > record.eventLosses ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                           record.eventLosses > record.eventWins ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-600 bg-slate-100';

        return (
            <div className="w-[600px] min-w-[600px] bg-white p-8 rounded-xl shadow-lg text-slate-800 font-sans border border-slate-200 box-border" data-capture-target>
                {/* Header */}
                <div className="flex justify-between items-stretch mb-8">
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex items-center gap-3 text-slate-500 text-sm font-bold">
                            <span className="flex items-center gap-1"><Icon name="calendar" size={16}/> {record.date}</span>
                            <span className="bg-slate-800 text-white px-2 rounded-full flex items-center gap-1 uppercase text-xs py-0.5">{record.format || 'Format?'}</span>
                            {record.location && <span className="bg-slate-100 px-2 rounded-full flex items-center gap-1 border border-slate-200 text-xs py-0.5"><Icon name="map-pin" size={14}/> {record.location}</span>}
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 leading-tight">{record.deckName}</h1>
                    </div>
                    <div className={`text-5xl font-black px-6 rounded-xl border-4 ${scoreColor} flex items-center justify-center ml-4 shrink-0`}>
                        {record.eventWins}-{record.eventLosses}
                    </div>
                </div>

                <MatchesDetailList matches={record.matches} />

                <div className="mt-8 pt-4 border-t border-slate-100 text-right text-slate-400 text-xs font-bold flex justify-end items-center gap-1 uppercase">
                    <Icon name="pen-tool" size={12}/> MTG Battle Diary
                </div>
            </div>
        );
    };

    // --- レイアウト 2: 複数レコード用 (詳細リスト形式) ---
    const MultiRecordView = ({ records }) => {
        const totalWins = records.reduce((acc, r) => acc + r.eventWins, 0);
        const totalLosses = records.reduce((acc, r) => acc + r.eventLosses, 0);
        const totalDraws = records.reduce((acc, r) => acc + r.eventDraws, 0);

        return (
            <div className="w-[600px] min-w-[600px] bg-white p-8 rounded-xl shadow-lg text-slate-800 font-sans border border-slate-200 box-border" data-capture-target>
                {/* Header */}
                <div className="flex justify-between items-end mb-8 pb-4 border-b-2 border-slate-100">
                    <div>
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Icon name="layers" size={14}/> Battle History
                        </h2>
                        <h1 className="text-3xl font-black text-slate-800 leading-none">Summary</h1>
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

                {/* Records Detail List */}
                <div className="space-y-8">
                    {records.map((rec, idx) => {
                        const scoreColor = rec.eventWins > rec.eventLosses ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                                           rec.eventLosses > rec.eventWins ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-600 bg-slate-100';
                        
                        return (
                            <div key={idx} className="break-inside-avoid">
                                {/* Sub Header for Record */}
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-1">
                                            <span className="flex items-center gap-1"><Icon name="calendar" size={12}/> {rec.date}</span>
                                            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{rec.format}</span>
                                            {rec.location && <span className="flex items-center gap-1"><Icon name="map-pin" size={12}/> {rec.location}</span>}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 leading-tight">{rec.deckName}</h3>
                                    </div>
                                    <div className={`text-2xl font-black px-4 py-1 rounded-lg border-2 ${scoreColor}`}>
                                        {rec.eventWins}-{rec.eventLosses}
                                    </div>
                                </div>

                                {/* Match Details */}
                                <MatchesDetailList matches={rec.matches} />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 text-right text-slate-400 text-xs font-bold flex justify-end items-center gap-1 uppercase">
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
                    {/* キャプチャ対象エリア */}
                    <div ref={captureRef}>
                        {isMulti ? <MultiRecordView records={records} /> : <SingleRecordView record={singleRecord} />}
                    </div>
                </div>

                <div className="p-4 bg-white border-t space-y-3 shrink-0">
                    <button onClick={downloadImage} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 transition">
                        <Icon name="download" /> {isMulti ? "まとめ画像を保存" : "画像を保存"}
                    </button>
                    
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
