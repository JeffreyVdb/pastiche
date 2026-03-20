import { type CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import type { Snippet } from "@/types/snippet";
import { useIsMobile } from "../../hooks/useIsMobile";

interface ZenOverlayProps {
  open: boolean;
  snippet: Snippet;
  showPreview: boolean;
  highlighterStyle: { [key: string]: CSSProperties };
  onExit: () => void;
}

export function ZenOverlay({
  open,
  snippet,
  showPreview,
  highlighterStyle,
  onExit,
}: ZenOverlayProps) {
  const [controlsVisible, setControlsVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const isMobile = useIsMobile();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);

  // Reset state when reopening
  useEffect(() => {
    if (open) {
      setClosing(false);
      closingRef.current = false;
      setControlsVisible(false);
      exitingRef.current = false;
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keyboard: Escape exits
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerExit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser back exits
  useEffect(() => {
    if (!open) return;
    const handlePopState = () => {
      if (!exitingRef.current) {
        exitingRef.current = true;
        onExit();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, onExit]);

  // Desktop: show controls on mousemove, hide after 3s inactivity
  useEffect(() => {
    if (!open || isMobile) return;
    const handleMouseMove = () => {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [open, isMobile]);

  // Mobile: show controls on touch in upper 15% of viewport
  useEffect(() => {
    if (!open || !isMobile) return;
    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientY < window.innerHeight * 0.15) {
        setControlsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
      }
    };
    window.addEventListener("touchstart", handleTouch);
    return () => {
      window.removeEventListener("touchstart", handleTouch);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [open, isMobile]);

  const triggerExit = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
  };

  const handleAnimationEnd = () => {
    if (closing) {
      exitingRef.current = true;
      onExit();
      // history.back() is called by ViewSnippet's enterZen/exitZen
    }
  };

  if (!open) return null;

  const isMarkdown = snippet.language === "markdown";
  const maxWidth = isMarkdown && showPreview ? "720px" : "900px";

  return createPortal(
    <div
      className={closing ? "animate-zen-exit" : "animate-zen-enter"}
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "var(--color-surface)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Exit control pill */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1101,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      >
        <button
          onClick={triggerExit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid var(--color-border)",
            borderRadius: "999px",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.04em",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {isMobile ? "tap to exit" : "esc · exit zen"}
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: isMobile
            ? "24px max(16px, env(safe-area-inset-right)) 24px max(16px, env(safe-area-inset-left))"
            : "60px 40px",
        }}
      >
        {isMarkdown && showPreview ? (
          <div
            className="markdown-preview"
            style={{
              fontFamily: "var(--font-markdown)",
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {snippet.content}
            </ReactMarkdown>
          </div>
        ) : (
          <SyntaxHighlighter
            language={snippet.language === "autodetect" ? undefined : snippet.language}
            style={highlighterStyle}
            customStyle={{
              background: "var(--color-surface)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-code)",
              lineHeight: "1.6",
              padding: 0,
              margin: 0,
              borderRadius: 0,
            }}
          >
            {snippet.content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>,
    document.body
  );
}
