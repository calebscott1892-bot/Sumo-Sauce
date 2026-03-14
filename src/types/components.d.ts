declare module '@/components/ui/skeletons/BashoStandingsSkeleton' {
  const BashoStandingsSkeleton: React.ComponentType;
  export default BashoStandingsSkeleton;
}

declare module '@/components/ui/skeletons/RikishiProfileSkeleton' {
  const RikishiProfileSkeleton: React.ComponentType;
  export default RikishiProfileSkeleton;
}

declare module '@/components/ui/skeletons/CompareSkeleton' {
  const CompareSkeleton: React.ComponentType;
  export default CompareSkeleton;
}

declare module '@/components/ui/command' {
  import type { ComponentPropsWithoutRef, ElementRef, ForwardRefExoticComponent, RefAttributes } from 'react';

  export const Command: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
  export const CommandDialog: React.FC<any>;
  export const CommandInput: ForwardRefExoticComponent<any & RefAttributes<HTMLInputElement>>;
  export const CommandList: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
  export const CommandEmpty: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
  export const CommandGroup: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
  export const CommandItem: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
  export const CommandShortcut: React.FC<any>;
  export const CommandSeparator: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/dialog' {
  import type { ForwardRefExoticComponent, RefAttributes } from 'react';

  export const Dialog: React.FC<any>;
  export const DialogPortal: React.FC<any>;
  export const DialogOverlay: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
  export const DialogTrigger: React.FC<any>;
  export const DialogClose: React.FC<any>;
  export const DialogContent: ForwardRefExoticComponent<any & RefAttributes<HTMLDivElement>>;
  export const DialogHeader: React.FC<any>;
  export const DialogFooter: React.FC<any>;
  export const DialogTitle: ForwardRefExoticComponent<any & RefAttributes<HTMLHeadingElement>>;
  export const DialogDescription: ForwardRefExoticComponent<any & RefAttributes<HTMLParagraphElement>>;
}

declare module '@/components/navigation/Footer' {
  const Footer: React.ComponentType;
  export default Footer;
}

declare module '@/components/basho/DivisionGrid' {
  const DivisionGrid: React.ComponentType<any>;
  export default DivisionGrid;
}

declare module '@/components/rikishi/RivalryList' {
  const RivalryList: React.ComponentType<any>;
  export default RivalryList;
}

declare module '@/components/rikishi/RikishiBoutTimeline' {
  const RikishiBoutTimeline: React.ComponentType<any>;
  export default RikishiBoutTimeline;
}

declare module '@/components/FallbackAvatar' {
  const FallbackAvatar: React.ComponentType<any>;
  export default FallbackAvatar;
}

declare module '@/components/compare/StatBar' {
  const StatBar: React.ComponentType<any>;
  export default StatBar;
}
