import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { Button, Card, Spinner, Modal } from "../../components/ui";
import { AnimatedWrapper, StaggeredList } from "../../components/shared/AnimatedComponents";
import { PlusCircleIcon, UserGroupIcon, BookOpenIcon, ChevronDownIcon, CheckCircleIcon, SearchIcon } from "../../components/Icons";
import { api } from "../../services/api";
import { useToast } from "../../components/ui";
import { Roles } from "../../types";

const ClassroomsPage = () => {
    const { currentUser, users } = useAppContext();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [classCode, setClassCode] = useState("");
    const [newClassName, setNewClassName] = useState("");
    const [newClassDesc, setNewClassDesc] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const fetchClassrooms = async () => {
        setIsLoading(true);
        try {
            const data = await api.getClassrooms();
            setClassrooms(data || []);
        } catch (err) {
            console.error(err);
            addToast("Failed to load classrooms", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinClass = async () => {
        if (!classCode.trim()) return;
        setIsSubmitting(true);
        try {
            await api.joinClassroom(classCode.toUpperCase());
            addToast("Joined classroom successfully!", "success");
            setIsJoinModalOpen(false);
            setClassCode("");
            fetchClassrooms();
        } catch (err) {
            console.error(err);
            addToast("Invalid class code or failed to join", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        setIsSubmitting(true);
        try {
            await api.createClassroom({
                name: newClassName,
                description: newClassDesc,
                studentIds: selectedStudents
            });
            addToast("Classroom created successfully!", "success");
            setIsCreateModalOpen(false);
            setNewClassName("");
            setNewClassDesc("");
            setSelectedStudents([]);
            fetchClassrooms();
        } catch (err) {
            console.error(err);
            addToast("Failed to create classroom", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatedWrapper className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Classrooms</h2>
                <div className="flex gap-2">
                    {currentUser?.role === Roles.TEACHER ? (
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <PlusCircleIcon className="w-5 h-5" /> Create Class
                        </Button>
                    ) : (
                        <Button onClick={() => setIsJoinModalOpen(true)}>
                            <UserGroupIcon className="w-5 h-5" /> Join Class
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Spinner />
                </div>
            ) : (
                <Card>
                    {classrooms.length > 0 ? (
                        <StaggeredList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classrooms.map((cls) => (
                                <div
                                    key={cls._id}
                                    onClick={() => navigate(`/classrooms/${cls._id}`)}
                                    className="p-6 rounded-xl transition-all cursor-pointer group theme-transition"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-lg group-hover:scale-110 transition-transform" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                            <BookOpenIcon className="w-6 h-6" />
                                        </div>
                                        {currentUser?.role === Roles.TEACHER && (
                                            <span className="text-xs font-mono px-2 py-1 rounded theme-transition" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                                                {cls.classCode}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>{cls.name}</h3>
                                    <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                                        {cls.description || "No description provided."}
                                    </p>
                                    <div className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                        <UserGroupIcon className="w-4 h-4 mr-2" />
                                        {cls.teacher?.name || "Teacher"}
                                    </div>
                                </div>
                            ))}
                        </StaggeredList>
                    ) : (
                        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                            <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No classrooms found. {currentUser?.role === Roles.STUDENT ? "Join one to get started!" : "Create your first one!"}</p>
                        </div>
                    )}
                </Card>
            )}

            {/* Join Modal */}
            <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Join Classroom">
                <div className="space-y-4">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter the 6-character code provided by your teacher.</p>
                    <input
                        type="text"
                        maxLength={6}
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value)}
                        placeholder="e.g. AB12XY"
                        className="w-full p-3 rounded-lg text-center text-2xl font-mono tracking-widest uppercase focus:ring-2 outline-none theme-transition"
                        style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            WebkitTextFillColor: 'var(--text)',
                        }}
                    />
                    <Button onClick={handleJoinClass} className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner /> : "Join Class"}
                    </Button>
                </div>
            </Modal>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedStudents([]);
                }}
                title="Create Classroom"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Class Name</label>
                        <input
                            type="text"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="e.g. Web Development 101"
                            className="w-full p-2 rounded-lg focus:ring-2 outline-none theme-transition"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Description (Optional)</label>
                        <textarea
                            value={newClassDesc}
                            onChange={(e) => setNewClassDesc(e.target.value)}
                            placeholder="A brief description of the class..."
                            className="w-full p-2 rounded-lg h-20 focus:ring-2 outline-none theme-transition"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium mb-1.5 flex justify-between">
                            <span>Add Students</span>
                            <span className="text-xs text-primary-400 font-semibold">{selectedStudents.length} selected</span>
                        </label>

                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full p-2.5 rounded-xl cursor-pointer flex justify-between items-center transition-all theme-transition"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        >
                            <span className="text-sm" style={{ color: selectedStudents.length > 0 ? 'var(--text)' : 'var(--text-subtle)' }}>
                                {selectedStudents.length === 0
                                    ? "Select students for this class..."
                                    : `${selectedStudents.length} students selected`
                                }
                            </span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 backdrop-blur-2xl rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 theme-transition"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                <div className="p-2" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <div className="relative">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search students..."
                                            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:ring-2 outline-none theme-transition"
                                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                    {!searchTerm && (
                                        <div
                                            onClick={() => {
                                                const students = users.filter(u => u.role === Roles.STUDENT);
                                                if (selectedStudents.length === students.length) setSelectedStudents([]);
                                                else setSelectedStudents(students.map(s => s._id || s.id));
                                            }}
                                            className="flex items-center p-2.5 rounded-lg transition-colors cursor-pointer mb-1 theme-transition"
                                            style={{ borderBottom: '1px solid var(--border)' }}
                                        >
                                            <div className="w-5 h-5 rounded flex items-center justify-center transition-all"
                                                style={{ background: selectedStudents.length === users.filter(u => u.role === Roles.STUDENT).length && users.filter(u => u.role === Roles.STUDENT).length > 0 ? 'var(--accent)' : 'transparent', border: `1px solid ${selectedStudents.length === users.filter(u => u.role === Roles.STUDENT).length && users.filter(u => u.role === Roles.STUDENT).length > 0 ? 'var(--accent)' : 'var(--border-2)'}` }}>
                                                {selectedStudents.length === users.filter(u => u.role === Roles.STUDENT).length && users.filter(u => u.role === Roles.STUDENT).length > 0 && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <span className="ml-3 text-sm font-bold" style={{ color: 'var(--accent)' }}>Select All Students</span>
                                        </div>
                                    )}

                                    {users.filter(u => u.role === Roles.STUDENT && u.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                        users.filter(u => u.role === Roles.STUDENT && u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => {
                                            const isSelected = selectedStudents.includes(student._id || student.id);
                                            return (
                                                <div
                                                    key={student._id || student.id}
                                                    onClick={() => {
                                                        const id = student._id || student.id;
                                                        if (isSelected) setSelectedStudents(prev => prev.filter(sid => sid !== id));
                                                        else setSelectedStudents(prev => [...prev, id]);
                                                    }}
                                                    className="flex items-center p-2.5 rounded-lg transition-all cursor-pointer theme-transition"
                                                    style={{ background: isSelected ? 'var(--accent-light)' : undefined }}
                                                >
                                                    <div className="w-5 h-5 rounded flex items-center justify-center transition-all"
                                                        style={{ background: isSelected ? 'var(--accent)' : 'transparent', border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-2)'}` }}>
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-sm transition-colors" style={{ color: isSelected ? 'var(--text)' : 'var(--text-muted)', fontWeight: isSelected ? 500 : undefined }}>
                                                            {student.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="p-4 text-center text-xs italic" style={{ color: 'var(--text-subtle)' }}>No matching students found.</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {isDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsDropdownOpen(false)} />}
                    </div>

                    <Button onClick={handleCreateClass} className="w-full mt-4 py-3 text-lg" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner /> : "Create Class"}
                    </Button>
                </div>
            </Modal>
        </AnimatedWrapper>
    );
};

export default ClassroomsPage;
