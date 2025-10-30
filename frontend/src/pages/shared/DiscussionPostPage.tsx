import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../components/ui';
import { AnimatedWrapper } from '../../components/shared/AnimatedComponents';
import { Button, Card } from '../../components/ui';

const DiscussionPostPage = () => {
    const { postId } = useParams<{ postId: string }>();
    const { discussionPosts, users, currentUser, addReply } = useAppContext();
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();
    const post = discussionPosts.find(p => (p._id || p.id) === postId);
    const author = users.find(u => (u._id || u.id) === post?.authorId);

    const [replyContent, setReplyContent] = useState('');
    const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    const handleAddReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) {
            addToast("Reply cannot be empty.", 'error');
            return;
        }
        addReply(postId!, { authorId: (currentUser!._id || currentUser!.id) as string, content: replyContent });
        setReplyContent('');
        addToast("Reply added!", 'success');
    };

    // If navigated with ?reply=1, focus the reply box
    useEffect(() => {
        if (searchParams.get('reply') === '1' && replyTextareaRef.current) {
            replyTextareaRef.current.focus();
            replyTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [searchParams]);

    if (!post || !author) return <div>Post not found.</div>;

    return (
        <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
            <Card>
                <h2 className="text-3xl font-bold">{post.title}</h2>
                <p className="text-slate-400">Posted by <span className="font-semibold">{author.name}</span> on {new Date(post.createdAt).toLocaleString()}</p>
                <div className="mt-6 prose prose-slate dark:prose-invert max-w-none">
                    <p>{post.content}</p>
                </div>
            </Card>
            <Card>
                <h3 className="text-2xl font-semibold mb-4">Replies ({post.replies.length})</h3>
                <div className="space-y-4">
                    {post.replies
                        .slice()
                        .sort((a,b) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime())
                        .map(reply => {
                        const replyAuthor = users.find(u => (u._id || u.id) === reply.authorId);
                        return (
                            <div key={(reply as any)._id || reply.id} className="p-4 bg-slate-800 rounded-lg">
                                <p className="mb-2">{reply.content}</p>
                                <p className="text-xs text-slate-400 text-right">-- {replyAuthor?.name || 'Unknown'}, {new Date(reply.createdAt as any).toLocaleString()}</p>
                            </div>
                        )
                    })}
                    {post.replies.length === 0 && <p className="text-slate-400">No replies yet. Be the first to respond!</p>}
                </div>
            </Card>
            <Card>
                 <h3 className="text-2xl font-semibold mb-4">Add Your Reply</h3>
                 <form onSubmit={handleAddReply} className="space-y-2">
                     <textarea ref={replyTextareaRef} value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={4}
                               className="w-full p-2 border rounded-md bg-slate-700 border-slate-600"
                               placeholder="Share your thoughts..."/>
                     <div className="text-right">
                         <Button type="submit">Post Reply</Button>
                     </div>
                 </form>
            </Card>
        </AnimatedWrapper>
    );
};

export default DiscussionPostPage;
