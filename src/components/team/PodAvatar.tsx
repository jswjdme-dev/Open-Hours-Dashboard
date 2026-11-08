import React from 'react';

// Fixed 8-colour soft palette: tinted background + darker same-hue text (contrast >= 4.5:1)
export const AVATAR_PALETTES = [
  { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' }, // 0: Sky
  { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' }, // 1: Purple
  { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }, // 2: Amber
  { bg: '#D1FAE5', text: '#047857', border: '#A7F3D0' }, // 3: Emerald
  { bg: '#FFE4E6', text: '#BE123C', border: '#FECDD3' }, // 4: Rose / Crimson
  { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE' }, // 5: Indigo
  { bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' }, // 6: Teal
  { bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' }, // 7: Fuchsia / Pink
];

export function getAvatarPalette(id: string) {
  if (!id) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function getInitials(name?: string, fallback = 'TM'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface PodAvatarProps {
  id: string;
  name?: string;
  initials?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'manager-cards' | 'manager-org';
  isManager?: boolean;
  hasActiveTimer?: boolean;
  openTaskCount?: number;
  className?: string;
}

export const PodAvatar: React.FC<PodAvatarProps> = ({
  id,
  name,
  initials,
  avatarUrl,
  size = 'md',
  isManager = false,
  hasActiveTimer = false,
  openTaskCount = 0,
  className = '',
}) => {
  const palette = getAvatarPalette(id);
  const displayInitials = initials || getInitials(name);

  // Size styles
  let sizeClass = 'w-10 h-10 text-xs'; // md (40px)
  let timerDotSize = 'w-3 h-3';
  let taskBadgeClass = 'min-w-[18px] h-[18px] text-[10px] -top-1 -right-1';

  if (size === 'sm') {
    sizeClass = 'w-8 h-8 text-[11px]';
    timerDotSize = 'w-2.5 h-2.5';
    taskBadgeClass = 'min-w-[16px] h-[16px] text-[9.5px] -top-1 -right-1';
  } else if (size === 'lg') {
    sizeClass = 'w-11 h-11 text-[13px]'; // 44px
    timerDotSize = 'w-3 h-3';
    taskBadgeClass = 'min-w-[18px] h-[18px] text-[10px] -top-1 -right-1';
  } else if (size === 'manager-cards') {
    sizeClass = 'w-14 h-14 text-[15px]'; // 56px
    timerDotSize = 'w-3.5 h-3.5';
    taskBadgeClass = 'min-w-[20px] h-[20px] text-[10.5px] -top-1.5 -right-1.5';
  } else if (size === 'manager-org') {
    sizeClass = 'w-16 h-16 text-[17px]'; // 64px
    timerDotSize = 'w-4 h-4';
    taskBadgeClass = 'min-w-[20px] h-[20px] text-[11px] -top-1.5 -right-1.5';
  }

  const managerRing = isManager ? 'ring-2 ring-[#D92D50] ring-offset-2 ring-offset-white' : '';

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-bold tracking-tight select-none border ${managerRing} overflow-hidden transition-transform duration-200`}
        style={{
          backgroundColor: palette.bg,
          color: palette.text,
          borderColor: palette.border,
        }}
        title={name ? `${name}${isManager ? ' (Pod Manager)' : ''}` : undefined}
        aria-label={name ? `${name}${isManager ? ' - Pod Manager' : ''}` : 'Team Member'}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name || 'Avatar'}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          displayInitials
        )}
      </div>

      {/* Running timer green dot on corner */}
      {hasActiveTimer && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${timerDotSize} rounded-full bg-[#12B76A] border-2 border-white animate-pulse`}
          title={`${name || 'Member'} has an active timer running`}
          aria-label="Timer running"
        />
      )}

      {/* Open task count badge on avatar (only when > 0, hide 0 tasks entirely) */}
      {openTaskCount !== undefined && openTaskCount > 0 && (
        <span
          className={`absolute ${taskBadgeClass} px-1 rounded-full bg-[#101828] text-white font-bold flex items-center justify-center border-2 border-white shadow-2xs select-none`}
          title={`${openTaskCount} open task${openTaskCount === 1 ? '' : 's'}`}
          aria-label={`${openTaskCount} open tasks`}
        >
          {openTaskCount}
        </span>
      )}
    </div>
  );
};

export interface PodCapacityBarProps {
  current: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export const PodCapacityBar: React.FC<PodCapacityBarProps> = ({
  current,
  max,
  className = '',
  showLabel = true,
}) => {
  if (!max || max <= 0) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {showLabel && (
          <div className="flex items-center justify-between text-[11.5px] text-[#475467]">
            <span className="font-medium text-[#344054]">
              {current} client{current === 1 ? '' : 's'}
            </span>
            <span className="text-[#667085] text-[11px]">No capacity limit</span>
          </div>
        )}
        <div className="w-full h-1.5 bg-[#EAECF0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#12B76A] rounded-full transition-all duration-300"
            style={{ width: current > 0 ? '100%' : '0%' }}
          />
        </div>
      </div>
    );
  }

  const percentage = Math.round((current / max) * 100);
  const isOver = current > max;
  const isAtOrOverCapacity = percentage >= 100;
  const isAmber = !isAtOrOverCapacity && percentage >= 80;

  let barColor = 'bg-[#12B76A]'; // Green under 80%
  let textColor = 'text-[#027A48] font-medium';
  let labelText = `${current} of ${max} clients`;

  if (isOver) {
    barColor = 'bg-[#D92D50]'; // Red 100%+
    textColor = 'text-[#D92D50] font-semibold';
    labelText = `${current} of ${max} clients · Over capacity by ${current - max}`;
  } else if (isAtOrOverCapacity) {
    barColor = 'bg-[#D92D50]'; // Red 100%+
    textColor = 'text-[#D92D50] font-semibold';
    labelText = `${current} of ${max} clients (100% capacity)`;
  } else if (isAmber) {
    barColor = 'bg-[#F79009]'; // Amber 80-99%
    textColor = 'text-[#B54708] font-semibold';
    labelText = `${current} of ${max} clients (${percentage}%)`;
  }

  const fillWidth = Math.min(percentage, 100);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11.5px] leading-none">
          <span className={textColor}>{labelText}</span>
          <span className="text-[11px] text-[#667085] font-medium">{percentage}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-[#EAECF0] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
    </div>
  );
};
