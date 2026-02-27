import { useState, useRef, useEffect, useMemo } from "react";
import { UserGroupIcon, ChevronDownIcon, SearchIcon } from "../Icons";

interface Option {
    id: string;
    name: string;
}

interface MultiSelectDropdownProps {
    options: Option[];
    selectedIds: string[];
    onSelect: (ids: string[]) => void;
    placeholder?: string;
    label?: string;
}

const MultiSelectDropdown = ({
    options,
    selectedIds,
    onSelect,
    placeholder = "Choose options...",
    label = "Select",
}: MultiSelectDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() =>
        options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase())),
        [options, search]
    );

    const toggleOption = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelect(selectedIds.filter(item => item !== id));
        } else {
            onSelect([...selectedIds, id]);
        }
    };

    const toggleAll = () => {
        if (selectedIds.length === options.length) {
            onSelect([]);
        } else {
            onSelect(options.map(opt => opt.id));
        }
    };

    return (
        <div className="w-full md:w-72 relative" ref={dropdownRef}>
            <div className="flex justify-between items-center mb-1 px-0.5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <UserGroupIcon className="w-3 h-3 text-primary-500/70" />
                    {label}
                </h4>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border theme-transition" style={{ color: 'var(--text-muted)', background: 'var(--surface-3)', borderColor: 'var(--border)' }}>
                    {selectedIds.length}
                </span>
            </div>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all duration-200 cursor-pointer backdrop-blur-sm theme-transition ${isOpen
                    ? "border-primary-500/50 ring-2 ring-primary-500/10"
                    : "hover:border-[var(--border-2)]"
                    }`}
                style={{ background: 'var(--surface-2)' }}
            >
                <div className="flex flex-wrap gap-1 overflow-hidden max-h-[24px]">
                    {selectedIds.length === 0 ? (
                        <span className="text-xs pl-1" style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
                    ) : (
                        selectedIds.map(id => {
                            const option = options.find(o => o.id === id);
                            return (
                                <span key={id} className="inline-flex items-center gap-1 bg-primary-500/20 text-primary-200 text-[9px] px-2 py-0.5 rounded-full border border-primary-500/30 whitespace-nowrap">
                                    {option?.name || id}
                                </span>
                            );
                        })
                    )}
                </div>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 theme-transition" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                    <div className="p-2 border-b backdrop-blur-md theme-transition" style={{ borderColor: 'var(--border)', background: 'var(--surface-3)' }}>
                        <div className="relative">
                            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:border-primary-500/50 transition-colors theme-transition"
                                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar p-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleAll();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface-3)] text-xs font-semibold text-primary-400 transition-colors"
                        >
                            {selectedIds.length === options.length ? "Deselect All" : "Select All"}
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${selectedIds.length === options.length ? "bg-primary-500 border-primary-500" : ""
                                }`} style={selectedIds.length === options.length ? {} : { borderColor: 'var(--border)' }}>
                                {selectedIds.length === options.length && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </button>

                        <div className="h-px my-1 mx-2" style={{ background: 'var(--border)' }} />

                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>No results found</div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = selectedIds.includes(opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(opt.id);
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 group ${isSelected ? "bg-primary-500/10" : "hover:bg-[var(--surface-3)]"
                                            }`}
                                    >
                                        <span className={`text-xs ${isSelected ? "text-primary-100 font-medium" : "group-hover:text-[var(--text)]"}`} style={isSelected ? {} : { color: 'var(--text-muted)' }}>
                                            {opt.name}
                                        </span>
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-primary-500 border-primary-500" : ""
                                            }`} style={isSelected ? {} : { borderColor: 'var(--border-2)' }}>
                                            {isSelected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
