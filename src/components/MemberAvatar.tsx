import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { resolveAssetUrl } from '../utils/api';

interface MemberAvatarProps {
  member: Pick<FamilyMember, 'name' | 'avatar' | 'photoUrl' | 'color'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  xs: 'w-5 h-5 text-xs',
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-xl',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-16 h-16 text-3xl'
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  size = 'md',
  className = ''
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const resolvedPhotoUrl = resolveAssetUrl(member.photoUrl);
  const showPhoto = Boolean(resolvedPhotoUrl) && !imgFailed;

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 border-2 select-none ${SIZE_CLASSES[size]} ${className}`}
      style={{ borderColor: member.color || '#6366F1' }}
      title={member.name}
    >
      {showPhoto ? (
        <img
          src={resolvedPhotoUrl}
          alt={member.name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{member.avatar || member.name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
};
