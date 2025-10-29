import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../components/ui';
import { AnimatedWrapper } from '../../components/shared/AnimatedComponents';
import { Button, Card } from '../../components/ui';

const DiscussionPostPage = () => {
    const { postId } = useParams<{ postId: string }>();
    const { discussionPosts, users, currentUser, addReply } = useAppContext();
    const { addToast } = useToast();
    const post = discussionPosts.find(p => p.id === postId);
    const author = users.find(u => u.id === post?.authorId);

    const [replyContent, setReplyContent] = useState('');

    const handleAddReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) {
            addToast("Reply cannot be empty.", 'error');
            return;
        }
        addReply(postId!, { authorId: currentUser!.id, content: replyContent });
        setReplyContent('');
        addToast("Reply added!", 'success');
    };

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
                    {post.replies.sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()).map(reply => {
                        const replyAuthor = users.find(u => u.id === reply.authorId);
                        return (
                            <div key={reply.id} className="p-4 bg-slate-800 rounded-lg">
                                <p className="mb-2">{reply.content}</p>
                                <p className="text-xs text-slate-400 text-right">-- {replyAuthor?.name || 'Unknown'}, {new Date(reply.createdAt).toLocaleString()}</p>
                            </div>
                        )
                    })}
                    {post.replies.length === 0 && <p className="text-slate-400">No replies yet. Be the first to respond!</p>}
                </div>
            </Card>
            <Card>
                 <h3 className="text-2xl font-semibold mb-4">Add Your Reply</h3>
                 <form onSubmit={handleAddReply} className="space-y-2">
                     <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={4}
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
