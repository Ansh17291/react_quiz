import { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { useToast, Card, Button } from "../../components/ui";
import { useAppContext } from "../../context/AppContext";
import { api, BASE } from "../../services/api";
import type { DiscussionPost } from "../../types";
import io from "socket.io-client";

const socket = io(`${BASE}/discussion`);

const DiscussionPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const { users, currentUser } = useAppContext();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const [post, setPost] = useState<DiscussionPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const author = users.find((u) => (u._id || u.id) === post?.authorId);

  const [replyContent, setReplyContent] = useState("");
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedPost = await api.getPost(postId!);

        setPost(fetchedPost);
      } catch (error: any) {
        console.error("Failed to fetch post:", error);
        setError(error.message || "Failed to load post.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  useEffect(() => {
    socket.on("newReply", (newReply) => {
      setPost((prevPost) => {
        if (!prevPost) return null;

        return { ...prevPost, replies: [...prevPost.replies, newReply] };
      });
    });

    return () => {
      socket.off("newReply");
    };
  }, []);

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      addToast("Reply cannot be empty.", "error");
      return;
    }

    const newReply = {
      authorId: (currentUser!._id || currentUser!.id) as string,
      content: replyContent,
      createdAt: new Date().toISOString(), // Optimistic creation date
      _id: `temp-${Date.now()}`, // Temporary ID for optimistic UI
    };

    // Optimistically update UI

    setReplyContent("");
    addToast("Reply added!", "success");

    try {
      // Send to API
      await api.addReply(postId!, {
        authorId: (currentUser!._id || currentUser!.id) as string,
        content: newReply.content,
      });
      // Re-fetch post to get server-generated _id and accurate createdAt
      // await fetchPost();
    } catch (error) {
      console.error("Failed to add reply:", error);
      addToast("Failed to add reply. Please try again.", "error");
      // Revert optimistic update on error
      setPost((prevPost) => {
        if (!prevPost) return null;
        return {
          ...prevPost,
          replies: prevPost.replies.filter(
            (reply) => reply._id !== newReply._id
          ),
        };
      });
    }
  };

  // If navigated with ?reply=1, focus the reply box
  useEffect(() => {
    if (searchParams.get("reply") === "1" && replyTextareaRef.current) {
      replyTextareaRef.current.focus();
      replyTextareaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
        <Card>
          <div className="flex justify-center items-center p-8">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Card>
      </AnimatedWrapper>
    );
  }

  if (error) {
    return (
      <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
        <Card>
          <div className="p-4 rounded-lg" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)' }}>
            {error}
          </div>
        </Card>
      </AnimatedWrapper>
    );
  }

  if (!post || !author) {
    return (
      <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
        <Card>
          <div className="p-4 rounded-lg" style={{ color: 'var(--warning)', background: 'rgba(234, 179, 8, 0.1)' }}>
            Post not found or author data missing.
          </div>
        </Card>
      </AnimatedWrapper>
    );
  }

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <Card>
        <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{post.title}</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Posted by <span className="font-semibold" style={{ color: 'var(--text)' }}>{author.name}</span> on{" "}
          {new Date(post.createdAt).toLocaleString()}
        </p>
        <div className="mt-6 max-w-none" style={{ color: 'var(--text)' }}>
          <p>{post.content}</p>
        </div>
      </Card>
      <Card>
        <h3 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Replies ({post.replies.length})
        </h3>
        <div className="space-y-4">
          {post.replies
            .slice()
            .sort(
              (a, b) =>
                new Date(a.createdAt as any).getTime() -
                new Date(b.createdAt as any).getTime()
            )
            .map((reply) => {
              const replyAuthor = users.find(
                (u) => (u._id || u.id) === reply.authorId
              );
              return (
                <div
                  key={(reply as any)._id || reply.id}
                  className="p-4 rounded-lg theme-transition"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  <p className="mb-2" style={{ color: 'var(--text)' }}>{reply.content}</p>
                  <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                    -- {replyAuthor?.name || "Unknown"},{" "}
                    {new Date(reply.createdAt as any).toLocaleString()}
                  </p>
                </div>
              );
            })}
          {post.replies.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>
              No replies yet. Be the first to respond!
            </p>
          )}
        </div>
      </Card>
      <Card>
        <h3 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Add Your Reply</h3>
        <form onSubmit={handleAddReply} className="space-y-2">
          <textarea
            ref={replyTextareaRef}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={4}
            className="w-full p-2 border rounded-md theme-transition"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Share your thoughts..."
          />
          <div className="text-right">
            <Button type="submit">Post Reply</Button>
          </div>
        </form>
      </Card>
    </AnimatedWrapper>
  );
};

export default DiscussionPostPage;
