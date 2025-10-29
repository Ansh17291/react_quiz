import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../components/ui';
import { AnimatedWrapper, StaggeredList } from '../../components/shared/AnimatedComponents';
import { Button, Card, Modal } from '../../components/ui';
import { PlusCircleIcon } from '../../components/Icons';

const DiscussionListPage = () => {
    const { discussionPosts, users, currentUser, addPost } = useAppContext();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');

    const handleCreatePost = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostTitle.trim() || !newPostContent.trim()) {
            addToast("Title and content cannot be empty.", 'error');
            return;
        }
        addPost({ title: newPostTitle, content: newPostContent, authorId: currentUser!.id });
        addToast("Post created successfully!", 'success');
        setIsModalOpen(false);
        setNewPostTitle('');
        setNewPostContent('');
    };

    return (
        <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Discussions</h2>
                <Button onClick={() => setIsModalOpen(true)}><PlusCircleIcon className="w-5 h-5"/> New Post</Button>
            </div>
            <Card>
                <StaggeredList className="space-y-4">
                    {discussionPosts.map(post => {
                        const author = users.find(u => u.id === post.authorId);
                        return (
                            <div key={post.id} className="p-4 bg-slate-800 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => navigate(`/discussions/${post.id}`)}>
                                <div>
                                    <h3 className="text-lg font-bold text-primary-400">{post.title}</h3>
                                    <p className="text-sm text-slate-400">By {author?.name || 'Unknown'} on {new Date(post.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">{post.replies.length}</p>
                                    <p className="text-sm text-slate-400">Replies</p>
                                </div>
                            </div>
                        )
                    })}
                </StaggeredList>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a New Post">
                <form onSubmit={handleCreatePost} className="space-y-4">
                    <div>
                        <label htmlFor="post-title" className="block text-sm font-medium text-slate-300">Title</label>
                        <input type="text" id="post-title" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)}
                               className="mt-1 w-full p-2 border rounded-md bg-slate-700 border-slate-600"/>
                    </div>
                    <div>
                         <label htmlFor="post-content" className="block text-sm font-medium text-slate-300">Content</label>
                         <textarea id="post-content" value={newPostContent} onChange={e => setNewPostContent(e.target.value)} rows={6}
                                   className="mt-1 w-full p-2 border rounded-md bg-slate-700 border-slate-600"/>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Create Post</Button>
                    </div>
                </form>
            </Modal>
        </AnimatedWrapper>
    );
};

export default DiscussionListPage;
