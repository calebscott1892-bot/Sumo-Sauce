import { useState, useCallback } from 'react';
import { Link2, Check } from 'lucide-react';

type Props = {
  /** Optional custom URL. Defaults to current window.location.href */
  url?: string;
  className?: string;
};

export default function CopyLinkButton({ url, className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const target = url ?? window.location.href;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = target;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-600 hover:text-white ${className}`}
      aria-label={copied ? 'Link copied' : 'Copy link'}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Link2 className="h-3.5 w-3.5" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
