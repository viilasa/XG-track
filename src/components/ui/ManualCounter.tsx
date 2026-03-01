import { Plus, MessageCircle, FileText } from 'lucide-react'

interface ManualCounterProps {
  repliesCount: number
  tweetsCount: number
  onAddReply: () => void
  onAddTweet: () => void
}

export function ManualCounter({ repliesCount, tweetsCount, onAddReply, onAddTweet }: ManualCounterProps) {
  return (
    <div className="bg-x-card border border-x-border rounded-2xl p-4">
      <h3 className="text-x-text font-bold text-sm mb-3">Quick Add</h3>
      <p className="text-x-muted text-xs mb-4">
        Replied to a tweet? Tap to count it manually.
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAddReply}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-x-blue/10 border border-x-blue/20 hover:bg-x-blue/20 transition-all active:scale-95"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-x-blue/20">
            <MessageCircle className="text-x-blue" size={24} />
          </div>
          <span className="text-x-blue font-bold text-2xl">{repliesCount}</span>
          <div className="flex items-center gap-1 text-x-blue text-sm font-medium">
            <Plus size={14} />
            Add Reply
          </div>
        </button>

        <button
          onClick={onAddTweet}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all active:scale-95"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/20">
            <FileText className="text-orange-500" size={24} />
          </div>
          <span className="text-orange-500 font-bold text-2xl">{tweetsCount}</span>
          <div className="flex items-center gap-1 text-orange-500 text-sm font-medium">
            <Plus size={14} />
            Add Tweet
          </div>
        </button>
      </div>
    </div>
  )
}
