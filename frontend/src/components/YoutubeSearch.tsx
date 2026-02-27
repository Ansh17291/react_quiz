import React, { useState } from 'react';
import { api } from '../services/api';
import { Spinner } from './ui';
import { YoutubeIcon, MagnifyingGlassIcon, XCircleIcon } from './Icons';

interface YoutubeSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

const YoutubeSearch: React.FC<YoutubeSearchProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [videos, setVideos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        try {
            const results = await api.searchYoutubeVideos(query);
            setVideos(results);
            if (results.length === 0) setError('No results.');
        } catch (err) {
            setError('Error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`fixed top-0 right-0 h-full w-[420px] max-w-[95vw] shadow-2xl z-[500] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 invisible pointer-events-none'
                }`}
        >
            <div className="flex flex-col h-full bg-[var(--surface-3)]">
                {/* Minimal Header */}
                <div className="p-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <YoutubeIcon className="w-8 h-8 text-red-600" />
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-red-500/10 rounded-lg transition-colors group"
                    >
                        <XCircleIcon className="w-8 h-8 text-[var(--text-muted)] group-hover:text-red-500" />
                    </button>
                </div>

                {/* Search - Integrated */}
                <div className="p-4 bg-[var(--surface-3)]">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search tutorials..."
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-full border bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none transition-all"
                            />
                        </div>
                        {isLoading && (
                            <div className="mt-2">
                                <Spinner />
                            </div>
                        )}
                    </form>
                    {error && <p className="text-red-500 text-[10px] mt-1 ml-1">{error}</p>}
                </div>

                {/* List - Clean & Scrollable */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                    <div className="space-y-3">
                        {videos.map((video, idx) => (
                            <a
                                key={idx}
                                href={video.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col group bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-red-600/50 transition-all shadow-sm"
                            >
                                <div className="relative aspect-video bg-black">
                                    <img src={video.thumbnail?.static} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1.5 py-0.5 rounded font-medium">
                                        {video.length}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h4 className="text-xs font-bold text-[var(--text)] line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">
                                        {video.title}
                                    </h4>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-[var(--text-muted)] font-medium">{video.channel?.name}</span>
                                        <span className="text-[10px] text-[var(--text-muted)]">{video.published_date}</span>
                                    </div>
                                </div>
                            </a>
                        ))}

                        {!isLoading && videos.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full py-20 opacity-20">
                                <YoutubeIcon className="w-16 h-16 mb-2" />
                                <p className="text-sm font-medium">Ready for search</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default YoutubeSearch;
