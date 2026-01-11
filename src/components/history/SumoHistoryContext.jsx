import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Scroll, Crown, Home, Trophy, Swords, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const historyContent = [
  {
    id: 'origins',
    title: '起源 • Ancient Origins',
    icon: Scroll,
    subtitle: 'Shinto Rituals & Imperial Courts (710-1185)',
    content: `Sumo's roots stretch back over 1,500 years to Japan's Shinto religious ceremonies. Initially performed as sacred rituals to pray for bountiful harvests, sumo was believed to entertain the gods (kami) and ensure their favor.

The first written records appear in the Kojiki (712 AD) and Nihon Shoki (720 AD), where legendary matches determined territorial control. Emperor Shomu established formal sumo competitions at court in 728 AD, transforming it from ritual to regulated sport.

During the Nara and Heian periods, sumo became entertainment for the imperial court. Wrestlers were samurai and soldiers, with matches serving both as spectacle and martial training.`
  },
  {
    id: 'professional',
    title: '力士 • Professional Era',
    icon: Swords,
    subtitle: 'Birth of the Banzuke (1600s-1900s)',
    content: `The Edo period (1603-1868) saw sumo transform into professional entertainment. Daimyo (feudal lords) sponsored wrestlers, and organized tournaments emerged in major cities.

The first banzuke (ranking list) was published in 1761, establishing the hierarchical structure still used today. The Yoshida family was granted authority to award the title of Yokozuna (grand champion), with the first officially recognized Yokozuna being Tanikaze in 1789.

Key developments:
• 1791: Ring ceremonies and rituals standardized
• 1833: Dohyo (ring) size fixed at 4.55 meters
• 1909: Ryogoku Kokugikan opens in Tokyo
• 1925: First radio broadcast of sumo`
  },
  {
    id: 'modern',
    title: '現代 • Modern Sumo',
    icon: Trophy,
    subtitle: 'Television Era to Today (1950s-Present)',
    content: `Post-WWII reconstruction coincided with sumo's golden age. Television broadcasts from 1953 brought sumo into every Japanese home, creating national heroes and unprecedented popularity.

The sport internationalized in the 1960s with Hawaii-born wrestlers, culminating in Akebono becoming the first foreign-born Yokozuna in 1993. Today, wrestlers from Mongolia, Georgia, and other nations compete at the highest levels.

Modern structure:
• 6 annual tournaments (honbasho), 15 days each
• ~650 professional wrestlers across 6 divisions
• Japan Sumo Association governs all aspects
• Strict traditions maintained despite modernization`
  },
  {
    id: 'yokozuna',
    title: '横綱 • The Sacred Yokozuna',
    icon: Crown,
    subtitle: 'Living Gods of Sumo',
    content: `The rank of Yokozuna transcends athletic achievement—it represents moral perfection. Only 73 wrestlers have held this rank in recorded history (since 1789).

Yokozuna are expected to embody:
• Hinkaku (dignity): Grace in victory and defeat
• Shingi (integrity): Moral character beyond reproach
• Tsuyosa (strength): Dominance in the ring

Unlike other ranks, Yokozuna cannot be demoted. The pressure is immense—many retire rather than tarnish the rank through declining performance. Yokozuna perform the dohyo-iri (ring-entering ceremony) wearing a sacred rope (tsuna) weighing 15-20kg.

Legendary Yokozuna include Futabayama (69-match winning streak), Taiho (32 championships), and Hakuho (45 championships—all-time record).`
  },
  {
    id: 'heya',
    title: '部屋 • Stable Life',
    icon: Home,
    subtitle: 'The Heya System',
    content: `Every wrestler belongs to a heya (stable), a training facility and family unit. Young recruits (often 15-16 years old) leave their families to live communal lives under an oyakata (stable master).

Daily routine:
• 5:00 AM: Wake, clean stable
• 6:00 AM: Morning practice (keiko) begins
• 11:00 AM: Chanko-nabe (protein-rich stew)
• Afternoon: Sleep, then evening practice
• Strict hierarchy: Junior wrestlers serve seniors

The stable system preserves sumo traditions across generations. Oyakata are retired wrestlers who've purchased toshiyori kabu (elder stock)—only 105 exist, making them more valuable than championships.`
  },
  {
    id: 'rituals',
    title: '儀式 • Sacred Rituals',
    icon: Scroll,
    subtitle: 'Spirituality in Every Movement',
    content: `Sumo rituals connect modern bouts to ancient Shinto practices:

Dohyo-iri (Ring Entry): Each wrestler performs shiko (leg stomps) to drive evil spirits from the ring. The clapping and arm spreading represents openness—no concealed weapons.

Salt Purification: Wrestlers throw salt (up to 45kg used daily) to purify the ring. Makuuchi wrestlers alone use the salt; lower ranks do not.

Shikiri (Face-off): Pre-match standoffs can last 4 minutes, psychological warfare as wrestlers stare down opponents while tossing salt and adjusting their mawashi (belt).

Post-match: Winners remain stoic—excessive celebration is discouraged. The gyoji (referee) points his gunbai (war fan) toward the winner's side.

These rituals transform combat into ceremony, maintaining sumo's identity as more than sport—it's a living cultural heritage.`
  }
];

function HistorySection({ section, expanded, onToggle }) {
  const Icon = section.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-zinc-800 bg-zinc-900"
    >
      <button
        onClick={() => onToggle(section.id)}
        className="w-full p-6 flex items-start gap-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex-shrink-0">
          <Icon className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-xl font-black text-white mb-1">{section.title}</h3>
          <p className="text-zinc-400 text-sm font-medium">{section.subtitle}</p>
        </div>
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      </button>
      
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-zinc-800"
        >
          <div className="p-6 bg-black/30">
            <div className="prose prose-invert prose-sm max-w-none">
              {section.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-zinc-300 leading-relaxed mb-4 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function SumoHistoryContext() {
  const [expandedSections, setExpandedSections] = useState(new Set());

  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-amber-500" />
        <div>
          <h2 className="text-2xl font-black text-white">大相撲の歴史</h2>
          <p className="text-zinc-400 text-sm font-medium">The Sacred History of Sumo Wrestling</p>
        </div>
      </div>

      <div className="space-y-3">
        {historyContent.map(section => (
          <HistorySection
            key={section.id}
            section={section}
            expanded={expandedSections.has(section.id)}
            onToggle={toggleSection}
          />
        ))}
      </div>

      <div className="mt-6 p-4 bg-amber-900/20 border border-amber-600/30">
        <p className="text-amber-300 text-xs leading-relaxed">
          <strong>Note:</strong> Sumo is recognized by UNESCO as Intangible Cultural Heritage. 
          Its preservation represents Japan's commitment to maintaining traditions while embracing modernity.
        </p>
      </div>
    </div>
  );
}