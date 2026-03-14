import { useState } from 'react';
import { Circle, MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStatusColor, getStatusLabel, type OrderStatus } from '@/lib/order-status';
import { cn } from '@/lib/utils';

function getNotePreview(note?: string) {
  if (!note) return '';

  const trimmed = note.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 96) return trimmed;
  return `${trimmed.slice(0, 93)}...`;
}

function StatusNoteContent({
  status,
  note,
  noteCreatedAt,
  noteActor,
  showActor = false,
}: {
  status: OrderStatus;
  note?: string;
  noteCreatedAt?: string;
  noteActor?: string;
  showActor?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{getStatusLabel(status)}</p>
        <p className="text-xs text-foreground/60">Current status note</p>
      </div>
      {note ? (
        <>
          <p className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
            {note}
          </p>
          {noteCreatedAt ? (
            <div className="text-xs text-foreground/50">
              <p>{new Date(noteCreatedAt).toLocaleString()}</p>
              {showActor && noteActor ? <p className="mt-1">{noteActor}</p> : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-foreground/70">No note was added for this status.</p>
      )}
    </div>
  );
}

export function OrderStatusBadge({
  status,
  label,
  note,
  noteCreatedAt,
  noteActor,
  className,
  showActor = false,
}: {
  status: OrderStatus;
  label?: string;
  note?: string;
  noteCreatedAt?: string;
  noteActor?: string;
  className?: string;
  showActor?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasNote = !!note?.trim();
  const preview = getNotePreview(note);

  return (
    <TooltipProvider delayDuration={120}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex focus:outline-none">
                <Badge
                  className={cn(
                    getStatusColor(status),
                    'cursor-pointer gap-1.5 border-transparent pr-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm',
                    hasNote && 'ring-1 ring-[#00EC97]/45 ring-offset-1 ring-offset-background',
                    className
                  )}
                >
                  <span>{label ?? getStatusLabel(status)}</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border border-current/20 bg-black/5 px-1.5 py-0.5 transition-all duration-200',
                      hasNote ? 'opacity-100 shadow-[0_0_0_1px_rgba(0,236,151,0.12)]' : 'opacity-60'
                    )}
                  >
                    {hasNote ? <MessageSquareText className="size-3" /> : <Circle className="size-2 fill-current" />}
                  </span>
                </Badge>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          {hasNote ? (
            <TooltipContent sideOffset={8} className="max-w-64 rounded-xl border border-border/60 bg-background/95 px-3 py-2 text-left text-foreground shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00EC97]">Status note</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">{preview}</p>
              <p className="mt-2 text-[11px] text-foreground/60">Click for full note</p>
            </TooltipContent>
          ) : null}
        </Tooltip>
        <PopoverContent align="start" className="w-80 rounded-xl border-border/60 bg-background/95 p-4">
          <StatusNoteContent
            status={status}
            note={note}
            noteCreatedAt={noteCreatedAt}
            noteActor={noteActor}
            showActor={showActor}
          />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

export function OrderStatusNoteButton({
  status,
  note,
  noteCreatedAt,
  noteActor,
  className,
  showActor = true,
}: {
  status: OrderStatus;
  note?: string;
  noteCreatedAt?: string;
  noteActor?: string;
  className?: string;
  showActor?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasNote = !!note?.trim();
  const preview = getNotePreview(note);

  return (
    <TooltipProvider delayDuration={120}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5',
                  hasNote
                    ? 'border-[#00EC97]/50 bg-[#00EC97]/10 text-foreground hover:bg-[#00EC97]/15 hover:shadow-sm'
                    : 'border-border/60 bg-background/60 text-foreground hover:border-[#00EC97] hover:bg-[#00EC97]/10',
                  className
                )}
              >
                <MessageSquareText className={cn('size-3.5 transition-colors', hasNote && 'text-[#00EC97]')} />
                {hasNote ? 'Has Note' : 'Note'}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          {hasNote ? (
            <TooltipContent sideOffset={8} className="max-w-64 rounded-xl border border-border/60 bg-background/95 px-3 py-2 text-left text-foreground shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00EC97]">Status note</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">{preview}</p>
              <p className="mt-2 text-[11px] text-foreground/60">Click for full note</p>
            </TooltipContent>
          ) : null}
        </Tooltip>
        <PopoverContent align="end" className="w-80 rounded-xl border-border/60 bg-background/95 p-4">
          <StatusNoteContent
            status={status}
            note={note}
            noteCreatedAt={noteCreatedAt}
            noteActor={noteActor}
            showActor={showActor}
          />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
