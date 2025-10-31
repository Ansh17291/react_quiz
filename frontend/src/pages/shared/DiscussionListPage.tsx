import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import { Button, Card, Modal } from "../../components/ui";
import { PlusCircleIcon } from "../../components/Icons";
import axios from "axios";
import { api } from "../../services/api";

const DiscussionListPage = () => {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [discussionPosts, setDiscussionPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user ID (handle both _id and id)
  const currentUserId = currentUser?._id || currentUser?.id;

  // Fetch discussion posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const posts = await api.getPosts();

        console.log(posts);

        // Sort posts by creation date (newest first)
        const sortedPosts = (posts || []).sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setDiscussionPosts(sortedPosts);
      } catch (err) {
        console.error("Failed to fetch discussion posts:", err);
        setError("Failed to load discussions. Please try again later.");
        setDiscussionPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.getUsers();
        setUsers(response || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchUsers();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      addToast("Title and content cannot be empty.", "error");
      return;
    }

    if (!currentUserId) {
      addToast("You must be logged in to create a post.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await api.addPost({
        title: newPostTitle,
        content: newPostContent,
        authorId: currentUserId,
      } as any);

      const newPost = {
        ...created,
        id: created._id || created.id,
        _id: created._id || created.id,
      };

      setDiscussionPosts((prev) => [newPost, ...prev]);
      addToast("Post created successfully!", "success");

      // Reset form and close modal
      setIsModalOpen(false);
      setNewPostTitle("");
      setNewPostContent("");
    } catch (err) {
      console.error("Failed to create post:", err);
      addToast("Failed to create post. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Discussions</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <PlusCircleIcon className="w-5 h-5" /> New Post
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-400 bg-red-500/20 rounded-lg">
            {error}
          </div>
        ) : discussionPosts.length > 0 ? (
          <StaggeredList className="space-y-4">
            {discussionPosts.map((post) => {
              const postId = post._id || post.id;
              const author = users.find(
                (u) => (u._id || u.id) === post.authorId
              );

              return (
                <div
                  key={postId}
                  className="p-4 bg-slate-800 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/discussions/${postId}`)}
                  >
                    <h3 className="text-lg font-bold text-primary-400">
                      {post.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      By {author?.name || "Unknown"} on{" "}
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {post.replies?.length || 0}
                      </p>
                      <p className="text-sm text-slate-400">Replies</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/discussions/${postId}?reply=1`)}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              );
            })}
          </StaggeredList>
        ) : (
          <p className="text-slate-400 text-center py-8">
            No discussions yet. Be the first to start one!
          </p>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create a New Post"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label
              htmlFor="post-title"
              className="block text-sm font-medium text-slate-300"
            >
              Title
            </label>
            <input
              type="text"
              id="post-title"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md bg-slate-700 border-slate-600"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="post-content"
              className="block text-sm font-medium text-slate-300"
            >
              Content
            </label>
            <textarea
              id="post-content"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={6}
              className="mt-1 w-full p-2 border rounded-md bg-slate-700 border-slate-600"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </form>
      </Modal>
    </AnimatedWrapper>
  );
};

export default DiscussionListPage;
