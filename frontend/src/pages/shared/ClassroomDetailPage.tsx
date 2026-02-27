import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { Button, Card, Spinner, Tabs } from "../../components/ui";
import { AnimatedWrapper, StaggeredList } from "../../components/shared/AnimatedComponents";
import { BookOpenIcon, UserGroupIcon, UploadIcon, DocumentDownloadIcon, ChevronLeftIcon, VideoCameraIcon, XCircleIcon } from "../../components/Icons";
import { api, BASE } from "../../services/api";
import { io } from "socket.io-client";
import { useToast } from "../../components/ui";
import { Roles } from "../../types";

const ClassroomDetailPage = () => {
    const { id } = useParams();
    const { currentUser } = useAppContext();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState<any>(null);
    const [resources, setResources] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Materials");
    const [uploading, setUploading] = useState(false);
    const [isMeetingLive, setIsMeetingLive] = useState(false);
    const [showJitsi, setShowJitsi] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchClassroomDetails();
    }, [id]);

    const fetchClassroomDetails = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const [clsData, resData] = await Promise.all([
                api.getClassroom(id),
                api.getClassroomResources(id)
            ]);
            setClassroom(clsData);
            setIsMeetingLive(clsData.isMeetingLive);
            setResources(resData || []);
        } catch (err) {
            console.error(err);
            addToast("Failed to load classroom details", "error");
            navigate("/classrooms");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        const socket = io(BASE + "/classrooms", {
            transports: ["polling", "websocket"]
        });

        socket.on("meetingStarted", (data) => {
            if (data.classroomId === id) {
                setIsMeetingLive(true);
                addToast("A live meeting has started!", "success");
            }
        });

        socket.on("meetingEnded", (data) => {
            if (data.classroomId === id) {
                setIsMeetingLive(false);
                setShowJitsi(false);
                addToast("The meeting has ended", "info");
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [id]);

    const handleMeetingToggle = async () => {
        if (!id) return;
        try {
            if (isMeetingLive) {
                await api.endMeeting(id);
                setIsMeetingLive(false);
                setShowJitsi(false);
                addToast("Meeting ended", "info");
            } else {
                await api.startMeeting(id);
                setIsMeetingLive(true);
                setShowJitsi(true);
                addToast("Meeting started!", "success");
            }
        } catch (err) {
            console.error(err);
            addToast("Failed to toggle meeting", "error");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name);

        try {
            await api.uploadClassroomResource(id, formData);
            addToast("Material uploaded successfully!", "success");
            const updatedRes = await api.getClassroomResources(id);
            setResources(updatedRes || []);
        } catch (err) {
            console.error(err);
            addToast("Upload failed", "error");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;
    if (!classroom) return null;

    return (
        <AnimatedWrapper className="space-y-6">
            <button
                onClick={() => navigate("/classrooms")}
                className="flex items-center transition-colors theme-transition"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
                <ChevronLeftIcon className="w-5 h-5 mr-1" /> Back to Classrooms
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>{classroom.name}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{classroom.description || "No description provided."}</p>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg theme-transition"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="text-sm">
                        <p className="uppercase text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Teacher</p>
                        <p className="font-semibold" style={{ color: 'var(--accent)' }}>{classroom.teacher?.name}</p>
                    </div>
                    <div className="h-8 w-px" style={{ background: 'var(--border)' }}></div>
                    <div className="text-sm">
                        <p className="uppercase text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Class Code</p>
                        <p className="font-mono font-bold" style={{ color: 'var(--text)' }}>{classroom.classCode}</p>
                    </div>
                </div>
            </div>

            <Tabs
                tabs={currentUser?.role === Roles.TEACHER ? ["Materials", "Meet", "Students"] : ["Materials", "Meet"]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {activeTab === "Materials" && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Study Materials</h3>
                        {currentUser?.role === Roles.TEACHER && (
                            <>
                                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="secondary">
                                    {uploading ? <Spinner /> : <><UploadIcon className="w-5 h-5 mr-2" /> Upload Material</>}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept=".pdf,.docx,.doc,.txt,.ppt,.pptx,.xlsx"
                                />
                            </>
                        )}
                    </div>

                    {resources.length > 0 ? (
                        <StaggeredList className="space-y-3">
                            {resources.map((res) => {
                                const fileUrl = `${BASE}${res.content}`;
                                return (
                                    <div key={res._id} className="p-4 rounded-lg flex items-center justify-between group transition-colors theme-transition"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded theme-transition" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                                                <BookOpenIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--text)' }}>{res.title}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(res.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded transition-all"
                                                style={{ color: 'var(--text-muted)' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                                            >
                                                <DocumentDownloadIcon className="w-5 h-5" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </StaggeredList>
                    ) : (
                        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                            <UploadIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No materials uploaded yet.</p>
                        </div>
                    )}
                </Card>
            )}

            {activeTab === "Meet" && (
                <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-12 rounded-2xl border border-dashed border-white/10">
                    <div className={`p-6 rounded-full mb-6 theme-transition ${isMeetingLive ? 'bg-red-500/10 animate-pulse' : ''}`}
                        style={{ background: isMeetingLive ? 'rgba(239, 68, 68, 0.1)' : 'transparent', border: isMeetingLive ? 'none' : '2px dashed var(--border)' }}>
                        <VideoCameraIcon className={`w-16 h-16 ${isMeetingLive ? 'text-red-500' : ''}`}
                            style={{ color: isMeetingLive ? '#ef4444' : 'var(--text-muted)' }} />
                    </div>

                    <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                        {isMeetingLive ? "Live Meeting in Progress" : "Classroom Video Meet"}
                    </h3>

                    <p className="max-w-md mb-8" style={{ color: 'var(--text-muted)' }}>
                        {isMeetingLive
                            ? "A live session is currently active. Join now to participate in the classroom discussion."
                            : "Start a video meeting to connect with your students in real-time. Students can join once the meeting is started."}
                    </p>

                    <div className="flex gap-4">
                        {isMeetingLive && currentUser?.role === Roles.STUDENT && (
                            <Button onClick={() => setShowJitsi(true)} variant="primary">
                                <VideoCameraIcon className="w-5 h-5 mr-2" /> Join Living Meeting
                            </Button>
                        )}

                        {currentUser?.role === Roles.TEACHER && (
                            <Button
                                onClick={handleMeetingToggle}
                                variant={isMeetingLive ? "danger" : "primary"}
                            >
                                <VideoCameraIcon className="w-5 h-5 mr-2" />
                                {isMeetingLive ? "End Meeting" : "Start Meeting"}
                            </Button>
                        )}

                        {isMeetingLive && currentUser?.role === Roles.TEACHER && (
                            <Button onClick={() => setShowJitsi(true)} variant="secondary">
                                Open Meeting UI
                            </Button>
                        )}
                    </div>

                    {!isMeetingLive && currentUser?.role === Roles.STUDENT && (
                        <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                            No active meeting. You'll be notified when the teacher starts one.
                        </p>
                    )}
                </div>
            )}

            {activeTab === "Students" && (
                <Card>
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                        <UserGroupIcon className="w-6 h-6" style={{ color: 'var(--accent)' } as React.CSSProperties} />
                        Enrolled Students ({classroom.students?.length || 0})
                    </h3>
                    <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {classroom.students?.map((student: any) => (
                            <div key={student._id || student.id} className="p-4 rounded-lg flex items-center gap-3 theme-transition"
                                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                    style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                    {student.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium" style={{ color: 'var(--text)' }}>{student.name}</p>
                                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{student.role}</p>
                                </div>
                            </div>
                        ))}
                        {(!classroom.students || classroom.students.length === 0) && (
                            <p className="col-span-full text-center py-8" style={{ color: 'var(--text-muted)' }}>No students joined yet.</p>
                        )}
                    </StaggeredList>
                </Card>
            )}
            {showJitsi && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
                    <div className="w-full h-full max-w-6xl bg-[#1e222d] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1e222d]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <VideoCameraIcon className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">Live Classroom: {classroom.name}</h3>
                                    <p className="text-xs text-white/50">Room Code: {classroom.classCode}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowJitsi(false)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                            >
                                <XCircleIcon className="w-8 h-8 text-white/40 group-hover:text-white" />
                            </button>
                        </div>
                        <div className="flex-1 bg-black">
                            <iframe
                                src={`https://meet.jit.si/${classroom.classCode}#config.prejoinPageEnabled=false&userInfo.displayName="${currentUser?.name || 'User'}"&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","embedmeeting","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`}
                                allow="camera; microphone; display-capture; autoplay; clipboard-write"
                                className="w-full h-full border-none"
                                title="Jitsi Meeting"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </AnimatedWrapper>
    );
};

export default ClassroomDetailPage;
